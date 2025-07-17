const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test with exact data structure from your error log
async function testWithExactErrorData() {
    try {
        console.log('🧪 [TEST] Testing with exact error data structure...');
        
        // Login first
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: '2023uee2010@mnit.ac.in',
            password: '123456'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ [TEST] Login successful');
        
        // Create form data exactly like the error log shows
        const formData = new FormData();
        
        // This is exactly what the frontend is sending according to your error
        const roomDetailsFromError = {
            "hostelName": "Hostel 1",
            "roomNumber": "106", 
            "block": "B",
            "roomType": "Single",
            "floor": 1,
            "amenities": ["WiFi", "AC"]
        };
        
        formData.append('roomDetails', JSON.stringify(roomDetailsFromError));
        formData.append('listingType', 'Exchange');
        formData.append('description', 'i dont want anything');
        
        // Create a proper PNG file
        const pngData = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
            0x89, 0x00, 0x00, 0x00, 0x0B, 0x49, 0x44, 0x41,
            0x54, 0x78, 0x9C, 0x62, 0x00, 0x02, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
            0x42, 0x60, 0x82
        ]);
        const testFilePath = path.join(__dirname, 'test_error_data.png');
        fs.writeFileSync(testFilePath, pngData);
        formData.append('roomProofFile', fs.createReadStream(testFilePath));
        
        console.log('📝 [TEST] Sending request with exact error data structure...');
        console.log('📝 [TEST] Room details:', roomDetailsFromError);
        
        const response = await axios.post('http://localhost:5000/api/rooms', formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            }
        });
        
        console.log('✅ [TEST] Success! Room listing created');
        console.log('📄 [TEST] Response:', JSON.stringify(response.data, null, 2));
        
        // Clean up
        fs.unlinkSync(testFilePath);
        
    } catch (error) {
        console.log('❌ [TEST] Error occurred:');
        if (error.response) {
            console.log('📄 [TEST] Error response:', error.response.status, error.response.statusText);
            console.log('📄 [TEST] Error data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('📄 [TEST] Error message:', error.message);
        }
        
        // Clean up test file if it exists
        const testFilePath = path.join(__dirname, 'test_error_data.png');
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    }
}

testWithExactErrorData();
