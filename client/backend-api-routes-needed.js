// POST /api/messages/sync-conversation
// This endpoint ensures frontend and backend are in sync for a conversation

router.post('/sync-conversation', authenticateUser, async (req, res) => {
  try {
    const { partnerId, listingId, lastMessageTimestamp } = req.body;
    const userId = req.user.id;

    // Get all messages in this conversation after the timestamp
    const newMessages = await Message.find({
      listingId: listingId,
      $or: [
        { senderId: userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: userId }
      ],
      timestamp: { $gt: new Date(lastMessageTimestamp) }
    })
    .populate('senderId', 'fullName')
    .populate('receiverId', 'fullName')
    .sort({ timestamp: 1 });

    // Mark any unread messages from partner as read
    await Message.updateMany({
      senderId: partnerId,
      receiverId: userId,
      listingId: listingId,
      isReadByReceiver: false
    }, {
      isReadByReceiver: true,
      readAt: new Date()
    });

    res.json({
      success: true,
      newMessages: newMessages,
      unreadCount: 0 // Since we just marked them as read
    });

  } catch (error) {
    console.error('Message sync error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to sync conversation' 
    });
  }
});

// GET /api/messages/sync-status
// Check if there are new messages for the user
router.get('/sync-status', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { lastChecked } = req.query;

    const newMessageCount = await Message.countDocuments({
      receiverId: userId,
      timestamp: { $gt: new Date(lastChecked) },
      isReadByReceiver: false
    });

    const newCommonChatCount = await CommonChatMessage.countDocuments({
      timestamp: { $gt: new Date(lastChecked) }
    });

    res.json({
      success: true,
      hasNewDirectMessages: newMessageCount > 0,
      hasNewCommonChat: newCommonChatCount > 0,
      newDirectMessageCount: newMessageCount,
      newCommonChatCount: newCommonChatCount
    });

  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check sync status' 
    });
  }
});
