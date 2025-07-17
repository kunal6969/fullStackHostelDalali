import { User, Friend, FriendRequest } from '../types';
import { fetchApi } from './api';


// User related functions
export const searchUserByUsername = async (username: string): Promise<User | null> => {
    try {
        const result = await fetchApi(`/users/search?username=${encodeURIComponent(username)}`);
        return result; // Assuming the backend returns the user object directly on success
    } catch(error) {
        console.error("Search user error:", error);
        return null; // Return null if user not found or error
    }
};


// Friendship Status (Client-side derivation)
export const getFriendshipStatus = (
    targetUserId: string, 
    currentUserId: string,
    friends: Friend[],
    sentRequests: FriendRequest[]
): 'friends' | 'request_sent' | 'request_received' | 'none' => {
    if (friends.some(f => f.id === targetUserId)) {
        return 'friends';
    }
    if (sentRequests.some(r => r.toUserId === targetUserId)) {
        return 'request_sent';
    }
    // Note: 'request_received' needs to be checked on the page using the `requests` prop, not here.
    return 'none';
};

// Friends
export const getFriends = async (): Promise<Friend[]> => {
    return fetchApi('/friends/list');
};

export const removeFriend = async (friendIdToRemove: string): Promise<void> => {
    await fetchApi(`/friends/${friendIdToRemove}`, {
        method: 'DELETE',
    });
};

// Friend Requests
export const getFriendRequests = async (): Promise<FriendRequest[]> => {
    return fetchApi('/friends/requests');
};

export const sendFriendRequest = async (toUserId: string): Promise<void> => {
    await fetchApi(`/friends/request/${toUserId}`, {
        method: 'POST',
    });
};

export const handleFriendRequest = async (requestId: string, action: 'accept' | 'reject'): Promise<void> => {
    await fetchApi(`/friends/request/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
    });
};