// src/components/SettingsApplier.tsx - Applies settings to the app
import { useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';

export default function SettingsApplier() {
  const { preferences } = useSettings();
  
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply font size
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
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
    
  }, [preferences.fontSize, preferences.compactView, preferences.sidebarPosition]);
  
  return null; // This component doesn't render anything
}
