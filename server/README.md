# Hostel Dalali Backend

A comprehensive Node.js backend server for the Hostel Dalali room exchange platform.

## 🚀 Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **Room Listings**: Create, search, and manage room exchange listings
- **Match Requests**: Send and manage room swap requests between students
- **Real-time Messaging**: Socket.IO powered direct messaging and common chat
- **Event Management**: Create, join, and manage hostel events
- **Attendance Tracking**: Track attendance for events and activities
- **Friend System**: Send friend requests, manage friendships
- **AI Integration**: Gemini AI powered room suggestions and insights
- **File Uploads**: Secure file upload for room proofs and event images
- **Security**: Rate limiting, CORS, helmet security headers

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.IO
- **File Upload**: Multer
- **Security**: Helmet, CORS, Rate Limiting
- **AI**: Google Gemini AI API
- **Password Hashing**: bcryptjs

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd DALALIBACKEND
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database
   MONGODB_URI=mongodb://localhost:27017/hostel-dalali

   # JWT Secret
   JWT_SECRET=your-super-secret-jwt-key-here

   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:3000

   # Gemini AI API
   GEMINI_API_KEY=your-gemini-api-key-here

   # File Upload
   MAX_FILE_SIZE=5242880
   UPLOAD_PATH=uploads/
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Seed the database** (Optional)
   ```bash
   npm run seed
   ```

6. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 📁 Project Structure

```
DALALIBACKEND/
├── src/
│   ├── api/
│   │   ├── routes/           # API route definitions
│   │   ├── controllers/      # Business logic
│   │   └── index.js         # API router setup
│   ├── config/
│   │   ├── db.js            # Database connection
│   │   └── socket.js        # Socket.IO configuration
│   ├── middleware/
│   │   ├── auth.middleware.js    # Authentication middleware
│   │   ├── upload.middleware.js  # File upload middleware
│   │   └── error.middleware.js   # Error handling
│   ├── models/              # Mongoose schemas
│   ├── utils/
│   │   └── seed.js          # Database seeding script
│   └── app.js               # Express app configuration
├── uploads/                 # File upload directory
├── app.js                   # Server entry point
├── package.json
└── README.md
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/forgot-password` - Forgot password
- `POST /api/auth/reset-password` - Reset password

### Users
- `GET /api/users/profile` - Get user profile
- `PATCH /api/users/profile` - Update user profile
- `GET /api/users/search` - Search users
- `POST /api/users/avatar` - Upload avatar

### Room Listings
- `GET /api/rooms` - Get all room listings
- `POST /api/rooms` - Create room listing
- `GET /api/rooms/:id` - Get specific room listing
- `PATCH /api/rooms/:id` - Update room listing
- `DELETE /api/rooms/:id` - Delete room listing

### Match Requests
- `GET /api/matches` - Get match requests
- `POST /api/matches` - Create match request
- `PATCH /api/matches/:id/respond` - Respond to match request

### Messaging
- `GET /api/messages/conversations` - Get conversations
- `GET /api/messages/:userId` - Get messages with user
- `POST /api/messages` - Send message

### Events
- `GET /api/events` - Get events
- `POST /api/events` - Create event
- `POST /api/events/:id/join` - Join event

### AI Services
- `GET /api/ai/suggestions` - Get AI suggestions
- `POST /api/ai/analyze-room` - Analyze room listing
- `POST /api/ai/chat` - Chat with AI assistant

## 🔧 Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with sample data

### Environment Variables
All environment variables are documented in the installation section above.

### Database Models
- **User**: User accounts and profiles
- **RoomListing**: Room exchange listings
- **MatchRequest**: Room swap requests
- **DirectMessage**: Direct messages between users
- **CommonChatMessage**: Common chat messages
- **Event**: Hostel events
- **Course**: Academic courses
- **FriendRequest**: Friend requests
- **Attendance**: Event attendance tracking

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Rate limiting to prevent abuse
- CORS configuration
- Helmet security headers
- Input validation and sanitization
- File upload restrictions

## 🚀 Real-time Features

- Direct messaging between users
- Common chat for all hostel residents
- Real-time notifications for match requests
- Live event updates
- Online status tracking

## 📝 API Documentation

Visit `/api` endpoint when the server is running for complete API documentation and available endpoints.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please open an issue in the repository or contact the development team.

---

**Built with ❤️ for hostel students**
