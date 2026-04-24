import { Router, Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import { SearchQuery } from '../models';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET / - list all search queries with search and filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, searchType } = req.query;
    const where: any = {};

    if (search) {
      where.query = { [Op.iLike]: `%${search}%` };
    }

    if (searchType) {
      where.searchType = searchType;
    }

    const queries = await SearchQuery.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(queries);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch search queries', details: error.message });
  }
});

// GET /stats - aggregated stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await SearchQuery.findAll({
      attributes: [
        [sequelize.fn('AVG', sequelize.col('responseTimeMs')), 'avgResponseTimeMs'],
        [sequelize.fn('AVG', sequelize.col('precisionAtK')), 'avgPrecisionAtK'],
        [sequelize.fn('AVG', sequelize.col('mrr')), 'avgMrr'],
        [sequelize.fn('AVG', sequelize.col('ndcg')), 'avgNdcg'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalQueries'],
      ],
      raw: true,
    });

    const bySearchType = await SearchQuery.findAll({
      attributes: [
        'searchType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', sequelize.col('responseTimeMs')), 'avgResponseTimeMs'],
        [sequelize.fn('AVG', sequelize.col('precisionAtK')), 'avgPrecisionAtK'],
        [sequelize.fn('AVG', sequelize.col('mrr')), 'avgMrr'],
        [sequelize.fn('AVG', sequelize.col('ndcg')), 'avgNdcg'],
      ],
      group: ['searchType'],
      raw: true,
    });

    res.json({
      overall: stats[0] || {},
      bySearchType,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch search stats', details: error.message });
  }
});

// GET /:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const query = await SearchQuery.findByPk(req.params.id);
    if (!query) {
      res.status(404).json({ error: 'Search query not found' });
      return;
    }
    res.json(query);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch search query', details: error.message });
  }
});

// POST /
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const query = await SearchQuery.create(req.body);
    res.status(201).json(query);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create search query', details: error.message });
  }
});

// DELETE /:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const query = await SearchQuery.findByPk(req.params.id);
    if (!query) {
      res.status(404).json({ error: 'Search query not found' });
      return;
    }
    await query.destroy();
    res.json({ message: 'Search query deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete search query', details: error.message });
  }
});

export default router;
