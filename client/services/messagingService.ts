import { DirectMessage } from '../types';
import { fetchApi } from './api';
import { socketService } from './socketService';

export const saveMessage = async (newMessage: Omit<DirectMessage, 'id'|'timestamp'|'isReadByReceiver'>): Promise<DirectMessage> => {
  try {
    // Try to send via Socket.IO first for real-time delivery
    if (socketService.getConnectionStatus().isConnected) {
      socketService.sendDirectMessage(newMessage);
      // Still call API to ensure persistence in database
      return await fetchApi('/messages', {
        method: 'POST',
        body: JSON.stringify(newMessage),
      });
    } else {
      // Fallback to HTTP API if socket is not connected
      console.warn('Socket not connected, falling back to HTTP API');
      return await fetchApi('/messages', {
        method: 'POST',
        body: JSON.stringify(newMessage),
      });
    }
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
};

// Get all messages for the current user (grouped as conversations by the backend)
export const getMessagesForUser = async (): Promise<DirectMessage[]> => {
  return fetchApi('/messages/conversations');
};

// Sync conversation with backend to ensure consistency
export const syncConversation = async (partnerId: string, listingId: string, lastMessageTimestamp: string): Promise<{
  newMessages: DirectMessage[];
  unreadCount: number;
}> => {
  return fetchApi('/messages/sync-conversation', {
    method: 'POST',
    body: JSON.stringify({
      partnerId,
      listingId,
      lastMessageTimestamp
    }),
  });
};

// Check if there are new messages since last check
export const checkSyncStatus = async (lastChecked: string): Promise<{
  hasNewDirectMessages: boolean;
  hasNewCommonChat: boolean;
  newDirectMessageCount: number;
  newCommonChatCount: number;
}> => {
  return fetchApi(`/messages/sync-status?lastChecked=${encodeURIComponent(lastChecked)}`);
};

export const markMessagesAsRead = async (messageIds: string[]): Promise<void> => {
  // Mark messages as read via Socket.IO for real-time updates
  if (socketService.getConnectionStatus().isConnected) {
    messageIds.forEach(id => socketService.markMessageAsRead(id));
  }
  
  // Also call API to ensure persistence
  await Promise.all(
    messageIds.map(id => fetchApi(`/messages/${id}/read`, {
      method: 'PATCH',
    }))
  );
};

export const countUnreadMessages = async (): Promise<number> => {
  const { count } = await fetchApi('/messages/unread-count');
  return count;
};