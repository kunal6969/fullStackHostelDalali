const express = require('express');
const { authMiddleware, optionalAuth } = require('../../middleware/auth.middleware');

// Import controllers from existing modules
const { getRoomExchangeDashboard, approveExchangeRequest } = require('../controllers/matchRequest.controller');
const { getTrendingListings } = require('../controllers/roomListing.controller');
const { getCourses, addCourse, markAttendance } = require('../controllers/attendance.controller');

const router = express.Router();

// ====================================
// FRONTEND COMPATIBILITY ROUTE ALIASES
// ====================================

// Exchange Dashboard Routes (Frontend expects /api/exchange-dashboard)
router.get('/exchange-dashboard', authMiddleware, getRoomExchangeDashboard);

// Exchange Request Routes (Frontend expects /api/exchange-requests/:id/approve)
router.post('/exchange-requests/:id/approve', authMiddleware, (req, res, next) => {
  // Map the request to match the existing controller
  req.params.id = req.params.id;
  approveExchangeRequest(req, res, next);
});

// Room Listings Routes (Frontend expects /api/room-listings/trending)
router.get('/room-listings/trending', optionalAuth, getTrendingListings);

// Course Management Routes (Frontend expects /api/courses)
router.get('/courses', authMiddleware, getCourses);
router.post('/courses', authMiddleware, addCourse);
router.post('/courses/:id/attendance', authMiddleware, markAttendance);

module.exports = router;
