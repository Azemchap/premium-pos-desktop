/**
 * Offline Queue and Sync System
 * Handles operations when offline and syncs when online
 */

import { invoke } from '@tauri-apps/api/core';

export interface QueuedOperation {
  id: string;
  command: string;
  args: Record<string, any>;
  timestamp: number;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'failed' | 'success';
  error?: string;
}

const QUEUE_STORAGE_KEY = 'offline_queue';
const MAX_RETRIES = 3;
const SYNC_INTERVAL = 30000; // 30 seconds

class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private syncing = false;
  private syncInterval?: number;
  private listeners: Array<(queue: QueuedOperation[]) => void> = [];

  constructor() {
    this.loadQueue();
    this.startSyncInterval();
    this.setupOnlineListener();
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`[OfflineQueue] Loaded ${this.queue.length} queued operations`);
      }
    } catch (error) {
      console.error('[OfflineQueue] Failed to load queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
      this.notifyListeners();
    } catch (error) {
      console.error('[OfflineQueue] Failed to save queue:', error);
    }
  }

  /**
   * Add operation to queue
   */
  public enqueue(command: string, args: Record<string, any> = {}): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const operation: QueuedOperation = {
      id,
      command,
      args,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: MAX_RETRIES,
      status: 'pending',
    };

    this.queue.push(operation);
    this.saveQueue();

    console.log(`[OfflineQueue] Enqueued: ${command}`, { id, args });

    // Try to sync immediately if online
    if (this.isOnline()) {
      this.sync();
    }

    return id;
  }

  /**
   * Remove operation from queue
   */
  public dequeue(id: string): void {
    this.queue = this.queue.filter(op => op.id !== id);
    this.saveQueue();
  }

  /**
   * Get all queued operations
   */
  public getQueue(): QueuedOperation[] {
    return [...this.queue];
  }

  /**
   * Get pending operations count
   */
  public getPendingCount(): number {
    return this.queue.filter(op => op.status === 'pending').length;
  }

  /**
   * Check if online
   */
  public isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Sync all pending operations
   */
  public async sync(): Promise<void> {
    if (this.syncing || !this.isOnline()) {
      return;
    }

    this.syncing = true;
    console.log(`[OfflineQueue] Starting sync of ${this.queue.length} operations`);

    const pending = this.queue.filter(op => op.status === 'pending');

    for (const operation of pending) {
      try {
        operation.status = 'syncing';
        this.saveQueue();

        // Execute the operation
        await invoke(operation.command, operation.args);

        // Mark as success and remove from queue
        operation.status = 'success';
        this.dequeue(operation.id);

        console.log(`[OfflineQueue] Synced: ${operation.command}`, { id: operation.id });
      } catch (error) {
        operation.retries += 1;

        if (operation.retries >= operation.maxRetries) {
          operation.status = 'failed';
          operation.error = error instanceof Error ? error.message : String(error);
          console.error(`[OfflineQueue] Failed (max retries): ${operation.command}`, {
            id: operation.id,
            error: operation.error,
          });
        } else {
          operation.status = 'pending';
          console.warn(`[OfflineQueue] Retry ${operation.retries}/${operation.maxRetries}: ${operation.command}`, {
            id: operation.id,
            error,
          });
        }

        this.saveQueue();
      }
    }

    this.syncing = false;
    console.log(`[OfflineQueue] Sync complete. Remaining: ${this.getPendingCount()}`);
  }

  /**
   * Clear all operations
   */
  public clear(): void {
    this.queue = [];
    this.saveQueue();
    console.log('[OfflineQueue] Queue cleared');
  }

  /**
   * Clear only failed operations
   */
  public clearFailed(): void {
    this.queue = this.queue.filter(op => op.status !== 'failed');
    this.saveQueue();
    console.log('[OfflineQueue] Failed operations cleared');
  }

  /**
   * Retry a specific operation
   */
  public async retryOperation(id: string): Promise<void> {
    const operation = this.queue.find(op => op.id === id);
    if (!operation) {
      console.warn(`[OfflineQueue] Operation not found: ${id}`);
      return;
    }

    if (!this.isOnline()) {
      console.warn('[OfflineQueue] Cannot retry while offline');
      return;
    }

    try {
      operation.status = 'syncing';
      this.saveQueue();

      await invoke(operation.command, operation.args);

      operation.status = 'success';
      this.dequeue(operation.id);

      console.log(`[OfflineQueue] Retry successful: ${operation.command}`, { id });
    } catch (error) {
      operation.retries += 1;

      if (operation.retries >= operation.maxRetries) {
        operation.status = 'failed';
        operation.error = error instanceof Error ? error.message : String(error);
      } else {
        operation.status = 'pending';
      }

      this.saveQueue();
      throw error;
    }
  }

  /**
   * Start automatic sync interval
   */
  private startSyncInterval(): void {
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline() && this.getPendingCount() > 0) {
        this.sync();
      }
    }, SYNC_INTERVAL);
  }

  /**
   * Stop automatic sync interval
   */
  public stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }

  /**
   * Setup online/offline event listeners
   */
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      console.log('[OfflineQueue] Back online, syncing...');
      this.sync();
    });

    window.addEventListener('offline', () => {
      console.log('[OfflineQueue] Went offline');
    });
  }

  /**
   * Subscribe to queue changes
   */
  public subscribe(listener: (queue: QueuedOperation[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of queue changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getQueue()));
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();

/**
 * Execute a command with offline support
 * If offline, queues the operation for later sync
 */
export async function invokeWithOfflineSupport<T>(
  command: string,
  args: Record<string, any> = {},
  options?: {
    queueIfOffline?: boolean;
    throwIfOffline?: boolean;
  }
): Promise<T> {
  const { queueIfOffline = true, throwIfOffline = false } = options || {};

  // If online, execute normally
  if (offlineQueue.isOnline()) {
    try {
      return await invoke<T>(command, args);
    } catch (error) {
      // If the error is network-related and we should queue, do so
      if (queueIfOffline) {
        console.warn(`[OfflineQueue] Command failed, queueing: ${command}`, error);
        offlineQueue.enqueue(command, args);
      }
      throw error;
    }
  }

  // If offline
  if (throwIfOffline) {
    throw new Error('Operation requires internet connection');
  }

  if (queueIfOffline) {
    const id = offlineQueue.enqueue(command, args);
    console.log(`[OfflineQueue] Offline, queued: ${command}`, { id });

    // Return a placeholder/optimistic response
    // This should be handled by the caller
    throw new Error('Operation queued for sync when online');
  }

  throw new Error('Cannot execute operation while offline');
}

/**
 * Check if a specific operation is queued
 */
export function isOperationQueued(command: string, args?: Record<string, any>): boolean {
  return offlineQueue.getQueue().some(op => {
    if (op.command !== command) return false;
    if (!args) return true;

    // Check if args match
    return Object.keys(args).every(key => op.args[key] === args[key]);
  });
}

/**
 * Get queue statistics
 */
export function getQueueStats() {
  const queue = offlineQueue.getQueue();
  return {
    total: queue.length,
    pending: queue.filter(op => op.status === 'pending').length,
    syncing: queue.filter(op => op.status === 'syncing').length,
    failed: queue.filter(op => op.status === 'failed').length,
    success: queue.filter(op => op.status === 'success').length,
  };
}
