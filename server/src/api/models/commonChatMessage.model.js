const mongoose = require('mongoose');
const { MESSAGE_TYPE } = require('../../utils/constants');

// Poll option schema
const pollOptionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    maxlength: 100
  },
  votes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],
  voteCount: {
    type: Number,
    default: 0
  }
}, { _id: false });

const commonChatMessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return !this.isAnonymous;
    }
  },
  senderName: {
    type: String,
    required: function() {
      return this.isAnonymous;
    }
  },
  type: {
    type: String,
    enum: Object.values(MESSAGE_TYPE),
    required: true
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  // For poll messages
  pollOptions: [pollOptionSchema],
  pollQuestion: {
    type: String,
    maxlength: 200
  },
  pollExpiresAt: {
    type: Date
  },
  allowMultipleVotes: {
    type: Boolean,
    default: false
  },
  // For image messages
  imageUrl: {
    type: String
  },
  imageCaption: {
    type: String,
    maxlength: 200
  },
  // Message metadata
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reaction: {
      type: String,
      required: true
    },
    reactedAt: {
      type: Date,
      default: Date.now
    }
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommonChatMessage'
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  pinnedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
commonChatMessageSchema.index({ createdAt: -1 });
commonChatMessageSchema.index({ senderId: 1, createdAt: -1 });
commonChatMessageSchema.index({ type: 1, createdAt: -1 });
commonChatMessageSchema.index({ isPinned: 1, pinnedAt: -1 });
commonChatMessageSchema.index({ isDeleted: 1 });

// Update poll option vote counts
pollOptionSchema.pre('save', function() {
  this.voteCount = this.votes.length;
});

// Virtual for total poll votes
commonChatMessageSchema.virtual('totalVotes').get(function() {
  if (this.type !== MESSAGE_TYPE.POLL || !this.pollOptions) return 0;
  return this.pollOptions.reduce((total, option) => total + option.voteCount, 0);
});

// Virtual for poll status
commonChatMessageSchema.virtual('pollStatus').get(function() {
  if (this.type !== MESSAGE_TYPE.POLL) return null;
  
  const now = new Date();
  if (this.pollExpiresAt && now > this.pollExpiresAt) {
    return 'expired';
  }
  return 'active';
});

// Method to add vote to poll
commonChatMessageSchema.methods.addVote = function(userId, optionIndex) {
  if (this.type !== MESSAGE_TYPE.POLL) {
    throw new Error('Cannot vote on non-poll message');
  }
  
  if (!this.pollOptions[optionIndex]) {
    throw new Error('Invalid poll option');
  }
  
  // Check if poll is expired
  if (this.pollExpiresAt && new Date() > this.pollExpiresAt) {
    throw new Error('Poll has expired');
  }
  
  // Remove existing votes if not allowing multiple votes
  if (!this.allowMultipleVotes) {
    this.pollOptions.forEach(option => {
      option.votes = option.votes.filter(vote => 
        vote.userId.toString() !== userId.toString()
      );
    });
  }
  
  // Check if user already voted for this option
  const existingVote = this.pollOptions[optionIndex].votes.find(vote =>
    vote.userId.toString() === userId.toString()
  );
  
  if (existingVote) {
    // Remove vote (toggle)
    this.pollOptions[optionIndex].votes = this.pollOptions[optionIndex].votes.filter(vote =>
      vote.userId.toString() !== userId.toString()
    );
  } else {
    // Add vote
    this.pollOptions[optionIndex].votes.push({
      userId,
      votedAt: new Date()
    });
  }
  
  // Update vote counts
  this.pollOptions.forEach(option => {
    option.voteCount = option.votes.length;
  });
  
  return this.save();
};

// Method to add reaction
commonChatMessageSchema.methods.addReaction = function(userId, reaction) {
  // Remove existing reaction from user
  this.reactions = this.reactions.filter(r => 
    r.userId.toString() !== userId.toString()
  );
  
  // Add new reaction
  this.reactions.push({
    userId,
    reaction,
    reactedAt: new Date()
  });
  
  return this.save();
};

// Method to remove reaction
commonChatMessageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(r => 
    r.userId.toString() !== userId.toString()
  );
  
  return this.save();
};

// Static method to get recent messages
commonChatMessageSchema.statics.getRecentMessages = function(limit = 50, page = 1) {
  return this.find({ isDeleted: false })
    .populate('senderId', 'fullName username profilePicture')
    .populate('replyTo', 'content senderId type')
    .populate('reactions.userId', 'fullName username')
    .sort({ isPinned: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// Include virtuals when converting to JSON
commonChatMessageSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('CommonChatMessage', commonChatMessageSchema);
