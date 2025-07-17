const mongoose = require('mongoose');
const { EVENT_STATUS } = require('../../utils/constants');

const eventSchema = new mongoose.Schema({
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
  eventType: {
    type: String,
    enum: ['Academic', 'Sports', 'Cultural', 'Technical', 'Social', 'Workshop', 'Seminar', 'Other'],
    required: true
  },
  venue: {
    type: String,
    required: true,
    maxlength: 200
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizer: {
    name: {
      type: String,
      required: true,
      maxlength: 100
    },
    contact: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    }
  },
  maxParticipants: {
    type: Number,
    default: 0 // 0 means unlimited
  },
  registeredUsers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    attendanceStatus: {
      type: String,
      enum: ['registered', 'attended', 'no-show'],
      default: 'registered'
    }
  }],
  status: {
    type: String,
    enum: Object.values(EVENT_STATUS),
    default: EVENT_STATUS.PENDING
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    maxlength: 500
  },
  tags: [{
    type: String,
    maxlength: 30
  }],
  imageUrl: {
    type: String
  },
  registrationDeadline: {
    type: Date
  },
  requirements: {
    type: String,
    maxlength: 500
  },
  prizes: {
    type: String,
    maxlength: 300
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
    },
    interval: {
      type: Number,
      default: 1
    },
    endDate: {
      type: Date
    }
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    comment: {
      type: String,
      required: true,
      maxlength: 300
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for efficient querying
eventSchema.index({ status: 1, startDate: 1 });
eventSchema.index({ submittedBy: 1, status: 1 });
eventSchema.index({ eventType: 1, status: 1 });
eventSchema.index({ startDate: 1, endDate: 1 });
eventSchema.index({ isFeatured: 1, startDate: 1 });
eventSchema.index({ 'registeredUsers.userId': 1 });

// Virtual for registration count
eventSchema.virtual('registrationCount').get(function() {
  return this.registeredUsers.length;
});

// Virtual for available spots
eventSchema.virtual('availableSpots').get(function() {
  if (this.maxParticipants === 0) return 'Unlimited';
  return Math.max(0, this.maxParticipants - this.registeredUsers.length);
});

// Virtual for event status (upcoming, ongoing, completed)
eventSchema.virtual('eventStatus').get(function() {
  const now = new Date();
  const startDateTime = new Date(`${this.startDate.toDateString()} ${this.startTime}`);
  const endDateTime = new Date(`${this.endDate.toDateString()} ${this.endTime}`);
  
  if (now < startDateTime) return 'upcoming';
  if (now >= startDateTime && now <= endDateTime) return 'ongoing';
  return 'completed';
});

// Virtual for registration deadline status
eventSchema.virtual('canRegister').get(function() {
  const now = new Date();
  const startDateTime = new Date(`${this.startDate.toDateString()} ${this.startTime}`);
  
  // Check if registration deadline has passed
  if (this.registrationDeadline && now > this.registrationDeadline) {
    return false;
  }
  
  // Check if event has started
  if (now >= startDateTime) {
    return false;
  }
  
  // Check if max participants reached
  if (this.maxParticipants > 0 && this.registeredUsers.length >= this.maxParticipants) {
    return false;
  }
  
  return this.status === EVENT_STATUS.APPROVED;
});

// Method to register user for event
eventSchema.methods.registerUser = function(userId) {
  // Check if user is already registered
  const existingRegistration = this.registeredUsers.find(reg => 
    reg.userId.toString() === userId.toString()
  );
  
  if (existingRegistration) {
    throw new Error('User is already registered for this event');
  }
  
  // Check if registration is allowed
  if (!this.canRegister) {
    throw new Error('Registration is not available for this event');
  }
  
  this.registeredUsers.push({
    userId,
    registeredAt: new Date()
  });
  
  return this.save();
};

// Method to unregister user from event
eventSchema.methods.unregisterUser = function(userId) {
  this.registeredUsers = this.registeredUsers.filter(reg => 
    reg.userId.toString() !== userId.toString()
  );
  
  return this.save();
};

// Method to mark attendance
eventSchema.methods.markAttendance = function(userId, status = 'attended') {
  const registration = this.registeredUsers.find(reg => 
    reg.userId.toString() === userId.toString()
  );
  
  if (!registration) {
    throw new Error('User is not registered for this event');
  }
  
  registration.attendanceStatus = status;
  return this.save();
};

// Validation: end date should be after start date
eventSchema.pre('save', function(next) {
  if (this.endDate < this.startDate) {
    const error = new Error('End date must be after start date');
    error.name = 'ValidationError';
    return next(error);
  }
  
  // Set registration deadline if not provided (24 hours before event)
  if (!this.registrationDeadline) {
    const startDateTime = new Date(`${this.startDate.toDateString()} ${this.startTime}`);
    this.registrationDeadline = new Date(startDateTime.getTime() - 24 * 60 * 60 * 1000);
  }
  
  next();
});

// Include virtuals when converting to JSON
eventSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Event', eventSchema);
