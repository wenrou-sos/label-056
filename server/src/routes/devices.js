const prisma = require('../lib/prisma');
const express = require('express');
const router = express.Router();

const deviceTypeLabels = {
  FIRE_HYDRANT: '消火栓',
  FIRE_EXTINGUISHER: '灭火器',
  SMOKE_DETECTOR: '烟感探测器',
  SPRINKLER: '喷淋头',
  EMERGENCY_LIGHT: '应急灯'
};

router.get('/', async (req, res) => {
  try {
    const { type, floor, keyword, status } = req.query;
    const where = {};
    if (type && type !== 'ALL') where.type = type;
    if (floor) where.floor = floor;
    if (status && status !== 'ALL') where.status = status;
    if (keyword) {
      where.OR = [
        { code: { contains: keyword } },
        { location: { contains: keyword } }
      ];
    }
    const devices = await prisma.device.findMany({
      where,
      orderBy: [{ floor: 'asc' }, { code: 'asc' }]
    });
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id }
    });
    if (!device) return res.status(404).json({ error: '设备不存在' });
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/code/:code', async (req, res) => {
  try {
    const device = await prisma.device.findUnique({
      where: { code: req.params.code }
    });
    if (!device) return res.status(404).json({ error: '设备不存在' });
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.installDate) data.installDate = new Date(data.installDate);
    if (data.expireDate) data.expireDate = new Date(data.expireDate);
    if (data.pressureExpireDate) data.pressureExpireDate = new Date(data.pressureExpireDate);
    if (data.lastCleanDate) data.lastCleanDate = new Date(data.lastCleanDate);
    const device = await prisma.device.create({ data });
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id;
    if (data.installDate) data.installDate = new Date(data.installDate);
    if (data.expireDate) data.expireDate = new Date(data.expireDate);
    if (data.pressureExpireDate) data.pressureExpireDate = new Date(data.pressureExpireDate);
    if (data.lastCleanDate) data.lastCleanDate = new Date(data.lastCleanDate);
    const device = await prisma.device.update({
      where: { id: req.params.id },
      data
    });
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.device.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/meta/floors', async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      select: { floor: true },
      distinct: ['floor']
    });
    const floors = devices.map(d => d.floor).filter(Boolean).sort();
    res.json(floors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
