import React, { useState, useEffect, useMemo, FC, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Course } from '../types';
import * as attendanceService from '../services/attendanceService';
import { Button, Input, Modal, Alert } from '../components/UIElements';
import { PlusIcon, TrashIcon, CheckBadgeIcon, ChartPieIcon, XMarkIcon } from '../components/VibrantIcons';
import { useNavigate } from 'react-router-dom';
import LoadingIndicator from '../components/LoadingIndicator';

const COURSE_COLORS = ["#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#6366F1", "#D946EF"];

const toISODateString = (date: Date) => date.toISOString().split('T')[0];

const HexagonGraph: FC<{ courses: Course[] }> = ({ courses }) => {
    const size = 300;
    const center = size / 2;
    const radius = size * 0.4;

    const dataPoints = useMemo(() => {
        return courses.slice(0, 6).map((course, i) => {
            const totalTracked = course.attendedDays.length + course.missedDays.length;
            const attendancePercentage = totalTracked > 0 ? (course.attendedDays.length / totalTracked) : 0;
            const angle = Math.PI / 3 * i - Math.PI / 2; // -90 degrees to start at top
            const x = center + radius * attendancePercentage * Math.cos(angle);
            const y = center + radius * attendancePercentage * Math.sin(angle);
            return { x, y, color: course.color, id: course.id };
        });
    }, [courses, center, radius]);
    
    const pointsString = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

    const axisPoints = useMemo(() => {
        return Array.from({ length: 6 }).map((_, i) => {
            const angle = Math.PI / 3 * i - Math.PI / 2;
            return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
        });
    }, [center, radius]);

    return (
        <div className="relative flex justify-center items-center p-4" style={{ willChange: 'transform', transform: 'perspective(800px) rotateX(15deg) scale(0.95)' }}>
            <style>
            {`
                @keyframes draw-path { to { stroke-dashoffset: 0; } }
                @keyframes pulse-point { 50% { transform: scale(1.5); opacity: 0.7; } }
                .data-polygon { stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: draw-path 1.5s cubic-bezier(0.45, 0, 0.55, 1) forwards; }
                .data-point { animation: pulse-point 2.5s ease-in-out infinite; }
            `}
            </style>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
                <defs>
                    <linearGradient id="graph-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#A78BFA" /><stop offset="100%" stopColor="#F472B6" />
                    </linearGradient>
                    <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                {[0.25, 0.5, 0.75, 1].map(scale => (
                    <polygon key={scale} points={axisPoints.map(p => `${center + (p.x - center) * scale},${center + (p.y - center) * scale}`).join(' ')} className="fill-transparent stroke-slate-300/50 dark:stroke-slate-700/50" strokeWidth="1" />
                ))}
                {axisPoints.map((p, i) => <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} className="stroke-slate-300/50 dark:stroke-slate-700/50" strokeWidth="1" />)}
                {pointsString && <polygon points={pointsString} className="data-polygon fill-pink-400/10 dark:fill-pink-300/10" stroke="url(#graph-gradient)" strokeWidth="2.5" style={{ filter: 'url(#neon-glow)' }} />}
                {dataPoints.map((p, i) => <circle key={p.id} cx={p.x} cy={p.y} r="5" fill={p.color} className="data-point stroke-slate-100 dark:stroke-gray-950" strokeWidth="2" style={{ transformOrigin: `${p.x}px ${p.y}px`, animationDelay: `${i * 0.15}s` }} />)}
                {courses.slice(0, 6).map((course, i) => {
                    const angle = Math.PI / 3 * i - Math.PI / 2;
                    const x = center + (radius + 25) * Math.cos(angle);
                    const y = center + (radius + 25) * Math.sin(angle);
                    return (<text key={course.id} x={x} y={y} textAnchor="middle" alignmentBaseline="middle" className="text-xs font-semibold fill-slate-600 dark:fill-slate-300">{course.name}</text>);
                })}
            </svg>
        </div>
    );
};

const MonthlyCalendar: FC<{
  displayDate: Date;
  attendedDays: Set<string>;
  missedDays: Set<string>;
  onDayClick: (date: string, status: 'attended' | 'missed') => void;
  color: string;
}> = ({ displayDate, attendedDays, missedDays, onDayClick, color }) => {
    const [animationKey, setAnimationKey] = useState(0);
    useEffect(() => { setAnimationKey(k => k + 1); }, [displayDate]);
    const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const calendarGrid = useMemo(() => {
        const year = displayDate.getFullYear();
        const month = displayDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const grid: (Date | null)[][] = [];
        let dayCounter = 1;
        for (let i = 0; i < 6; i++) {
            if (dayCounter > daysInMonth) break;
            const week: (Date | null)[] = [];
            for (let j = 0; j < 7; j++) {
                if (i === 0 && j < firstDayOfMonth) week.push(null);
                else if (dayCounter <= daysInMonth) { week.push(new Date(year, month, dayCounter)); dayCounter++; }
                else week.push(null);
            }
            grid.push(week);
        }
        return grid;
    }, [displayDate]);

    const today = new Date();
    const todayString = toISODateString(today);

    const handleInteraction = (dateString: string, isFuture: boolean) => {
        if (isFuture) return;

        if (clickTimer.current) {
            clearTimeout(clickTimer.current);
            clickTimer.current = null;
            onDayClick(dateString, 'missed'); // Double-tap for missed
        } else {
            clickTimer.current = setTimeout(() => {
                onDayClick(dateString, 'attended'); // Single-tap for attended
                clickTimer.current = null;
            }, 250);
        }
    };
    
    useEffect(() => () => { if (clickTimer.current) clearTimeout(clickTimer.current); }, []);

    return (
        <div key={animationKey} className="animate-fade-in">
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-x-1 gap-y-2">
                {calendarGrid.flat().map((date, index) => {
                    if (!date) return <div key={`empty-${index}`} />;
                    const dateString = toISODateString(date);
                    const isFuture = date > today && dateString !== todayString;
                    const isToday = dateString === todayString;
                    const isAttended = attendedDays.has(dateString);
                    const isMissed = missedDays.has(dateString);

                    let baseClass = "relative w-full aspect-square flex items-center justify-center transition-all duration-300 ease-out transform focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-950 rounded-full";
                    let innerClass = "absolute inset-0 rounded-full transition-all duration-300";
                    let dayNumberClass = "z-10 font-medium";
                    let style: React.CSSProperties = {};
                    
                    if (isFuture) {
                        baseClass += " cursor-not-allowed";
                        dayNumberClass += " text-slate-400 dark:text-slate-600";
                    } else {
                        baseClass += " cursor-pointer group hover:scale-110";
                        if (isAttended) {
                            innerClass += " animate-pop-in";
                            style = { background: color, boxShadow: `0 0 6px ${color}, 0 0 10px ${color}60` };
                            dayNumberClass += " text-white font-bold mix-blend-plus-lighter";
                        } else if (isMissed) {
                            innerClass += " bg-red-900 dark:bg-red-950 animate-pop-in";
                            style = { boxShadow: `inset 0 1px 3px rgba(0,0,0,0.5), 0 0 6px #991B1B, 0 0 10px #991B1B60` };
                            dayNumberClass += " text-white/90";
                        } else { 
                            innerClass += " bg-slate-200 dark:bg-slate-700/70 group-hover:bg-slate-300 dark:group-hover:bg-slate-600/70";
                            dayNumberClass += " text-slate-800 dark:text-slate-100";
                        }
                    }

                    if (isToday) baseClass += ` ring-2 ring-offset-2 dark:ring-offset-gray-950 ring-indigo-500`;

                    return (
                        <button key={dateString} onClick={() => handleInteraction(dateString, isFuture)} className={baseClass} disabled={isFuture} aria-label={`Mark attendance for ${date.toDateString()}`}>
                            <div className={innerClass} style={style}></div>
                            {isMissed && <XMarkIcon className="w-6 h-6 z-20 text-white/80" />}
                            <span className={dayNumberClass}>{date.getDate()}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};


const AttendanceTrackerPage: FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [newCourseName, setNewCourseName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [displayDate, setDisplayDate] = useState(new Date());
    const [displayedCourseIds, setDisplayedCourseIds] = useState<Set<string>>(new Set());
    
    const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
    const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

    const fetchCourses = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const fetchedCourses = await attendanceService.getCourses();
            console.log("Fetched courses:", fetchedCourses);
            
            // Ensure we have a valid array
            if (Array.isArray(fetchedCourses)) {
                setCourses(fetchedCourses);
                if (!selectedCourseId && fetchedCourses.length > 0) {
                    setSelectedCourseId(fetchedCourses[0].id);
                }
                if (fetchedCourses.length > 0 && displayedCourseIds.size === 0) {
                    setDisplayedCourseIds(new Set(fetchedCourses.slice(0, 6).map(c => c.id)));
                }
            } else {
                console.error("fetchedCourses is not an array:", fetchedCourses);
                setCourses([]);
                setError("Courses could not be loaded (invalid data structure).");
            }
        } catch (err: any) {
            console.error("Failed to load courses:", err);
            setError(err.message || 'Failed to load courses.');
            setCourses([]);
        } finally {
            setIsLoading(false);
        }
    }, [selectedCourseId, displayedCourseIds.size]);
    
    useEffect(() => {
        if (user) {
            fetchCourses();
        } else {
            setIsLoading(false);
        }
    }, [user, fetchCourses]);

    const goToPreviousMonth = () => setDisplayDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const goToNextMonth = () => setDisplayDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

    const handleAddCourse = async () => {
        if (newCourseName.trim()) {
            try {
                const newCourse = await attendanceService.addSimpleCourse(newCourseName.trim(), COURSE_COLORS[courses.length % COURSE_COLORS.length]);
                
                // Safety check: ensure courses is an array before spreading
                if (Array.isArray(courses)) {
                    setCourses(prev => [...prev, newCourse]);
                } else {
                    console.warn("courses was not an array, resetting to new course");
                    setCourses([newCourse]);
                }
                
                if (displayedCourseIds.size < 6) setDisplayedCourseIds(prev => new Set(prev).add(newCourse.id));
                if (!selectedCourseId) setSelectedCourseId(newCourse.id);
                setNewCourseName('');
            } catch (err: any) {
                setError(err.message || "Failed to add course.");
            }
        }
    };
    
    const handleDeleteCourseClick = (course: Course) => {
        setCourseToDelete(course);
        setDeleteConfirmationText('');
    };
    
    const confirmDeleteCourse = async () => {
        if (!courseToDelete || deleteConfirmationText !== courseToDelete.name) return;
        try {
            await attendanceService.deleteCourse(courseToDelete.id);
            
            // Safety check: ensure courses is an array before filtering
            const remainingCourses = Array.isArray(courses) 
                ? courses.filter(c => c.id !== courseToDelete!.id)
                : [];
                
            setCourses(remainingCourses);
            setDisplayedCourseIds(prev => { 
                const newIds = new Set(prev); 
                newIds.delete(courseToDelete!.id); 
                return newIds; 
            });
            if (selectedCourseId === courseToDelete!.id) {
                setSelectedCourseId(remainingCourses.length > 0 ? remainingCourses[0].id : null);
            }
        } catch(err: any) {
            setError(err.message || 'Failed to delete course.');
        } finally {
            setCourseToDelete(null);
        }
    };

    const handleDayInteraction = async (dateString: string, status: 'attended' | 'missed') => {
        if (!selectedCourseId) return;
        try {
            const updatedCourse = await attendanceService.markAttendance(selectedCourseId, dateString, status);
            
            // Safety check: ensure courses is an array before mapping
            if (Array.isArray(courses)) {
                setCourses(prevCourses => prevCourses.map(c => c.id === selectedCourseId ? updatedCourse : c));
            } else {
                console.error("courses is not an array in handleDayInteraction:", courses);
                setError("Unable to update attendance due to data structure issue.");
            }
        } catch(err: any) {
            setError(err.message || 'Failed to mark attendance.');
        }
    };
    
    const handleToggleDisplay = (courseId: string) => {
        setDisplayedCourseIds(prevIds => {
            const newIds = new Set(prevIds);
            if (newIds.has(courseId)) newIds.delete(courseId);
            else if (newIds.size < 6) newIds.add(courseId);
            return newIds;
        });
    };

    const selectedCourse = useMemo(() => {
        // Safety check: ensure courses is an array before using .find()
        if (!Array.isArray(courses)) {
            console.error("courses is not an array in selectedCourse:", courses);
            return undefined;
        }
        return courses.find(c => c.id === selectedCourseId);
    }, [courses, selectedCourseId]);
    
    const displayedCourses = useMemo(() => {
        // Safety check: ensure courses is an array before using .filter()
        if (!Array.isArray(courses)) {
            console.error("courses is not an array in displayedCourses:", courses);
            return [];
        }
        return courses.filter(c => displayedCourseIds.has(c.id));
    }, [courses, displayedCourseIds]);

    if (isLoading) return <LoadingIndicator message="Loading Attendance Tracker..." />;
    if (!user) return (
        <div className="text-center p-8 bg-white/80 dark:bg-black/30 rounded-xl">
            <p className="text-slate-600 dark:text-slate-400 mb-4 text-lg">Please log in to use the Attendance Tracker.</p>
            <Button onClick={() => navigate('/login')}>Login</Button>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            {error && <Alert type="error" message={error} onClose={() => setError('')} />}
            {courseToDelete && (
                <Modal isOpen={!!courseToDelete} onClose={() => setCourseToDelete(null)} title={<div className="flex items-center gap-2 text-red-600 dark:text-red-500"><TrashIcon className="w-7 h-7" /><span>Confirm Deletion</span></div>} size="md">
                    <div className="space-y-4">
                        <p className="text-slate-700 dark:text-slate-300">You are about to permanently delete the course: <strong className="font-bold text-slate-900 dark:text-white">{courseToDelete.name}</strong>.</p>
                        <Alert type="error" message="This action is irreversible. All attendance data for this course will be lost forever." />
                        <p className="text-sm text-slate-600 dark:text-slate-400">To confirm, please type the full course name below:</p>
                        <Input value={deleteConfirmationText} onChange={e => setDeleteConfirmationText(e.target.value)} placeholder={courseToDelete.name} autoFocus />
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setCourseToDelete(null)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDeleteCourse} disabled={deleteConfirmationText !== courseToDelete.name}>Delete Permanently</Button>
                    </div>
                </Modal>
            )}

            <h1 className="text-3xl font-bold text-slate-900 dark:text-white text-center flex items-center justify-center gap-2">
                <CheckBadgeIcon className="w-9 h-9" /> Attendance Tracker
            </h1>

            <div className="bg-white/80 dark:bg-black/30 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/20 dark:border-white/10">
                <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Your Courses</h2>
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <Input placeholder="New course name (e.g. Physics)" value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCourse()} />
                    <Button onClick={handleAddCourse} disabled={!newCourseName.trim()} className="w-full sm:w-auto" leftIcon={<PlusIcon />}>Add</Button>
                </div>
                <div className="space-y-3">
                    {Array.isArray(courses) ? courses.map(course => {
                        const totalTracked = course.attendedDays.length + course.missedDays.length;
                        const percentage = totalTracked > 0 ? Math.round((course.attendedDays.length / totalTracked) * 100) : 0;
                        const isSafe = percentage >= 75;
                        const remark = totalTracked > 0 ? (isSafe ? "Safe Zone" : "Danger Zone") : "Not Started";
                        return (
                            <div key={course.id} onClick={() => setSelectedCourseId(course.id)} className={`p-4 rounded-lg cursor-pointer transition-all duration-300 border-l-4 ${selectedCourseId === course.id ? 'bg-indigo-500/10 dark:bg-indigo-500/20 shadow-lg' : 'bg-slate-100/70 dark:bg-slate-800/60 hover:bg-slate-200/70 dark:hover:bg-slate-700/60'}`} style={{ borderColor: selectedCourseId === course.id ? course.color : 'transparent' }}>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: course.color }}></div><span className="font-bold text-slate-800 dark:text-slate-100">{course.name}</span></div>
                                    <div className="flex items-center gap-4">
                                         <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${isSafe ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200'}`}>
                                            {isSafe && totalTracked > 0 ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.844-8.791a.75.75 0 0 0-1.188-.918l-3.7 4.79-1.805-1.806a.75.75 0 0 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.14-.094l4-5.2z" clipRule="evenodd" /></svg> : totalTracked > 0 && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg> }
                                            {remark}
                                        </span>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteCourseClick(course); }} className="text-slate-500 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-500/10"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5"><div className="h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${percentage}%`, backgroundColor: course.color,  boxShadow: `0 0 8px ${course.color}90` }}></div></div>
                                    <span className="text-lg font-black text-slate-700 dark:text-slate-200 w-16 text-right">{percentage}%</span>
                                </div>
                            </div>
                        )
                    }) : (
                        <div className="text-center text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            Error: Unable to display courses (invalid data structure)
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="bg-white/80 dark:bg-black/30 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/20 dark:border-white/10 space-y-4">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 text-center flex items-center justify-center gap-2"><ChartPieIcon className="w-7 h-7" /> Attendance Overview</h2>
                    <HexagonGraph courses={displayedCourses} />
                    <div>
                        <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">Select Courses for Graph (Max 6)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                            {Array.isArray(courses) ? courses.map(course => {
                                const isSelected = displayedCourseIds.has(course.id);
                                const isDisabled = !isSelected && displayedCourseIds.size >= 6;
                                return (
                                    <label key={course.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${isSelected ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-400' : 'bg-slate-100/50 dark:bg-slate-800/50 border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}>
                                        <input type="checkbox" checked={isSelected} disabled={isDisabled} onChange={() => handleToggleDisplay(course.id)} className="form-checkbox h-5 w-5 rounded text-indigo-600 bg-transparent border-slate-400 dark:border-slate-500 focus:ring-indigo-500" />
                                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{course.name}</span>
                                        <div className="w-4 h-4 rounded-full ml-auto flex-shrink-0" style={{ backgroundColor: course.color }}></div>
                                    </label>
                                );
                            }) : (
                                <div className="col-span-full text-center text-red-500 p-4">
                                    Error: Unable to display course selection (invalid data structure)
                                </div>
                            )}
                        </div>
                        {displayedCourseIds.size >= 6 && <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 text-center">You can only display 6 courses on the graph.</p>}
                    </div>
                </div>
                <div className="bg-white/80 dark:bg-black/30 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/20 dark:border-white/10">
                    <div className="flex justify-between items-center mb-4">
                        <Button onClick={goToPreviousMonth} size="sm" className="!p-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></Button>
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 text-center">{displayDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                        <Button onClick={goToNextMonth} size="sm" className="!p-2"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></Button>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 text-center">Selected for marking: <span className="font-bold" style={{color: selectedCourse?.color}}>{selectedCourse?.name || 'None'}</span></p>
                    <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 p-3 rounded-md mb-4 space-y-1.5">
                        <p><strong>• Single-Tap:</strong> Toggle a day as <span className="font-semibold text-green-600 dark:text-green-400">Attended</span>.</p>
                        <p><strong>• Double-Tap:</strong> Toggle a day as <span className="font-semibold text-red-600 dark:text-red-400">Missed</span>.</p>
                    </div>
                    {selectedCourse ? (
                        <MonthlyCalendar 
                            displayDate={displayDate}
                            attendedDays={new Set(selectedCourse.attendedDays)} 
                            missedDays={new Set(selectedCourse.missedDays)}
                            onDayClick={(date, status) => handleDayInteraction(date, status)}
                            color={selectedCourse.color}
                        />
                    ) : (
                        <div className="text-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                            <p className="text-slate-500 dark:text-slate-400">Please add and select a course to mark attendance.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttendanceTrackerPage;