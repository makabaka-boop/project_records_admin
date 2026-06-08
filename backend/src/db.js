const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../../data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      creator_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS project_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      assignee_id INTEGER,
      deadline DATE,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS node_status_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id INTEGER NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      operator_id INTEGER NOT NULL,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (node_id) REFERENCES project_nodes(id) ON DELETE CASCADE,
      FOREIGN KEY (operator_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS approval_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      approver_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (node_id) REFERENCES project_nodes(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (approver_id) REFERENCES users(id)
    );
  `);

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const insertUser = db.prepare(
      'INSERT INTO users (username, password, name, role, email) VALUES (?, ?, ?, ?, ?)'
    );
    insertUser.run('admin', hashedPassword, '系统管理员', 'admin', 'admin@example.com');
    insertUser.run('zhangsan', hashedPassword, '张三', 'member', 'zhangsan@example.com');
    insertUser.run('lisi', hashedPassword, '李四', 'member', 'lisi@example.com');
    insertUser.run('wangwu', hashedPassword, '王五', 'approver', 'wangwu@example.com');

    const insertProject = db.prepare(
      'INSERT INTO projects (name, description, status, creator_id) VALUES (?, ?, ?, ?)'
    );
    const project1 = insertProject.run('企业官网改版项目', '公司官方网站全面升级改版项目', 'in_progress', 1);
    const project2 = insertProject.run('移动端App开发', 'iOS和Android双端应用开发', 'pending', 1);

    const insertMember = db.prepare(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
    );
    insertMember.run(project1.lastInsertRowid, 1, 'manager');
    insertMember.run(project1.lastInsertRowid, 2, 'member');
    insertMember.run(project1.lastInsertRowid, 3, 'member');
    insertMember.run(project1.lastInsertRowid, 4, 'approver');

    insertMember.run(project2.lastInsertRowid, 1, 'manager');
    insertMember.run(project2.lastInsertRowid, 2, 'member');

    const insertNode = db.prepare(
      'INSERT INTO project_nodes (project_id, name, description, status, assignee_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertNode.run(project1.lastInsertRowid, '需求调研', '收集用户需求并整理文档', 'completed', 2, 1);
    insertNode.run(project1.lastInsertRowid, 'UI设计', '完成界面设计稿', 'in_progress', 3, 2);
    insertNode.run(project1.lastInsertRowid, '前端开发', '前端页面开发实现', 'pending', 2, 3);
    insertNode.run(project1.lastInsertRowid, '后端开发', '后端接口开发', 'pending', 3, 4);
    insertNode.run(project1.lastInsertRowid, '测试验收', '功能测试和用户验收', 'pending', 4, 5);
  }

  console.log('数据库初始化完成');
}

initDatabase();

module.exports = db;
