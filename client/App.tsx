/**
 * @file This is the root component of the application.
 * It sets up the main structure, including context providers, routing,
 * the navigation bar, and the footer.
 */

import React, { ReactNode, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AuthContextProvider, useAuth } from './contexts/AuthContext';
import { ThemeContextProvider, useTheme } from './contexts/ThemeContext';
import { socketService } from './services/socketService';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ListRoomPage from './pages/ListRoomPage'; 
import SearchPage from './pages/SearchPage'; 
import TrendingRoomsPage from './pages/TrendingRoomsPage';
import RoomRequestsPage from './pages/RoomRequestsPage';
import MessagesPage from './pages/MessagesPageNew'; 
import CommonChatPage from './pages/CommonChatPage'; 
import FindFriendsPage from './pages/FindFriendsPage';
import EventsPage from './pages/EventsPage';
import AttendanceTrackerPage from './pages/AttendanceTrackerPage';
import ExchangeDashboardPage from './pages/ExchangeDashboardPage';
import { Spinner, Button } from './components/UIElements'; 
import * as messagingService from './services/messagingService';
import * as friendService from './services/friendService';
import { 
    Gradients, SunIcon, MoonIcon, HomeIcon, SearchIcon, PlusIcon, FireIcon, EnvelopeIcon, LogoutIcon, LoginIcon, BuildingIcon, ClipboardDocumentListIcon, UsersIcon, CalendarDaysIcon, CheckBadgeIcon, HandshakeIcon
} from './components/VibrantIcons';


/**
 * A simple toggle button for switching between light and dark themes.
 */
const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    return (
        <button
            onClick={toggleTheme} 
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-200" 
            aria-label="Toggle theme" 
        >
            {theme === 'light' ? <MoonIcon className="w-7 h-7" /> : <SunIcon className="w-7 h-7" />}
        </button>
    );
};

/**
 * A simpler navigation bar component.
 * It's responsive, with a dropdown menu on mobile.
 */
const Navbar: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [pendingFriendRequestCount, setPendingFriendRequestCount] = useState(0);

  // Navigation items configuration, ordered by importance
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <HomeIcon /> },
    { path: '/search-rooms', label: 'Search', icon: <SearchIcon /> },
    { path: '/list-room', label: 'List Room', icon: <PlusIcon /> },
    { path: '/trending-rooms', label: 'Trending', icon: <FireIcon /> },
    { path: '/requests', label: 'Requests', icon: <ClipboardDocumentListIcon /> },
    { path: '/exchange-dashboard', label: 'Exchange', icon: <HandshakeIcon /> },
    { path: '/messages', label: 'Messages', icon: <EnvelopeIcon />, badge: () => user && unreadMsgCount > 0 ? unreadMsgCount : null },
    { path: '/find-friends', label: 'Friends', icon: <UsersIcon />, badge: () => user && pendingFriendRequestCount > 0 ? pendingFriendRequestCount : null },
    { path: '/events', label: 'Events', icon: <CalendarDaysIcon /> },
    { path: '/attendance-tracker', label: 'Attendance', icon: <CheckBadgeIcon /> },
    { path: '/common-chat', label: 'Chat Room', icon: <BuildingIcon /> },
  ];

  // Effect to fetch notification counts for the current user using real-time updates
  useEffect(() => {
    if (user) {
        const fetchCounts = async () => {
            try {
                const [msgCount, reqs] = await Promise.all([
                    messagingService.countUnreadMessages(),
                    friendService.getFriendRequests()
                ]);
                setUnreadMsgCount(msgCount);
                setPendingFriendRequestCount(reqs.length);
            } catch (error) {
                console.error("Failed to fetch notification counts", error);
            }
        };

        // Initial fetch
        fetchCounts();
        
        // Listen for real-time message updates to refresh counts
        const unsubscribe = socketService.onDirectMessage(() => {
          fetchCounts(); // Refresh counts when new messages arrive
        });

        return unsubscribe;
    } else {
      setUnreadMsgCount(0);
      setPendingFriendRequestCount(0);
    }
  }, [user]);
  
  // Close mobile menu automatically on route change.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);


  // Helper component for a single navigation link
  const NavLink: React.FC<{ item: typeof navItems[0], isMobile?: boolean }> = ({ item, isMobile }) => {
    const isActive = location.pathname.startsWith(item.path);
    const badgeCount = item.badge ? item.badge() : null;

    // Desktop: Icon-only buttons with tooltips
    if (!isMobile) {
        return (
          <div className="relative group">
              <Link
                to={item.path}
                className={`relative flex items-center justify-center p-2 rounded-full transition-colors duration-200
                  ${isActive 
                    ? 'bg-black/10 dark:bg-white/10' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'}`
                }
              > 
                <span className={`w-7 h-7 transition-transform group-hover:scale-110 ${isActive ? 'text-slate-900 dark:text-white' : ''}`}>{item.icon}</span>
                {badgeCount && (
                   <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow ring-2 ring-slate-100/80 dark:ring-gray-950/80">
                     {badgeCount}
                   </span>
                )}
              </Link>
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                <span className="bg-slate-800 text-white text-xs px-2 py-1 rounded-md shadow-lg whitespace-nowrap">
                  {item.label}
                </span>
              </div>
          </div>
        );
    }
    
    // Mobile: Full text and icon
    return (
      <Link
        to={item.path}
        className={`relative flex items-center gap-x-3 px-3 py-2 rounded-md font-semibold transition-colors text-lg
          ${isActive 
            ? 'text-slate-900 dark:text-white bg-black/10 dark:bg-white/10' 
            : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'}`
        }
      > 
        <span className="w-6 h-6">{item.icon}</span>
        <span>{item.label}</span>
        {badgeCount && (
           <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow ml-auto">
             {badgeCount}
           </span>
        )}
      </Link>
    );
  };

  return (
    <nav className="bg-slate-100/80 dark:bg-gray-950/80 backdrop-blur-xl shadow-lg fixed top-0 left-0 right-0 z-30 border-b border-slate-200/50 dark:border-slate-800/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="logo-font text-2xl font-extrabold text-slate-800 dark:text-white transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 whitespace-nowrap">
                Hostel Dalali
            </Link>
          </div>
          
          {/* Center: Desktop Nav Links */}
          <div className="hidden lg:flex items-center justify-center gap-x-2">
            {user && navItems.map(item => <NavLink key={item.path} item={item} />)}
          </div>

          {/* Right: Controls */}
          <div className="flex items-center justify-end gap-x-2">
             <ThemeToggle />
             {user ? (
                <Button onClick={logout} variant="ghost" className="hidden lg:flex p-2" title="Logout">
                    <LogoutIcon />
                </Button>
             ) : (
                !loading && location.pathname !== '/login' && (
                  <Link to="/login" className="hidden lg:block">
                      <Button variant="primary" size="sm" leftIcon={<LoginIcon className="w-5 h-5" />}> 
                          Login
                      </Button>
                  </Link>
                )
             )}
             {loading && !user && <Spinner size="sm" />}

             {/* Mobile Hamburger */}
             <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Open menu"
            >
              {isMenuOpen ? <XIcon className="h-7 w-7" /> : <MenuIcon className="h-7 w-7" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {isMenuOpen && (
            <div className="lg:hidden pb-4 space-y-1 animate-fade-in">
                {user ? navItems.map(item => <NavLink key={item.path} item={item} isMobile />) : (
                  <div className="p-4 text-center text-slate-500">Please log in to see navigation options.</div>
                )}
                 {user ? (
                    <Button onClick={logout} variant="secondary" className="w-full mt-2" title="Logout" leftIcon={<LogoutIcon />}>
                        Logout
                    </Button>
                 ) : (
                    !loading && location.pathname !== '/login' && (
                      <Link to="/login" className="block">
                          <Button variant="primary" size="sm" className="w-full mt-2" leftIcon={<LoginIcon className="w-5 h-5" />}> 
                              Login
                          </Button>
                      </Link>
                    )
                 )}
            </div>
        )}
      </div>
    </nav>
  );
};


interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * A wrapper component that protects routes requiring authentication.
 * It shows a loading spinner while checking auth status and redirects to the login page if the user is not authenticated.
 * @param {object} props - The component props.
 * @param {ReactNode} props.children - The child components to render if the user is authenticated.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/**
 * The main body of the application, containing the Navbar, routing logic, and Footer.
 */
const AppBody: React.FC = () => {
    const location = useLocation();

    return (
        <>
            <Navbar />
            <main key={location.pathname} className="container mx-auto p-4 pt-24 sm:pt-24 animate-fade-in">
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    
                    {/* Publicly accessible routes */}
                    <Route path="/dashboard" element={<DashboardPage />} />
                    
                    {/* Protected Routes */}
                    <Route path="/trending-rooms" element={<ProtectedRoute><TrendingRoomsPage /></ProtectedRoute>} />
                    <Route path="/common-chat" element={<ProtectedRoute><CommonChatPage /></ProtectedRoute>} />
                    <Route path="/list-room" element={<ProtectedRoute><ListRoomPage /></ProtectedRoute>} />
                    <Route path="/search-rooms" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
                    <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
                    <Route path="/find-friends" element={<ProtectedRoute><FindFriendsPage /></ProtectedRoute>} />
                    <Route path="/requests" element={<ProtectedRoute><RoomRequestsPage /></ProtectedRoute>} />
                    <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
                    <Route path="/attendance-tracker" element={<ProtectedRoute><AttendanceTrackerPage /></ProtectedRoute>} />
                    <Route path="/exchange-dashboard" element={<ProtectedRoute><ExchangeDashboardPage /></ProtectedRoute>} />

                    {/* Redirect root to dashboard */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/" />} /> 
                </Routes>
            </main>
            <Footer />
        </>
    );
};

/**
 * The root App component that wraps everything in necessary context providers.
 */
const App: React.FC = () => {
  return (
    <ThemeContextProvider>
        <AuthContextProvider>
        <Gradients />
        <HashRouter>
            <AppBody />
        </HashRouter>
        </AuthContextProvider>
    </ThemeContextProvider>
  );
};

/**
 * The application's footer component.
 */
const Footer: React.FC = () => {
    return (
        <footer className="bg-transparent text-slate-500 dark:text-slate-400 py-6 mt-12">
            <div className="container mx-auto text-center">
                <p>&copy; {new Date().getFullYear()} Hostel Dalali. All rights reserved.</p>
                <p className="text-sm mt-1">A platform for MNIT Jaipur students. 🎓</p>
                <p className="text-sm mt-2">
                    <a href="mailto:hostel.admin@mnit.ac.in?subject=Hostel Dalali Query" className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 underline">Contact Admin</a>
                </p>
            </div>
        </footer>
    );
}

// Simple helper components for hamburger/close icons.
const IconBase: React.FC<{className?: string, children: ReactNode}> = ({className, children}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className || ''}`}>
        {children}
    </svg>
);

const MenuIcon: React.FC<{className?: string}> = ({className}) => (<IconBase className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></IconBase>);
const XIcon: React.FC<{className?: string}> = ({className}) => (<IconBase className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></IconBase>);


export default App;