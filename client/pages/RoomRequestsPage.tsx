import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MatchRequest, RoomLocation } from '../types';
import { fetchApi } from '../services/api';
import RequestCard from '../components/RequestCard';
import LoadingIndicator from '../components/LoadingIndicator';
import SendMessageModal from '../components/SendMessageModal';
import { Modal, Button, Alert } from '../components/UIElements';
import { ClipboardDocumentListIcon, HandshakeIcon, EnvelopeIcon, CheckmarkIcon, QuestionIcon, RocketIcon, LoginIcon } from '../components/VibrantIcons';
import { useNavigate } from 'react-router-dom';


const SummaryCard: React.FC<{ title: string; count: number; icon: React.ReactNode }> = ({ title, count, icon }) => (
    <div className="bg-white/80 dark:bg-black/30 backdrop-blur-md p-6 rounded-xl shadow-lg border border-slate-200/80 dark:border-white/10 flex items-center gap-4">
        <div className="w-12 h-12 flex-shrink-0">{icon}</div>
        <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{count}</p>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
        </div>
    </div>
);

const RoomRequestsPage: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [allRequests, setAllRequests] = useState<MatchRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'sent' | 'received'>('received');
    
    // The backend should return populated requests
    const [isCongratsModalOpen, setIsCongratsModalOpen] = useState(false);
    const [congratsMessage, setCongratsMessage] = useState('');
    const [isSendMessageModalOpen, setIsSendMessageModalOpen] = useState(false);
    const [messageModalData, setMessageModalData] = useState<{lister: {id: string, fullName: string}, listing: {id: string, roomDetails: RoomLocation, roomSummary: string}} | null>(null);

    const loadData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const response = await fetchApi('/matches');
            console.log("loadData response:", response);
            
            // Handle different response structures
            let requests: MatchRequest[] = [];
            if (Array.isArray(response)) {
                requests = response;
            } else if (response && Array.isArray(response.requests)) {
                requests = response.requests;
            } else if (response && Array.isArray(response.data)) {
                requests = response.data;
            } else if (response && Array.isArray(response.matches)) {
                requests = response.matches;
            } else {
                console.warn("loadData: Unexpected response structure, using empty array");
                requests = [];
            }
            
            setAllRequests(requests);
        } catch (err: any) {
            console.error("Failed to load requests:", err);
            setError(err.message || 'Failed to load requests.');
            setAllRequests([]); // Ensure it's always an array
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);


    const { sentRequests, receivedRequests } = useMemo(() => {
        if (!user) return { sentRequests: [], receivedRequests: [] };
        
        // Safety check: ensure allRequests is an array
        if (!Array.isArray(allRequests)) {
            console.error("allRequests is not an array in useMemo:", allRequests);
            return { sentRequests: [], receivedRequests: [] };
        }
        
        // Assuming backend already filters requests for the current user
        const sent = allRequests
            .filter(r => r && r.requesterId === user.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        const received = allRequests
            .filter(r => r && r.requesterId !== user.id) // Simplified logic, assumes backend provides relevant requests
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return { sentRequests: sent, receivedRequests: received };
    }, [allRequests, user]);

    const approvedCount = useMemo(() => {
        if (!user) return 0;
        
        // Safety check: ensure allRequests is an array
        if (!Array.isArray(allRequests)) {
            console.error("allRequests is not an array in approvedCount:", allRequests);
            return 0;
        }
        
        return allRequests.filter(r => r && r.status === 'Confirmed').length;
    }, [allRequests, user]);

    const handleRequestStatusUpdate = useCallback(async (requestId: string, newStatus: 'Accepted' | 'Rejected') => {
        try {
            await fetchApi(`/matches/${requestId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Failed to update request status.');
        }
    }, [loadData]);
    
    const handleApproveDeal = async (requestId: string) => {
        if (!user) return;
        try {
            const result = await fetchApi(`/matches/${requestId}/approve`, { method: 'POST' });
            if (result.status === 'Confirmed') {
                await refreshUser();
                const otherParty = result.requester.id === user.id ? result.lister : result.requester;
                const myNewRoom = result.requester.id === user.id ? result.requester.currentRoom : result.lister.currentRoom;
                setCongratsMessage(`Congratulations! You have successfully exchanged rooms with ${otherParty.fullName}. Your new room is ${myNewRoom.hostel} ${myNewRoom.block}/${myNewRoom.roomNumber}.`);
                setIsCongratsModalOpen(true);
                await loadData();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to approve the deal.');
        }
    };

    const handleOpenMessageModal = (partner: {id: string, fullName: string}, listing: {id: string, roomSummary: string, roomDetails: RoomLocation}) => {
        if (!user) return;
        setMessageModalData({ lister: partner, listing });
        setIsSendMessageModalOpen(true);
    };

    if (isLoading) return <LoadingIndicator message="Loading your requests..." />;

    if (!user) {
        return (
            <div className="max-w-2xl mx-auto p-8 bg-white/80 dark:bg-black/30 backdrop-blur-md shadow-xl rounded-xl border border-white/20 dark:border-white/10 text-center animate-fade-in">
                <div className="w-16 h-16 mx-auto mb-4"><ClipboardDocumentListIcon/></div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">View Your Requests</h1>
                <p className="text-slate-700 dark:text-slate-300 mb-6">
                  Log in to manage your sent and received room exchange requests.
                </p>
                <Button onClick={() => navigate('/login')} size="lg" leftIcon={<LoginIcon />}>
                    Login to View Requests
                </Button>
            </div>
        );
    }

    const renderRequestList = (requests: any[], type: 'sent' | 'received') => {
        // Safety check: ensure requests is an array
        if (!Array.isArray(requests)) {
            console.error(`${type} requests is not an array:`, requests);
            return (
                <div className="text-center py-12 text-red-500">
                    <QuestionIcon className="mx-auto h-16 w-16" />
                    <h3 className="mt-4 text-xl font-medium">Error loading {type} requests</h3>
                    <p className="mt-1 text-sm">Invalid data structure received from server.</p>
                </div>
            );
        }
        
        if (requests.length === 0) {
            return (
                <div className="text-center py-12">
                    <QuestionIcon className="mx-auto h-16 w-16" />
                    <h3 className="mt-4 text-xl font-medium text-slate-900 dark:text-white">No {type} requests found.</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {type === 'sent' ? 'You can send requests from the Search page.' : 'Requests from other students for your room will appear here.'}
                    </p>
                </div>
            );
        }
        return (
            <div className="space-y-4 p-1">
                {requests.map(req => (
                    req && req.id ? (
                        <RequestCard 
                            key={req.id}
                            request={req}
                            type={type}
                            currentUserId={user.id}
                            listingDetails={req.listing} // Assuming populated by backend
                            requesterDetails={req.requester} // Assuming populated by backend
                            listerDetails={req.listing?.listedBy} // Assuming populated by backend
                            onUpdateStatus={handleRequestStatusUpdate}
                            onApproveDeal={handleApproveDeal}
                            onMessage={handleOpenMessageModal}
                        />
                    ) : null
                ))}
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto">
            {error && <Alert type="error" message={error} onClose={() => setError('')} />}
             {isCongratsModalOpen && (
                <Modal isOpen={isCongratsModalOpen} onClose={() => setIsCongratsModalOpen(false)} title="Deal Confirmed!">
                    <div className="text-center">
                        <RocketIcon className="w-16 h-16 mx-auto" />
                        <p className="mt-4 text-slate-700 dark:text-slate-300">{congratsMessage}</p>
                    </div>
                     <div className="mt-6 flex justify-end">
                        <Button onClick={() => setIsCongratsModalOpen(false)}>Close</Button>
                    </div>
                </Modal>
            )}
            {isSendMessageModalOpen && messageModalData && user && (
                <SendMessageModal
                    isOpen={isSendMessageModalOpen}
                    onClose={() => setIsSendMessageModalOpen(false)}
                    currentUser={user}
                    lister={messageModalData.lister}
                    listing={messageModalData.listing}
                />
            )}

            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6 text-center flex items-center justify-center gap-2">
                <ClipboardDocumentListIcon className="w-9 h-9" />
                Room Exchange Requests
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <SummaryCard title="Requests Received" count={receivedRequests.length} icon={<EnvelopeIcon />} />
                <SummaryCard title="Requests Sent" count={sentRequests.length} icon={<HandshakeIcon />} />
                <SummaryCard title="Approved Exchanges" count={approvedCount} icon={<CheckmarkIcon />} />
            </div>

            <div className="bg-white/80 dark:bg-black/30 backdrop-blur-md rounded-xl shadow-xl border border-white/20 dark:border-white/10">
                <div className="flex border-b border-slate-200/90 dark:border-white/10 p-2">
                    <button onClick={() => setActiveTab('received')} className={`flex-1 p-3 font-semibold rounded-md transition-colors ${activeTab === 'received' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-200' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-black/20'}`}>
                        Received ({receivedRequests.length})
                    </button>
                    <button onClick={() => setActiveTab('sent')} className={`flex-1 p-3 font-semibold rounded-md transition-colors ${activeTab === 'sent' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-200' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-black/20'}`}>
                        Sent ({sentRequests.length})
                    </button>
                </div>
                <div className="p-2 sm:p-6">
                    {activeTab === 'received' && renderRequestList(receivedRequests, 'received')}
                    {activeTab === 'sent' && renderRequestList(sentRequests, 'sent')}
                </div>
            </div>
        </div>
    );
};

export default RoomRequestsPage;