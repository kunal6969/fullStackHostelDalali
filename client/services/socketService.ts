import { io, Socket } from 'socket.io-client';
import { DirectMessage, CommonChatMessage, User } from '../types';
import { API_BASE_URL } from '../constants';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  // Event listeners registry
  private messageListeners: ((message: DirectMessage) => void)[] = [];
  private commonChatListeners: ((message: CommonChatMessage) => void)[] = [];
  private statusListeners: ((status: 'connected' | 'disconnected' | 'reconnecting') => void)[] = [];

  /**
   * Initialize Socket.IO connection
   */
  connect(user?: User) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    try {
      // Get auth token for authentication
      const token = localStorage.getItem('authToken');
      
      this.socket = io(API_BASE_URL.replace('/api', ''), {
        withCredentials: true,
        transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
        auth: {
          token: token || null,
        },
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      // Connection event handlers
      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket?.id);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyStatusListeners('connected');

        // Setup user authentication
        if (user) {
          this.setupUser(user);
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        this.isConnected = false;
        this.notifyStatusListeners('disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.isConnected = false;
        this.handleReconnection();
      });

      // Message event handlers
      this.socket.on('message received', (message: DirectMessage) => {
        console.log('New direct message received:', message);
        this.notifyMessageListeners(message);
      });

      this.socket.on('common chat message', (message: CommonChatMessage) => {
        console.log('New common chat message received:', message);
        this.notifyCommonChatListeners(message);
      });

      // Room/user-specific events
      this.socket.on('message read', (data: { messageId: string; readAt: string }) => {
        console.log('Message marked as read:', data);
        // Could trigger UI updates for read receipts
      });

    } catch (error) {
      console.error('Failed to initialize socket connection:', error);
    }
  }

  /**
   * Setup user authentication and join user-specific room
   */
  setupUser(user: User) {
    if (!this.socket?.connected) {
      console.warn('Cannot setup user - socket not connected');
      return;
    }

    // Authenticate user with backend
    this.socket.emit('setup', {
      userId: user.id,
      userInfo: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
    });

    // Join user-specific room for receiving direct messages
    this.socket.emit('join user room', user.id);
    
    console.log('User setup completed for:', user.fullName);
  }

  /**
   * Join common chat room
   */
  joinCommonChat() {
    if (!this.socket?.connected) {
      console.warn('Cannot join common chat - socket not connected');
      return;
    }

    this.socket.emit('join common chat');
    console.log('Joined common chat room');
  }

  /**
   * Leave common chat room
   */
  leaveCommonChat() {
    if (!this.socket?.connected) {
      console.warn('Cannot leave common chat - socket not connected');
      return;
    }

    this.socket.emit('leave common chat');
    console.log('Left common chat room');
  }

  /**
   * Send a direct message
   */
  sendDirectMessage(messageData: Omit<DirectMessage, 'id' | 'timestamp' | 'isReadByReceiver'>) {
    if (!this.socket?.connected) {
      console.warn('Cannot send message - socket not connected');
      throw new Error('Socket not connected');
    }

    this.socket.emit('new direct message', messageData);
    console.log('Direct message sent:', messageData);
  }

  /**
   * Send a common chat message
   */
  sendCommonChatMessage(messageData: Omit<CommonChatMessage, 'id' | 'timestamp'>) {
    if (!this.socket?.connected) {
      console.warn('Cannot send common chat message - socket not connected');
      throw new Error('Socket not connected');
    }

    this.socket.emit('new common chat message', messageData);
    console.log('Common chat message sent:', messageData);
  }

  /**
   * Mark message as read
   */
  markMessageAsRead(messageId: string) {
    if (!this.socket?.connected) {
      console.warn('Cannot mark message as read - socket not connected');
      return;
    }

    this.socket.emit('mark message read', { messageId });
  }

  /**
   * Event listener management
   */
  onDirectMessage(listener: (message: DirectMessage) => void) {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }

  onCommonChatMessage(listener: (message: CommonChatMessage) => void) {
    this.commonChatListeners.push(listener);
    return () => {
      this.commonChatListeners = this.commonChatListeners.filter(l => l !== listener);
    };
  }

  onConnectionStatus(listener: (status: 'connected' | 'disconnected' | 'reconnecting') => void) {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  /**
   * Exchange-specific event handlers for real-time updates
   */
  onExchangeCompleted(callback: (data: any) => void) {
    if (!this.socket) return () => {};
    this.socket.on('exchangeCompleted', callback);
    return () => {
      this.socket?.off('exchangeCompleted', callback);
    };
  }

  onRequestApproved(callback: (data: any) => void) {
    if (!this.socket) return () => {};
    this.socket.on('requestApproved', callback);
    return () => {
      this.socket?.off('requestApproved', callback);
    };
  }

  onRequestRejected(callback: (data: any) => void) {
    if (!this.socket) return () => {};
    this.socket.on('requestRejected', callback);
    return () => {
      this.socket?.off('requestRejected', callback);
    };
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = 0;
    
    // Clear all listeners
    this.messageListeners = [];
    this.commonChatListeners = [];
    this.statusListeners = [];
    
    console.log('Socket disconnected and cleaned up');
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // Private helper methods
  private notifyMessageListeners(message: DirectMessage) {
    this.messageListeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('Error in message listener:', error);
      }
    });
  }

  private notifyCommonChatListeners(message: CommonChatMessage) {
    this.commonChatListeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('Error in common chat listener:', error);
      }
    });
  }

  private notifyStatusListeners(status: 'connected' | 'disconnected' | 'reconnecting') {
    this.statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    });
  }

  private handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.notifyStatusListeners('reconnecting');

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      if (!this.isConnected) {
        this.connect();
      }
    }, delay);
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
