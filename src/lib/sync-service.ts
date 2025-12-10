import { invoke } from '@tauri-apps/api/core';
import { supabase, isOnline } from './supabase';

export interface SyncStatus {
  lastSync: string | null;
  isSyncing: boolean;
  error: string | null;
}

const SYNC_STORAGE_KEY = 'qorbooks_last_sync';

// Get last sync timestamp
export const getLastSync = (): string | null => {
  try {
    return localStorage.getItem(SYNC_STORAGE_KEY);
  } catch {
    return null;
  }
};

// Set last sync timestamp
const setLastSync = (timestamp: string) => {
  try {
    localStorage.setItem(SYNC_STORAGE_KEY, timestamp);
  } catch (error) {
    console.error('Failed to save last sync timestamp:', error);
  }
};

// Fetch all data from Supabase and sync to local database
export const syncFromSupabase = async (): Promise<SyncStatus> => {
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
      'purchase_orders',
      'purchase_order_items',
      'expenses',
      'employees',
      'promotions',
      'appointments',
      'time_tracking',
      'store_config',
    ];

    const syncData: Record<string, any[]> = {};

    // Fetch data from each table
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*');

        if (error) {
          console.warn(`⚠️ Failed to fetch ${table}:`, error.message);
          continue;
        }

        if (data && data.length > 0) {
          syncData[table] = data;
          console.log(`✅ Fetched ${data.length} records from ${table}`);
        }
      } catch (error) {
        console.warn(`⚠️ Error fetching ${table}:`, error);
      }
    }

    // Send data to Rust backend for local database sync
    try {
      await invoke('sync_from_cloud', { data: syncData });

      const now = new Date().toISOString();
      setLastSync(now);

      console.log('✅ Supabase sync completed successfully');

      return {
        lastSync: now,
        isSyncing: false,
        error: null,
      };
    } catch (error) {
      throw new Error(`Failed to sync data to local database: ${error}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Supabase sync failed:', errorMessage);

    return {
      lastSync: status.lastSync,
      isSyncing: false,
      error: errorMessage,
    };
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
