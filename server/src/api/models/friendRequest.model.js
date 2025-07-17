const mongoose = require('mongoose');
const { FRIEND_REQUEST_STATUS } = require('../../utils/constants');

const friendRequestSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: Object.values(FRIEND_REQUEST_STATUS),
    default: FRIEND_REQUEST_STATUS.PENDING
  },
  message: {
    type: String,
    maxlength: 200,
    default: ''
  },
  respondedAt: {
    type: Date
  },
  responseMessage: {
    type: String,
    maxlength: 200,
    default: ''
  }
}, {
  timestamps: true
});

// Ensure one request per pair of users
friendRequestSchema.index({ from: 1, toUserId: 1 }, { unique: true });

// Indexes for query performance
friendRequestSchema.index({ toUserId: 1, status: 1 });
friendRequestSchema.index({ from: 1, status: 1 });
friendRequestSchema.index({ status: 1, createdAt: -1 });

// Prevent self-friend requests
friendRequestSchema.pre('save', function(next) {
  if (this.from.toString() === this.toUserId.toString()) {
    const error = new Error('Cannot send friend request to yourself');
    error.name = 'ValidationError';
    return next(error);
  }
  next();
});

// Update respondedAt when status changes
friendRequestSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status !== FRIEND_REQUEST_STATUS.PENDING) {
    this.respondedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('FriendRequest', friendRequestSchema);
