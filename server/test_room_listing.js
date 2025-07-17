const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test the room listing creation with the exact data structure that frontend sends
async function testRoomListingCreation() {
    try {
        console.log('🧪 [TEST] Starting room listing creation test...');
        
        // First, login to get a valid JWT token
        console.log('🔐 [TEST] Logging in to get authentication token...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'roomtest@mnit.ac.in',
            password: '123456'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ [TEST] Login successful, token obtained');
        console.log('🔍 [TEST] Login response structure:', JSON.stringify(loginResponse.data, null, 2));
        console.log('🔍 [TEST] Token preview:', token ? token.substring(0, 50) + '...' : 'NO TOKEN');
        
        if (!token) {
            throw new Error('No token received from login response');
        }
        
        // Create form data exactly like the frontend does
        const formData = new FormData();
        
        // Room details object (exactly like frontend)
        const roomDetails = {
            hostel: 'HL-1',
            block: 'A',
            roomNumber: '101',
            type: 'Single'
        };
        
        // Append data exactly like frontend
        formData.append('roomDetails', JSON.stringify(roomDetails));
        formData.append('listingType', 'Exchange');
        formData.append('description', 'Test room listing from automated test. This is a nice room with good ventilation and peaceful environment.');
        formData.append('desiredTradeConditions', 'Looking for a room in HL-4 or HL-2');
        
        // Create a minimal PNG file for testing (1x1 pixel transparent PNG)
        const testFilePath = path.join(__dirname, 'test_proof.png');
        const pngData = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, // 8-bit RGBA
            0x89, 0x00, 0x00, 0x00, 0x0B, 0x49, 0x44, 0x41, // IDAT chunk
            0x54, 0x78, 0x9C, 0x62, 0x00, 0x02, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, // Image data
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
            0x42, 0x60, 0x82
        ]);
        fs.writeFileSync(testFilePath, pngData);
        formData.append('roomProofFile', fs.createReadStream(testFilePath));
        
        console.log('📝 [TEST] Form data prepared, sending request to backend...');
        console.log('📝 [TEST] Request data:', {
            roomDetails,
            listingType: 'Exchange',
            description: 'Test room listing...',
            hasFile: true
        });
        
        // Make the request to create listing
        const response = await axios.post('http://localhost:5000/api/rooms', formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            }
        });
        
        console.log('✅ [TEST] Room listing created successfully!');
        console.log('📄 [TEST] Response:', JSON.stringify(response.data, null, 2));
        
        // Clean up test file
        fs.unlinkSync(testFilePath);
        console.log('🧹 [TEST] Test file cleaned up');
        
    } catch (error) {
        console.log('❌ [TEST] Error occurred during test:');
        if (error.response) {
            console.log('📄 [TEST] Error response:', error.response.status, error.response.statusText);
            console.log('📄 [TEST] Error data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('📄 [TEST] Error message:', error.message);
        }
        
        // Clean up test file if it exists
        const testFilePath = path.join(__dirname, 'test_proof.png');
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
            console.log('🧹 [TEST] Test file cleaned up after error');
        }
    }
}

// Run the test
testRoomListingCreation();
