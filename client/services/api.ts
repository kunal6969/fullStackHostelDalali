
import { API_BASE_URL } from '../constants';

export const fetchApi = async (path: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('authToken');
    const headers = new Headers(options.headers || {});
    
    // Only set Authorization header if a token exists
    if (token) {
        headers.append('Authorization', `Bearer ${token}`);
    }

    // Do not set Content-Type for FormData, the browser does it best.
    if (!(options.body instanceof FormData)) {
        headers.append('Content-Type', 'application/json');
    }

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            // Try to parse error message from backend
            let errorMessage = `HTTP ${response.status}`;
            
            // Provide more specific error messages based on status code
            switch (response.status) {
                case 400:
                    errorMessage = 'Bad request - invalid data sent to server';
                    break;
                case 401:
                    errorMessage = 'Unauthorized - please log in again';
                    break;
                case 403:
                    errorMessage = 'Forbidden - you do not have permission';
                    break;
                case 404:
                    errorMessage = 'Resource not found - the API endpoint may not exist';
                    break;
                case 500:
                    errorMessage = 'Internal server error - the backend may be misconfigured';
                    break;
                case 502:
                case 503:
                case 504:
                    errorMessage = 'Server unavailable - please try again later';
                    break;
                default:
                    errorMessage = `HTTP error! status: ${response.status}`;
            }
            
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // Error response was not JSON, use the status-based message.
            }
            
            throw new Error(errorMessage);
        }

        // Check content-type to decide if we should parse as JSON.
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        }
        
        // For 204 No Content or non-JSON responses, return null.
        return null;
    } catch (fetchError: any) {
        // Handle network errors (when fetch itself fails)
        if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
            throw new Error(`Network error: Unable to connect to ${API_BASE_URL}. Is the backend server running?`);
        }
        // Re-throw other errors (including our custom HTTP errors)
        throw fetchError;
    }
};
