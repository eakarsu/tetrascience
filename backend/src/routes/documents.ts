import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { Document } from '../models';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET / - list all documents with search and filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, documentType, status } = req.query;
    const where: any = {};

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
        { authors: { [Op.iLike]: `%${search}%` } },
        { tags: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (documentType) {
      where.documentType = documentType;
    }

    if (status) {
      where.status = status;
    }

    const documents = await Document.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(documents);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
  }
});

// GET /:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    res.json(document);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch document', details: error.message });
  }
});

// POST /
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const document = await Document.create(req.body);
    res.status(201).json(document);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create document', details: error.message });
  }
});

// PUT /:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    await document.update(req.body);
    res.json(document);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update document', details: error.message });
  }
});

// DELETE /:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    await document.destroy();
    res.json({ message: 'Document deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete document', details: error.message });
  }
});

export default router;
