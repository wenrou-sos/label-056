const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.inspectionRecord.deleteMany();
  await prisma.hazard.deleteMany();
  await prisma.inspectionTask.deleteMany();
  await prisma.routeDevice.deleteMany();
  await prisma.inspectionRoute.deleteMany();
  await prisma.device.deleteMany();

  const now = new Date();
  const soonExpire = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const farExpire = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const installDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  const devices = [];
  const floors = ['B1', '1F', '2F', '3F', '4F'];
  const areas = ['A区', 'B区', 'C区'];
  const positions = ['走廊东侧', '走廊西侧', '电梯厅', '消防通道入口', '商铺门口', '中庭南侧'];

  const typeConfigs = [
    { type: 'FIRE_HYDRANT', prefix: 'XHS', count: 10 },
    { type: 'FIRE_EXTINGUISHER', prefix: 'MHQ', count: 15 },
    { type: 'SMOKE_DETECTOR', prefix: 'YG', count: 20 },
    { type: 'SPRINKLER', prefix: 'PLT', count: 12 },
    { type: 'EMERGENCY_LIGHT', prefix: 'YJD', count: 8 }
  ];

  let codeIndex = 1;
  for (const config of typeConfigs) {
    for (let i = 0; i < config.count; i++) {
      const floor = floors[Math.floor(Math.random() * floors.length)];
      const area = areas[Math.floor(Math.random() * areas.length)];
      const pos = positions[Math.floor(Math.random() * positions.length)];
      const code = `${config.prefix}-${String(codeIndex).padStart(4, '0')}`;

      const data = {
        code,
        type: config.type,
        floor,
        location: `${floor} ${area}${pos}`,
        installDate: installDate,
        expireDate: i < 3 ? soonExpire : farExpire,
        status: 'NORMAL'
      };

      if (config.type === 'FIRE_EXTINGUISHER') {
        data.pressureExpireDate = i < 2 ? soonExpire : farExpire;
      }
      if (config.type === 'SMOKE_DETECTOR') {
        data.lastCleanDate = pastDate;
        data.cleanCycleDays = 180;
      }

      const device = await prisma.device.create({ data });
      devices.push(device);
      codeIndex++;
    }
  }

  console.log(`创建了 ${devices.length} 个设备`);

  const route1 = await prisma.inspectionRoute.create({
    data: {
      name: '1-2楼日常巡检',
      shift: 'MORNING',
      description: '1楼2楼消防设备日常巡检路线',
      devices: {
        create: devices
          .filter(d => d.floor === '1F' || d.floor === '2F')
          .slice(0, 10)
          .map((d, idx) => ({ deviceId: d.id, orderIndex: idx }))
      }
    }
  });

  const route2 = await prisma.inspectionRoute.create({
    data: {
      name: '3-4楼日常巡检',
      shift: 'AFTERNOON',
      description: '3楼4楼消防设备日常巡检路线',
      devices: {
        create: devices
          .filter(d => d.floor === '3F' || d.floor === '4F')
          .slice(0, 10)
          .map((d, idx) => ({ deviceId: d.id, orderIndex: idx }))
      }
    }
  });

  const route3 = await prisma.inspectionRoute.create({
    data: {
      name: '夜间全场巡检',
      shift: 'NIGHT',
      description: '夜间全楼层消防设备巡检',
      devices: {
        create: devices
          .slice(0, 15)
          .map((d, idx) => ({ deviceId: d.id, orderIndex: idx }))
      }
    }
  });

  console.log('创建了3条巡检路线');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const task1 = await prisma.inspectionTask.create({
    data: {
      routeId: route1.id,
      shift: 'MORNING',
      taskDate: today,
      status: 'PENDING'
    }
  });
  const task2 = await prisma.inspectionTask.create({
    data: {
      routeId: route2.id,
      shift: 'AFTERNOON',
      taskDate: today,
      status: 'PENDING'
    }
  });
  const task3 = await prisma.inspectionTask.create({
    data: {
      routeId: route3.id,
      shift: 'NIGHT',
      taskDate: today,
      status: 'PENDING'
    }
  });

  console.log('创建了3个今日巡检任务');

  const hazardDevices = devices.filter(d =>
    d.type === 'FIRE_EXTINGUISHER' || d.type === 'FIRE_HYDRANT'
  );

  await prisma.hazard.create({
    data: {
      title: '灭火器压力不足',
      description: '巡检发现灭火器压力表指针在红色区域，需要更换',
      deviceId: hazardDevices[0].id,
      status: 'PENDING_ASSIGN'
    }
  });

  await prisma.hazard.create({
    data: {
      title: '消火栓箱门损坏',
      description: '消火栓箱玻璃门破裂，需要维修',
      deviceId: hazardDevices[1].id,
      status: 'REPAIRING',
      assignee: '张师傅'
    }
  });

  console.log('创建了2条隐患记录');
  console.log('种子数据导入完成！');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
