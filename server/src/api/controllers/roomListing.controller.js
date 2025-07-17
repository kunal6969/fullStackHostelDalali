const RoomListing = require('../models/roomListing.model');
const User = require('../models/user.model');
const ApiError = require('../../utils/apiError');
const ApiResponse = require('../../utils/apiResponse');
const { LISTING_STATUS } = require('../../utils/constants');

// Get all listings (public endpoint with optional authentication)
const getAllListings = async (req, res, next) => {
  try {
    console.log(`📝 [GET-ALL-LISTINGS] GET /api/rooms - Request started`);
    console.log(`📝 [GET-ALL-LISTINGS] Query parameters:`, req.query);
    console.log(`📝 [GET-ALL-LISTINGS] User authenticated:`, req.user ? `ID: ${req.user._id}, Gender: ${req.user.gender}` : 'No user');

    const { 
      page = 1, 
      limit = 20, 
      hostel, 
      hostelName,
      roomType, 
      minBudget, 
      maxBudget, 
      urgency,
      search
    } = req.query;
    
    console.log(`📝 [GET-ALL-LISTINGS] Filter parameters:`, {
      page, limit, hostel, hostelName, roomType, minBudget, maxBudget, urgency, search
    });

    // Build filter query - Start with active listings only
    const filter = {
      isActive: true,
      availableTill: { $gte: new Date() } // Only show listings that haven't expired
    };

    console.log(`📝 [GET-ALL-LISTINGS] Base filter:`, filter);

    // Apply gender-based filtering if user is authenticated
    if (req.user?.gender) {
      filter.$or = [
        { genderPreference: req.user.gender },
        { genderPreference: 'Mixed' }
      ];
      console.log(`📝 [GET-ALL-LISTINGS] Applied gender filter for: ${req.user.gender}`);
    }

    // Apply hostel name filtering (support both hostel and hostelName parameters)
    const hostelFilter = hostel || hostelName;
    if (hostelFilter) {
      filter['currentRoom.hostelName'] = new RegExp(hostelFilter, 'i');
      console.log(`📝 [GET-ALL-LISTINGS] Applied hostel filter: ${hostelFilter}`);
    }

    // Apply room type filtering
    if (roomType) {
      filter['currentRoom.roomType'] = roomType;
      console.log(`📝 [GET-ALL-LISTINGS] Applied room type filter: ${roomType}`);
    }

    // Apply urgency filtering
    if (urgency) {
      filter.urgency = urgency;
      console.log(`📝 [GET-ALL-LISTINGS] Applied urgency filter: ${urgency}`);
    }

    // Apply budget filtering
    if (minBudget || maxBudget) {
      filter['currentRoom.rent'] = {};
      if (minBudget) filter['currentRoom.rent'].$gte = parseInt(minBudget);
      if (maxBudget) filter['currentRoom.rent'].$lte = parseInt(maxBudget);
      console.log(`📝 [GET-ALL-LISTINGS] Applied budget filter:`, filter['currentRoom.rent']);
    }

    // Apply general search filtering (searches in title, description, hostel name)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { 'currentRoom.hostelName': searchRegex },
          { 'currentRoom.block': searchRegex }
        ]
      });
      console.log(`📝 [GET-ALL-LISTINGS] Applied search filter: "${search}"`);
    }

    console.log(`📝 [GET-ALL-LISTINGS] Final filter object:`, JSON.stringify(filter, null, 2));

    const skip = (parseInt(page) - 1) * parseInt(limit);

    console.log(`📝 [GET-ALL-LISTINGS] Executing database query with pagination: skip=${skip}, limit=${limit}`);

    const listings = await RoomListing.find(filter)
      .populate('listedBy', 'fullName username profilePicture')
      .populate('interestedUsers', 'fullName username')
      .sort({ createdAt: -1, urgency: -1 }) // Latest first, then by urgency
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // Use lean for better performance

    console.log(`📝 [GET-ALL-LISTINGS] Database query completed`);
    console.log(`📝 [GET-ALL-LISTINGS] Found ${listings.length} listings`);
    console.log(`📝 [GET-ALL-LISTINGS] Sample listing data:`, listings.slice(0, 1).map(l => ({
      id: l._id,
      title: l.title,
      hostel: l.currentRoom?.hostelName,
      roomType: l.currentRoom?.roomType,
      createdAt: l.createdAt
    })));

    const totalCount = await RoomListing.countDocuments(filter);
    console.log(`📝 [GET-ALL-LISTINGS] Total count: ${totalCount}`);

    // Increment view count for each listing (async, don't wait)
    if (listings.length > 0) {
      const listingIds = listings.map(listing => listing._id);
      RoomListing.updateMany(
        { _id: { $in: listingIds } },
        { $inc: { views: 1 } }
      ).catch(error => {
        console.log(`⚠️ [GET-ALL-LISTINGS] Failed to update view counts:`, error.message);
      });
    }

    // Log detailed response structure before sending
    if (listings.length > 0) {
      console.log(`📊 [GET-ALL-LISTINGS] Sample response structure:`, JSON.stringify(listings[0], null, 2));
      console.log(`📊 [GET-ALL-LISTINGS] desiredRoom structure:`, JSON.stringify(listings[0].desiredRoom, null, 2));
      console.log(`📊 [GET-ALL-LISTINGS] interestedUsers type:`, Array.isArray(listings[0].interestedUsers), 'length:', listings[0].interestedUsers.length);
    }

    // Return simple array for frontend compatibility
    console.log(`✅ [GET-ALL-LISTINGS] Sending array response with ${listings.length} items`);
    res.status(200).json(listings);
    console.log(`✅ [GET-ALL-LISTINGS] Response sent successfully`);
  } catch (error) {
    console.log(`❌ [GET-ALL-LISTINGS] Error occurred:`, error.message);
    console.log(`❌ [GET-ALL-LISTINGS] Error stack:`, error.stack);
    console.log(`❌ [GET-ALL-LISTINGS] Query that failed:`, req.query);
    next(error);
  }
};

// Get trending listings (top 50 rooms with most interests/requests/bids)
const getTrendingListings = async (req, res, next) => {
  try {
    console.log(`📈 [TRENDING-LISTINGS] GET /api/rooms/trending - Request started`);
    const { page = 1, limit = 50 } = req.query;
    
    console.log(`📈 [TRENDING-LISTINGS] Parameters: page=${page}, limit=${limit}`);
    console.log(`📈 [TRENDING-LISTINGS] User authenticated:`, req.user ? `ID: ${req.user._id}, Gender: ${req.user.gender}` : 'No user');
    
    const filter = {
      isActive: true,
      availableTill: { $gte: new Date() }
    };

    // Apply gender-based filtering if user is authenticated
    if (req.user?.gender) {
      filter.$or = [
        { genderPreference: req.user.gender },
        { genderPreference: 'Mixed' }
      ];
      console.log(`📈 [TRENDING-LISTINGS] Applied gender filter for: ${req.user.gender}`);
    }

    console.log(`📈 [TRENDING-LISTINGS] Filter:`, JSON.stringify(filter, null, 2));

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Aggregate to get trending listings with interest counts, request counts, and views
    const trendingListings = await RoomListing.aggregate([
      // Match active listings
      { $match: filter },
      
      // Lookup match requests for this listing
      {
        $lookup: {
          from: 'matchrequests',
          localField: '_id',
          foreignField: 'listingId',
          as: 'requests'
        }
      },
      
      // Add computed fields for trending score
      {
        $addFields: {
          // Count active requests
          activeRequestsCount: {
            $size: {
              $filter: {
                input: '$requests',
                cond: { $eq: ['$$this.isActive', true] }
              }
            }
          },
          
          // Count approved requests
          approvedRequestsCount: {
            $size: {
              $filter: {
                input: '$requests',
                cond: { $eq: ['$$this.status', 'approved'] }
              }
            }
          },
          
          // Calculate trending score (weighted combination of factors)
          trendingScore: {
            $add: [
              { $multiply: ['$interestCount', 2] },     // Interest count weight: 2
              { $multiply: ['$views', 0.1] },          // Views weight: 0.1
              { $multiply: [                           // Active requests weight: 5
                {
                  $size: {
                    $filter: {
                      input: '$requests',
                      cond: { $eq: ['$$this.isActive', true] }
                    }
                  }
                }, 5
              ]},
              { $multiply: [                           // Approved requests weight: 10
                {
                  $size: {
                    $filter: {
                      input: '$requests',
                      cond: { $eq: ['$$this.status', 'approved'] }
                    }
                  }
                }, 10
              ]}
            ]
          }
        }
      },
      
      // Sort by trending score (highest first), then by creation date
      {
        $sort: {
          trendingScore: -1,
          createdAt: -1
        }
      },
      
      // Apply pagination
      { $skip: skip },
      { $limit: parseInt(limit) },
      
      // Lookup user details
      {
        $lookup: {
          from: 'users',
          localField: 'listedBy',
          foreignField: '_id',
          as: 'listedByUser',
          pipeline: [
            { $project: { fullName: 1, username: 1, profilePicture: 1 } }
          ]
        }
      },
      
      // Lookup interested users
      {
        $lookup: {
          from: 'users',
          localField: 'interestedUsers',
          foreignField: '_id',
          as: 'interestedUsersData',
          pipeline: [
            { $project: { fullName: 1, username: 1, profilePicture: 1 } }
          ]
        }
      },
      
      // Reshape the output
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          currentRoom: 1,
          desiredRoom: 1,
          status: 1,
          urgency: 1,
          availableFrom: 1,
          availableTill: 1,
          roomProofFile: 1,
          interestCount: 1,
          views: 1,
          isActive: 1,
          tags: 1,
          genderPreference: 1,
          createdAt: 1,
          updatedAt: 1,
          listedBy: { $arrayElemAt: ['$listedByUser', 0] },
          interestedUsers: '$interestedUsersData',
          activeRequestsCount: 1,
          approvedRequestsCount: 1,
          trendingScore: 1
        }
      }
    ]);

    console.log(`📈 [TRENDING-LISTINGS] Found ${trendingListings.length} trending listings`);
    
    if (trendingListings.length > 0) {
      console.log(`📈 [TRENDING-LISTINGS] Top listing:`, {
        id: trendingListings[0]._id,
        title: trendingListings[0].title,
        trendingScore: trendingListings[0].trendingScore,
        interestCount: trendingListings[0].interestCount,
        views: trendingListings[0].views,
        activeRequests: trendingListings[0].activeRequestsCount,
        approvedRequests: trendingListings[0].approvedRequestsCount
      });
    }

    // Get total count for pagination
    const totalCountPipeline = [
      { $match: filter },
      { $count: "total" }
    ];
    
    const totalCountResult = await RoomListing.aggregate(totalCountPipeline);
    const totalCount = totalCountResult.length > 0 ? totalCountResult[0].total : 0;

    console.log(`📈 [TRENDING-LISTINGS] Total count: ${totalCount}`);

    // Increment view count for each listing (async, don't wait)
    if (trendingListings.length > 0) {
      const listingIds = trendingListings.map(listing => listing._id);
      RoomListing.updateMany(
        { _id: { $in: listingIds } },
        { $inc: { views: 1 } }
      ).catch(error => {
        console.log(`⚠️ [TRENDING-LISTINGS] Failed to update view counts:`, error.message);
      });
    }

    console.log(`✅ [TRENDING-LISTINGS] Sending response with ${trendingListings.length} items`);
    res.status(200).json(
      new ApiResponse(200, {
        listings: trendingListings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasMore: parseInt(page) * parseInt(limit) < totalCount
        }
      }, 'Trending listings retrieved successfully')
    );
    console.log(`✅ [TRENDING-LISTINGS] Response sent successfully`);
  } catch (error) {
    console.log(`❌ [TRENDING-LISTINGS] Error occurred:`, error.message);
    console.log(`❌ [TRENDING-LISTINGS] Error stack:`, error.stack);
    next(error);
  }
};

// Create new room listing
const createListing = async (req, res, next) => {
  try {
    console.log(`📝 [CREATE-LISTING] POST /api/rooms - Create listing request started`);
    console.log(`📝 [CREATE-LISTING] Request body:`, JSON.stringify(req.body, null, 2));
    console.log(`📝 [CREATE-LISTING] Request file:`, req.file ? `${req.file.filename} (${req.file.size} bytes)` : 'No file uploaded');
    console.log(`📝 [CREATE-LISTING] User:`, req.user ? `${req.user.fullName} (${req.user._id})` : 'No user');

    // Extract frontend data structure
    const {
      roomDetails,
      listingType = 'Exchange',
      description,
      desiredTradeConditions = '',
    } = req.body;

    console.log(`📝 [CREATE-LISTING] Frontend data received:`, {
      roomDetails: roomDetails ? 'PROVIDED' : 'MISSING',
      listingType: listingType || 'NOT PROVIDED',
      description: description ? `"${description.substring(0, 50)}..." (length: ${description.length})` : 'MISSING',
      desiredTradeConditions: desiredTradeConditions ? `"${desiredTradeConditions.substring(0, 30)}..."` : 'NOT PROVIDED',
      fileUploaded: req.file ? 'YES' : 'NO'
    });

    // Parse roomDetails if it's a string (from FormData)
    let parsedRoomDetails;
    if (typeof roomDetails === 'string') {
      try {
        parsedRoomDetails = JSON.parse(roomDetails);
        console.log(`📝 [CREATE-LISTING] Parsed roomDetails from JSON string:`, parsedRoomDetails);
      } catch (parseError) {
        console.log(`❌ [CREATE-LISTING] Failed to parse roomDetails JSON:`, parseError.message);
        throw new ApiError(400, 'Invalid room details format');
      }
    } else {
      parsedRoomDetails = roomDetails;
    }

    console.log(`📝 [CREATE-LISTING] Final parsed room details:`, JSON.stringify(parsedRoomDetails, null, 2));

    // Normalize field names - handle both frontend variations
    const normalizedRoomDetails = {
      hostelName: parsedRoomDetails?.hostelName || parsedRoomDetails?.hostel || '',
      roomNumber: parsedRoomDetails?.roomNumber || '',
      block: parsedRoomDetails?.block || '', 
      roomType: parsedRoomDetails?.roomType || parsedRoomDetails?.type || '',
      floor: parsedRoomDetails?.floor || 1,
      amenities: parsedRoomDetails?.amenities || [],
      rent: parsedRoomDetails?.rent || 0
    };

    console.log(`📝 [CREATE-LISTING] Normalized room details:`, JSON.stringify(normalizedRoomDetails, null, 2));

    // Convert frontend data to backend format using normalized data
    const title = `${normalizedRoomDetails.roomType || 'Room'} in ${normalizedRoomDetails.hostelName || 'Unknown'} - ${listingType}`;
    const currentRoom = {
      hostelName: normalizedRoomDetails.hostelName,
      roomNumber: normalizedRoomDetails.roomNumber,
      block: normalizedRoomDetails.block,
      roomType: normalizedRoomDetails.roomType,
      floor: normalizedRoomDetails.floor,
      rent: normalizedRoomDetails.rent
    };

    // For exchange listings, desiredRoom should match frontend expectations
    const desiredRoom = {
      preferredHostels: [], // User can specify preferences later
      preferredRoomTypes: [],
      preferredFloors: [],
      amenityPreferences: [],
      maxBudget: 0
    };

    // Set reasonable defaults for dates (30 days from now)
    const currentDate = new Date();
    const availableFrom = new Date(currentDate.getTime() + (24 * 60 * 60 * 1000)); // Tomorrow
    const availableTill = new Date(currentDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days from now
    
    const status = listingType === 'Bidding' ? LISTING_STATUS.BIDDING : LISTING_STATUS.OPEN;
    const urgency = 'Medium';
    const tags = [listingType];

    console.log(`📝 [CREATE-LISTING] Converted backend format:`, {
      title,
      currentRoom,
      desiredRoom,
      availableFrom: availableFrom.toISOString(),
      availableTill: availableTill.toISOString(),
      status,
      urgency,
      tags
    });

    // Validate required fields using normalized data
    const missingFields = [];
    if (!description) missingFields.push('description');
    if (!parsedRoomDetails) missingFields.push('roomDetails');
    if (!normalizedRoomDetails.hostelName) missingFields.push('roomDetails.hostelName');
    if (!normalizedRoomDetails.roomNumber) missingFields.push('roomDetails.roomNumber');
    if (!normalizedRoomDetails.block) missingFields.push('roomDetails.block');
    if (!normalizedRoomDetails.roomType) missingFields.push('roomDetails.roomType');

    console.log(`📝 [CREATE-LISTING] Field validation check:`, {
      description: description ? 'PROVIDED' : 'MISSING',
      hostelName: normalizedRoomDetails.hostelName ? 'PROVIDED' : 'MISSING',
      roomNumber: normalizedRoomDetails.roomNumber ? 'PROVIDED' : 'MISSING', 
      block: normalizedRoomDetails.block ? 'PROVIDED' : 'MISSING',
      roomType: normalizedRoomDetails.roomType ? 'PROVIDED' : 'MISSING',
      missingFields
    });

    if (missingFields.length > 0) {
      console.log(`❌ [CREATE-LISTING] Missing required fields:`, missingFields);
      throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
    }

    console.log(`✅ [CREATE-LISTING] All required frontend fields validation passed`);

    // Validate file upload (room proof)
    if (!req.file) {
      console.log(`❌ [CREATE-LISTING] No file uploaded for room proof`);
      throw new ApiError(400, 'Room proof file is required');
    }

    console.log(`✅ [CREATE-LISTING] File upload validation passed: ${req.file.filename}`);

    // Check if user already has an active listing
    console.log(`📝 [CREATE-LISTING] Checking for existing active listings...`);
    const existingListing = await RoomListing.findOne({
      listedBy: req.user._id,
      isActive: true,
      status: { $in: [LISTING_STATUS.OPEN, LISTING_STATUS.BIDDING] }
    });

    if (existingListing) {
      console.log(`❌ [CREATE-LISTING] User already has active listing: ${existingListing._id}`);
      throw new ApiError(409, 'You already have an active listing. Please close it before creating a new one.');
    }

    console.log(`✅ [CREATE-LISTING] No existing active listings found`);

    // Create new listing with converted data
    console.log(`📝 [CREATE-LISTING] Creating new listing object...`);
    const newListing = new RoomListing({
      title: title.trim(),
      description: description.trim(),
      listedBy: req.user._id,
      currentRoom,
      desiredRoom,
      status,
      urgency,
      availableFrom,
      availableTill,
      roomProofFile: `/uploads/${req.file.filename}`,
      tags,
      genderPreference: req.user.gender
    });

    console.log(`📝 [CREATE-LISTING] Listing object created, saving to database...`);
    await newListing.save();
    console.log(`✅ [CREATE-LISTING] Listing saved successfully: ${newListing._id}`);

    // Populate the listing with user details
    console.log(`📝 [CREATE-LISTING] Populating user details...`);
    await newListing.populate('listedBy', 'fullName username profilePicture');

    console.log(`✅ [CREATE-LISTING] Listing created successfully for user: ${req.user.fullName}`);
    res.status(201).json(
      new ApiResponse(201, newListing, 'Listing created successfully')
    );
    console.log(`✅ [CREATE-LISTING] Response sent successfully`);
  } catch (error) {
    console.log(`❌ [CREATE-LISTING] Error occurred:`, error.message);
    console.log(`❌ [CREATE-LISTING] Error stack:`, error.stack);
    console.log(`❌ [CREATE-LISTING] Request body that caused error:`, JSON.stringify(req.body, null, 2));
    console.log(`❌ [CREATE-LISTING] File info:`, req.file ? req.file.filename : 'No file');
    next(error);
  }
};

// Toggle interest in a listing
const toggleInterest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const listing = await RoomListing.findById(id);
    if (!listing) {
      throw new ApiError(404, 'Listing not found');
    }

    // Check if listing is active and not expired
    if (!listing.isActive || listing.availableTill < new Date()) {
      throw new ApiError(400, 'Cannot show interest in inactive or expired listing');
    }

    // Check if user is trying to show interest in their own listing
    if (listing.listedBy.toString() === userId.toString()) {
      throw new ApiError(400, 'Cannot show interest in your own listing');
    }

    // Check if listing allows current user's gender
    const user = await User.findById(userId);
    if (listing.genderPreference !== user.gender) {
      throw new ApiError(403, 'This listing is not available for your gender');
    }

    // Toggle interest
    const isInterested = listing.interestedUsers.includes(userId);
    
    if (isInterested) {
      // Remove interest
      listing.interestedUsers.pull(userId);
    } else {
      // Add interest
      listing.interestedUsers.push(userId);
      
      // If this is a bidding listing and reaches a threshold, you might want to notify the owner
      // TODO: Add notification logic here
    }

    await listing.save();

    // Return updated listing with populated data
    await listing.populate([
      { path: 'listedBy', select: 'fullName username profilePicture' },
      { path: 'interestedUsers', select: 'fullName username' }
    ]);

    res.status(200).json(
      new ApiResponse(200, {
        listing,
        isInterested: !isInterested,
        interestCount: listing.interestedUsers.length
      }, `Interest ${isInterested ? 'removed from' : 'added to'} listing`)
    );
  } catch (error) {
    next(error);
  }
};

// Get listing by ID
const getListingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const listing = await RoomListing.findById(id)
      .populate('listedBy', 'fullName username profilePicture phoneNumber')
      .populate('interestedUsers', 'fullName username profilePicture');

    if (!listing) {
      throw new ApiError(404, 'Listing not found');
    }

    // Increment view count
    listing.views += 1;
    await listing.save();

    // Check if current user has shown interest (if authenticated)
    let userInterest = false;
    if (req.user) {
      userInterest = listing.interestedUsers.some(user => 
        user._id.toString() === req.user._id.toString()
      );
    }

    res.status(200).json(
      new ApiResponse(200, {
        listing,
        userInterest
      }, 'Listing retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Update listing (only by owner)
const updateListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      desiredRoom,
      status,
      urgency,
      availableTill,
      tags
    } = req.body;

    const listing = await RoomListing.findById(id);
    if (!listing) {
      throw new ApiError(404, 'Listing not found');
    }

    // Check if user is the owner
    if (listing.listedBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You can only update your own listings');
    }

    // Build update object
    const updateData = {};
    
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (desiredRoom !== undefined) updateData.desiredRoom = desiredRoom;
    if (status !== undefined) updateData.status = status;
    if (urgency !== undefined) updateData.urgency = urgency;
    if (tags !== undefined) updateData.tags = tags.filter(tag => tag.trim()).map(tag => tag.trim());
    
    if (availableTill !== undefined) {
      const tillDate = new Date(availableTill);
      if (tillDate <= new Date()) {
        throw new ApiError(400, 'Available till date must be in the future');
      }
      updateData.availableTill = tillDate;
    }

    const updatedListing = await RoomListing.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('listedBy', 'fullName username profilePicture');

    res.status(200).json(
      new ApiResponse(200, updatedListing, 'Listing updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Delete listing (only by owner)
const deleteListing = async (req, res, next) => {
  try {
    const { id } = req.params;

    const listing = await RoomListing.findById(id);
    if (!listing) {
      throw new ApiError(404, 'Listing not found');
    }

    // Check if user is the owner
    if (listing.listedBy.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You can only delete your own listings');
    }

    // Soft delete by setting isActive to false
    listing.isActive = false;
    await listing.save();

    res.status(200).json(
      new ApiResponse(200, null, 'Listing deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Get user's own listings
const getMyListings = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const filter = {
      listedBy: req.user._id,
      isActive: true
    };

    if (status) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const listings = await RoomListing.find(filter)
      .populate('interestedUsers', 'fullName username profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await RoomListing.countDocuments(filter);

    res.status(200).json(
      new ApiResponse(200, {
        listings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasMore: parseInt(page) * parseInt(limit) < totalCount
        }
      }, 'Your listings retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllListings,
  getTrendingListings,
  createListing,
  toggleInterest,
  getListingById,
  updateListing,
  deleteListing,
  getMyListings
};
