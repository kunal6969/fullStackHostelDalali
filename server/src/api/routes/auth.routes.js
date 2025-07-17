const express = require('express');
const {
  signup,
  login,
  getProfile,
  verifyToken,
  logout,
  changePassword,
  requestPasswordReset,
  refreshToken
} = require('../controllers/auth.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/request-password-reset', requestPasswordReset);

// Protected routes
router.use(authMiddleware); // Apply auth middleware to all routes below

router.get('/me', getProfile);
router.get('/verify', verifyToken);
router.post('/logout', logout);
router.post('/change-password', changePassword);
router.post('/refresh', refreshToken);

module.exports = router;
