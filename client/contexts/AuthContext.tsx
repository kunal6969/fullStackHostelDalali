/**
 * @file This file defines the Authentication Context for the application.
 * It provides user authentication state and functions (login, logout, update user details)
 * to all components wrapped within it. It uses localStorage to persist the user session.
 * For this demo, it simulates a login process and creates a mock user object.
 */

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { User, AuthContextType, ExchangePreferences, RoomLocation } from '../types';
import { fetchApi } from '../services/api';
import * as friendService from '../services/friendService';
import { socketService } from '../services/socketService';


// Create the context with an undefined default value.
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * The provider component for the AuthContext.
 * It manages the user state and provides the authentication methods.
 * @param {object} props - Component props.
 * @param {ReactNode} props.children - The child components that will have access to the context.
 */
export const AuthContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAndSetUser = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            const response = await fetchApi('/auth/me');
            if (response && response.data) {
                setUser(response.data);
            } else {
                 throw new Error("Invalid profile response from server.");
            }
        } catch (error) {
            console.error("Session expired or invalid token.", error);
            localStorage.removeItem('authToken');
            setUser(null);
        }
    }
    setLoading(false);
  }, []);

  // Socket connection management
  useEffect(() => {
    if (user) {
      // Connect socket when user logs in
      socketService.connect(user);
    } else {
      // Disconnect socket when user logs out
      socketService.disconnect();
    }

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, [user]);
  
  // On initial app load, try to retrieve the user from the token.
  useEffect(() => {
    fetchAndSetUser();
  }, [fetchAndSetUser]);


  const login = async (email: string, password_or_otp: string, details?: { fullName?: string; gender?: User['gender']; isSignup: boolean }): Promise<void> => {
    setLoading(true);
    try {
        const endpoint = details?.isSignup ? '/auth/signup' : '/auth/login';
        const payload = details?.isSignup 
            ? { email, fullName: details.fullName, gender: details.gender, password: password_or_otp } // Assuming password is used for signup instead of OTP
            : { email, password: password_or_otp };

        const response = await fetchApi(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        // The backend wraps the response in a `data` object.
        if (response.data && response.data.token && response.data.user) {
            localStorage.setItem('authToken', response.data.token);
            setUser(response.data.user);
        } else {
             throw new Error('Invalid response from server.');
        }
    } finally {
        setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    // Disconnect socket before logout
    socketService.disconnect();
    
    // Inform backend of logout, but don't block UI if it fails.
    fetchApi('/auth/logout', { method: 'POST' }).catch(err => console.error("Logout API call failed, proceeding with client-side logout.", err));
    setUser(null);
    localStorage.removeItem('authToken');
  }, []);
  
  const updateUserRoom = useCallback(async (room: RoomLocation) => {
    if(!user) return;
    const response = await fetchApi(`/users/current-room`, {
        method: 'PATCH',
        body: JSON.stringify(room)
    });
    if (response && response.data) setUser(response.data);
  }, [user]);

  const updateUserPreferences = useCallback(async (prefs: ExchangePreferences) => {
    if(!user) return;
    const response = await fetchApi(`/users/preferences`, {
        method: 'PATCH',
        body: JSON.stringify(prefs)
    });
    if (response && response.data) setUser(response.data);
  }, [user]);

  const updateUserDetails = useCallback(async (detailsToUpdate: Partial<Pick<User, 'fullName' | 'rollNumber' | 'phoneNumber' | 'gender'>>) => {
    if(!user) return;
    const response = await fetchApi(`/users/details`, {
        method: 'PATCH',
        body: JSON.stringify(detailsToUpdate)
    });
    if (response && response.data) setUser(response.data);
  }, [user]);

  const addFriend = useCallback(async (friendId: string) => {
    if(!user) return;
    await friendService.sendFriendRequest(friendId);
    // State will be updated on the Find Friends page after the action.
  }, [user]);

  const removeFriend = useCallback(async (friendId: string) => {
    if(!user) return;
    await friendService.removeFriend(friendId);
    await fetchAndSetUser(); // Refresh user to update friends list in context
  }, [user, fetchAndSetUser]);
  
  const refreshUser = useCallback(async () => {
    await fetchAndSetUser();
  }, [fetchAndSetUser]);


  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUserRoom, updateUserPreferences, updateUserDetails, addFriend, removeFriend, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to easily access the AuthContext.
 * Throws an error if used outside of an AuthContextProvider.
 * @returns {AuthContextType} The authentication context value.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
};