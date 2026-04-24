import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { Entity } from '../models';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET / - list all entities with search and filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, entityType, resolved } = req.query;
    const where: any = {};

    if (search) {
      where[Op.or] = [
        { surfaceForm: { [Op.iLike]: `%${search}%` } },
        { canonicalName: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (resolved !== undefined) {
      where.resolved = resolved === 'true';
    }

    const entities = await Entity.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(entities);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch entities', details: error.message });
  }
});

// GET /:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const entity = await Entity.findByPk(req.params.id);
    if (!entity) {
      res.status(404).json({ error: 'Entity not found' });
      return;
    }
    res.json(entity);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch entity', details: error.message });
  }
});

// POST /
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const entity = await Entity.create(req.body);
    res.status(201).json(entity);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create entity', details: error.message });
  }
});

// PUT /:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const entity = await Entity.findByPk(req.params.id);
    if (!entity) {
      res.status(404).json({ error: 'Entity not found' });
      return;
    }
    await entity.update(req.body);
    res.json(entity);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update entity', details: error.message });
  }
});

// DELETE /:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const entity = await Entity.findByPk(req.params.id);
    if (!entity) {
      res.status(404).json({ error: 'Entity not found' });
      return;
    }
    await entity.destroy();
    res.json({ message: 'Entity deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete entity', details: error.message });
  }
});

export default router;
