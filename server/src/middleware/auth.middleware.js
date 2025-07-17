const jwt = require('jsonwebtoken');
const User = require('../api/models/user.model');
const ApiError = require('../utils/apiError');
const { JWT_SECRET } = require('../utils/constants');

const authMiddleware = async (req, res, next) => {
  try {
    console.log(`🔐 [AUTH] Authentication check for: ${req.method} ${req.originalUrl}`);
    
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log(`🔐 [AUTH] Token present: ${!!token}`);
    console.log(`🔐 [AUTH] Token preview: ${token ? token.substring(0, 20) + '...' : 'None'}`);
    
    if (!token) {
      console.log(`❌ [AUTH] No token provided for protected route`);
      throw new ApiError(401, 'Access token is required');
    }

    console.log(`🔐 [AUTH] Verifying JWT token...`);
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(`✅ [AUTH] JWT verified successfully for user ID: ${decoded.id}`);
    
    console.log(`🔐 [AUTH] Looking up user in database...`);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      console.log(`❌ [AUTH] User not found in database for ID: ${decoded.id}`);
      throw new ApiError(401, 'Invalid token - user not found');
    }

    console.log(`✅ [AUTH] User found: ${user.fullName} (${user.email})`);
    req.user = user;
    console.log(`✅ [AUTH] Authentication successful, proceeding to next middleware`);
    next();
  } catch (error) {
    console.log(`❌ [AUTH] Authentication failed:`, error.message);
    console.log(`❌ [AUTH] Error type:`, error.name);
    
    if (error.name === 'JsonWebTokenError') {
      console.log(`❌ [AUTH] JWT malformed or invalid`);
      next(new ApiError(401, 'Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      console.log(`❌ [AUTH] JWT token expired`);
      next(new ApiError(401, 'Token expired'));
    } else {
      console.log(`❌ [AUTH] Other authentication error:`, error);
      next(error);
    }
  }
};

// Optional auth middleware - doesn't throw error if no token
const optionalAuth = async (req, res, next) => {
  try {
    console.log(`🔓 [OPTIONAL-AUTH] Optional authentication check for: ${req.method} ${req.originalUrl}`);
    
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log(`🔓 [OPTIONAL-AUTH] Token present: ${!!token}`);
    
    if (token) {
      console.log(`🔓 [OPTIONAL-AUTH] Token found, attempting verification...`);
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log(`✅ [OPTIONAL-AUTH] JWT verified for user ID: ${decoded.id}`);
      
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        console.log(`✅ [OPTIONAL-AUTH] User authenticated: ${user.fullName}`);
        req.user = user;
      } else {
        console.log(`⚠️ [OPTIONAL-AUTH] Token valid but user not found`);
      }
    } else {
      console.log(`🔓 [OPTIONAL-AUTH] No token provided, continuing without authentication`);
    }
    
    next();
  } catch (error) {
    console.log(`⚠️ [OPTIONAL-AUTH] Authentication failed but continuing: ${error.message}`);
    // Silently continue without authentication
    next();
  }
};

module.exports = { authMiddleware, optionalAuth };
