/**
 * @file This file contains the service for managing campus events via the backend API.
 */
import { Event, EventFormData } from '../types';
import { fetchApi } from './api';

/**
 * Fetches all approved events.
 * @returns {Promise<Event[]>} A promise that resolves to an array of approved events.
 */
export const getEvents = async (): Promise<Event[]> => {
    try {
        const response = await fetchApi('/events');
        console.log("getEvents response:", response);
        
        // Handle different response structures
        if (Array.isArray(response)) {
            return response;
        }
        if (response && Array.isArray(response.events)) {
            return response.events;
        }
        if (response && Array.isArray(response.data)) {
            return response.data;
        }
        
        console.warn("getEvents: Unexpected response structure, returning empty array");
        return [];
    } catch (error) {
        console.error("getEvents error:", error);
        return [];
    }
};

/**
 * Fetches the event registration IDs for the current user.
 * @returns {Promise<Set<string>>} A promise that resolves to a Set containing the IDs of events the user is registered for.
 */
export const getUserRegistrations = async (): Promise<Set<string>> => {
    try {
        const response = await fetchApi('/events/registered');
        console.log("getUserRegistrations response:", response);
        
        let registeredEvents: Event[] = [];
        
        // Handle different response structures
        if (Array.isArray(response)) {
            registeredEvents = response;
        } else if (response && Array.isArray(response.events)) {
            registeredEvents = response.events;
        } else if (response && Array.isArray(response.data)) {
            registeredEvents = response.data;
        } else if (response && Array.isArray(response.registeredEvents)) {
            registeredEvents = response.registeredEvents;
        } else {
            console.warn("getUserRegistrations: Unexpected response structure, returning empty set");
            return new Set();
        }
        
        // Ensure we have valid events with IDs before mapping
        const validEvents = registeredEvents.filter(event => event && event.id);
        return new Set(validEvents.map(event => event.id));
    } catch (error) {
        console.error("getUserRegistrations error:", error);
        return new Set();
    }
};

/**
 * Toggles the current user's registration for an event.
 * @param {string} eventId - The ID of the event.
 * @returns {Promise<void>}
 */
export const toggleEventRegistration = async (eventId: string): Promise<void> => {
    await fetchApi(`/events/${eventId}/register`, { method: 'POST' });
};


/**
 * Submits a new event for admin approval.
 * @param {EventFormData} formData - The data for the new event.
 * @returns {Promise<Event>} A promise that resolves to the newly created (pending) event.
 */
export const requestEventListing = async (formData: EventFormData): Promise<Event> => {
    // Note: The backend expects 'eventImage', but the form doesn't provide it.
    // This will work if the backend handles the absence of the file gracefully.
    return fetchApi('/events', {
        method: 'POST',
        body: JSON.stringify(formData),
    });
};