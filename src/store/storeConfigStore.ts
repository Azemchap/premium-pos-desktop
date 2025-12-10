import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StoreConfig {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  tax_rate: number;
  currency: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

interface StoreConfigState {
  storeConfig: StoreConfig | null;
  loading: boolean;
  setStoreConfig: (config: StoreConfig | null) => void;
  updateStoreConfig: (config: Partial<StoreConfig>) => void;
  refreshStoreConfig: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useStoreConfigStore = create<StoreConfigState>()(
  persist(
    (set, get) => ({
      storeConfig: null,
      loading: true,
      setStoreConfig: (config) => set({ storeConfig: config }),
      setLoading: (loading) => set({ loading }),
      
      updateStoreConfig: (updates) => {
        const current = get().storeConfig;
        if (current) {
          set({ 
            storeConfig: { ...current, ...updates } 
          });
        }
      },
      
      refreshStoreConfig: async () => {
        try {
          set({ loading: true });
          // Import invoke dynamically to avoid circular dependencies
          const { invoke } = await import('@tauri-apps/api/core');
          const config = await invoke<StoreConfig>('get_store_config');
          set({ storeConfig: config });
        } catch (error) {
          console.error('Failed to refresh store config:', error);
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: 'store-config-storage',
      partialize: (state) => ({ storeConfig: state.storeConfig }),
    }
  )
);
