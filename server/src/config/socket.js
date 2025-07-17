const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../api/models/user.model');
const DirectMessage = require('../api/models/directMessage.model');
const CommonChatMessage = require('../api/models/commonChatMessage.model');
const { JWT_SECRET, FRONTEND_URL } = require('../utils/constants');

let io;

// Authentication middleware for socket connections
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
};

const initializeSocket = (server) => {
  console.log('🔧 [SOCKET] Initializing Socket.IO server...');
  io = new Server(server, {
    cors: {
      origin: [FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  console.log('🔧 [SOCKET] Setting up authentication middleware...');
  // Authentication middleware
  io.use(socketAuth);

  // Main namespace for frontend compatibility
  io.on('connection', (socket) => {
    console.log(`✅ [SOCKET-MAIN] User ${socket.user.fullName} connected to main namespace`);
    
    // Join user's personal room for notifications
    socket.join(`user_${socket.userId}`);
    console.log(`📝 [SOCKET-MAIN] User ${socket.userId} joined personal room: user_${socket.userId}`);
    
    // Handle direct message sending (frontend compatibility)
    socket.on('sendDirectMessage', async (data) => {
      try {
        console.log(`📝 [SOCKET-MAIN] Received sendDirectMessage from ${socket.user.fullName}:`, data);
        const { receiverId, content, listingId } = data;
        
        // Validate input
        if (!receiverId || !content) {
          console.log(`❌ [SOCKET-MAIN] Missing required fields`);
          socket.emit('error', { message: 'Missing required fields' });
          return;
        }
        
        // Check if receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
          console.log(`❌ [SOCKET-MAIN] Receiver not found: ${receiverId}`);
          socket.emit('error', { message: 'Receiver not found' });
          return;
        }
        
        console.log(`📝 [SOCKET-MAIN] Creating direct message...`);
        // Create and save message
        const directMessage = new DirectMessage({
          senderId: socket.userId,
          receiverId,
          message: content,
          listingId: listingId || undefined,
          timestamp: new Date()
        });
        
        await directMessage.save();
        
        // Populate sender and receiver info
        await directMessage.populate([
          { path: 'senderId', select: 'fullName username profilePicture' },
          { path: 'receiverId', select: 'fullName username profilePicture' },
          { path: 'listingId', select: 'title' }
        ]);
        
        console.log(`✅ [SOCKET-MAIN] Message saved, emitting to both users`);
        // Send message to both sender and receiver
        socket.emit('directMessage', directMessage);
        socket.to(`user_${receiverId}`).emit('directMessage', directMessage);
        
        console.log(`✅ [SOCKET-MAIN] Message sent from ${socket.userId} to ${receiverId}`);
        
      } catch (error) {
        console.error('❌ [SOCKET-MAIN] Error sending direct message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle joining common chat
    socket.on('joinCommonChat', () => {
      console.log(`📝 [SOCKET-MAIN] User ${socket.user.fullName} joining common chat`);
      socket.join('common_chat');
      socket.emit('joinedCommonChat');
      console.log(`✅ [SOCKET-MAIN] User ${socket.userId} joined common_chat`);
    });

    // Handle common chat message sending
    socket.on('sendCommonChatMessage', async (data) => {
      try {
        console.log(`📝 [SOCKET-MAIN] Received sendCommonChatMessage from ${socket.user.fullName}:`, data);
        const { content } = data;
        
        if (!content || content.trim().length === 0) {
          console.log(`❌ [SOCKET-MAIN] Empty message content`);
          socket.emit('error', { message: 'Message content is required' });
          return;
        }

        console.log(`📝 [SOCKET-MAIN] Creating common chat message...`);
        const message = {
          senderId: socket.userId,
          content: content.trim(),
          timestamp: new Date(),
          type: 'text',
          isAnonymous: false
        };

        // Save to database if you have CommonChatMessage model
        try {
          const commonMessage = new CommonChatMessage(message);
          await commonMessage.save();
          await commonMessage.populate('senderId', 'fullName username profilePicture');
          
          console.log(`✅ [SOCKET-MAIN] Common chat message saved, broadcasting...`);
          io.to('common_chat').emit('commonChatMessage', commonMessage);
        } catch (dbError) {
          console.log(`⚠️ [SOCKET-MAIN] Database save failed, emitting without persistence:`, dbError.message);
          // Still emit the message even if DB save fails
          io.to('common_chat').emit('commonChatMessage', {
            ...message,
            senderId: socket.user,
            _id: new Date().getTime().toString()
          });
        }
        
      } catch (error) {
        console.error('❌ [SOCKET-MAIN] Error sending common chat message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle room joining
    socket.on('joinRoom', (roomId) => {
      console.log(`📝 [SOCKET-MAIN] User ${socket.userId} joining room: ${roomId}`);
      socket.join(`room_${roomId}`);
      socket.emit('joinedRoom', { roomId });
      console.log(`✅ [SOCKET-MAIN] User ${socket.userId} joined room_${roomId}`);
    });

    // Handle room message sending
    socket.on('sendRoomMessage', async (data) => {
      try {
        console.log(`📝 [SOCKET-MAIN] Received sendRoomMessage from ${socket.user.fullName}:`, data);
        const { roomId, content } = data;
        
        if (!roomId || !content) {
          console.log(`❌ [SOCKET-MAIN] Missing roomId or content`);
          socket.emit('error', { message: 'Room ID and content are required' });
          return;
        }

        const message = {
          senderId: socket.userId,
          senderInfo: socket.user,
          roomId,
          content,
          timestamp: new Date(),
          _id: new Date().getTime().toString()
        };
        
        console.log(`✅ [SOCKET-MAIN] Broadcasting room message to room_${roomId}`);
        io.to(`room_${roomId}`).emit('roomMessage', message);
        
      } catch (error) {
        console.error('❌ [SOCKET-MAIN] Error sending room message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle generic notifications
    socket.on('leaveRoom', (roomId) => {
      console.log(`📝 [SOCKET-MAIN] User ${socket.userId} leaving room: ${roomId}`);
      socket.leave(`room_${roomId}`);
    });
    
    socket.on('disconnect', () => {
      console.log(`🔌 [SOCKET-MAIN] User ${socket.user.fullName} disconnected from main namespace`);
    });
  });

  // Direct Messages Namespace (keeping for backward compatibility)
  const directMessagesNamespace = io.of('/direct-messages');
  directMessagesNamespace.use(socketAuth);

  directMessagesNamespace.on('connection', (socket) => {
    console.log(`✅ [SOCKET-DM] User ${socket.user.fullName} connected to direct messages namespace`);
    
    // Join user's personal room
    socket.join(socket.userId);
    
    // Handle sending direct message
    socket.on('sendMessage', async (data) => {
      try {
        console.log(`📝 [SOCKET-DM] Received sendMessage:`, data);
        const { toUserId, message, listingId } = data;
        
        // Validate input
        if (!toUserId || !message) {
          socket.emit('error', { message: 'Missing required fields' });
          return;
        }
        
        // Check if receiver exists
        const receiver = await User.findById(toUserId);
        if (!receiver) {
          socket.emit('error', { message: 'Receiver not found' });
          return;
        }
        
        // Create and save message
        const directMessage = new DirectMessage({
          senderId: socket.userId,
          receiverId: toUserId,
          message,
          listingId: listingId || undefined
        });
        
        await directMessage.save();
        
        // Populate sender and receiver info
        await directMessage.populate([
          { path: 'senderId', select: 'fullName username profilePicture' },
          { path: 'receiverId', select: 'fullName username profilePicture' },
          { path: 'listingId', select: 'title' }
        ]);
        
        // Send message to both sender and receiver
        directMessagesNamespace.to(socket.userId).emit('receiveMessage', directMessage);
        directMessagesNamespace.to(toUserId).emit('receiveMessage', directMessage);
        
        console.log(`✅ [SOCKET-DM] Message sent from ${socket.userId} to ${toUserId}`);
        
      } catch (error) {
        console.error('❌ [SOCKET-DM] Error sending direct message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Handle marking message as read
    socket.on('markAsRead', async (data) => {
      try {
        const { messageId } = data;
        
        const message = await DirectMessage.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }
        
        // Only receiver can mark as read
        if (message.receiverId.toString() !== socket.userId) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }
        
        await message.markAsRead();
        
        // Notify sender that message was read
        directMessagesNamespace.to(message.senderId.toString()).emit('messageRead', {
          messageId,
          readAt: message.readAt
        });
        
      } catch (error) {
        console.error('Error marking message as read:', error);
        socket.emit('error', { message: 'Failed to mark message as read' });
      }
    });
    
    // Handle getting conversation
    socket.on('getConversation', async (data) => {
      try {
        const { otherUserId, page = 1, limit = 50 } = data;
        
        const messages = await DirectMessage.getConversation(socket.userId, otherUserId, page, limit);
        
        socket.emit('conversationMessages', {
          messages,
          page,
          hasMore: messages.length === limit
        });
        
      } catch (error) {
        console.error('Error getting conversation:', error);
        socket.emit('error', { message: 'Failed to get conversation' });
      }
    });
    
    socket.on('disconnect', () => {
      console.log(`🔌 [SOCKET-DM] User ${socket.user.fullName} disconnected from direct messages`);
    });
  });

  // Common Chat Namespace (keeping for backward compatibility)
  const commonChatNamespace = io.of('/common-chat');
  commonChatNamespace.use(socketAuth);

  commonChatNamespace.on('connection', (socket) => {
    console.log(`✅ [SOCKET-COMMON] User ${socket.user.fullName} connected to common chat namespace`);
    
    // Handle joining common room
    socket.on('joinCommonRoom', () => {
      socket.join('common-room');
      console.log(`📝 [SOCKET-COMMON] User ${socket.user.fullName} joined common room`);
      
      // Notify others about user joining
      socket.to('common-room').emit('userJoined', {
        userId: socket.userId,
        username: socket.user.username,
        fullName: socket.user.fullName
      });
    });
    
    // Handle sending common chat message
    socket.on('sendCommonMessage', async (data) => {
      try {
        const { type, content, isAnonymous, pollOptions, pollQuestion, allowMultipleVotes, imageCaption } = data;
        
        // Validate input
        if (!type || !content) {
          socket.emit('error', { message: 'Missing required fields' });
          return;
        }
        
        const messageData = {
          type,
          content,
          isAnonymous: isAnonymous || false
        };
        
        // Set sender info based on anonymity
        if (isAnonymous) {
          messageData.senderName = `Anonymous${Math.floor(Math.random() * 1000)}`;
        } else {
          messageData.senderId = socket.userId;
        }
        
        // Handle poll-specific data
        if (type === 'poll') {
          messageData.pollQuestion = pollQuestion;
          messageData.pollOptions = pollOptions?.map(option => ({
            text: option,
            votes: [],
            voteCount: 0
          })) || [];
          messageData.allowMultipleVotes = allowMultipleVotes || false;
          messageData.pollExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        }
        
        // Handle image-specific data
        if (type === 'image') {
          messageData.imageUrl = content;
          messageData.imageCaption = imageCaption || '';
        }
        
        // Create and save message
        const commonMessage = new CommonChatMessage(messageData);
        await commonMessage.save();
        
        // Populate sender info if not anonymous
        if (!isAnonymous) {
          await commonMessage.populate('senderId', 'fullName username profilePicture');
        }
        
        // Broadcast message to all users in common room
        commonChatNamespace.to('common-room').emit('newCommonMessage', commonMessage);
        
        console.log(`Common message sent by ${isAnonymous ? 'Anonymous' : socket.user.fullName}`);
        
      } catch (error) {
        console.error('Error sending common message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Handle voting on poll
    socket.on('voteOnPoll', async (data) => {
      try {
        const { messageId, optionIndex } = data;
        
        const message = await CommonChatMessage.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }
        
        if (message.type !== 'poll') {
          socket.emit('error', { message: 'Not a poll message' });
          return;
        }
        
        await message.addVote(socket.userId, optionIndex);
        
        // Populate and broadcast updated poll
        await message.populate('senderId', 'fullName username profilePicture');
        commonChatNamespace.to('common-room').emit('pollUpdated', message);
        
      } catch (error) {
        console.error('Error voting on poll:', error);
        socket.emit('error', { message: error.message || 'Failed to vote' });
      }
    });
    
    // Handle adding reaction
    socket.on('addReaction', async (data) => {
      try {
        const { messageId, reaction } = data;
        
        const message = await CommonChatMessage.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }
        
        await message.addReaction(socket.userId, reaction);
        await message.populate('reactions.userId', 'fullName username');
        
        commonChatNamespace.to('common-room').emit('reactionAdded', {
          messageId,
          reactions: message.reactions
        });
        
      } catch (error) {
        console.error('Error adding reaction:', error);
        socket.emit('error', { message: 'Failed to add reaction' });
      }
    });
    
    // Handle getting recent messages
    socket.on('getRecentMessages', async (data) => {
      try {
        const { page = 1, limit = 50 } = data || {};
        
        const messages = await CommonChatMessage.getRecentMessages(limit, page);
        
        socket.emit('recentMessages', {
          messages,
          page,
          hasMore: messages.length === limit
        });
        
      } catch (error) {
        console.error('Error getting recent messages:', error);
        socket.emit('error', { message: 'Failed to get messages' });
      }
    });
    
    socket.on('disconnect', () => {
      console.log(`🔌 [SOCKET-COMMON] User ${socket.user.fullName} disconnected from common chat`);
      
      // Notify others about user leaving
      socket.to('common-room').emit('userLeft', {
        userId: socket.userId,
        username: socket.user.username,
        fullName: socket.user.fullName
      });
    });
  });

  console.log('✅ [SOCKET] Socket.IO initialized successfully with all namespaces');
  console.log('📍 [SOCKET] Available namespaces: main, /direct-messages, /common-chat');
  console.log('🔧 [SOCKET] Frontend can connect using both main namespace and specific namespaces');
  return io;
};

// Utility function to emit to a specific user
const emitToUser = (userId, event, data) => {
  if (io) {
    console.log(`📤 [SOCKET-UTIL] Emitting '${event}' to user: ${userId}`);
    io.to(`user_${userId}`).emit(event, data);
    console.log(`✅ [SOCKET-UTIL] Event '${event}' sent to user_${userId}`);
  } else {
    console.log(`❌ [SOCKET-UTIL] Socket.IO not initialized, cannot emit to user ${userId}`);
  }
};

// Utility function to emit to a room
const emitToRoom = (roomId, event, data) => {
  if (io) {
    console.log(`📤 [SOCKET-UTIL] Emitting '${event}' to room: ${roomId}`);
    io.to(roomId).emit(event, data);
    console.log(`✅ [SOCKET-UTIL] Event '${event}' sent to room ${roomId}`);
  } else {
    console.log(`❌ [SOCKET-UTIL] Socket.IO not initialized, cannot emit to room ${roomId}`);
  }
};

// Utility function to broadcast to all users
const broadcast = (event, data) => {
  if (io) {
    console.log(`📡 [SOCKET-UTIL] Broadcasting '${event}' to all users`);
    io.emit(event, data);
    console.log(`✅ [SOCKET-UTIL] Event '${event}' broadcasted successfully`);
  } else {
    console.log(`❌ [SOCKET-UTIL] Socket.IO not initialized, cannot broadcast`);
  }
};

module.exports = {
  initializeSocket,
  emitToUser,
  emitToRoom,
  broadcast
};
