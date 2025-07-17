const express = require('express');
const {
  submitEvent,
  getEvents,
  getEventById,
  toggleEventRegistration,
  toggleEventLike,
  addEventComment,
  getUserEvents,
  getRegisteredEvents
} = require('../controllers/event.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { uploadSingle } = require('../../middleware/upload.middleware');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Event routes
router.get('/', getEvents);
router.post('/', uploadSingle('eventImage'), submitEvent);
router.get('/user/:userId', getUserEvents);
router.get('/registered', getRegisteredEvents);
router.get('/:eventId', getEventById);

// Event interactions
router.post('/:eventId/register', toggleEventRegistration);
router.post('/:eventId/like', toggleEventLike);
router.post('/:eventId/comments', addEventComment);

module.exports = router;
