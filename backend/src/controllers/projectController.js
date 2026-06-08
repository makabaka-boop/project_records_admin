const db = require('../models/database');

function getAllProjects(req, res) {
  const { status, keyword } = req.query;
  let sql = `
    SELECT p.*, u.name as creator_name,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
      (SELECT COUNT(*) FROM task_nodes WHERE project_id = p.id) as node_count,
      (SELECT COUNT(*) FROM approvals WHERE project_id = p.id AND status = 'pending') as pending_approvals
    FROM projects p
    LEFT JOIN users u ON p.created_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += ' AND p.status = ?';
    params.push(status);
  }
  if (keyword) {
    sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  sql += ' ORDER BY p.created_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误' });
    }
    res.json({ projects: rows });
  });
}

function getProjectById(req, res) {
  const { id } = req.params;

  db.get(`
    SELECT p.*, u.name as creator_name FROM projects p
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.id = ?
  `, [id], (err, project) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误' });
    }
    if (!project) {
      return res.status(404).json({ message: '项目不存在' });
    }

    db.all(`
      SELECT pm.*, u.name, u.username, u.email FROM project_members pm
      LEFT JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
    `, [id], (err, members) => {
      if (err) {
        return res.status(500).json({ message: '数据库错误' });
      }

      db.all(`
        SELECT n.*, u.name as assignee_name FROM task_nodes n
        LEFT JOIN users u ON n.assignee_id = u.id
        WHERE n.project_id = ?
        ORDER BY n.sort_order, n.id
      `, [id], (err, nodes) => {
        if (err) {
          return res.status(500).json({ message: '数据库错误' });
        }

        db.all(`
          SELECT a.*, u1.name as applicant_name, u2.name as approver_name FROM approvals a
          LEFT JOIN users u1 ON a.applicant_id = u1.id
          LEFT JOIN users u2 ON a.approver_id = u2.id
          WHERE a.project_id = ?
          ORDER BY a.created_at DESC LIMIT 10
        `, [id], (err, approvals) => {
          if (err) {
            return res.status(500).json({ message: '数据库错误' });
          }

          res.json({ project, members, nodes, approvals });
        });
      });
    });
  });
}

function createProject(req, res) {
  const { name, description, start_date, end_date, member_ids } = req.body;

  if (!name) {
    return res.status(400).json({ message: '项目名称不能为空' });
  }

  db.run(
    `INSERT INTO projects (name, description, status, start_date, end_date, created_by)
     VALUES (?, ?, 'pending', ?, ?, ?)`,
    [name, description, start_date, end_date, req.user.id],
    function (err) {
      if (err) {
        return res.status(500).json({ message: '数据库错误' });
      }

      const projectId = this.lastID;

      if (member_ids && member_ids.length > 0) {
        const stmt = db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)');
        member_ids.forEach(userId => {
          stmt.run([projectId, userId, 'member']);
        });
        stmt.finalize();
      }

      res.json({ id: projectId, message: '项目创建成功' });
    }
  );
}

function updateProject(req, res) {
  const { id } = req.params;
  const { name, description, status, start_date, end_date } = req.body;

  db.run(
    `UPDATE projects SET name = ?, description = ?, status = ?, start_date = ?, end_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [name, description, status, start_date, end_date, id],
    function (err) {
      if (err) {
        return res.status(500).json({ message: '数据库错误' });
      }
      res.json({ message: '项目更新成功' });
    }
  );
}

function deleteProject(req, res) {
  const { id } = req.params;

  db.run('DELETE FROM project_members WHERE project_id = ?', [id], (err) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误' });
    }
    db.run('DELETE FROM node_status_logs WHERE node_id IN (SELECT id FROM task_nodes WHERE project_id = ?)', [id], (err) => {
      if (err) {
        return res.status(500).json({ message: '数据库错误' });
      }
      db.run('DELETE FROM approvals WHERE project_id = ?', [id], (err) => {
        if (err) {
          return res.status(500).json({ message: '数据库错误' });
        }
        db.run('DELETE FROM task_nodes WHERE project_id = ?', [id], (err) => {
          if (err) {
            return res.status(500).json({ message: '数据库错误' });
          }
          db.run('DELETE FROM projects WHERE id = ?', [id], (err) => {
            if (err) {
              return res.status(500).json({ message: '数据库错误' });
            }
            res.json({ message: '项目删除成功' });
          });
        });
      });
    });
  });
}

function addProjectMember(req, res) {
  const { id } = req.params;
  const { user_id, role } = req.body;

  db.get('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [id, user_id], (err, member) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误' });
    }
    if (member) {
      return res.status(400).json({ message: '该成员已在项目中' });
    }

    db.run(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [id, user_id, role || 'member'],
      function (err) {
        if (err) {
          return res.status(500).json({ message: '数据库错误' });
        }
        res.json({ message: '成员添加成功' });
      }
    );
  });
}

function removeProjectMember(req, res) {
  const { id, userId } = req.params;

  db.run('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [id, userId], (err) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误' });
    }
    res.json({ message: '成员移除成功' });
  });
}

function getProjectStats(req, res) {
  db.get('SELECT COUNT(*) as total FROM projects', [], (err, total) => {
    if (err) return res.status(500).json({ message: '数据库错误' });
    
    db.all('SELECT status, COUNT(*) as count FROM projects GROUP BY status', [], (err, statusCounts) => {
      if (err) return res.status(500).json({ message: '数据库错误' });
      
      db.get('SELECT COUNT(*) as total FROM task_nodes', [], (err, nodeTotal) => {
        if (err) return res.status(500).json({ message: '数据库错误' });
        
        db.all('SELECT status, COUNT(*) as count FROM task_nodes GROUP BY status', [], (err, nodeStatusCounts) => {
          if (err) return res.status(500).json({ message: '数据库错误' });
          
          db.get('SELECT COUNT(*) as count FROM approvals WHERE status = ?', ['pending'], (err, pendingApprovals) => {
            if (err) return res.status(500).json({ message: '数据库错误' });
            
            db.get('SELECT COUNT(*) as count FROM users', [], (err, userCount) => {
              if (err) return res.status(500).json({ message: '数据库错误' });
              
              res.json({
                totalProjects: total.total,
                projectStatus: statusCounts,
                totalNodes: nodeTotal.total,
                nodeStatus: nodeStatusCounts,
                pendingApprovals: pendingApprovals.count,
                totalMembers: userCount.count
              });
            });
          });
        });
      });
    });
  });
}

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getProjectStats
};
