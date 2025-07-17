/**
 * @file This file contains the EventCard component, which displays information about a single campus event.
 * It includes details like the event name, organizer, date, time, and location, as well as providing
 * controls for users to register or unregister.
 */

import React, { useState } from 'react';
import { Event } from '../types';
import { Button } from './UIElements';
import { CalendarDaysIcon, FireIcon, CheckmarkIcon, UsersIcon } from './VibrantIcons'; // Use centrally defined icons

interface EventCardProps {
    event: Event;
    isRegistered: boolean;
    onRegister: (eventId: string) => void;
    onUnregister: (eventId: string) => void;
    style?: React.CSSProperties; // For animation delay
}

/**
 * A small helper component to render a row of information with an icon, label, and value.
 */
const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="flex items-start gap-2 text-sm">
        <div className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5">{icon}</div>
        <div>
            <span className="font-medium text-slate-600 dark:text-slate-400">{label}:</span>
            <span className="text-slate-800 dark:text-slate-200 ml-1">{value}</span>
        </div>
    </div>
);


const EventCard: React.FC<EventCardProps> = ({ event, isRegistered, onRegister, onUnregister, style }) => {
    // State to manage the loading status of the registration buttons.
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Format the date and time for display.
    const eventDate = new Date(event.dateTime);
    const formattedDate = eventDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });

    /**
     * Handles the click on the "Register" button.
     * Sets the processing state, calls the onRegister prop, and then resets the state.
     */
    const handleRegisterClick = async () => {
        setIsProcessing(true);
        await onRegister(event.id);
        setIsProcessing(false);
    };

    /**
     * Handles the click on the "Registered" (Unregister) button.
     */
    const handleUnregisterClick = async () => {
        setIsProcessing(true);
        await onUnregister(event.id);
        setIsProcessing(false);
    };
    
    return (
        <div
            className="bg-white/90 dark:bg-black/30 backdrop-blur-md shadow-xl rounded-xl overflow-hidden transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1 border border-white/20 dark:border-white/10 flex flex-col justify-between animate-pop-in"
            style={style}
        >
            <div className="p-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{event.name}</h3>
                <p className="text-md font-semibold text-indigo-600 dark:text-indigo-400 mb-4">{event.organizer}</p>
                
                <div className="space-y-2.5 mb-4">
                   <InfoRow icon={<CalendarDaysIcon />} label="Date" value={formattedDate} />
                   <InfoRow icon={<FireIcon />} label="Time" value={formattedTime} />
                   <InfoRow icon={<UsersIcon />} label="Venue" value={event.location} />
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-white/5 p-3 rounded-md border border-slate-300/30 dark:border-white/10">
                    {event.description}
                </p>

                {event.registrationLink && (
                    <a 
                        href={event.registrationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline mt-3 inline-block"
                    >
                        External Registration Link
                    </a>
                )}
            </div>

            <div className="bg-black/5 dark:bg-black/20 px-6 py-4 mt-auto border-t border-black/10 dark:border-white/10">
                {isRegistered ? (
                    <Button
                        variant="secondary"
                        size="sm"
                        className="w-full !bg-green-100 dark:!bg-green-900/40 !text-green-700 dark:!text-green-200 hover:!bg-green-200 dark:hover:!bg-green-900/60"
                        onClick={handleUnregisterClick}
                        isLoading={isProcessing}
                        leftIcon={<CheckmarkIcon />}
                    >
                        Registered
                    </Button>
                ) : (
                    <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        onClick={handleRegisterClick}
                        isLoading={isProcessing}
                    >
                        Register for Event
                    </Button>
                )}
            </div>
        </div>
    );
};

export default EventCard;