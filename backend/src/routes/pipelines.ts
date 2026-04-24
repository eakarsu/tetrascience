import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { Pipeline } from '../models';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET / - list all pipelines with search and filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, pipelineType, status } = req.query;
    const where: any = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { source: { [Op.iLike]: `%${search}%` } },
        { destination: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (pipelineType) {
      where.pipelineType = pipelineType;
    }

    if (status) {
      where.status = status;
    }

    const pipelines = await Pipeline.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(pipelines);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch pipelines', details: error.message });
  }
});

// GET /:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pipeline = await Pipeline.findByPk(req.params.id);
    if (!pipeline) {
      res.status(404).json({ error: 'Pipeline not found' });
      return;
    }
    res.json(pipeline);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch pipeline', details: error.message });
  }
});

// POST /
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const pipeline = await Pipeline.create(req.body);
    res.status(201).json(pipeline);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create pipeline', details: error.message });
  }
});

// PUT /:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pipeline = await Pipeline.findByPk(req.params.id);
    if (!pipeline) {
      res.status(404).json({ error: 'Pipeline not found' });
      return;
    }
    await pipeline.update(req.body);
    res.json(pipeline);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update pipeline', details: error.message });
  }
});

// DELETE /:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pipeline = await Pipeline.findByPk(req.params.id);
    if (!pipeline) {
      res.status(404).json({ error: 'Pipeline not found' });
      return;
    }
    await pipeline.destroy();
    res.json({ message: 'Pipeline deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete pipeline', details: error.message });
  }
});

export default router;
