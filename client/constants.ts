/**
 * @file This file contains constant values and mock data used throughout the application.
 * Centralizing these constants makes the application easier to manage and configure.
 * The mock data is used for demonstration and development purposes in the absence of a live backend.
 */

import { RoomType } from './types';

// =======================
// API Configuration
// =======================
export const API_BASE_URL = 'http://localhost:5000/api';


// The required domain for user emails, ensuring only MNIT students can register.
export const MNIT_EMAIL_DOMAIN = 'mnit.ac.in';

// Master lists for dropdowns and filters.
export const HOSTELS = ['HL-1 (Boys)', 'HL-2 (Boys)', 'HL-3 (Girls)', 'HL-4 (Boys)', 'HL-5 (Girls)', 'HL-6 (Boys, Gargi)', 'HL-7 (Girls, Aurobindo)', 'HL-8 (Boys, Bhabha)'];
export const BLOCKS = ['A', 'B', 'C', 'D'];
export const ROOM_TYPES: RoomType[] = ['Single', 'Double Shared', 'Triple Shared', 'Any'];
export const FLOORS = ['Ground', 'First', 'Second', 'Third', 'Any'];


/**
 * Determines the gender associated with a hostel based on its name.
 * @param {string} hostelName - The name of the hostel.
 * @returns {'Male' | 'Female' | 'Unknown'} The gender associated with the hostel.
 */
export const getHostelGender = (hostelName: string): 'Male' | 'Female' | 'Unknown' => {
  const lowerHostelName = hostelName.toLowerCase();
  if (lowerHostelName.includes('(boys)') || lowerHostelName.includes('(men)')) {
    return 'Male';
  }
  if (lowerHostelName.includes('(girls)') || lowerHostelName.includes('(women)')) {
    return 'Female';
  }
  if (lowerHostelName.includes('gargi') || lowerHostelName.includes('aurobindo')) return 'Female'; // Assuming from common knowledge
  if (lowerHostelName.includes('bhabha')) return 'Male'; // Assuming
  if (['hl-1', 'hl-2', 'hl-4', 'hl-6', 'hl-8'].some(h => lowerHostelName.startsWith(h))) return 'Male';
  if (['hl-3', 'hl-5', 'hl-7'].some(h => lowerHostelName.startsWith(h))) return 'Female';

  return 'Unknown';
};