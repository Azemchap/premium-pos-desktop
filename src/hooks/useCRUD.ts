/**
 * useCRUD - Reusable hook for CRUD operations
 * Simplifies Create, Read, Update, Delete operations with Tauri backend
 */
import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

export interface UseCRUDOptions<T> {
  resourceName: string; // e.g., "product", "employee"
  listCommand: string; // e.g., "get_products"
  createCommand: string; // e.g., "create_product"
  updateCommand: string; // e.g., "update_product"
  deleteCommand: string; // e.g., "delete_product"
  reactivateCommand?: string; // e.g., "reactivate_product"
  idField?: keyof T; // default: "id"
  autoLoad?: boolean; // default: true
}

export interface UseCRUDReturn<T> {
  // Data
  items: T[];
  loading: boolean;
  error: Error | null;

  // CRUD Operations
  loadItems: () => Promise<void>;
  createItem: (data: Partial<T>) => Promise<T | null>;
  updateItem: (id: number, data: Partial<T>) => Promise<void>;
  deleteItem: (id: number, name?: string) => Promise<void>;
  reactivateItem?: (id: number, name?: string) => Promise<void>;

  // Delete/Reactivate Execution (for ConfirmDialog)
  executeDelete: () => Promise<void>;
  executeReactivate: () => Promise<void>;

  // UI State
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  editingItem: T | null;
  setEditingItem: (item: T | null) => void;
  isSubmitting: boolean;

  // Confirmation State
  itemToDelete: { id: number; name: string } | null;
  setItemToDelete: (item: { id: number; name: string } | null) => void;
  itemToReactivate: { id: number; name: string } | null;
  setItemToReactivate: (item: { id: number; name: string } | null) => void;

  // Helpers
  openCreateDialog: () => void;
  openEditDialog: (item: T) => void;
  closeDialog: () => void;
}

export function useCRUD<T extends Record<string, any>>(
  options: UseCRUDOptions<T>
): UseCRUDReturn<T> {
  const {
    resourceName,
    listCommand,
    createCommand,
    updateCommand,
    deleteCommand,
    reactivateCommand,
    idField = "id" as keyof T,
    autoLoad = true,
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation states
  const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string } | null>(null);
  const [itemToReactivate, setItemToReactivate] = useState<{ id: number; name: string } | null>(null);

  // Load items from backend
  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<T[]>(listCommand);
      setItems(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error(`Failed to load ${resourceName}s:`, error);
      toast.error(`Failed to load ${resourceName}s`);
    } finally {
      setLoading(false);
    }
  }, [listCommand, resourceName]);

  // Create new item
  const createItem = useCallback(
    async (data: Partial<T>): Promise<T | null> => {
      setIsSubmitting(true);
      try {
        const result = await invoke<T>(createCommand, {
          request: data,
        });
        toast.success(`✅ ${resourceName} created successfully!`);
        await loadItems();
        return result;
      } catch (err) {
        console.error(`Failed to create ${resourceName}:`, err);
        toast.error(`❌ Failed to create ${resourceName}: ${err}`);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [createCommand, resourceName, loadItems]
  );

  // Update existing item
  const updateItem = useCallback(
    async (id: number, data: Partial<T>): Promise<void> => {
      setIsSubmitting(true);
      try {
        await invoke(updateCommand, {
          [`${resourceName}Id`]: id,
          request: data,
        });
        toast.success(`✅ ${resourceName} updated successfully!`);
        await loadItems();
      } catch (err) {
        console.error(`Failed to update ${resourceName}:`, err);
        toast.error(`❌ Failed to update ${resourceName}: ${err}`);
      } finally {
        setIsSubmitting(false);
      }
    },
    [updateCommand, resourceName, loadItems]
  );

  // Request Delete (sets state for dialog)
  const deleteItem = useCallback(
    async (id: number, name?: string): Promise<void> => {
      const displayName = name || `${resourceName} #${id}`;
      setItemToDelete({ id, name: displayName });
      return Promise.resolve();
    },
    [resourceName]
  );

  // Execute Delete (called by ConfirmDialog)
  const executeDelete = useCallback(async () => {
    if (!itemToDelete) return;

    try {
      await invoke(deleteCommand, {
        [`${resourceName}Id`]: itemToDelete.id,
      });
      toast.success(`${resourceName} "${itemToDelete.name}" deactivated successfully!`);
      await loadItems();
    } catch (err) {
      console.error(`Failed to delete ${resourceName}:`, err);
      toast.error(`Failed to deactivate ${resourceName}: ${err}`);
    } finally {
      setItemToDelete(null);
    }
  }, [itemToDelete, deleteCommand, resourceName, loadItems]);

  // Request Reactivate (sets state for dialog)
  const reactivateItem = reactivateCommand
    ? useCallback(
      async (id: number, name?: string): Promise<void> => {
        const displayName = name || `${resourceName} #${id}`;
        setItemToReactivate({ id, name: displayName });
        return Promise.resolve();
      },
      [resourceName]
    )
    : undefined;

  // Execute Reactivate (called by ConfirmDialog)
  const executeReactivate = useCallback(async () => {
    if (!itemToReactivate || !reactivateCommand) return;

    try {
      await invoke(reactivateCommand, {
        [`${resourceName}Id`]: itemToReactivate.id,
      });
      toast.success(`✅ ${resourceName} "${itemToReactivate.name}" reactivated successfully!`);
      await loadItems();
    } catch (err) {
      console.error(`Failed to reactivate ${resourceName}:`, err);
      toast.error(`❌ Failed to reactivate ${resourceName}: ${err}`);
    } finally {
      setItemToReactivate(null);
    }
  }, [itemToReactivate, reactivateCommand, resourceName, loadItems]);

  // Dialog helpers
  const openCreateDialog = useCallback(() => {
    setEditingItem(null);
    setIsDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((item: T) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingItem(null);
  }, []);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadItems();
    }
  }, [autoLoad, loadItems]);

  return {
    // Data
    items,
    loading,
    error,

    // CRUD Operations
    loadItems,
    createItem,
    updateItem,
    deleteItem,
    reactivateItem,

    // Execution
    executeDelete,
    executeReactivate,

    // UI State
    isDialogOpen,
    setIsDialogOpen,
    editingItem,
    setEditingItem,
    isSubmitting,

    // Confirmation State
    itemToDelete,
    setItemToDelete,
    itemToReactivate,
    setItemToReactivate,

    // Helpers
    openCreateDialog,
    openEditDialog,
    closeDialog,
  };
}
