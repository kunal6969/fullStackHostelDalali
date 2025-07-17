/**
 * @file This file contains the DashboardPage component, which serves as the main landing page for logged-in users.
 * It displays a welcome message, user profile information, room details, preferences, and recent messages.
 * It also provides entry points for editing the user's profile.
 */

import React, { useEffect, useState, useCallback, ChangeEvent, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, ExchangePreferences, RoomLocation, RoomType, DirectMessage } from '../types';
import { HOSTELS, BLOCKS, ROOM_TYPES, FLOORS, getHostelGender } from '../constants';
import * as messagingService from '../services/messagingService';
import { socketService } from '../services/socketService';
import { fetchApi } from '../services/api';
import LoadingIndicator from '../components/LoadingIndicator';
import { Button, Modal, Input, Select, Textarea, PhoneIcon, UserCircleIcon, IdCardIcon, MessageIcon, Alert, UsersIcon } from '../components/UIElements';
import { HomeIcon, PencilIcon, EnvelopeIcon, RocketIcon, LoginIcon, RefreshIcon } from '../components/VibrantIcons';
import { useNavigate } from 'react-router-dom';

/**
 * A component that displays a numeric counter that animates from 0 to a target value.
 * Used here to show the number of registered students.
 * @param {object} props - The component props.
 * @param {boolean} [props.congratulatory=false] - If true, displays a congratulatory message.
 * @param {string} [props.className] - Additional Tailwind CSS classes.
 */
const RegisteredUsersCounter: React.FC<{ congratulatory?: boolean, className?: string }> = ({ congratulatory = false, className = '' }) => {
    const [userCount, setUserCount] = useState(0);
    const targetCount = 69; // Static count since backend endpoint is unavailable

    useEffect(() => {
        const animateCounter = (target: number) => {
            if (target === 0) return;
            const duration = 2000; // Animation duration in ms
            let animationFrameId: number;
            let startTime: number;

            const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

            const animate = (timestamp: number) => {
                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                let progress = Math.min(elapsed / duration, 1);
                const easedProgress = easeOutCubic(progress);
                const currentDisplayCount = Math.round(easedProgress * target);
                setUserCount(currentDisplayCount);
                if (progress < 1) {
                    animationFrameId = requestAnimationFrame(animate);
                }
            };
            animationFrameId = requestAnimationFrame(animate);
            return () => cancelAnimationFrame(animationFrameId);
        };
        animateCounter(targetCount);
    }, [targetCount]);

    return (
        <div className={`text-center ${className}`}>
            <div 
                className="text-8xl md:text-9xl font-black text-transparent bg-clip-text 
                           bg-gradient-to-b from-slate-400 to-slate-600 dark:from-slate-100 dark:to-white
                           transition-all duration-500 [text-shadow:1px_1px_2px_rgba(0,0,0,0.1)]
                           dark:[text-shadow:0_0_10px_rgba(255,255,255,0.7),_0_0_25px_rgba(255,255,255,0.5),_0_0_50px_rgba(255,255,255,0.3)]"
            >
                {userCount}
            </div>
             <p className="text-lg font-medium text-slate-800 dark:text-slate-300 tracking-wider">
                {congratulatory ? "Students Have Joined The Community!" : "Registered Students"}
             </p>
             {congratulatory && <p className="text-md text-slate-600 dark:text-slate-400 mt-1">We're so glad you're one of them. 🎉</p>}
        </div>
    );
};


/**
 * A reusable card component for displaying sections of information.
 * @param {object} props - The component props.
 * @param {string} props.title - The title of the card.
 * @param {React.ReactNode} props.children - The content of the card.
 * @param {string} [props.className] - Additional CSS classes.
 * @param {React.ReactNode} [props.titleIcon] - An optional icon to display next to the title.
 */
const InfoCard: React.FC<{title: string, children: React.ReactNode, className?: string, titleIcon?: React.ReactNode}> = ({ title, children, className, titleIcon }) => (
  <div className={`bg-white/80 dark:bg-black/30 backdrop-blur-md p-6 rounded-xl shadow-lg border border-slate-200/80 dark:border-white/10 ${className}`}>
    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-200/90 dark:border-white/15 pb-3 flex items-center gap-x-2">
      {titleIcon && <span className="w-7 h-7">{titleIcon}</span>}
      {title}
    </h3>
    {children}
  </div>
);

/**
 * The dashboard view for users who are not logged in (guests).
 */
const GuestDashboard = () => {
    const navigate = useNavigate();

    return (
        <div className="text-center p-4 sm:p-8 space-y-10">
            <div className="max-w-3xl mx-auto animate-fade-in">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">Welcome to Hostel Dalali</h1>
                
                <RegisteredUsersCounter className="my-10" />

                <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
                    The ultimate platform for hostel room exchange and community connection at MNIT Jaipur.
                </p>
                <Button onClick={() => navigate('/login')} size="lg" className="mt-8" leftIcon={<LoginIcon />}>
                    Login / Sign Up to Get Started
                </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <InfoCard title="Your Current Room" titleIcon={<HomeIcon />}>
                    <p className="text-slate-700 dark:text-slate-300">Login to see your room details and list it for exchange.</p>
                </InfoCard>
                <InfoCard title="Profile & Preferences" titleIcon={<PencilIcon />}>
                    <p className="text-slate-700 dark:text-slate-300">Login to manage your profile and set your desired room preferences.</p>
                </InfoCard>
            </div>
        </div>
    );
};

/**
 * Displays the logged-in user's current room information.
 */
const UserRoomInfo: React.FC<{ room: RoomLocation | null; onRequestUpdateClick: () => void }> = ({ room, onRequestUpdateClick }) => {
  if (!room) {
    return (
      <InfoCard title="Your Current Room" titleIcon={<HomeIcon />}>
        <div className="bg-yellow-100/80 dark:bg-yellow-900/40 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg shadow-md">
          <p className="font-bold">⚠️ No Room Information</p>
          <p>Please update your profile with your current room details.</p>
        </div>
        <Button 
          variant="secondary"
          size="sm"
          className="w-full mt-4"
          onClick={onRequestUpdateClick}
        >
          Request Admin to Update Room
        </Button>
      </InfoCard>
    );
  }
  return (
    <InfoCard title="Your Current Room" titleIcon={<HomeIcon />}>
      <div className="space-y-1">
          <p className="text-slate-700 dark:text-slate-300"><span className="font-medium text-slate-500 dark:text-slate-400">Hostel:</span> {room.hostel}</p>
          <p className="text-slate-700 dark:text-slate-300"><span className="font-medium text-slate-500 dark:text-slate-400">Block:</span> {room.block}</p>
          <p className="text-slate-700 dark:text-slate-300"><span className="font-medium text-slate-500 dark:text-slate-400">Room:</span> {room.roomNumber}</p> 
          <p className="text-slate-700 dark:text-slate-300"><span className="font-medium text-slate-500 dark:text-slate-400">Type:</span> {room.type}</p>
      </div>
      <Button 
        variant="secondary"
        size="sm"
        className="w-full mt-4"
        onClick={onRequestUpdateClick}
      >
        Request Admin to Update Room
      </Button>
    </InfoCard>
  );
};

/**
 * Displays the logged-in user's profile details and exchange preferences.
 */
const UserPreferencesInfo: React.FC<{ preferences?: ExchangePreferences | null; userDetails: Pick<User, 'fullName' | 'rollNumber' | 'phoneNumber' | 'email'> }> = ({ preferences, userDetails }) => {
  const prefs = preferences || { hostels: [], blocks: [] }; // Fallback for null/undefined preferences
  return (
    <InfoCard title="Profile & Preferences" titleIcon={<PencilIcon />}>
      <p className="text-slate-700 dark:text-slate-300"><span className="font-medium text-slate-500 dark:text-slate-400">Name:</span> {userDetails.fullName}</p>
      <p className="text-slate-700 dark:text-slate-300"><span className="font-medium text-slate-500 dark:text-slate-400">Roll No:</span> {userDetails.rollNumber}</p>
      <p className="text-slate-700 dark:text-slate-300"><span className="font-medium text-slate-500 dark:text-slate-400">Phone:</span> {userDetails.phoneNumber || 'Not Set'}</p>
      <p className="text-slate-700 dark:text-slate-300"><span className="font-medium text-slate-500 dark:text-slate-400">Email:</span> {userDetails.email}</p>
      <hr className="my-3 border-slate-200/90 dark:border-white/15"/>
      <p className="text-slate-700 dark:text-slate-300"><span className="font-medium text-slate-500 dark:text-slate-400">Preferred Hostels:</span> {prefs.hostels?.join(', ') || 'Any'}</p>
      <p className="text-slate-700 dark:text-slate-300"><span className="font-medium text-slate-500 dark:text-slate-400">Preferred Blocks:</span> {prefs.blocks?.join(', ') || 'Any'}</p>
      <p className="text-slate-700 dark:text-slate-300"><span className="font-medium text-slate-500 dark:text-slate-400">Preferred Floor:</span> {prefs.floor || 'Any'}</p>
      <p className="text-slate-700 dark:text-slate-300"><span className="font-medium text-slate-500 dark:text-slate-400">Desired Room Type:</span> {prefs.roomType || 'Any'}</p>
      {prefs.notes && <p className="text-slate-700 dark:text-slate-300 mt-2"><span className="font-medium text-slate-500 dark:text-slate-400">Notes:</span> <em className="text-slate-600 dark:text-slate-400 italic">{prefs.notes}</em></p>}
    </InfoCard>
  );
};

/**
 * A modal component for editing the user's profile and preferences.
 */
const ProfileEditModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSave: (details: { prefs: ExchangePreferences; profile: Partial<Pick<User, 'fullName' | 'rollNumber' | 'phoneNumber'>>; }) => void;
}> = ({ isOpen, onClose, user, onSave }) => {
  const [currentRoom, setCurrentRoom] = useState<RoomLocation | null>(user.currentRoom);
  const [preferences, setPreferences] = useState<ExchangePreferences>(user.preferences || { hostels: [], blocks: [] });
  const [profileDetails, setProfileDetails] = useState({
    fullName: user.fullName || '',
    rollNumber: user.rollNumber || '',
    phoneNumber: user.phoneNumber || '',
  });

  // Reset form state when the modal is opened or the user prop changes.
  useEffect(() => {
    setCurrentRoom(user.currentRoom);
    setPreferences(user.preferences || { hostels: [], blocks: [] });
    setProfileDetails({
        fullName: user.fullName || '',
        rollNumber: user.rollNumber || '',
        phoneNumber: user.phoneNumber || '',
    });
  }, [user, isOpen]);

  const handleProfileDetailChange = (field: keyof typeof profileDetails, value: string) => {
    setProfileDetails(prev => ({ ...prev, [field]: value }));
  };

  // Handles changes for preference fields, including multi-select checkboxes.
  const handlePrefsChange = <K extends keyof ExchangePreferences,>(
    field: K,
    value: K extends 'hostels' | 'blocks' ? string : ExchangePreferences[K]
  ) => {
    if (field === 'hostels' || field === 'blocks') {
      const itemValue = value as string; 
      const currentFieldValues: string[] = (preferences[field] as string[] | undefined) || [];
      
      const newValues = currentFieldValues.includes(itemValue)
                          ? currentFieldValues.filter(item => item !== itemValue)
                          : [...currentFieldValues, itemValue];
      setPreferences(prev => ({ ...prev, [field]: newValues as ExchangePreferences[K] }));
    } else {
      setPreferences(prev => ({ ...prev, [field]: value as ExchangePreferences[K] }));
    }
  };

  const handleSubmit = () => {
    if (!/^\d{10}$/.test(profileDetails.phoneNumber) && profileDetails.phoneNumber) {
        alert("Please enter a valid 10-digit phone number or leave it blank.");
        return;
    }
    onSave({ prefs: preferences, profile: profileDetails });
    onClose();
  };
  
  // Memoize the list of hostels available to the user based on their gender.
  const userGenderSpecificHostels = useMemo(() => {
    if (!user || (user.gender !== 'Male' && user.gender !== 'Female')) return HOSTELS;
    return HOSTELS.filter(hName => getHostelGender(hName) === user.gender || getHostelGender(hName) === 'Unknown');
  }, [user]);


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Your Profile & Preferences" size="xl">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2"><UserCircleIcon className="w-5 h-5"/> Your Personal Details</h4>
        <Input label="Full Name" value={profileDetails.fullName} onChange={e => handleProfileDetailChange('fullName', e.target.value)} icon={<UserCircleIcon />} required />
        <Input 
            label="Roll Number" 
            value={profileDetails.rollNumber}
            icon={<IdCardIcon />} 
            disabled 
            className="!bg-slate-200/50 dark:!bg-black/30 !cursor-not-allowed"
        />
        <Input label="Phone Number" type="tel" value={profileDetails.phoneNumber} onChange={e => handleProfileDetailChange('phoneNumber', e.target.value)} placeholder="10-digit number" icon={<PhoneIcon />} />
        
        <Input 
            label="Email Address" 
            type="email" 
            value={user.email} 
            icon={<MessageIcon />} 
            disabled 
            className="!bg-slate-200/50 dark:!bg-black/30 !cursor-not-allowed"
        />
        <Select 
            label="Gender" 
            value={user.gender}
            icon={<UsersIcon />}
            options={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' },
            ]} 
            disabled
            className="!bg-slate-200/50 dark:!bg-black/30 !cursor-not-allowed"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
            Email, Roll Number, and Gender cannot be changed after registration. Please contact an admin for assistance.
        </p>

        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 pt-4 border-t border-slate-300/40 dark:border-white/10 mt-4 flex items-center gap-2"><HomeIcon className="w-5 h-5"/> Your Current Room</h4>
        <div className="bg-blue-100/80 border border-blue-300 text-blue-900 dark:bg-blue-900/40 dark:border-blue-700/50 dark:text-blue-200 p-3 rounded-md text-sm">
            Room details are locked. Use the 'Request Admin Update' button on your dashboard to make changes.
        </div>
        <Select 
            label="Hostel" 
            value={currentRoom?.hostel || ''}
            options={userGenderSpecificHostels.map(h => ({ value: h, label: h }))} 
            disabled
            required
        />
        <Select label="Block" value={currentRoom?.block || ''} options={BLOCKS.map(b => ({ value: b, label: b }))} disabled required />
        <Input label="Room Number" value={currentRoom?.roomNumber || ''} disabled required/>
        <Select label="Room Type" value={currentRoom?.type || ''} options={ROOM_TYPES.map(rt => ({ value: rt, label: rt }))} disabled required/>
 
        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 pt-4 border-t border-slate-300/40 dark:border-white/10 mt-4 flex items-center gap-2"><RefreshIcon className="w-5 h-5"/> Your Exchange Preferences</h4>
        <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Preferred Hostels (select multiple)</label> 
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            {userGenderSpecificHostels.map(hostel => (
                <label key={hostel} className="flex items-center space-x-3 p-2 border border-slate-300 dark:border-white/20 rounded-md hover:bg-white/80 dark:hover:bg-white/10 transition-colors cursor-pointer">
                <input 
                    type="checkbox" 
                    className="form-checkbox h-4 w-4 text-indigo-600 bg-slate-100 dark:bg-black/20 border-slate-400 dark:border-white/20 focus:ring-indigo-500 rounded"
                    checked={preferences.hostels?.includes(hostel)}
                    onChange={() => handlePrefsChange('hostels', hostel)}
                />
                <span className="text-slate-800 dark:text-slate-200">{hostel}</span>
                </label>
            ))}
            {userGenderSpecificHostels.length === 0 && <p className="text-sm text-yellow-600 dark:text-yellow-400 col-span-full">No hostels available matching your gender profile for preferences.</p>}
            </div>
        </div>
        <div> 
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Preferred Blocks (select multiple)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
            {BLOCKS.map(block => (
                <label key={block} className="flex items-center space-x-3 p-2 border border-slate-300 dark:border-white/20 rounded-md hover:bg-white/80 dark:hover:bg-white/10 transition-colors cursor-pointer">
                <input 
                    type="checkbox" 
                    className="form-checkbox h-4 w-4 text-indigo-600 bg-slate-100 dark:bg-black/20 border-slate-400 dark:border-white/20 focus:ring-indigo-500 rounded"
                    checked={preferences.blocks?.includes(block)}
                    onChange={() => handlePrefsChange('blocks', block)}
                />
                <span className="text-slate-800 dark:text-slate-200">{block}</span>
                </label>
            ))}
            </div>
        </div>
        <Select label="Preferred Floor" value={preferences.floor || ''} onChange={e => handlePrefsChange('floor', e.target.value as ExchangePreferences['floor'])} options={FLOORS.map(f => ({ value: f, label: f }))} placeholder="Any Floor"/>
        <Select label="Desired Room Type" value={preferences.roomType || ''} onChange={e => handlePrefsChange('roomType', e.target.value as ExchangePreferences['roomType'])} options={ROOM_TYPES.map(rt => ({ value: rt as string, label: rt as string }))} placeholder="Any Type"/>
        <Textarea label="Additional Notes" value={preferences.notes || ''} onChange={e => handlePrefsChange('notes', e.target.value)} placeholder="e.g., quiet room, specific wing..." />
      </div>
      <div className="mt-6 flex justify-end space-x-3">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit}>Save Changes</Button>
      </div>
    </Modal>
  );
};

/**
 * A modal for requesting an admin to update the user's locked room details.
 */
const RequestRoomUpdateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, file: File) => Promise<{success: boolean; message: string}>;
}> = ({ isOpen, onClose, onSubmit }) => {
    const [reason, setReason] = useState('');
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('File size must be below 5 MB.');
                setProofFile(null);
                if (e.target) e.target.value = '';
            } else {
                setError('');
                setProofFile(file);
            }
        }
    };

    const handleSubmit = async () => {
        setError('');
        setSuccessMessage('');

        const wordCount = reason.split(/\s+/).filter(Boolean).length;
        if (reason.trim().length === 0 || wordCount > 100) {
            setError('Please provide a reason between 1 and 100 words.');
            return;
        }
        if (!proofFile) {
            setError('Please upload a proof file.');
            return;
        }
        setIsSubmitting(true);
        const { success, message } = await onSubmit(reason, proofFile);
        setIsSubmitting(false);

        if (success) {
            setSuccessMessage(message);
            setReason('');
            setProofFile(null);
            setTimeout(() => onClose(), 2500); // Auto-close modal on success
        } else {
            setError(message);
        }
    };
    
    // Reset the modal's state when it's closed.
    useEffect(() => {
        if(!isOpen) {
            setTimeout(() => {
              setReason('');
              setProofFile(null);
              setError('');
              setSuccessMessage('');
              setIsSubmitting(false);
            }, 300);
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Request Room Details Update">
            <div className="space-y-4">
                 {successMessage && <Alert type="success" message={successMessage} />}
                 {error && <Alert type="error" message={error} onClose={() => setError('')} />}
                
                 {!successMessage && (
                     <>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Submit a request to the admin to change your room details. This requires a valid reason and proof.</p>
                        <div>
                            <Textarea 
                                label="Reason for Update"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g., I was allocated a different room..."
                                maxLength={500} 
                                required
                            />
                            <p className={`text-xs text-right ${reason.split(/\s+/).filter(Boolean).length > 100 ? 'text-red-500' : 'text-slate-500'}`}>{reason.split(/\s+/).filter(Boolean).length}/100 words</p>
                        </div>
                        <div>
                            <label htmlFor="updateProofFile" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Upload Proof (Image/PDF, max 5MB)
                            </label>
                            <input 
                                id="updateProofFile"
                                type="file" 
                                onChange={handleFileChange}
                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/40 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/60 transition-colors"
                                accept="image/*,.pdf"
                                required
                            />
                             {proofFile && <p className="text-xs text-green-600 dark:text-green-400 mt-1">Selected: {proofFile.name}</p>}
                        </div>
                    </>
                 )}
            </div>
             {!successMessage && (
                <div className="mt-6 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit} isLoading={isSubmitting} leftIcon={<RocketIcon />}>Send Request</Button>
                </div>
            )}
        </Modal>
    );
};

/**
 * The main component for the user dashboard.
 */
const DashboardPage: React.FC = () => {
  const { user, updateUserPreferences, updateUserDetails, loading, refreshUser } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUpdateRequestModalOpen, setIsUpdateRequestModalOpen] = useState(false);
  
  const [allMessages, setAllMessages] = useState<DirectMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const loadMessages = useCallback(async () => {
    if (user) {
        setIsLoadingMessages(true);
        try {
            const fetchedMessages = await messagingService.getMessagesForUser();
            setAllMessages(fetchedMessages || []); // Fallback to empty array
        } catch (error) {
            console.error("Failed to load messages:", error);
            setAllMessages([]); // Set to empty array on error
        } finally {
            setIsLoadingMessages(false);
        }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
        // Initial load
        loadMessages();
        
        // Listen for real-time message updates - REPLACES POLLING
        const unsubscribe = socketService.onDirectMessage(() => {
          console.log('New message received, refreshing dashboard messages');
          loadMessages();
        });

        return unsubscribe;
    }
  }, [user, loadMessages]);
  
  const handleSaveProfile = async (details: { prefs: ExchangePreferences; profile: Partial<Pick<User, 'fullName' | 'rollNumber' | 'phoneNumber'>>; }) => {
    await Promise.all([
        updateUserDetails(details.profile),
        updateUserPreferences(details.prefs)
    ]);
    refreshUser();
  };

  const handleRoomUpdateRequest = async (reason: string, file: File): Promise<{success: boolean; message: string}> => {
    try {
        const formData = new FormData();
        formData.append('reason', reason);
        formData.append('proofFile', file); // Backend expects 'proofFile'

        await fetchApi('/users/request-room-update', {
            method: 'POST',
            body: formData, // fetchApi handles FormData correctly
        });

        return { success: true, message: 'Your request has been sent to the admin for review.' };
    } catch (error: any) {
        return { success: false, message: error.message || 'An unknown error occurred.' };
    }
  };

  const { receivedMessages, sentMessages } = useMemo(() => {
    if (!user || !Array.isArray(allMessages)) return { receivedMessages: [], sentMessages: [] };
    return {
      receivedMessages: allMessages.filter(m => m.receiverId === user.id),
      sentMessages: allMessages.filter(m => m.senderId === user.id),
    };
  }, [allMessages, user]);

  if (loading) return <LoadingIndicator message="Loading user data..." />;
  if (!user) return <GuestDashboard />;
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 p-6 bg-white/80 dark:bg-black/30 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/80 dark:border-white/10">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome back, {user.fullName}! 👋</h1>
            <p className="text-slate-700 dark:text-slate-300 mt-1">Here's your personalized dashboard. ({user.gender})</p>
        </div>
        <Button onClick={() => setIsProfileModalOpen(true)} variant="secondary" size="md" leftIcon={<PencilIcon />}>Edit Profile</Button>
      </div>

      <RegisteredUsersCounter congratulatory={true} className="pt-2 pb-4" />

      {isProfileModalOpen && user && (
        <ProfileEditModal 
          isOpen={isProfileModalOpen} 
          onClose={() => setIsProfileModalOpen(false)} 
          user={user}
          onSave={handleSaveProfile}
        />
      )}
       <RequestRoomUpdateModal
          isOpen={isUpdateRequestModalOpen}
          onClose={() => setIsUpdateRequestModalOpen(false)}
          onSubmit={handleRoomUpdateRequest}
       />
      
      <div className="grid md:grid-cols-2 gap-8">
        <UserRoomInfo room={user.currentRoom} onRequestUpdateClick={() => setIsUpdateRequestModalOpen(true)} />
        <UserPreferencesInfo preferences={user.preferences} userDetails={{fullName: user.fullName, rollNumber: user.rollNumber, phoneNumber: user.phoneNumber, email: user.email}}/>
      </div>

       {/* Messages Sections */}
      <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        <InfoCard title="Received Messages" titleIcon={<EnvelopeIcon className="w-7 h-7" />}>
          {isLoadingMessages ? <LoadingIndicator size="sm" message="Loading messages..." /> :
           receivedMessages.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {receivedMessages.map(msg => (
                <div key={msg.id} className={`p-3 rounded-lg border transition-all ${msg.isReadByReceiver ? 'bg-white/50 dark:bg-white/5 border-slate-300/40 dark:border-white/10' : 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/30 dark:border-blue-500/50 animate-pulse-bg'}`}>
                  <p className="text-xs text-slate-500 dark:text-slate-400">From: <span className="font-semibold text-slate-800 dark:text-slate-200">{msg.senderName}</span> | For: <span className="text-slate-700 dark:text-slate-300">{msg.listingRoomSummary}</span></p>
                  <p className="text-slate-800 dark:text-slate-200 my-1">{msg.message}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-right">{new Date(msg.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-slate-500 dark:text-slate-400">No messages received yet.</p>}
        </InfoCard>

        <InfoCard title="Sent Messages" titleIcon={<EnvelopeIcon className="w-7 h-7" />}>
          {isLoadingMessages ? <LoadingIndicator size="sm" message="Loading messages..." /> :
           sentMessages.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {sentMessages.map(msg => (
                <div key={msg.id} className="p-3 rounded-lg border bg-white/50 dark:bg-white/5 border-slate-300/40 dark:border-white/10">
                  <p className="text-xs text-slate-500 dark:text-slate-400">To: <span className="font-semibold text-slate-800 dark:text-slate-200">{msg.receiverName}</span> | For: <span className="text-slate-700 dark:text-slate-300">{msg.listingRoomSummary}</span></p>
                  <p className="text-slate-800 dark:text-slate-200 my-1">{msg.message}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-right">{new Date(msg.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-slate-500 dark:text-slate-400">You haven't sent any messages.</p>}
        </InfoCard>
      </div>
      <style>
        {`
        @keyframes pulse-bg {
          50% {
            background-color: rgba(96, 165, 250, 0.2);
          }
        }
        .dark @keyframes pulse-bg {
          50% {
            background-color: rgba(59, 130, 246, 0.3);
          }
        }
        .animate-pulse-bg {
          animation: pulse-bg 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        `}
      </style>
    </div>
  );
};

export default DashboardPage;