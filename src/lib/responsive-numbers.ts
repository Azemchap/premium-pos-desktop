/**
 * Responsive number formatting utilities for mobile-friendly displays
 * Handles large numbers gracefully on small screens
 */

/**
 * Format large numbers with abbreviated suffixes (K, M, B)
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Abbreviated string (e.g., "1.2K", "3.5M")
 */
export function abbreviateNumber(value: number, decimals: number = 1): string {
  if (value === 0) return '0';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    return sign + (absValue / 1_000_000_000).toFixed(decimals) + 'B';
  } else if (absValue >= 1_000_000) {
    return sign + (absValue / 1_000_000).toFixed(decimals) + 'M';
  } else if (absValue >= 1_000) {
    return sign + (absValue / 1_000).toFixed(decimals) + 'K';
  }

  return sign + absValue.toFixed(decimals);
}

/**
 * Format currency with mobile-friendly abbreviations
 * @param value - The monetary value
 * @param currency - Currency symbol (default: from settings)
 * @param forceAbbreviate - Always abbreviate regardless of screen size
 * @param threshold - Minimum value to start abbreviating (default: 10000)
 * @returns Formatted currency string
 */
export function formatResponsiveCurrency(
  value: number,
  currency: string = '$',
  forceAbbreviate: boolean = false,
  threshold: number = 10_000
): string {
  const absValue = Math.abs(value);

  // Only abbreviate if value exceeds threshold
  if (forceAbbreviate || absValue >= threshold) {
    return currency + abbreviateNumber(value, 1);
  }

  // Standard formatting for smaller numbers
  return currency + value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Get responsive text class based on number magnitude
 * Smaller text for very large numbers to prevent overflow
 * @param value - The number to display
 * @param baseClass - Base text class (default: "text-lg")
 * @returns Tailwind text size class
 */
export function getResponsiveTextClass(value: number, baseClass: string = "text-lg"): string {
  const absValue = Math.abs(value);
  const digitCount = Math.floor(Math.log10(absValue)) + 1;

  // Very large numbers (10+ digits) - use smaller text
  if (digitCount >= 10) {
    return "text-sm sm:text-base md:text-lg";
  }
  // Large numbers (7-9 digits) - slightly smaller
  else if (digitCount >= 7) {
    return "text-base sm:text-lg";
  }
  // Normal numbers - use provided base class
  return baseClass;
}

/**
 * Truncate number display with ellipsis if too long
 * Useful for tables and compact displays
 * @param value - The number to format
 * @param maxLength - Maximum character length (default: 10)
 * @returns Truncated string with ellipsis if needed
 */
export function truncateNumber(value: number, maxLength: number = 10): string {
  const formatted = value.toLocaleString();

  if (formatted.length > maxLength) {
    return formatted.substring(0, maxLength - 1) + '…';
  }

  return formatted;
}

/**
 * Format number with smart precision based on magnitude
 * Large numbers get less decimal precision
 * @param value - The number to format
 * @returns Formatted string
 */
export function formatSmartPrecision(value: number): string {
  const absValue = Math.abs(value);

  if (absValue >= 1_000_000) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  } else if (absValue >= 1_000) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
  } else {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

/**
 * Check if number should be abbreviated for mobile
 * Based on viewport width and number size
 * @param value - The number value
 * @param isMobile - Is viewport mobile-sized (can be detected with window.innerWidth < 768)
 * @returns Whether to abbreviate
 */
export function shouldAbbreviate(value: number, isMobile: boolean = false): boolean {
  const absValue = Math.abs(value);
  const digitCount = Math.floor(Math.log10(absValue)) + 1;

  // On mobile, abbreviate numbers with 6+ digits
  if (isMobile && digitCount >= 6) {
    return true;
  }

  // On desktop, abbreviate numbers with 9+ digits
  if (!isMobile && digitCount >= 9) {
    return true;
  }

  return false;
}
