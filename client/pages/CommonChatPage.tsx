import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CommonChatMessage, Poll, TextMessage, ImageMessage, PollMessage } from '../types';
import { getChatMessages, addChatMessage, voteOnPoll } from '../services/commonChatService';
import { socketService } from '../services/socketService';
import LoadingIndicator from '../components/LoadingIndicator';
import PollComponent from '../components/PollComponent';
import { Button, Textarea, Modal, Input, Alert } from '../components/UIElements';
import { BuildingIcon, ImageIcon, PollIcon, SendIcon, MaskIcon, RocketIcon } from '../components/VibrantIcons';
import { Link, useNavigate } from 'react-router-dom';


// Helper component for Poll Creation Modal
const PollCreationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreate: (pollData: { question: string; options: string[] }) => void;
}> = ({ isOpen, onClose, onCreate }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [error, setError] = useState('');

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 10) { // Limit options
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) { // Must have at least 2 options
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleCreate = () => {
    setError('');
    if (!question.trim()) {
      setError('Poll question cannot be empty.');
      return;
    }
    const filledOptions = options.map(o => o.trim()).filter(o => o);
    if (filledOptions.length < 2) {
      setError('You must provide at least two non-empty options.');
      return;
    }
    onCreate({ question, options: filledOptions });
    setQuestion('');
    setOptions(['', '']);
    onClose();
  };
  
  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
        setQuestion('');
        setOptions(['', '']);
        setError('');
    }
  }, [isOpen]);

  const modalTitle = (
    <div className="flex items-center gap-2">
      <PollIcon className="w-7 h-7" />
      <span>Create a New Poll</span>
    </div>
  );

  return ( 
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg">
      <div className="space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        <Input
          label="❓ Poll Question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What should we decide?"
          required
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">🗳️ Options</label>
          <div className="space-y-2 mt-1">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="!mt-0"
                />
                {options.length > 2 && (
                  <Button variant="danger" size="sm" onClick={() => removeOption(index)} className="!p-2">
                    &times;
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between">
            <Button variant="secondary" onClick={addOption} disabled={options.length >= 10}>
                Add Option
            </Button>
            <Button variant="primary" onClick={handleCreate}>
                Create Poll
            </Button>
        </div>
      </div>
    </Modal>
  );
};


const CommonChatPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<CommonChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const loadMessages = useCallback(async () => {
    try {
        const chatMessages = await getChatMessages();
        setMessages(chatMessages.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    } catch (error) {
        console.error("Failed to load chat messages", error);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadMessages().finally(() => setIsLoading(false));

    // Join common chat room for real-time updates
    socketService.joinCommonChat();

    // Listen for new common chat messages via Socket.IO - REPLACES POLLING
    const unsubscribe = socketService.onCommonChatMessage((newMessage: CommonChatMessage) => {
      console.log('New common chat message received via socket:', newMessage);
      // Refresh messages to include the new message
      loadMessages();
    });

    // Cleanup
    return () => {
      unsubscribe();
      socketService.leaveCommonChat();
    };
  }, [loadMessages]);
  
  const handleVote = async (messageId: string, optionIndex: number) => {
    if (!user) {
        navigate('/login');
        return;
    }
    try {
        await voteOnPoll(messageId, optionIndex);
        await loadMessages(); // Re-fetch messages to update UI
    } catch(error) {
        console.error("Failed to vote:", error);
    }
  };
  
  const getSender = () => {
      if(isAnonymous || !user) return { id: 'anonymous', name: 'Anonymous' };
      return { id: user.id, name: user.fullName };
  }

  const handleSendMessage = async () => {
    if (!user) {
        navigate('/login');
        return;
    }
    if (!newMessage.trim()) return;
    const message: Omit<TextMessage, 'id' | 'timestamp'> = {
        type: 'text',
        sender: getSender(),
        content: newMessage,
    };
    try {
        await addChatMessage(message);
        setNewMessage('');
        await loadMessages();
    } catch (error) {
        console.error("Failed to send message", error);
    }
  };
  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!user) {
        navigate('/login');
        if (imageInputRef.current) imageInputRef.current.value = "";
        return;
      }
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = async (e) => {
              const imageUrl = e.target?.result as string;
              const message: Omit<ImageMessage, 'id' | 'timestamp'> = {
                  type: 'image',
                  sender: getSender(),
                  imageUrl: imageUrl,
              };
              try {
                await addChatMessage(message);
                await loadMessages();
              } catch(error) {
                console.error("Failed to upload image", error);
              }
          };
          reader.readAsDataURL(file);
      }
      // Reset file input
      if(imageInputRef.current) imageInputRef.current.value = "";
  };
  
  const handleCreatePoll = async (pollData: { question: string; options: string[] }) => {
      const newPoll: Poll = {
          id: `poll-${Date.now()}`,
          question: pollData.question,
          options: pollData.options.map(opt => ({ text: opt, voters: [] })),
      };
      const message: Omit<PollMessage, 'id' | 'timestamp'> = {
          type: 'poll',
          sender: getSender(),
          poll: newPoll,
      };
      try {
        await addChatMessage(message);
        await loadMessages();
      } catch (error) {
        console.error("Failed to create poll", error);
      }
  };

  if (isLoading) return <LoadingIndicator message="Loading Common Room..." />;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-12rem)] flex flex-col"> 
      <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-50 dark:bg-slate-900/50 backdrop-blur-sm z-20">
        <h1 className="text-lg font-bold text-slate-900 dark:text-white text-center flex items-center justify-center gap-2">
            <BuildingIcon className="w-6 h-6" /> Common Chat Room
        </h1>
      </div>
       
      <div className="relative flex-grow p-4 overflow-y-auto">
        <div className="relative z-10 space-y-1">
            {messages.map((msg, index) => {
            const isOutgoing = user && msg.sender.id === user.id && msg.sender.id !== 'anonymous';
            const senderNameColor = 'text-purple-600 dark:text-purple-400'; 
            
            const prevMsg = messages[index - 1];
            const isSameSenderAsPrev = prevMsg && prevMsg.sender.id === msg.sender.id && prevMsg.sender.id !== 'anonymous';

            return (
                <div key={msg.id} className={`flex items-end gap-2 ${isOutgoing ? 'flex-row-reverse' : 'flex-row'} ${isSameSenderAsPrev ? 'mt-1' : 'mt-3'}`}>
                <div className={`max-w-md lg:max-w-lg rounded-xl px-3 py-2 shadow-md ${isOutgoing ? 'bg-emerald-100 dark:bg-emerald-800/60 rounded-br-none' : 'bg-white dark:bg-slate-700 rounded-bl-none'}`}>
                    {!isOutgoing && !isSameSenderAsPrev && msg.sender.id !== 'anonymous' && (
                        <p className={`text-sm font-bold mb-1 ${senderNameColor}`}>{msg.sender.name}</p>
                    )}
                    {!isOutgoing && !isSameSenderAsPrev && msg.sender.id === 'anonymous' && (
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">{msg.sender.name}</p>
                    )}
                    
                    <div className="text-sm text-slate-800 dark:text-slate-100">
                    {msg.type === 'text' && <p className="whitespace-pre-wrap">{msg.content}</p>}
                    {msg.type === 'image' && <img src={msg.imageUrl} alt="User upload" className="max-w-xs md:max-w-sm rounded-lg shadow-lg my-1" />}
                    {msg.type === 'poll' && <PollComponent messageId={msg.id} poll={msg.poll} onVote={handleVote} />}
                    </div>

                    <div className="text-right text-xs text-emerald-800/60 dark:text-emerald-300/50 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
                </div>
            );
            })}
        </div>
      </div>

      <div className="p-2 md:p-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-100 dark:bg-slate-800/80 backdrop-blur-sm z-20">
        {user ? (
            <>
                <div className="flex items-center gap-2">
                    <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/png, image/jpeg" className="hidden"/>
                    <Button variant="ghost" size="sm" onClick={() => imageInputRef.current?.click()} className="!p-2" title="Send Image"><ImageIcon className="w-6 h-6"/></Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsPollModalOpen(true)} className="!p-2" title="Create Poll"><PollIcon className="w-6 h-6"/></Button>
                    
                    <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                        placeholder="Type a message"
                        rows={1}
                        className="!mt-0 flex-grow resize-none"
                    />
                    
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()} className="!p-3" title="Send Message">
                        <SendIcon className="w-6 h-6"/>
                    </Button>
                </div>
                <div className="flex justify-end mt-2 pr-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                        <input 
                            type="checkbox" 
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            className="form-checkbox h-4 w-4 text-indigo-600 bg-slate-200 dark:bg-slate-900 border-slate-400 dark:border-slate-500 focus:ring-indigo-500 rounded"
                        /> 
                        <MaskIcon className="w-5 h-5"/> Post Anonymously
                    </label>
                </div>
            </>
        ) : (
            <div className="text-center p-4 border rounded-lg bg-slate-200/50 dark:bg-black/40">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Want to join the conversation?</p>
                <Link to="/login"><Button variant="primary" className="mt-2" leftIcon={<RocketIcon />}>Login to Chat</Button></Link>
            </div>
        )}
      </div>
      <PollCreationModal isOpen={isPollModalOpen} onClose={() => setIsPollModalOpen(false)} onCreate={handleCreatePoll} />
    </div>
  );
};

export default CommonChatPage;