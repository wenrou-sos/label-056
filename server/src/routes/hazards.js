const prisma = require('../lib/prisma');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { status, deviceId } = req.query;
    const where = {};
    if (status && status !== 'ALL') where.status = status;
    if (deviceId) where.deviceId = deviceId;
    const hazards = await prisma.hazard.findMany({
      where,
      include: {
        device: true,
        inspection: { include: { task: { include: { route: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(hazards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const hazard = await prisma.hazard.findUnique({
      where: { id: req.params.id },
      include: {
        device: true,
        inspection: { include: { task: { include: { route: true } } } }
      }
    });
    if (!hazard) return res.status(404).json({ error: '隐患单不存在' });
    res.json(hazard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, deviceId, inspectionId } = req.body;
    const hazard = await prisma.hazard.create({
      data: {
        title,
        description,
        deviceId,
        inspectionId: inspectionId || undefined
      },
      include: { device: true }
    });
    res.json(hazard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/assign', async (req, res) => {
  try {
    const { assignee } = req.body;
    const hazard = await prisma.hazard.update({
      where: { id: req.params.id },
      data: {
        status: 'REPAIRING',
        assignee
      },
      include: { device: true }
    });
    res.json(hazard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/repair', async (req, res) => {
  try {
    const { repairRemark, repairPhotoUrl } = req.body;
    const hazard = await prisma.hazard.update({
      where: { id: req.params.id },
      data: {
        status: 'REPAIRED',
        repairRemark,
        repairPhotoUrl,
        repairedAt: new Date()
      },
      include: { device: true }
    });
    res.json(hazard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/accept', async (req, res) => {
  try {
    const { acceptor, acceptRemark } = req.body;
    const hazard = await prisma.hazard.update({
      where: { id: req.params.id },
      data: {
        status: 'ACCEPTED',
        acceptor,
        acceptRemark,
        acceptedAt: new Date()
      },
      include: { device: true }
    });
    res.json(hazard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
