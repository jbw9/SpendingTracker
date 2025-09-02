import { useState, useEffect, useCallback } from 'react';

interface PendingTransaction {
  id: string;
  type: 'expense' | 'category' | 'budget';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState<PendingTransaction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load pending transactions from localStorage
  useEffect(() => {
    const loadPendingTransactions = () => {
      const stored = localStorage.getItem('pendingTransactions');
      if (stored) {
        try {
          setPendingSync(JSON.parse(stored));
        } catch (error) {
          console.error('Error loading pending transactions:', error);
        }
      }
    };
    loadPendingTransactions();
  }, []);

  // Save pending transactions to localStorage
  useEffect(() => {
    if (pendingSync.length > 0) {
      localStorage.setItem('pendingTransactions', JSON.stringify(pendingSync));
    } else {
      localStorage.removeItem('pendingTransactions');
    }
  }, [pendingSync]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when back online
      if (pendingSync.length > 0) {
        syncPendingTransactions();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingSync]);

  // Add transaction to queue
  const addToQueue = useCallback((transaction: Omit<PendingTransaction, 'id' | 'timestamp'>) => {
    const newTransaction: PendingTransaction = {
      ...transaction,
      id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    setPendingSync(prev => [...prev, newTransaction]);
    
    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Offline Mode', {
        body: 'Your changes will be synced when you\'re back online',
        icon: '/pwa-192x192.png',
        badge: '/pwa-64x64.png',
      });
    }

    return newTransaction.id;
  }, []);

  // Sync pending transactions
  const syncPendingTransactions = useCallback(async () => {
    if (!isOnline || isSyncing || pendingSync.length === 0) {
      return;
    }

    setIsSyncing(true);
    const failed: PendingTransaction[] = [];
    const succeeded: string[] = [];

    for (const transaction of pendingSync) {
      try {
        // This is where you would call your Supabase API
        // For now, we'll simulate the sync
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // In real implementation, you would do something like:
        // await syncTransactionToSupabase(transaction);
        
        succeeded.push(transaction.id);
      } catch (error) {
        console.error(`Failed to sync transaction ${transaction.id}:`, error);
        failed.push(transaction);
      }
    }

    // Update pending transactions, keeping only failed ones
    setPendingSync(failed);

    // Show sync result notification
    if ('Notification' in window && Notification.permission === 'granted') {
      if (failed.length === 0) {
        new Notification('Sync Complete', {
          body: `Successfully synced ${succeeded.length} transaction(s)`,
          icon: '/pwa-192x192.png',
        });
      } else {
        new Notification('Partial Sync', {
          body: `Synced ${succeeded.length} transaction(s), ${failed.length} failed`,
          icon: '/pwa-192x192.png',
        });
      }
    }

    setIsSyncing(false);
  }, [isOnline, isSyncing, pendingSync]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  // Register background sync
  useEffect(() => {
    const registerBackgroundSync = async () => {
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await (registration as any).sync.register('sync-transactions');
        } catch (error) {
          console.error('Background sync registration failed:', error);
        }
      }
    };

    if (pendingSync.length > 0) {
      registerBackgroundSync();
    }
  }, [pendingSync]);

  return {
    isOnline,
    pendingSync,
    isSyncing,
    addToQueue,
    syncPendingTransactions,
    requestNotificationPermission,
    hasPendingTransactions: pendingSync.length > 0,
  };
};