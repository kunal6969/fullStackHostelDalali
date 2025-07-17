const DirectMessage = require('../models/directMessage.model');
const User = require('../models/user.model');
const ApiError = require('../../utils/apiError');
const ApiResponse = require('../../utils/apiResponse');

// Get conversations list for current user
const getConversations = async (req, res, next) => {
  try {
    console.log(`📝 [CONVERSATIONS] GET /api/messages/conversations - Request started`);
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    console.log(`📝 [CONVERSATIONS] User ID: ${userId}`);
    console.log(`📝 [CONVERSATIONS] Pagination: page ${page}, limit ${limit}`);

    // Aggregate to get latest message for each conversation
    console.log(`📝 [CONVERSATIONS] Executing aggregation query...`);
    const conversations = await DirectMessage.aggregate([
      {
        $match: {
          $or: [
            { senderId: userId },
            { receiverId: userId }
          ],
          isDeleted: false
        }
      },
      {
        $addFields: {
          partnerId: {
            $cond: {
              if: { $eq: ['$senderId', userId] },
              then: '$receiverId',
              else: '$senderId'
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$partnerId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $eq: ['$receiverId', userId] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                then: 1,
                else: 0
              }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'partner',
          pipeline: [
            {
              $project: {
                fullName: 1,
                username: 1,
                profilePicture: 1,
                isActive: 1
              }
            }
          ]
        }
      },
      {
        $unwind: '$partner'
      },
      {
        $match: {
          'partner.isActive': true
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      },
      {
        $skip: (parseInt(page) - 1) * parseInt(limit)
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    // Populate listing info for last messages
    for (let conversation of conversations) {
      if (conversation.lastMessage.listingId) {
        await DirectMessage.populate(conversation.lastMessage, {
          path: 'listingId',
          select: 'title'
        });
      }
    }

    res.status(200).json(
      new ApiResponse(200, {
        conversations,
        pagination: {
          currentPage: parseInt(page),
          hasMore: conversations.length === parseInt(limit)
        }
      }, 'Conversations retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Get messages between current user and another user
const getConversation = async (req, res, next) => {
  try {
    const { userId: otherUserId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const currentUserId = req.user._id;

    // Validate other user exists
    const otherUser = await User.findById(otherUserId).select('fullName username profilePicture');
    if (!otherUser) {
      throw new ApiError(404, 'User not found');
    }

    // Get messages between the two users
    const messages = await DirectMessage.getConversation(currentUserId, otherUserId, parseInt(page), parseInt(limit));

    // Mark messages as read (messages sent to current user)
    await DirectMessage.updateMany(
      {
        senderId: otherUserId,
        receiverId: currentUserId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.status(200).json(
      new ApiResponse(200, {
        messages: messages.reverse(), // Reverse to show oldest first
        otherUser,
        pagination: {
          currentPage: parseInt(page),
          hasMore: messages.length === parseInt(limit)
        }
      }, 'Conversation retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Send a direct message
const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, message, listingId, messageType = 'text' } = req.body;
    const senderId = req.user._id;

    // Validate required fields
    if (!receiverId || !message) {
      throw new ApiError(400, 'Receiver ID and message are required');
    }

    if (message.trim().length === 0) {
      throw new ApiError(400, 'Message cannot be empty');
    }

    if (message.length > 1000) {
      throw new ApiError(400, 'Message cannot exceed 1000 characters');
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      throw new ApiError(404, 'Receiver not found');
    }

    if (!receiver.isActive) {
      throw new ApiError(400, 'Cannot send message to inactive user');
    }

    // Prevent sending message to self
    if (senderId.toString() === receiverId.toString()) {
      throw new ApiError(400, 'Cannot send message to yourself');
    }

    // Create new message
    const directMessage = new DirectMessage({
      senderId,
      receiverId,
      message: message.trim(),
      listingId: listingId || undefined,
      messageType
    });

    await directMessage.save();

    // Populate sender and receiver info
    await directMessage.populate([
      { path: 'senderId', select: 'fullName username profilePicture' },
      { path: 'receiverId', select: 'fullName username profilePicture' },
      { path: 'listingId', select: 'title' }
    ]);

    res.status(201).json(
      new ApiResponse(201, directMessage, 'Message sent successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Mark message as read
const markAsRead = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await DirectMessage.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    // Only receiver can mark message as read
    if (message.receiverId.toString() !== userId.toString()) {
      throw new ApiError(403, 'You can only mark messages sent to you as read');
    }

    await message.markAsRead();

    res.status(200).json(
      new ApiResponse(200, null, 'Message marked as read')
    );
  } catch (error) {
    next(error);
  }
};

// Mark all messages from a user as read
const markAllAsRead = async (req, res, next) => {
  try {
    const { userId: senderId } = req.params;
    const receiverId = req.user._id;

    // Update all unread messages from this sender
    const result = await DirectMessage.updateMany(
      {
        senderId,
        receiverId,
        isRead: false,
        isDeleted: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.status(200).json(
      new ApiResponse(200, {
        updatedCount: result.modifiedCount
      }, 'All messages marked as read')
    );
  } catch (error) {
    next(error);
  }
};

// Delete a message
const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await DirectMessage.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    // Only sender can delete their message
    if (message.senderId.toString() !== userId.toString()) {
      throw new ApiError(403, 'You can only delete your own messages');
    }

    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    res.status(200).json(
      new ApiResponse(200, null, 'Message deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Edit a message
const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { message: newMessage } = req.body;
    const userId = req.user._id;

    if (!newMessage || newMessage.trim().length === 0) {
      throw new ApiError(400, 'Message content is required');
    }

    if (newMessage.length > 1000) {
      throw new ApiError(400, 'Message cannot exceed 1000 characters');
    }

    const message = await DirectMessage.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    // Only sender can edit their message
    if (message.senderId.toString() !== userId.toString()) {
      throw new ApiError(403, 'You can only edit your own messages');
    }

    // Check if message is not too old (allow editing within 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (message.createdAt < twentyFourHoursAgo) {
      throw new ApiError(400, 'Cannot edit messages older than 24 hours');
    }

    // Update message
    message.message = newMessage.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // Populate for response
    await message.populate([
      { path: 'senderId', select: 'fullName username profilePicture' },
      { path: 'receiverId', select: 'fullName username profilePicture' },
      { path: 'listingId', select: 'title' }
    ]);

    res.status(200).json(
      new ApiResponse(200, message, 'Message edited successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Search messages
const searchMessages = async (req, res, next) => {
  try {
    const { query, userId: otherUserId, page = 1, limit = 20 } = req.query;
    const currentUserId = req.user._id;

    if (!query || query.trim().length < 2) {
      throw new ApiError(400, 'Search query must be at least 2 characters long');
    }

    const searchFilter = {
      $or: [
        { senderId: currentUserId },
        { receiverId: currentUserId }
      ],
      message: new RegExp(query.trim(), 'i'),
      isDeleted: false
    };

    // If searching within a specific conversation
    if (otherUserId) {
      searchFilter.$or = [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await DirectMessage.find(searchFilter)
      .populate('senderId', 'fullName username profilePicture')
      .populate('receiverId', 'fullName username profilePicture')
      .populate('listingId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await DirectMessage.countDocuments(searchFilter);

    res.status(200).json(
      new ApiResponse(200, {
        messages,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasMore: parseInt(page) * parseInt(limit) < totalCount
        }
      }, 'Messages found')
    );
  } catch (error) {
    next(error);
  }
};

// Get unread message count
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const unreadCount = await DirectMessage.getUnreadCount(userId);

    res.status(200).json(
      new ApiResponse(200, { unreadCount }, 'Unread count retrieved')
    );
  } catch (error) {
    next(error);
  }
};

// Sync conversation messages since last timestamp
const syncConversation = async (req, res, next) => {
  try {
    console.log(`📝 [SYNC-CONVERSATION] POST /api/messages/sync-conversation - Request started`);
    const { otherUserId, lastSyncTimestamp } = req.body;
    const userId = req.user._id;

    console.log(`📝 [SYNC-CONVERSATION] Sync params:`, { 
      userId, 
      otherUserId, 
      lastSyncTimestamp 
    });

    if (!otherUserId) {
      console.log(`❌ [SYNC-CONVERSATION] Missing otherUserId`);
      throw new ApiError(400, 'Other user ID is required');
    }

    // Validate other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      console.log(`❌ [SYNC-CONVERSATION] Other user not found: ${otherUserId}`);
      throw new ApiError(404, 'Other user not found');
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
      query.createdAt = { $gt: new Date(lastSyncTimestamp) };
      console.log(`📝 [SYNC-CONVERSATION] Filtering messages since: ${lastSyncTimestamp}`);
    }

    console.log(`📝 [SYNC-CONVERSATION] Executing sync query...`);
    const messages = await DirectMessage.find(query)
      .populate('senderId', 'fullName username profilePicture')
      .populate('receiverId', 'fullName username profilePicture')
      .populate('listingId', 'title')
      .sort({ createdAt: 1 }) // Oldest first for sync
      .limit(500); // Reasonable limit for sync

    console.log(`📝 [SYNC-CONVERSATION] Found ${messages.length} messages to sync`);

    const currentSyncTimestamp = new Date();
    
    console.log(`✅ [SYNC-CONVERSATION] Sending sync response`);
    res.status(200).json(
      new ApiResponse(200, {
        messages,
        syncTimestamp: currentSyncTimestamp,
        otherUser: {
          _id: otherUser._id,
          fullName: otherUser.fullName,
          username: otherUser.username,
          profilePicture: otherUser.profilePicture
        }
      }, 'Conversation synced successfully')
    );
    console.log(`✅ [SYNC-CONVERSATION] Sync completed successfully`);
  } catch (error) {
    console.log(`❌ [SYNC-CONVERSATION] Error occurred:`, error.message);
    console.log(`❌ [SYNC-CONVERSATION] Request body:`, req.body);
    next(error);
  }
};

// Get sync status and server time
const getSyncStatus = async (req, res, next) => {
  try {
    console.log(`📝 [SYNC-STATUS] GET /api/messages/sync-status - Request started`);
    const userId = req.user._id;
    console.log(`📝 [SYNC-STATUS] User ID: ${userId}`);

    // Get user's last message activity
    console.log(`📝 [SYNC-STATUS] Finding last message activity...`);
    const lastMessage = await DirectMessage.findOne({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ],
      isDeleted: false
    })
    .sort({ createdAt: -1 })
    .select('createdAt');

    const lastActivity = lastMessage ? lastMessage.createdAt : null;
    const serverTime = new Date();

    console.log(`📝 [SYNC-STATUS] Last activity:`, lastActivity);
    console.log(`📝 [SYNC-STATUS] Server time:`, serverTime);

    // Get unread message count
    const unreadCount = await DirectMessage.countDocuments({
      receiverId: userId,
      isRead: false,
      isDeleted: false
    });

    console.log(`📝 [SYNC-STATUS] Unread count: ${unreadCount}`);

    console.log(`✅ [SYNC-STATUS] Sending status response`);
    res.status(200).json(
      new ApiResponse(200, {
        lastActivity,
        serverTime,
        unreadCount,
        userId
      }, 'Sync status retrieved successfully')
    );
    console.log(`✅ [SYNC-STATUS] Status sent successfully`);
  } catch (error) {
    console.log(`❌ [SYNC-STATUS] Error occurred:`, error.message);
    console.log(`❌ [SYNC-STATUS] User ID:`, req.user?._id);
    next(error);
  }
};

module.exports = {
  getConversations,
  getConversation,
  sendMessage,
  markAsRead,
  markAllAsRead,
  deleteMessage,
  editMessage,
  searchMessages,
  getUnreadCount,
  syncConversation,
  getSyncStatus
};
