const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

console.log('🔧 [APP] Starting Express app initialization...');

// Import configurations
console.log('🔧 [APP] Importing database connection...');
const { connectDB } = require('./config/db');
console.log('🔧 [APP] Importing Socket.IO configuration...');
const { initializeSocket } = require('./config/socket');

// Import routes
console.log('🔧 [APP] Importing API routes...');
const apiRoutes = require('./api');

// Import middleware
console.log('🔧 [APP] Importing error middleware...');
const { errorHandler, notFound } = require('./middleware/error.middleware');

// Create Express app
console.log('🔧 [APP] Creating Express application...');
const app = express();
console.log('✅ [APP] Express application created');

// Connect to database
console.log('🔧 [DATABASE] Attempting database connection...');
try {
  connectDB();
  console.log('✅ [DATABASE] Database connection initiated');
} catch (error) {
  console.error('❌ [DATABASE] Database connection failed:', error);
  process.exit(1);
}

// Security middleware
console.log('🔧 [SECURITY] Applying Helmet security middleware...');
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
console.log('✅ [SECURITY] Helmet middleware applied');

// CORS configuration
console.log('🔧 [CORS] Configuring CORS middleware...');
app.use(cors({
   origin: "*",
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));
console.log('✅ [CORS] CORS middleware configured and applied');


// Rate limiting
console.log('🔧 [RATE-LIMIT] Setting up rate limiting...');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);
console.log('✅ [RATE-LIMIT] Rate limiting applied to /api routes');

// Body parsing middleware
console.log('🔧 [BODY-PARSER] Setting up body parsing middleware...');
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
console.log('✅ [BODY-PARSER] Body parsing middleware applied');

// Static files middleware
console.log('🔧 [STATIC] Setting up static file serving...');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
console.log('✅ [STATIC] Static file middleware applied for /uploads');

// API routes
console.log('🔧 [ROUTES] Mounting API routes...');
app.use('/api', apiRoutes);
console.log('✅ [ROUTES] API routes mounted at /api');

// Root endpoint
console.log('🔧 [ROUTES] Setting up root endpoint...');
app.get('/', (req, res) => {
    console.log('📝 [REQUEST] GET / - Root endpoint accessed');
    res.status(200).json({
        success: true,
        message: 'Welcome to Hostel Dalali Backend API',
        version: '1.0.0',
        documentation: '/api',
        health: '/api/health'
    });
    console.log('✅ [RESPONSE] Root endpoint response sent');
});
console.log('✅ [ROUTES] Root endpoint configured');

// 404 handler
console.log('🔧 [MIDDLEWARE] Setting up 404 handler...');
app.use(notFound);
console.log('✅ [MIDDLEWARE] 404 handler applied');

// Error handling middleware
console.log('🔧 [MIDDLEWARE] Setting up error handler...');
app.use(errorHandler);
console.log('✅ [MIDDLEWARE] Error handler applied');

console.log('🎉 [APP] Express application setup completed successfully');

// Export app for server initialization
module.exports = app;
