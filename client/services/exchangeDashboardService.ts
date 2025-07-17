/**
 * @file Service for managing exchange dashboard data and statistics.
 */
import { fetchApi } from './api';

/**
 * Interface for exchange dashboard statistics.
 */
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

/**
 * Interface for exchange activity items.
 */
export interface ExchangeActivity {
  _id: string;
  requesterId: {
    id: string;
    fullName: string;
    rollNumber: string;
    gender: string;
  };
  listingId: {
    id: string;
    title: string;
    currentRoom: {
      hostel: string;
      block: string;
      roomNumber: string;
      type: string;
    };
  };
  status: 'Pending' | 'Approved' | 'Rejected' | 'Confirmed';
  createdAt: string;
  updatedAt: string;
  isRequester: boolean;
  isListingOwner: boolean;
  actionType: 'sent' | 'received';
}

/**
 * Fetches the complete exchange dashboard data for the current user.
 * @returns {Promise<ExchangeDashboard>} Dashboard statistics and recent activity
 */
export const fetchExchangeDashboard = async (): Promise<ExchangeDashboard> => {
  try {
    const response = await fetchApi('/match-requests/dashboard');
    console.log("Exchange dashboard response:", response);
    
    // Handle backend response structure
    if (response && response.data) {
      return response.data;
    }
    
    // Return the response directly if it matches our interface
    return response;
  } catch (error) {
    console.error("fetchExchangeDashboard error:", error);
    throw error;
  }
};

/**
 * Enhanced exchange request approval with automatic room swapping.
 * @param {string} requestId - ID of the exchange request
 * @param {boolean} approved - Whether to approve or reject the request
 * @param {string} comments - Optional comments for the decision
 * @returns {Promise<{swapCompleted: boolean; message: string}>} Approval result
 */
export const approveExchangeRequest = async (
  requestId: string, 
  approved: boolean, 
  comments?: string
): Promise<{ swapCompleted: boolean; message: string }> => {
  try {
    const response = await fetchApi(`/match-requests/${requestId}/exchange-approve`, {
      method: 'POST',
      body: JSON.stringify({ approved, comments })
    });
    
    console.log("Exchange approval response:", response);
    return response;
  } catch (error) {
    console.error("approveExchangeRequest error:", error);
    throw error;
  }
};

/**
 * Get detailed information about a specific exchange request.
 * @param {string} requestId - ID of the exchange request
 * @returns {Promise<ExchangeActivity>} Detailed exchange request information
 */
export const getExchangeRequestDetails = async (requestId: string): Promise<ExchangeActivity> => {
  try {
    const response = await fetchApi(`/match-requests/${requestId}`);
    return response;
  } catch (error) {
    console.error("getExchangeRequestDetails error:", error);
    throw error;
  }
};
