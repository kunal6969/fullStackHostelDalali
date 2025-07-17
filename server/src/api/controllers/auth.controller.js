const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const ApiError = require('../../utils/apiError');
const ApiResponse = require('../../utils/apiResponse');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../../utils/constants');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Signup controller
const signup = async (req, res, next) => {
  try {
    const { email, password, fullName, gender } = req.body;

    // Validate required fields
    if (!email || !password || !fullName || !gender) {
      throw new ApiError(400, 'All fields are required');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists');
    }

    // Validate password strength
    if (password.length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters long');
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password,
      fullName: fullName.trim(),
      gender
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.getPublicProfile();

    res.status(201).json(
      new ApiResponse(201, {
        user: userResponse,
        token
      }, 'User registered successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Login controller
const login = async (req, res, next) => {
  try {
    console.log(`📝 [LOGIN] POST /api/auth/login - Login attempt started`);
    const { email, password } = req.body;
    
    console.log(`📝 [LOGIN] Login attempt for email: ${email}`);
    console.log(`📝 [LOGIN] Password provided: ${password ? 'Yes' : 'No'}`);

    // Validate required fields
    if (!email || !password) {
      console.log(`❌ [LOGIN] Validation failed: Missing email or password`);
      throw new ApiError(400, 'Email and password are required');
    }

    console.log(`📝 [LOGIN] Searching for user with email: ${email.toLowerCase()}`);
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log(`❌ [LOGIN] User not found for email: ${email}`);
      throw new ApiError(401, 'Invalid email or password');
    }

    console.log(`📝 [LOGIN] User found: ${user.fullName} (${user.email})`);
    console.log(`📝 [LOGIN] User active status: ${user.isActive}`);

    // Check if user is active
    if (!user.isActive) {
      console.log(`❌ [LOGIN] User account is deactivated: ${user.email}`);
      throw new ApiError(403, 'Account is deactivated. Please contact support');
    }

    console.log(`📝 [LOGIN] Comparing password...`);
    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    console.log(`📝 [LOGIN] Password comparison result: ${isPasswordValid}`);
    
    if (!isPasswordValid) {
      console.log(`❌ [LOGIN] Invalid password for user: ${user.email}`);
      throw new ApiError(401, 'Invalid email or password');
    }

    console.log(`✅ [LOGIN] Password valid, updating last login...`);
    // Update last login
    user.lastLogin = new Date();
    await user.save();

    console.log(`📝 [LOGIN] Generating JWT token...`);
    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.getPublicProfile();

    console.log(`✅ [LOGIN] Login successful for user: ${user.email}`);
    res.status(200).json(
      new ApiResponse(200, {
        user: userResponse,
        token
      }, 'Login successful')
    );
  } catch (error) {
    next(error);
  }
};

// Get current user profile
const getProfile = async (req, res, next) => {
  try {
    // User is already attached to req by auth middleware
    const user = await User.findById(req.user._id)
      .populate('friends', 'fullName username profilePicture')
      .select('-password');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.status(200).json(
      new ApiResponse(200, user, 'Profile retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Verify token (for frontend to check if token is valid)
const verifyToken = async (req, res, next) => {
  try {
    // If we reach here, the token is valid (middleware has verified it)
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.status(200).json(
      new ApiResponse(200, { user }, 'Token is valid')
    );
  } catch (error) {
    next(error);
  }
};

// Logout (mainly for clearing client-side token)
const logout = async (req, res, next) => {
  try {
    // In a stateless JWT system, logout is mainly handled client-side
    // But we can add blacklisting logic here if needed in the future
    
    res.status(200).json(
      new ApiResponse(200, null, 'Logout successful')
    );
  } catch (error) {
    next(error);
  }
};

// Change password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ApiError(400, 'Current password and new password are required');
    }

    if (newPassword.length < 6) {
      throw new ApiError(400, 'New password must be at least 6 characters long');
    }

    // Get user with password
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json(
      new ApiResponse(200, null, 'Password changed successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Request password reset (placeholder for future implementation)
const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ApiError(400, 'Email is required');
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists or not for security
      res.status(200).json(
        new ApiResponse(200, null, 'If an account with this email exists, a password reset link has been sent')
      );
      return;
    }

    // TODO: Implement email sending logic here
    // For now, just return success message
    
    res.status(200).json(
      new ApiResponse(200, null, 'If an account with this email exists, a password reset link has been sent')
    );
  } catch (error) {
    next(error);
  }
};

// Refresh token
const refreshToken = async (req, res, next) => {
  try {
    // Get user from middleware
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Generate new token
    const token = generateToken(user._id);

    res.status(200).json(
      new ApiResponse(200, { token, user }, 'Token refreshed successfully')
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
  getProfile,
  verifyToken,
  logout,
  changePassword,
  requestPasswordReset,
  refreshToken
};
