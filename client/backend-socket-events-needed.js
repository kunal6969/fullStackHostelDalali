// Backend Socket.IO Event Handlers Required

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // 1. USER AUTHENTICATION & SETUP
  socket.on('setup', (userData) => {
    // Join user to their personal room for direct messages
    socket.join(`user_${userData.userId}`);
    socket.userId = userData.userId;
    console.log(`User ${userData.userId} joined their room`);
  });

  // 2. DIRECT MESSAGING
  socket.on('new direct message', async (messageData) => {
    try {
      // Save message to database
      const savedMessage = await Message.create({
        senderId: messageData.senderId,
        receiverId: messageData.receiverId,
        listingId: messageData.listingId,
        message: messageData.message,
        senderName: messageData.senderName,
        receiverName: messageData.receiverName,
        listingRoomSummary: messageData.listingRoomSummary,
        timestamp: new Date(),
        isReadByReceiver: false
      });

      // Populate sender/receiver details
      await savedMessage.populate(['senderId', 'receiverId']);

      // Emit to receiver's room
      socket.to(`user_${messageData.receiverId}`).emit('message received', savedMessage);
      
      // Also emit back to sender for confirmation
      socket.emit('message sent', savedMessage);

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message error', { error: 'Failed to send message' });
    }
  });

  // 3. COMMON CHAT
  socket.on('join common chat', () => {
    socket.join('common-chat');
    console.log(`User ${socket.userId} joined common chat`);
  });

  socket.on('leave common chat', () => {
    socket.leave('common-chat');
    console.log(`User ${socket.userId} left common chat`);
  });

  socket.on('new common chat message', async (messageData) => {
    try {
      // Save to database
      const savedMessage = await CommonChatMessage.create(messageData);
      
      // Broadcast to all users in common chat
      io.to('common-chat').emit('common chat message', savedMessage);

    } catch (error) {
      console.error('Error in common chat:', error);
      socket.emit('chat error', { error: 'Failed to send chat message' });
    }
  });

  // 4. MESSAGE READ RECEIPTS
  socket.on('mark message read', async (data) => {
    try {
      await Message.findByIdAndUpdate(data.messageId, {
        isReadByReceiver: true,
        readAt: new Date()
      });

      // Notify sender that message was read
      const message = await Message.findById(data.messageId);
      socket.to(`user_${message.senderId}`).emit('message read', {
        messageId: data.messageId,
        readAt: new Date()
      });

    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  });

  // 5. USER ROOMS
  socket.on('join user room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their personal room`);
  });

  // 6. DISCONNECT
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// AUTHENTICATION MIDDLEWARE FOR SOCKET.IO
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});
