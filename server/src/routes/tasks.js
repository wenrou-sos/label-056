const prisma = require('../lib/prisma');
const express = require('express');
const router = express.Router();

const getShiftForTime = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return 'MORNING';
  if (hour >= 14 && hour < 22) return 'AFTERNOON';
  return 'NIGHT';
};

const normalizeDate = (d) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

const generateDailyTasks = async () => {
  try {
    const today = normalizeDate(new Date());
    const routes = await prisma.inspectionRoute.findMany();

    for (const route of routes) {
      const existing = await prisma.inspectionTask.findFirst({
        where: {
          routeId: route.id,
          shift: route.shift,
          taskDate: today
        }
      });
      if (!existing) {
        await prisma.inspectionTask.create({
          data: {
            routeId: route.id,
            shift: route.shift,
            taskDate: today
          }
        });
      }
    }
  } catch (err) {
    console.error('生成日常任务失败:', err);
  }
};

router.get('/', async (req, res) => {
  try {
    await generateDailyTasks();
    const { status, shift, date } = req.query;
    const where = {};
    if (status && status !== 'ALL') where.status = status;
    if (shift && shift !== 'ALL') where.shift = shift;
    if (date) {
      where.taskDate = normalizeDate(date);
    }

    const tasks = await prisma.inspectionTask.findMany({
      where,
      include: {
        route: {
          include: {
            devices: {
              include: { device: true },
              orderBy: { orderIndex: 'asc' }
            }
          }
        },
        records: {
          include: { device: true },
          orderBy: { inspectedAt: 'asc' }
        }
      },
      orderBy: [{ taskDate: 'desc' }, { shift: 'asc' }]
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/current', async (req, res) => {
  try {
    await generateDailyTasks();
    const shift = getShiftForTime();
    const today = normalizeDate(new Date());
    const tasks = await prisma.inspectionTask.findMany({
      where: {
        shift,
        taskDate: today
      },
      include: {
        route: {
          include: {
            devices: {
              include: { device: true },
              orderBy: { orderIndex: 'asc' }
            }
          }
        },
        records: {
          include: { device: true },
          orderBy: { inspectedAt: 'asc' }
        }
      }
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const task = await prisma.inspectionTask.findUnique({
      where: { id: req.params.id },
      include: {
        route: {
          include: {
            devices: {
              include: { device: true },
              orderBy: { orderIndex: 'asc' }
            }
          }
        },
        records: {
          include: { device: true },
          orderBy: { inspectedAt: 'asc' }
        }
      }
    });
    if (!task) return res.status(404).json({ error: '任务不存在' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/start', async (req, res) => {
  try {
    const { inspector } = req.body;
    const task = await prisma.inspectionTask.update({
      where: { id: req.params.id },
      data: {
        status: 'IN_PROGRESS',
        inspector,
        startTime: new Date()
      },
      include: {
        route: true,
        records: { include: { device: true } }
      }
    });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/complete', async (req, res) => {
  try {
    const task = await prisma.inspectionTask.update({
      where: { id: req.params.id },
      data: {
        status: 'COMPLETED',
        endTime: new Date()
      },
      include: {
        route: true,
        records: { include: { device: true } }
      }
    });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    await generateDailyTasks();
    res.json({ success: true, message: '任务已生成' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
