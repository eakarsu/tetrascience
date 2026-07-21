import crypto from 'crypto';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { db } from './core/db';
import { DomainError } from './core/domain';
import { metrics } from './core/metrics';
import { csv, validateRuntime } from './core/runtime';
import { AuthRequest } from './middleware/auth';
import authRoutes from './routes/auth';
import workflowRoutes from './routes/assayWorkflow';

export function createApp() {
  validateRuntime(); const app = express(); const origins = csv('CORS_ORIGINS');
  app.disable('x-powered-by'); app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin(origin, callback) { if (!origin || origins.includes(origin) || (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))) callback(null, true); else callback(new DomainError(403, 'ORIGIN_NOT_ALLOWED', 'Origin is not allowed')); } }));
  app.use(express.json({ limit: '512kb', strict: true }));
  app.use((req: AuthRequest, res: Response, next: NextFunction) => { const started = Date.now(); req.requestId = /^[0-9a-f-]{36}$/i.test(String(req.headers['x-request-id'] || '')) ? String(req.headers['x-request-id']) : crypto.randomUUID(); res.setHeader('X-Request-Id', req.requestId); res.on('finish', () => { metrics.observe(Date.now() - started, res.statusCode); console.log(JSON.stringify({ level: 'info', requestId: req.requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - started })); }); next(); });
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'tetrascience-assay-release' }));
  app.get('/api/ready', async (_req, res) => { try { await db.query('SELECT 1 FROM tetrascience_migrations LIMIT 1'); res.json({ status: 'ready' }); } catch { res.status(503).json({ status: 'not_ready' }); } });
  app.get('/api/metrics', (_req, res) => res.json(metrics.snapshot()));
  app.use('/api/auth', authRoutes); app.use('/api/assay-workflow', workflowRoutes);
  app.use('/api', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unsupported API route' } }));
  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof DomainError) { res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details, eventId: error.eventId } }); return; }
    if (error?.type === 'entity.too.large') { res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request exceeds 512kb' } }); return; }
    const transient = ['ECONNREFUSED','57P01','57P02','57P03','53300'].includes(error?.code); console.error(JSON.stringify({ level: 'error', message: 'request_failed', code: error?.code, name: error?.name }));
    if (transient) res.status(503).set('Retry-After', '5').json({ error: { code: 'DEPENDENCY_UNAVAILABLE', message: 'A required service is temporarily unavailable; retry with the same idempotency key' } });
    else res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Request failed' } });
  }); return app;
}

export function start() { const app = createApp(); const port = Number(process.env.BACKEND_PORT || 4000); const host = process.env.HOST || '127.0.0.1'; const server = app.listen(port, host, () => console.log(`TetraScience assay release API listening on ${host}:${port}`)); const shutdown = () => server.close(() => db.end().finally(() => process.exit(0))); process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown); return server; }
if (require.main === module) start();
export default createApp;
