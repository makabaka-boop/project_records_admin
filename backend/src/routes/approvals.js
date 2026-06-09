const express = require('express');
const { db } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const { project_id, node_id, operator_id, status } = req.query;

  let sql = `
    SELECT ar.*, u.name as operator_name, p.name as project_name, tn.name as node_name, tn.status as node_current_status
    FROM approval_records ar
    JOIN users u ON ar.operator_id = u.id
    JOIN projects p ON ar.project_id = p.id
    LEFT JOIN task_nodes tn ON ar.node_id = tn.id
    WHERE 1=1
  `;
  let params = [];

  if (project_id) {
    sql += ' AND ar.project_id = ?';
    params.push(project_id);
  }

  if (node_id) {
    sql += ' AND ar.node_id = ?';
    params.push(node_id);
  }

  if (operator_id) {
    sql += ' AND ar.operator_id = ?';
    params.push(operator_id);
  }

  if (status) {
    sql += ' AND ar.new_status = ?';
    params.push(status);
  }

  sql += ' ORDER BY ar.created_at DESC';

  const records = db.prepare(sql).all(...params);
  
  res.json({ data: records });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;

  const record = db.prepare(`
    SELECT ar.*, u.name as operator_name, p.name as project_name, tn.name as node_name
    FROM approval_records ar
    JOIN users u ON ar.operator_id = u.id
    JOIN projects p ON ar.project_id = p.id
    LEFT JOIN task_nodes tn ON ar.node_id = tn.id
    WHERE ar.id = ?
  `).get(id);

  if (!record) {
    return res.status(404).json({ message: '记录不存在' });
  }

  res.json({ data: record });
});

router.post('/:id/approve', (req, res) => {
  const { id } = req.params;
  const { remark } = req.body;

  const approval = db.prepare('SELECT * FROM approval_records WHERE id = ?').get(id);
  if (!approval) {
    return res.status(404).json({ message: '审批记录不存在' });
  }

  if (approval.new_status !== 'pending_approval') {
    return res.status(400).json({ message: '当前状态不可审批' });
  }

  if (!approval.node_id) {
    return res.status(400).json({ message: '该记录无关联节点，无法审批' });
  }

  const node = db.prepare('SELECT * FROM task_nodes WHERE id = ?').get(approval.node_id);
  if (!node) {
    return res.status(404).json({ message: '关联节点不存在' });
  }

  if (node.status !== 'pending_approval') {
    return res.status(400).json({ message: '该节点已处理，无需重复审批' });
  }

  db.prepare(`
    UPDATE task_nodes SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run('completed', node.id);

  db.prepare(`
    INSERT INTO approval_records (project_id, node_id, operator_id, previous_status, new_status, remark)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(node.project_id, node.id, req.user.id, 'pending_approval', 'completed', remark || '审批通过');

  updateProjectStatus(node.project_id);

  res.json({ message: '审批通过' });
});

router.post('/:id/reject', (req, res) => {
  const { id } = req.params;
  const { remark } = req.body;

  const approval = db.prepare('SELECT * FROM approval_records WHERE id = ?').get(id);
  if (!approval) {
    return res.status(404).json({ message: '审批记录不存在' });
  }

  if (approval.new_status !== 'pending_approval') {
    return res.status(400).json({ message: '当前状态不可审批' });
  }

  if (!approval.node_id) {
    return res.status(400).json({ message: '该记录无关联节点，无法审批' });
  }

  const node = db.prepare('SELECT * FROM task_nodes WHERE id = ?').get(approval.node_id);
  if (!node) {
    return res.status(404).json({ message: '关联节点不存在' });
  }

  if (node.status !== 'pending_approval') {
    return res.status(400).json({ message: '该节点已处理，无需重复审批' });
  }

  db.prepare(`
    UPDATE task_nodes SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run('rejected', node.id);

  db.prepare(`
    INSERT INTO approval_records (project_id, node_id, operator_id, previous_status, new_status, remark)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(node.project_id, node.id, req.user.id, 'pending_approval', 'rejected', remark || '审批退回');

  updateProjectStatus(node.project_id);

  res.json({ message: '已退回' });
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
