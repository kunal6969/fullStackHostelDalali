/**
 * @file This file contains the service for managing attendance data via the backend API.
 */
import { Course, CourseFormData } from '../types';
import { fetchApi } from './api';

/**
 * Fetches all courses for the logged-in user.
 * @returns {Promise<Course[]>} A promise that resolves to an array of courses.
 */
export const getCourses = async (): Promise<Course[]> => {
    try {
        const response = await fetchApi('/attendance/courses');
        console.log("getCourses response:", response);
        
        // Handle different response structures
        if (Array.isArray(response)) {
            return response;
        }
        if (response && Array.isArray(response.courses)) {
            return response.courses;
        }
        if (response && Array.isArray(response.data)) {
            return response.data;
        }
        
        console.warn("getCourses: Unexpected response structure, returning empty array");
        return [];
    } catch (error) {
        console.error("getCourses error:", error);
        return [];
    }
};

/**
 * Adds a new course for the user with enhanced validation.
 * @param {CourseFormData} courseData - The complete course data.
 * @returns {Promise<Course>} A promise that resolves to the newly created course.
 */
export const addCourse = async (courseData: CourseFormData): Promise<Course> => {
    return fetchApi('/attendance/courses', {
        method: 'POST',
        body: JSON.stringify(courseData),
    });
};

/**
 * Legacy method for simple course creation (backwards compatibility).
 * @param {string} name - The name of the new course.
 * @param {string} color - The hex color for the course.
 * @returns {Promise<Course>} A promise that resolves to the newly created course.
 */
export const addSimpleCourse = async (name: string, color: string): Promise<Course> => {
    // Create minimal course data with required fields
    const courseData: CourseFormData = {
        courseName: name,
        courseCode: 'TBD',
        instructor: 'TBD',
        semester: 'Current',
        academicYear: new Date().getFullYear().toString(),
        credits: 3,
        schedule: [],
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
        color: color
    };
    
    return addCourse(courseData);
};

/**
 * Deletes a course.
 * @param {string} courseId - The ID of the course to delete.
 * @returns {Promise<void>}
 */
export const deleteCourse = async (courseId: string): Promise<void> => {
    await fetchApi(`/attendance/courses/${courseId}`, {
        method: 'DELETE',
    });
};

/**
 * Marks attendance for a specific day and course.
 * @param {string} courseId - The ID of the course.
 * @param {string} date - The ISO date string (e.g., "2023-10-27").
 * @param {'attended' | 'missed'} status - The attendance status.
 * @returns {Promise<Course>} A promise that resolves to the updated course.
 */
export const markAttendance = async (courseId: string, date: string, status: 'attended' | 'missed'): Promise<Course> => {
    try {
        const response = await fetchApi('/attendance/mark', {
            method: 'POST',
            body: JSON.stringify({ courseId, date, status }),
        });
        console.log("markAttendance response:", response);
        
        // Ensure we have a valid course object
        if (response && typeof response === 'object' && response.id) {
            return response;
        }
        
        // If response is wrapped, try to extract the course
        if (response && response.course && typeof response.course === 'object' && response.course.id) {
            return response.course;
        }
        
        throw new Error("Invalid response format from attendance marking API");
    } catch (error) {
        console.error("markAttendance error:", error);
        throw error; // Re-throw to let the component handle it
    }
};
