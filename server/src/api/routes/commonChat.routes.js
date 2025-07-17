const express = require('express');
const {
  getRecentMessages,
  sendMessage,
  voteOnPoll,
  addReaction,
  removeReaction,
  editMessage,
  deleteMessage,
  togglePin,
  getPinnedMessages,
  searchMessages
} = require('../controllers/commonChat.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Common chat routes
router.get('/messages', getRecentMessages);
router.get('/pinned', getPinnedMessages);
router.get('/search', searchMessages);
router.post('/message', sendMessage);
router.post('/:messageId/vote', voteOnPoll);
router.post('/:messageId/reaction', addReaction);
router.delete('/:messageId/reaction', removeReaction);
router.patch('/:messageId', editMessage);
router.delete('/:messageId', deleteMessage);
router.post('/:messageId/pin', togglePin);

module.exports = router;
