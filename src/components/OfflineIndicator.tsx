import React from 'react';
import { WifiOff, Loader2, Cloud } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, hasPendingTransactions, isSyncing, syncPendingTransactions } = useOfflineSync();

  if (isOnline && !hasPendingTransactions && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className={`
        px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 text-sm font-medium
        ${!isOnline 
          ? 'bg-orange-100 text-orange-800 border border-orange-200' 
          : isSyncing 
            ? 'bg-blue-100 text-blue-800 border border-blue-200'
            : 'bg-green-100 text-green-800 border border-green-200'
        }
      `}>
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Offline Mode</span>
            {hasPendingTransactions && (
              <span className="text-xs opacity-75">• Changes will sync when online</span>
            )}
          </>
        ) : isSyncing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Syncing...</span>
          </>
        ) : hasPendingTransactions ? (
          <>
            <Cloud className="w-4 h-4" />
            <span>Ready to sync</span>
            <button
              onClick={syncPendingTransactions}
              className="ml-2 px-2 py-0.5 bg-white bg-opacity-50 rounded hover:bg-opacity-75 transition-colors text-xs"
            >
              Sync now
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};