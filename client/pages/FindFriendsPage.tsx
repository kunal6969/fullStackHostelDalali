import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Friend, FriendRequest } from '../types';
import * as friendService from '../services/friendService';
import { Button, Input, Spinner, Alert } from '../components/UIElements';
import LoadingIndicator from '../components/LoadingIndicator';
import { 
    SearchIcon, 
    UsersIcon, 
    UserPlusIcon, 
    UserMinusIcon, 
    MessageCircleIcon,
    CheckmarkIcon,
    RejectIcon,
    EnvelopeIcon,
    LoginIcon
} from '../components/VibrantIcons';
import { useNavigate } from 'react-router-dom';

const FindFriendsPage: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [error, setError] = useState('');
    
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<User | 'not_found' | null>(null);
    const [friendshipStatus, setFriendshipStatus] = useState<'friends' | 'request_sent' | 'request_received' | 'none'>('none');

    const fetchData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        };
        setIsLoading(true);
        setError('');
        try {
            const [userFriends, userRequests] = await Promise.all([
                friendService.getFriends(),
                friendService.getFriendRequests()
            ]);
            setFriends(userFriends);
            setRequests(userRequests);
        } catch(err: any) {
            setError(err.message || 'Failed to load friend data.');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchResult(null);
        setError('');
        try {
            const result = await friendService.searchUserByUsername(searchQuery);
            if (result && user && result.id === user.id) {
                setSearchResult('not_found');
            } else if (result) {
                setSearchResult(result);
                if (user) {
                    const status = friendService.getFriendshipStatus(result.id, user.id, friends, requests);
                    const isRequestReceived = requests.some(r => r.from.id === result.id);
                    setFriendshipStatus(isRequestReceived ? 'request_received' : status);
                }
            } else {
                setSearchResult('not_found');
            }
        } catch(err: any) {
            setError(err.message || "An error occurred during search.");
        } finally {
            setIsSearching(false);
        }
    };
    
    const handleSendRequest = async (toUserId: string) => {
        if (!user) {
            navigate('/login');
            return;
        }
        await friendService.sendFriendRequest(toUserId);
        setFriendshipStatus('request_sent');
    };

    const handleAcceptRequest = async (requestId: string, fromId: string) => {
        if (!user) return;
        await friendService.handleFriendRequest(requestId, 'accept');
        await fetchData(); // Re-fetch all data
        await refreshUser(); // Refresh context
    };
    
    const handleRejectRequest = async (requestId: string) => {
        if (!user) return;
        await friendService.handleFriendRequest(requestId, 'reject');
        await fetchData(); // Re-fetch all data
    };

    const handleRemoveFriend = async (friendId: string) => {
        if (!user) return;
        await friendService.removeFriend(friendId);
        await fetchData();
        await refreshUser();
    };

    if (isLoading) {
        return <LoadingIndicator message="Loading social hub..." />;
    }

    return (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <main className="lg:col-span-2 space-y-8">
                {error && <Alert type="error" message={error} onClose={() => setError('')} />}
                {/* Search Panel */}
                <section className="bg-white/80 dark:bg-black/30 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/20 dark:border-white/10">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                       <SearchIcon className="w-6 h-6" /> Find Students
                    </h2>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Search by MNIT username (e.g., 'priya.mehta')"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                        />
                        <Button onClick={handleSearch} isLoading={isSearching}>Search</Button>
                    </div>
                    {isSearching ? <div className="mt-4"><Spinner size="sm"/></div> : searchResult && (
                        <div className="mt-4 p-4 bg-white/50 dark:bg-black/20 rounded-lg animate-fade-in">
                           {searchResult === 'not_found' ? (
                                <p className="text-slate-600 dark:text-slate-400 text-center">User not found or is not registered.</p>
                           ) : (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{searchResult.fullName}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {searchResult.currentRoom ? `${searchResult.currentRoom.hostel} - ${searchResult.currentRoom.block}/${searchResult.currentRoom.roomNumber}`: 'No room listed'}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleSendRequest(searchResult.id)}
                                        disabled={!user || friendshipStatus !== 'none'}
                                        leftIcon={friendshipStatus === 'none' ? <UserPlusIcon className="w-5 h-5"/> : <CheckmarkIcon className="w-5 h-5"/>}
                                    >
                                        {friendshipStatus === 'friends' && 'Friends'}
                                        {friendshipStatus === 'request_sent' && 'Request Sent'}
                                        {friendshipStatus === 'request_received' && 'Respond in Requests'}
                                        {friendshipStatus === 'none' && 'Send Request'}
                                    </Button>
                                </div>
                           )}
                        </div>
                    )}
                </section>
                
                {/* Friends List */}
                <section>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <UsersIcon className="w-6 h-6"/> Your Friends ({user ? friends.length : 0})
                    </h2>
                    {user ? (
                        friends.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {friends.map(friend => (
                                <div key={friend.id} className="bg-white/80 dark:bg-black/30 p-4 rounded-xl shadow-lg border border-white/20 dark:border-white/10 flex justify-between items-center transition-all hover:shadow-xl hover:scale-[1.02]">
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{friend.fullName}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {friend.currentRoom ? `${friend.currentRoom.hostel} - ${friend.currentRoom.block}/${friend.currentRoom.roomNumber}` : 'No room listed'}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" className="!p-2" title="Message"><MessageCircleIcon className="w-5 h-5"/></Button>
                                        <Button variant="ghost" size="sm" className="!p-2 !text-red-500 hover:!bg-red-500/10" title="Remove Friend" onClick={() => handleRemoveFriend(friend.id)}>
                                            <UserMinusIcon className="w-5 h-5"/>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            </div>
                        ) : (
                            <div className="text-center p-8 bg-white/80 dark:bg-black/30 rounded-xl">
                                <p className="text-slate-600 dark:text-slate-400">Your friends list is empty. Find some friends!</p>
                            </div>
                        )
                    ) : (
                        <div className="text-center p-8 bg-white/80 dark:bg-black/30 rounded-xl">
                            <p className="text-slate-600 dark:text-slate-400 mb-4">Log in to see your friends list.</p>
                            <Button onClick={() => navigate('/login')} leftIcon={<LoginIcon/>}>Login</Button>
                        </div>
                    )}
                </section>
            </main>

            {/* Right Sidebar - Friend Requests */}
            <aside className="lg:col-span-1 space-y-4">
                <div className="bg-white/80 dark:bg-black/30 backdrop-blur-md p-6 rounded-xl shadow-lg border border-white/20 dark:border-white/10 sticky top-24">
                     <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                       <EnvelopeIcon className="w-6 h-6"/> Pending Requests ({user ? requests.length : 0})
                    </h2>
                    {user ? (
                        requests.length > 0 ? (
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                                {requests.map(req => (
                                    <div key={req.id} className="p-3 bg-white/50 dark:bg-black/20 rounded-lg animate-fade-in">
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{req.from.fullName}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{req.from.rollNumber}</p>
                                        <div className="flex gap-2 mt-2">
                                            <Button size="sm" variant="primary" onClick={() => handleAcceptRequest(req.id, req.from.id)}>Accept</Button>
                                            <Button size="sm" variant="secondary" onClick={() => handleRejectRequest(req.id)}>Reject</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="text-center py-4">
                                <p className="text-slate-600 dark:text-slate-400">No pending friend requests.</p>
                            </div>
                        )
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-slate-600 dark:text-slate-400">Log in to see your friend requests.</p>
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
};

export default FindFriendsPage;