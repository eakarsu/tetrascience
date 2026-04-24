import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { AssayResult, Molecule } from '../models';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET / - list all assays with search and filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, assayType, status } = req.query;
    const where: any = {};

    if (search) {
      where[Op.or] = [
        { assayName: { [Op.iLike]: `%${search}%` } },
        { targetProtein: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (assayType) {
      where.assayType = assayType;
    }

    if (status) {
      where.status = status;
    }

    const assays = await AssayResult.findAll({
      where,
      include: [{ model: Molecule, as: 'molecule' }],
      order: [['createdAt', 'DESC']],
    });
    res.json(assays);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch assays', details: error.message });
  }
});

// GET /:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const assay = await AssayResult.findByPk(req.params.id, {
      include: [{ model: Molecule, as: 'molecule' }],
    });
    if (!assay) {
      res.status(404).json({ error: 'Assay result not found' });
      return;
    }
    res.json(assay);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch assay', details: error.message });
  }
});

// POST /
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const assay = await AssayResult.create(req.body);
    res.status(201).json(assay);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create assay', details: error.message });
  }
});

// PUT /:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const assay = await AssayResult.findByPk(req.params.id);
    if (!assay) {
      res.status(404).json({ error: 'Assay result not found' });
      return;
    }
    await assay.update(req.body);
    res.json(assay);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update assay', details: error.message });
  }
});

// DELETE /:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const assay = await AssayResult.findByPk(req.params.id);
    if (!assay) {
      res.status(404).json({ error: 'Assay result not found' });
      return;
    }
    await assay.destroy();
    res.json({ message: 'Assay result deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete assay', details: error.message });
  }
});

export default router;
