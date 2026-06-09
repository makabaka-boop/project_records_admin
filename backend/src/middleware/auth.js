const jwt = require('jsonwebtoken');
const { db } = require('../database/db');

const JWT_SECRET = 'project_records_admin_secret_key_2024';

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, username, name, role FROM users WHERE id = ?').get(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: '无效的认证令牌' });
  }
}

module.exports = {
  authMiddleware,
  JWT_SECRET
};
