const bcrypt = require('bcryptjs');
const db = require('../models/database');

function getAllUsers(req, res) {
  const { role, keyword } = req.query;
  let sql = `
    SELECT u.*, 
      (SELECT COUNT(*) FROM project_members WHERE user_id = u.id) as project_count
    FROM users u
    WHERE 1=1
  `;
  const params = [];

  if (role) {
    sql += ' AND u.role = ?';
    params.push(role);
  }
  if (keyword) {
    sql += ' AND (u.name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  sql += ' ORDER BY u.created_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误' });
    }
    res.json({ users: rows });
  });
}

function getUserById(req, res) {
  const { id } = req.params;

  db.get('SELECT id, username, name, role, email, created_at FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误' });
    }
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    db.all(`
      SELECT p.*, pm.role as project_role FROM project_members pm
      LEFT JOIN projects p ON pm.project_id = p.id
      WHERE pm.user_id = ?
      ORDER BY pm.joined_at DESC
    `, [id], (err, projects) => {
      if (err) {
        return res.status(500).json({ message: '数据库错误' });
      }
      res.json({ user, projects });
    });
  });
}

function createUser(req, res) {
  const { username, password, name, role, email } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ message: '用户名、密码和姓名不能为空' });
  }

  db.get('SELECT id FROM users WHERE username = ?', [username], (err, existing) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误' });
    }
    if (existing) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run(
      'INSERT INTO users (username, password, name, role, email) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, name, role || 'member', email],
      function (err) {
        if (err) {
          return res.status(500).json({ message: '数据库错误' });
        }
        res.json({ id: this.lastID, message: '用户创建成功' });
      }
    );
  });
}

function updateUser(req, res) {
  const { id } = req.params;
  const { name, role, email, password } = req.body;

  let sql = 'UPDATE users SET name = ?, role = ?, email = ?';
  const params = [name, role, email];

  if (password) {
    sql += ', password = ?';
    params.push(bcrypt.hashSync(password, 10));
  }

  sql += ' WHERE id = ?';
  params.push(id);

  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ message: '数据库错误' });
    }
    res.json({ message: '用户更新成功' });
  });
}

function deleteUser(req, res) {
  const { id } = req.params;

  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ message: '不能删除当前登录用户' });
  }

  db.run('DELETE FROM project_members WHERE user_id = ?', [id], (err) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误' });
    }
    db.run('DELETE FROM users WHERE id = ?', [id], (err) => {
      if (err) {
        return res.status(500).json({ message: '数据库错误' });
      }
      res.json({ message: '用户删除成功' });
    });
  });
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
