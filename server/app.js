const http = require('http');
const app = require('./src/app');
const { initializeSocket } = require('./src/config/socket');

console.log('🔧 [SERVER] Starting server initialization...');
const PORT = process.env.PORT || 5000;
console.log(`🔧 [SERVER] Port configured: ${PORT}`);

// Create HTTP server
console.log('🔧 [SERVER] Creating HTTP server...');
const server = http.createServer(app);
console.log('✅ [SERVER] HTTP server created successfully');

// Initialize Socket.IO
console.log('🔧 [SOCKET] Initializing Socket.IO...');
try {
  initializeSocket(server);
  console.log('✅ [SOCKET] Socket.IO initialized successfully');
} catch (error) {
  console.error('❌ [SOCKET] Socket.IO initialization failed:', error);
  process.exit(1);
}

// Start server
console.log('🔧 [SERVER] Starting server listen...');
server.listen(PORT, () => {
  console.log(`🚀 Hostel Dalali Backend Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
  console.log('✅ [SERVER] Server is ready and listening for connections');
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ [SERVER] Server error occurred:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ [SERVER] Port ${PORT} is already in use. Please stop other processes or use a different port.`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});