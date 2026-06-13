const QRCode = require('qrcode');
const prisma = require('../lib/prisma');
const express = require('express');
const router = express.Router();

router.get('/device/:id', async (req, res) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id }
    });
    if (!device) return res.status(404).json({ error: '设备不存在' });

    const scanUrl = `${req.protocol}://${req.get('host')}/scan/${device.code}`;
    const qrDataUrl = await QRCode.toDataURL(scanUrl);
    res.json({ qrDataUrl, scanUrl, device });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/batch', async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      select: { id: true, code: true, type: true, floor: true, location: true }
    });
    const results = [];
    for (const device of devices) {
      const scanUrl = `${req.protocol}://${req.get('host')}/scan/${device.code}`;
      const qrDataUrl = await QRCode.toDataURL(scanUrl);
      results.push({ ...device, qrDataUrl, scanUrl });
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
