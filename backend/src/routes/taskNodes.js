const express = require('express');
const { db } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const { project_id, status, assignee_id } = req.query;

  let sql = `
    SELECT tn.*, u.name as assignee_name, p.name as project_name
    FROM task_nodes tn
    LEFT JOIN users u ON tn.assignee_id = u.id
    JOIN projects p ON tn.project_id = p.id
    WHERE 1=1
  `;
  let params = [];

  if (project_id) {
    sql += ' AND tn.project_id = ?';
    params.push(project_id);
  }

  if (status) {
    sql += ' AND tn.status = ?';
    params.push(status);
  }

  if (assignee_id) {
    sql += ' AND tn.assignee_id = ?';
    params.push(assignee_id);
  }

  sql += ' ORDER BY tn.created_at DESC, tn.sort_order ASC';

  const nodes = db.prepare(sql).all(...params);
  
  res.json({ data: nodes });
});

router.get('/project/:projectId', (req, res) => {
  const { projectId } = req.params;
  const { status } = req.query;

  let sql = `
    SELECT tn.*, u.name as assignee_name, p.name as project_name
    FROM task_nodes tn
    LEFT JOIN users u ON tn.assignee_id = u.id
    JOIN projects p ON tn.project_id = p.id
    WHERE tn.project_id = ?
  `;
  let params = [projectId];

  if (status) {
    sql += ' AND tn.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY tn.sort_order ASC, tn.id ASC';

  const nodes = db.prepare(sql).all(...params);
  
  res.json({ data: nodes });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;

  const node = db.prepare(`
    SELECT tn.*, u.name as assignee_name, p.name as project_name
    FROM task_nodes tn
    LEFT JOIN users u ON tn.assignee_id = u.id
    JOIN projects p ON tn.project_id = p.id
    WHERE tn.id = ?
  `).get(id);

  if (!node) {
    return res.status(404).json({ message: '节点不存在' });
  }

  const history = db.prepare(`
    SELECT ar.*, u.name as operator_name
    FROM approval_records ar
    JOIN users u ON ar.operator_id = u.id
    WHERE ar.node_id = ?
    ORDER BY ar.created_at ASC
  `).all(id);

  res.json({ data: { ...node, history } });
});

router.post('/', (req, res) => {
  const { project_id, name, description, assignee_id, sort_order } = req.body;

  if (!project_id || !name) {
    return res.status(400).json({ message: '项目ID和节点名称不能为空' });
  }

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(project_id);
  if (!project) {
    return res.status(404).json({ message: '项目不存在' });
  }

  const result = db.prepare(`
    INSERT INTO task_nodes (project_id, name, description, assignee_id, sort_order, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(project_id, name, description || '', assignee_id || null, sort_order || 0, 'pending');

  const node = db.prepare('SELECT * FROM task_nodes WHERE id = ?').get(result.lastInsertRowid);

  db.prepare(`
    INSERT INTO approval_records (project_id, node_id, operator_id, previous_status, new_status, remark)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(project_id, node.id, req.user.id, null, 'pending', `创建节点：${name}`);

  res.status(201).json({ data: node, message: '节点创建成功' });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, assignee_id, sort_order } = req.body;

  const node = db.prepare('SELECT * FROM task_nodes WHERE id = ?').get(id);
  if (!node) {
    return res.status(404).json({ message: '节点不存在' });
  }

  db.prepare(`
    UPDATE task_nodes SET name = ?, description = ?, assignee_id = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, description || '', assignee_id || null, sort_order || 0, id);

  const updatedNode = db.prepare('SELECT * FROM task_nodes WHERE id = ?').get(id);
  
  res.json({ data: updatedNode, message: '节点更新成功' });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const node = db.prepare('SELECT * FROM task_nodes WHERE id = ?').get(id);
  if (!node) {
    return res.status(404).json({ message: '节点不存在' });
  }

  db.prepare('DELETE FROM task_nodes WHERE id = ?').run(id);

  db.prepare(`
    INSERT INTO approval_records (project_id, node_id, operator_id, previous_status, new_status, remark)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(node.project_id, null, req.user.id, node.status, null, `删除节点：${node.name}`);

  res.json({ message: '节点删除成功' });
});

router.post('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, remark } = req.body;

  const validStatuses = ['pending', 'in_progress', 'pending_approval', 'rejected', 'completed', 'archived'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: '无效的状态值' });
  }

  const node = db.prepare('SELECT * FROM task_nodes WHERE id = ?').get(id);
  if (!node) {
    return res.status(404).json({ message: '节点不存在' });
  }

  const previousStatus = node.status;

  if (previousStatus === status) {
    return res.status(400).json({ message: '状态未改变' });
  }

  db.prepare(`
    UPDATE task_nodes SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, id);

  db.prepare(`
    INSERT INTO approval_records (project_id, node_id, operator_id, previous_status, new_status, remark)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(node.project_id, id, req.user.id, previousStatus, status, remark || '');

  const updatedNode = db.prepare(`
    SELECT tn.*, u.name as assignee_name
    FROM task_nodes tn
    LEFT JOIN users u ON tn.assignee_id = u.id
    WHERE tn.id = ?
  `).get(id);

  updateProjectStatus(node.project_id);

  res.json({ data: updatedNode, message: '状态更新成功' });
});

function updateProjectStatus(projectId) {
  const nodes = db.prepare('SELECT status FROM task_nodes WHERE project_id = ?').all(projectId);
  
  if (nodes.length === 0) {
    return;
  }

  const statuses = nodes.map(n => n.status);
  let projectStatus;

  if (statuses.every(s => s === 'archived')) {
    projectStatus = 'archived';
  } else if (statuses.every(s => s === 'completed' || s === 'archived')) {
    projectStatus = 'completed';
  } else if (statuses.some(s => s === 'rejected')) {
    projectStatus = 'rejected';
  } else if (statuses.some(s => s === 'pending_approval')) {
    projectStatus = 'pending_approval';
  } else if (statuses.some(s => s === 'in_progress')) {
    projectStatus = 'in_progress';
  } else {
    projectStatus = 'pending';
  }

  const project = db.prepare('SELECT status FROM projects WHERE id = ?').get(projectId);
  if (project.status !== projectStatus) {
    db.prepare('UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(projectStatus, projectId);
  }
}

module.exports = router;
