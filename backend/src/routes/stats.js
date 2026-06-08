const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.get('/overview', (req, res) => {
  const projectTotal = db.prepare('SELECT COUNT(*) AS c FROM projects').get().c;
  const memberTotal = db.prepare('SELECT COUNT(*) AS c FROM members').get().c;
  const nodeTotal = db.prepare('SELECT COUNT(*) AS c FROM nodes').get().c;
  const approvalTotal = db.prepare('SELECT COUNT(*) AS c FROM approvals').get().c;

  const projectStatus = db
    .prepare('SELECT status, COUNT(*) AS c FROM projects GROUP BY status')
    .all();
  const nodeStatus = db
    .prepare('SELECT status, COUNT(*) AS c FROM nodes GROUP BY status')
    .all();
  const recentApprovals = db
    .prepare(
      `SELECT a.*, n.name AS node_name, p.name AS project_name
       FROM approvals a
       LEFT JOIN nodes n ON n.id = a.node_id
       LEFT JOIN projects p ON p.id = a.project_id
       ORDER BY a.id DESC LIMIT 8`
    )
    .all();

  res.json({
    counts: { projectTotal, memberTotal, nodeTotal, approvalTotal },
    projectStatus,
    nodeStatus,
    recentApprovals
  });
});

module.exports = router;
