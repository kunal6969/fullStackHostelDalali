const MatchRequest = require('../models/matchRequest.model');
const RoomListing = require('../models/roomListing.model');
const User = require('../models/user.model');
const ApiError = require('../../utils/apiError');
const ApiResponse = require('../../utils/apiResponse');
const { REQUEST_STATUS } = require('../../utils/constants');
const { emitToUser } = require('../../config/socket');

// Get all match requests for the current user
const getMatchRequests = async (req, res, next) => {
  try {
    console.log(`📝 [MATCH-REQUESTS] GET /api/match-requests - Request started`);
    const { page = 1, limit = 20, type = 'all', status } = req.query;
    const userId = req.user._id;
    
    console.log(`📝 [MATCH-REQUESTS] Query parameters:`, { page, limit, type, status });
    console.log(`📝 [MATCH-REQUESTS] User ID: ${userId}`);

    // Build filter based on type
    let filter = {};
    
    if (type === 'sent') {
      filter.requesterId = userId;
      console.log(`📝 [MATCH-REQUESTS] Filter type: SENT - Getting requests sent by user`);
    } else if (type === 'received') {
      console.log(`📝 [MATCH-REQUESTS] Filter type: RECEIVED - Finding user listings...`);
      // Get listings owned by current user
      const userListings = await RoomListing.find({ listedBy: userId }).select('_id');
      const listingIds = userListings.map(listing => listing._id);
      console.log(`📝 [MATCH-REQUESTS] Found ${userListings.length} user listings:`, listingIds);
      
      filter = {
        listingId: { $in: listingIds },
        requesterId: { $ne: userId }
      };
      console.log(`📝 [MATCH-REQUESTS] Filter for received requests created`);
    } else {
      console.log(`📝 [MATCH-REQUESTS] Filter type: ALL - Finding user listings for comprehensive filter...`);
      // All requests (sent + received)
      const userListings = await RoomListing.find({ listedBy: userId }).select('_id');
      const listingIds = userListings.map(listing => listing._id);
      console.log(`📝 [MATCH-REQUESTS] Found ${userListings.length} user listings for all filter`);
      
      filter = {
        $or: [
          { requesterId: userId },
          { 
            listingId: { $in: listingIds },
            requesterId: { $ne: userId }
          }
        ]
      };
      console.log(`📝 [MATCH-REQUESTS] Filter for all requests created`);
    }

    // Add status filter if provided
    if (status) {
      filter.status = status;
      console.log(`📝 [MATCH-REQUESTS] Added status filter: ${status}`);
    }

    // Only show active requests
    filter.isActive = true;
    console.log(`📝 [MATCH-REQUESTS] Final filter:`, JSON.stringify(filter, null, 2));

    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log(`📝 [MATCH-REQUESTS] Pagination: page ${page}, limit ${limit}, skip ${skip}`);

    console.log(`📝 [MATCH-REQUESTS] Executing database query...`);
    const requests = await MatchRequest.find(filter)
      .populate('requesterId', 'fullName username profilePicture currentRoom')
      .populate('listingId', 'title currentRoom desiredRoom listedBy status')
      .populate('listingId.listedBy', 'fullName username')
      .populate('approvals.userId', 'fullName username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`📝 [MATCH-REQUESTS] Found ${requests.length} requests`);

    const totalCount = await MatchRequest.countDocuments(filter);
    console.log(`📝 [MATCH-REQUESTS] Total count: ${totalCount}`);

    // Add additional info for each request
    console.log(`📝 [MATCH-REQUESTS] Enriching requests with user context...`);
    const enrichedRequests = requests.map(request => {
      const requestObj = request.toObject();
      
      // Determine if current user is requester or listing owner
      requestObj.isRequester = request.requesterId._id.toString() === userId.toString();
      requestObj.isListingOwner = request.listingId.listedBy.toString() === userId.toString();
      
      return requestObj;
    });
    console.log(`📝 [MATCH-REQUESTS] Enriched ${enrichedRequests.length} requests`);

    const responseData = {
      requests: enrichedRequests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasMore: parseInt(page) * parseInt(limit) < totalCount
      }
    };

    console.log(`✅ [MATCH-REQUESTS] Sending response with ${enrichedRequests.length} requests`);
    res.status(200).json(
      new ApiResponse(200, responseData, 'Match requests retrieved successfully')
    );
    console.log(`✅ [MATCH-REQUESTS] Response sent successfully`);
  } catch (error) {
    console.log(`❌ [MATCH-REQUESTS] Error occurred:`, error.message);
    console.log(`❌ [MATCH-REQUESTS] Error stack:`, error.stack);
    console.log(`❌ [MATCH-REQUESTS] User ID:`, req.user?._id);
    console.log(`❌ [MATCH-REQUESTS] Query:`, req.query);
    next(error);
  }
};

// Create a new match request
const createMatchRequest = async (req, res, next) => {
  try {
    console.log(`📝 [CREATE-MATCH-REQUEST] POST /api/match-requests - Request started`);
    const { listingId, message } = req.body;
    const requesterId = req.user._id;

    console.log(`📝 [CREATE-MATCH-REQUEST] Request data:`, { 
      listingId, 
      messageLength: message?.length, 
      requesterId 
    });

    // Validate required fields
    if (!listingId || !message) {
      console.log(`❌ [CREATE-MATCH-REQUEST] Validation failed: Missing required fields`);
      throw new ApiError(400, 'Listing ID and message are required');
    }

    if (message.trim().length < 10) {
      console.log(`❌ [CREATE-MATCH-REQUEST] Validation failed: Message too short (${message.trim().length} chars)`);
      throw new ApiError(400, 'Message must be at least 10 characters long');
    }
    console.log(`✅ [CREATE-MATCH-REQUEST] Basic validation passed`);

    // Check if listing exists and is active
    console.log(`📝 [CREATE-MATCH-REQUEST] Finding listing: ${listingId}`);
    const listing = await RoomListing.findById(listingId)
      .populate('listedBy', 'fullName username');
      
    if (!listing) {
      console.log(`❌ [CREATE-MATCH-REQUEST] Listing not found: ${listingId}`);
      throw new ApiError(404, 'Listing not found');
    }

    console.log(`📝 [CREATE-MATCH-REQUEST] Found listing: ${listing.title} by ${listing.listedBy.fullName}`);
    console.log(`📝 [CREATE-MATCH-REQUEST] Listing status: active=${listing.isActive}, availableTill=${listing.availableTill}`);

    if (!listing.isActive || listing.availableTill < new Date()) {
      console.log(`❌ [CREATE-MATCH-REQUEST] Listing is inactive or expired`);
      throw new ApiError(400, 'Cannot request inactive or expired listing');
    }

    // Check if user is trying to request their own listing
    if (listing.listedBy._id.toString() === requesterId.toString()) {
      console.log(`❌ [CREATE-MATCH-REQUEST] User trying to request own listing`);
      throw new ApiError(400, 'Cannot request your own listing');
    }
    console.log(`✅ [CREATE-MATCH-REQUEST] Ownership check passed`);

    // Check if user has already made a request for this listing
    console.log(`📝 [CREATE-MATCH-REQUEST] Checking for existing requests...`);
    const existingRequest = await MatchRequest.findOne({
      requesterId,
      listingId,
      isActive: true
    });

    if (existingRequest) {
      console.log(`❌ [CREATE-MATCH-REQUEST] Duplicate request found: ${existingRequest._id}`);
      throw new ApiError(409, 'You have already sent a request for this listing');
    }
    console.log(`✅ [CREATE-MATCH-REQUEST] No existing request found`);

    // Check gender compatibility
    console.log(`📝 [CREATE-MATCH-REQUEST] Checking gender compatibility...`);
    const requester = await User.findById(requesterId);
    console.log(`📝 [CREATE-MATCH-REQUEST] Requester gender: ${requester.gender}, Listing preference: ${listing.genderPreference}`);
    
    if (listing.genderPreference !== requester.gender && listing.genderPreference !== 'Mixed') {
      console.log(`❌ [CREATE-MATCH-REQUEST] Gender preference mismatch`);
      throw new ApiError(403, 'Gender preference mismatch');
    }
    console.log(`✅ [CREATE-MATCH-REQUEST] Gender compatibility confirmed`);

    // Create new match request
    console.log(`📝 [CREATE-MATCH-REQUEST] Creating match request...`);
    const matchRequest = new MatchRequest({
      requesterId,
      listingId,
      message: message.trim(),
      status: REQUEST_STATUS.PENDING
    });

    await matchRequest.save();
    console.log(`✅ [CREATE-MATCH-REQUEST] Match request created: ${matchRequest._id}`);

    // Populate the request
    await matchRequest.populate([
      { path: 'requesterId', select: 'fullName username profilePicture currentRoom' },
      { path: 'listingId', select: 'title currentRoom desiredRoom listedBy' }
    ]);

    // Send real-time notification to listing owner
    emitToUser(listing.listedBy._id.toString(), 'newMatchRequest', {
      request: matchRequest,
      message: `New match request from ${requester.fullName}`
    });

    res.status(201).json(
      new ApiResponse(201, matchRequest, 'Match request created successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Update match request status
const updateMatchRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, responseMessage } = req.body;
    const userId = req.user._id;

    // Validate status
    const validStatuses = Object.values(REQUEST_STATUS);
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }

    const matchRequest = await MatchRequest.findById(id)
      .populate('requesterId', 'fullName username')
      .populate('listingId', 'title listedBy');

    if (!matchRequest) {
      throw new ApiError(404, 'Match request not found');
    }

    // Check if user has permission to update this request
    const isRequester = matchRequest.requesterId._id.toString() === userId.toString();
    const isListingOwner = matchRequest.listingId.listedBy.toString() === userId.toString();

    if (!isRequester && !isListingOwner) {
      throw new ApiError(403, 'You do not have permission to update this request');
    }

    // Validate status transitions
    if (isRequester && ![REQUEST_STATUS.WITHDRAWN].includes(status)) {
      throw new ApiError(400, 'Requesters can only withdraw their requests');
    }

    if (isListingOwner && ![REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.REJECTED].includes(status)) {
      throw new ApiError(400, 'Listing owners can only accept or reject requests');
    }

    // Update request
    matchRequest.status = status;
    if (responseMessage) {
      matchRequest.responseMessage = responseMessage.trim();
    }
    matchRequest.respondedAt = new Date();

    await matchRequest.save();

    // Send real-time notification
    const notificationTarget = isRequester ? matchRequest.listingId.listedBy : matchRequest.requesterId._id;
    const notificationMessage = isRequester 
      ? `Match request withdrawn by ${matchRequest.requesterId.fullName}`
      : `Match request ${status.toLowerCase()} by listing owner`;

    emitToUser(notificationTarget.toString(), 'requestStatusUpdate', {
      requestId: matchRequest._id,
      status,
      message: notificationMessage
    });

    res.status(200).json(
      new ApiResponse(200, matchRequest, 'Match request updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Handle final deal approval
const approveDeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approved, comments, swapDetails } = req.body;
    const userId = req.user._id;

    if (typeof approved !== 'boolean') {
      throw new ApiError(400, 'Approval status is required (true/false)');
    }

    const matchRequest = await MatchRequest.findById(id)
      .populate('requesterId', 'fullName username currentRoom')
      .populate('listingId', 'title listedBy currentRoom');

    if (!matchRequest) {
      throw new ApiError(404, 'Match request not found');
    }

    // Check if request is in accepted status
    if (matchRequest.status !== REQUEST_STATUS.ACCEPTED) {
      throw new ApiError(400, 'Can only approve accepted requests');
    }

    // Check if user is involved in this request
    const isRequester = matchRequest.requesterId._id.toString() === userId.toString();
    const isListingOwner = matchRequest.listingId.listedBy.toString() === userId.toString();

    if (!isRequester && !isListingOwner) {
      throw new ApiError(403, 'You are not involved in this request');
    }

    // Add or update approval
    await matchRequest.addApproval(userId, approved, comments);

    // Check if both parties have approved
    const requesterApproval = matchRequest.approvals.find(approval => 
      approval.userId.toString() === matchRequest.requesterId._id.toString()
    );
    
    const ownerApproval = matchRequest.approvals.find(approval => 
      approval.userId.toString() === matchRequest.listingId.listedBy.toString()
    );

    let dealStatus = 'pending';
    let message = 'Approval recorded';

    // If both have approved, initiate the room swap
    if (requesterApproval?.approved && ownerApproval?.approved) {
      // Update swap details
      if (swapDetails) {
        matchRequest.swapDetails = {
          ...matchRequest.swapDetails,
          ...swapDetails,
          scheduledDate: swapDetails.scheduledDate ? new Date(swapDetails.scheduledDate) : undefined
        };
      }

      dealStatus = 'approved';
      message = 'Deal approved by both parties! Room swap can proceed.';

      // TODO: Here you might want to:
      // 1. Update user room assignments
      // 2. Close the listing
      // 3. Send confirmation emails
      // 4. Create swap records
      
      // For now, we'll mark the listing as closed
      await RoomListing.findByIdAndUpdate(matchRequest.listingId._id, {
        status: 'Closed',
        isActive: false
      });

      // Send notifications to both parties
      emitToUser(matchRequest.requesterId._id.toString(), 'dealApproved', {
        requestId: matchRequest._id,
        message: 'Your room swap deal has been approved!'
      });

      emitToUser(matchRequest.listingId.listedBy.toString(), 'dealApproved', {
        requestId: matchRequest._id,
        message: 'Your room swap deal has been approved!'
      });

    } else if ((requesterApproval && !requesterApproval.approved) || 
               (ownerApproval && !ownerApproval.approved)) {
      dealStatus = 'rejected';
      message = 'Deal rejected by one of the parties';
      
      // Update request status
      matchRequest.status = REQUEST_STATUS.REJECTED;
    }

    await matchRequest.save();

    res.status(200).json(
      new ApiResponse(200, {
        request: matchRequest,
        dealStatus,
        approvals: matchRequest.approvals
      }, message)
    );
  } catch (error) {
    next(error);
  }
};

// Get match request by ID
const getMatchRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const matchRequest = await MatchRequest.findById(id)
      .populate('requesterId', 'fullName username profilePicture currentRoom')
      .populate('listingId', 'title currentRoom desiredRoom listedBy')
      .populate('listingId.listedBy', 'fullName username')
      .populate('approvals.userId', 'fullName username');

    if (!matchRequest) {
      throw new ApiError(404, 'Match request not found');
    }

    // Check if user has permission to view this request
    const isRequester = matchRequest.requesterId._id.toString() === userId.toString();
    const isListingOwner = matchRequest.listingId.listedBy.toString() === userId.toString();

    if (!isRequester && !isListingOwner) {
      throw new ApiError(403, 'You do not have permission to view this request');
    }

    // Add additional info
    const requestObj = matchRequest.toObject();
    requestObj.isRequester = isRequester;
    requestObj.isListingOwner = isListingOwner;

    res.status(200).json(
      new ApiResponse(200, requestObj, 'Match request retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Get swap history for user
const getSwapHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    // Get user's listings to find completed swaps
    const userListings = await RoomListing.find({ listedBy: userId }).select('_id');
    const listingIds = userListings.map(listing => listing._id);

    const filter = {
      $or: [
        { requesterId: userId },
        { listingId: { $in: listingIds } }
      ],
      'swapDetails.completed': true
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const completedSwaps = await MatchRequest.find(filter)
      .populate('requesterId', 'fullName username profilePicture')
      .populate('listingId', 'title currentRoom listedBy')
      .populate('listingId.listedBy', 'fullName username')
      .sort({ 'swapDetails.completedAt': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await MatchRequest.countDocuments(filter);

    res.status(200).json(
      new ApiResponse(200, {
        swaps: completedSwaps,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasMore: parseInt(page) * parseInt(limit) < totalCount
        }
      }, 'Swap history retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Get room exchange dashboard stats
const getRoomExchangeDashboard = async (req, res, next) => {
  try {
    console.log(`📊 [EXCHANGE-DASHBOARD] GET /api/match-requests/dashboard - Request started`);
    const userId = req.user._id;
    console.log(`📊 [EXCHANGE-DASHBOARD] User ID: ${userId}`);

    // Get user's listings to find received requests
    console.log(`📊 [EXCHANGE-DASHBOARD] Finding user listings...`);
    const userListings = await RoomListing.find({ listedBy: userId, isActive: true }).select('_id title');
    const listingIds = userListings.map(listing => listing._id);
    console.log(`📊 [EXCHANGE-DASHBOARD] Found ${userListings.length} active listings`);

    // Parallel queries for dashboard stats
    const [
      sentRequestsStats,
      receivedRequestsStats,
      approvedExchangesCount,
      recentActivity
    ] = await Promise.all([
      // Sent requests stats
      MatchRequest.aggregate([
        { $match: { requesterId: userId, isActive: true } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // Received requests stats  
      MatchRequest.aggregate([
        { 
          $match: { 
            listingId: { $in: listingIds }, 
            requesterId: { $ne: userId },
            isActive: true 
          } 
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // Count approved exchanges (both users must approve)
      MatchRequest.countDocuments({
        $or: [
          { requesterId: userId },
          { listingId: { $in: listingIds }, requesterId: { $ne: userId } }
        ],
        status: 'approved',
        'swapDetails.completed': true,
        isActive: true
      }),

      // Recent activity (last 10 requests)
      MatchRequest.find({
        $or: [
          { requesterId: userId },
          { listingId: { $in: listingIds }, requesterId: { $ne: userId } }
        ],
        isActive: true
      })
      .populate('requesterId', 'fullName username profilePicture')
      .populate('listingId', 'title currentRoom listedBy')
      .populate('listingId.listedBy', 'fullName username')
      .sort({ updatedAt: -1 })
      .limit(10)
    ]);

    console.log(`📊 [EXCHANGE-DASHBOARD] Aggregation queries completed`);

    // Process sent requests stats
    const sentStats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };

    sentRequestsStats.forEach(stat => {
      sentStats.total += stat.count;
      sentStats[stat._id] = stat.count;
    });

    // Process received requests stats
    const receivedStats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };

    receivedRequestsStats.forEach(stat => {
      receivedStats.total += stat.count;
      receivedStats[stat._id] = stat.count;
    });

    // Enrich recent activity with context
    const enrichedActivity = recentActivity.map(request => {
      const activity = request.toObject();
      activity.isRequester = request.requesterId._id.toString() === userId.toString();
      activity.isListingOwner = request.listingId.listedBy._id.toString() === userId.toString();
      activity.actionType = activity.isRequester ? 'sent' : 'received';
      return activity;
    });

    const dashboardData = {
      sentRequests: sentStats,
      receivedRequests: receivedStats,
      approvedExchanges: approvedExchangesCount,
      totalActiveListings: userListings.length,
      recentActivity: enrichedActivity,
      summary: {
        totalRequestsSent: sentStats.total,
        totalRequestsReceived: receivedStats.total,
        totalApprovedExchanges: approvedExchangesCount,
        pendingAction: receivedStats.pending + sentStats.pending
      }
    };

    console.log(`📊 [EXCHANGE-DASHBOARD] Dashboard stats:`, {
      sentTotal: sentStats.total,
      receivedTotal: receivedStats.total,
      approvedExchanges: approvedExchangesCount,
      activeListings: userListings.length,
      recentActivityCount: enrichedActivity.length
    });

    console.log(`✅ [EXCHANGE-DASHBOARD] Sending dashboard response`);
    res.status(200).json(
      new ApiResponse(200, dashboardData, 'Exchange dashboard retrieved successfully')
    );
    console.log(`✅ [EXCHANGE-DASHBOARD] Response sent successfully`);
  } catch (error) {
    console.log(`❌ [EXCHANGE-DASHBOARD] Error occurred:`, error.message);
    console.log(`❌ [EXCHANGE-DASHBOARD] Error stack:`, error.stack);
    next(error);
  }
};

// Approve/reject a match request with automatic room swap
const approveExchangeRequest = async (req, res, next) => {
  try {
    console.log(`🤝 [APPROVE-EXCHANGE] POST /api/match-requests/:id/approve - Request started`);
    const { id } = req.params;
    const { approved, comments = '' } = req.body;
    const userId = req.user._id;

    console.log(`🤝 [APPROVE-EXCHANGE] Request data:`, { 
      requestId: id, 
      approved, 
      comments: comments?.substring(0, 50), 
      userId 
    });

    // Validate input
    if (typeof approved !== 'boolean') {
      console.log(`❌ [APPROVE-EXCHANGE] Invalid approval value: ${approved}`);
      throw new ApiError(400, 'Approval status must be true or false');
    }

    // Find the match request
    console.log(`🤝 [APPROVE-EXCHANGE] Finding match request: ${id}`);
    const matchRequest = await MatchRequest.findById(id)
      .populate('requesterId', 'fullName username currentRoom')
      .populate('listingId', 'title currentRoom listedBy')
      .populate('listingId.listedBy', 'fullName username currentRoom');

    if (!matchRequest) {
      console.log(`❌ [APPROVE-EXCHANGE] Match request not found: ${id}`);
      throw new ApiError(404, 'Match request not found');
    }

    console.log(`🤝 [APPROVE-EXCHANGE] Found request: ${matchRequest.requesterId.fullName} -> ${matchRequest.listingId.title}`);

    // Check if user is authorized (either requester or listing owner)
    const isRequester = matchRequest.requesterId._id.toString() === userId.toString();
    const isListingOwner = matchRequest.listingId.listedBy._id.toString() === userId.toString();

    if (!isRequester && !isListingOwner) {
      console.log(`❌ [APPROVE-EXCHANGE] Unauthorized user: ${userId}`);
      throw new ApiError(403, 'You are not authorized to approve this request');
    }

    console.log(`🤝 [APPROVE-EXCHANGE] User role: ${isRequester ? 'requester' : 'listing owner'}`);

    // Add approval
    console.log(`🤝 [APPROVE-EXCHANGE] Adding approval: approved=${approved}`);
    await matchRequest.addApproval(userId, approved, comments);

    // Reload the request to get updated approvals
    await matchRequest.populate('approvals.userId', 'fullName username');

    console.log(`🤝 [APPROVE-EXCHANGE] Approval added. Current approvals: ${matchRequest.approvals.length}`);

    // Check if both parties have approved
    const requesterApproval = matchRequest.approvals.find(
      approval => approval.userId._id.toString() === matchRequest.requesterId._id.toString()
    );
    const ownerApproval = matchRequest.approvals.find(
      approval => approval.userId._id.toString() === matchRequest.listingId.listedBy._id.toString()
    );

    console.log(`🤝 [APPROVE-EXCHANGE] Approval status:`, {
      requesterApproved: requesterApproval?.approved,
      ownerApproved: ownerApproval?.approved
    });

    let swapCompleted = false;

    // If both approved, complete the exchange and swap room details
    if (requesterApproval?.approved && ownerApproval?.approved) {
      console.log(`🎉 [APPROVE-EXCHANGE] Both parties approved! Initiating room swap...`);
      
      try {
        // Get current room details
        const requesterUser = await User.findById(matchRequest.requesterId._id);
        const ownerUser = await User.findById(matchRequest.listingId.listedBy._id);

        console.log(`🤝 [APPROVE-EXCHANGE] Current rooms:`, {
          requester: requesterUser.currentRoom?.hostelName,
          owner: ownerUser.currentRoom?.hostelName
        });

        // Swap room details
        const tempRoom = requesterUser.currentRoom;
        requesterUser.currentRoom = ownerUser.currentRoom;
        ownerUser.currentRoom = tempRoom;

        // Save both users
        await Promise.all([
          requesterUser.save(),
          ownerUser.save()
        ]);

        // Update match request status
        matchRequest.status = 'approved';
        matchRequest.swapDetails = {
          ...matchRequest.swapDetails,
          completed: true,
          completedAt: new Date()
        };

        console.log(`✅ [APPROVE-EXCHANGE] Room swap completed successfully`);
        swapCompleted = true;

        // Emit real-time notifications
        emitToUser(matchRequest.requesterId._id, 'exchangeCompleted', {
          requestId: matchRequest._id,
          message: `Your room exchange with ${ownerUser.fullName} has been completed!`,
          newRoom: requesterUser.currentRoom
        });

        emitToUser(matchRequest.listingId.listedBy._id, 'exchangeCompleted', {
          requestId: matchRequest._id,
          message: `Your room exchange with ${requesterUser.fullName} has been completed!`,
          newRoom: ownerUser.currentRoom
        });

      } catch (swapError) {
        console.log(`❌ [APPROVE-EXCHANGE] Room swap failed:`, swapError.message);
        // Don't fail the approval, just log the error
        matchRequest.status = 'approved';
      }
    } else if (matchRequest.approvals.some(approval => !approval.approved)) {
      // If anyone rejected, mark as rejected
      matchRequest.status = 'rejected';
      console.log(`❌ [APPROVE-EXCHANGE] Request rejected`);
    } else {
      // Still waiting for other party
      matchRequest.status = 'pending';
      console.log(`⏳ [APPROVE-EXCHANGE] Waiting for other party approval`);
    }

    await matchRequest.save();

    // Send notifications
    const otherUserId = isRequester ? matchRequest.listingId.listedBy._id : matchRequest.requesterId._id;
    const currentUserName = req.user.fullName;
    
    if (approved) {
      emitToUser(otherUserId, 'requestApproved', {
        requestId: matchRequest._id,
        message: `${currentUserName} approved your room exchange request!`,
        swapCompleted
      });
    } else {
      emitToUser(otherUserId, 'requestRejected', {
        requestId: matchRequest._id,
        message: `${currentUserName} rejected your room exchange request.`
      });
    }

    const responseMessage = approved 
      ? (swapCompleted ? 'Request approved and room swap completed!' : 'Request approved successfully')
      : 'Request rejected successfully';

    console.log(`✅ [APPROVE-EXCHANGE] ${responseMessage}`);
    res.status(200).json(
      new ApiResponse(200, {
        matchRequest: matchRequest.toObject(),
        swapCompleted
      }, responseMessage)
    );
    console.log(`✅ [APPROVE-EXCHANGE] Response sent successfully`);
  } catch (error) {
    console.log(`❌ [APPROVE-EXCHANGE] Error occurred:`, error.message);
    console.log(`❌ [APPROVE-EXCHANGE] Error stack:`, error.stack);
    next(error);
  }
};

module.exports = {
  getMatchRequests,
  createMatchRequest,
  updateMatchRequest,
  approveDeal,
  getMatchRequestById,
  getSwapHistory,
  getRoomExchangeDashboard,
  approveExchangeRequest
};
