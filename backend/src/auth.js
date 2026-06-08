const jwt = require('jsonwebtoken');

const SECRET = 'project_records_admin_secret_key';

function sign(user) {
  return jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    SECRET,
    { expiresIn: '12h' }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ message: '未登录或登录已过期' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ message: '登录凭证无效' });
  }
}

module.exports = { sign, authMiddleware };
