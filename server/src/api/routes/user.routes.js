const express = require('express');
const {
  searchUsers,
  updateUserDetails,
  getUserProfile,
  getUserPreferences,
  updateUserPreferences,
  getCurrentRoom,
  updateCurrentRoom,
  requestRoomUpdate,
  uploadProfilePicture,
  getUserById,
  deactivateAccount
} = require('../controllers/user.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { uploadSingle } = require('../../middleware/upload.middleware');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// User routes
router.get('/search', searchUsers);
router.get('/profile', getUserProfile);
router.patch('/details', updateUserDetails);
router.get('/preferences', getUserPreferences);
router.patch('/preferences', updateUserPreferences);
router.get('/current-room', getCurrentRoom);
router.patch('/current-room', updateCurrentRoom);
router.post('/request-room-update', uploadSingle('proofFile'), requestRoomUpdate);
router.post('/upload-profile-picture', uploadSingle('profilePicture'), uploadProfilePicture);
router.get('/:userId', getUserById);
router.delete('/deactivate', deactivateAccount);

module.exports = router;
