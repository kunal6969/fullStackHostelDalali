const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { GENDER } = require('../../utils/constants');

// Current Room subdocument schema
const currentRoomSchema = new mongoose.Schema({
  hostelName: {
    type: String,
    required: true
  },
  roomNumber: {
    type: String,
    required: true
  },
  block: {
    type: String,
    required: true
  },
  roomType: {
    type: String,
    enum: ['Single', 'Double', 'Double Shared', 'Triple', 'Quadruple', 'Shared'],
    required: true
  },
  floor: {
    type: Number,
    required: true
  },
  amenities: [{
    type: String
  }]
}, { _id: false });

// Exchange Preferences subdocument schema
const exchangePreferencesSchema = new mongoose.Schema({
  preferredHostels: [{
    type: String
  }],
  preferredRoomTypes: [{
    type: String,
    enum: ['Single', 'Double', 'Double Shared', 'Triple', 'Quadruple', 'Shared']
  }],
  preferredFloors: [{
    type: Number
  }],
  amenityPreferences: [{
    type: String
  }],
  maxBudget: {
    type: Number,
    default: 0
  }
}, { _id: false });

// User schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: Object.values(GENDER),
    required: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  currentRoom: {
    type: currentRoomSchema,
    required: false
  },
  exchangePreferences: {
    type: exchangePreferencesSchema,
    default: {}
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  }
}, {
  timestamps: true
});

// Index for search functionality
userSchema.index({ username: 'text', fullName: 'text', email: 'text' });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Generate username if not provided
userSchema.pre('save', function(next) {
  if (!this.username && this.email) {
    // Generate username from email
    const emailPrefix = this.email.split('@')[0];
    this.username = emailPrefix + Math.floor(Math.random() * 1000);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get public profile method
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
