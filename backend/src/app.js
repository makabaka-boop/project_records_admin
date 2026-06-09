const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./database/db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const taskNodeRoutes = require('./routes/taskNodes');
const approvalRoutes = require('./routes/approvals');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = 8022;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

initDatabase();

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/task-nodes', taskNodeRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/stats', statsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '项目资料管理系统后端服务运行正常' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`API 地址: http://localhost:${PORT}/api`);
});

module.exports = app;
