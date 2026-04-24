import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { Embedding } from '../models';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET / - list all embeddings with search and filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, sourceType } = req.query;
    const where: any = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sourceText: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (sourceType) {
      where.sourceType = sourceType;
    }

    const embeddings = await Embedding.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(embeddings);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch embeddings', details: error.message });
  }
});

// GET /:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const embedding = await Embedding.findByPk(req.params.id);
    if (!embedding) {
      res.status(404).json({ error: 'Embedding not found' });
      return;
    }
    res.json(embedding);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch embedding', details: error.message });
  }
});

// POST /
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const embedding = await Embedding.create(req.body);
    res.status(201).json(embedding);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create embedding', details: error.message });
  }
});

// PUT /:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const embedding = await Embedding.findByPk(req.params.id);
    if (!embedding) {
      res.status(404).json({ error: 'Embedding not found' });
      return;
    }
    await embedding.update(req.body);
    res.json(embedding);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update embedding', details: error.message });
  }
});

// DELETE /:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const embedding = await Embedding.findByPk(req.params.id);
    if (!embedding) {
      res.status(404).json({ error: 'Embedding not found' });
      return;
    }
    await embedding.destroy();
    res.json({ message: 'Embedding deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete embedding', details: error.message });
  }
});

export default router;
