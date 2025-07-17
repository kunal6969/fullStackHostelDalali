import React, { useState } from 'react';
import { Modal, Textarea, Button, Alert } from './UIElements';
import { DirectMessage, User, RoomLocation } from '../types';
import { saveMessage } from '../services/messagingService'; // Assuming you have this service
import { ChatBubbleIcon, RocketIcon } from './VibrantIcons';

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User; // Needed for senderId and senderName
  lister: { id: string; fullName: string };
  listing: { id: string; roomDetails: RoomLocation, roomSummary: string };
}

const SendMessageModal: React.FC<SendMessageModalProps> = ({ isOpen, onClose, currentUser, lister, listing }) => {
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!messageText.trim()) {
      setError('Message cannot be empty.');
      return;
    }
    setError('');
    setSuccess('');
    setIsSending(true);

    try {
      await saveMessage({
        listingId: listing.id,
        listingRoomSummary: listing.roomSummary,
        senderId: currentUser.id,
        senderName: currentUser.fullName,
        receiverId: lister.id,
        receiverName: lister.fullName,
        message: messageText,
      });
      
      setSuccess(`Message sent successfully to ${lister.fullName}!`);
      setMessageText('');
      setTimeout(() => {
        onClose();
        setSuccess(''); // Clear success after modal closes
      }, 2000);
    } catch (e) {
      console.error("Failed to send message:", e);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Reset state when modal is opened or closed
  React.useEffect(() => {
    if (!isOpen) {
      setMessageText('');
      setError('');
      setSuccess('');
      setIsSending(false);
    }
  }, [isOpen]);

  const modalTitle = (
    <div className="flex items-center gap-2">
      <ChatBubbleIcon className="w-7 h-7" />
      <span>Message {lister.fullName}</span>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="md">
      <div className="space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} />}
        
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Regarding room: <span className="font-semibold text-slate-900 dark:text-white">{listing.roomSummary}</span>
        </p>
        
        <Textarea
          label="Your Message"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder={`Type your message to ${lister.fullName}...`}
          rows={5}
          disabled={isSending || !!success}
          className="bg-white dark:bg-black/30"
        />
        
        <div className="flex justify-end space-x-3">
          <Button variant="ghost" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSend} isLoading={isSending} disabled={isSending || !!success} leftIcon={<RocketIcon />}>
            Send Message
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SendMessageModal;