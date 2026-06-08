const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

const authController = require('../controllers/authController');
const projectController = require('../controllers/projectController');
const userController = require('../controllers/userController');
const nodeController = require('../controllers/nodeController');
const approvalController = require('../controllers/approvalController');

router.post('/auth/login', authController.login);
router.get('/auth/me', authMiddleware, authController.getCurrentUser);

router.get('/projects/stats', authMiddleware, projectController.getProjectStats);
router.get('/projects', authMiddleware, projectController.getAllProjects);
router.get('/projects/:id', authMiddleware, projectController.getProjectById);
router.post('/projects', authMiddleware, projectController.createProject);
router.put('/projects/:id', authMiddleware, projectController.updateProject);
router.delete('/projects/:id', authMiddleware, projectController.deleteProject);
router.post('/projects/:id/members', authMiddleware, projectController.addProjectMember);
router.delete('/projects/:id/members/:userId', authMiddleware, projectController.removeProjectMember);

router.get('/users', authMiddleware, userController.getAllUsers);
router.get('/users/:id', authMiddleware, userController.getUserById);
router.post('/users', authMiddleware, userController.createUser);
router.put('/users/:id', authMiddleware, userController.updateUser);
router.delete('/users/:id', authMiddleware, userController.deleteUser);

router.get('/nodes', authMiddleware, nodeController.getAllNodes);
router.get('/nodes/:id', authMiddleware, nodeController.getNodeById);
router.post('/nodes', authMiddleware, nodeController.createNode);
router.put('/nodes/:id', authMiddleware, nodeController.updateNode);
router.put('/nodes/:id/status', authMiddleware, nodeController.updateNodeStatus);
router.delete('/nodes/:id', authMiddleware, nodeController.deleteNode);
router.get('/nodes/:id/logs', authMiddleware, nodeController.getNodeLogs);

router.get('/approvals', authMiddleware, approvalController.getAllApprovals);
router.get('/approvals/:id', authMiddleware, approvalController.getApprovalById);
router.post('/approvals', authMiddleware, approvalController.createApproval);
router.post('/approvals/:id/approve', authMiddleware, approvalController.approveApproval);
router.post('/approvals/:id/reject', authMiddleware, approvalController.rejectApproval);

module.exports = router;
