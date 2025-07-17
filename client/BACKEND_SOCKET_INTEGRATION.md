# Socket.IO Backend Integration Guide

## Files to Create/Modify

### 1. Create: `src/config/socket.js`

```javascript
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../api/models/user.model');
const DirectMessage = require('../api/models/message.model');
const { JWT_SECRET } = require('../utils/constants');

let io;

const initializeSocket = (server) => {
  console.log('🔌 [SOCKET] Initializing Socket.IO server...');
  
  io = new Server(server, {
    cors: {
      origin: "*", // Match your existing CORS config
      methods: ["GET", "POST"],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
      credentials: true
    }
  });

  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      console.log(`🔐 [SOCKET-AUTH] Authenticating socket connection...`);
      
      const token = socket.handshake.auth.token;
      console.log(`🔐 [SOCKET-AUTH] Token present: ${!!token}`);
      
      if (!token) {
        console.log(`❌ [SOCKET-AUTH] No token provided`);
        return next(new Error('Authentication error: No token provided'));
      }

      console.log(`🔐 [SOCKET-AUTH] Verifying JWT token...`);
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log(`✅ [SOCKET-AUTH] JWT verified for user ID: ${decoded.id}`);
      
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        console.log(`❌ [SOCKET-AUTH] User not found for ID: ${decoded.id}`);
        return next(new Error('Authentication error: User not found'));
      }

      console.log(`✅ [SOCKET-AUTH] User authenticated: ${user.fullName} (${user.email})`);
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      console.log(`❌ [SOCKET-AUTH] Authentication failed:`, error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handling
  io.on('connection', (socket) => {
    console.log(`🔌 [SOCKET] User connected: ${socket.user.fullName} (ID: ${socket.userId})`);

    // Join user to their personal room for direct messages
    socket.join(`user_${socket.userId}`);
    console.log(`🏠 [SOCKET] User ${socket.user.fullName} joined room: user_${socket.userId}`);

    // Setup user with their rooms and status
    socket.on('setupUser', (data) => {
      console.log(`⚙️ [SOCKET] Setting up user: ${socket.user.fullName}`);
      socket.emit('userSetup', { success: true, userId: socket.userId });
    });

    // Direct messaging
    socket.on('sendDirectMessage', async (data) => {
      try {
        console.log(`💬 [SOCKET] Processing direct message from ${socket.user.fullName} to user ${data.receiverId}`);
        
        // Create message in database using your existing model
        const messageData = {
          senderId: socket.userId,
          receiverId: data.receiverId,
          message: data.content,
          listingId: data.listingId || null,
          messageType: data.messageType || 'text'
        };

        const newMessage = new DirectMessage(messageData);
        const savedMessage = await newMessage.save();
        
        // Populate the message with sender/receiver details
        const populatedMessage = await DirectMessage.findById(savedMessage._id)
          .populate('senderId', 'fullName username profilePicture')
          .populate('receiverId', 'fullName username profilePicture')
          .populate('listingId', 'title');

        console.log(`✅ [SOCKET] Message saved to database with ID: ${savedMessage._id}`);

        // Emit to both sender and receiver
        const messagePayload = {
          _id: populatedMessage._id,
          senderId: populatedMessage.senderId,
          receiverId: populatedMessage.receiverId,
          message: populatedMessage.message,
          listingId: populatedMessage.listingId,
          messageType: populatedMessage.messageType,
          isRead: populatedMessage.isRead,
          createdAt: populatedMessage.createdAt,
          updatedAt: populatedMessage.updatedAt
        };

        // Send to sender (confirmation)
        socket.emit('directMessage', messagePayload);
        console.log(`📤 [SOCKET] Message sent to sender: ${socket.user.fullName}`);

        // Send to receiver
        socket.to(`user_${data.receiverId}`).emit('directMessage', messagePayload);
        console.log(`📨 [SOCKET] Message sent to receiver room: user_${data.receiverId}`);

      } catch (error) {
        console.log(`❌ [SOCKET] Error sending direct message:`, error);
        socket.emit('error', { message: 'Failed to send message', error: error.message });
      }
    });

    // Common chat room functionality
    socket.on('joinCommonChat', () => {
      console.log(`🏠 [SOCKET] User ${socket.user.fullName} joining common chat`);
      socket.join('common_chat');
      socket.emit('joinedCommonChat', { success: true });
      console.log(`✅ [SOCKET] User ${socket.user.fullName} joined common chat room`);
    });

    socket.on('leaveCommonChat', () => {
      console.log(`🚪 [SOCKET] User ${socket.user.fullName} leaving common chat`);
      socket.leave('common_chat');
      socket.emit('leftCommonChat', { success: true });
    });

    socket.on('sendCommonChatMessage', async (data) => {
      try {
        console.log(`💬 [SOCKET] Processing common chat message from ${socket.user.fullName}`);
        
        // You might want to create a separate CommonChatMessage model
        // For now, using a simple message structure
        const messagePayload = {
          _id: new Date().getTime().toString(), // Temporary ID
          user: {
            _id: socket.userId,
            fullName: socket.user.fullName,
            username: socket.user.username,
            profilePicture: socket.user.profilePicture
          },
          message: data.content,
          timestamp: new Date(),
          messageType: data.messageType || 'text'
        };

        // Broadcast to all users in common chat
        io.to('common_chat').emit('commonChatMessage', messagePayload);
        console.log(`📢 [SOCKET] Common chat message broadcast from ${socket.user.fullName}`);

      } catch (error) {
        console.log(`❌ [SOCKET] Error sending common chat message:`, error);
        socket.emit('error', { message: 'Failed to send message', error: error.message });
      }
    });

    // Room-specific messaging (for your room listings)
    socket.on('joinRoom', (roomId) => {
      console.log(`🏠 [SOCKET] User ${socket.user.fullName} joining room: ${roomId}`);
      socket.join(`room_${roomId}`);
      socket.emit('joinedRoom', { roomId, success: true });
    });

    socket.on('leaveRoom', (roomId) => {
      console.log(`🚪 [SOCKET] User ${socket.user.fullName} leaving room: ${roomId}`);
      socket.leave(`room_${roomId}`);
      socket.emit('leftRoom', { roomId, success: true });
    });

    socket.on('sendRoomMessage', async (data) => {
      try {
        console.log(`💬 [SOCKET] Processing room message from ${socket.user.fullName} in room ${data.roomId}`);
        
        const messagePayload = {
          _id: new Date().getTime().toString(),
          user: {
            _id: socket.userId,
            fullName: socket.user.fullName,
            username: socket.user.username,
            profilePicture: socket.user.profilePicture
          },
          roomId: data.roomId,
          message: data.content,
          timestamp: new Date(),
          messageType: data.messageType || 'text'
        };

        io.to(`room_${data.roomId}`).emit('roomMessage', messagePayload);
        console.log(`📢 [SOCKET] Room message broadcast in room: ${data.roomId}`);

      } catch (error) {
        console.log(`❌ [SOCKET] Error sending room message:`, error);
        socket.emit('error', { message: 'Failed to send message', error: error.message });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`🔌 [SOCKET] User disconnected: ${socket.user.fullName} (Reason: ${reason})`);
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.log(`❌ [SOCKET] Socket error for user ${socket.user.fullName}:`, error);
    });
  });

  console.log('✅ [SOCKET] Socket.IO server initialized successfully');
  return io;
};

// Helper function to get io instance
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized! Call initializeSocket() first.');
  }
  return io;
};

module.exports = { initializeSocket, getIO };
```

### 2. Modify: `src/api/controllers/message.controller.js`

Add these two new functions to your existing message controller:

```javascript
// Add these imports at the top if not already present
const DirectMessage = require('../models/message.model');

// Add these two new controller functions:

const syncConversation = async (req, res) => {
  try {
    console.log(`🔄 [SYNC] Syncing conversation for user: ${req.user.fullName}`);
    
    const { otherUserId, lastSyncTimestamp } = req.body;
    const userId = req.user._id;

    if (!otherUserId) {
      return res.status(400).json({ 
        success: false, 
        message: 'otherUserId is required' 
      });
    }

    // Build query for messages since last sync
    const query = {
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ],
      isDeleted: false
    };

    // Add timestamp filter if provided
    if (lastSyncTimestamp) {
      query.updatedAt = { $gt: new Date(lastSyncTimestamp) };
    }

    const messages = await DirectMessage.find(query)
      .populate('senderId', 'fullName username profilePicture')
      .populate('receiverId', 'fullName username profilePicture')
      .populate('listingId', 'title')
      .sort({ createdAt: 1 }) // Ascending order for sync
      .limit(100); // Limit to prevent large payloads

    console.log(`✅ [SYNC] Found ${messages.length} messages for sync`);

    res.json({
      success: true,
      messages,
      syncTimestamp: new Date(),
      count: messages.length
    });

  } catch (error) {
    console.error(`❌ [SYNC] Sync conversation error:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync conversation',
      error: error.message
    });
  }
};

const getSyncStatus = async (req, res) => {
  try {
    console.log(`📊 [SYNC-STATUS] Getting sync status for user: ${req.user.fullName}`);
    
    const userId = req.user._id;

    // Get last message activity for this user
    const lastMessage = await DirectMessage.findOne({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    })
    .sort({ updatedAt: -1 })
    .select('updatedAt');

    const lastActivity = lastMessage ? lastMessage.updatedAt : null;

    console.log(`✅ [SYNC-STATUS] Last activity: ${lastActivity}`);

    res.json({
      success: true,
      lastActivity,
      serverTime: new Date(),
      userId
    });

  } catch (error) {
    console.error(`❌ [SYNC-STATUS] Sync status error:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync status',
      error: error.message
    });
  }
};

// Make sure to export these new functions
module.exports = {
  // ... your existing exports
  syncConversation,
  getSyncStatus
};
```

### 3. Update your existing CORS configuration in `src/app.js`:

```javascript
// Update your CORS configuration to include Socket.IO support
app.use(cors({
  origin: "*",
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
  credentials: true // Add this for Socket.IO
}));
```

## Testing Instructions

1. **Start your backend server** - Socket.IO will be available on the same port (5000)

2. **Test Socket.IO connection** from your frontend console:
   ```javascript
   // Should see successful connection in backend logs
   console.log(socketService.isConnected());
   ```

3. **Test direct messaging** - Send a message through your frontend

4. **Check backend logs** - You should see detailed Socket.IO activity logs

## Important Notes

- ✅ **Authentication**: Uses your existing JWT middleware
- ✅ **Database**: Uses your existing DirectMessage model
- ✅ **CORS**: Matches your existing configuration  
- ✅ **Error Handling**: Comprehensive logging and error responses
- ✅ **Real-time + Persistence**: Messages saved to DB AND sent via Socket.IO
- ✅ **Room Management**: Support for common chat and room-specific messaging

Your frontend is already configured and waiting for these backend changes!
