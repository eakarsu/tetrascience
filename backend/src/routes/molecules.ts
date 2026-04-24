import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { Molecule } from '../models';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET / - list all molecules with search and filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, category, status } = req.query;
    const where: any = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { smiles: { [Op.iLike]: `%${search}%` } },
        { molecularFormula: { [Op.iLike]: `%${search}%` } },
        { targetProtein: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    const molecules = await Molecule.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(molecules);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch molecules', details: error.message });
  }
});

// GET /:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const molecule = await Molecule.findByPk(req.params.id);
    if (!molecule) {
      res.status(404).json({ error: 'Molecule not found' });
      return;
    }
    res.json(molecule);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch molecule', details: error.message });
  }
});

// POST /
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const molecule = await Molecule.create(req.body);
    res.status(201).json(molecule);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create molecule', details: error.message });
  }
});

// PUT /:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const molecule = await Molecule.findByPk(req.params.id);
    if (!molecule) {
      res.status(404).json({ error: 'Molecule not found' });
      return;
    }
    await molecule.update(req.body);
    res.json(molecule);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update molecule', details: error.message });
  }
});

// DELETE /:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const molecule = await Molecule.findByPk(req.params.id);
    if (!molecule) {
      res.status(404).json({ error: 'Molecule not found' });
      return;
    }
    await molecule.destroy();
    res.json({ message: 'Molecule deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete molecule', details: error.message });
  }
});

export default router;
