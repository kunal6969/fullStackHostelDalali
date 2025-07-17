/**
 * @file This file contains the EventsPage component, which serves as a hub for all campus events.
 * It allows users to view upcoming events, register/unregister for them, and view their own registrations.
 * Logged-in users can also submit new events for admin approval.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Event, EventFormData } from '../types';
import * as eventService from '../services/eventService';
import LoadingIndicator from '../components/LoadingIndicator';
import EventCard from '../components/EventCard';
import RequestEventModal from '../components/RequestEventModal';
import { Button } from '../components/UIElements';
import { PlusIcon, CalendarDaysIcon, CheckmarkIcon, LoginIcon } from '../components/VibrantIcons';
import { useNavigate } from 'react-router-dom';

const EventsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState<Event[]>([]);
    const [userRegistrations, setUserRegistrations] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

    const loadEventData = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedEvents = await eventService.getEvents();
            console.log("Fetched events:", fetchedEvents);
            
            // Ensure we have a valid array
            if (Array.isArray(fetchedEvents)) {
                setEvents(fetchedEvents);
            } else {
                console.error("fetchedEvents is not an array:", fetchedEvents);
                setEvents([]);
            }
            
            if (user) {
                const fetchedRegistrations = await eventService.getUserRegistrations();
                console.log("Fetched registrations:", fetchedRegistrations);
                
                // Ensure we have a valid Set
                if (fetchedRegistrations instanceof Set) {
                    setUserRegistrations(fetchedRegistrations);
                } else {
                    console.error("fetchedRegistrations is not a Set:", fetchedRegistrations);
                    setUserRegistrations(new Set());
                }
            }
        } catch (error) {
            console.error("Failed to load event data", error);
            setEvents([]);
            setUserRegistrations(new Set());
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadEventData();
    }, [loadEventData]);

    const handleToggleRegistration = async (eventId: string) => {
        if (!user) {
            navigate('/login');
            return;
        }
        const isCurrentlyRegistered = userRegistrations.has(eventId);
        
        // Optimistic UI update
        setUserRegistrations(prev => {
            const newSet = new Set(prev);
            if(isCurrentlyRegistered) {
                newSet.delete(eventId);
            } else {
                newSet.add(eventId);
            }
            return newSet;
        });

        try {
            await eventService.toggleEventRegistration(eventId);
        } catch(error) {
            console.error("Failed to toggle registration", error);
            // Revert on error
            setUserRegistrations(prev => {
                const newSet = new Set(prev);
                if(isCurrentlyRegistered) {
                    newSet.add(eventId);
                } else {
                    newSet.delete(eventId);
                }
                return newSet;
            });
        }
    };

    const handleRequestSubmit = async (formData: EventFormData): Promise<boolean> => {
        if (!user) {
            navigate('/login');
            return false;
        }
        try {
            const newEvent = await eventService.requestEventListing(formData);
            if (newEvent) {
                setIsModalOpen(false);
                // Don't add to main list, as it's pending approval
                return true;
            }
        } catch(error) {
            console.error("Failed to submit event:", error);
        }
        return false;
    };

    const openRequestModal = () => {
        if (!user) {
            navigate('/login');
        } else {
            setIsModalOpen(true);
        }
    };
    
    const displayedEvents = useMemo(() => {
        // Safety check: ensure events is an array
        if (!Array.isArray(events)) {
            console.error("events is not an array in displayedEvents:", events);
            return [];
        }
        
        const sortedEvents = [...events].sort((a,b) => {
            // Additional safety check for dateTime property
            const aTime = a?.dateTime ? new Date(a.dateTime).getTime() : 0;
            const bTime = b?.dateTime ? new Date(b.dateTime).getTime() : 0;
            return aTime - bTime;
        });
        
        if (activeTab === 'my') {
            // Ensure userRegistrations is a Set
            if (!(userRegistrations instanceof Set)) {
                console.error("userRegistrations is not a Set:", userRegistrations);
                return [];
            }
            return sortedEvents.filter(event => event?.id && userRegistrations.has(event.id));
        }
        return sortedEvents;
    }, [activeTab, events, userRegistrations]);

    if (isLoading) {
        return <LoadingIndicator message="Loading events..." />;
    }

    return (
        <div className="max-w-7xl mx-auto p-4">
            <RequestEventModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleRequestSubmit}
            />

            <div className="text-center mb-8">
                <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-3">
                    <CalendarDaysIcon className="w-10 h-10" />
                    Campus Events
                </h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
                    Stay updated with the latest happenings around MNIT.
                </p>
            </div>

            <div className="flex justify-between items-center mb-6">
                <div className="flex bg-slate-200/80 dark:bg-black/30 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('all')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'all' ? 'bg-white dark:bg-slate-700 shadow text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-black/20'}`}>
                        Upcoming Events
                    </button>
                    {user && (
                        <button onClick={() => setActiveTab('my')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'my' ? 'bg-white dark:bg-slate-700 shadow text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-black/20'}`}>
                           My Registrations
                        </button>
                    )}
                </div>
                <Button onClick={openRequestModal} leftIcon={<PlusIcon />}>
                    Submit Event
                </Button>
            </div>

            {displayedEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {Array.isArray(displayedEvents) ? displayedEvents.map((event, index) => (
                        event && event.id ? (
                            <EventCard
                                key={event.id}
                                event={event}
                                isRegistered={userRegistrations instanceof Set ? userRegistrations.has(event.id) : false}
                                onRegister={() => handleToggleRegistration(event.id)}
                                onUnregister={() => handleToggleRegistration(event.id)}
                                style={{ animationDelay: `${index * 80}ms` }}
                            />
                        ) : null
                    )) : (
                        <div className="col-span-full text-center text-red-500">
                            Error: Unable to display events (invalid data structure)
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-16 bg-white/80 dark:bg-black/30 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-white/10">
                    {activeTab === 'all' ? (
                        <>
                            <CalendarDaysIcon className="mx-auto h-16 w-16 text-slate-400" />
                            <h3 className="mt-4 text-xl font-medium text-slate-900 dark:text-white">No Upcoming Events</h3>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Check back later for new events, or submit one yourself!</p>
                        </>
                    ) : (
                        <>
                            <CheckmarkIcon className="mx-auto h-16 w-16 text-slate-400" />
                            <h3 className="mt-4 text-xl font-medium text-slate-900 dark:text-white">You have no registrations.</h3>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Browse upcoming events and register for something fun!</p>
                        </>
                    )}
                </div>
            )}
             {!user && (
                <div className="mt-10 text-center p-6 bg-blue-100/80 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700/50 rounded-lg">
                    <p className="font-semibold text-blue-800 dark:text-blue-200">Want to register for events?</p>
                    <Button onClick={() => navigate('/login')} variant="primary" size="sm" className="mt-3" leftIcon={<LoginIcon />}>
                        Login or Sign Up
                    </Button>
                </div>
            )}
        </div>
    );
};

export default EventsPage;