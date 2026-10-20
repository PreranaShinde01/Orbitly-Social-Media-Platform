const express = require('express');
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/unread-count', requireAuth, notificationController.getUnreadCount);
router.post('/read-all', requireAuth, notificationController.markAllAsRead);
router.get('/', requireAuth, notificationController.getNotifications);
router.post('/:id/read', requireAuth, notificationController.markAsRead);

module.exports = router;
