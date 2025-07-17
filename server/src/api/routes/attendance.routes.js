const express = require('express');
const {
  getCourses,
  addCourse,
  markAttendance,
  getCourseById,
  updateCourse,
  deleteCourse,
  addAssignment,
  addExam,
  getAttendanceSummary,
  getUpcomingEvents
} = require('../controllers/attendance.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Course and attendance routes
router.get('/courses', getCourses);
router.post('/courses', addCourse);
router.get('/courses/:courseId', getCourseById);
router.patch('/courses/:courseId', updateCourse);
router.delete('/courses/:courseId', deleteCourse);

// Attendance specific routes
router.post('/mark', markAttendance);
router.get('/summary', getAttendanceSummary);
router.get('/upcoming', getUpcomingEvents);

// Assignment and exam routes
router.post('/courses/:courseId/assignments', addAssignment);
router.post('/courses/:courseId/exams', addExam);

module.exports = router;
