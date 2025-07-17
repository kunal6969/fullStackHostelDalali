import { CommonChatMessage, TextMessage, ImageMessage, PollMessage } from '../types';
import { fetchApi } from './api';
import { socketService } from './socketService';

export const getChatMessages = async (): Promise<CommonChatMessage[]> => {
  return fetchApi('/common-chat/messages');
};

export const addChatMessage = async (
    messageData: Omit<TextMessage, 'id' | 'timestamp'> | Omit<ImageMessage, 'id' | 'timestamp'> | Omit<PollMessage, 'id' | 'timestamp'>
): Promise<CommonChatMessage> => {
    
    let result: CommonChatMessage;

    // For image uploads, we need to handle FormData
    if (messageData.type === 'image') {
        const formData = new FormData();
        formData.append('type', messageData.type);
        formData.append('sender', JSON.stringify(messageData.sender));
        
        // The imageUrl is a base64 string, we need to convert it to a blob
        const fetchRes = await fetch(messageData.imageUrl);
        const blob = await fetchRes.blob();
        formData.append('image', blob, 'upload.png');

        result = await fetchApi('/common-chat/message', {
            method: 'POST',
            body: formData,
        });
    } else {
        // For text and poll, use JSON
        result = await fetchApi('/common-chat/message', {
            method: 'POST',
            body: JSON.stringify(messageData),
        });
    }

    // Send via Socket.IO for real-time delivery
    try {
        if (socketService.getConnectionStatus().isConnected) {
            socketService.sendCommonChatMessage(result);
        }
    } catch (error) {
        console.warn('Failed to send message via socket, but message was saved:', error);
    }

    return result;
};

export const voteOnPoll = async (messageId: string, optionIndex: number): Promise<void> => {
  await fetchApi(`/common-chat/${messageId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionIndex }),
  });
};