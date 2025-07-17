import React, { useState, useEffect, useCallback } from 'react';
import { TrendingListing, RoomLocation, PaginationInfo } from '../types';
import * as roomListingService from '../services/roomListingService';
import RoomCard from '../components/RoomCard';
import SendMessageModal from '../components/SendMessageModal';
import { useAuth } from '../contexts/AuthContext';
import LoadingIndicator from '../components/LoadingIndicator';
import { Alert, Button } from '../components/UIElements';
import { FireIcon, RocketIcon, ChartPieIcon } from '../components/VibrantIcons';
import { useNavigate } from 'react-router-dom';


const TrendingRoomsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<TrendingListing[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasMore: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [userInterests, setUserInterests] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string>('');

  const [isSendMessageModalOpen, setIsSendMessageModalOpen] = useState(false);
  const [messageModalData, setMessageModalData] = useState<{lister: {id: string, fullName: string}, listing: {id: string, roomDetails: RoomLocation, roomSummary: string}} | null>(null);

  const fetchTrending = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    try {
        const result = await roomListingService.getTrendingListings(page, 50);
        setListings(result.listings);
        setPagination(result.pagination);
    } catch (error: any) {
        setActionError(error.message || "Failed to load trending rooms.");
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending(1);
  }, [fetchTrending]);

  const handleExpressInterest = async (listingId: string, currentInterestStatus: boolean) => {
    setActionError('');
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Optimistic UI update
    setUserInterests(prev => ({...prev, [listingId]: !currentInterestStatus}));
    setListings(prevListings =>
      prevListings.map(listing => {
        if (listing.id === listingId) {
          const newInterestCount = currentInterestStatus 
            ? (listing.interestCount || 0) - 1 
            : (listing.interestCount || 0) + 1;
          return { ...listing, interestCount: Math.max(0, newInterestCount) };
        }
        return listing;
      }).sort((a, b) => (b.interestCount || 0) - (a.interestCount || 0))
    );

    try {
        const response = await roomListingService.toggleInterest(listingId);
        // Sync with server response
        setListings(prevListings =>
            prevListings.map(listing => listing.id === listingId ? { ...listing, interestCount: response.interestCount } : listing)
                .sort((a, b) => (b.interestCount || 0) - (a.interestCount || 0))
        );
    } catch (error: any) {
        setActionError(error.message || "An error occurred.");
        // Revert optimistic update on failure
        setUserInterests(prev => ({...prev, [listingId]: currentInterestStatus}));
        fetchTrending(); // Re-fetch to be safe
    }
  };
  
  const handleOpenMessageModal = (listingId: string, listerId: string, listerName: string, roomSummary: string) => {
    setActionError('');
    if (!user) {
        navigate('/login');
        return;
    }
    const listing = listings.find(l => l.id === listingId);
    if (listing) {
      setMessageModalData({ lister: {id: listerId, fullName: listerName}, listing: {id: listingId, roomDetails: listing.roomDetails, roomSummary }});
      setIsSendMessageModalOpen(true);
    }
  };


  if (isLoading) {
    return <LoadingIndicator message="Fetching trending rooms..." />;
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3 flex items-center justify-center gap-x-2">
            <FireIcon className="w-9 h-9" />
            Trending Rooms
        </h1>
        <p className="text-lg text-slate-700 dark:text-slate-300">Discover the most sought-after rooms based on student interest!</p>
        
        {/* Trending Stats Summary */}
        {pagination.totalCount > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <div className="bg-white/80 dark:bg-black/30 backdrop-blur-md rounded-lg px-4 py-2 border border-white/20 dark:border-white/10">
              <div className="flex items-center gap-2">
                <ChartPieIcon className="w-5 h-5 text-indigo-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {pagination.totalCount} Trending Rooms
                </span>
              </div>
            </div>
            <div className="bg-white/80 dark:bg-black/30 backdrop-blur-md rounded-lg px-4 py-2 border border-white/20 dark:border-white/10">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
            </div>
          </div>
        )}
        
         {!user && (
            <div className="mt-4">
                 <Button onClick={() => navigate('/login')} variant="primary" size="md" leftIcon={<RocketIcon />}>Login to Interact</Button>
            </div>
        )}
      </div>

      {actionError && <Alert type="error" message={actionError} onClose={() => setActionError('')} className="mb-4" />}

      {isSendMessageModalOpen && messageModalData && user && (
        <SendMessageModal
            isOpen={isSendMessageModalOpen}
            onClose={() => setIsSendMessageModalOpen(false)}
            currentUser={user}
            lister={messageModalData.lister}
            listing={messageModalData.listing}
        />
      )}

      {listings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
          {listings.map((listing, index) => (
            <div key={listing.id} className="relative">
              {/* Trending Score Badge */}
              {listing.trendingScore && listing.trendingScore > 0 && (
                <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                  🔥 {listing.trendingScore.toFixed(1)}
                </div>
              )}
              
              <RoomCard
                room={listing}
                rank={index + 1}
                currentUserId={user?.id}
                onExpressInterest={handleExpressInterest}
                currentUserInterested={user ? !!userInterests[listing.id] : false}
                onInitiateExchange={(id) => alert(`Initiate exchange for room ID: ${id}. This is a bidding item though.`)}
                onMessageLister={handleOpenMessageModal}
                className="animate-pop-in"
                style={{ animationDelay: `${index * 80}ms` }}
              />
              
              {/* Activity Indicators */}
              {(listing.activeRequestsCount > 0 || listing.approvedRequestsCount > 0) && (
                <div className="mt-2 flex gap-2 text-xs">
                  {listing.activeRequestsCount > 0 && (
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                      {listing.activeRequestsCount} Active Request{listing.activeRequestsCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {listing.approvedRequestsCount > 0 && (
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                      {listing.approvedRequestsCount} Approved
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white/80 dark:bg-black/30 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-white/10">
          <FireIcon className="mx-auto h-16 w-16 text-slate-400" />
          <h3 className="mt-4 text-xl font-medium text-slate-900 dark:text-white">No Trending Rooms Found</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">There are currently no rooms listed for bidding, or none have significant interest yet.</p> 
        </div>
      )}
    </div>
  );
};

export default TrendingRoomsPage;