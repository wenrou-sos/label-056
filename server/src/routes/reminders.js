const prisma = require('../lib/prisma');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const remindBefore = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expireDevices = await prisma.device.findMany({
      where: {
        OR: [
          {
            expireDate: {
              gte: now,
              lte: remindBefore
            }
          },
          {
            pressureExpireDate: {
              gte: now,
              lte: remindBefore
            }
          }
        ]
      },
      orderBy: { expireDate: 'asc' }
    });

    const cleanDueDevices = await prisma.device.findMany({
      where: {
        type: 'SMOKE_DETECTOR',
        lastCleanDate: { not: null },
        cleanCycleDays: { not: null }
      }
    });

    const cleanRemindDevices = cleanDueDevices.filter(d => {
      if (!d.lastCleanDate || !d.cleanCycleDays) return false;
      const nextCleanDate = new Date(d.lastCleanDate.getTime() + d.cleanCycleDays * 24 * 60 * 60 * 1000);
      return nextCleanDate >= now && nextCleanDate <= remindBefore;
    }).map(d => {
      const nextCleanDate = new Date(d.lastCleanDate.getTime() + d.cleanCycleDays * 24 * 60 * 60 * 1000);
      return { ...d, nextCleanDate };
    });

    const allExpiredDevices = await prisma.device.findMany({
      where: {
        OR: [
          { expireDate: { lt: now } },
          { pressureExpireDate: { lt: now } }
        ]
      }
    });

    res.json({
      expiringDevices: expireDevices,
      cleanRemindDevices,
      expiredDevices: allExpiredDevices
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
