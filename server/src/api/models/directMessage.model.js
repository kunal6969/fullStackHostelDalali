const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RoomListing',
    required: false
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  },
  attachments: [{
    url: String,
    type: String,
    name: String,
    size: Number
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
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
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DirectMessage'
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
directMessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
directMessageSchema.index({ receiverId: 1, isRead: 1 });
directMessageSchema.index({ listingId: 1, createdAt: -1 });

// Compound index for conversation queries
directMessageSchema.index({
  $or: [
    { senderId: 1, receiverId: 1 },
    { senderId: 1, receiverId: 1 }
  ]
});

// Virtual to create conversation identifier
directMessageSchema.virtual('conversationId').get(function() {
  const ids = [this.senderId.toString(), this.receiverId.toString()].sort();
  return ids.join('_');
});

// Method to mark message as read
directMessageSchema.methods.markAsRead = function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
};

// Static method to get conversation between two users
directMessageSchema.statics.getConversation = function(userId1, userId2, page = 1, limit = 50) {
  return this.find({
    $or: [
      { senderId: userId1, receiverId: userId2 },
      { senderId: userId2, receiverId: userId1 }
    ],
    isDeleted: false
  })
  .populate('senderId', 'fullName username profilePicture')
  .populate('receiverId', 'fullName username profilePicture')
  .populate('listingId', 'title')
  .populate('replyTo', 'message senderId')
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit);
};

// Static method to get unread count for a user
directMessageSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    receiverId: userId,
    isRead: false,
    isDeleted: false
  });
};

// Include virtuals when converting to JSON
directMessageSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('DirectMessage', directMessageSchema);
