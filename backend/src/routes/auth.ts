import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tetrascience-scientific-data-cloud-2024';

// POST /login
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    await user.update({ lastLogin: new Date() });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const userData = user.toJSON();
    const { password: _, ...userWithoutPassword } = userData as any;

    res.json({ token, user: userWithoutPassword });
  } catch (error: any) {
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// POST /register
router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, role, tenantId } = req.body;

    if (!email || !password || !name || !role) {
      res.status(400).json({ error: 'Email, password, name, and role are required' });
      return;
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role,
      tenantId: tenantId || null,
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const userData = user.toJSON();
    const { password: _, ...userWithoutPassword } = userData as any;

    res.status(201).json({ token, user: userWithoutPassword });
  } catch (error: any) {
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// GET /me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByPk(req.user!.id, {
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

export default router;
