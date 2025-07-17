/**
 * @file This file contains the RequestEventModal component.
 * This modal provides a form for users to submit new campus events for admin approval.
 * It handles form state, validation, and submission.
 */

import React, { useState, useEffect } from 'react';
import { Modal, Input, Textarea, Button, Alert } from './UIElements';
import { EventFormData } from '../types';
import { PlusIcon, RocketIcon } from './VibrantIcons';

interface RequestEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (formData: EventFormData) => Promise<boolean>;
}

const RequestEventModal: React.FC<RequestEventModalProps> = ({ isOpen, onClose, onSubmit }) => {
    // State for the form data
    const [formData, setFormData] = useState<EventFormData>({
        name: '',
        organizer: '',
        date: '',
        time: '',
        location: '',
        description: '',
        registrationLink: '',
    });
    // State for handling errors and submission status
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Effect to reset the form state whenever the modal is opened or closed.
    useEffect(() => {
        if (!isOpen) {
            // Delay reset to allow for closing animation
            setTimeout(() => {
                setFormData({ name: '', organizer: '', date: '', time: '', location: '', description: '', registrationLink: '' });
                setError('');
                setIsSubmitting(false);
                setSuccess(false);
            }, 300);
        }
    }, [isOpen]);
    
    /**
     * Generic handler to update the form data state.
     * @param {keyof EventFormData} field - The form field to update.
     * @param {string} value - The new value for the field.
     */
    const handleChange = (field: keyof EventFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    /**
     * Handles the form submission.
     * Performs validation and calls the onSubmit prop with the form data.
     */
    const handleSubmit = async () => {
        setError('');
        // Basic validation to ensure required fields are not empty.
        if (!formData.name || !formData.organizer || !formData.date || !formData.time || !formData.location || !formData.description) {
            setError('All fields except the registration link are required.');
            return;
        }

        setIsSubmitting(true);
        const result = await onSubmit(formData);
        setIsSubmitting(false);

        if (result) {
            setSuccess(true);
            // On success, show a success message and close the modal after a short delay.
            setTimeout(() => {
                onClose();
            }, 2500);
        } else {
            setError('There was an error submitting your request. Please try again.');
        }
    };

    const modalTitle = (
        <div className="flex items-center gap-2">
            <PlusIcon className="w-7 h-7" />
            <span>Register Your Event</span>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="xl">
            {success ? (
                // Success view after submission
                <div className="text-center p-4">
                    <CheckmarkCircleIcon className="w-16 h-16 mx-auto text-green-500" />
                    <h3 className="text-lg font-semibold mt-4 text-slate-800 dark:text-slate-200">Request Sent!</h3>
                    <p className="text-slate-600 dark:text-slate-400">Your event has been submitted for admin approval. Thank you!</p>
                </div>
            ) : (
                // Default form view
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {error && <Alert type="error" message={error} onClose={() => setError('')} />}
                    <p className="text-sm text-slate-600 dark:text-slate-400">Fill out the details below to request your event to be listed on the platform. An admin will review it shortly.</p>
                    <Input label="Event Name" value={formData.name} onChange={e => handleChange('name', e.target.value)} required />
                    <Input label="Club / Organizer Name" value={formData.organizer} onChange={e => handleChange('organizer', e.target.value)} required />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Date" type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} required min={new Date().toISOString().split("T")[0]} />
                        <Input label="Time" type="time" value={formData.time} onChange={e => handleChange('time', e.target.value)} required />
                    </div>
                    <Input label="Location / Venue" value={formData.location} onChange={e => handleChange('location', e.target.value)} required />
                    <Textarea label="Event Description" value={formData.description} onChange={e => handleChange('description', e.target.value)} rows={4} required />
                    <Input label="External Registration Link (Optional)" value={formData.registrationLink} onChange={e => handleChange('registrationLink', e.target.value)} placeholder="https://forms.gle/..." />
                </div>
            )}
             {!success && (
                <div className="mt-6 flex justify-end space-x-3">
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting} leftIcon={<RocketIcon/>}>Submit for Review</Button>
                </div>
            )}
        </Modal>
    );
};

/**
 * A simple checkmark icon inside a circle for the success message.
 */
const CheckmarkCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
  

export default RequestEventModal;