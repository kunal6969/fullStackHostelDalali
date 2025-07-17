import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { RoomListing, ListingType, RoomType, RoomLocation } from '../types';
import { HOSTELS, BLOCKS, ROOM_TYPES, getHostelGender } from '../constants';
import * as roomListingService from '../services/roomListingService';
import RoomCard from '../components/RoomCard';
import SendMessageModal from '../components/SendMessageModal';
import { Input, Select, Button, Alert } from '../components/UIElements';
import { useAuth } from '../contexts/AuthContext';
import LoadingIndicator from '../components/LoadingIndicator';
import { SearchIcon as VibrantSearchIcon, QuestionIcon } from '../components/VibrantIcons';
import { useNavigate } from 'react-router-dom';


const SearchPage: React.FC = () => {
  const { user } = useAuth(); 
  const navigate = useNavigate();
  const [allListings, setAllListings] = useState<RoomListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<{
    hostel: string;
    block: string;
    listingType: ListingType | '';
    roomType: RoomType | '';
  }>({
    hostel: '',
    block: '',
    listingType: '',
    roomType: '',
  });

  const [userInterests, setUserInterests] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string>('');
  const [isApiUnavailable, setIsApiUnavailable] = useState(false);

  const [isSendMessageModalOpen, setIsSendMessageModalOpen] = useState(false);
  const [messageModalData, setMessageModalData] = useState<{lister: {id: string, fullName: string}, listing: {id: string, roomDetails: RoomLocation, roomSummary: string}} | null>(null);

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    setIsApiUnavailable(false);
    try {
        const listings = await roomListingService.getListings();
        console.log("Fetched listings:", listings);
        
        // Ensure we have a valid array
        if (Array.isArray(listings)) {
            setAllListings(listings);
            setActionError(''); // Clear any previous errors
        } else {
            console.error("fetchedListings is not an array:", listings);
            setAllListings([]);
            setActionError("Room listings could not be loaded (invalid data structure).");
        }
    } catch (error: any) {
        console.error("Failed to load room listings:", error);
        
        // Check if it's a network/API error
        if (error.message?.includes('fetch') || error.message?.includes('500') || error.message?.includes('404')) {
            setIsApiUnavailable(true);
            setActionError("Unable to connect to the server. Please check if the backend is running on http://localhost:5000");
        } else {
            setActionError(error.message || "Failed to load room listings.");
        }
        setAllListings([]);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setActionError('');
  };
  
  const handleExpressInterest = async (listingId: string, currentInterestStatus: boolean) => {
    setActionError('');
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Optimistic UI update
    setUserInterests(prev => ({...prev, [listingId]: !currentInterestStatus}));
    setAllListings(prevListings => {
        // Safety check: ensure prevListings is an array
        if (!Array.isArray(prevListings)) {
          console.error("prevListings is not an array:", prevListings);
          return [];
        }
        
        return prevListings.map(listing => {
          if (listing && listing.id === listingId) {
            const newInterestCount = currentInterestStatus 
              ? (listing.interestCount || 0) - 1 
              : (listing.interestCount || 0) + 1;
            return { ...listing, interestCount: Math.max(0, newInterestCount) };
          }
          return listing;
        });
      });

    try {
        const response = await roomListingService.toggleInterest(listingId);
        console.log("Toggle interest response:", response);
        
        // Safety check: ensure response has interestCount
        if (response && typeof response.interestCount === 'number') {
            // Sync with server response
            setAllListings(prevListings => {
                // Safety check: ensure prevListings is an array
                if (!Array.isArray(prevListings)) {
                  console.error("prevListings is not an array in sync:", prevListings);
                  return [];
                }
                
                return prevListings.map(listing => 
                    listing && listing.id === listingId 
                        ? { ...listing, interestCount: response.interestCount } 
                        : listing
                );
            });
        } else {
            console.warn("Invalid response from toggleInterest:", response);
            setActionError("Interest updated, but count may not be accurate.");
        }
    } catch (error: any) {
        setActionError(error.message || "An error occurred.");
        // Revert optimistic update on failure
        setUserInterests(prev => ({...prev, [listingId]: currentInterestStatus}));
        fetchListings(); // Re-fetch to be safe
    }
  };
  
  const handleOpenMessageModal = (listingId: string, listerId: string, listerName: string, roomSummary: string) => {
    setActionError('');
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Safety check: ensure allListings is an array (use allListings instead of filteredListings)
    if (!Array.isArray(allListings)) {
      console.error("allListings is not an array:", allListings);
      setActionError("Unable to open message modal due to data issue.");
      return;
    }
    
    const listing = allListings.find(l => l && l.id === listingId);
    if (listing && listing.roomDetails) {
      setMessageModalData({ 
        lister: {id: listerId, fullName: listerName}, 
        listing: {id: listingId, roomDetails: listing.roomDetails, roomSummary }
      });
      setIsSendMessageModalOpen(true);
    } else {
      setActionError("Unable to find listing details.");
    }
  };

  const handleInitiateExchange = (id: string) => {
    if (!user) {
        navigate('/login');
        return;
    }
    alert(`Initiate exchange for room ID: ${id}`);
  }


  const filteredListings = useMemo(() => {
    // Safety check: ensure allListings is an array
    if (!Array.isArray(allListings)) {
      console.error("allListings is not an array in filteredListings:", allListings);
      return [];
    }
    
    return allListings.filter(listing => {
      // Safety check: ensure listing object exists and has required properties
      if (!listing || !listing.listedBy || !listing.roomDetails) {
        console.warn("Invalid listing object:", listing);
        return false;
      }
      
      if (user && listing.listedBy.id === user.id) return false; 
      if (listing.status !== 'Open') return false; 

      const matchesHostel = filters.hostel ? listing.roomDetails.hostel === filters.hostel : true;
      const matchesBlock = filters.block ? listing.roomDetails.block === filters.block : true;
      const matchesListingType = filters.listingType ? listing.listingType === filters.listingType : true;
      const matchesRoomType = filters.roomType && filters.roomType !== 'Any' ? listing.roomDetails.type === filters.roomType : true;
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearchTerm = searchTerm ? (
        listing.roomDetails.hostel.toLowerCase().includes(searchLower) ||
        listing.roomDetails.block.toLowerCase().includes(searchLower) ||
        listing.roomDetails.roomNumber.toLowerCase().includes(searchLower) ||
        (listing.description && listing.description.toLowerCase().includes(searchLower)) ||
        (listing.desiredTradeConditions && listing.desiredTradeConditions.toLowerCase().includes(searchLower)) ||
        (listing.listedBy.fullName && listing.listedBy.fullName.toLowerCase().includes(searchLower)) ||
        (listing.listedBy.rollNumber && listing.listedBy.rollNumber.toLowerCase().includes(searchLower))
      ) : true;

      return matchesHostel && matchesBlock && matchesListingType && matchesRoomType && matchesSearchTerm;
    });
  }, [allListings, filters, searchTerm, user]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilters({ hostel: '', block: '', listingType: '', roomType: '' });
    setActionError('');
  };
  
  const availableHostelOptions = useMemo(() => {
    const baseOptions = [{ value: '', label: 'All Hostels' }];
    if (!user || (user.gender !== 'Male' && user.gender !== 'Female')) {
        return [...baseOptions, ...HOSTELS.map(h => ({ value: h, label: h }))]
    }
    const genderFilteredHostels = HOSTELS.filter(hName => {
        const hostelG = getHostelGender(hName);
        return hostelG === user.gender || hostelG === 'Unknown';
    });
    return [...baseOptions, ...genderFilteredHostels.map(h => ({ value: h, label: h }))];
  }, [user]);


  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 text-center flex items-center justify-center gap-2">
        <VibrantSearchIcon className="w-8 h-8"/> Search Available Rooms
      </h1>
      <p className="text-center text-md text-slate-700 dark:text-slate-300 mb-6">Find your next hostel room at MNIT.</p>

      <div className="bg-white/80 dark:bg-black/30 backdrop-blur-md p-6 rounded-xl shadow-lg mb-8 border border-white/20 dark:border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 items-end">
          <Input
            label="📝 Search by keyword"
            placeholder="e.g., HL-1, Single, Priya..."
            value={searchTerm}
            onChange={(e) => {setSearchTerm(e.target.value); setActionError('');}}
            className="lg:col-span-1"
          />
          <Select
            label="🏢 Filter by Hostel"
            value={filters.hostel}
            onChange={(e) => handleFilterChange('hostel', e.target.value)}
            options={availableHostelOptions}
            placeholder="All Hostels"
          />
          <Select
            label="🚪 Filter by Block"
            value={filters.block}
            onChange={(e) => handleFilterChange('block', e.target.value)}
            options={[{ value: '', label: 'All Blocks' }, ...BLOCKS.map(b => ({ value: b, label: b }))]}
          />
          <Select
            label="🏷️ Filter by Listing Type"
            value={filters.listingType}
            onChange={(e) => handleFilterChange('listingType', e.target.value as ListingType | '')}
            options={[
              { value: '', label: 'All Types' },
              { value: 'Exchange', label: 'Exchange' },
              { value: 'Bidding', label: 'Bidding' }
            ]}
          />
          <Select
            label="🛌 Filter by Room Type"
            value={filters.roomType}
            onChange={(e) => handleFilterChange('roomType', e.target.value as RoomType | '')}
            options={[ {value: '', label: 'All Room Types'}, ...ROOM_TYPES.map(rt => ({ value: rt, label: rt }))]}
          />
          <Button onClick={resetFilters} variant="secondary" className="h-10 w-full md:w-auto">🔄 Reset Filters</Button>
        </div>
      </div>

      {actionError && (
        <div className="mb-4">
          <Alert 
            type="error" 
            message={actionError} 
            onClose={() => setActionError('')}
          />
          {isApiUnavailable && (
            <div className="mt-2 text-center">
              <Button 
                onClick={fetchListings} 
                variant="secondary" 
                size="sm"
              >
                🔄 Retry Connection
              </Button>
            </div>
          )}
        </div>
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

      {isLoading ? (
        <LoadingIndicator message="Loading listings..." />
      ) : filteredListings.length > 0 ? ( 
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
          {Array.isArray(filteredListings) ? filteredListings.map((listing, index) => (
            listing && listing.id ? (
              <RoomCard 
                key={listing.id} 
                room={listing} 
                currentUserId={user?.id}
                onInitiateExchange={handleInitiateExchange}
                onExpressInterest={handleExpressInterest}
                currentUserInterested={!!userInterests[listing.id]}
                onMessageLister={handleOpenMessageModal}
                className="animate-pop-in"
                style={{ animationDelay: `${index * 80}ms` }}
              />
            ) : null
          )) : (
            <div className="col-span-full text-center text-red-500">
              Error: Unable to display listings (invalid data structure)
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white/80 dark:bg-black/30 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-white/10">
          <QuestionIcon className="mx-auto h-16 w-16" />
          <h3 className="mt-4 text-xl font-medium text-slate-900 dark:text-white">No Rooms Found</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Try adjusting your search or filter criteria. Listings are filtered based on your gender if logged in.</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;