import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export function NetworkStatus() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null; // Don't show anything when online
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-lg">
      <WifiOff className="w-4 h-4" />
      <span className="text-sm font-medium">No internet connection</span>
    </div>
  );
}