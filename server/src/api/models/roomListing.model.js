const mongoose = require('mongoose');
const { LISTING_STATUS, GENDER } = require('../../utils/constants');

// Room Details subdocument schema
const roomDetailsSchema = new mongoose.Schema({
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
  }],
  rent: {
    type: Number,
    required: true
  },
  images: [{
    type: String
  }]
}, { _id: false });

// Desired Room subdocument schema
const desiredRoomSchema = new mongoose.Schema({
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

// Room Listing schema
const roomListingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  listedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentRoom: {
    type: roomDetailsSchema,
    required: true
  },
  desiredRoom: {
    type: desiredRoomSchema,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(LISTING_STATUS),
    default: LISTING_STATUS.OPEN
  },
  urgency: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  availableFrom: {
    type: Date,
    required: true
  },
  availableTill: {
    type: Date,
    required: true
  },
  roomProofFile: {
    type: String,
    required: true
  },
  interestedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  interestCount: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String
  }],
  genderPreference: {
    type: String,
    enum: Object.values(GENDER),
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
roomListingSchema.index({ status: 1, genderPreference: 1 });
roomListingSchema.index({ listedBy: 1 });
roomListingSchema.index({ createdAt: -1 });
roomListingSchema.index({ interestCount: -1 });
roomListingSchema.index({ 'currentRoom.hostelName': 1 });
roomListingSchema.index({ 'desiredRoom.preferredHostels': 1 });

// Update interest count when interestedUsers array changes
roomListingSchema.pre('save', function(next) {
  this.interestCount = this.interestedUsers.length;
  next();
});

// Virtual for time remaining
roomListingSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const diff = this.availableTill - now;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24))); // Days remaining
});

// Include virtuals when converting to JSON
roomListingSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('RoomListing', roomListingSchema);
