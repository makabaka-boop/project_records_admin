const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../../data.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('SQLite 数据库连接成功');
    initDatabase();
  }
});

function initDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      start_date DATE,
      end_date DATE,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS task_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      assignee_id INTEGER,
      status TEXT DEFAULT 'pending',
      progress INTEGER DEFAULT 0,
      start_date DATE,
      due_date DATE,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (assignee_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS node_status_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id INTEGER NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      operator_id INTEGER NOT NULL,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (node_id) REFERENCES task_nodes(id),
      FOREIGN KEY (operator_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      node_id INTEGER,
      applicant_id INTEGER NOT NULL,
      approver_id INTEGER,
      type TEXT DEFAULT 'node',
      content TEXT,
      status TEXT DEFAULT 'pending',
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (node_id) REFERENCES task_nodes(id),
      FOREIGN KEY (applicant_id) REFERENCES users(id),
      FOREIGN KEY (approver_id) REFERENCES users(id)
    )`);

    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
      if (err) {
        console.error('查询用户失败:', err);
        return;
      }
      if (row.count === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run(`INSERT INTO users (username, password, name, role, email) VALUES 
          ('admin', ?, '系统管理员', 'admin', 'T1T2c@PjXkDek.47v'),
          ('manager', ?, '张经理', 'manager', 'RaWeWcp@8DbeAZS.hru'),
          ('member1', ?, '李开发', 'member', 'eELhN9V@IkIKS26.zAE'),
          ('member2', ?, '王测试', 'member', '2XKcF2p@IoYKIl0.fMy')`,
          [hashedPassword, hashedPassword, hashedPassword, hashedPassword],
          (err) => {
            if (err) {
              console.error('插入默认用户失败:', err);
            } else {
              console.log('默认用户创建成功');
              console.log('默认账号: admin / admin123');
            }
          }
        );
      }
    });
  });
}

module.exports = db;
