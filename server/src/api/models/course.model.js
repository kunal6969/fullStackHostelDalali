const mongoose = require('mongoose');

// Attendance record schema for individual classes
const attendanceRecordSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late'],
    required: true
  },
  notes: {
    type: String,
    maxlength: 200,
    default: ''
  }
}, { _id: false });

const courseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  courseCode: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  instructor: {
    type: String,
    required: true,
    maxlength: 100
  },
  semester: {
    type: String,
    required: true,
    maxlength: 20
  },
  academicYear: {
    type: String,
    required: true,
    maxlength: 10
  },
  credits: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  totalClasses: {
    type: Number,
    default: 0
  },
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    venue: {
      type: String,
      maxlength: 100
    }
  }],
  attendanceRecords: [attendanceRecordSchema],
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: '#3498db',
    match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  },
  reminders: {
    enabled: {
      type: Boolean,
      default: true
    },
    minutesBefore: {
      type: Number,
      default: 15
    }
  },
  grading: {
    currentGrade: {
      type: String,
      maxlength: 5,
      default: ''
    },
    targetGrade: {
      type: String,
      maxlength: 5,
      default: ''
    },
    assignments: [{
      name: {
        type: String,
        required: true,
        maxlength: 100
      },
      maxMarks: {
        type: Number,
        required: true
      },
      obtainedMarks: {
        type: Number,
        default: 0
      },
      weight: {
        type: Number,
        default: 1
      },
      dueDate: {
        type: Date
      },
      submitted: {
        type: Boolean,
        default: false
      }
    }],
    exams: [{
      name: {
        type: String,
        required: true,
        maxlength: 100
      },
      date: {
        type: Date,
        required: true
      },
      maxMarks: {
        type: Number,
        required: true
      },
      obtainedMarks: {
        type: Number,
        default: 0
      },
      weight: {
        type: Number,
        default: 1
      },
      syllabus: {
        type: String,
        maxlength: 500
      }
    }]
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
courseSchema.index({ userId: 1, isActive: 1 });
courseSchema.index({ userId: 1, semester: 1, academicYear: 1 });
courseSchema.index({ courseCode: 1, userId: 1 }, { unique: true });

// Virtual for attendance percentage
courseSchema.virtual('attendancePercentage').get(function() {
  if (this.attendanceRecords.length === 0) return 0;
  
  const presentCount = this.attendanceRecords.filter(record => 
    record.status === 'present' || record.status === 'late'
  ).length;
  
  return Math.round((presentCount / this.attendanceRecords.length) * 100);
});

// Virtual for classes attended
courseSchema.virtual('classesAttended').get(function() {
  return this.attendanceRecords.filter(record => 
    record.status === 'present' || record.status === 'late'
  ).length;
});

// Virtual for classes missed
courseSchema.virtual('classesMissed').get(function() {
  return this.attendanceRecords.filter(record => 
    record.status === 'absent'
  ).length;
});

// Virtual for current average grade
courseSchema.virtual('currentAverage').get(function() {
  if (!this.grading.assignments.length && !this.grading.exams.length) return 0;
  
  let totalWeightedMarks = 0;
  let totalWeight = 0;
  
  // Calculate assignment average
  this.grading.assignments.forEach(assignment => {
    if (assignment.submitted && assignment.obtainedMarks > 0) {
      const percentage = (assignment.obtainedMarks / assignment.maxMarks) * 100;
      totalWeightedMarks += percentage * assignment.weight;
      totalWeight += assignment.weight;
    }
  });
  
  // Calculate exam average
  this.grading.exams.forEach(exam => {
    if (exam.obtainedMarks > 0) {
      const percentage = (exam.obtainedMarks / exam.maxMarks) * 100;
      totalWeightedMarks += percentage * exam.weight;
      totalWeight += exam.weight;
    }
  });
  
  return totalWeight > 0 ? Math.round(totalWeightedMarks / totalWeight) : 0;
});

// Virtual for next class
courseSchema.virtual('nextClass').get(function() {
  const now = new Date();
  const today = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format
  
  const dayMap = {
    0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
    4: 'Thursday', 5: 'Friday', 6: 'Saturday'
  };
  
  let nextClass = null;
  let minDaysAhead = 8; // More than a week
  
  this.schedule.forEach(scheduleItem => {
    const classDayIndex = Object.keys(dayMap).find(key => dayMap[key] === scheduleItem.day);
    const classTime = parseInt(scheduleItem.startTime.replace(':', ''));
    
    let daysAhead = (classDayIndex - today + 7) % 7;
    
    // If it's the same day, check if the class time has passed
    if (daysAhead === 0 && classTime <= currentTime) {
      daysAhead = 7; // Next week
    }
    
    if (daysAhead < minDaysAhead) {
      minDaysAhead = daysAhead;
      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + daysAhead);
      
      nextClass = {
        day: scheduleItem.day,
        time: scheduleItem.startTime,
        venue: scheduleItem.venue,
        date: nextDate
      };
    }
  });
  
  return nextClass;
});

// Method to mark attendance for a specific date
courseSchema.methods.markAttendance = function(date, status, notes = '') {
  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);
  
  // Check if attendance already exists for this date
  const existingRecord = this.attendanceRecords.find(record => {
    const recordDate = new Date(record.date);
    recordDate.setHours(0, 0, 0, 0);
    return recordDate.getTime() === attendanceDate.getTime();
  });
  
  if (existingRecord) {
    existingRecord.status = status;
    existingRecord.notes = notes;
  } else {
    this.attendanceRecords.push({
      date: attendanceDate,
      status,
      notes
    });
  }
  
  // Sort attendance records by date
  this.attendanceRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return this.save();
};

// Method to add assignment
courseSchema.methods.addAssignment = function(assignmentData) {
  this.grading.assignments.push(assignmentData);
  return this.save();
};

// Method to add exam
courseSchema.methods.addExam = function(examData) {
  this.grading.exams.push(examData);
  return this.save();
};

// Method to get attendance streak
courseSchema.methods.getAttendanceStreak = function() {
  if (this.attendanceRecords.length === 0) return 0;
  
  // Sort by date descending
  const sortedRecords = this.attendanceRecords
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  let streak = 0;
  for (const record of sortedRecords) {
    if (record.status === 'present' || record.status === 'late') {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
};

// Validation: end date should be after start date
courseSchema.pre('save', function(next) {
  if (this.endDate < this.startDate) {
    const error = new Error('End date must be after start date');
    error.name = 'ValidationError';
    return next(error);
  }
  next();
});

// Include virtuals when converting to JSON
courseSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Course', courseSchema);
