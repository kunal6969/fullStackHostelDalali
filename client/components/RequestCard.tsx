import React from 'react';
import { MatchRequest, RoomListing, User, RoomLocation } from '../types';
import { Button } from './UIElements';
import { HandshakeIcon, ChatBubbleIcon } from './VibrantIcons';

interface RequestCardProps {
  request: MatchRequest;
  type: 'sent' | 'received';
  currentUserId: string;
  listingDetails: RoomListing;
  requesterDetails: Pick<User, 'id' | 'fullName' | 'rollNumber'>;
  listerDetails: Pick<User, 'id' | 'fullName' | 'rollNumber'>;
  onUpdateStatus: (requestId: string, newStatus: 'Accepted' | 'Rejected') => void;
  onApproveDeal: (requestId: string) => void;
  onMessage: (partner: {id: string, fullName: string}, listing: {id: string, roomSummary: string, roomDetails: RoomLocation}) => void;
}

const RequestCard: React.FC<RequestCardProps> = ({ request, type, currentUserId, listingDetails, requesterDetails, listerDetails, onUpdateStatus, onApproveDeal, onMessage }) => {

  const { status, createdAt, id, approvals } = request;
  const { roomDetails } = listingDetails;
  const currentUserHasApproved = approvals.includes(currentUserId);
  const roomSummary = `${roomDetails.hostel} ${roomDetails.block}/${roomDetails.roomNumber}`;

  const statusStyles: { [key in MatchRequest['status']]: string } = {
    Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
    Accepted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
    Confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  };

  const handleAccept = () => onUpdateStatus(id, 'Accepted');
  const handleReject = () => onUpdateStatus(id, 'Rejected');
  const handleWithdraw = () => onUpdateStatus(id, 'Rejected');

  const handleMessageClick = () => {
    const partner = type === 'sent' ? listerDetails : requesterDetails;
    onMessage(partner, { id: listingDetails.id, roomSummary, roomDetails });
  };

  return (
    <div className="bg-white/50 dark:bg-black/20 p-4 rounded-lg shadow-md border border-slate-300/40 dark:border-white/10 transition-all hover:shadow-lg hover:border-slate-300/70 dark:hover:border-white/20 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
                <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${statusStyles[status]}`}>
                        {status}
                    </span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                       {type === 'sent' 
                         ? `Your request for ${listerDetails.fullName}'s room` 
                         : `Request from ${requesterDetails.fullName}`
                       }
                    </p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Requested on: {new Date(createdAt).toLocaleDateString()}
                </p>
            </div>
             <div className="flex gap-2 mt-2 sm:mt-0 flex-shrink-0 items-center">
                {status === 'Pending' && (
                    <>
                        {type === 'received' && (
                            <>
                                <Button variant="primary" size="sm" onClick={handleAccept}>Accept</Button>
                                <Button variant="danger" size="sm" onClick={handleReject}>Reject</Button>
                            </>
                        )}
                        {type === 'sent' && (
                            <Button variant="secondary" size="sm" onClick={handleWithdraw}>Withdraw</Button>
                        )}
                    </>
                )}
                {status === 'Accepted' && (
                     <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => onApproveDeal(id)}
                        disabled={currentUserHasApproved}
                        className={currentUserHasApproved ? '!bg-green-600' : ''}
                    >
                        {currentUserHasApproved ? 'Waiting for other party' : 'Approve Deal'}
                     </Button>
                )}
                {status !== 'Confirmed' && status !== 'Rejected' && (
                     <Button variant="ghost" size="sm" className="!p-2" onClick={handleMessageClick} title="Message user">
                        <ChatBubbleIcon />
                     </Button>
                )}
             </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-white/10 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center text-center">
            {/* Requester's Info */}
            <div className="text-sm">
                <p className="font-semibold text-slate-700 dark:text-slate-300">{requesterDetails.fullName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{requesterDetails.rollNumber}</p>
                 <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">(Wants Your Room)</p>
            </div>

            <HandshakeIcon className="w-8 h-8 mx-auto text-slate-400" />
            
            {/* Lister's Info */}
            <div className="text-sm">
                <p className="font-semibold text-slate-700 dark:text-slate-300">{listerDetails.fullName}'s Room</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{roomSummary}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">(Room You Requested)</p>
            </div>
        </div>
    </div>
  );
};

export default RequestCard;