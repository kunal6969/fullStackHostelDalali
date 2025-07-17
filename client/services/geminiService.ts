/**
 * @file This service handles all interactions with the AI service on the backend.
 * The backend is responsible for calling Google Gemini, not the client.
 */

import { User, RoomListing, SuggestedRoom } from '../types';
import { fetchApi } from './api';

/**
 * Fetches room suggestions from the backend's AI service.
 * @returns {Promise<SuggestedRoom[]>} A promise that resolves to an array of suggested rooms.
 */
export const fetchRoomSuggestions = async (): Promise<SuggestedRoom[]> => {
  try {
    // The backend will receive the user's context via the auth token.
    const suggestions = await fetchApi('/ai/suggestions', {
      method: 'GET',
    });
    return suggestions as SuggestedRoom[];
  } catch (error) {
    console.error("Error fetching room suggestions from backend:", error);
    return []; 
  }
};