const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

// Not found middleware
const notFound = (req, res, next) => {
  console.log(`❌ [404] Route not found: ${req.method} ${req.originalUrl}`);
  console.log(`❌ [404] Request headers:`, req.headers);
  console.log(`❌ [404] Request body:`, req.body);
  
  res.status(404).json(
    new ApiResponse(404, null, `Not found - ${req.originalUrl}`)
  );
  
  console.log(`❌ [404] 404 response sent for: ${req.originalUrl}`);
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.log(`❌ [ERROR] Error occurred in: ${req.method} ${req.originalUrl}`);
  console.log(`❌ [ERROR] Original error:`, err);
  console.log(`❌ [ERROR] Error stack:`, err.stack);
  console.log(`❌ [ERROR] Request body:`, req.body);
  console.log(`❌ [ERROR] Request params:`, req.params);
  console.log(`❌ [ERROR] Request query:`, req.query);
  console.log(`❌ [ERROR] User info:`, req.user ? `ID: ${req.user._id}` : 'No user');

  let error = err; // Don't spread operator, preserve the original error instance

  // Log error
  console.error('🔍 [ERROR-DETAIL] Processing error:', err);

  // Check if it's already an ApiError first
  if (err instanceof ApiError) {
    console.log(`✅ [ERROR] Error is already an ApiError - Status: ${err.statusCode}, Message: ${err.message}`);
    error = err;
  }
  // Mongoose bad ObjectId
  else if (err.name === 'CastError') {
    console.log(`❌ [ERROR] Mongoose CastError detected - Invalid ObjectId`);
    const message = 'Resource not found';
    error = new ApiError(404, message);
  }
  // Mongoose duplicate key
  else if (err.code === 11000) {
    console.log(`❌ [ERROR] MongoDB duplicate key error:`, err.keyValue);
    const message = 'Duplicate field value entered';
    error = new ApiError(400, message);
  }
  // Mongoose validation error
  else if (err.name === 'ValidationError') {
    console.log(`❌ [ERROR] Mongoose validation error:`, err.errors);
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ApiError(400, message);
  }
  // JWT errors
  else if (err.name === 'JsonWebTokenError') {
    console.log(`❌ [ERROR] JWT error - Invalid token`);
    const message = 'Invalid token';
    error = new ApiError(401, message);
  }
  else if (err.name === 'TokenExpiredError') {
    console.log(`❌ [ERROR] JWT error - Token expired`);
    const message = 'Token expired';
    error = new ApiError(401, message);
  }
  // Multer errors
  else if (err.code === 'LIMIT_FILE_SIZE') {
    console.log(`❌ [ERROR] Multer error - File too large`);
    const message = 'File too large';
    error = new ApiError(400, message);
  }
  else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    console.log(`❌ [ERROR] Multer error - Unexpected file field`);
    const message = 'Unexpected file field';
    error = new ApiError(400, message);
  }
  // Default error for unhandled types
  else {
    console.log(`❌ [ERROR] Unhandled error type - Creating generic 500 error`);
    error = new ApiError(500, 'Internal server error');
  }

  console.log(`❌ [ERROR] Final error response: Status ${error.statusCode}, Message: ${error.message}`);

  res.status(error.statusCode).json(
    new ApiResponse(error.statusCode, null, error.message)
  );
  
  console.log(`❌ [ERROR] Error response sent for: ${req.originalUrl}`);
};

module.exports = {
  notFound,
  errorHandler
};
