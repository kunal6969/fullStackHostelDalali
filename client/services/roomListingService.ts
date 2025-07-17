/**
 * @file This file contains the service for managing room listings via the backend API.
 */
import { RoomListing, RoomListingFormData, TrendingListing, PaginationInfo } from '../types';
import { fetchApi } from './api';

/**
 * Fetches all open room listings, filtered by gender if the user is authenticated.
 * @returns {Promise<RoomListing[]>} A promise that resolves to an array of room listings.
 */
export const getListings = async (): Promise<RoomListing[]> => {
    try {
        const response = await fetchApi('/rooms');
        console.log("getListings response:", response);
        
        // Handle different response structures
        if (Array.isArray(response)) {
            return response;
        }
        if (response && Array.isArray(response.listings)) {
            return response.listings;
        }
        if (response && Array.isArray(response.data)) {
            return response.data;
        }
        if (response && Array.isArray(response.rooms)) {
            return response.rooms;
        }
        
        console.warn("getListings: Unexpected response structure, returning empty array");
        return [];
    } catch (error) {
        console.error("getListings error:", error);
        return [];
    }
};

/**
 * Fetches the enhanced trending "Bidding" type listings with new metrics.
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 50)
 * @returns {Promise<{listings: TrendingListing[], pagination: PaginationInfo}>} Enhanced trending listings with pagination
 */
export const getTrendingListings = async (page: number = 1, limit: number = 50): Promise<{
    listings: TrendingListing[];
    pagination: PaginationInfo;
}> => {
    try {
        const response = await fetchApi(`/rooms/trending?page=${page}&limit=${limit}`);
        console.log("getTrendingListings response:", response);
        
        // Handle backend response structure
        if (response && response.data) {
            return {
                listings: response.data.listings || [],
                pagination: response.data.pagination || {
                    currentPage: 1,
                    totalPages: 1,
                    totalCount: 0,
                    hasMore: false
                }
            };
        }
        
        // Fallback for legacy response structure
        const listings = Array.isArray(response) ? response : 
                        response?.listings || response?.data || response?.rooms || [];
        
        return {
            listings: listings,
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalCount: listings.length,
                hasMore: false
            }
        };
    } catch (error) {
        console.error("getTrendingListings error:", error);
        return {
            listings: [],
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalCount: 0,
                hasMore: false
            }
        };
    }
};

/**
 * Legacy method for backwards compatibility.
 * @returns {Promise<RoomListing[]>} A promise that resolves to an array of trending listings.
 */
export const getTrendingListingsLegacy = async (): Promise<RoomListing[]> => {
    const result = await getTrendingListings();
    return result.listings;
};

/**
 * Creates a new room listing.
 * @param {RoomListingFormData} formData - The data for the new listing from the form.
 * @returns {Promise<RoomListing>} A promise that resolves to the newly created listing.
 */
export const createListing = async (listingData: RoomListingFormData): Promise<RoomListing> => {
    const formData = new FormData();
    
    formData.append('roomDetails', JSON.stringify(listingData.roomDetails));
    formData.append('listingType', listingData.listingType);
    formData.append('description', listingData.description);
    if (listingData.desiredTradeConditions) {
        formData.append('desiredTradeConditions', listingData.desiredTradeConditions);
    }
    if (listingData.roomProofFile) {
        formData.append('roomProofFile', listingData.roomProofFile);
    }

    return fetchApi('/rooms', {
        method: 'POST',
        body: formData, // fetchApi will correctly handle FormData
    });
};

/**
 * Toggles the current user's interest in a "Bidding" type listing.
 * @param {string} listingId - The ID of the listing.
 * @returns {Promise<{ interestCount: number }>}
 */
export const toggleInterest = async (listingId: string): Promise<{ interestCount: number }> => {
    try {
        const response = await fetchApi(`/rooms/${listingId}/interest`, { method: 'POST' });
        console.log("toggleInterest response:", response);
        
        // Ensure we have a valid response with interestCount
        if (response && typeof response.interestCount === 'number') {
            return response;
        }
        
        // If response doesn't have interestCount, return a default
        console.warn("toggleInterest: Invalid response structure, using default");
        return { interestCount: 0 };
    } catch (error) {
        console.error("toggleInterest error:", error);
        throw error; // Re-throw to let the calling component handle it
    }
};
