# Frontend Integration Requirements for Hostel Dalali Backend Updates - Phase 2

## Overview
This document provides comprehensive integration specifications for Phase 2 backend implementation, ensuring perfect alignment between frontend and backend systems based on frontend developer requirements.

## 🚀 Backend Implementation Status & Frontend Coordination

### 1. Exchange Dashboard API Requirements ✅ IMPLEMENTED

#### Primary Endpoint (UPDATED TO MATCH FRONTEND)
```
GET /api/match-requests/dashboard
```
**Mapped to Frontend Expectation**: `GET /api/exchange-dashboard`

**Authentication**: JWT token required in Authorization header

**Current Backend Response** (matches `ExchangeDashboard` interface):
```json
{
  "statusCode": 200,
  "data": {
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
          "_id": "user_123",
          "fullName": "John Doe",
          "username": "john2021",
          "profilePicture": ""
        },
        "listingId": {
          "_id": "listing_456",
          "title": "HL-1 A/101 Single Room",
          "currentRoom": {
            "hostelName": "HL-1",
            "block": "A",
            "roomNumber": "101",
            "roomType": "Single"
          },
          "listedBy": "user_456"
        },
        "status": "pending",
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
  },
  "message": "Exchange dashboard retrieved successfully"
}
```

#### Enhanced Approval Endpoint ✅ IMPLEMENTED
```
POST /api/match-requests/:requestId/exchange-approve
```
**Mapped to Frontend Expectation**: `POST /api/exchange-requests/:requestId/approve`

**Request Body**:
```json
{
  "approved": true,
  "comments": "Optional approval comments"
}
```

**Response** (Room Swapping Support):
```json
{
  "statusCode": 200,
  "data": {
    "matchRequest": {
      "_id": "request_123",
      "status": "approved",
      "approvals": [...]
    },
    "swapCompleted": true
  },
  "message": "Request approved and room swap completed!"
}
```

### 2. Enhanced Room Listing API ✅ IMPLEMENTED

#### Trending Rooms with Pagination
```
GET /api/rooms/trending?page=1&limit=50
```
**Frontend Expected**: `GET /api/room-listings/trending?page=1&limit=10`

**Current Backend Response** (matches `TrendingListing` interface):
```json
{
  "statusCode": 200,
  "data": {
    "listings": [
      {
        "_id": "listing_123",
        "title": "Single in HL-1 (Boys) - Exchange",
        "description": "Well-maintained single room with good ventilation",
        "listedBy": {
          "_id": "user_456",
          "fullName": "Jane Smith",
          "username": "jane2021",
          "profilePicture": ""
        },
        "currentRoom": {
          "hostelName": "HL-2",
          "roomNumber": "301",
          "block": "C",
          "roomType": "Single",
          "floor": 3,
          "rent": 0
        },
        "desiredRoom": {
          "preferredHostels": [],
          "preferredRoomTypes": [],
          "preferredFloors": [],
          "amenityPreferences": [],
          "maxBudget": 0
        },
        "status": "Open",
        "urgency": "Medium",
        "availableFrom": "2025-07-19T18:02:00.000Z",
        "availableTill": "2025-08-17T18:02:00.000Z",
        "roomProofFile": "/uploads/roomProofFile-123.png",
        "interestedUsers": [],
        "interestCount": 8,
        "views": 156,
        "isActive": true,
        "tags": ["Exchange"],
        "genderPreference": "Male",
        "createdAt": "2025-07-15T14:20:00.000Z",
        "updatedAt": "2025-07-18T10:30:00.000Z",
        "__v": 0,
        "activeRequestsCount": 5,
        "approvedRequestsCount": 2,
        "trendingScore": 87.5
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalCount": 25,
      "hasMore": true
    }
  },
  "message": "Trending listings retrieved successfully"
}
```

#### Trending Score Calculation ✅ IMPLEMENTED
Backend calculates `trendingScore` using enhanced algorithm:
```javascript
trendingScore = (
  (interestCount * 2) + 
  (views * 0.1) + 
  (activeRequestsCount * 5) +
  (approvedRequestsCount * 10) +
  (recencyBonus based on creation date)
)
```

### 3. Attendance Tracker Fixes ✅ IMPLEMENTED

#### Enhanced Course Creation Endpoint
```
POST /api/attendance/courses
```
**Frontend Expected**: `POST /api/courses`

**Enhanced Validation & Logging**: ✅ Comprehensive validation implemented

## � Socket.IO Event Specifications ✅ IMPLEMENTED

### Backend Socket.IO Events (Already Implemented)
The backend emits these events to match frontend requirements:

#### Events Backend Emits:
```javascript
// Exchange completion event
io.to(`user_${userId}`).emit('exchangeCompleted', {
  requestId: matchRequest._id,
  message: `Your room exchange with ${otherUser.fullName} has been completed!`,
  newRoom: updatedRoom
});

// Request approval event  
io.to(`user_${userId}`).emit('requestApproved', {
  requestId: matchRequest._id,
  message: `${currentUserName} approved your room exchange request!`,
  swapCompleted: boolean
});

// Request rejection event
io.to(`user_${userId}`).emit('requestRejected', {
  requestId: matchRequest._id,
  message: `${currentUserName} rejected your room exchange request.`
});
```

#### Event Data Structures (Matches Frontend Interfaces):
```typescript
// Exchange Completed Event
interface ExchangeCompletedEvent {
  requestId: string;
  message: string;
  newRoom: {
    hostelName: string;
    block: string;
    roomNumber: string;
    roomType: string;
    floor: number;
    rent: number;
  };
}

// Request Approved Event
interface RequestApprovedEvent {
  requestId: string;
  message: string;
  swapCompleted: boolean;
}

// Request Rejected Event
interface RequestRejectedEvent {
  requestId: string;
  message: string;
}
```

## 🔀 API Route Mapping & Aliases

To ensure perfect frontend-backend alignment, we need to create route aliases:

### Current Backend Routes → Frontend Expected Routes

1. **Exchange Dashboard**:
   - Backend: `GET /api/match-requests/dashboard`
   - Frontend Expects: `GET /api/exchange-dashboard`
   - **Action Required**: Create route alias

2. **Exchange Approval**:
   - Backend: `POST /api/match-requests/:id/exchange-approve`
   - Frontend Expects: `POST /api/exchange-requests/:id/approve`
   - **Action Required**: Create route alias

3. **Trending Rooms**:
   - Backend: `GET /api/rooms/trending`
   - Frontend Expects: `GET /api/room-listings/trending`
   - **Action Required**: Create route alias

4. **Course Management**:
   - Backend: `POST /api/attendance/courses`
   - Frontend Expects: `POST /api/courses`
   - **Action Required**: Create route alias

## 📊 Data Structure Alignment

### Frontend Interface Compatibility ✅

#### ExchangeDashboard Interface (MATCHES BACKEND):
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

#### TrendingListing Interface (MATCHES BACKEND):
```typescript
export interface TrendingListing {
  _id: string;
  title: string;
  description: string;
  currentRoom: {
    hostelName: string;
    roomNumber: string;
    block: string;
    roomType: string;
    floor: number;
    rent: number;
  };
  desiredRoom: {
    preferredHostels: string[];
    preferredRoomTypes: string[];
    preferredFloors: number[];
    amenityPreferences: string[];
    maxBudget: number;
  };
  status: string;
  urgency: string;
  availableFrom: string;
  availableTill: string;
  roomProofFile: string;
  interestCount: number;
  views: number;
  isActive: boolean;
  tags: string[];
  genderPreference: string;
  createdAt: string;
  updatedAt: string;
  listedBy: {
    _id: string;
    fullName: string;
    username: string;
    profilePicture: string;
  };
  interestedUsers: any[];
  // NEW FIELDS
  activeRequestsCount: number;    // Number of active exchange requests
  approvedRequestsCount: number;  // Number of approved exchanges
  trendingScore: number;          // Calculated trending score
}
```

## 🔧 API Endpoint Summary

### New/Updated Endpoints:

1. **GET /api/rooms/trending** - Enhanced trending rooms with new fields
2. **GET /api/match-requests/dashboard** - Room exchange dashboard
3. **POST /api/match-requests/:id/exchange-approve** - Enhanced approval with room swap
4. **POST /api/attendance/courses** - Fixed course creation with better validation

### Response Format Updates:

#### Trending Rooms Response:
```json
{
  "statusCode": 200,
  "data": {
    "listings": [
      {
        "_id": "...",
        "title": "Single in HL-1 (Boys) - Exchange",
        // ... existing fields ...
        "activeRequestsCount": 3,
        "approvedRequestsCount": 1,
        "trendingScore": 25.4
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalCount": 75,
      "hasMore": true
    }
  }
}
```

#### Exchange Dashboard Response:
```json
{
  "statusCode": 200,
  "data": {
    "sentRequests": {
      "total": 5,
      "pending": 2,
      "approved": 2,
      "rejected": 1
    },
    "receivedRequests": {
      "total": 8,
      "pending": 3,
      "approved": 4,
      "rejected": 1
    },
    "approvedExchanges": 3,
    "totalActiveListings": 2,
    "recentActivity": [...],
    "summary": {
      "totalRequestsSent": 5,
      "totalRequestsReceived": 8,
      "totalApprovedExchanges": 3,
      "pendingAction": 5
    }
  }
}
```

## 🎯 Priority Implementation Order

1. **High Priority**:
   - Fix attendance tracker course creation form validation
   - Implement basic exchange dashboard
   - Update trending rooms API calls

2. **Medium Priority**:
   - Add real-time Socket.IO event handling for exchanges
   - Implement enhanced approval system with room swapping
   - Add trending score display to room cards

3. **Low Priority**:
   - Polish dashboard UI with charts/graphs
   - Add advanced filtering to trending rooms
   - Implement activity feed with rich interactions

## 🧪 Testing Guidelines

### Test Cases to Implement:

1. **Trending Rooms**:
   - Verify trending score calculation display
   - Test pagination with 50 items per page
   - Validate new fields in room cards

2. **Exchange Dashboard**:
   - Test dashboard statistics accuracy
   - Verify real-time updates via Socket.IO
   - Test approval flow with room swapping

3. **Attendance Tracker**:
   - Test course creation with all required fields
   - Validate form error handling
   - Test schedule and date validation

## 🚨 Breaking Changes & Migration

### Data Structure Changes:
- `TrendingListing` interface has new fields - update all components using trending rooms
- Exchange approval now returns `swapCompleted` boolean - update success handlers
- Course creation requires stricter validation - update form components

### Socket.IO Events:
Add handlers for new events: `exchangeCompleted`, `requestApproved`, `requestRejected`

## 📞 Backend Support

All endpoints include comprehensive logging. If you encounter issues:

1. Check browser network tab for detailed error responses
2. Backend logs include prefixed identifiers (e.g., `📈 [TRENDING-LISTINGS]`)
3. All validation errors include specific field names and requirements

## ✅ Completion Checklist

Frontend team should verify:

- [ ] Trending rooms displays new fields correctly
- [ ] Exchange dashboard shows all statistics
- [ ] Real-time updates work via Socket.IO
- [ ] Attendance tracker course creation validates properly
- [ ] Room swapping occurs automatically on dual approval
- [ ] Error handling works for all new endpoints
- [ ] UI reflects backend data structure changes
- [ ] Socket.IO event handlers implemented
- [ ] Form validation matches backend requirements
- [ ] Pagination works correctly for trending rooms

---

**Note**: All backend changes are backward compatible except for the new required fields in course creation. Existing functionality will continue to work while new features are being implemented.
