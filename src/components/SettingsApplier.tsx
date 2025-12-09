// src/components/SettingsApplier.tsx - Applies settings to the app
import { useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';

export default function SettingsApplier() {
  const { preferences } = useSettings();
  
  useEffect(() => {
    const root = document.documentElement;

    // Apply font size
    const fontSizeMap = {
      small: '13px',
      medium: '14px',
      large: '15px',
    };
    root.style.setProperty('--base-font-size', fontSizeMap[preferences.fontSize]);
    root.style.fontSize = fontSizeMap[preferences.fontSize];

    // Apply compact view spacing
    const spacingMap = {
      compact: '0.75',
      comfortable: '1',
      spacious: '1.25',
    };
    root.style.setProperty('--spacing-scale', spacingMap[preferences.compactView]);

    // Apply sidebar position (add class to body)
    document.body.classList.remove('sidebar-left', 'sidebar-right');
    document.body.classList.add(`sidebar-${preferences.sidebarPosition}`);

    // Apply animations setting
    if (!preferences.animationsEnabled) {
      root.style.setProperty('--transition-duration', '0ms');
      document.body.classList.add('reduce-motion');
    } else {
      root.style.setProperty('--transition-duration', '150ms');
      document.body.classList.remove('reduce-motion');
    }

    // Apply language (set document lang attribute)
    document.documentElement.lang = preferences.language;

  }, [preferences.fontSize, preferences.compactView, preferences.sidebarPosition, preferences.animationsEnabled, preferences.language]);
  
  return null; // This component doesn't render anything
}
