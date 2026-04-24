import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { Tenant } from '../models';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET / - list all tenants with search and filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, industry, status } = req.query;
    const where: any = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { slug: { [Op.iLike]: `%${search}%` } },
        { contactEmail: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (industry) {
      where.industry = industry;
    }

    if (status) {
      where.status = status;
    }

    const tenants = await Tenant.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(tenants);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch tenants', details: error.message });
  }
});

// GET /:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    res.json(tenant);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch tenant', details: error.message });
  }
});

// POST /
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const tenant = await Tenant.create(req.body);
    res.status(201).json(tenant);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create tenant', details: error.message });
  }
});

// PUT /:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    await tenant.update(req.body);
    res.json(tenant);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update tenant', details: error.message });
  }
});

// DELETE /:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    await tenant.destroy();
    res.json({ message: 'Tenant deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete tenant', details: error.message });
  }
});

export default router;
