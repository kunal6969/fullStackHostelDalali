const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../api/models/user.model');
const RoomListing = require('../api/models/roomListing.model');
const MatchRequest = require('../api/models/matchRequest.model');
const DirectMessage = require('../api/models/directMessage.model');
const CommonChatMessage = require('../api/models/commonChatMessage.model');
const Event = require('../api/models/event.model');
const Course = require('../api/models/course.model');
const FriendRequest = require('../api/models/friendRequest.model');

// Connect to database
const { connectDB } = require('../config/db');

const sampleUsers = [
  {
    email: 'john.doe@example.com',
    password: 'password123',
    fullName: 'John Doe',
    name: 'John Doe',
    rollNumber: 'CS2021001',
    hostelName: 'Alpha Hostel',
    roomNumber: 'A-101',
    year: 3,
    branch: 'Computer Science',
    gender: 'Male',
    phoneNumber: '+91-9876543210',
    bio: 'Love coding and playing cricket',
    interests: ['coding', 'cricket', 'movies'],
    socialLinks: {
      instagram: 'john_doe_cs',
      linkedin: 'john-doe-cs'
    }
  },
  {
    email: 'jane.smith@example.com',
    password: 'password123',
    fullName: 'Jane Smith',
    name: 'Jane Smith',
    rollNumber: 'EC2020045',
    hostelName: 'Beta Hostel',
    roomNumber: 'B-205',
    year: 4,
    branch: 'Electronics',
    gender: 'Female',
    phoneNumber: '+91-9876543211',
    bio: 'Electronics enthusiast and dancer',
    interests: ['electronics', 'dancing', 'reading'],
    socialLinks: {
      instagram: 'jane_electronics',
      twitter: 'jane_smith_ec'
    }
  },
  {
    email: 'mike.wilson@example.com',
    password: 'password123',
    fullName: 'Mike Wilson',
    name: 'Mike Wilson',
    rollNumber: 'ME2022089',
    hostelName: 'Gamma Hostel',
    roomNumber: 'G-312',
    year: 2,
    branch: 'Mechanical',
    gender: 'Male',
    phoneNumber: '+91-9876543212',
    bio: 'Mechanical engineering student, love sports',
    interests: ['sports', 'music', 'travel'],
    socialLinks: {
      linkedin: 'mike-wilson-me'
    }
  }
];

const sampleCourses = [
  { 
    courseCode: 'CS101', 
    courseName: 'Introduction to Programming', 
    credits: 4, 
    department: 'Computer Science',
    semester: 1,
    academicYear: '2024-25',
    instructor: 'Dr. Smith',
    startDate: new Date('2024-08-01'),
    endDate: new Date('2024-12-15')
  },
  { 
    courseCode: 'CS201', 
    courseName: 'Data Structures', 
    credits: 4, 
    department: 'Computer Science',
    semester: 2,
    academicYear: '2024-25',
    instructor: 'Dr. Johnson',
    startDate: new Date('2024-08-01'),
    endDate: new Date('2024-12-15')
  },
  { 
    courseCode: 'EC101', 
    courseName: 'Basic Electronics', 
    credits: 3, 
    department: 'Electronics',
    semester: 1,
    academicYear: '2024-25',
    instructor: 'Dr. Brown',
    startDate: new Date('2024-08-01'),
    endDate: new Date('2024-12-15')
  },
  { 
    courseCode: 'ME101', 
    courseName: 'Engineering Mechanics', 
    credits: 4, 
    department: 'Mechanical',
    semester: 1,
    academicYear: '2024-25',
    instructor: 'Dr. Wilson',
    startDate: new Date('2024-08-01'),
    endDate: new Date('2024-12-15')
  },
  { 
    courseCode: 'MATH101', 
    courseName: 'Calculus', 
    credits: 4, 
    department: 'Mathematics',
    semester: 1,
    academicYear: '2024-25',
    instructor: 'Dr. Davis',
    startDate: new Date('2024-08-01'),
    endDate: new Date('2024-12-15')
  }
];

const sampleRoomListings = [
  {
    title: 'Spacious Single Room in Alpha Hostel',
    description: 'Well-ventilated single room with attached bathroom, good internet connectivity',
    currentRoomDetails: {
      hostelName: 'Alpha Hostel',
      roomNumber: 'A-101',
      roomType: 'single',
      floor: 1,
      amenities: ['attached-bathroom', 'wifi', 'study-table', 'wardrobe'],
      photos: []
    },
    desiredRoomDetails: {
      hostelName: 'Beta Hostel',
      roomType: 'single',
      floor: [2, 3],
      amenities: ['attached-bathroom', 'wifi'],
      maxDistance: 200
    },
    swapType: 'permanent',
    urgencyLevel: 'medium',
    additionalNotes: 'Looking for a room closer to the library',
    contactPreferences: {
      phoneContact: true,
      chatContact: true,
      timeSlots: ['morning', 'evening']
    }
  },
  {
    title: 'Double Room for Single Room Exchange',
    description: 'Double occupancy room, looking for single room exchange',
    currentRoomDetails: {
      hostelName: 'Beta Hostel',
      roomNumber: 'B-205',
      roomType: 'double',
      floor: 2,
      amenities: ['shared-bathroom', 'wifi', 'study-table'],
      photos: []
    },
    desiredRoomDetails: {
      hostelName: ['Alpha Hostel', 'Gamma Hostel'],
      roomType: 'single',
      floor: [1, 2, 3],
      amenities: ['wifi'],
      maxDistance: 300
    },
    swapType: 'permanent',
    urgencyLevel: 'high',
    additionalNotes: 'Need privacy for studies',
    contactPreferences: {
      phoneContact: false,
      chatContact: true,
      timeSlots: ['afternoon', 'evening']
    }
  }
];

const sampleEvents = [
  {
    title: 'Coding Competition 2024',
    description: 'Annual coding competition with exciting prizes',
    eventType: 'competition',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    time: '10:00 AM',
    venue: 'Computer Lab A',
    maxParticipants: 50,
    registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    tags: ['coding', 'competition', 'tech'],
    prizes: ['First Prize: ₹5000', 'Second Prize: ₹3000', 'Third Prize: ₹1000']
  },
  {
    title: 'Cultural Night',
    description: 'Showcase your talents in music, dance, and drama',
    eventType: 'cultural',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    time: '6:00 PM',
    venue: 'Main Auditorium',
    maxParticipants: 200,
    registrationDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    tags: ['cultural', 'music', 'dance', 'drama'],
    prizes: []
  }
];

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    await connectDB();
    
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await RoomListing.deleteMany({});
    await MatchRequest.deleteMany({});
    await DirectMessage.deleteMany({});
    await CommonChatMessage.deleteMany({});
    await Event.deleteMany({});
    await Course.deleteMany({});
    await FriendRequest.deleteMany({});
    
    // Seed courses first (without userId for now, will add later)
    console.log('📚 Seeding courses...');
    let createdCourses = [];
    
    // We'll create courses after users are created
    console.log('✅ Skipped courses for now (will create after users)');
    
    // Seed users
    console.log('👥 Seeding users...');
    const usersWithHashedPasswords = await Promise.all(
      sampleUsers.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 12)
      }))
    );
    
    const createdUsers = await User.insertMany(usersWithHashedPasswords);
    console.log(`✅ Created ${createdUsers.length} users`);
    
    // Now create courses with userId
    console.log('📚 Seeding courses...');
    const coursesWithUsers = sampleCourses.map((course, index) => ({
      ...course,
      userId: createdUsers[index % createdUsers.length]._id
    }));
    
    createdCourses = await Course.insertMany(coursesWithUsers);
    console.log(`✅ Created ${createdCourses.length} courses`);
    
    // Seed room listings
    console.log('🏠 Seeding room listings...');
    const roomListingsWithOwners = sampleRoomListings.map((listing, index) => ({
      ...listing,
      owner: createdUsers[index]._id
    }));
    
    const createdRoomListings = await RoomListing.insertMany(roomListingsWithOwners);
    console.log(`✅ Created ${createdRoomListings.length} room listings`);
    
    // Seed events
    console.log('🎉 Seeding events...');
    const eventsWithOrganizers = sampleEvents.map((event, index) => ({
      ...event,
      organizer: createdUsers[index]._id
    }));
    
    const createdEvents = await Event.insertMany(eventsWithOrganizers);
    console.log(`✅ Created ${createdEvents.length} events`);
    
    // Create sample match requests
    console.log('🤝 Creating sample match requests...');
    if (createdRoomListings.length >= 2) {
      const matchRequest = new MatchRequest({
        requester: createdUsers[1]._id,
        requestedListing: createdRoomListings[0]._id,
        requesterListing: createdRoomListings[1]._id,
        message: 'Hi! I\'m interested in swapping rooms. Your room seems perfect for my needs.',
        swapType: 'permanent'
      });
      
      await matchRequest.save();
      console.log('✅ Created sample match request');
    }
    
    // Create sample common chat messages
    console.log('💬 Creating sample common chat messages...');
    const commonMessages = [
      {
        sender: createdUsers[0]._id,
        content: 'Hey everyone! Welcome to the hostel common chat! 👋',
        messageType: 'text'
      },
      {
        sender: createdUsers[1]._id,
        content: 'Thanks! Excited to connect with everyone here! 😊',
        messageType: 'text'
      },
      {
        sender: createdUsers[2]._id,
        content: 'Anyone interested in a room swap? Check out the listings!',
        messageType: 'text'
      }
    ];
    
    await CommonChatMessage.insertMany(commonMessages);
    console.log(`✅ Created ${commonMessages.length} common chat messages`);
    
    // Create sample friend requests
    console.log('👫 Creating sample friend requests...');
    if (createdUsers.length >= 3) {
      const friendRequest = new FriendRequest({
        sender: createdUsers[0]._id,
        receiver: createdUsers[1]._id,
        message: 'Hey! We have similar interests. Would love to be friends!'
      });
      
      await friendRequest.save();
      console.log('✅ Created sample friend request');
    }
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Seeded data summary:');
    console.log(`   👥 Users: ${createdUsers.length}`);
    console.log(`   📚 Courses: ${createdCourses.length}`);
    console.log(`   🏠 Room Listings: ${createdRoomListings.length}`);
    console.log(`   🎉 Events: ${createdEvents.length}`);
    console.log(`   🤝 Match Requests: 1`);
    console.log(`   💬 Common Messages: ${commonMessages.length}`);
    console.log(`   👫 Friend Requests: 1`);
    
    console.log('\n🔐 Test User Credentials:');
    sampleUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} / password123`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
