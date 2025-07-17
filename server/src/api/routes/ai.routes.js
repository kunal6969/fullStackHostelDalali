const express = require('express');
const {
  getAISuggestions,
  getListingAnalysis
} = require('../controllers/ai.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// AI service routes
router.get('/suggestions', getAISuggestions);
router.post('/analyze-listing', getListingAnalysis);

module.exports = router;
