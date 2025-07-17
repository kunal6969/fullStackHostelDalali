const CommonChatMessage = require('../models/commonChatMessage.model');
const User = require('../models/user.model');
const ApiError = require('../../utils/apiError');
const ApiResponse = require('../../utils/apiResponse');
const { MESSAGE_TYPE } = require('../../utils/constants');

// Get recent common chat messages
const getRecentMessages = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, type } = req.query;

    // Build filter
    const filter = { isDeleted: false };
    if (type && Object.values(MESSAGE_TYPE).includes(type)) {
      filter.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await CommonChatMessage.find(filter)
      .populate('senderId', 'fullName username profilePicture')
      .populate('replyTo', 'content senderId type')
      .populate('reactions.userId', 'fullName username')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await CommonChatMessage.countDocuments(filter);

    res.status(200).json(
      new ApiResponse(200, {
        messages: messages.reverse(), // Show oldest first for chat
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasMore: parseInt(page) * parseInt(limit) < totalCount
        }
      }, 'Messages retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Send a message to common chat
const sendMessage = async (req, res, next) => {
  try {
    const {
      type,
      content,
      isAnonymous = false,
      pollOptions,
      pollQuestion,
      allowMultipleVotes = false,
      imageCaption,
      replyTo
    } = req.body;

    // Validate required fields
    if (!type || !content) {
      throw new ApiError(400, 'Message type and content are required');
    }

    if (!Object.values(MESSAGE_TYPE).includes(type)) {
      throw new ApiError(400, 'Invalid message type');
    }

    // Build message data
    const messageData = {
      type,
      content,
      isAnonymous
    };

    // Set sender info based on anonymity
    if (isAnonymous) {
      messageData.senderName = `Anonymous${Math.floor(Math.random() * 1000)}`;
    } else {
      messageData.senderId = req.user._id;
    }

    // Handle poll-specific validation and data
    if (type === MESSAGE_TYPE.POLL) {
      if (!pollQuestion || !pollOptions || !Array.isArray(pollOptions) || pollOptions.length < 2) {
        throw new ApiError(400, 'Poll requires a question and at least 2 options');
      }

      if (pollOptions.length > 6) {
        throw new ApiError(400, 'Poll cannot have more than 6 options');
      }

      if (pollQuestion.length > 200) {
        throw new ApiError(400, 'Poll question cannot exceed 200 characters');
      }

      messageData.pollQuestion = pollQuestion.trim();
      messageData.pollOptions = pollOptions.map(option => ({
        text: option.trim(),
        votes: [],
        voteCount: 0
      }));
      messageData.allowMultipleVotes = allowMultipleVotes;
      messageData.pollExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    }

    // Handle image-specific data
    if (type === MESSAGE_TYPE.IMAGE) {
      messageData.imageUrl = content;
      if (imageCaption) {
        if (imageCaption.length > 200) {
          throw new ApiError(400, 'Image caption cannot exceed 200 characters');
        }
        messageData.imageCaption = imageCaption.trim();
      }
    }

    // Handle text message validation
    if (type === MESSAGE_TYPE.TEXT) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        throw new ApiError(400, 'Text message cannot be empty');
      }

      if (content.length > 1000) {
        throw new ApiError(400, 'Text message cannot exceed 1000 characters');
      }

      messageData.content = content.trim();
    }

    // Handle reply
    if (replyTo) {
      const replyMessage = await CommonChatMessage.findById(replyTo);
      if (!replyMessage) {
        throw new ApiError(404, 'Reply message not found');
      }
      messageData.replyTo = replyTo;
    }

    // Create and save message
    const commonMessage = new CommonChatMessage(messageData);
    await commonMessage.save();

    // Populate the message for response
    await commonMessage.populate([
      { path: 'senderId', select: 'fullName username profilePicture' },
      { path: 'replyTo', select: 'content senderId type' }
    ]);

    res.status(201).json(
      new ApiResponse(201, commonMessage, 'Message sent successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Vote on a poll
const voteOnPoll = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { optionIndex } = req.body;
    const userId = req.user._id;

    if (typeof optionIndex !== 'number' || optionIndex < 0) {
      throw new ApiError(400, 'Valid option index is required');
    }

    const message = await CommonChatMessage.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    if (message.type !== MESSAGE_TYPE.POLL) {
      throw new ApiError(400, 'Message is not a poll');
    }

    if (optionIndex >= message.pollOptions.length) {
      throw new ApiError(400, 'Invalid option index');
    }

    // Add/remove vote
    await message.addVote(userId, optionIndex);

    // Populate and return updated message
    await message.populate('senderId', 'fullName username profilePicture');

    res.status(200).json(
      new ApiResponse(200, message, 'Vote recorded successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Add reaction to a message
const addReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;
    const userId = req.user._id;

    if (!reaction || typeof reaction !== 'string') {
      throw new ApiError(400, 'Reaction is required');
    }

    // Validate reaction (basic emoji validation)
    const validReactions = ['👍', '👎', '❤️', '😂', '😮', '😢', '😡', '👏', '🔥', '🎉'];
    if (!validReactions.includes(reaction)) {
      throw new ApiError(400, 'Invalid reaction');
    }

    const message = await CommonChatMessage.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    if (message.isDeleted) {
      throw new ApiError(400, 'Cannot react to deleted message');
    }

    await message.addReaction(userId, reaction);
    await message.populate('reactions.userId', 'fullName username');

    res.status(200).json(
      new ApiResponse(200, {
        messageId,
        reactions: message.reactions
      }, 'Reaction added successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Remove reaction from a message
const removeReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await CommonChatMessage.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    await message.removeReaction(userId);
    await message.populate('reactions.userId', 'fullName username');

    res.status(200).json(
      new ApiResponse(200, {
        messageId,
        reactions: message.reactions
      }, 'Reaction removed successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Edit a message (only for non-anonymous messages by the sender)
const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content || content.trim().length === 0) {
      throw new ApiError(400, 'Message content is required');
    }

    const message = await CommonChatMessage.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    // Check if user can edit this message
    if (message.isAnonymous || !message.senderId || message.senderId.toString() !== userId.toString()) {
      throw new ApiError(403, 'You can only edit your own non-anonymous messages');
    }

    // Check if message is not too old (allow editing within 1 hour for common chat)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (message.createdAt < oneHourAgo) {
      throw new ApiError(400, 'Cannot edit messages older than 1 hour');
    }

    // Only allow editing text messages
    if (message.type !== MESSAGE_TYPE.TEXT) {
      throw new ApiError(400, 'Only text messages can be edited');
    }

    if (content.length > 1000) {
      throw new ApiError(400, 'Message cannot exceed 1000 characters');
    }

    // Update message
    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    await message.populate('senderId', 'fullName username profilePicture');

    res.status(200).json(
      new ApiResponse(200, message, 'Message edited successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Delete a message (only by sender or admin)
const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await CommonChatMessage.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    // Check if user can delete this message
    if (message.isAnonymous || !message.senderId || message.senderId.toString() !== userId.toString()) {
      throw new ApiError(403, 'You can only delete your own non-anonymous messages');
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

// Pin/unpin a message (admin feature - for now, allow message owner)
const togglePin = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await CommonChatMessage.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    // For now, only allow message owner to pin/unpin
    // In a real app, you'd have admin roles
    if (message.isAnonymous || !message.senderId || message.senderId.toString() !== userId.toString()) {
      throw new ApiError(403, 'You can only pin/unpin your own messages');
    }

    // Toggle pin status
    message.isPinned = !message.isPinned;
    if (message.isPinned) {
      message.pinnedBy = userId;
      message.pinnedAt = new Date();
    } else {
      message.pinnedBy = undefined;
      message.pinnedAt = undefined;
    }

    await message.save();
    await message.populate('senderId', 'fullName username profilePicture');

    res.status(200).json(
      new ApiResponse(200, message, `Message ${message.isPinned ? 'pinned' : 'unpinned'} successfully`)
    );
  } catch (error) {
    next(error);
  }
};

// Get pinned messages
const getPinnedMessages = async (req, res, next) => {
  try {
    const pinnedMessages = await CommonChatMessage.find({
      isPinned: true,
      isDeleted: false
    })
      .populate('senderId', 'fullName username profilePicture')
      .populate('pinnedBy', 'fullName username')
      .sort({ pinnedAt: -1 })
      .limit(10); // Limit to 10 pinned messages

    res.status(200).json(
      new ApiResponse(200, pinnedMessages, 'Pinned messages retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Search common chat messages
const searchMessages = async (req, res, next) => {
  try {
    const { query, type, page = 1, limit = 20 } = req.query;

    if (!query || query.trim().length < 2) {
      throw new ApiError(400, 'Search query must be at least 2 characters long');
    }

    const searchFilter = {
      content: new RegExp(query.trim(), 'i'),
      isDeleted: false
    };

    if (type && Object.values(MESSAGE_TYPE).includes(type)) {
      searchFilter.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await CommonChatMessage.find(searchFilter)
      .populate('senderId', 'fullName username profilePicture')
      .populate('replyTo', 'content senderId type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await CommonChatMessage.countDocuments(searchFilter);

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

module.exports = {
  getRecentMessages,
  sendMessage,
  voteOnPoll,
  addReaction,
  removeReaction,
  editMessage,
  deleteMessage,
  togglePin,
  getPinnedMessages,
  searchMessages
};
