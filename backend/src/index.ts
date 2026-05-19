import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { sequelize } from './models';
import { authMiddleware } from './middleware/auth';

import authRoutes from './routes/auth';
import moleculesRoutes from './routes/molecules';
import assaysRoutes from './routes/assays';
import documentsRoutes from './routes/documents';
import knowledgeGraphRoutes from './routes/knowledgeGraph';
import entitiesRoutes from './routes/entities';
import pipelinesRoutes from './routes/pipelines';
import instrumentsRoutes from './routes/instruments';
import searchAnalyticsRoutes from './routes/searchAnalytics';
import embeddingsRoutes from './routes/embeddings';
import auditTrailRoutes from './routes/auditTrail';
import tenantsRoutes from './routes/tenants';
import usersRoutes from './routes/users';
import aiRoutes from './routes/ai';
import gapFeaturesRouter from './routes/gap-features'; // === Batch 11 Gaps & Frontend Mounts ===

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = parseInt(process.env.BACKEND_PORT || '4000', 10);

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/molecules', authMiddleware, moleculesRoutes);
app.use('/api/assays', authMiddleware, assaysRoutes);
app.use('/api/documents', authMiddleware, documentsRoutes);
app.use('/api/knowledge-graph', authMiddleware, knowledgeGraphRoutes);
app.use('/api/entities', authMiddleware, entitiesRoutes);
app.use('/api/pipelines', authMiddleware, pipelinesRoutes);
app.use('/api/instruments', authMiddleware, instrumentsRoutes);
app.use('/api/search-analytics', authMiddleware, searchAnalyticsRoutes);
app.use('/api/embeddings', authMiddleware, embeddingsRoutes);
app.use('/api/audit-trail', authMiddleware, auditTrailRoutes);
app.use('/api/tenants', authMiddleware, tenantsRoutes);
app.use('/api/users', authMiddleware, usersRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/ai-extras', authMiddleware, require('./routes/aiExtras').default);
app.use('/api/custom-views', require('./routes/customViews'));

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    await sequelize.sync();
    console.log('Database models synchronized.');

    app.use('/api', gapFeaturesRouter); // === Batch 11 Gaps & Frontend Mounts ===
app.listen(PORT, () => {
      console.log(`TetraScience backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
