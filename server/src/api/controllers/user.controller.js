const User = require('../models/user.model');
const ApiError = require('../../utils/apiError');
const ApiResponse = require('../../utils/apiResponse');
const { uploadSingle } = require('../../middleware/upload.middleware');

// Search users by username/email
const searchUsers = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      throw new ApiError(400, 'Search query must be at least 2 characters long');
    }

    const searchRegex = new RegExp(q.trim(), 'i');
    
    // Build search query
    const searchQuery = {
      $and: [
        {
          $or: [
            { username: searchRegex },
            { fullName: searchRegex },
            { email: searchRegex }
          ]
        },
        { isActive: true },
        { _id: { $ne: req.user._id } } // Exclude current user
      ]
    };

    const users = await User.find(searchQuery)
      .select('fullName username email profilePicture bio')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ fullName: 1 });

    const totalCount = await User.countDocuments(searchQuery);

    res.status(200).json(
      new ApiResponse(200, {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasMore: parseInt(page) * parseInt(limit) < totalCount
        }
      }, 'Users retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Update user details
const updateUserDetails = async (req, res, next) => {
  try {
    const { fullName, phoneNumber, bio, username } = req.body;
    const userId = req.user._id;

    // Build update object with only provided fields
    const updateData = {};
    
    if (fullName !== undefined) {
      if (!fullName.trim()) {
        throw new ApiError(400, 'Full name cannot be empty');
      }
      updateData.fullName = fullName.trim();
    }
    
    if (phoneNumber !== undefined) {
      updateData.phoneNumber = phoneNumber.trim();
    }
    
    if (bio !== undefined) {
      if (bio.length > 500) {
        throw new ApiError(400, 'Bio cannot exceed 500 characters');
      }
      updateData.bio = bio.trim();
    }
    
    if (username !== undefined) {
      if (username.trim().length < 3) {
        throw new ApiError(400, 'Username must be at least 3 characters long');
      }
      
      // Check if username is already taken
      const existingUser = await User.findOne({ 
        username: username.trim(),
        _id: { $ne: userId }
      });
      
      if (existingUser) {
        throw new ApiError(409, 'Username is already taken');
      }
      
      updateData.username = username.trim();
    }

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, 'No valid fields provided for update');
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      throw new ApiError(404, 'User not found');
    }

    res.status(200).json(
      new ApiResponse(200, updatedUser, 'User details updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Update user preferences
const updateUserPreferences = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { exchangePreferences } = req.body;

    if (!exchangePreferences) {
      throw new ApiError(400, 'Exchange preferences are required');
    }

    // Validate preference fields
    const validatedPreferences = {};
    
    if (exchangePreferences.preferredHostels) {
      validatedPreferences.preferredHostels = exchangePreferences.preferredHostels;
    }
    
    if (exchangePreferences.preferredRoomTypes) {
      const validRoomTypes = ['Single', 'Double', 'Triple', 'Quadruple'];
      const invalidTypes = exchangePreferences.preferredRoomTypes.filter(
        type => !validRoomTypes.includes(type)
      );
      
      if (invalidTypes.length > 0) {
        throw new ApiError(400, `Invalid room types: ${invalidTypes.join(', ')}`);
      }
      
      validatedPreferences.preferredRoomTypes = exchangePreferences.preferredRoomTypes;
    }
    
    if (exchangePreferences.preferredFloors) {
      validatedPreferences.preferredFloors = exchangePreferences.preferredFloors;
    }
    
    if (exchangePreferences.amenityPreferences) {
      validatedPreferences.amenityPreferences = exchangePreferences.amenityPreferences;
    }
    
    if (exchangePreferences.maxBudget !== undefined) {
      if (exchangePreferences.maxBudget < 0) {
        throw new ApiError(400, 'Max budget cannot be negative');
      }
      validatedPreferences.maxBudget = exchangePreferences.maxBudget;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { exchangePreferences: validatedPreferences },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      throw new ApiError(404, 'User not found');
    }

    res.status(200).json(
      new ApiResponse(200, updatedUser, 'Preferences updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Get current room details
const getCurrentRoom = async (req, res, next) => {
  try {
    console.log(`📝 [GET-CURRENT-ROOM] GET /api/users/current-room - Request started`);
    console.log(`📝 [GET-CURRENT-ROOM] User:`, req.user ? `${req.user.fullName} (${req.user._id})` : 'No user');

    const userId = req.user._id;
    const user = await User.findById(userId).select('currentRoom');

    if (!user) {
      console.log(`❌ [GET-CURRENT-ROOM] User not found: ${userId}`);
      throw new ApiError(404, 'User not found');
    }

    console.log(`✅ [GET-CURRENT-ROOM] Current room data:`, user.currentRoom || 'No room data');

    res.status(200).json(
      new ApiResponse(200, {
        currentRoom: user.currentRoom || null
      }, 'Current room details retrieved successfully')
    );
    console.log(`✅ [GET-CURRENT-ROOM] Response sent successfully`);
  } catch (error) {
    console.log(`❌ [GET-CURRENT-ROOM] Error occurred:`, error.message);
    next(error);
  }
};

// Update current room details
const updateCurrentRoom = async (req, res, next) => {
  try {
    console.log(`📝 [UPDATE-CURRENT-ROOM] PATCH /api/users/current-room - Request started`);
    console.log(`📝 [UPDATE-CURRENT-ROOM] User:`, req.user ? `${req.user.fullName} (${req.user._id})` : 'No user');
    console.log(`📝 [UPDATE-CURRENT-ROOM] Request body:`, JSON.stringify(req.body, null, 2));

    const userId = req.user._id;
    let { currentRoom } = req.body;

    // Handle both direct room data and wrapped format
    let roomData = currentRoom;
    
    // If no currentRoom wrapper, check if room data is sent directly
    if (!currentRoom) {
      const { hostel, hostelName, block, roomNumber, type, roomType, floor, rent } = req.body;
      
      // Check if any direct room fields exist
      if (hostel || hostelName || block || roomNumber || type || roomType || floor !== undefined) {
        // Normalize direct room data format
        roomData = {
          hostelName: hostelName || hostel || '',
          roomNumber: roomNumber || '',
          block: block || '',
          roomType: roomType || type || '',
          floor: floor || 1,
          rent: rent || 0,
          amenities: []
        };
        console.log(`📝 [UPDATE-CURRENT-ROOM] Converted direct room data format:`, roomData);
      }
    }

    if (!roomData) {
      console.log(`❌ [UPDATE-CURRENT-ROOM] No room data provided in any format`);
      throw new ApiError(400, 'Room details are required');
    }

    // Validate required room fields
    const requiredFields = ['hostelName', 'roomNumber', 'block', 'roomType', 'floor'];
    const missingFields = requiredFields.filter(field => !roomData[field]);
    
    console.log(`📝 [UPDATE-CURRENT-ROOM] Required fields check:`, {
      provided: Object.keys(roomData),
      required: requiredFields,
      missing: missingFields
    });
    
    if (missingFields.length > 0) {
      console.log(`❌ [UPDATE-CURRENT-ROOM] Missing required fields: ${missingFields.join(', ')}`);
      throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate room type
    const validRoomTypes = ['Single', 'Double', 'Double Shared', 'Triple', 'Quadruple', 'Shared'];
    if (!validRoomTypes.includes(roomData.roomType)) {
      console.log(`❌ [UPDATE-CURRENT-ROOM] Invalid room type: ${roomData.roomType}, valid types: ${validRoomTypes.join(', ')}`);
      throw new ApiError(400, 'Invalid room type');
    }

    // Validate floor
    if (roomData.floor < 0 || roomData.floor > 50) {
      console.log(`❌ [UPDATE-CURRENT-ROOM] Invalid floor: ${roomData.floor}, must be between 0 and 50`);
      throw new ApiError(400, 'Floor must be between 0 and 50');
    }

    console.log(`✅ [UPDATE-CURRENT-ROOM] All validations passed, updating user...`);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { currentRoom: roomData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      console.log(`❌ [UPDATE-CURRENT-ROOM] User not found: ${userId}`);
      throw new ApiError(404, 'User not found');
    }

    console.log(`✅ [UPDATE-CURRENT-ROOM] User updated successfully with new room data`);

    res.status(200).json(
      new ApiResponse(200, {
        currentRoom: updatedUser.currentRoom
      }, 'Room details updated successfully')
    );
    console.log(`✅ [UPDATE-CURRENT-ROOM] Response sent successfully`);
  } catch (error) {
    console.log(`❌ [UPDATE-CURRENT-ROOM] Error occurred:`, error.message);
    next(error);
  }
};

// Request room update (with file upload)
const requestRoomUpdate = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const userId = req.user._id;

    if (!reason || reason.trim().length < 10) {
      throw new ApiError(400, 'Reason must be at least 10 characters long');
    }

    // File upload is handled by middleware, file info is in req.file
    const proofFile = req.file;
    
    if (!proofFile) {
      throw new ApiError(400, 'Proof file is required');
    }

    // TODO: Here you would typically:
    // 1. Save the request to a database table (RoomUpdateRequest model)
    // 2. Send notification to admin
    // 3. Store file reference
    
    // For now, we'll just return a success message
    // In a real application, you'd create a RoomUpdateRequest model

    res.status(200).json(
      new ApiResponse(200, {
        message: 'Room update request submitted successfully',
        requestId: `REQ_${Date.now()}`, // Generate a proper ID in real implementation
        proofFile: proofFile.filename,
        reason: reason.trim(),
        status: 'pending'
      }, 'Room update request submitted')
    );
  } catch (error) {
    next(error);
  }
};

// Upload profile picture
const uploadProfilePicture = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profilePicture = req.file;

    if (!profilePicture) {
      throw new ApiError(400, 'Profile picture is required');
    }

    // Update user's profile picture
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePicture: `/uploads/${profilePicture.filename}` },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      throw new ApiError(404, 'User not found');
    }

    res.status(200).json(
      new ApiResponse(200, {
        profilePicture: updatedUser.profilePicture,
        user: updatedUser
      }, 'Profile picture updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Get user by ID (public profile)
const getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('fullName username profilePicture bio currentRoom')
      .populate('friends', 'fullName username profilePicture');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (!user.isActive) {
      throw new ApiError(404, 'User not found');
    }

    // Check if current user is friends with this user
    const isFriend = req.user && user.friends.some(friend => 
      friend._id.toString() === req.user._id.toString()
    );

    const publicProfile = {
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      profilePicture: user.profilePicture,
      bio: user.bio,
      isFriend,
      // Only show room details if they are friends or it's the current user
      currentRoom: (isFriend || req.user._id.toString() === userId) ? user.currentRoom : null
    };

    res.status(200).json(
      new ApiResponse(200, publicProfile, 'User profile retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Deactivate account
const deactivateAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { password } = req.body;

    if (!password) {
      throw new ApiError(400, 'Password is required for account deactivation');
    }

    // Verify password
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid password');
    }

    // Deactivate account
    user.isActive = false;
    await user.save();

    res.status(200).json(
      new ApiResponse(200, null, 'Account deactivated successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Get current user's preferences
const getUserPreferences = async (req, res, next) => {
  try {
    console.log(`📝 [USER-PREFS] GET /api/users/preferences - Request started`);
    console.log(`📝 [USER-PREFS] Request user object:`, req.user ? `ID: ${req.user._id}, Name: ${req.user.fullName}` : 'No user');
    
    const userId = req.user?._id;
    console.log(`📝 [USER-PREFS] Extracted user ID: ${userId}`);
    
    if (!userId) {
      console.log(`❌ [USER-PREFS] User ID missing from request`);
      throw new ApiError(400, 'User ID missing');
    }

    console.log(`📝 [USER-PREFS] Querying database for user preferences...`);
    const user = await User.findById(userId)
      .select('exchangePreferences')
      .lean();

    console.log(`📝 [USER-PREFS] Database query result:`, user ? 'User found' : 'User not found');

    if (!user) {
      console.log(`❌ [USER-PREFS] User not found in database for ID: ${userId}`);
      throw new ApiError(404, 'User not found');
    }

    // Return preferences or default structure if not set
    const preferences = user.exchangePreferences || {
      preferredHostels: [],
      roomTypePreference: '',
      floorPreferences: [],
      amenitiesRequired: [],
      maxDistanceFromCampus: 1000,
      budgetRange: { min: 0, max: 100000 },
      additionalNotes: ''
    };

    console.log(`📝 [USER-PREFS] Preferences data:`, preferences);
    console.log(`✅ [USER-PREFS] Sending successful response`);

    res.status(200).json(
      new ApiResponse(200, preferences, 'User preferences retrieved successfully')
    );
    
    console.log(`✅ [USER-PREFS] Response sent successfully`);
  } catch (error) {
    console.log(`❌ [USER-PREFS] Error occurred:`, error.message);
    console.log(`❌ [USER-PREFS] Error stack:`, error.stack);
    next(error);
  }
};

// Get current user profile
const getUserProfile = async (req, res, next) => {
  try {
    console.log(`📝 [USER-PROFILE] GET /api/users/profile - Request started`);
    console.log(`📝 [USER-PROFILE] Request user object:`, req.user ? `ID: ${req.user._id}, Name: ${req.user.fullName}` : 'No user');
    
    const userId = req.user?._id;
    console.log(`📝 [USER-PROFILE] Extracted user ID: ${userId}`);
    
    if (!userId) {
      console.log(`❌ [USER-PROFILE] User ID missing from request`);
      throw new ApiError(400, 'User ID missing');
    }

    console.log(`📝 [USER-PROFILE] Querying database for user profile...`);
    const user = await User.findById(userId)
      .select('-password -__v')
      .lean();

    console.log(`📝 [USER-PROFILE] Database query result:`, user ? 'User found' : 'User not found');

    if (!user) {
      console.log(`❌ [USER-PROFILE] User not found in database for ID: ${userId}`);
      throw new ApiError(404, 'User not found');
    }

    console.log(`📝 [USER-PROFILE] User profile data keys:`, Object.keys(user));
    console.log(`✅ [USER-PROFILE] Sending successful response`);

    res.status(200).json(
      new ApiResponse(200, user, 'User profile retrieved successfully')
    );
    
    console.log(`✅ [USER-PROFILE] Response sent successfully`);
  } catch (error) {
    console.log(`❌ [USER-PROFILE] Error occurred:`, error.message);
    console.log(`❌ [USER-PROFILE] Error stack:`, error.stack);
    next(error);
  }
};

module.exports = {
  searchUsers,
  updateUserDetails,
  updateUserPreferences,
  getCurrentRoom,
  updateCurrentRoom,
  requestRoomUpdate,
  uploadProfilePicture,
  getUserById,
  deactivateAccount,
  getUserPreferences,
  getUserProfile
};
