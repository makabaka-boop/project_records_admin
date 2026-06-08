const jwt = require('jsonwebtoken');

const JWT_SECRET = 'project_records_secret_key_2024';

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: '无效的认证令牌' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
