const db = require('../models/database');
const { updateProjectStatus } = require('./approvalController');

const NODE_STATUSES = ['pending', 'in_progress', 'pending_approval', 'rejected', 'completed', 'archived'];

function getAllNodes(req, res) {
  const { project_id, status, assignee_id } = req.query;
  let sql = `
    SELECT n.*, u.name as assignee_name, p.name as project_name
    FROM task_nodes n
    LEFT JOIN users u ON n.assignee_id = u.id
    LEFT JOIN projects p ON n.project_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (project_id) {
    sql += ' AND n.project_id = ?';
    params.push(project_id);
  }
  if (status) {
    sql += ' AND n.status = ?';
    params.push(status);
  }
  if (assignee_id) {
    sql += ' AND n.assignee_id = ?';
    params.push(assignee_id);
  }

  sql += ' ORDER BY n.project_id, n.sort_order, n.id';

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误' });
    }
    res.json({ nodes: rows });
  });
}

function getNodeById(req, res) {
  const { id } = req.params;

  db.get(`
    SELECT n.*, u.name as assignee_name, p.name as project_name
    FROM task_nodes n
    LEFT JOIN users u ON n.assignee_id = u.id
    LEFT JOIN projects p ON n.project_id = p.id
    WHERE n.id = ?
  `, [id], (err, node) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误' });
    }
    if (!node) {
      return res.status(404).json({ message: '节点不存在' });
    }

    db.all(`
      SELECT l.*, u.name as operator_name FROM node_status_logs l
      LEFT JOIN users u ON l.operator_id = u.id
      WHERE l.node_id = ?
      ORDER BY l.created_at DESC
    `, [id], (err, logs) => {
      if (err) {
        return res.status(500).json({ message: '数据库错误' });
      }
      res.json({ node, logs });
    });
  });
}

function createNode(req, res) {
  const { project_id, name, description, assignee_id, start_date, due_date, sort_order } = req.body;

  if (!project_id || !name) {
    return res.status(400).json({ message: '项目ID和节点名称不能为空' });
  }

  db.run(
    `INSERT INTO task_nodes (project_id, name, description, assignee_id, status, progress, start_date, due_date, sort_order)
     VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, ?)`,
    [project_id, name, description, assignee_id, start_date, due_date, sort_order || 0],
    function (err) {
      if (err) {
        return res.status(500).json({ message: '数据库错误' });
      }

      db.run(
        'INSERT INTO node_status_logs (node_id, from_status, to_status, operator_id, remark) VALUES (?, ?, ?, ?, ?)',
        [this.lastID, null, 'pending', req.user.id, '节点创建']
      );

      res.json({ id: this.lastID, message: '节点创建成功' });
    }
  );
}

function updateNode(req, res) {
  const { id } = req.params;
  const { name, description, assignee_id, start_date, due_date, sort_order, progress } = req.body;

  db.run(
    `UPDATE task_nodes SET name = ?, description = ?, assignee_id = ?, start_date = ?, due_date = ?, sort_order = ?, progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [name, description, assignee_id, start_date, due_date, sort_order, progress, id],
    function (err) {
      if (err) {
        return res.status(500).json({ message: '数据库错误' });
      }
      res.json({ message: '节点更新成功' });
    }
  );
}

function updateNodeStatus(req, res) {
  const { id } = req.params;
  const { status, remark, progress } = req.body;

  if (!NODE_STATUSES.includes(status)) {
    return res.status(400).json({ message: '无效的状态值' });
  }

  db.get('SELECT * FROM task_nodes WHERE id = ?', [id], (err, node) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误' });
    }
    if (!node) {
      return res.status(404).json({ message: '节点不存在' });
    }

    if (status === 'pending_approval') {
      db.get('SELECT * FROM approvals WHERE node_id = ? AND status = ?', [id, 'pending'], (err, existing) => {
        if (err) {
          return res.status(500).json({ message: '数据库错误' });
        }
        if (existing) {
          return res.status(400).json({ message: '该节点已有待审批的申请，请等待审批完成' });
        }
        doUpdate();
      });
    } else {
      doUpdate();
    }

    function doUpdate() {
      const fromStatus = node.status;
      
      let newProgress = progress;
      if (status === 'completed') {
        newProgress = 100;
      }
      
      db.run(
        'UPDATE task_nodes SET status = ?, progress = COALESCE(?, progress), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, newProgress, id],
        function (err) {
          if (err) {
            return res.status(500).json({ message: '数据库错误' });
          }

          db.run(
            'INSERT INTO node_status_logs (node_id, from_status, to_status, operator_id, remark) VALUES (?, ?, ?, ?, ?)',
            [id, fromStatus, status, req.user.id, remark || '']
          );

          if (status === 'pending_approval') {
            db.run(
              'INSERT INTO approvals (project_id, node_id, applicant_id, type, content, status) VALUES (?, ?, ?, ?, ?, ?)',
              [node.project_id, id, req.user.id, 'node', remark || '节点提交审批', 'pending']
            );
          }

          updateProjectStatus(node.project_id);

          res.json({ message: '状态更新成功' });
        }
      );
    }
  });
}

function deleteNode(req, res) {
  const { id } = req.params;

  db.get('SELECT project_id FROM task_nodes WHERE id = ?', [id], (err, node) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误' });
    }
    
    db.run('DELETE FROM node_status_logs WHERE node_id = ?', [id], (err) => {
      if (err) {
        return res.status(500).json({ message: '数据库错误' });
      }
      db.run('DELETE FROM approvals WHERE node_id = ?', [id], (err) => {
        if (err) {
          return res.status(500).json({ message: '数据库错误' });
        }
        db.run('DELETE FROM task_nodes WHERE id = ?', [id], (err) => {
          if (err) {
            return res.status(500).json({ message: '数据库错误' });
          }
          if (node) {
            updateProjectStatus(node.project_id);
          }
          res.json({ message: '节点删除成功' });
        });
      });
    });
  });
}

function getNodeLogs(req, res) {
  const { id } = req.params;

  db.all(`
    SELECT l.*, u.name as operator_name FROM node_status_logs l
    LEFT JOIN users u ON l.operator_id = u.id
    WHERE l.node_id = ?
    ORDER BY l.created_at DESC
  `, [id], (err, logs) => {
    if (err) {
      return res.status(500).json({ message: '数据库错误' });
    }
    res.json({ logs });
  });
}

module.exports = {
  getAllNodes,
  getNodeById,
  createNode,
  updateNode,
  updateNodeStatus,
  deleteNode,
  getNodeLogs,
  NODE_STATUSES
};
