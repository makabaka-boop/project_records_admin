const express = require('express');
const { db } = require('../db');

const router = express.Router();

// 项目列表
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, m.name AS owner_name FROM projects p
       LEFT JOIN members m ON m.id = p.owner_id
       ORDER BY p.id DESC`
    )
    .all();
  // 进度统计
  const progressStmt = db.prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status='已完成' THEN 1 ELSE 0 END) AS done
     FROM nodes WHERE project_id = ?`
  );
  const result = rows.map(r => {
    const s = progressStmt.get(r.id);
    return { ...r, node_total: s.total, node_done: s.done };
  });
  res.json(result);
});

// 项目详情：成员、节点、审批摘要
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const project = db
    .prepare(
      `SELECT p.*, m.name AS owner_name FROM projects p
       LEFT JOIN members m ON m.id = p.owner_id
       WHERE p.id = ?`
    )
    .get(id);
  if (!project) return res.status(404).json({ message: '项目不存在' });

  const members = db
    .prepare(
      `SELECT m.*, pm.duty FROM members m
       JOIN project_members pm ON pm.member_id = m.id
       WHERE pm.project_id = ?
       ORDER BY pm.id ASC`
    )
    .all(id);

  const nodes = db
    .prepare(
      `SELECT n.*, m.name AS assignee_name FROM nodes n
       LEFT JOIN members m ON m.id = n.assignee_id
       WHERE n.project_id = ?
       ORDER BY n.sort_order ASC, n.id ASC`
    )
    .all(id);

  const approvals = db
    .prepare(
      `SELECT a.*, n.name AS node_name FROM approvals a
       LEFT JOIN nodes n ON n.id = a.node_id
       WHERE a.project_id = ?
       ORDER BY a.id DESC LIMIT 10`
    )
    .all(id);

  res.json({ ...project, members, nodes, approvals });
});

router.post('/', (req, res) => {
  const { name, code, description, owner_id, start_date, end_date, status } = req.body || {};
  if (!name) return res.status(400).json({ message: '项目名称必填' });
  const r = db
    .prepare(
      `INSERT INTO projects (name, code, description, status, owner_id, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name,
      code || '',
      description || '',
      status || '待开始',
      owner_id || null,
      start_date || '',
      end_date || ''
    );
  res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ message: '项目不存在' });
  const { name, code, description, owner_id, start_date, end_date, status } = req.body || {};
  db.prepare(
    `UPDATE projects SET name=?, code=?, description=?, status=?, owner_id=?, start_date=?, end_date=? WHERE id=?`
  ).run(
    name ?? existing.name,
    code ?? existing.code,
    description ?? existing.description,
    status ?? existing.status,
    owner_id ?? existing.owner_id,
    start_date ?? existing.start_date,
    end_date ?? existing.end_date,
    id
  );
  res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  res.json({ ok: true });
});

// 项目成员管理
router.post('/:id/members', (req, res) => {
  const project_id = Number(req.params.id);
  const { member_id, duty } = req.body || {};
  if (!member_id) return res.status(400).json({ message: '成员必选' });
  try {
    db.prepare(
      'INSERT INTO project_members (project_id, member_id, duty) VALUES (?, ?, ?)'
    ).run(project_id, member_id, duty || '');
  } catch (e) {
    return res.status(400).json({ message: '该成员已加入项目' });
  }
  res.json({ ok: true });
});

router.delete('/:id/members/:memberId', (req, res) => {
  db.prepare(
    'DELETE FROM project_members WHERE project_id = ? AND member_id = ?'
  ).run(Number(req.params.id), Number(req.params.memberId));
  res.json({ ok: true });
});

module.exports = router;
