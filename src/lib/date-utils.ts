// Centralized Date Utilities
// Fixes timezone issues across the application

/**
 * Formats a UTC date string to local time
 * The database stores dates in UTC, but we need to display them in the user's local timezone
 * 
 * @param dateString - UTC date string from the database
 * @param options - Optional Intl.DateTimeFormatOptions for custom formatting
 * @returns Formatted date string in local timezone
 */
export function formatLocalDateTime(
  dateString: string,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    // If the string doesn't have timezone info, treat it as UTC by adding 'Z'
    const utcDate = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
    const date = new Date(utcDate);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date string: ${dateString}`);
      return 'Invalid Date';
    }
    
    // Use custom options or default format
    if (options) {
      return date.toLocaleString(undefined, options);
    }
    
    // Default format
    return date.toLocaleString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return new Date(dateString).toLocaleString();
  }
}

/**
 * Formats a UTC date string to a specific format
 * Common formats:
 * - "short-date": "Jan 15, 2024"
 * - "short-time": "2:30 PM"
 * - "short-datetime": "Jan 15, 2024 2:30 PM"
 * - "long-date": "January 15, 2024"
 * - "long-datetime": "January 15, 2024 at 2:30 PM"
 */
export function formatLocalDate(
  dateString: string,
  format: "short-date" | "short-time" | "short-datetime" | "long-date" | "long-datetime" = "short-datetime"
): string {
  const utcDate = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
  const date = new Date(utcDate);
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  switch (format) {
    case "short-date":
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    
    case "short-time":
      return date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    
    case "short-datetime":
      return `${date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })} ${date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })}`;
    
    case "long-date":
      return date.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    
    case "long-datetime":
      return date.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    
    default:
      return date.toLocaleString();
  }
}

/**
 * Converts a UTC date string to a Date object in local timezone
 */
export function parseUTCDate(dateString: string): Date {
  const utcDate = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
  return new Date(utcDate);
}
