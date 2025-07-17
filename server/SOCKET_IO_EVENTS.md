# Socket.IO Events Documentation

## Connection Setup

```javascript
import io from 'socket.io-client';

// Connect to main namespace
const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('authToken') // JWT token
  }
});

// Connect to direct messages namespace
const dmSocket = io('http://localhost:5000/direct-messages', {
  auth: {
    token: localStorage.getItem('authToken')
  }
});

// Connect to common chat namespace
const commonChatSocket = io('http://localhost:5000/common-chat', {
  auth: {
    token: localStorage.getItem('authToken')
  }
});
```

## Authentication Events

### Client → Server
```javascript
// Authenticate after connection
socket.emit('authenticate', { token: 'your-jwt-token' });
```

### Server → Client
```javascript
// Authentication success
socket.on('authenticated', (data) => {
  console.log('Authenticated successfully:', data);
});

// Authentication failure
socket.on('auth_error', (error) => {
  console.error('Authentication failed:', error);
});
```

## Exchange Request Events (Main Namespace)

### Server → Client
```javascript
// When an exchange request is completed (both parties approved)
socket.on('exchangeCompleted', (data) => {
  /*
  data = {
    exchangeId: 'request-id',
    message: 'Exchange completed successfully',
    participants: {
      requester: { userId: 'id', name: 'name', newRoom: 'room-details' },
      receiver: { userId: 'id', name: 'name', newRoom: 'room-details' }
    },
    timestamp: '2024-01-01T00:00:00.000Z'
  }
  */
  console.log('Exchange completed:', data);
  // Update UI to show success message
  // Refresh room listings if needed
  // Update user's current room information
});

// When an exchange request is approved by one party
socket.on('requestApproved', (data) => {
  /*
  data = {
    requestId: 'request-id',
    approvedBy: { userId: 'id', name: 'name' },
    message: 'Request approved by [name]',
    status: 'approved_by_one', // or 'completed' if both approved
    timestamp: '2024-01-01T00:00:00.000Z'
  }
  */
  console.log('Request approved:', data);
  // Show notification to user
  // Update exchange dashboard if open
});

// When an exchange request is rejected
socket.on('requestRejected', (data) => {
  /*
  data = {
    requestId: 'request-id',
    rejectedBy: { userId: 'id', name: 'name' },
    message: 'Request rejected by [name]',
    timestamp: '2024-01-01T00:00:00.000Z'
  }
  */
  console.log('Request rejected:', data);
  // Show notification to user
  // Update exchange dashboard if open
});
```

## Direct Messages Events (/direct-messages namespace)

### Client → Server
```javascript
// Send a direct message
dmSocket.emit('sendMessage', {
  receiverId: 'recipient-user-id',
  content: 'Message content',
  type: 'text' // or 'image', 'file'
});

// Join a conversation
dmSocket.emit('joinConversation', {
  conversationId: 'conversation-id'
});

// Mark messages as read
dmSocket.emit('markAsRead', {
  conversationId: 'conversation-id'
});
```

### Server → Client
```javascript
// Receive a new direct message
dmSocket.on('newMessage', (message) => {
  /*
  message = {
    _id: 'message-id',
    sender: { _id: 'user-id', firstName: 'John', lastName: 'Doe' },
    receiver: { _id: 'user-id', firstName: 'Jane', lastName: 'Smith' },
    content: 'Message content',
    type: 'text',
    timestamp: '2024-01-01T00:00:00.000Z',
    read: false
  }
  */
  console.log('New message received:', message);
  // Add message to conversation UI
  // Show notification if conversation not active
});

// Message delivery confirmation
dmSocket.on('messageDelivered', (data) => {
  console.log('Message delivered:', data);
  // Update message status in UI
});

// User typing indicator
dmSocket.on('userTyping', (data) => {
  console.log('User typing:', data);
  // Show typing indicator in UI
});

// User stopped typing
dmSocket.on('userStoppedTyping', (data) => {
  console.log('User stopped typing:', data);
  // Hide typing indicator in UI
});
```

## Common Chat Events (/common-chat namespace)

### Client → Server
```javascript
// Send a message to common chat
commonChatSocket.emit('sendMessage', {
  content: 'Message content',
  type: 'text' // or 'image', 'file'
});

// Join common chat room
commonChatSocket.emit('joinRoom', {
  roomId: 'common-chat'
});
```

### Server → Client
```javascript
// Receive a new common chat message
commonChatSocket.on('newMessage', (message) => {
  /*
  message = {
    _id: 'message-id',
    sender: { _id: 'user-id', firstName: 'John', lastName: 'Doe' },
    content: 'Message content',
    type: 'text',
    timestamp: '2024-01-01T00:00:00.000Z'
  }
  */
  console.log('New common chat message:', message);
  // Add message to common chat UI
});

// User joined common chat
commonChatSocket.on('userJoined', (data) => {
  console.log('User joined common chat:', data);
  // Update online users list
});

// User left common chat
commonChatSocket.on('userLeft', (data) => {
  console.log('User left common chat:', data);
  // Update online users list
});
```

## Connection Events

### Client → Server
```javascript
// Handle connection
socket.on('connect', () => {
  console.log('Connected to server');
  // Authenticate user
  socket.emit('authenticate', { token: localStorage.getItem('authToken') });
});

// Handle disconnection
socket.on('disconnect', (reason) => {
  console.log('Disconnected from server:', reason);
  // Show offline indicator
  // Attempt to reconnect if needed
});

// Handle connection errors
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  // Handle authentication errors
  if (error.message === 'Authentication failed') {
    // Redirect to login page
  }
});
```

## Error Handling

```javascript
// General error handler
socket.on('error', (error) => {
  console.error('Socket error:', error);
  // Show error message to user
  // Handle specific error types
});

// Namespace-specific error handlers
dmSocket.on('error', (error) => {
  console.error('Direct messages error:', error);
});

commonChatSocket.on('error', (error) => {
  console.error('Common chat error:', error);
});
```

## Best Practices

1. **Always authenticate after connecting**
2. **Handle connection errors gracefully**
3. **Store socket instances in React context or state management**
4. **Clean up event listeners when components unmount**
5. **Show appropriate loading/offline states**
6. **Implement retry logic for failed message sends**

## Example React Hook

```javascript
import { useEffect, useContext } from 'react';
import io from 'socket.io-client';

export const useSocket = () => {
  const { user, token } = useContext(AuthContext);
  
  useEffect(() => {
    if (!token) return;
    
    const socket = io('http://localhost:5000', {
      auth: { token }
    });
    
    socket.on('connect', () => {
      console.log('Connected to server');
    });
    
    socket.on('exchangeCompleted', (data) => {
      // Handle exchange completion
      showNotification('Exchange completed successfully!');
    });
    
    return () => {
      socket.disconnect();
    };
  }, [token]);
};
```
