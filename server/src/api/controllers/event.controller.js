const Event = require('../models/event.model');
const User = require('../models/user.model');
const ApiError = require('../../utils/apiError');
const ApiResponse = require('../../utils/apiResponse');
const { EVENT_STATUS } = require('../../utils/constants');
const { emitToUser, broadcast } = require('../../config/socket');

// Get all approved events
const getEvents = async (req, res, next) => {
  try {
    console.log(`📝 [EVENTS] GET /api/events - Request started`);
    const { 
      page = 1, 
      limit = 20, 
      eventType, 
      upcoming = true,
      featured,
      search 
    } = req.query;

    console.log(`📝 [EVENTS] Query parameters:`, { 
      page, limit, eventType, upcoming, featured, search 
    });

    // Build filter
    const filter = {
      status: EVENT_STATUS.APPROVED
    };

    if (eventType) {
      filter.eventType = eventType;
      console.log(`📝 [EVENTS] Applied event type filter: ${eventType}`);
    }

    if (featured === 'true') {
      filter.isFeatured = true;
      console.log(`📝 [EVENTS] Applied featured filter`);
    }

    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { 'organizer.name': new RegExp(search, 'i') }
      ];
      console.log(`📝 [EVENTS] Applied search filter: ${search}`);
    }

    // Filter for upcoming events
    if (upcoming === 'true') {
      filter.startDate = { $gte: new Date() };
      console.log(`📝 [EVENTS] Applied upcoming events filter`);
    }

    console.log(`📝 [EVENTS] Final filter:`, JSON.stringify(filter, null, 2));

    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log(`📝 [EVENTS] Pagination: page ${page}, limit ${limit}, skip ${skip}`);

    console.log(`📝 [EVENTS] Executing database query...`);
    const events = await Event.find(filter)
      .populate('submittedBy', 'fullName username profilePicture')
      .populate('approvedBy', 'fullName username')
      .populate('registeredUsers.userId', 'fullName username profilePicture')
      .populate('likes', 'fullName username')
      .populate('comments.userId', 'fullName username profilePicture')
      .sort({ isFeatured: -1, startDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Event.countDocuments(filter);

    // Check if current user is registered for each event
    const enrichedEvents = events.map(event => {
      const eventObj = event.toObject();
      if (req.user) {
        eventObj.isRegistered = event.registeredUsers.some(reg => 
          reg.userId._id.toString() === req.user._id.toString()
        );
        eventObj.isLiked = event.likes.some(userId => 
          userId.toString() === req.user._id.toString()
        );
      } else {
        eventObj.isRegistered = false;
        eventObj.isLiked = false;
      }
      return eventObj;
    });

    res.status(200).json(
      new ApiResponse(200, {
        events: enrichedEvents,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasMore: parseInt(page) * parseInt(limit) < totalCount
        }
      }, 'Events retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Submit new event for approval
const submitEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      eventType,
      venue,
      startDate,
      endDate,
      startTime,
      endTime,
      organizer,
      maxParticipants = 0,
      registrationDeadline,
      requirements = '',
      prizes = '',
      tags = []
    } = req.body;

    // Validate required fields
    const requiredFields = {
      title, description, eventType, venue, startDate, endDate, startTime, endTime, organizer
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate organizer object
    if (!organizer.name || !organizer.contact || !organizer.email) {
      throw new ApiError(400, 'Organizer name, contact, and email are required');
    }

    // Validate dates
    const eventStartDate = new Date(startDate);
    const eventEndDate = new Date(endDate);
    const now = new Date();

    if (eventStartDate < now) {
      throw new ApiError(400, 'Event start date cannot be in the past');
    }

    if (eventEndDate < eventStartDate) {
      throw new ApiError(400, 'Event end date must be after start date');
    }

    // Validate event type
    const validEventTypes = ['Academic', 'Sports', 'Cultural', 'Technical', 'Social', 'Workshop', 'Seminar', 'Other'];
    if (!validEventTypes.includes(eventType)) {
      throw new ApiError(400, 'Invalid event type');
    }

    // Validate max participants
    if (maxParticipants < 0) {
      throw new ApiError(400, 'Max participants cannot be negative');
    }

    // Create new event
    const newEvent = new Event({
      title: title.trim(),
      description: description.trim(),
      eventType,
      venue: venue.trim(),
      startDate: eventStartDate,
      endDate: eventEndDate,
      startTime,
      endTime,
      submittedBy: req.user._id,
      organizer: {
        name: organizer.name.trim(),
        contact: organizer.contact.trim(),
        email: organizer.email.trim()
      },
      maxParticipants: parseInt(maxParticipants),
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : undefined,
      requirements: requirements.trim(),
      prizes: prizes.trim(),
      tags: tags.filter(tag => tag.trim()).map(tag => tag.trim()),
      status: EVENT_STATUS.PENDING
    });

    await newEvent.save();

    // Populate for response
    await newEvent.populate('submittedBy', 'fullName username profilePicture');

    // TODO: Send notification to admins for approval
    // For now, just broadcast to all users that a new event was submitted
    broadcast('eventSubmitted', {
      event: newEvent,
      message: `New event "${newEvent.title}" submitted for approval`
    });

    res.status(201).json(
      new ApiResponse(201, newEvent, 'Event submitted for approval successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Register/Unregister for an event
const toggleEventRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const event = await Event.findById(id);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    // Check if event is approved
    if (event.status !== EVENT_STATUS.APPROVED) {
      throw new ApiError(400, 'Cannot register for unapproved event');
    }

    // Check if registration is still open
    if (!event.canRegister) {
      throw new ApiError(400, 'Registration is closed for this event');
    }

    // Check if user is already registered
    const existingRegistration = event.registeredUsers.find(reg => 
      reg.userId.toString() === userId.toString()
    );

    if (existingRegistration) {
      // Unregister user
      await event.unregisterUser(userId);
      
      res.status(200).json(
        new ApiResponse(200, {
          event,
          isRegistered: false,
          registrationCount: event.registeredUsers.length
        }, 'Successfully unregistered from event')
      );
    } else {
      // Register user
      await event.registerUser(userId);
      
      // Send notification to event organizer
      emitToUser(event.submittedBy.toString(), 'eventRegistration', {
        eventId: event._id,
        eventTitle: event.title,
        userName: req.user.fullName,
        message: `${req.user.fullName} registered for your event "${event.title}"`
      });
      
      res.status(200).json(
        new ApiResponse(200, {
          event,
          isRegistered: true,
          registrationCount: event.registeredUsers.length
        }, 'Successfully registered for event')
      );
    }
  } catch (error) {
    next(error);
  }
};

// Get event by ID
const getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id)
      .populate('submittedBy', 'fullName username profilePicture phoneNumber')
      .populate('approvedBy', 'fullName username')
      .populate('registeredUsers.userId', 'fullName username profilePicture')
      .populate('likes', 'fullName username')
      .populate('comments.userId', 'fullName username profilePicture');

    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    // Increment view count
    event.views += 1;
    await event.save();

    // Check user's relationship with this event
    let userRelation = {
      isRegistered: false,
      isLiked: false,
      isOwner: false
    };

    if (req.user) {
      userRelation.isRegistered = event.registeredUsers.some(reg => 
        reg.userId._id.toString() === req.user._id.toString()
      );
      userRelation.isLiked = event.likes.some(userId => 
        userId.toString() === req.user._id.toString()
      );
      userRelation.isOwner = event.submittedBy._id.toString() === req.user._id.toString();
    }

    const eventObj = event.toObject();
    eventObj.userRelation = userRelation;

    res.status(200).json(
      new ApiResponse(200, eventObj, 'Event retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Like/Unlike an event
const toggleEventLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const event = await Event.findById(id);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    const isLiked = event.likes.includes(userId);
    
    if (isLiked) {
      // Unlike
      event.likes.pull(userId);
    } else {
      // Like
      event.likes.push(userId);
    }

    await event.save();

    res.status(200).json(
      new ApiResponse(200, {
        eventId: event._id,
        isLiked: !isLiked,
        likesCount: event.likes.length
      }, `Event ${isLiked ? 'unliked' : 'liked'} successfully`)
    );
  } catch (error) {
    next(error);
  }
};

// Add comment to an event
const addEventComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user._id;

    if (!comment || comment.trim().length === 0) {
      throw new ApiError(400, 'Comment cannot be empty');
    }

    if (comment.length > 300) {
      throw new ApiError(400, 'Comment cannot exceed 300 characters');
    }

    const event = await Event.findById(id);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    // Add comment
    event.comments.push({
      userId,
      comment: comment.trim(),
      createdAt: new Date()
    });

    await event.save();

    // Populate the new comment
    await event.populate('comments.userId', 'fullName username profilePicture');

    // Get the newly added comment
    const newComment = event.comments[event.comments.length - 1];

    res.status(201).json(
      new ApiResponse(201, newComment, 'Comment added successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Get user's events (submitted by user)
const getUserEvents = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user._id;

    const filter = { submittedBy: userId };
    
    if (status && Object.values(EVENT_STATUS).includes(status)) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const events = await Event.find(filter)
      .populate('approvedBy', 'fullName username')
      .populate('registeredUsers.userId', 'fullName username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Event.countDocuments(filter);

    res.status(200).json(
      new ApiResponse(200, {
        events,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasMore: parseInt(page) * parseInt(limit) < totalCount
        }
      }, 'User events retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Get user's registered events
const getRegisteredEvents = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, upcoming = true } = req.query;
    const userId = req.user._id;

    const filter = {
      'registeredUsers.userId': userId,
      status: EVENT_STATUS.APPROVED
    };

    if (upcoming === 'true') {
      filter.startDate = { $gte: new Date() };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const events = await Event.find(filter)
      .populate('submittedBy', 'fullName username profilePicture')
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Event.countDocuments(filter);

    res.status(200).json(
      new ApiResponse(200, {
        events,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasMore: parseInt(page) * parseInt(limit) < totalCount
        }
      }, 'Registered events retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEvents,
  submitEvent,
  toggleEventRegistration,
  getEventById,
  toggleEventLike,
  addEventComment,
  getUserEvents,
  getRegisteredEvents
};
