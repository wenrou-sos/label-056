const prisma = require('../lib/prisma');
const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { taskId, deviceId, result, remark, photoUrl, inspector } = req.body;
    const data = {
      deviceId,
      result,
      remark,
      photoUrl,
      inspector
    };
    if (taskId) {
      data.taskId = taskId;
    }
    const record = await prisma.inspectionRecord.create({
      data,
      include: { device: true, task: true }
    });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/task/:taskId', async (req, res) => {
  try {
    const records = await prisma.inspectionRecord.findMany({
      where: { taskId: req.params.taskId },
      include: { device: true },
      orderBy: { inspectedAt: 'asc' }
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/device/:deviceId', async (req, res) => {
  try {
    const records = await prisma.inspectionRecord.findMany({
      where: { deviceId: req.params.deviceId },
      include: { task: { include: { route: true } } },
      orderBy: { inspectedAt: 'desc' },
      take: 20
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
