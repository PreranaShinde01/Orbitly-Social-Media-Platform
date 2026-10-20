const { getDb } = require('../db/connection');
const queries = require('../db/queries');
const { timeAgo } = require('../utils/time');

function getNotifications(req, res, next) {
  try {
    const userId = req.session.userId;
    const { page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 30));
    const offset = (pageNum - 1) * limitNum;
    const db = getDb();

    const notifications = queries.getUserNotifications(db, userId, limitNum, offset);
    const unreadCount = queries.getUnreadNotificationCount(db, userId);

    const formatted = notifications.map(n => ({
      ...n,
      relative_time: timeAgo(n.created_at)
    }));

    res.json({
      notifications: formatted,
      unread_count: unreadCount
    });
  } catch (err) {
    next(err);
  }
}

function getUnreadCount(req, res, next) {
  try {
    const userId = req.session.userId;
    const db = getDb();
    const count = queries.getUnreadNotificationCount(db, userId);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

function markAsRead(req, res, next) {
  try {
    const notificationId = parseInt(req.params.id, 10);
    const userId = req.session.userId;
    const db = getDb();

    queries.markNotificationAsRead(db, notificationId, userId);
    const unreadCount = queries.getUnreadNotificationCount(db, userId);

    res.json({ message: 'Marked as read', unread_count: unreadCount });
  } catch (err) {
    next(err);
  }
}

function markAllAsRead(req, res, next) {
  try {
    const userId = req.session.userId;
    const db = getDb();

    queries.markAllNotificationsAsRead(db, userId);

    res.json({ message: 'All notifications marked as read', unread_count: 0 });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
