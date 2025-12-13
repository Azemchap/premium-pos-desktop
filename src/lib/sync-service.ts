import { invoke } from '@tauri-apps/api/core';
import { supabase, isOnline } from './supabase';

export interface SyncStatus {
  lastSync: string | null;
  isSyncing: boolean;
  error: string | null;
  syncedTables?: string[];
  recordsCount?: number;
  conflicts?: SyncConflict[];
}

export interface ConflictResolution {
  strategy: 'server_wins' | 'client_wins' | 'newer_wins' | 'merge';
  compareField?: string;
}

export interface SyncConflict {
  table: string;
  recordId: string | number;
  localRecord: any;
  remoteRecord: any;
  conflictType: 'update' | 'delete' | 'create';
  timestamp: string;
}

const SYNC_STORAGE_KEY = 'qorbooks_last_sync';
const LAST_SYNC_TIMESTAMP_KEY = 'qorbooks_last_sync_timestamp';

// Get last sync timestamp
export const getLastSync = (): string | null => {
  try {
    return localStorage.getItem(SYNC_STORAGE_KEY);
  } catch {
    return null;
  }
};

// Get last sync timestamp for selective sync
export const getLastSyncTimestamp = (): string | null => {
  try {
    return localStorage.getItem(LAST_SYNC_TIMESTAMP_KEY);
  } catch {
    return null;
  }
};

// Set last sync timestamp
const setLastSync = (timestamp: string) => {
  try {
    localStorage.setItem(SYNC_STORAGE_KEY, timestamp);
    localStorage.setItem(LAST_SYNC_TIMESTAMP_KEY, timestamp);
  } catch (error) {
    console.error('Failed to save last sync timestamp:', error);
  }
};

// Dispatch sync events for UI
const dispatchSyncEvent = (type: 'start' | 'end', detail?: any) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(`sync:${type}`, { detail }));
  }
};

// Conflict resolution helper
const resolveConflict = (
  localRecord: any,
  remoteRecord: any,
  resolution: ConflictResolution
): any => {
  switch (resolution.strategy) {
    case 'server_wins':
      return remoteRecord;
    case 'client_wins':
      return localRecord;
    case 'newer_wins':
      const compareField = resolution.compareField || 'updated_at';
      const localTime = new Date(localRecord[compareField]).getTime();
      const remoteTime = new Date(remoteRecord[compareField]).getTime();
      return remoteTime > localTime ? remoteRecord : localRecord;
    case 'merge':
      // Merge strategy: prefer non-null values from newer record
      const newer = resolveConflict(localRecord, remoteRecord, {
        strategy: 'newer_wins',
        compareField: resolution.compareField
      });
      const older = newer === remoteRecord ? localRecord : remoteRecord;
      return { ...older, ...newer };
    default:
      return remoteRecord;
  }
};

// Enhanced sync with conflict detection and resolution
export const syncFromSupabase = async (
  selective: boolean = true,
  conflictResolution: ConflictResolution = { strategy: 'newer_wins' }
): Promise<SyncStatus> => {
  dispatchSyncEvent('start');

  const status: SyncStatus = {
    lastSync: getLastSync(),
    isSyncing: true,
    error: null,
    syncedTables: [],
    recordsCount: 0,
    conflicts: [],
  };

  try {
    // Check if we're online
    if (!isOnline()) {
      throw new Error('No internet connection');
    }

    console.log('🔄 Starting Supabase sync...');

    // Fetch all tables from Supabase
    const tables = [
      'users',
      'products',
      'categories',
      'customers',
      'suppliers',
      'sales',
      'sale_items',
      'inventory',
      'inventory_movements',
      'purchase_orders',
      'purchase_order_items',
      'expenses',
      'employees',
      'promotions',
      'appointments',
      'time_tracking',
      'organizations',
      'locations',
      'integrations',
      'store_config',
      'returns',
      'return_items',
    ];

    const syncData: Record<string, any[]> = {};
    const lastSyncTime = selective ? getLastSyncTimestamp() : null;
    let totalRecords = 0;

    // Fetch data from each table
    for (const table of tables) {
      try {
        let query = supabase.from(table).select('*');

        // Selective sync: only fetch records updated since last sync
        if (lastSyncTime && selective) {
          query = query.gt('updated_at', lastSyncTime);
        }

        const { data, error } = await query;

        if (error) {
          console.warn(`⚠️ Failed to fetch ${table}:`, error.message);
          continue;
        }

        if (data && data.length > 0) {
          syncData[table] = data;
          totalRecords += data.length;
          status.syncedTables?.push(table);
          console.log(`✅ Fetched ${data.length} ${selective ? 'updated ' : ''}records from ${table}`);
        }
      } catch (error) {
        console.warn(`⚠️ Error fetching ${table}:`, error);
      }
    }

    // Send data to Rust backend for local database sync with conflict resolution
    try {
      await invoke('sync_from_cloud', {
        data: syncData,
        conflictResolution: conflictResolution.strategy
      });

      const now = new Date().toISOString();
      setLastSync(now);

      console.log(`✅ Supabase sync completed: ${totalRecords} records across ${status.syncedTables?.length} tables`);

      const result = {
        lastSync: now,
        isSyncing: false,
        error: null,
        syncedTables: status.syncedTables,
        recordsCount: totalRecords,
      };

      dispatchSyncEvent('end', result);
      return result;
    } catch (error) {
      throw new Error(`Failed to sync data to local database: ${error}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Supabase sync failed:', errorMessage);

    const result = {
      lastSync: status.lastSync,
      isSyncing: false,
      error: errorMessage,
      syncedTables: [],
      recordsCount: 0,
    };

    dispatchSyncEvent('end', result);
    return result;
  }
};

// Upload local data to Supabase
export const syncToSupabase = async (): Promise<SyncStatus> => {
  const status: SyncStatus = {
    lastSync: getLastSync(),
    isSyncing: true,
    error: null,
  };

  try {
    // Check if we're online
    if (!isOnline()) {
      throw new Error('No internet connection');
    }

    console.log('📤 Starting upload to Supabase...');

    // Get local data from Rust backend
    const localData = await invoke<Record<string, any[]>>('get_local_data_for_sync');

    // Upload to each table
    for (const [table, records] of Object.entries(localData)) {
      if (records.length === 0) continue;

      try {
        const { error } = await supabase
          .from(table)
          .upsert(records, { onConflict: 'id' });

        if (error) {
          console.warn(`⚠️ Failed to upload ${table}:`, error.message);
          continue;
        }

        console.log(`✅ Uploaded ${records.length} records to ${table}`);
      } catch (error) {
        console.warn(`⚠️ Error uploading ${table}:`, error);
      }
    }

    const now = new Date().toISOString();
    setLastSync(now);

    console.log('✅ Upload to Supabase completed successfully');

    return {
      lastSync: now,
      isSyncing: false,
      error: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Upload to Supabase failed:', errorMessage);

    return {
      lastSync: status.lastSync,
      isSyncing: false,
      error: errorMessage,
    };
  }
};

// Auto-sync: Download from Supabase if online
export const autoSync = async (): Promise<SyncStatus> => {
  if (!isOnline()) {
    console.log('📴 Offline mode - skipping auto-sync');
    return {
      lastSync: getLastSync(),
      isSyncing: false,
      error: 'Offline',
    };
  }

  console.log('🔄 Auto-sync triggered');
  return await syncFromSupabase();
};

// Set up periodic sync (every 5 minutes)
export const setupPeriodicSync = (intervalMs: number = 5 * 60 * 1000) => {
  // Run initial sync
  autoSync();

  // Set up interval for periodic sync
  const intervalId = setInterval(() => {
    autoSync();
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(intervalId);
};

// Set up realtime subscriptions for live updates
export const setupRealtimeSync = () => {
  const tables = [
    'products',
    'customers',
    'sales',
    'inventory',
    'purchase_orders',
    'expenses',
    'integrations',
    'returns',
    'return_items',
  ];

  const subscriptions: any[] = [];

  for (const table of tables) {
    const subscription = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: table,
        },
        async (payload) => {
          console.log(`🔔 Realtime change detected in ${table}:`, payload.eventType);

          // Handle different event types
          switch (payload.eventType) {
            case 'INSERT':
            case 'UPDATE':
              // Sync the single changed record
              await invoke('sync_single_record', {
                table: table,
                record: payload.new,
              });
              console.log(`✅ Synced ${payload.eventType} in ${table}`);
              break;
            case 'DELETE':
              // Delete from local database
              await invoke('delete_local_record', {
                table: table,
                id: payload.old.id,
              });
              console.log(`✅ Synced DELETE in ${table}`);
              break;
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to realtime updates for ${table}`);
        }
      });

    subscriptions.push(subscription);
  }

  // Return cleanup function
  return () => {
    console.log('🔌 Unsubscribing from realtime channels...');
    subscriptions.forEach((sub) => {
      supabase.removeChannel(sub);
    });
  };
};
