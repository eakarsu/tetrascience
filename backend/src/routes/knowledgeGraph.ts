import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { KnowledgeNode, KnowledgeEdge } from '../models';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// ==================== NODES ====================

// GET /nodes - list nodes with search and filters
router.get('/nodes', async (req: AuthRequest, res: Response) => {
  try {
    const { search, nodeType } = req.query;
    const where: any = {};

    if (search) {
      where[Op.or] = [
        { label: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (nodeType) {
      where.nodeType = nodeType;
    }

    const nodes = await KnowledgeNode.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(nodes);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch nodes', details: error.message });
  }
});

// GET /nodes/:id - get node by id with edges
router.get('/nodes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const node = await KnowledgeNode.findByPk(req.params.id, {
      include: [
        { model: KnowledgeEdge, as: 'outgoingEdges', include: [{ model: KnowledgeNode, as: 'targetNode' }] },
        { model: KnowledgeEdge, as: 'incomingEdges', include: [{ model: KnowledgeNode, as: 'sourceNode' }] },
      ],
    });
    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }
    res.json(node);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch node', details: error.message });
  }
});

// POST /nodes
router.post('/nodes', async (req: AuthRequest, res: Response) => {
  try {
    const node = await KnowledgeNode.create(req.body);
    res.status(201).json(node);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create node', details: error.message });
  }
});

// PUT /nodes/:id
router.put('/nodes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const node = await KnowledgeNode.findByPk(req.params.id);
    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }
    await node.update(req.body);
    res.json(node);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update node', details: error.message });
  }
});

// DELETE /nodes/:id - delete node and associated edges
router.delete('/nodes/:id', async (req: AuthRequest, res: Response) => {
  try {
    const node = await KnowledgeNode.findByPk(req.params.id);
    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }
    await KnowledgeEdge.destroy({
      where: {
        [Op.or]: [
          { sourceNodeId: req.params.id },
          { targetNodeId: req.params.id },
        ],
      },
    });
    await node.destroy();
    res.json({ message: 'Node and associated edges deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete node', details: error.message });
  }
});

// ==================== EDGES ====================

// GET /edges - list edges with filter
router.get('/edges', async (req: AuthRequest, res: Response) => {
  try {
    const { relationshipType } = req.query;
    const where: any = {};

    if (relationshipType) {
      where.relationshipType = relationshipType;
    }

    const edges = await KnowledgeEdge.findAll({
      where,
      include: [
        { model: KnowledgeNode, as: 'sourceNode' },
        { model: KnowledgeNode, as: 'targetNode' },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(edges);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch edges', details: error.message });
  }
});

// POST /edges
router.post('/edges', async (req: AuthRequest, res: Response) => {
  try {
    const edge = await KnowledgeEdge.create(req.body);
    res.status(201).json(edge);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create edge', details: error.message });
  }
});

// DELETE /edges/:id
router.delete('/edges/:id', async (req: AuthRequest, res: Response) => {
  try {
    const edge = await KnowledgeEdge.findByPk(req.params.id);
    if (!edge) {
      res.status(404).json({ error: 'Edge not found' });
      return;
    }
    await edge.destroy();
    res.json({ message: 'Edge deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete edge', details: error.message });
  }
});

export default router;
