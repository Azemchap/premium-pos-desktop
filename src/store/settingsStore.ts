// src/store/settingsStore.ts - Complete settings management
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'fr' | 'es' | 'pt' | 'ar';

export interface UserPreferences {
  // System Settings
  autoSave: boolean;
  lowStockAlerts: boolean;
  soundEffects: boolean;
  dataRetention: '3months' | '6months' | '1year' | '2years' | 'forever';
  backupFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  language: Language;

  // Appearance Settings
  compactView: 'comfortable' | 'compact' | 'spacious';
  fontSize: 'small' | 'medium' | 'large';
  sidebarPosition: 'left' | 'right';
  animationsEnabled: boolean;

  // Notification Settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  lowStockNotifications: boolean;
  salesNotifications: boolean;
  inventoryNotifications: boolean;

  // Receipt Settings
  receiptPrinter: string;
  paperSize: '58mm' | '80mm';
  autoPrint: boolean;
  printCopies: number;
  showLogo: boolean;
  showTaxBreakdown: boolean;
}

interface SettingsStore {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  resetToDefaults: () => void;
}

const defaultPreferences: UserPreferences = {
  // System
  autoSave: true,
  lowStockAlerts: true,
  soundEffects: true,
  dataRetention: '1year',
  backupFrequency: 'daily',
  language: 'en',

  // Appearance
  compactView: 'comfortable',
  fontSize: 'medium',
  sidebarPosition: 'left',
  animationsEnabled: true,

  // Notifications
  emailNotifications: true,
  pushNotifications: true,
  lowStockNotifications: true,
  salesNotifications: true,
  inventoryNotifications: true,

  // Receipts
  receiptPrinter: 'default',
  paperSize: '80mm',
  autoPrint: true,
  printCopies: 1,
  showLogo: true,
  showTaxBreakdown: true,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      preferences: defaultPreferences,
      
      updatePreference: (key, value) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            [key]: value,
          },
        }));

        // Dispatch event for immediate reactivity
        window.dispatchEvent(new CustomEvent('settingsChanged', {
          detail: { key, value }
        }));
      },
      
      updatePreferences: (prefs) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...prefs,
          },
        })),
      
      resetToDefaults: () =>
        set({ preferences: defaultPreferences }),
    }),
    {
      name: 'settings-storage',
    }
  )
);

// Helper functions to apply settings
export const applyAppearanceSettings = (preferences: UserPreferences) => {
  const root = document.documentElement;
  
  // Apply font size
  const fontSizeMap = {
    small: '14px',
    medium: '16px',
    large: '18px',
  };
  root.style.setProperty('--base-font-size', fontSizeMap[preferences.fontSize]);
  
  // Apply compact view
  const spacingMap = {
    compact: '0.5rem',
    comfortable: '1rem',
    spacious: '1.5rem',
  };
  root.style.setProperty('--spacing-unit', spacingMap[preferences.compactView]);
};

// Language labels
export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  pt: 'Português',
  ar: 'العربية',
};

// Sound effect player
export const playSound = (soundType: 'success' | 'error' | 'notification' | 'click', preferences: UserPreferences) => {
  if (!preferences.soundEffects) return;

  try {
    // Create audio context for beeps (simple implementation)
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    // Different frequencies for different sounds
    const frequencies = {
      success: 800,
      error: 400,
      notification: 600,
      click: 1000,
    };

    oscillator.frequency.value = frequencies[soundType];
    gainNode.gain.value = 0.1;

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.1);
  } catch (error) {
    // Silently fail if audio context is not available
    console.warn('Failed to play sound:', error);
  }
};
