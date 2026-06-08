const express = require('express');
const { db } = require('../db');

const router = express.Router();

// 列表
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM members ORDER BY id ASC').all();
  res.json(rows);
});

// 详情 + 参与项目
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  if (!member) return res.status(404).json({ message: '成员不存在' });
  const projects = db
    .prepare(
      `SELECT p.*, pm.duty FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       WHERE pm.member_id = ?
       ORDER BY p.id DESC`
    )
    .all(id);
  res.json({ ...member, projects });
});

router.post('/', (req, res) => {
  const { name, role, email, phone, department } = req.body || {};
  if (!name || !role) return res.status(400).json({ message: '姓名与角色必填' });
  const r = db
    .prepare(
      'INSERT INTO members (name, role, email, phone, department) VALUES (?, ?, ?, ?, ?)'
    )
    .run(name, role, email || '', phone || '', department || '');
  res.json(db.prepare('SELECT * FROM members WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, role, email, phone, department } = req.body || {};
  const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ message: '成员不存在' });
  db.prepare(
    'UPDATE members SET name = ?, role = ?, email = ?, phone = ?, department = ? WHERE id = ?'
  ).run(
    name ?? existing.name,
    role ?? existing.role,
    email ?? existing.email,
    phone ?? existing.phone,
    department ?? existing.department,
    id
  );
  res.json(db.prepare('SELECT * FROM members WHERE id = ?').get(id));
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ message: '成员不存在' });
  // 删除前先解除外键引用，避免外键约束失败
  const tx = db.transaction(() => {
    db.prepare('UPDATE nodes SET assignee_id = NULL WHERE assignee_id = ?').run(id);
    db.prepare('UPDATE projects SET owner_id = NULL WHERE owner_id = ?').run(id);
    db.prepare('DELETE FROM project_members WHERE member_id = ?').run(id);
    db.prepare('DELETE FROM members WHERE id = ?').run(id);
  });
  tx();
  res.json({ ok: true });
});

module.exports = router;
