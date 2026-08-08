const express = require('express');
const { verifyJWT, checkRole } = require('../middleware/auth');

const userCtrl = require('../controllers/admin/userController');
const analyticsCtrl = require('../controllers/admin/analyticsController');
const aiOutputCtrl = require('../controllers/admin/aiOutputController');
const imageModCtrl = require('../controllers/admin/imageModerationController');
const planMgmtCtrl = require('../controllers/admin/planManagementController');
const chatModCtrl = require('../controllers/admin/chatModerationController');
const logsCtrl = require('../controllers/admin/logsController');

const router = express.Router();

router.use(verifyJWT, checkRole('admin'));

// 5.1 User Management
router.get('/users', userCtrl.listUsers);
router.get('/users/:id', userCtrl.getUserDetail);
router.patch('/users/:id/status', userCtrl.setUserStatus);

// 5.2 Analytics Dashboard
router.get('/analytics', analyticsCtrl.getAnalytics);

// 5.3 AI Output Monitoring
router.get('/plans', aiOutputCtrl.listGeneratedPlans);
router.patch('/plans/:id/flag', aiOutputCtrl.flagPlan);
router.get('/prompt-templates', aiOutputCtrl.listPromptTemplates);
router.put('/prompt-templates/:key', aiOutputCtrl.upsertPromptTemplate);

// 5.4 Image Moderation
router.get('/images', imageModCtrl.listImages);
router.delete('/images/:userId/:angle', imageModCtrl.deleteImage);

// 5.5 Plan Management (Override System)
router.patch('/plans/:id', planMgmtCtrl.editPlan);
router.post('/plan-templates', planMgmtCtrl.createTemplate);
router.get('/plan-templates', planMgmtCtrl.listTemplates);
router.post('/plans/assign', planMgmtCtrl.assignPlan);

// 5.6 Chat Moderation
router.get('/chats', chatModCtrl.listChats);
router.get('/chats/:userId', chatModCtrl.getChatByUser);
router.patch('/chats/:userId/block', chatModCtrl.setChatBlocked);

// 5.7 Reports & Logs
router.get('/logs/system', logsCtrl.listSystemLogs);
router.get('/logs/admin', logsCtrl.listAdminLogs);
router.get('/logs/ai-usage', logsCtrl.aiUsageSummary);

module.exports = router;
