const axios = require('axios');

async function createTestUser() {
    try {
        console.log('👤 [USER-CREATION] Creating test user for room listing test...');
        
        const userData = {
            fullName: 'Room Test User',
            username: 'roomtestuser',
            email: 'roomtest@mnit.ac.in',
            password: '123456',
            rollNumber: '2023UEE2099',
            phoneNumber: '9876543210',
            gender: 'Male',
            currentRoom: {
                hostel: 'HL-1',
                block: 'A',
                roomNumber: '101',
                type: 'Single'
            }
        };
        
        const response = await axios.post('http://localhost:5000/api/auth/signup', userData);
        console.log('✅ [USER-CREATION] Test user created successfully!');
        console.log('📄 [USER-CREATION] User data:', JSON.stringify(response.data, null, 2));
        
        return {
            email: userData.email,
            password: userData.password
        };
        
    } catch (error) {
        console.log('❌ [USER-CREATION] Error creating test user:');
        if (error.response) {
            console.log('📄 [USER-CREATION] Error response:', error.response.status, error.response.statusText);
            console.log('📄 [USER-CREATION] Error data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('📄 [USER-CREATION] Error message:', error.message);
        }
        return null;
    }
}

createTestUser();
