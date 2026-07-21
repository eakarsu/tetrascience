import { NextFunction, Request, Response, Router } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import * as service from '../services/assayService';

const router = Router(); const asyncRoute = (handler: (req: AuthRequest, res: Response) => Promise<void>) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(handler(req as AuthRequest, res)).catch(next);
router.use(authMiddleware);
router.get('/dashboard', requireRole('TENANT_ADMIN','SCIENTIST','QUALITY_REVIEWER','AUDITOR'), asyncRoute(async (req, res) => { res.json(await service.dashboard(req.user!)); }));
router.post('/instruments', requireRole('TENANT_ADMIN'), asyncRoute(async (req, res) => { res.status(201).json(await service.createInstrument(req.user!, req.body, req.requestId)); }));
router.post('/instruments/:id/calibration', requireRole('TENANT_ADMIN'), asyncRoute(async (req, res) => { res.json(await service.calibrateInstrument(req.user!, String(req.params.id), req.body, req.requestId)); }));
router.post('/samples', requireRole('TENANT_ADMIN','SCIENTIST'), asyncRoute(async (req, res) => { res.status(201).json(await service.createSample(req.user!, req.body, req.requestId)); }));
router.post('/ingestions', requireRole('INSTRUMENT_SERVICE'), asyncRoute(async (req, res) => { const result = await service.ingest(req.user!, req.body, req.requestId); res.status(result.replayed ? 200 : 202).json(result); }));
router.post('/runs/:id/submit', requireRole('SCIENTIST'), asyncRoute(async (req, res) => { res.json(await service.submitRun(req.user!, String(req.params.id), req.body, req.requestId)); }));
router.post('/runs/:id/release', requireRole('QUALITY_REVIEWER'), asyncRoute(async (req, res) => { res.json(await service.releaseRun(req.user!, String(req.params.id), req.body, req.requestId)); }));
router.get('/runs/:id/evidence', requireRole('TENANT_ADMIN','SCIENTIST','QUALITY_REVIEWER','AUDITOR'), asyncRoute(async (req, res) => { res.json(await service.evidence(req.user!, String(req.params.id))); }));
router.get('/audit/verify', requireRole('TENANT_ADMIN','AUDITOR'), asyncRoute(async (req, res) => { res.json(await service.verifyAudit(req.user!)); }));
export default router;
