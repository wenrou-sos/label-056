const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const deviceRoutes = require('./routes/devices');
const routeRoutes = require('./routes/routes');
const taskRoutes = require('./routes/tasks');
const inspectionRoutes = require('./routes/inspections');
const hazardRoutes = require('./routes/hazards');
const reminderRoutes = require('./routes/reminders');
const uploadRoutes = require('./routes/upload');
const qrcodeRoutes = require('./routes/qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '消防巡检系统服务运行中' });
});

app.use('/api/devices', deviceRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/hazards', hazardRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/qrcode', qrcodeRoutes);

app.listen(PORT, () => {
  console.log(`🚀 消防巡检系统服务已启动: http://localhost:${PORT}`);
});

module.exports = app;
