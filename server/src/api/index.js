const express = require('express');

// Import all route modules
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const roomListingRoutes = require('./routes/roomListing.routes');
const matchRequestRoutes = require('./routes/matchRequest.routes');
const messageRoutes = require('./routes/message.routes');
const commonChatRoutes = require('./routes/commonChat.routes');
const eventRoutes = require('./routes/event.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const friendRoutes = require('./routes/friend.routes');
const aiRoutes = require('./routes/ai.routes');
const frontendAliasRoutes = require('./routes/frontend-aliases.routes');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Hostel Dalali API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API documentation endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Hostel Dalali API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      rooms: '/api/rooms',
      matches: '/api/matches',
      messages: '/api/messages',
      commonChat: '/api/common-chat',
      events: '/api/events',
      attendance: '/api/attendance',
      friends: '/api/friends',
      ai: '/api/ai'
    },
    frontendAliases: {
      exchangeDashboard: '/api/exchange-dashboard',
      exchangeRequestApproval: '/api/exchange-requests/:id/approve',
      trendingRooms: '/api/room-listings/trending',
      courses: '/api/courses',
      courseAttendance: '/api/courses/:id/attendance'
    },
    documentation: 'Please refer to the API documentation for detailed usage'
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/rooms', roomListingRoutes);
router.use('/matches', matchRequestRoutes);
router.use('/messages', messageRoutes);
router.use('/common-chat', commonChatRoutes);
router.use('/events', eventRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/friends', friendRoutes);
router.use('/ai', aiRoutes);

// Frontend compatibility aliases
router.use('/', frontendAliasRoutes);

module.exports = router;
