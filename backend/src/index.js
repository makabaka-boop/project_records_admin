const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = 8022;
const JWT_SECRET = 'project_records_admin_secret_key_2024';

app.use(cors());
app.use(express.json());

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ code: 403, message: 'token无效' });
    }
    req.user = user;
    next();
  });
};

const STATUS_LABELS = {
  pending: '待开始',
  in_progress: '进行中',
  pending_approval: '待审批',
  rejected: '已退回',
  completed: '已完成',
  archived: '已归档'
};

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ code: 401, message: '用户名或密码错误' });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ code: 401, message: '用户名或密码错误' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    code: 200,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email
      }
    }
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, name, role, email FROM users WHERE id = ?').get(req.user.id);
  res.json({ code: 200, data: user });
});

app.get('/api/users', authenticateToken, (req, res) => {
  const users = db.prepare('SELECT id, username, name, role, email, created_at FROM users ORDER BY id').all();
  res.json({ code: 200, data: users });
});

app.post('/api/users', authenticateToken, (req, res) => {
  const { username, password, name, role, email } = req.body;
  const hashedPassword = bcrypt.hashSync(password || '123456', 10);
  try {
    const result = db.prepare(
      'INSERT INTO users (username, password, name, role, email) VALUES (?, ?, ?, ?, ?)'
    ).run(username, hashedPassword, name, role || 'member', email || null);
    res.json({ code: 200, data: { id: result.lastInsertRowid } });
  } catch (e) {
    res.status(400).json({ code: 400, message: '用户名已存在' });
  }
});

app.put('/api/users/:id', authenticateToken, (req, res) => {
  const { name, role, email, password } = req.body;
  const userId = req.params.id;
  if (password) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET name = ?, role = ?, email = ?, password = ? WHERE id = ?')
      .run(name, role, email, hashedPassword, userId);
  } else {
    db.prepare('UPDATE users SET name = ?, role = ?, email = ? WHERE id = ?')
      .run(name, role, email, userId);
  }
  res.json({ code: 200, message: '更新成功' });
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
  const userId = req.params.id;
  const deleteUser = db.transaction(() => {
    db.prepare('DELETE FROM project_members WHERE user_id = ?').run(userId);
    db.prepare('UPDATE project_nodes SET assignee_id = NULL WHERE assignee_id = ?').run(userId);
    db.prepare('UPDATE projects SET creator_id = NULL WHERE creator_id = ?').run(userId);
    db.prepare('DELETE FROM node_status_logs WHERE operator_id = ?').run(userId);
    db.prepare('DELETE FROM approval_records WHERE approver_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });
  deleteUser();
  res.json({ code: 200, message: '删除成功' });
});

app.get('/api/projects', authenticateToken, (req, res) => {
  const projects = db.prepare(`
    SELECT p.*, u.name as creator_name,
      (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count,
      (SELECT COUNT(*) FROM project_nodes pn WHERE pn.project_id = p.id) as node_count
    FROM projects p
    LEFT JOIN users u ON p.creator_id = u.id
    ORDER BY p.created_at DESC
  `).all();
  res.json({ code: 200, data: projects });
});

app.get('/api/projects/:id', authenticateToken, (req, res) => {
  const project = db.prepare(`
    SELECT p.*, u.name as creator_name FROM projects p
    LEFT JOIN users u ON p.creator_id = u.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!project) {
    return res.status(404).json({ code: 404, message: '项目不存在' });
  }

  project.members = db.prepare(`
    SELECT pm.id, pm.role as member_role, u.id as user_id, u.name, u.username, u.email
    FROM project_members pm
    JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
  `).all(req.params.id);

  project.nodes = db.prepare(`
    SELECT pn.*, u.name as assignee_name FROM project_nodes pn
    LEFT JOIN users u ON pn.assignee_id = u.id
    WHERE pn.project_id = ?
    ORDER BY pn.sort_order, pn.id
  `).all(req.params.id);

  project.approval_count = db.prepare('SELECT COUNT(*) as count FROM approval_records WHERE project_id = ?').get(req.params.id).count;

  res.json({ code: 200, data: project });
});

app.post('/api/projects', authenticateToken, (req, res) => {
  const { name, description, status } = req.body;
  const result = db.prepare(
    'INSERT INTO projects (name, description, status, creator_id) VALUES (?, ?, ?, ?)'
  ).run(name, description || '', status || 'pending', req.user.id);

  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)')
    .run(result.lastInsertRowid, req.user.id, 'manager');

  res.json({ code: 200, data: { id: result.lastInsertRowid } });
});

app.put('/api/projects/:id', authenticateToken, (req, res) => {
  const { name, description, status } = req.body;
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 404, message: '项目不存在' });
  }
  db.prepare(`
    UPDATE projects SET name = ?, description = ?, status = COALESCE(?, status), updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, description, status || null, req.params.id);
  res.json({ code: 200, message: '更新成功' });
});

app.delete('/api/projects/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ code: 200, message: '删除成功' });
});

app.get('/api/projects/:id/members', authenticateToken, (req, res) => {
  const members = db.prepare(`
    SELECT pm.*, u.name, u.username, u.email FROM project_members pm
    JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
  `).all(req.params.id);
  res.json({ code: 200, data: members });
});

app.post('/api/projects/:id/members', authenticateToken, (req, res) => {
  const { user_id, role } = req.body;
  try {
    db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)')
      .run(req.params.id, user_id, role || 'member');
    res.json({ code: 200, message: '添加成功' });
  } catch (e) {
    res.status(400).json({ code: 400, message: '成员已存在' });
  }
});

app.delete('/api/projects/:id/members/:memberId', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM project_members WHERE id = ? AND project_id = ?')
    .run(req.params.memberId, req.params.id);
  res.json({ code: 200, message: '移除成功' });
});

app.get('/api/nodes', authenticateToken, (req, res) => {
  const { project_id } = req.query;
  let nodes;
  if (project_id) {
    nodes = db.prepare(`
      SELECT pn.*, u.name as assignee_name, p.name as project_name
      FROM project_nodes pn
      LEFT JOIN users u ON pn.assignee_id = u.id
      LEFT JOIN projects p ON pn.project_id = p.id
      WHERE pn.project_id = ?
      ORDER BY pn.sort_order, pn.id
    `).all(project_id);
  } else {
    nodes = db.prepare(`
      SELECT pn.*, u.name as assignee_name, p.name as project_name
      FROM project_nodes pn
      LEFT JOIN users u ON pn.assignee_id = u.id
      LEFT JOIN projects p ON pn.project_id = p.id
      ORDER BY pn.updated_at DESC
    `).all();
  }
  res.json({ code: 200, data: nodes });
});

app.get('/api/nodes/:id', authenticateToken, (req, res) => {
  const node = db.prepare(`
    SELECT pn.*, u.name as assignee_name, p.name as project_name
    FROM project_nodes pn
    LEFT JOIN users u ON pn.assignee_id = u.id
    LEFT JOIN projects p ON pn.project_id = p.id
    WHERE pn.id = ?
  `).get(req.params.id);

  if (!node) {
    return res.status(404).json({ code: 404, message: '节点不存在' });
  }

  node.logs = db.prepare(`
    SELECT nsl.*, u.name as operator_name
    FROM node_status_logs nsl
    LEFT JOIN users u ON nsl.operator_id = u.id
    WHERE nsl.node_id = ?
    ORDER BY nsl.created_at DESC
  `).all(req.params.id);

  res.json({ code: 200, data: node });
});

app.post('/api/nodes', authenticateToken, (req, res) => {
  const { project_id, name, description, assignee_id, deadline, sort_order } = req.body;
  const result = db.prepare(`
    INSERT INTO project_nodes (project_id, name, description, status, assignee_id, deadline, sort_order)
    VALUES (?, ?, ?, 'pending', ?, ?, ?)
  `).run(project_id, name, description || '', assignee_id || null, deadline || null, sort_order || 0);

  db.prepare(`
    INSERT INTO node_status_logs (node_id, from_status, to_status, operator_id, remark)
    VALUES (?, NULL, 'pending', ?, '创建节点')
  `).run(result.lastInsertRowid, req.user.id);

  res.json({ code: 200, data: { id: result.lastInsertRowid } });
});

app.put('/api/nodes/:id', authenticateToken, (req, res) => {
  const { name, description, assignee_id, deadline, sort_order } = req.body;
  db.prepare(`
    UPDATE project_nodes SET name = ?, description = ?, assignee_id = ?, deadline = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, description, assignee_id, deadline, sort_order, req.params.id);
  res.json({ code: 200, message: '更新成功' });
});

app.put('/api/nodes/:id/status', authenticateToken, (req, res) => {
  const { status, remark } = req.body;
  const node = db.prepare('SELECT * FROM project_nodes WHERE id = ?').get(req.params.id);

  if (!node) {
    return res.status(404).json({ code: 404, message: '节点不存在' });
  }

  const fromStatus = node.status;

  db.prepare('UPDATE project_nodes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(status, req.params.id);

  db.prepare(`
    INSERT INTO node_status_logs (node_id, from_status, to_status, operator_id, remark)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, fromStatus, status, req.user.id, remark || '');

  const nodeCount = db.prepare('SELECT COUNT(*) as total FROM project_nodes WHERE project_id = ?').get(node.project_id).total;
  const completedCount = db.prepare("SELECT COUNT(*) as total FROM project_nodes WHERE project_id = ? AND status = 'completed'").get(node.project_id).total;
  const pendingApprovalCount = db.prepare("SELECT COUNT(*) as total FROM project_nodes WHERE project_id = ? AND status = 'pending_approval'").get(node.project_id).total;

  let projectStatus = 'in_progress';
  if (nodeCount > 0 && nodeCount === completedCount) {
    projectStatus = 'completed';
  } else if (pendingApprovalCount > 0) {
    projectStatus = 'pending_approval';
  } else if (completedCount === 0) {
    projectStatus = 'pending';
  }

  db.prepare('UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(projectStatus, node.project_id);

  res.json({ code: 200, message: '状态更新成功' });
});

app.delete('/api/nodes/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM project_nodes WHERE id = ?').run(req.params.id);
  res.json({ code: 200, message: '删除成功' });
});

app.get('/api/approvals', authenticateToken, (req, res) => {
  const { project_id, node_id } = req.query;
  let sql = `
    SELECT ar.*, u.name as approver_name, pn.name as node_name, p.name as project_name
    FROM approval_records ar
    LEFT JOIN users u ON ar.approver_id = u.id
    LEFT JOIN project_nodes pn ON ar.node_id = pn.id
    LEFT JOIN projects p ON ar.project_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (project_id) {
    sql += ' AND ar.project_id = ?';
    params.push(project_id);
  }
  if (node_id) {
    sql += ' AND ar.node_id = ?';
    params.push(node_id);
  }
  sql += ' ORDER BY ar.created_at DESC';
  const approvals = db.prepare(sql).all(...params);
  res.json({ code: 200, data: approvals });
});

app.post('/api/approvals', authenticateToken, (req, res) => {
  const { node_id, action, remark } = req.body;
  const node = db.prepare('SELECT * FROM project_nodes WHERE id = ?').get(node_id);

  if (!node) {
    return res.status(404).json({ code: 404, message: '节点不存在' });
  }

  const fromStatus = node.status;
  let toStatus;
  if (action === 'approve') {
    toStatus = 'completed';
  } else if (action === 'reject') {
    toStatus = 'rejected';
  } else {
    return res.status(400).json({ code: 400, message: '无效的审批动作' });
  }

  const result = db.prepare(`
    INSERT INTO approval_records (node_id, project_id, approver_id, action, remark)
    VALUES (?, ?, ?, ?, ?)
  `).run(node_id, node.project_id, req.user.id, action, remark || '');

  db.prepare('UPDATE project_nodes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(toStatus, node_id);

  db.prepare(`
    INSERT INTO node_status_logs (node_id, from_status, to_status, operator_id, remark)
    VALUES (?, ?, ?, ?, ?)
  `).run(node_id, fromStatus, toStatus, req.user.id, remark || '');

  const nodeCount = db.prepare('SELECT COUNT(*) as total FROM project_nodes WHERE project_id = ?').get(node.project_id).total;
  const completedCount = db.prepare("SELECT COUNT(*) as total FROM project_nodes WHERE project_id = ? AND status = 'completed'").get(node.project_id).total;

  let projectStatus = 'in_progress';
  if (nodeCount > 0 && nodeCount === completedCount) {
    projectStatus = 'completed';
  } else if (completedCount === 0) {
    projectStatus = 'pending';
  }

  db.prepare('UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(projectStatus, node.project_id);

  res.json({ code: 200, data: { id: result.lastInsertRowid } });
});

app.get('/api/stats/overview', authenticateToken, (req, res) => {
  const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const nodeCount = db.prepare('SELECT COUNT(*) as count FROM project_nodes').get().count;
  const approvalCount = db.prepare('SELECT COUNT(*) as count FROM approval_records').get().count;

  const projectStatusStats = db.prepare(`
    SELECT status, COUNT(*) as count FROM projects GROUP BY status
  `).all();

  const nodeStatusStats = db.prepare(`
    SELECT status, COUNT(*) as count FROM project_nodes GROUP BY status
  `).all();

  const pendingApprovals = db.prepare(`
    SELECT pn.id as node_id, pn.name as node_name, p.name as project_name, pn.updated_at
    FROM project_nodes pn
    JOIN projects p ON pn.project_id = p.id
    WHERE pn.status = 'pending_approval'
    ORDER BY pn.updated_at DESC
    LIMIT 10
  `).all();

  const recentActivities = db.prepare(`
    SELECT nsl.*, u.name as operator_name, pn.name as node_name, p.name as project_name
    FROM node_status_logs nsl
    LEFT JOIN users u ON nsl.operator_id = u.id
    LEFT JOIN project_nodes pn ON nsl.node_id = pn.id
    LEFT JOIN projects p ON pn.project_id = p.id
    ORDER BY nsl.created_at DESC
    LIMIT 10
  `).all();

  res.json({
    code: 200,
    data: {
      projectCount,
      userCount,
      nodeCount,
      approvalCount,
      projectStatusStats,
      nodeStatusStats,
      pendingApprovals,
      recentActivities,
      statusLabels: STATUS_LABELS
    }
  });
});

app.get('/api/users/:id/projects', authenticateToken, (req, res) => {
  const projects = db.prepare(`
    SELECT p.*, pm.role as member_role,
      (SELECT COUNT(*) FROM project_nodes pn WHERE pn.project_id = p.id) as node_count
    FROM projects p
    JOIN project_members pm ON p.id = pm.project_id
    WHERE pm.user_id = ?
    ORDER BY p.created_at DESC
  `).all(req.params.id);
  res.json({ code: 200, data: projects });
});

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});
