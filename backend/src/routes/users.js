const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const users = db.prepare(`
    SELECT id, username, name, role, created_at
    FROM users
    ORDER BY id ASC
  `).all();
  
  res.json({ data: users });
});

router.post('/', (req, res) => {
  const { username, password, name, role } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ message: '用户名、密码和姓名不能为空' });
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUser) {
    return res.status(400).json({ message: '用户名已存在' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  const result = db.prepare(`
    INSERT INTO users (username, password, name, role)
    VALUES (?, ?, ?, ?)
  `).run(username, hashedPassword, name, role || 'user');

  const user = db.prepare('SELECT id, username, name, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  
  res.status(201).json({ data: user, message: '用户创建成功' });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, role, password } = req.body;

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  let updateSql = 'UPDATE users SET name = ?, role = ?';
  let params = [name, role || 'user'];

  if (password) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    updateSql += ', password = ?';
    params.push(hashedPassword);
  }

  updateSql += ' WHERE id = ?';
  params.push(id);

  db.prepare(updateSql).run(...params);

  const updatedUser = db.prepare('SELECT id, username, name, role, created_at FROM users WHERE id = ?').get(id);
  
  res.json({ data: updatedUser, message: '用户更新成功' });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  if (req.user.id == id) {
    return res.status(400).json({ message: '不能删除自己' });
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  
  res.json({ message: '用户删除成功' });
});

router.get('/:id/projects', (req, res) => {
  const { id } = req.params;
  
  const projects = db.prepare(`
    SELECT p.*, pm.role as member_role, pm.joined_at as joined_at
    FROM projects p
    JOIN project_members pm ON p.id = pm.project_id
    WHERE pm.user_id = ?
    ORDER BY pm.joined_at DESC
  `).all(id);
  
  res.json({ data: projects });
});

module.exports = router;
