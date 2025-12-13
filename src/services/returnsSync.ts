// src/services/returnsSync.ts - Returns synchronization service

import { invoke } from "@tauri-apps/api/core";

// Types for returns
export interface ReturnPayload {
  type: string;
  reason: string;
  customerId?: string | null;
  supplierId?: string | null;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  notes?: string;
  referenceId?: string | null;
  employeeId: string;
  storeId: string;
  shiftId?: string | null;
}

class ReturnsSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline = true;

  // Start real-time synchronization
  startRealtimeSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Check for real-time updates every 30 seconds
    this.syncInterval = setInterval(() => {
      this.syncReturns();
    }, 30000);

    console.log("Returns sync service started");
  }

  // Stop real-time synchronization
  stopRealtimeSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    console.log("Returns sync service stopped");
  }

  // Create a new return
  async createReturn(payload: any): Promise<any> {
    try {
      // Map frontend payload to backend expected format
      const mappedPayload = {
        return_type: payload.returnType,
        reference_id: payload.referenceId ? parseInt(payload.referenceId) : null,
        reference_number: payload.referenceNumber || null,
        supplier_id: payload.supplierId ? parseInt(payload.supplierId) : null,
        from_location_id: payload.fromLocationId ? parseInt(payload.fromLocationId) : null,
        to_location_id: payload.toLocationId ? parseInt(payload.toLocationId) : null,
        items: payload.items || [],
        subtotal: payload.subtotal || 0,
        tax_amount: payload.taxAmount || 0,
        total_amount: payload.totalAmount || 0,
        refund_method: payload.refundMethod || null,
        credit_method: payload.creditMethod || null,
        expected_credit_date: payload.expectedCreditDate || null,
        reason: payload.reason || null,
        notes: payload.notes || null,
        attachments: payload.attachments || null,
        user_id: payload.userId ? parseInt(payload.userId) : null,
        shift_id: payload.shiftId ? parseInt(payload.shiftId) : null,
      };

      const result = await invoke("create_return", mappedPayload);
      return result;
    } catch (error) {
      console.error("Failed to create return:", error);
      throw error;
    }
  }

  // Sync returns with backend
  private async syncReturns(): Promise<void> {
    try {
      // This would typically call a sync endpoint
      // await invoke("sync_returns");
      console.log("Syncing returns...");
    } catch (error) {
      console.error("Failed to sync returns:", error);
    }
  }

  // Get all returns
  async getReturns(filters?: any): Promise<any[]> {
    try {
      const result = await invoke("get_returns", { filters }) as any[];
      return result;
    } catch (error) {
      console.error("Failed to get returns:", error);
      throw error;
    }
  }

  // Update return status
  async updateReturnStatus(returnId: string, status: string): Promise<any> {
    try {
      const result = await invoke("update_return_status", { returnId, status });
      return result;
    } catch (error) {
      console.error("Failed to update return status:", error);
      throw error;
    }
  }

  // Delete a return
  async deleteReturn(returnId: string): Promise<void> {
    try {
      await invoke("delete_return", { returnId });
    } catch (error) {
      console.error("Failed to delete return:", error);
      throw error;
    }
  }

  // Check online status
  checkOnlineStatus(): boolean {
    return this.isOnline;
  }

  // Test returns tables
  async testReturnsTables(): Promise<string> {
    try {
      const result = await invoke<string>("test_returns_tables");
      return result;
    } catch (error) {
      console.error("Failed to test returns tables:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const returnsSyncService = new ReturnsSyncService();
