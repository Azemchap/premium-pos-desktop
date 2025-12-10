import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { getLastSync, isOnline } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export interface SyncIndicatorProps {
  className?: string;
  variant?: 'compact' | 'full';
  showLabel?: boolean;
}

export default function SyncStatusIndicator({
  className = '',
  variant = 'compact',
  showLabel = true,
}: SyncIndicatorProps) {
  const [online, setOnline] = useState(isOnline());
  const [lastSync, setLastSync] = useState<string | null>(getLastSync());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Update online status
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update last sync time periodically
    const interval = setInterval(() => {
      setLastSync(getLastSync());
    }, 30000); // Update every 30 seconds

    // Listen for custom sync events
    const handleSyncStart = () => setIsSyncing(true);
    const handleSyncEnd = () => {
      setIsSyncing(false);
      setLastSync(getLastSync());
    };

    window.addEventListener('sync:start', handleSyncStart);
    window.addEventListener('sync:end', handleSyncEnd);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync:start', handleSyncStart);
      window.removeEventListener('sync:end', handleSyncEnd);
      clearInterval(interval);
    };
  }, []);

  const getStatusInfo = () => {
    if (isSyncing) {
      return {
        icon: RefreshCw,
        label: 'Syncing...',
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        iconClass: 'animate-spin',
      };
    }

    if (!online) {
      return {
        icon: CloudOff,
        label: 'Offline',
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        iconClass: '',
      };
    }

    if (lastSync) {
      const syncTime = new Date(lastSync);
      const now = new Date();
      const minutesSinceSync = (now.getTime() - syncTime.getTime()) / 1000 / 60;

      if (minutesSinceSync < 10) {
        return {
          icon: Check,
          label: `Synced ${formatDistanceToNow(syncTime, { addSuffix: true })}`,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          iconClass: '',
        };
      } else {
        return {
          icon: AlertCircle,
          label: `Last synced ${formatDistanceToNow(syncTime, { addSuffix: true })}`,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          iconClass: '',
        };
      }
    }

    return {
      icon: Cloud,
      label: 'Online',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      iconClass: '',
    };
  };

  const status = getStatusInfo();
  const Icon = status.icon;

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          status.bgColor,
          className
        )}
        title={status.label}
      >
        <Icon className={cn('w-4 h-4', status.color, status.iconClass)} />
        {showLabel && (
          <span className={cn('text-sm font-medium', status.color)}>
            {isSyncing ? 'Syncing' : online ? 'Online' : 'Offline'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border',
        status.bgColor,
        'border-current border-opacity-20',
        className
      )}
    >
      <Icon className={cn('w-5 h-5', status.color, status.iconClass)} />
      <div className="flex flex-col">
        <span className={cn('text-sm font-semibold', status.color)}>
          {isSyncing ? 'Syncing...' : online ? 'Online' : 'Offline Mode'}
        </span>
        {lastSync && !isSyncing && (
          <span className="text-xs text-gray-600">
            Last synced {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );
}

// Helper hook for using sync status in components
export function useSyncStatus() {
  const [online, setOnline] = useState(isOnline());
  const [lastSync, setLastSync] = useState<string | null>(getLastSync());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleSyncStart = () => setIsSyncing(true);
    const handleSyncEnd = () => {
      setIsSyncing(false);
      setLastSync(getLastSync());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync:start', handleSyncStart);
    window.addEventListener('sync:end', handleSyncEnd);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync:start', handleSyncStart);
      window.removeEventListener('sync:end', handleSyncEnd);
    };
  }, []);

  return { online, lastSync, isSyncing };
}
