const express = require('express');
const {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  handleFriendRequest,
  removeFriend,
  getFriendSuggestions,
  getMutualFriends
} = require('../controllers/friend.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Friend management routes
router.get('/list', getFriends);
router.get('/requests', getFriendRequests);
router.get('/suggestions', getFriendSuggestions);
router.get('/mutual/:userId', getMutualFriends);

router.post('/request/:userId', sendFriendRequest);
router.patch('/request/:requestId', handleFriendRequest);
router.delete('/:friendId', removeFriend);

module.exports = router;
