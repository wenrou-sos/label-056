# 商场消防巡检系统

商场物业安保部门专用的消防设备巡检管理平台。

## 功能特性

### 1. 设备台账管理
- 管理商场内所有消防设备：消火栓、灭火器、烟感探测器、喷淋头、应急灯
- 设备信息包含：编号、类型、所在楼层、具体位置、安装日期、有效期
- 灭火器特殊属性：压力表有效期
- 烟感探测器特殊属性：清洁周期、上次清洁日期

### 2. 巡检路线管理
- 安保主管可制定巡检路线
- 将沿途检查的设备按顺序排列
- 路线分配到具体班次（早班/中班/夜班）
- 系统自动生成当班巡检任务

### 3. 扫码巡检
- 安保员使用手机浏览器扫描设备二维码
- 打开检查表单，填写设备状态
- 支持状态：正常/异常/已过期/损坏
- 异常情况可拍照上传
- 自动记录检查时间和检查人

### 4. 隐患上报与跟踪
- 巡检中发现的问题转为隐患单
- 派给维修组处理
- 状态流转：待派单 → 维修中 → 已修复 → 验收通过
- 维修完成后需验收人确认

### 5. 到期提醒
- 灭火器快过期提前7天提醒
- 烟感探测器到达清洁周期提醒
- 首页展示提醒列表

## 技术栈

### 后端
- **运行环境**: Node.js
- **框架**: Express.js
- **ORM**: Prisma
- **数据库**: MySQL

### 前端
- **框架**: Vue 3
- **UI组件库**: Naive UI
- **构建工具**: Vite
- **HTTP客户端**: Axios
- **路由**: Vue Router
- **状态管理**: Pinia
- **日期处理**: Day.js
- **二维码生成**: QRCode

## 项目结构

```
├── client/                 # 前端项目
│   ├── src/
│   │   ├── api/           # API请求封装
│   │   ├── router/        # 路由配置
│   │   ├── views/        # 页面组件
│   │   ├── App.vue       # 根组件
│   │   └── main.js       # 入口文件
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/                 # 后端项目
│   ├── prisma/
│   │   ├── schema.prisma  # 数据库模型
│   │   └── seed.js       # 种子数据
│   ├── src/
│   │   ├── lib/
│   │   │   └── prisma.js # Prisma客户端
│   │   ├── routes/       # API路由
│   │   │   ├── devices.js      # 设备管理
│   │   │   ├── routes.js       # 路线管理
│   │   │   ├── tasks.js        # 任务管理
│   │   │   ├── inspections.js # 巡检记录
│   │   │   ├── hazards.js      # 隐患管理
│   │   │   ├── reminders.js    # 到期提醒
│   │   │   ├── qrcode.js       # 二维码生成
│   │   │   └── upload.js       # 文件上传
│   │   └── index.js       # 入口文件
│   ├── uploads/           # 上传文件目录
│   ├── package.json
│   └── .env              # 环境变量
│
└── README.md
```

## 数据库模型

### Device (设备)
- `id`: UUID，唯一标识
- `code`: 设备编号，唯一
- `type`: 设备类型 (FIRE_HYDRANT/FIRE_EXTINGUISHER/SMOKE_DETECTOR/SPRINKLER/EMERGENCY_LIGHT)
- `floor`: 所在楼层
- `location`: 具体位置
- `installDate`: 安装日期
- `expireDate`: 有效期
- `pressureExpireDate`: 压力表有效期 (灭火器)
- `lastCleanDate`: 上次清洁日期 (烟感)
- `cleanCycleDays`: 清洁周期天数 (烟感)
- `status`: 状态 (NORMAL/ABNORMAL/EXPIRED/DAMAGED)

### InspectionRoute (巡检路线)
- `id`: UUID
- `name`: 路线名称
- `shift`: 班次 (MORNING/AFTERNOON/NIGHT)
- `description`: 描述

### RouteDevice (路线设备关联)
- `routeId`: 路线ID
- `deviceId`: 设备ID
- `orderIndex`: 顺序索引

### InspectionTask (巡检任务)
- `id`: UUID
- `routeId`: 路线ID
- `shift`: 班次
- `taskDate`: 任务日期
- `status`: 状态 (PENDING/IN_PROGRESS/COMPLETED)
- `inspector`: 检查人
- `startTime`: 开始时间
- `endTime`: 结束时间

### InspectionRecord (巡检记录)
- `id`: UUID
- `taskId`: 任务ID
- `deviceId`: 设备ID
- `result`: 检查结果
- `remark`: 备注
- `photoUrl`: 照片URL
- `inspector`: 检查人
- `inspectedAt`: 检查时间

### Hazard (隐患)
- `id`: UUID
- `title`: 隐患标题
- `description`: 描述
- `deviceId`: 设备ID
- `inspectionId`: 关联巡检记录ID
- `status`: 状态 (PENDING_ASSIGN/REPAIRING/REPAIRED/ACCEPTED)
- `assignee`: 派单人
- `repairRemark`: 维修说明
- `repairPhotoUrl`: 维修照片
- `repairedAt`: 维修完成时间
- `acceptor`: 验收人
- `acceptRemark`: 验收说明
- `acceptedAt`: 验收时间

## 快速开始

### 1. 环境要求
- Node.js >= 16
- MySQL 8.0+
- npm 或 yarn

### 2. 数据库配置

创建MySQL数据库：
```sql
CREATE DATABASE fire_inspection CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

配置数据库连接（编辑 `server/.env`）：
```env
DATABASE_URL="mysql://用户名:密码@localhost:3306/fire_inspection?schema=public"
PORT=3000
```

### 3. 安装依赖

```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

### 4. 初始化数据库

```bash
cd server

# 生成Prisma客户端
npx prisma generate

# 同步数据库结构
npx prisma db push

# 导入种子数据（可选）
npm run seed
```

### 5. 启动服务

```bash
# 启动后端服务 (终端1)
cd server
npm run dev
# 服务运行在 http://localhost:3000

# 启动前端服务 (终端2)
cd client
npm run dev
# 服务运行在 http://localhost:5173
```

### 6. 访问系统

打开浏览器访问：http://localhost:5173

## API接口

### 设备管理
- `GET /api/devices` - 获取设备列表
- `GET /api/devices/:id` - 获取设备详情
- `GET /api/devices/code/:code` - 根据编号获取设备
- `POST /api/devices` - 创建设备
- `PUT /api/devices/:id` - 更新设备
- `DELETE /api/devices/:id` - 删除设备
- `GET /api/devices/meta/floors` - 获取楼层列表

### 巡检路线
- `GET /api/routes` - 获取路线列表
- `GET /api/routes/:id` - 获取路线详情
- `POST /api/routes` - 创建路线
- `PUT /api/routes/:id` - 更新路线
- `DELETE /api/routes/:id` - 删除路线

### 巡检任务
- `GET /api/tasks` - 获取任务列表
- `GET /api/tasks/current` - 获取当前班次任务
- `GET /api/tasks/:id` - 获取任务详情
- `POST /api/tasks/:id/start` - 开始任务
- `POST /api/tasks/:id/complete` - 完成任务
- `POST /api/tasks/generate` - 生成当日任务

### 巡检记录
- `POST /api/inspections` - 创建巡检记录
- `GET /api/inspections/task/:taskId` - 获取任务巡检记录
- `GET /api/inspections/device/:deviceId` - 获取设备巡检记录

### 隐患管理
- `GET /api/hazards` - 获取隐患列表
- `GET /api/hazards/:id` - 获取隐患详情
- `POST /api/hazards` - 创建隐患
- `PUT /api/hazards/:id/assign` - 派单
- `PUT /api/hazards/:id/repair` - 维修完成
- `PUT /api/hazards/:id/accept` - 验收

### 到期提醒
- `GET /api/reminders` - 获取到期提醒

### 二维码
- `GET /api/qrcode/device/:id` - 生成设备二维码
- `GET /api/qrcode/batch` - 批量生成二维码

### 文件上传
- `POST /api/upload` - 上传文件

## 设备类型

| 类型代码 | 名称 | 特殊属性 |
|---------|------|---------|
| FIRE_HYDRANT | 消火栓 | 无 |
| FIRE_EXTINGUISHER | 灭火器 | 压力表有效期 |
| SMOKE_DETECTOR | 烟感探测器 | 清洁周期 |
| SPRINKLER | 喷淋头 | 无 |
| EMERGENCY_LIGHT | 应急灯 | 无 |

## 班次说明

- **早班 (MORNING)**: 06:00 - 14:00
- **中班 (AFTERNOON)**: 14:00 - 22:00
- **夜班 (NIGHT)**: 22:00 - 06:00

## 使用流程

### 1. 设备管理
1. 进入「设备台账」页面
2. 点击「添加设备」录入消防设备信息
3. 为设备生成二维码并张贴

### 2. 路线规划
1. 进入「巡检路线」页面
2. 创建巡检路线，分配班次
3. 从设备列表中选择该路线要检查的设备

### 3. 日常巡检
1. 进入「首页概览」查看今日任务
2. 点击「开始巡检」进入任务详情
3. 使用手机扫描设备二维码
4. 填写巡检表单（状态、备注、照片）
5. 如有异常可同步创建隐患单

### 4. 隐患处理
1. 进入「隐患管理」查看隐患列表
2. 对隐患进行派单、维修、验收操作
3. 全程跟踪隐患处理进度

## 注意事项

- 二维码URL格式：`http://localhost:5173/scan/{设备编号}`
- 生产环境请修改为实际域名
- 巡检照片保存在 `server/uploads/` 目录
- 建议定期清理过期数据以保持系统性能

## 开发说明

- 前端使用Vite开发服务器，支持热更新
- 后端使用Nodemon，修改文件自动重启
- 所有API请求统一通过 `client/src/api/index.js` 封装
- 组件使用Naive UI组件库，确保风格统一

## 许可证

MIT License
