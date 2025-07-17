const mongoose = require('mongoose');
const { REQUEST_STATUS } = require('../../utils/constants');

const matchRequestSchema = new mongoose.Schema({
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RoomListing',
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: Object.values(REQUEST_STATUS),
    default: REQUEST_STATUS.PENDING
  },
  approvals: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    approved: {
      type: Boolean,
      required: true
    },
    approvedAt: {
      type: Date,
      default: Date.now
    },
    comments: {
      type: String,
      maxlength: 200
    }
  }],
  swapDetails: {
    scheduledDate: {
      type: Date
    },
    meetingPoint: {
      type: String,
      maxlength: 200
    },
    additionalNotes: {
      type: String,
      maxlength: 500
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    }
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  responseMessage: {
    type: String,
    maxlength: 500
  },
  respondedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
matchRequestSchema.index({ requesterId: 1, status: 1 });
matchRequestSchema.index({ listingId: 1, status: 1 });
matchRequestSchema.index({ status: 1, createdAt: -1 });
matchRequestSchema.index({ expiresAt: 1 });

// Compound index for requester and listing
matchRequestSchema.index({ requesterId: 1, listingId: 1 }, { unique: true });

// Virtual for checking if request is expired
matchRequestSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Virtual for getting approval status
matchRequestSchema.virtual('approvalStatus').get(function() {
  if (this.approvals.length === 0) return 'pending';
  
  const hasRejection = this.approvals.some(approval => !approval.approved);
  if (hasRejection) return 'rejected';
  
  const allApproved = this.approvals.length >= 2 && this.approvals.every(approval => approval.approved);
  if (allApproved) return 'approved';
  
  return 'partial';
});

// Method to add approval
matchRequestSchema.methods.addApproval = function(userId, approved, comments = '') {
  // Check if user already approved/rejected
  const existingApproval = this.approvals.find(approval => 
    approval.userId.toString() === userId.toString()
  );
  
  if (existingApproval) {
    existingApproval.approved = approved;
    existingApproval.comments = comments;
    existingApproval.approvedAt = new Date();
  } else {
    this.approvals.push({
      userId,
      approved,
      comments,
      approvedAt: new Date()
    });
  }
  
  return this.save();
};

// Auto-expire old pending requests
matchRequestSchema.pre('find', function() {
  this.where({
    $or: [
      { expiresAt: { $gte: new Date() } },
      { status: { $ne: REQUEST_STATUS.PENDING } }
    ]
  });
});

matchRequestSchema.pre('findOne', function() {
  this.where({
    $or: [
      { expiresAt: { $gte: new Date() } },
      { status: { $ne: REQUEST_STATUS.PENDING } }
    ]
  });
});

// Include virtuals when converting to JSON
matchRequestSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('MatchRequest', matchRequestSchema);
