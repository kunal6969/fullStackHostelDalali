const express = require('express');
const {
  getConversations,
  getConversation,
  sendMessage,
  markAsRead,
  markAllAsRead,
  deleteMessage,
  editMessage,
  searchMessages,
  getUnreadCount,
  syncConversation,
  getSyncStatus
} = require('../controllers/message.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Message routes
router.get('/conversations', getConversations);
router.get('/unread-count', getUnreadCount);
router.get('/search', searchMessages);
router.get('/sync-status', getSyncStatus); // New sync status endpoint
router.post('/sync-conversation', syncConversation); // New sync conversation endpoint
router.get('/:userId', getConversation);
router.post('/', sendMessage);
router.patch('/:messageId/read', markAsRead);
router.patch('/:userId/read-all', markAllAsRead);
router.patch('/:messageId/edit', editMessage);
router.delete('/:messageId', deleteMessage);

module.exports = router;
