const express = require('express');
const { db } = require('../database/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/overview', (req, res) => {
  const projectStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending,
      COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0) as in_progress,
      COALESCE(SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END), 0) as pending_approval,
      COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) as rejected,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed,
      COALESCE(SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END), 0) as archived
    FROM projects
  `).get();

  const nodeStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending,
      COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0) as in_progress,
      COALESCE(SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END), 0) as pending_approval,
      COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) as rejected,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed,
      COALESCE(SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END), 0) as archived
    FROM task_nodes
  `).get();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const memberCount = db.prepare('SELECT COUNT(*) as count FROM project_members').get().count;
  const approvalCount = db.prepare('SELECT COUNT(*) as count FROM approval_records').get().count;

  const recentProjects = db.prepare(`
    SELECT p.*, u.name as creator_name
    FROM projects p
    LEFT JOIN users u ON p.created_by = u.id
    ORDER BY p.created_at DESC
    LIMIT 5
  `).all();

  const recentApprovals = db.prepare(`
    SELECT ar.*, u.name as operator_name, p.name as project_name, tn.name as node_name
    FROM approval_records ar
    JOIN users u ON ar.operator_id = u.id
    JOIN projects p ON ar.project_id = p.id
    LEFT JOIN task_nodes tn ON ar.node_id = tn.id
    ORDER BY ar.created_at DESC
    LIMIT 10
  `).all();

  res.json({
    data: {
      projectStats,
      nodeStats,
      userCount,
      memberCount,
      approvalCount,
      recentProjects,
      recentApprovals
    }
  });
});

module.exports = router;
