import { Router, Response } from 'express';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import { User, Role } from '../models';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET /roles - list all roles
router.get('/roles', async (req: AuthRequest, res: Response) => {
  try {
    const roles = await Role.findAll({ order: [['createdAt', 'DESC']] });
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch roles', details: error.message });
  }
});

// POST /roles - create role
router.post('/roles', async (req: AuthRequest, res: Response) => {
  try {
    const role = await Role.create(req.body);
    res.status(201).json(role);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create role', details: error.message });
  }
});

// GET / - list all users with search and filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, role } = req.query;
    const where: any = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (role) {
      where.role = role;
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// GET /:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch user', details: error.message });
  }
});

// POST / - create user (hash password)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { password, ...rest } = req.body;
    if (!password) {
      res.status(400).json({ error: 'Password is required' });
      return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ ...rest, password: hashedPassword });
    const userData = user.toJSON();
    const { password: _, ...userWithoutPassword } = userData as any;
    res.status(201).json(userWithoutPassword);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

// PUT /:id - update user (hash password if changed)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updateData = { ...req.body };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    await user.update(updateData);
    const userData = user.toJSON();
    const { password: _, ...userWithoutPassword } = userData as any;
    res.json(userWithoutPassword);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

// DELETE /:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    await user.destroy();
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

export default router;
