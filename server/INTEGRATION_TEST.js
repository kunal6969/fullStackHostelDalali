const axios = require('axios');

// Base URL for testing
const BASE_URL = 'http://localhost:5000/api';

// Test configuration
const testConfig = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Test results storage
let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to run tests
const runTest = async (testName, testFunction) => {
  try {
    console.log(`\n🧪 Testing: ${testName}`);
    await testFunction();
    console.log(`✅ PASSED: ${testName}`);
    testResults.passed++;
  } catch (error) {
    console.log(`❌ FAILED: ${testName}`);
    console.log(`   Error: ${error.message}`);
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message });
  }
};

// Test functions
const testHealthCheck = async () => {
  const response = await axios.get(`${BASE_URL}/health`, testConfig);
  if (response.status !== 200 || !response.data.success) {
    throw new Error('Health check failed');
  }
};

const testApiDocumentation = async () => {
  const response = await axios.get(`${BASE_URL}/`, testConfig);
  if (response.status !== 200 || !response.data.frontendAliases) {
    throw new Error('API documentation missing frontend aliases');
  }
  
  const expectedAliases = [
    'exchangeDashboard',
    'exchangeRequestApproval', 
    'trendingRooms',
    'courses',
    'courseAttendance'
  ];
  
  for (const alias of expectedAliases) {
    if (!response.data.frontendAliases[alias]) {
      throw new Error(`Missing alias: ${alias}`);
    }
  }
};

const testTrendingRoomsAlias = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/room-listings/trending`, testConfig);
    // Should return 401 without auth, but endpoint should exist
    if (response.status === 200 || response.status === 401) {
      return; // Both are acceptable
    }
  } catch (error) {
    if (error.response && (error.response.status === 401 || error.response.status === 200)) {
      return; // Endpoint exists
    }
    throw new Error('Trending rooms alias endpoint not accessible');
  }
};

const testExchangeDashboardAlias = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/exchange-dashboard`, testConfig);
    // Should return 401 without auth
  } catch (error) {
    if (error.response && error.response.status === 401) {
      return; // Expected behavior - needs auth
    }
    throw new Error('Exchange dashboard alias endpoint not accessible');
  }
};

const testCoursesAlias = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/courses`, testConfig);
    // Should return 401 without auth
  } catch (error) {
    if (error.response && error.response.status === 401) {
      return; // Expected behavior - needs auth
    }
    throw new Error('Courses alias endpoint not accessible');
  }
};

const testOriginalEndpoints = async () => {
  // Test that original endpoints still work
  const endpoints = [
    '/rooms/trending',
    '/matches/dashboard', 
    '/attendance'
  ];
  
  for (const endpoint of endpoints) {
    try {
      await axios.get(`${BASE_URL}${endpoint}`, testConfig);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        continue; // Expected for auth-protected endpoints
      }
      throw new Error(`Original endpoint ${endpoint} not accessible`);
    }
  }
};

const testCorsConfiguration = async () => {
  const response = await axios.options(`${BASE_URL}/health`, {
    ...testConfig,
    headers: {
      ...testConfig.headers,
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'GET'
    }
  });
  
  // Should not throw CORS error
  if (response.status >= 400) {
    throw new Error('CORS configuration issue');
  }
};

// Main test runner
const runIntegrationTests = async () => {
  console.log('🚀 Starting Frontend Integration Tests...\n');
  console.log('=' .repeat(50));
  
  // Run all tests
  await runTest('Health Check', testHealthCheck);
  await runTest('API Documentation with Aliases', testApiDocumentation);
  await runTest('Trending Rooms Alias (/api/room-listings/trending)', testTrendingRoomsAlias);
  await runTest('Exchange Dashboard Alias (/api/exchange-dashboard)', testExchangeDashboardAlias);
  await runTest('Courses Alias (/api/courses)', testCoursesAlias);
  await runTest('Original Endpoints Still Work', testOriginalEndpoints);
  await runTest('CORS Configuration', testCorsConfiguration);
  
  // Print summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(50));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n🔍 Failed Tests:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.error}`);
    });
  }
  
  console.log('\n🎯 Frontend Integration Status:');
  if (testResults.failed === 0) {
    console.log('✅ ALL SYSTEMS GO - Ready for frontend integration!');
    console.log('📋 Next Steps for Frontend Team:');
    console.log('   1. Use the route aliases documented in FRONTEND_INTEGRATION_REQUIREMENTS.md');
    console.log('   2. Implement Socket.IO events from SOCKET_IO_EVENTS.md');
    console.log('   3. Test authentication with JWT tokens');
    console.log('   4. Implement the new UI components for trending rooms and exchange dashboard');
  } else {
    console.log('⚠️  Some issues detected - please resolve before frontend integration');
  }
  
  console.log('\n🔗 Key Resources:');
  console.log('   📄 FRONTEND_INTEGRATION_REQUIREMENTS.md - Complete API guide');
  console.log('   🔌 SOCKET_IO_EVENTS.md - Real-time events documentation');
  console.log('   🏥 /api/health - Health check endpoint');
  console.log('   📚 /api/ - API documentation with all aliases');
  
  process.exit(testResults.failed > 0 ? 1 : 0);
};

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run tests
runIntegrationTests().catch((error) => {
  console.error('❌ Test runner failed:', error.message);
  process.exit(1);
});
