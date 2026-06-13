const prisma = require('../lib/prisma');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { shift } = req.query;
    const where = {};
    if (shift && shift !== 'ALL') where.shift = shift;
    const routes = await prisma.inspectionRoute.findMany({
      where,
      include: {
        devices: {
          include: { device: true },
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: [{ shift: 'asc' }, { name: 'asc' }]
    });
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const route = await prisma.inspectionRoute.findUnique({
      where: { id: req.params.id },
      include: {
        devices: {
          include: { device: true },
          orderBy: { orderIndex: 'asc' }
        }
      }
    });
    if (!route) return res.status(404).json({ error: '路线不存在' });
    res.json(route);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, shift, description, deviceIds = [] } = req.body;
    const route = await prisma.inspectionRoute.create({
      data: {
        name,
        shift,
        description,
        devices: {
          create: deviceIds.map((deviceId, idx) => ({
            deviceId,
            orderIndex: idx
          }))
        }
      },
      include: { devices: { include: { device: true } } }
    });
    res.json(route);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, shift, description, deviceIds = [] } = req.body;
    const routeId = req.params.id;

    await prisma.routeDevice.deleteMany({ where: { routeId } });

    const routeDevicesData = deviceIds.map((deviceId, idx) => ({
      routeId,
      deviceId,
      orderIndex: idx
    }));

    if (routeDevicesData.length > 0) {
      await prisma.routeDevice.createMany({
        data: routeDevicesData
      });
    }

    await prisma.inspectionRoute.update({
      where: { id: routeId },
      data: { name, shift, description }
    });

    const route = await prisma.inspectionRoute.findUnique({
      where: { id: routeId },
      include: {
        devices: {
          include: { device: true },
          orderBy: { orderIndex: 'asc' }
        }
      }
    });
    res.json(route);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.inspectionRoute.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
