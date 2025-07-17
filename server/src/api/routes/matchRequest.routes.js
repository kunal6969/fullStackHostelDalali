const express = require('express');
const {
  getMatchRequests,
  createMatchRequest,
  updateMatchRequest,
  approveDeal,
  getMatchRequestById,
  getSwapHistory,
  getRoomExchangeDashboard,
  approveExchangeRequest
} = require('../controllers/matchRequest.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Match request routes
router.get('/', getMatchRequests);
router.get('/dashboard', getRoomExchangeDashboard);  // New dashboard endpoint
router.post('/', createMatchRequest);
router.patch('/:id', updateMatchRequest);
router.post('/:id/approve', approveDeal);
router.post('/:id/exchange-approve', approveExchangeRequest);  // New exchange approval endpoint
router.get('/history', getSwapHistory);
router.get('/:id', getMatchRequestById);

module.exports = router;
