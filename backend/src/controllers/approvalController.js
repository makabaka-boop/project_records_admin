const db = require('../models/database');

function updateProjectStatus(projectId) {
  db.all('SELECT status FROM task_nodes WHERE project_id = ?', [projectId], (err, nodes) => {
    if (err || !nodes || nodes.length === 0) return;

    const statuses = nodes.map(n => n.status);
    let projectStatus = 'pending';

    if (statuses.every(s => s === 'completed' || s === 'archived')) {
      projectStatus = 'completed';
    } else if (statuses.some(s => s === 'in_progress' || s === 'pending_approval' || s === 'rejected')) {
      projectStatus = 'in_progress';
    }

    db.run('UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [projectStatus, projectId]);
  });
}

function getAllApprovals(req, res) {
  const { status, project_id, applicant_id } = req.query;
  let sql = `
    SELECT a.*, 
      p.name as project_name,
      n.name as node_name,
      u1.name as applicant_name,
      u2.name as approver_name
    FROM approvals a
    LEFT JOIN projects p ON a.project_id = p.id
    LEFT JOIN task_nodes n ON a.node_id = n.id
    LEFT JOIN users u1 ON a.applicant_id = u1.id
    LEFT JOIN users u2 ON a.approver_id = u2.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    sql += ' AND a.status = ?';
    params.push(status);
  }
  if (project_id) {
    sql += ' AND a.project_id = ?';
    params.push(project_id);
  }
  if (applicant_id) {
    sql += ' AND a.applicant_id = ?';
    params.push(applicant_id);
  }

  sql += ' ORDER BY a.created_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误' });
    }
    res.json({ approvals: rows });
  });
}

function getApprovalById(req, res) {
  const { id } = req.params;

  db.get(`
    SELECT a.*, 
      p.name as project_name,
      n.name as node_name,
      u1.name as applicant_name,
      u2.name as approver_name
    FROM approvals a
    LEFT JOIN projects p ON a.project_id = p.id
    LEFT JOIN task_nodes n ON a.node_id = n.id
    LEFT JOIN users u1 ON a.applicant_id = u1.id
    LEFT JOIN users u2 ON a.approver_id = u2.id
    WHERE a.id = ?
  `, [id], (err, approval) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误' });
    }
    if (!approval) {
      return res.status(404).json({ message: '审批记录不存在' });
    }
    res.json({ approval });
  });
}

function createApproval(req, res) {
  const { project_id, node_id, type, content } = req.body;

  if (!project_id) {
    return res.status(400).json({ message: '项目ID不能为空' });
  }

  if (node_id) {
    db.get('SELECT * FROM approvals WHERE node_id = ? AND status = ?', [node_id, 'pending'], (err, existing) => {
      if (err) {
        return res.status(500).json({ message: '数据库错误' });
      }
      if (existing) {
        return res.status(400).json({ message: '该节点已有待审批的申请，请等待审批完成' });
      }

      insertApproval();
    });
  } else {
    insertApproval();
  }

  function insertApproval() {
    db.run(
      `INSERT INTO approvals (project_id, node_id, applicant_id, type, content, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [project_id, node_id, req.user.id, type || 'project', content],
      function (err) {
        if (err) {
          return res.status(500).json({ message: '数据库错误' });
        }
        res.json({ id: this.lastID, message: '审批提交成功' });
      }
    );
  }
}

function approveApproval(req, res) {
  const { id } = req.params;
  const { remark } = req.body;

  db.get('SELECT * FROM approvals WHERE id = ?', [id], (err, approval) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误' });
    }
    if (!approval) {
      return res.status(404).json({ message: '审批记录不存在' });
    }
    if (approval.status !== 'pending') {
      return res.status(400).json({ message: '该审批已处理' });
    }

    db.run(
      `UPDATE approvals SET status = 'approved', approver_id = ?, remark = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [req.user.id, remark, id],
      function (err) {
        if (err) {
          return res.status(500).json({ message: '数据库错误' });
        }

        if (approval.node_id) {
          db.get('SELECT status, project_id FROM task_nodes WHERE id = ?', [approval.node_id], (err, node) => {
            if (!err && node && node.status === 'pending_approval') {
              db.run('UPDATE task_nodes SET status = ?, progress = 100, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['completed', approval.node_id]);
              db.run(
                'INSERT INTO node_status_logs (node_id, from_status, to_status, operator_id, remark) VALUES (?, ?, ?, ?, ?)',
                [approval.node_id, 'pending_approval', 'completed', req.user.id, '审批通过']
              );
              updateProjectStatus(node.project_id);
            }
          });
        } else {
          updateProjectStatus(approval.project_id);
        }

        res.json({ message: '审批通过成功' });
      }
    );
  });
}

function rejectApproval(req, res) {
  const { id } = req.params;
  const { remark } = req.body;

  db.get('SELECT * FROM approvals WHERE id = ?', [id], (err, approval) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误' });
    }
    if (!approval) {
      return res.status(404).json({ message: '审批记录不存在' });
    }
    if (approval.status !== 'pending') {
      return res.status(400).json({ message: '该审批已处理' });
    }

    db.run(
      `UPDATE approvals SET status = 'rejected', approver_id = ?, remark = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [req.user.id, remark, id],
      function (err) {
        if (err) {
          return res.status(500).json({ message: '数据库错误' });
        }

        if (approval.node_id) {
          db.get('SELECT status, project_id FROM task_nodes WHERE id = ?', [approval.node_id], (err, node) => {
            if (!err && node && node.status === 'pending_approval') {
              db.run('UPDATE task_nodes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['rejected', approval.node_id]);
              db.run(
                'INSERT INTO node_status_logs (node_id, from_status, to_status, operator_id, remark) VALUES (?, ?, ?, ?, ?)',
                [approval.node_id, 'pending_approval', 'rejected', req.user.id, remark || '审批退回']
              );
              updateProjectStatus(node.project_id);
            }
          });
        } else {
          updateProjectStatus(approval.project_id);
        }

        res.json({ message: '审批已退回' });
      }
    );
  });
}

module.exports = {
  getAllApprovals,
  getApprovalById,
  createApproval,
  approveApproval,
  rejectApproval,
  updateProjectStatus
};
