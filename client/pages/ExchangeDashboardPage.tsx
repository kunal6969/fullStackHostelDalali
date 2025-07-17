import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ExchangeDashboard } from '../types';
import * as exchangeDashboardService from '../services/exchangeDashboardService';
import { socketService } from '../services/socketService';
import { Button, Alert } from '../components/UIElements';
import LoadingIndicator from '../components/LoadingIndicator';
import { 
  HomeIcon, 
  HandshakeIcon, 
  CheckBadgeIcon, 
  CalendarDaysIcon, 
  XMarkIcon,
  ChartPieIcon,
  UsersIcon,
  BuildingIcon
} from '../components/VibrantIcons';

const ExchangeDashboardPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  const [dashboard, setDashboard] = useState<ExchangeDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string>(''); // Track which action is loading

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await exchangeDashboardService.fetchExchangeDashboard();
      setDashboard(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load exchange dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchDashboard();
  }, [user, navigate, fetchDashboard]);

  // Socket.IO event handlers for real-time updates
  useEffect(() => {
    if (!user) return;

    const unsubscribeExchangeCompleted = socketService.onExchangeCompleted((data) => {
      console.log('Exchange completed:', data);
      // Refresh dashboard and user profile
      fetchDashboard();
      refreshUser();
      // Show success notification
      setError(''); // Clear any errors
    });

    const unsubscribeRequestApproved = socketService.onRequestApproved((data) => {
      console.log('Request approved:', data);
      fetchDashboard();
      if (data.swapCompleted) {
        refreshUser(); // Update user's room if swap completed
      }
    });

    const unsubscribeRequestRejected = socketService.onRequestRejected((data) => {
      console.log('Request rejected:', data);
      fetchDashboard();
    });

    return () => {
      unsubscribeExchangeCompleted();
      unsubscribeRequestApproved();
      unsubscribeRequestRejected();
    };
  }, [user, fetchDashboard, refreshUser]);

  const handleApproveRequest = async (requestId: string, approved: boolean, comments?: string) => {
    setActionLoading(requestId);
    setError('');
    
    try {
      const result = await exchangeDashboardService.approveExchangeRequest(requestId, approved, comments);
      
      if (result.swapCompleted) {
        setError(''); // Clear error to show as success
        await refreshUser(); // Update user's current room
      }
      
      await fetchDashboard(); // Refresh dashboard data
    } catch (err: any) {
      setError(err.message || `Failed to ${approved ? 'approve' : 'reject'} request`);
    } finally {
      setActionLoading('');
    }
  };

  if (!user) {
    return null; // Will redirect to login
  }

  if (isLoading) {
    return <LoadingIndicator message="Loading exchange dashboard..." />;
  }

  if (!dashboard) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12 bg-white/80 dark:bg-black/30 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-white/10">
          <HandshakeIcon className="mx-auto h-16 w-16 text-slate-400" />
          <h3 className="mt-4 text-xl font-medium text-slate-900 dark:text-white">Unable to Load Dashboard</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">There was an issue loading your exchange dashboard.</p>
          <Button onClick={fetchDashboard} className="mt-4" variant="primary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3 flex items-center justify-center gap-x-2">
          <HandshakeIcon className="w-9 h-9" />
          Exchange Dashboard
        </h1>
        <p className="text-lg text-slate-700 dark:text-slate-300">
          Track your room exchange requests and activity
        </p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} className="mb-6" />}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Sent Requests */}
        <div className="bg-white/80 dark:bg-black/30 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Sent Requests</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{dashboard.sentRequests.total}</p>
            </div>
            <HandshakeIcon className="w-8 h-8 text-blue-500" />
          </div>
          <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            <span className="text-yellow-600 dark:text-yellow-400">{dashboard.sentRequests.pending} pending</span> • 
            <span className="text-green-600 dark:text-green-400 ml-1">{dashboard.sentRequests.approved} approved</span>
          </div>
        </div>

        {/* Received Requests */}
        <div className="bg-white/80 dark:bg-black/30 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Received Requests</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{dashboard.receivedRequests.total}</p>
            </div>
            <UsersIcon className="w-8 h-8 text-purple-500" />
          </div>
          <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            <span className="text-yellow-600 dark:text-yellow-400">{dashboard.receivedRequests.pending} pending</span> • 
            <span className="text-green-600 dark:text-green-400 ml-1">{dashboard.receivedRequests.approved} approved</span>
          </div>
        </div>

        {/* Approved Exchanges */}
        <div className="bg-white/80 dark:bg-black/30 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Successful Exchanges</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{dashboard.approvedExchanges}</p>
            </div>
            <CheckBadgeIcon className="w-8 h-8 text-green-500" />
          </div>
          <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Completed room swaps
          </div>
        </div>

        {/* Active Listings */}
        <div className="bg-white/80 dark:bg-black/30 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Listings</p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{dashboard.totalActiveListings}</p>
            </div>
            <BuildingIcon className="w-8 h-8 text-indigo-500" />
          </div>
          <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Your current listings
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/80 dark:bg-black/30 backdrop-blur-md rounded-xl shadow-lg border border-white/20 dark:border-white/10 p-6">
        <div className="flex items-center gap-2 mb-6">
          <ChartPieIcon className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Recent Activity</h2>
        </div>

        {dashboard.recentActivity.length > 0 ? (
          <div className="space-y-4">
            {dashboard.recentActivity.map((activity) => (
              <div
                key={activity._id}
                className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-white/5 rounded-lg border border-slate-200/50 dark:border-white/10"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${
                    activity.status === 'Pending' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                    activity.status === 'Approved' ? 'bg-green-100 dark:bg-green-900/30' :
                    activity.status === 'Rejected' ? 'bg-red-100 dark:bg-red-900/30' :
                    'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    {activity.status === 'Pending' ? (
                      <CalendarDaysIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    ) : activity.status === 'Approved' ? (
                      <CheckBadgeIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : activity.status === 'Rejected' ? (
                      <XMarkIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                    ) : (
                      <HandshakeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      {activity.actionType === 'sent' ? 'Sent request to' : 'Received request from'} {activity.requesterId.fullName}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {activity.listingId.currentRoom.hostel} {activity.listingId.currentRoom.block}/{activity.listingId.currentRoom.roomNumber} • 
                      <span className="ml-1">{new Date(activity.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons for Pending Received Requests */}
                {activity.status === 'Pending' && activity.actionType === 'received' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleApproveRequest(activity._id, true)}
                      isLoading={actionLoading === activity._id}
                      disabled={!!actionLoading}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleApproveRequest(activity._id, false)}
                      isLoading={actionLoading === activity._id}
                      disabled={!!actionLoading}
                    >
                      Reject
                    </Button>
                  </div>
                )}

                {/* Status Badge for Other States */}
                {(activity.status !== 'Pending' || activity.actionType === 'sent') && (
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    activity.status === 'Pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                    activity.status === 'Approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
                    activity.status === 'Rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
                    'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                  }`}>
                    {activity.status}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CalendarDaysIcon className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">No Recent Activity</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Your exchange requests will appear here once you start interacting with other users.
            </p>
            <Button onClick={() => navigate('/search-rooms')} className="mt-4" variant="primary">
              Browse Rooms
            </Button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 flex flex-wrap gap-4 justify-center">
        <Button onClick={() => navigate('/search-rooms')} variant="primary" leftIcon={<HomeIcon />}>
          Browse Rooms
        </Button>
        <Button onClick={() => navigate('/list-room')} variant="secondary" leftIcon={<BuildingIcon />}>
          List Your Room
        </Button>
        <Button onClick={() => navigate('/requests')} variant="secondary" leftIcon={<UsersIcon />}>
          View All Requests
        </Button>
      </div>
    </div>
  );
};

export default ExchangeDashboardPage;
