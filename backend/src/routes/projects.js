const express = require('express');
const { db } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const { status, keyword } = req.query;
  
  let sql = `
    SELECT p.*, u.name as creator_name,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
      (SELECT COUNT(*) FROM task_nodes WHERE project_id = p.id) as node_count,
      (SELECT COUNT(*) FROM task_nodes WHERE project_id = p.id AND status = 'completed') as completed_node_count
    FROM projects p
    LEFT JOIN users u ON p.created_by = u.id
    WHERE 1=1
  `;
  let params = [];

  if (status) {
    sql += ' AND p.status = ?';
    params.push(status);
  }

  if (keyword) {
    sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  sql += ' ORDER BY p.created_at DESC';

  const projects = db.prepare(sql).all(...params);
  
  res.json({ data: projects });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;

  const project = db.prepare(`
    SELECT p.*, u.name as creator_name
    FROM projects p
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.id = ?
  `).get(id);

  if (!project) {
    return res.status(404).json({ message: '项目不存在' });
  }

  const members = db.prepare(`
    SELECT pm.id, pm.role, pm.joined_at, u.id as user_id, u.username, u.name
    FROM project_members pm
    JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
    ORDER BY pm.joined_at ASC
  `).all(id);

  const nodes = db.prepare(`
    SELECT tn.*, u.name as assignee_name
    FROM task_nodes tn
    LEFT JOIN users u ON tn.assignee_id = u.id
    WHERE tn.project_id = ?
    ORDER BY tn.sort_order ASC, tn.id ASC
  `).all(id);

  const recentApprovals = db.prepare(`
    SELECT ar.*, u.name as operator_name
    FROM approval_records ar
    JOIN users u ON ar.operator_id = u.id
    WHERE ar.project_id = ?
    ORDER BY ar.created_at DESC
    LIMIT 10
  `).all(id);

  res.json({
    data: {
      ...project,
      members,
      nodes,
      recentApprovals
    }
  });
});

router.post('/', (req, res) => {
  const { name, description, status } = req.body;

  if (!name) {
    return res.status(400).json({ message: '项目名称不能为空' });
  }

  const result = db.prepare(`
    INSERT INTO projects (name, description, status, created_by)
    VALUES (?, ?, ?, ?)
  `).run(name, description || '', status || 'pending', req.user.id);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  
  db.prepare(`
    INSERT INTO approval_records (project_id, operator_id, previous_status, new_status, remark)
    VALUES (?, ?, ?, ?, ?)
  `).run(project.id, req.user.id, null, project.status, '项目创建');

  res.status(201).json({ data: project, message: '项目创建成功' });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, status } = req.body;

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!project) {
    return res.status(404).json({ message: '项目不存在' });
  }

  const previousStatus = project.status;

  db.prepare(`
    UPDATE projects SET name = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, description || '', status || 'pending', id);

  if (status && status !== previousStatus) {
    db.prepare(`
      INSERT INTO approval_records (project_id, operator_id, previous_status, new_status, remark)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, req.user.id, previousStatus, status, '项目状态更新');
  }

  const updatedProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  
  res.json({ data: updatedProject, message: '项目更新成功' });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
  if (!project) {
    return res.status(404).json({ message: '项目不存在' });
  }

  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  
  res.json({ message: '项目删除成功' });
});

router.get('/:id/members', (req, res) => {
  const { id } = req.params;

  const members = db.prepare(`
    SELECT pm.id, pm.role, pm.joined_at, u.id as user_id, u.username, u.name
    FROM project_members pm
    JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
    ORDER BY pm.joined_at ASC
  `).all(id);

  res.json({ data: members });
});

router.post('/:id/members', (req, res) => {
  const { id } = req.params;
  const { user_id, role } = req.body;

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
  if (!project) {
    return res.status(404).json({ message: '项目不存在' });
  }

  const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(user_id);
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  const existingMember = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(id, user_id);
  if (existingMember) {
    return res.status(400).json({ message: '该用户已是项目成员' });
  }

  db.prepare(`
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (?, ?, ?)
  `).run(id, user_id, role || 'member');

  db.prepare(`
    INSERT INTO approval_records (project_id, operator_id, previous_status, new_status, remark)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.user.id, '', '', `添加成员：${user.name}`);

  res.status(201).json({ message: '成员添加成功' });
});

router.delete('/:id/members/:memberId', (req, res) => {
  const { id, memberId } = req.params;

  const member = db.prepare(`
    SELECT pm.*, u.name
    FROM project_members pm
    JOIN users u ON pm.user_id = u.id
    WHERE pm.id = ? AND pm.project_id = ?
  `).get(memberId, id);

  if (!member) {
    return res.status(404).json({ message: '成员不存在' });
  }

  db.prepare('DELETE FROM project_members WHERE id = ?').run(memberId);

  db.prepare(`
    INSERT INTO approval_records (project_id, operator_id, previous_status, new_status, remark)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.user.id, '', '', `移除成员：${member.name}`);

  res.json({ message: '成员移除成功' });
});

module.exports = router;
