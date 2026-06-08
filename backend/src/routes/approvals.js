const express = require('express');
const { db } = require('../db');

const router = express.Router();

// 全部审批记录
router.get('/', (req, res) => {
  const { project_id, node_id } = req.query;
  let sql = `SELECT a.*, n.name AS node_name, p.name AS project_name
             FROM approvals a
             LEFT JOIN nodes n ON n.id = a.node_id
             LEFT JOIN projects p ON p.id = a.project_id
             WHERE 1=1`;
  const params = [];
  if (project_id) { sql += ' AND a.project_id = ?'; params.push(Number(project_id)); }
  if (node_id) { sql += ' AND a.node_id = ?'; params.push(Number(node_id)); }
  sql += ' ORDER BY a.id DESC';
  res.json(db.prepare(sql).all(...params));
});

module.exports = router;
