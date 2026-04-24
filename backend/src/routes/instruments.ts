import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { Instrument } from '../models';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET / - list all instruments with search and filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, instrumentType, status } = req.query;
    const where: any = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { manufacturer: { [Op.iLike]: `%${search}%` } },
        { model: { [Op.iLike]: `%${search}%` } },
        { serialNumber: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (instrumentType) {
      where.instrumentType = instrumentType;
    }

    if (status) {
      where.status = status;
    }

    const instruments = await Instrument.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(instruments);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch instruments', details: error.message });
  }
});

// GET /:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const instrument = await Instrument.findByPk(req.params.id);
    if (!instrument) {
      res.status(404).json({ error: 'Instrument not found' });
      return;
    }
    res.json(instrument);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch instrument', details: error.message });
  }
});

// POST /
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const instrument = await Instrument.create(req.body);
    res.status(201).json(instrument);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create instrument', details: error.message });
  }
});

// PUT /:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const instrument = await Instrument.findByPk(req.params.id);
    if (!instrument) {
      res.status(404).json({ error: 'Instrument not found' });
      return;
    }
    await instrument.update(req.body);
    res.json(instrument);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update instrument', details: error.message });
  }
});

// DELETE /:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const instrument = await Instrument.findByPk(req.params.id);
    if (!instrument) {
      res.status(404).json({ error: 'Instrument not found' });
      return;
    }
    await instrument.destroy();
    res.json({ message: 'Instrument deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete instrument', details: error.message });
  }
});

export default router;
