const Course = require('../models/course.model');
const ApiError = require('../../utils/apiError');
const ApiResponse = require('../../utils/apiResponse');

// Get all courses for the current user
const getCourses = async (req, res, next) => {
  try {
    const { semester, academicYear, isActive = true } = req.query;
    const userId = req.user._id;

    // Build filter
    const filter = { userId };
    
    if (semester) {
      filter.semester = semester;
    }
    
    if (academicYear) {
      filter.academicYear = academicYear;
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const courses = await Course.find(filter)
      .sort({ semester: -1, courseName: 1 });

    // Calculate summary statistics
    const summary = {
      totalCourses: courses.length,
      totalCredits: courses.reduce((sum, course) => sum + course.credits, 0),
      averageAttendance: courses.length > 0 
        ? Math.round(courses.reduce((sum, course) => sum + course.attendancePercentage, 0) / courses.length)
        : 0,
      averageGrade: courses.length > 0
        ? Math.round(courses.reduce((sum, course) => sum + course.currentAverage, 0) / courses.length)
        : 0
    };

    res.status(200).json(
      new ApiResponse(200, {
        courses,
        summary
      }, 'Courses retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Add a new course
const addCourse = async (req, res, next) => {
  try {
    console.log(`📚 [ADD-COURSE] POST /api/attendance/courses - Request started`);
    console.log(`📚 [ADD-COURSE] User ID: ${req.user._id}`);
    console.log(`📚 [ADD-COURSE] Request body:`, JSON.stringify(req.body, null, 2));

    const {
      courseName,
      courseCode,
      instructor,
      semester,
      academicYear,
      credits,
      schedule,
      startDate,
      endDate,
      description = '',
      color = '#3498db',
      reminders = { enabled: true, minutesBefore: 15 }
    } = req.body;

    console.log(`📚 [ADD-COURSE] Extracted fields:`, {
      courseName: courseName || 'MISSING',
      courseCode: courseCode || 'MISSING',
      instructor: instructor || 'MISSING',
      semester: semester || 'MISSING',
      academicYear: academicYear || 'MISSING',
      credits: credits || 'MISSING',
      startDate: startDate || 'MISSING',
      endDate: endDate || 'MISSING',
      scheduleProvided: schedule ? 'YES' : 'NO'
    });

    // Validate required fields
    const requiredFields = {
      courseName, courseCode, instructor, semester, academicYear, credits, startDate, endDate
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value || (typeof value === 'string' && value.trim() === ''))
      .map(([key]) => key);

    if (missingFields.length > 0) {
      console.log(`❌ [ADD-COURSE] Missing required fields:`, missingFields);
      throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
    }

    console.log(`✅ [ADD-COURSE] All required fields provided`);

    // Check if course with same code already exists for this user
    console.log(`📚 [ADD-COURSE] Checking for existing course with code: ${courseCode.trim()}`);
    const existingCourse = await Course.findOne({
      userId: req.user._id,
      courseCode: courseCode.trim().toUpperCase(),
      isActive: true
    });

    if (existingCourse) {
      console.log(`❌ [ADD-COURSE] Course already exists: ${existingCourse._id}`);
      throw new ApiError(409, 'Course with this code already exists');
    }

    console.log(`✅ [ADD-COURSE] No existing course found`);

    // Validate dates
    const courseStartDate = new Date(startDate);
    const courseEndDate = new Date(endDate);

    console.log(`📚 [ADD-COURSE] Date validation:`, {
      startDate: courseStartDate.toISOString(),
      endDate: courseEndDate.toISOString(),
      isValidStartDate: !isNaN(courseStartDate.getTime()),
      isValidEndDate: !isNaN(courseEndDate.getTime())
    });

    if (isNaN(courseStartDate.getTime()) || isNaN(courseEndDate.getTime())) {
      console.log(`❌ [ADD-COURSE] Invalid date format`);
      throw new ApiError(400, 'Invalid date format. Use ISO format (YYYY-MM-DD)');
    }

    if (courseEndDate <= courseStartDate) {
      console.log(`❌ [ADD-COURSE] End date before start date`);
      throw new ApiError(400, 'End date must be after start date');
    }

    console.log(`✅ [ADD-COURSE] Date validation passed`);

    // Validate credits
    const creditsNumber = parseInt(credits);
    if (isNaN(creditsNumber) || creditsNumber < 1 || creditsNumber > 10) {
      console.log(`❌ [ADD-COURSE] Invalid credits: ${credits}`);
      throw new ApiError(400, 'Credits must be between 1 and 10');
    }

    console.log(`✅ [ADD-COURSE] Credits validation passed: ${creditsNumber}`);

    // Validate color format
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!colorRegex.test(color)) {
      console.log(`❌ [ADD-COURSE] Invalid color format: ${color}`);
      throw new ApiError(400, 'Invalid color format. Use hex format like #3498db');
    }

    console.log(`✅ [ADD-COURSE] Color validation passed: ${color}`);

    // Validate schedule if provided
    let validatedSchedule = [];
    if (schedule && Array.isArray(schedule)) {
      console.log(`📚 [ADD-COURSE] Validating schedule with ${schedule.length} items`);
      const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      for (const scheduleItem of schedule) {
        console.log(`📚 [ADD-COURSE] Validating schedule item:`, scheduleItem);
        
        if (!validDays.includes(scheduleItem.day)) {
          console.log(`❌ [ADD-COURSE] Invalid day: ${scheduleItem.day}`);
          throw new ApiError(400, `Invalid day in schedule: ${scheduleItem.day}`);
        }
        
        if (!scheduleItem.startTime || !scheduleItem.endTime) {
          console.log(`❌ [ADD-COURSE] Missing time in schedule item`);
          throw new ApiError(400, 'Start time and end time required for each schedule item');
        }

        validatedSchedule.push({
          day: scheduleItem.day,
          startTime: scheduleItem.startTime,
          endTime: scheduleItem.endTime,
          venue: scheduleItem.venue || ''
        });
      }
      console.log(`✅ [ADD-COURSE] Schedule validation passed`);
    } else {
      console.log(`📚 [ADD-COURSE] No schedule provided`);
    }

    // Create new course
    console.log(`📚 [ADD-COURSE] Creating new course object...`);
    const newCourse = new Course({
      userId: req.user._id,
      courseName: courseName.trim(),
      courseCode: courseCode.trim().toUpperCase(),
      instructor: instructor.trim(),
      semester: semester.trim(),
      academicYear: academicYear.trim(),
      credits: creditsNumber,
      schedule: validatedSchedule,
      startDate: courseStartDate,
      endDate: courseEndDate,
      description: description.trim(),
      color,
      reminders
    });

    console.log(`📚 [ADD-COURSE] Course object created, saving to database...`);
    await newCourse.save();
    console.log(`✅ [ADD-COURSE] Course saved successfully: ${newCourse._id}`);

    console.log(`📚 [ADD-COURSE] Course details:`, {
      id: newCourse._id,
      courseName: newCourse.courseName,
      courseCode: newCourse.courseCode,
      credits: newCourse.credits,
      scheduleItems: newCourse.schedule.length
    });

    console.log(`✅ [ADD-COURSE] Sending success response`);
    res.status(201).json(
      new ApiResponse(201, newCourse, 'Course added successfully')
    );
    console.log(`✅ [ADD-COURSE] Response sent successfully`);
  } catch (error) {
    console.log(`❌ [ADD-COURSE] Error occurred:`, error.message);
    console.log(`❌ [ADD-COURSE] Error stack:`, error.stack);
    console.log(`❌ [ADD-COURSE] Request body that caused error:`, JSON.stringify(req.body, null, 2));
    next(error);
  }
};

// Mark attendance for a specific date
const markAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, status, notes = '' } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!date || !status) {
      throw new ApiError(400, 'Date and status are required');
    }

    // Validate status
    const validStatuses = ['present', 'absent', 'late'];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, 'Status must be present, absent, or late');
    }

    // Find course
    const course = await Course.findOne({ _id: id, userId });
    if (!course) {
      throw new ApiError(404, 'Course not found');
    }

    // Validate date is within course duration
    const attendanceDate = new Date(date);
    if (attendanceDate < course.startDate || attendanceDate > course.endDate) {
      throw new ApiError(400, 'Date must be within course duration');
    }

    // Mark attendance
    await course.markAttendance(date, status, notes);

    res.status(200).json(
      new ApiResponse(200, {
        course,
        attendancePercentage: course.attendancePercentage,
        classesAttended: course.classesAttended,
        classesMissed: course.classesMissed
      }, 'Attendance marked successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Get course by ID
const getCourseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: id, userId });
    if (!course) {
      throw new ApiError(404, 'Course not found');
    }

    res.status(200).json(
      new ApiResponse(200, course, 'Course retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Update course details
const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const updateData = req.body;

    const course = await Course.findOne({ _id: id, userId });
    if (!course) {
      throw new ApiError(404, 'Course not found');
    }

    // Remove fields that shouldn't be updated directly
    delete updateData.userId;
    delete updateData.attendanceRecords;
    delete updateData._id;

    // Validate course code uniqueness if being updated
    if (updateData.courseCode && updateData.courseCode !== course.courseCode) {
      const existingCourse = await Course.findOne({
        userId,
        courseCode: updateData.courseCode.trim(),
        _id: { $ne: id },
        isActive: true
      });

      if (existingCourse) {
        throw new ApiError(409, 'Course with this code already exists');
      }
      updateData.courseCode = updateData.courseCode.trim().toUpperCase();
    }

    // Validate dates if being updated
    if (updateData.startDate && updateData.endDate) {
      const startDate = new Date(updateData.startDate);
      const endDate = new Date(updateData.endDate);
      
      if (endDate <= startDate) {
        throw new ApiError(400, 'End date must be after start date');
      }
    }

    // Validate credits if being updated
    if (updateData.credits) {
      if (updateData.credits < 1 || updateData.credits > 10) {
        throw new ApiError(400, 'Credits must be between 1 and 10');
      }
    }

    // Validate color if being updated
    if (updateData.color) {
      const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!colorRegex.test(updateData.color)) {
        throw new ApiError(400, 'Invalid color format');
      }
    }

    // Update course
    const updatedCourse = await Course.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json(
      new ApiResponse(200, updatedCourse, 'Course updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Delete course
const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: id, userId });
    if (!course) {
      throw new ApiError(404, 'Course not found');
    }

    // Soft delete by setting isActive to false
    course.isActive = false;
    await course.save();

    res.status(200).json(
      new ApiResponse(200, null, 'Course deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Add assignment to course
const addAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, maxMarks, weight = 1, dueDate } = req.body;
    const userId = req.user._id;

    if (!name || !maxMarks) {
      throw new ApiError(400, 'Assignment name and max marks are required');
    }

    const course = await Course.findOne({ _id: id, userId });
    if (!course) {
      throw new ApiError(404, 'Course not found');
    }

    const assignmentData = {
      name: name.trim(),
      maxMarks: parseInt(maxMarks),
      weight: parseInt(weight),
      dueDate: dueDate ? new Date(dueDate) : undefined
    };

    await course.addAssignment(assignmentData);

    res.status(201).json(
      new ApiResponse(201, course, 'Assignment added successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Add exam to course
const addExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, date, maxMarks, weight = 1, syllabus = '' } = req.body;
    const userId = req.user._id;

    if (!name || !date || !maxMarks) {
      throw new ApiError(400, 'Exam name, date, and max marks are required');
    }

    const course = await Course.findOne({ _id: id, userId });
    if (!course) {
      throw new ApiError(404, 'Course not found');
    }

    const examData = {
      name: name.trim(),
      date: new Date(date),
      maxMarks: parseInt(maxMarks),
      weight: parseInt(weight),
      syllabus: syllabus.trim()
    };

    await course.addExam(examData);

    res.status(201).json(
      new ApiResponse(201, course, 'Exam added successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Get attendance summary for a course
const getAttendanceSummary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { month, year } = req.query;
    const userId = req.user._id;

    const course = await Course.findOne({ _id: id, userId });
    if (!course) {
      throw new ApiError(404, 'Course not found');
    }

    let attendanceRecords = course.attendanceRecords;

    // Filter by month and year if provided
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      
      attendanceRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= startDate && recordDate <= endDate;
      });
    }

    // Calculate statistics
    const totalClasses = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
    const lateCount = attendanceRecords.filter(r => r.status === 'late').length;
    const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
    const attendancePercentage = totalClasses > 0 
      ? Math.round(((presentCount + lateCount) / totalClasses) * 100)
      : 0;

    const summary = {
      courseName: course.courseName,
      courseCode: course.courseCode,
      totalClasses,
      presentCount,
      lateCount,
      absentCount,
      attendancePercentage,
      attendanceStreak: course.getAttendanceStreak(),
      records: attendanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date))
    };

    res.status(200).json(
      new ApiResponse(200, summary, 'Attendance summary retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

// Get upcoming classes/exams
const getUpcomingEvents = async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const userId = req.user._id;

    const courses = await Course.find({ 
      userId, 
      isActive: true,
      endDate: { $gte: new Date() }
    });

    const upcomingEvents = [];
    const now = new Date();
    const endDate = new Date(now.getTime() + parseInt(days) * 24 * 60 * 60 * 1000);

    courses.forEach(course => {
      // Add upcoming exams
      course.grading.exams.forEach(exam => {
        if (exam.date >= now && exam.date <= endDate) {
          upcomingEvents.push({
            type: 'exam',
            course: {
              id: course._id,
              name: course.courseName,
              code: course.courseCode,
              color: course.color
            },
            title: exam.name,
            date: exam.date,
            details: {
              maxMarks: exam.maxMarks,
              syllabus: exam.syllabus
            }
          });
        }
      });

      // Add upcoming assignment due dates
      course.grading.assignments.forEach(assignment => {
        if (assignment.dueDate && assignment.dueDate >= now && assignment.dueDate <= endDate && !assignment.submitted) {
          upcomingEvents.push({
            type: 'assignment',
            course: {
              id: course._id,
              name: course.courseName,
              code: course.courseCode,
              color: course.color
            },
            title: assignment.name,
            date: assignment.dueDate,
            details: {
              maxMarks: assignment.maxMarks
            }
          });
        }
      });

      // Add next classes based on schedule
      if (course.nextClass) {
        upcomingEvents.push({
          type: 'class',
          course: {
            id: course._id,
            name: course.courseName,
            code: course.courseCode,
            color: course.color
          },
          title: `${course.courseName} Class`,
          date: course.nextClass.date,
          details: {
            time: course.nextClass.time,
            venue: course.nextClass.venue
          }
        });
      }
    });

    // Sort by date
    upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.status(200).json(
      new ApiResponse(200, upcomingEvents, 'Upcoming events retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
