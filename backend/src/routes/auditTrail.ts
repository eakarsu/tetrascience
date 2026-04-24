import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { AuditLog } from '../models';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET / - list all audit logs with search and filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, action, gxpRelevant } = req.query;
    const where: any = {};

    if (search) {
      where[Op.or] = [
        { resource: { [Op.iLike]: `%${search}%` } },
        { userName: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (action) {
      where.action = action;
    }

    if (gxpRelevant !== undefined) {
      where.gxpRelevant = gxpRelevant === 'true';
    }

    const logs = await AuditLog.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch audit logs', details: error.message });
  }
});

// GET /:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const log = await AuditLog.findByPk(req.params.id);
    if (!log) {
      res.status(404).json({ error: 'Audit log not found' });
      return;
    }
    res.json(log);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch audit log', details: error.message });
  }
});

// POST /
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const log = await AuditLog.create(req.body);
    res.status(201).json(log);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create audit log', details: error.message });
  }
});

// PUT /:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const log = await AuditLog.findByPk(req.params.id);
    if (!log) {
      res.status(404).json({ error: 'Audit log not found' });
      return;
    }
    await log.update(req.body);
    res.json(log);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update audit log', details: error.message });
  }
});

// DELETE /:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const log = await AuditLog.findByPk(req.params.id);
    if (!log) {
      res.status(404).json({ error: 'Audit log not found' });
      return;
    }
    await log.destroy();
    res.json({ message: 'Audit log deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete audit log', details: error.message });
  }
});

export default router;
