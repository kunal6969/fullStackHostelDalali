const User = require('../models/user.model');
const FriendRequest = require('../models/friendRequest.model');
const ApiError = require('../../utils/apiError');
const ApiResponse = require('../../utils/apiResponse');
const { FRIEND_REQUEST_STATUS } = require('../../utils/constants');
const { emitToUser } = require('../../config/socket');

// Get user's friends list
const getFriends = async (req, res, next) => {
  try {
    console.log(`📝 [FRIENDS] GET /api/friends - Request started`);
    const { page = 1, limit = 20, search } = req.query;
    const userId = req.user._id;

    console.log(`📝 [FRIENDS] User ID: ${userId}`);
    console.log(`📝 [FRIENDS] Query parameters:`, { page, limit, search });

    console.log(`📝 [FRIENDS] Finding user and populating friends...`);
    const user = await User.findById(userId)
      .populate({
        path: 'friends',
        select: 'fullName username profilePicture bio currentRoom isActive',
        match: search ? {
          $or: [
            { fullName: new RegExp(search, 'i') },
            { username: new RegExp(search, 'i') }
          ],
          isActive: true
        } : { isActive: true }
      });

    if (!user) {
      console.log(`❌ [FRIENDS] User not found: ${userId}`);
      throw new ApiError(404, 'User not found');
    }

    console.log(`📝 [FRIENDS] User found: ${user.fullName}`);
    console.log(`📝 [FRIENDS] Total friends before filtering: ${user.friends?.length || 0}`);

    // Apply pagination manually since populate doesn't support skip/limit well with match
    const friends = user.friends || [];
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedFriends = friends.slice(skip, skip + parseInt(limit));

    console.log(`📝 [FRIENDS] Pagination applied: showing ${paginatedFriends.length} of ${friends.length} friends`);

    const responseData = {
      friends: paginatedFriends,
      pagination: {
        currentPage: parseInt(page),
        totalCount: friends.length,
        totalPages: Math.ceil(friends.length / parseInt(limit)),
        hasMore: skip + parseInt(limit) < friends.length
      }
    };

    console.log(`✅ [FRIENDS] Sending response with ${paginatedFriends.length} friends`);
    res.status(200).json(
      new ApiResponse(200, responseData, 'Friends retrieved successfully')
    );
    console.log(`✅ [FRIENDS] Response sent successfully`);
  } catch (error) {
    console.log(`❌ [FRIENDS] Error occurred:`, error.message);
    console.log(`❌ [FRIENDS] Error stack:`, error.stack);
    console.log(`❌ [FRIENDS] User ID:`, req.user?._id);
    next(error);
  }
};

// Get friend requests (both sent and received)
const getFriendRequests = async (req, res, next) => {
  try {
    const { type = 'all', status, page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    let filter = {};

    // Build filter based on type
    if (type === 'sent') {
      filter.from = userId;
    } else if (type === 'received') {
      filter.toUserId = userId;
    } else {
      filter = {
        $or: [
          { from: userId },
          { toUserId: userId }
        ]
      };
    }

    // Add status filter if provided
    if (status && Object.values(FRIEND_REQUEST_STATUS).includes(status)) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const requests = await FriendRequest.find(filter)
      .populate('from', 'fullName username profilePicture bio')
      .populate('toUserId', 'fullName username profilePicture bio')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await FriendRequest.countDocuments(filter);

    // Add additional info for each request
    const enrichedRequests = requests.map(request => {
      const requestObj = request.toObject();
      requestObj.isSentByMe = request.from._id.toString() === userId.toString();
      requestObj.isReceivedByMe = request.toUserId._id.toString() === userId.toString();
      return requestObj;
    });

    res.status(200).json(
      new ApiResponse(200, {
        requests: enrichedRequests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasMore: parseInt(page) * parseInt(limit) < totalCount
        }
      }, 'Friend requests retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Send friend request
const sendFriendRequest = async (req, res, next) => {
  try {
    const { toUserId, message = '' } = req.body;
    const fromUserId = req.user._id;

    if (!toUserId) {
      throw new ApiError(400, 'Target user ID is required');
    }

    // Check if target user exists
    const targetUser = await User.findById(toUserId);
    if (!targetUser) {
      throw new ApiError(404, 'User not found');
    }

    if (!targetUser.isActive) {
      throw new ApiError(400, 'Cannot send friend request to inactive user');
    }

    // Prevent sending request to self
    if (fromUserId.toString() === toUserId.toString()) {
      throw new ApiError(400, 'Cannot send friend request to yourself');
    }

    // Check if users are already friends
    const currentUser = await User.findById(fromUserId);
    if (currentUser.friends.includes(toUserId)) {
      throw new ApiError(409, 'You are already friends with this user');
    }

    // Check if there's already a pending request between these users
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { from: fromUserId, toUserId: toUserId },
        { from: toUserId, toUserId: fromUserId }
      ],
      status: FRIEND_REQUEST_STATUS.PENDING
    });

    if (existingRequest) {
      throw new ApiError(409, 'Friend request already exists between you and this user');
    }

    // Validate message length
    if (message.length > 200) {
      throw new ApiError(400, 'Message cannot exceed 200 characters');
    }

    // Create friend request
    const friendRequest = new FriendRequest({
      from: fromUserId,
      toUserId,
      message: message.trim(),
      status: FRIEND_REQUEST_STATUS.PENDING
    });

    await friendRequest.save();

    // Populate the request for response
    await friendRequest.populate([
      { path: 'from', select: 'fullName username profilePicture' },
      { path: 'toUserId', select: 'fullName username profilePicture' }
    ]);

    // Send real-time notification to target user
    emitToUser(toUserId.toString(), 'friendRequestReceived', {
      request: friendRequest,
      message: `${currentUser.fullName} sent you a friend request`
    });

    res.status(201).json(
      new ApiResponse(201, friendRequest, 'Friend request sent successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Handle friend request (accept/reject)
const handleFriendRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, responseMessage = '' } = req.body;
    const userId = req.user._id;

    if (!['accept', 'reject'].includes(action)) {
      throw new ApiError(400, 'Action must be either accept or reject');
    }

    const friendRequest = await FriendRequest.findById(id)
      .populate('from', 'fullName username profilePicture')
      .populate('toUserId', 'fullName username profilePicture');

    if (!friendRequest) {
      throw new ApiError(404, 'Friend request not found');
    }

    // Check if current user is the recipient
    if (friendRequest.toUserId._id.toString() !== userId.toString()) {
      throw new ApiError(403, 'You can only respond to requests sent to you');
    }

    // Check if request is still pending
    if (friendRequest.status !== FRIEND_REQUEST_STATUS.PENDING) {
      throw new ApiError(400, 'This friend request has already been handled');
    }

    // Validate response message length
    if (responseMessage.length > 200) {
      throw new ApiError(400, 'Response message cannot exceed 200 characters');
    }

    const newStatus = action === 'accept' ? FRIEND_REQUEST_STATUS.ACCEPTED : FRIEND_REQUEST_STATUS.REJECTED;

    // Update friend request
    friendRequest.status = newStatus;
    friendRequest.responseMessage = responseMessage.trim();
    friendRequest.respondedAt = new Date();
    await friendRequest.save();

    // If accepted, add each user to the other's friends list
    if (action === 'accept') {
      await User.findByIdAndUpdate(friendRequest.from._id, {
        $addToSet: { friends: userId }
      });
      
      await User.findByIdAndUpdate(userId, {
        $addToSet: { friends: friendRequest.from._id }
      });

      // Send notification to requester
      emitToUser(friendRequest.from._id.toString(), 'friendRequestAccepted', {
        request: friendRequest,
        message: `${friendRequest.toUserId.fullName} accepted your friend request`
      });
    } else {
      // Send notification for rejection
      emitToUser(friendRequest.from._id.toString(), 'friendRequestRejected', {
        request: friendRequest,
        message: `${friendRequest.toUserId.fullName} declined your friend request`
      });
    }

    res.status(200).json(
      new ApiResponse(200, friendRequest, `Friend request ${action}ed successfully`)
    );
  } catch (error) {
    next(error);
  }
};

// Remove friend
const removeFriend = async (req, res, next) => {
  try {
    const { id: friendId } = req.params;
    const userId = req.user._id;

    // Check if friend exists
    const friend = await User.findById(friendId);
    if (!friend) {
      throw new ApiError(404, 'User not found');
    }

    // Check if they are actually friends
    const currentUser = await User.findById(userId);
    if (!currentUser.friends.includes(friendId)) {
      throw new ApiError(400, 'You are not friends with this user');
    }

    // Remove from both users' friends lists
    await User.findByIdAndUpdate(userId, {
      $pull: { friends: friendId }
    });
    
    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: userId }
    });

    // Send notification to the removed friend
    emitToUser(friendId.toString(), 'friendRemoved', {
      removedBy: {
        _id: userId,
        fullName: currentUser.fullName,
        username: currentUser.username
      },
      message: `${currentUser.fullName} removed you from their friends list`
    });

    res.status(200).json(
      new ApiResponse(200, null, 'Friend removed successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Get friend suggestions (users with mutual friends or similar preferences)
const getFriendSuggestions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    const currentUser = await User.findById(userId).populate('friends', '_id');
    if (!currentUser) {
      throw new ApiError(404, 'User not found');
    }

    const friendIds = currentUser.friends.map(friend => friend._id);
    const excludeIds = [...friendIds, userId];

    // Get pending friend requests to exclude them too
    const pendingRequests = await FriendRequest.find({
      $or: [
        { from: userId, status: FRIEND_REQUEST_STATUS.PENDING },
        { toUserId: userId, status: FRIEND_REQUEST_STATUS.PENDING }
      ]
    });

    const pendingUserIds = pendingRequests.map(req => 
      req.from.toString() === userId.toString() ? req.toUserId : req.from
    );

    excludeIds.push(...pendingUserIds);

    // Find users with mutual friends or similar gender (basic suggestion algorithm)
    const suggestions = await User.aggregate([
      {
        $match: {
          _id: { $nin: excludeIds },
          isActive: true,
          gender: currentUser.gender // Same gender for hostel compatibility
        }
      },
      {
        $addFields: {
          mutualFriendsCount: {
            $size: {
              $setIntersection: ['$friends', friendIds]
            }
          }
        }
      },
      {
        $sort: { mutualFriendsCount: -1, createdAt: -1 }
      },
      {
        $skip: (parseInt(page) - 1) * parseInt(limit)
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          fullName: 1,
          username: 1,
          profilePicture: 1,
          bio: 1,
          mutualFriendsCount: 1
        }
      }
    ]);

    res.status(200).json(
      new ApiResponse(200, {
        suggestions,
        pagination: {
          currentPage: parseInt(page),
          hasMore: suggestions.length === parseInt(limit)
        }
      }, 'Friend suggestions retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Get mutual friends between current user and another user
const getMutualFriends = async (req, res, next) => {
  try {
    const { userId: otherUserId } = req.params;
    const currentUserId = req.user._id;

    if (currentUserId.toString() === otherUserId.toString()) {
      throw new ApiError(400, 'Cannot get mutual friends with yourself');
    }

    const [currentUser, otherUser] = await Promise.all([
      User.findById(currentUserId).populate('friends', 'fullName username profilePicture'),
      User.findById(otherUserId).populate('friends', 'fullName username profilePicture')
    ]);

    if (!currentUser || !otherUser) {
      throw new ApiError(404, 'User not found');
    }

    // Find mutual friends
    const currentUserFriendIds = currentUser.friends.map(friend => friend._id.toString());
    const mutualFriends = otherUser.friends.filter(friend => 
      currentUserFriendIds.includes(friend._id.toString())
    );

    res.status(200).json(
      new ApiResponse(200, {
        mutualFriends,
        count: mutualFriends.length
      }, 'Mutual friends retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  handleFriendRequest,
  removeFriend,
  getFriendSuggestions,
  getMutualFriends
};
