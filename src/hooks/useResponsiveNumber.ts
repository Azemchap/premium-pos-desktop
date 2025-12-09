/**
 * Custom hook for responsive number formatting
 * Automatically detects viewport size and formats numbers appropriately
 */

import { useState, useEffect } from 'react';
import { formatResponsiveCurrency, abbreviateNumber, getResponsiveTextClass, shouldAbbreviate } from '@/lib/responsive-numbers';

export function useResponsiveNumber() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if window is defined (for SSR compatibility)
    if (typeof window === 'undefined') return;

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // Tailwind's md breakpoint
    };

    // Initial check
    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  /**
   * Format currency value responsively
   */
  const formatCurrency = (value: number, currencySymbol: string = '$'): string => {
    // On mobile, abbreviate numbers >= 10,000
    // On desktop, abbreviate numbers >= 1,000,000
    const threshold = isMobile ? 10_000 : 1_000_000;
    return formatResponsiveCurrency(value, currencySymbol, false, threshold);
  };

  /**
   * Format any number with abbreviation
   */
  const formatNumber = (value: number, decimals: number = 1): string => {
    if (shouldAbbreviate(value, isMobile)) {
      return abbreviateNumber(value, decimals);
    }
    return value.toLocaleString('en-US');
  };

  /**
   * Get appropriate text size class for a number
   */
  const getTextClass = (value: number): string => {
    return getResponsiveTextClass(value, isMobile ? 'text-base' : 'text-lg');
  };

  return {
    isMobile,
    formatCurrency,
    formatNumber,
    getTextClass,
  };
}
