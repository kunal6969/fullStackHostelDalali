/**
 * @file This file contains the RoomCard component, a versatile card used to display
 * either a standard `RoomListing` or an AI-generated `SuggestedRoom`. It handles
 * the rendering of room details and provides action buttons for interaction.
 */

import React from 'react';
import { RoomListing, SuggestedRoom, isRoomListing } from '../types';
import { Button } from './UIElements';
import { HandshakeIcon, HeartIcon, BrokenHeartIcon, ChatBubbleIcon, FireIcon } from './VibrantIcons';


interface RoomCardProps {
  /** The room data to display, which can be a full listing or a suggestion. */
  room: RoomListing | SuggestedRoom;
  /** The ID of the currently logged-in user, used to determine which actions are available. */
  currentUserId?: string; 
  /** Callback function when the user clicks 'Request Exchange'. */
  onInitiateExchange?: (listingId: string) => void;
  /** Callback function when the user clicks 'Express Interest' or 'Retract Interest'. */
  onExpressInterest?: (listingId: string, currentInterest: boolean) => void; 
  /** Callback function when the user clicks 'Message Lister'. */
  onMessageLister?: (listingId: string, listerId: string, listerName: string, roomSummary: string) => void;
  /** Boolean indicating if the current user has already expressed interest in this listing. */
  currentUserInterested?: boolean; 
  /** Flag to indicate if the card is rendering an AI suggestion. */
  isSuggestion?: boolean;
  /** Optional rank number to display, used on the Trending page. */
  rank?: number; 
  /** Optional additional CSS classes. */
  className?: string;
  /** Optional inline styles, used for animations. */
  style?: React.CSSProperties;
}

const RoomCard: React.FC<RoomCardProps> = ({ 
  room, 
  currentUserId,
  onInitiateExchange, 
  onExpressInterest,
  onMessageLister,
  currentUserInterested = false,
  isSuggestion = false,
  rank,
  className,
  style
}) => {
  // Use a type guard to differentiate between RoomListing and SuggestedRoom and get the correct details.
  const details = isRoomListing(room) ? room.roomDetails : room;
  const listingData = isRoomListing(room) ? room : null;

  // Click handlers for the action buttons.
  const handleInterestClick = () => {
    if (listingData && onExpressInterest) {
      onExpressInterest(listingData.id, currentUserInterested);
    }
  };

  const handleExchangeClick = () => {
    if (listingData && onInitiateExchange) {
      onInitiateExchange(listingData.id);
    }
  };

  const handleMessageClick = () => {
    if (listingData && onMessageLister && room.listedBy) {
      const roomSummary = `${details.hostel} ${details.block}/${details.roomNumber}`;
      onMessageLister(listingData.id, room.listedBy.id, room.listedBy.fullName, roomSummary);
    }
  };
  
  // Determine if the "Message Lister" button should be shown.
  const canMessageLister = listingData && room.listedBy && currentUserId && room.listedBy.id !== currentUserId;
  // Determine the style for the listing type badge.
  const listingTypeBadgeClass = listingData?.listingType === 'Exchange' 
    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' 
    : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';


  return (
    <div 
        className={`bg-white/90 dark:bg-black/30 backdrop-blur-md shadow-xl rounded-xl overflow-hidden transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1 border border-white/20 dark:border-white/10 flex flex-col justify-between ${className || ''}`}
        style={style}
    >
      <div className="p-5 sm:p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center">
            {rank && <span className="mr-3 text-2xl font-bold text-indigo-400 dark:text-indigo-300">#{rank}</span>}
            {details.hostel} - {details.block}/{details.roomNumber}
          </h3>
          {listingData && (
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${listingTypeBadgeClass}`}>
              {listingData.listingType}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Type: <span className="font-medium text-slate-800 dark:text-slate-200">{details.type}</span></p>
        
        {/* Display lister info if available */}
        {('listedBy' in room && room.listedBy) && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
            Listed by: <span className="font-medium text-slate-800 dark:text-slate-200">{room.listedBy.fullName} ({room.listedBy.rollNumber})</span>
          </p>
        )}

        {/* Display description and trade conditions if it's a full listing */}
        {listingData?.description && (
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-3 mb-3 bg-white/50 dark:bg-white/5 p-3 rounded-md border border-slate-300/30 dark:border-white/10">{listingData.description}</p>
        )}
        {listingData?.desiredTradeConditions && (
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-3 mb-3 bg-white/50 dark:bg-white/5 p-3 rounded-md italic border border-slate-300/30 dark:border-white/10">
            <span className="font-semibold not-italic">Wants:</span> {listingData.desiredTradeConditions}
          </p>
        )}
        {/* Display AI reasoning if it's a suggestion */}
        {isSuggestion && 'reasoning' in room && room.reasoning && ( 
           <p className="text-sm text-indigo-800 dark:text-indigo-200 mt-3 mb-3 bg-indigo-500/10 dark:bg-indigo-500/20 p-3 rounded-md border border-indigo-500/20 dark:border-indigo-500/40"><span className="font-bold">💡 AI Suggestion:</span> {room.reasoning}</p>
        )}

        {/* Display interest count for bidding listings */}
        {listingData && listingData.listingType === 'Bidding' && (
          <p className="text-sm text-slate-800 dark:text-slate-200 font-semibold mt-2 mb-2 flex items-center gap-1.5">
            <FireIcon className="w-5 h-5"/> {listingData.interestCount || 0} students interested
          </p>
        )}

        {listingData && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Status: <span className={`font-semibold ${listingData.status === 'Open' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{listingData.status}</span></p>
        )}
        
        {/* Action buttons section */}
        <div className="mt-4 space-y-2">
            {listingData && listingData.status === 'Open' && (
              listingData.listingType === 'Exchange' ? (
                onInitiateExchange && (
                  <Button 
                    onClick={handleExchangeClick}
                    variant="primary" 
                    size="sm"
                    className="w-full"
                    leftIcon={<HandshakeIcon />}
                  > 
                    Request Exchange
                  </Button>
                )
              ) : ( // Bidding type
                onExpressInterest && (
                  <Button 
                    onClick={handleInterestClick}
                    variant={currentUserInterested ? "secondary" : "primary"}
                    size="sm"
                    className={`w-full ${currentUserInterested ? '!bg-red-100 dark:!bg-red-900/40 !text-red-700 dark:!text-red-200 hover:!bg-red-200 dark:hover:!bg-red-900/60' : ''}`}
                    leftIcon={currentUserInterested ? <BrokenHeartIcon /> : <HeartIcon />}
                  > 
                    {currentUserInterested ? 'Retract Interest' : 'Express Interest / Bid'}
                  </Button>
                )
              )
            )}
            {canMessageLister && onMessageLister && (
                <Button 
                    onClick={handleMessageClick}
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    leftIcon={<ChatBubbleIcon className="w-5 h-5" />}
                > 
                    Message Lister
                </Button>
            )}
        </div>
      </div>
      {/* Footer of the card */}
      {listingData && (
        <div className="bg-black/5 dark:bg-black/20 px-6 py-2 text-right border-t border-black/10 dark:border-white/10 mt-auto">
            <p className="text-xs text-slate-600 dark:text-slate-400">
            Listed: {new Date(listingData.createdAt).toLocaleDateString()}
            </p>
        </div>
        )}
    </div>
  );
};

export default RoomCard;