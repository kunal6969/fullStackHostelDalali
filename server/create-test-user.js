const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./src/api/models/user.model');

// Connect to database
const { connectDB } = require('./src/config/db');

const createTestUser = async () => {
  try {
    console.log('🔗 Connecting to database...');
    await connectDB();
    
    console.log('👤 Creating test user...');
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: '2023uee2010@mnit.ac.in' });
    if (existingUser) {
      console.log('✅ User already exists:', existingUser.email);
      return;
    }
    
    // Create test user
    const testUser = new User({
      email: '2023uee2010@mnit.ac.in',
      password: '123456', // Will be hashed automatically by the model
      fullName: 'Test User MNIT',
      rollNumber: '2023UEE2010',
      username: '2023uee2010',
      hostelName: 'Hostel 1',
      roomNumber: '101',
      year: 2,
      branch: 'Electrical Engineering',
      gender: 'Male',
      phoneNumber: '+91-9876543210',
      bio: 'Test user for MNIT backend testing',
      interests: ['coding', 'electronics'],
      isActive: true,
      isEmailVerified: true,
      currentRoom: {
        hostelName: 'Hostel 1',
        roomNumber: '101',
        roomType: 'Single',
        floor: 1,
        block: 'A',
        amenities: ['WiFi', 'AC']
      },
      exchangePreferences: {
        preferredHostels: ['Hostel 2', 'Hostel 3'],
        preferredRoomTypes: ['Single', 'Double'],
        maxDistance: 1000,
        amenityPreferences: ['WiFi', 'AC'],
        budgetRange: {
          min: 5000,
          max: 15000
        }
      }
    });
    
    await testUser.save();
    console.log('✅ Test user created successfully:', testUser.email);
    console.log('📧 Email:', testUser.email);
    console.log('🔐 Password: 123456');
    console.log('👤 Full Name:', testUser.fullName);
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

createTestUser();
