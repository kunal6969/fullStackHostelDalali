# Backend Integration Guide - Phase 2: Exchange Dashboard & Enhanced Features

## Overview
This document provides comprehensive integration specifications for Phase 2 backend implementation, ensuring perfect alignment between frontend and backend systems.

## Table of Contents
1. [Exchange Dashboard API Requirements](#exchange-dashboard-api)
2. [Enhanced Room Listing API](#enhanced-room-listing-api)
3. [Socket.IO Event Specifications](#socketio-events)
4. [Data Structures & TypeScript Interfaces](#data-structures)
5. [API Endpoints Documentation](#api-endpoints)
6. [Authentication & Error Handling](#authentication)
7. [Testing Coordination](#testing)

---

## Exchange Dashboard API Requirements

### Primary Endpoint
```
GET /api/exchange-dashboard
```

**Authentication**: JWT token required in Authorization header

**Response Structure** (matches `ExchangeDashboard` interface):
```json
{
  "sentRequests": {
    "total": 15,
    "pending": 3,
    "approved": 8,
    "rejected": 4
  },
  "receivedRequests": {
    "total": 12,
    "pending": 5,
    "approved": 4,
    "rejected": 3
  },
  "approvedExchanges": 8,
  "totalActiveListings": 2,
  "recentActivity": [
    {
      "_id": "activity_id_123",
      "requesterId": {
        "id": "user_123",
        "fullName": "John Doe",
        "rollNumber": "2021UCS1234",
        "gender": "Male"
      },
      "listingId": {
        "id": "listing_456",
        "title": "HL-1 A/101 Single Room",
        "currentRoom": {
          "hostel": "HL-1",
          "block": "A",
          "roomNumber": "101",
          "type": "Single"
        }
      },
      "status": "Pending",
      "createdAt": "2025-07-18T10:30:00.000Z",
      "updatedAt": "2025-07-18T10:30:00.000Z",
      "isRequester": true,
      "isListingOwner": false,
      "actionType": "sent"
    }
  ],
  "summary": {
    "totalRequestsSent": 15,
    "totalRequestsReceived": 12,
    "totalApprovedExchanges": 8,
    "pendingAction": 8
  }
}
```

### Enhanced Approval Endpoint
```
POST /api/exchange-requests/:requestId/approve
```

**Request Body**:
```json
{
  "approved": true,
  "comments": "Optional approval comments",
  "swapRooms": true
}
```

**Response** (Room Swapping Support):
```json
{
  "success": true,
  "message": "Exchange request approved successfully",
  "swapCompleted": true,
  "updatedUsers": [
    {
      "userId": "user_123",
      "newRoom": {
        "hostel": "HL-2",
        "block": "B",
        "roomNumber": "205",
        "type": "Single"
      }
    },
    {
      "userId": "user_456",
      "newRoom": {
        "hostel": "HL-1",
        "block": "A",
        "roomNumber": "101",
        "type": "Single"
      }
    }
  ]
}
```

---

## Enhanced Room Listing API

### Trending Rooms with Pagination
```
GET /api/room-listings/trending?page=1&limit=10
```

**Response Structure** (matches `TrendingListing` interface):
```json
{
  "success": true,
  "listings": [
    {
      "id": "listing_123",
      "listedBy": {
        "id": "user_456",
        "fullName": "Jane Smith",
        "rollNumber": "2021UCS5678",
        "gender": "Female"
      },
      "roomDetails": {
        "hostel": "HL-2",
        "block": "C",
        "roomNumber": "301",
        "type": "Single"
      },
      "listingType": "Exchange",
      "description": "Well-maintained single room with good ventilation",
      "desiredTradeConditions": "Looking for HL-1 or HL-3 rooms",
      "status": "Open",
      "createdAt": "2025-07-15T14:20:00.000Z",
      "interestCount": 8,
      "activeRequestsCount": 5,
      "approvedRequestsCount": 2,
      "trendingScore": 87.5,
      "views": 156
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalCount": 25,
    "hasMore": true
  }
}
```

### Trending Score Calculation
Backend should calculate `trendingScore` using this algorithm:
```javascript
trendingScore = (
  (activeRequestsCount * 3) + 
  (approvedRequestsCount * 5) + 
  (views * 0.1) + 
  (interestCount * 2) +
  (hoursAgo < 24 ? 20 : hoursAgo < 72 ? 10 : 0)
)
```

---

## Socket.IO Event Specifications

### Events Frontend Listens For
```javascript
// Exchange completion event
socket.on('exchangeCompleted', (data) => {
  // data: { exchangeId, participantIds, rooms }
});

// Request approval event
socket.on('requestApproved', (data) => {
  // data: { requestId, requesterId, listingId, swapCompleted }
});

// Request rejection event  
socket.on('requestRejected', (data) => {
  // data: { requestId, requesterId, listingId, reason }
});
```

### Event Data Structures
```typescript
// Exchange Completed Event
interface ExchangeCompletedEvent {
  exchangeId: string;
  participantIds: string[];
  rooms: {
    [userId: string]: {
      hostel: string;
      block: string;
      roomNumber: string;
      type: string;
    }
  };
  completedAt: string;
}

// Request Approved Event
interface RequestApprovedEvent {
  requestId: string;
  requesterId: string;
  listingId: string;
  approverId: string;
  swapCompleted: boolean;
  approvedAt: string;
}

// Request Rejected Event
interface RequestRejectedEvent {
  requestId: string;
  requesterId: string;
  listingId: string;
  rejectedBy: string;
  reason?: string;
  rejectedAt: string;
}
```

---

## Data Structures & TypeScript Interfaces

### Core Interfaces Used by Frontend

#### ExchangeDashboard Interface
```typescript
export interface ExchangeDashboard {
  sentRequests: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  receivedRequests: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  approvedExchanges: number;
  totalActiveListings: number;
  recentActivity: ExchangeActivity[];
  summary: {
    totalRequestsSent: number;
    totalRequestsReceived: number;
    totalApprovedExchanges: number;
    pendingAction: number;
  };
}
```

#### ExchangeActivity Interface
```typescript
export interface ExchangeActivity {
  _id: string;
  requesterId: {
    id: string;
    fullName: string;
    rollNumber: string;
    gender: string;
  };
  listingId: {
    id: string;
    title: string;
    currentRoom: {
      hostel: string;
      block: string;
      roomNumber: string;
      type: string;
    };
  };
  status: 'Pending' | 'Approved' | 'Rejected' | 'Confirmed';
  createdAt: string;
  updatedAt: string;
  isRequester: boolean;
  isListingOwner: boolean;
  actionType: 'sent' | 'received';
}
```

#### TrendingListing Interface
```typescript
export interface TrendingListing extends RoomListing {
  activeRequestsCount: number;    // Number of active exchange requests
  approvedRequestsCount: number;  // Number of approved exchanges
  trendingScore: number;          // Calculated trending score
  views: number;                  // Number of views
}
```

#### Enhanced CourseFormData (Attendance Tracker)
```typescript
export interface CourseFormData {
  courseName: string;        // Required
  courseCode: string;        // Required  
  instructor: string;        // Required
  semester: string;          // Required
  academicYear: string;      // Required
  credits: number;           // Required (1-10)
  schedule: ScheduleItem[];  // Optional but validate if provided
  startDate: string;         // Required (YYYY-MM-DD)
  endDate: string;           // Required (YYYY-MM-DD)
  description?: string;      // Optional
  color?: string;            // Optional (hex format)
  reminders?: {
    enabled: boolean;
    minutesBefore: number;
  };
}

export interface ScheduleItem {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string;     // Format: HH:MM
  endTime: string;       // Format: HH:MM
  venue?: string;
}
```

---

## API Endpoints Documentation

### Exchange Dashboard Endpoints
```
GET    /api/exchange-dashboard           # Get dashboard statistics
POST   /api/exchange-requests/:id/approve # Approve/reject exchange request
```

### Enhanced Room Listing Endpoints
```
GET    /api/room-listings/trending       # Get trending rooms with pagination
PUT    /api/room-listings/:id/view       # Increment view count
```

### Enhanced Attendance Tracker Endpoints
```
POST   /api/courses                      # Create course with enhanced validation
PUT    /api/courses/:id                  # Update course
GET    /api/courses                      # Get user's courses
DELETE /api/courses/:id                  # Delete course
```

---

## Authentication & Error Handling

### JWT Token Usage
All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid course data provided",
    "details": {
      "field": "credits",
      "issue": "Credits must be between 1 and 10"
    }
  }
}
```

### Standard Success Response Format
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully"
}
```

---

## Frontend Service Integration

### Frontend Services That Will Call Backend

#### exchangeDashboardService.ts
```typescript
// File: services/exchangeDashboardService.ts
export const fetchExchangeDashboard = async (): Promise<ExchangeDashboard>
export const approveExchangeRequest = async (requestId: string, approved: boolean, comments?: string)
```

#### roomListingService.ts (Enhanced)
```typescript
// File: services/roomListingService.ts  
export const getTrendingListings = async (page: number = 1, limit: number = 10): Promise<{ listings: TrendingListing[]; pagination: PaginationInfo; }>
```

#### attendanceService.ts (Enhanced)
```typescript
// File: services/attendanceService.ts
export const createCourse = async (courseData: CourseFormData): Promise<Course>
export const updateCourse = async (courseId: string, courseData: Partial<CourseFormData>): Promise<Course>
```

#### socketService.ts (Enhanced)
```typescript
// File: services/socketService.ts
export const onExchangeCompleted = (callback: (data: ExchangeCompletedEvent) => void): () => void
export const onRequestApproved = (callback: (data: RequestApprovedEvent) => void): () => void
export const onRequestRejected = (callback: (data: RequestRejectedEvent) => void): () => void
```

---

## Frontend Pages That Need Backend Integration

### ExchangeDashboardPage.tsx
- **Route**: `/exchange-dashboard`
- **API Calls**: 
  - `GET /api/exchange-dashboard` on component mount
  - `POST /api/exchange-requests/:id/approve` for request actions
- **Real-time**: Listens for exchange events via Socket.IO
- **UI Features**: Statistics cards, activity feed, approval workflow

### TrendingRoomsPage.tsx (Enhanced)
- **Route**: `/trending-rooms`  
- **API Calls**:
  - `GET /api/room-listings/trending?page=X&limit=Y`
- **UI Features**: Trending score badges, pagination, enhanced metrics

### AttendanceTrackerPage.tsx (Enhanced)
- **Route**: `/attendance-tracker`
- **API Calls**:
  - `POST /api/courses` with enhanced validation
  - `PUT /api/courses/:id` for updates
- **UI Features**: Enhanced course creation form, validation

---

## Database Schema Considerations

### Exchange Requests Collection
```javascript
{
  _id: ObjectId,
  requesterId: ObjectId,      // References User
  listingId: ObjectId,        // References RoomListing  
  status: String,             // 'Pending' | 'Approved' | 'Rejected' | 'Confirmed'
  createdAt: Date,
  updatedAt: Date,
  approvals: [ObjectId],      // Array of user IDs who approved
  comments: String,           // Optional approval/rejection comments
  swapCompleted: Boolean      // Whether room swap was executed
}
```

### Enhanced Room Listings Collection
```javascript
{
  _id: ObjectId,
  // ...existing fields...
  views: Number,              // Track view count
  activeRequestsCount: Number, // Cache for performance
  approvedRequestsCount: Number,
  trendingScore: Number,      // Calculated field
  lastViewedAt: Date
}
```

### Enhanced Courses Collection (Attendance Tracker)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  courseName: String,
  courseCode: String,
  instructor: String,
  semester: String,
  academicYear: String,
  credits: Number,            // 1-10 validation
  schedule: [{
    day: String,
    startTime: String,        // HH:MM format
    endTime: String,
    venue: String
  }],
  startDate: Date,            // Course start date
  endDate: Date,              // Course end date
  description: String,
  color: String,              // Hex color
  reminders: {
    enabled: Boolean,
    minutesBefore: Number
  },
  attendedDays: [Date],
  missedDays: [Date],
  createdAt: Date,
  updatedAt: Date
}
```

---

## Socket.IO Room Management

### Room Joining Strategy
```javascript
// User joins their personal room
socket.join(`user_${userId}`);

// User joins exchange-related rooms
socket.join(`exchange_dashboard_${userId}`);
socket.join(`requests_${userId}`);
```

### Event Emission Patterns
```javascript
// Notify specific user of exchange completion
io.to(`user_${userId}`).emit('exchangeCompleted', data);

// Notify both parties of request approval
io.to(`user_${requesterId}`).emit('requestApproved', data);
io.to(`user_${listingOwnerId}`).emit('requestApproved', data);
```

---

## Testing Coordination

### API Testing Endpoints
1. **Exchange Dashboard**: `GET /api/exchange-dashboard`
2. **Trending Rooms**: `GET /api/room-listings/trending?page=1&limit=10`
3. **Enhanced Approval**: `POST /api/exchange-requests/:id/approve`
4. **Enhanced Courses**: `POST /api/courses` (with full validation)

### Socket.IO Testing Events
1. Emit `exchangeCompleted` event to test real-time updates
2. Emit `requestApproved` event to test dashboard refresh
3. Emit `requestRejected` event to test activity feed updates

### Test Data Requirements
- Create test users with exchange history
- Generate test room listings with trending metrics
- Create test exchange requests in various states
- Populate test courses with enhanced data structure

---

## Deployment Considerations

### Environment Variables
```bash
# Socket.IO Configuration
SOCKET_IO_CORS_ORIGIN=http://localhost:5173
SOCKET_IO_TRANSPORTS=websocket,polling

# Exchange Dashboard Settings
EXCHANGE_DASHBOARD_CACHE_TTL=300
TRENDING_SCORE_UPDATE_INTERVAL=3600

# Course Validation Settings
MAX_COURSE_CREDITS=10
MIN_COURSE_CREDITS=1
```

### Performance Optimizations
1. **Cache trending scores** (update hourly)
2. **Index exchange requests** by userId and status
3. **Paginate activity feeds** (limit 20 items)
4. **Optimize Socket.IO rooms** for real-time events

---

## Frontend Integration Files Summary

### Key Files Modified/Created
```
services/
├── exchangeDashboardService.ts     # NEW - Exchange dashboard API
├── socketService.ts               # ENHANCED - Added exchange events  
├── roomListingService.ts          # ENHANCED - Added trending pagination
└── attendanceService.ts           # ENHANCED - Added course validation

pages/
├── ExchangeDashboardPage.tsx      # NEW - Complete dashboard UI
├── TrendingRoomsPage.tsx          # ENHANCED - Added trending metrics
└── AttendanceTrackerPage.tsx      # ENHANCED - Added validation

types.ts                           # ENHANCED - Added Phase 2 interfaces
App.tsx                           # ENHANCED - Added exchange dashboard route
```

### Navigation Integration
- New route: `/exchange-dashboard`
- Navigation menu item: "Exchange" with HandshakeIcon
- Protected route with authentication

---

This integration guide ensures perfect alignment between frontend and backend systems for Phase 2 implementation. All data structures, API contracts, and Socket.IO events are precisely defined to avoid any integration issues.

**Next Steps**: 
1. Backend dev implements APIs matching these exact specifications
2. Frontend testing with mock data can begin immediately
3. Real-time Socket.IO events testing once backend is ready
4. End-to-end integration testing with full data flow
