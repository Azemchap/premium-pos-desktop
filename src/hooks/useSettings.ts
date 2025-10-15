// src/hooks/useSettings.ts - Hook for easy settings access
import { useEffect } from 'react';
import { useSettingsStore, applyAppearanceSettings } from '@/store/settingsStore';

export function useSettings() {
  const { preferences, updatePreference, updatePreferences, resetToDefaults } = useSettingsStore();
  
  // Apply appearance settings whenever they change
  useEffect(() => {
    applyAppearanceSettings(preferences);
  }, [preferences.fontSize, preferences.compactView]);
  
  return {
    preferences,
    updatePreference,
    updatePreferences,
    resetToDefaults,
  };
}
