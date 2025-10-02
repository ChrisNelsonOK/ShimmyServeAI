import React, { useState, useRef, useEffect } from 'react';
import { User, ChevronDown, LogOut, Settings, Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  onSectionChange: (section: string) => void;
}

export function Header({ onSectionChange }: HeaderProps) {
  const { user, userProfile, signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'error',
      title: 'System Configuration Changed',
      message: 'Server settings have been modified. Review changes in Settings page.',
      time: '2 minutes ago',
      read: false
    },
    {
      id: '2', 
      type: 'info',
      title: 'WebSocket Connected',
      message: 'Real-time monitoring is now active.',
      time: '5 minutes ago',
      read: false
    },
    {
      id: '3',
      type: 'success', 
      title: 'Authentication Successful',
      message: 'User logged in successfully.',
      time: '10 minutes ago',
      read: false
    }
  ]);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
  };

  const handleAccountSettings = () => {
    setUserMenuOpen(false);
    onSectionChange('settings');
  };

  const handleNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'error': return 'bg-crimson-500';
      case 'info': return 'bg-blue-500';
      case 'success': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="bg-dark-900/95 backdrop-blur-sm border-b border-dark-700/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 relative">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-green-400 font-medium">System Online</span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative z-[10000]" ref={notificationsRef}>
            <button 
              onClick={handleNotifications}
              data-testid="notifications-bell-button"
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-crimson-500 rounded-full text-xs flex items-center justify-center text-white font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <div 
                data-testid="notifications-dropdown"
                className="absolute right-0 top-full mt-2 w-80 bg-dark-800 border border-dark-700/50 rounded-lg shadow-xl py-2 z-[9999] max-h-96 overflow-y-auto"
                style={{ zIndex: 10000 }}
              >
                <div className="px-4 py-2 border-b border-dark-700/50">
                  <h3 className="text-sm font-medium text-white">Notifications</h3>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-400 text-sm">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        onClick={() => handleMarkAsRead(notification.id)}
                        className={`px-4 py-3 hover:bg-dark-700/50 transition-colors cursor-pointer ${
                          notification.read ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 ${getNotificationColor(notification.type)} rounded-full mt-2 flex-shrink-0 ${
                            notification.read ? 'opacity-50' : ''
                          }`}></div>
                          <div className="flex-1">
                            <p className={`text-sm ${notification.read ? 'text-gray-400' : 'text-white'}`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-crimson-500 rounded-full flex-shrink-0 mt-2"></div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {unreadCount > 0 && (
                  <div className="px-4 py-2 border-t border-dark-700/50">
                    <button 
                      onClick={handleMarkAllAsRead}
                      data-testid="mark-all-read-button"
                      className="text-xs text-crimson-400 hover:text-crimson-300 transition-colors"
                    >
                      Mark all as read ({unreadCount})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              data-testid="user-menu-button"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-dark-800/50 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium truncate">{userProfile?.username || user?.email}</p>
                <p className="text-xs text-gray-400 capitalize">{userProfile?.role || 'user'}</p>
              </div>
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div 
                data-testid="user-dropdown"
                className="absolute right-0 top-full mt-2 w-56 bg-dark-800 border border-dark-700/50 rounded-lg shadow-xl py-1 z-[9999]"
              >
                <div className="px-3 py-2 border-b border-dark-700/50">
                  <p className="text-sm font-medium text-white">{userProfile?.username}</p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                </div>
                
                <button
                  onClick={handleAccountSettings}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-dark-700/50 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Account Settings</span>
                </button>
                
                <button
                  onClick={handleSignOut}
                  data-testid="sign-out-button"
                  className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-dark-700/50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}