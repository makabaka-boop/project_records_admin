const path = require('path');
const Database = require('better-sqlite3');

// 数据库文件位于项目根目录 data.db
const dbPath = path.resolve(__dirname, '../../data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 成员表
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      department TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 项目表
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT '待开始',
      owner_id INTEGER,
      start_date TEXT,
      end_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES members(id)
    );
  `);

  // 项目-成员 关联表
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      duty TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      UNIQUE(project_id, member_id)
    );
  `);

  // 任务节点表
  db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT '待开始',
      progress INTEGER NOT NULL DEFAULT 0,
      assignee_id INTEGER,
      start_date TEXT,
      due_date TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES members(id)
    );
  `);

  // 审批/状态流转记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      operator TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      action TEXT NOT NULL,
      comment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  seedDefaultData();
}

function seedDefaultData() {
  // 默认管理员
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    db.prepare(
      'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)'
    ).run('admin', 'admin123', '系统管理员', 'admin');
  }

  // 默认成员
  const memberCount = db.prepare('SELECT COUNT(*) AS c FROM members').get().c;
  if (memberCount === 0) {
    const insert = db.prepare(
      'INSERT INTO members (name, role, email, phone, department) VALUES (?, ?, ?, ?, ?)'
    );
    const seed = [
      ['张伟', '项目经理', 'zhangwei@example.com', '13800000001', '研发部'],
      ['李娜', '前端工程师', 'lina@example.com', '13800000002', '研发部'],
      ['王强', '后端工程师', 'wangqiang@example.com', '13800000003', '研发部'],
      ['赵敏', '测试工程师', 'zhaomin@example.com', '13800000004', '测试部'],
      ['陈静', '产品经理', 'chenjing@example.com', '13800000005', '产品部']
    ];
    const tx = db.transaction(rows => rows.forEach(r => insert.run(...r)));
    tx(seed);
  }

  // 默认项目与节点
  const projectCount = db.prepare('SELECT COUNT(*) AS c FROM projects').get().c;
  if (projectCount === 0) {
    const insertProject = db.prepare(
      'INSERT INTO projects (name, code, description, status, owner_id, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const p1 = insertProject.run(
      '智慧政务平台升级',
      'PRJ-2026-001',
      '对现有政务平台进行架构升级与体验优化',
      '进行中',
      1,
      '2026-03-01',
      '2026-09-30'
    );
    const p2 = insertProject.run(
      '内部 OA 系统重构',
      'PRJ-2026-002',
      'OA 系统改造与流程优化',
      '待开始',
      5,
      '2026-06-15',
      '2026-12-31'
    );

    const insertPM = db.prepare(
      'INSERT INTO project_members (project_id, member_id, duty) VALUES (?, ?, ?)'
    );
    insertPM.run(p1.lastInsertRowid, 1, '项目负责人');
    insertPM.run(p1.lastInsertRowid, 2, '前端开发');
    insertPM.run(p1.lastInsertRowid, 3, '后端开发');
    insertPM.run(p1.lastInsertRowid, 4, '测试');
    insertPM.run(p2.lastInsertRowid, 5, '产品负责人');
    insertPM.run(p2.lastInsertRowid, 1, '项目协助');

    const insertNode = db.prepare(
      'INSERT INTO nodes (project_id, name, description, status, progress, assignee_id, start_date, due_date, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertNode.run(p1.lastInsertRowid, '需求评审', '梳理升级需求', '已完成', 100, 5, '2026-03-01', '2026-03-15', 1);
    insertNode.run(p1.lastInsertRowid, '架构设计', '完成系统架构方案', '进行中', 60, 3, '2026-03-16', '2026-04-30', 2);
    insertNode.run(p1.lastInsertRowid, '前端开发', '页面与交互实现', '待开始', 0, 2, '2026-05-01', '2026-07-31', 3);
    insertNode.run(p1.lastInsertRowid, '系统测试', '集成测试与验收', '待开始', 0, 4, '2026-08-01', '2026-09-15', 4);
    insertNode.run(p2.lastInsertRowid, '调研立项', '内部需求调研', '待开始', 0, 5, '2026-06-15', '2026-07-15', 1);

    const insertApproval = db.prepare(
      'INSERT INTO approvals (node_id, project_id, operator, from_status, to_status, action, comment) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertApproval.run(1, p1.lastInsertRowid, '系统管理员', '待审批', '已完成', '审批通过', '需求文档完整，通过');
    insertApproval.run(2, p1.lastInsertRowid, '系统管理员', '待开始', '进行中', '启动节点', '架构设计正式启动');
  }
}

module.exports = { db, initDatabase };
