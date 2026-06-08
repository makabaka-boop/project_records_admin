const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./db');
const { authMiddleware } = require('./auth');

const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const projectRoutes = require('./routes/projects');
const nodeRoutes = require('./routes/nodes');
const approvalRoutes = require('./routes/approvals');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = 8022;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// 数据库初始化（首次启动自动建表 + 写入默认数据）
initDatabase();

app.get('/api/health', (req, res) => res.json({ ok: true }));

// 登录无需鉴权
app.use('/api/auth', authRoutes);

// 受保护路由
app.use('/api/members', authMiddleware, memberRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/nodes', authMiddleware, nodeRoutes);
app.use('/api/approvals', authMiddleware, approvalRoutes);
app.use('/api/stats', authMiddleware, statsRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || '服务器异常' });
});

app.listen(PORT, () => {
  console.log(`[backend] 服务已启动: http://localhost:${PORT}`);
});
