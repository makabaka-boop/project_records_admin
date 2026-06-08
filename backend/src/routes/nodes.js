const express = require('express');
const { db } = require('../db');

const router = express.Router();

const VALID_STATUS = ['待开始', '进行中', '待审批', '已退回', '已完成', '已归档'];

// 节点列表，可按项目过滤
router.get('/', (req, res) => {
  const { project_id, status } = req.query;
  let sql = `SELECT n.*, p.name AS project_name, m.name AS assignee_name
             FROM nodes n
             LEFT JOIN projects p ON p.id = n.project_id
             LEFT JOIN members m ON m.id = n.assignee_id
             WHERE 1=1`;
  const params = [];
  if (project_id) { sql += ' AND n.project_id = ?'; params.push(Number(project_id)); }
  if (status) { sql += ' AND n.status = ?'; params.push(status); }
  sql += ' ORDER BY n.project_id ASC, n.sort_order ASC, n.id ASC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const node = db
    .prepare(
      `SELECT n.*, p.name AS project_name, m.name AS assignee_name
       FROM nodes n
       LEFT JOIN projects p ON p.id = n.project_id
       LEFT JOIN members m ON m.id = n.assignee_id
       WHERE n.id = ?`
    )
    .get(id);
  if (!node) return res.status(404).json({ message: '节点不存在' });
  const approvals = db
    .prepare('SELECT * FROM approvals WHERE node_id = ? ORDER BY id DESC')
    .all(id);
  res.json({ ...node, approvals });
});

router.post('/', (req, res) => {
  const { project_id, name, description, status, progress, assignee_id, start_date, due_date, sort_order } = req.body || {};
  if (!project_id || !name) return res.status(400).json({ message: '所属项目与节点名称必填' });
  const r = db
    .prepare(
      `INSERT INTO nodes (project_id, name, description, status, progress, assignee_id, start_date, due_date, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      project_id,
      name,
      description || '',
      status || '待开始',
      progress || 0,
      assignee_id || null,
      start_date || '',
      due_date || '',
      sort_order || 0
    );
  res.json(db.prepare('SELECT * FROM nodes WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM nodes WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ message: '节点不存在' });
  const { name, description, progress, assignee_id, start_date, due_date, sort_order } = req.body || {};
  db.prepare(
    `UPDATE nodes SET name=?, description=?, progress=?, assignee_id=?, start_date=?, due_date=?, sort_order=? WHERE id=?`
  ).run(
    name ?? existing.name,
    description ?? existing.description,
    progress ?? existing.progress,
    assignee_id ?? existing.assignee_id,
    start_date ?? existing.start_date,
    due_date ?? existing.due_date,
    sort_order ?? existing.sort_order,
    id
  );
  res.json(db.prepare('SELECT * FROM nodes WHERE id = ?').get(id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM nodes WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// 节点状态流转 + 审批记录写入
router.post('/:id/transition', (req, res) => {
  const id = Number(req.params.id);
  const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(id);
  if (!node) return res.status(404).json({ message: '节点不存在' });

  const { to_status, action, comment, operator } = req.body || {};
  if (!to_status || !VALID_STATUS.includes(to_status)) {
    return res.status(400).json({ message: '目标状态无效' });
  }

  const fromStatus = node.status;
  const tx = db.transaction(() => {
    // 更新节点状态，已完成 progress 设为 100
    let progress = node.progress;
    if (to_status === '已完成') progress = 100;
    if (to_status === '进行中' && progress === 0) progress = 10;
    db.prepare('UPDATE nodes SET status = ?, progress = ? WHERE id = ?').run(to_status, progress, id);

    db.prepare(
      `INSERT INTO approvals (node_id, project_id, operator, from_status, to_status, action, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      node.project_id,
      operator || '系统管理员',
      fromStatus,
      to_status,
      action || '状态变更',
      comment || ''
    );

    // 同步项目状态：根据节点状态综合计算
    const stats = db
      .prepare(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN status='已完成' OR status='已归档' THEN 1 ELSE 0 END) AS done,
           SUM(CASE WHEN status='进行中' THEN 1 ELSE 0 END) AS doing,
           SUM(CASE WHEN status='待审批' THEN 1 ELSE 0 END) AS approving,
           SUM(CASE WHEN status='已退回' THEN 1 ELSE 0 END) AS rejected,
           SUM(CASE WHEN status='待开始' THEN 1 ELSE 0 END) AS pending,
           SUM(CASE WHEN status='已归档' THEN 1 ELSE 0 END) AS archived
         FROM nodes WHERE project_id = ?`
      )
      .get(node.project_id);
    let projectStatus = null;
    if (stats.total > 0) {
      if (stats.archived === stats.total) projectStatus = '已归档';
      else if (stats.done === stats.total) projectStatus = '已完成';
      else if (stats.rejected > 0) projectStatus = '已退回';
      else if (stats.approving > 0) projectStatus = '待审批';
      else if (stats.doing > 0) projectStatus = '进行中';
      else if (stats.pending === stats.total) projectStatus = '待开始';
    }
    if (projectStatus) {
      db.prepare('UPDATE projects SET status = ? WHERE id = ?').run(projectStatus, node.project_id);
    }
  });
  tx();
  res.json(db.prepare('SELECT * FROM nodes WHERE id = ?').get(id));
});

module.exports = router;
