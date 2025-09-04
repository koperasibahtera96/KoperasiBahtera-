/**
 * Parses a date string that could be in either DD/MM/YYYY or YYYY-MM-DD format
 * and returns a Date object
 */
export function parseDateString(dateString: string): Date {
  if (!dateString) return new Date();
  
  // Check for DD/MM/YYYY format (e.g., "03/09/2025")
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // Check for YYYY-MM-DD format (e.g., "2025-09-03")
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString + 'T00:00:00');
  }
  
  // Fallback to native Date parsing
  return new Date(dateString);
}

/**
 * Formats a date string or Date object to a localized date string
 */
export function formatDate(date: string | Date, options: Intl.DateTimeFormatOptions = {}): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseDateString(date) : new Date(date);
  
  // Default options if none provided
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  return dateObj.toLocaleDateString('id-ID', defaultOptions);
}

/**
 * Formats a date string or Date object to a short date string (DD/MM/YYYY)
 */
export function formatShortDate(date: string | Date): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseDateString(date) : new Date(date);
  
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}/${month}/${year}`;
}
