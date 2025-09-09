// Indonesian currency formatting utilities

export const formatIDRCurrency = (amount: string | number): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d.-]/g, '')) : amount;
  
  if (isNaN(numAmount)) return '0';
  
  return new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
};

export const formatIDRInput = (value: string): string => {
  // Remove all non-digit characters except dots and commas
  const cleanValue = value.replace(/[^\d]/g, '');
  
  if (!cleanValue) return '';
  
  // Convert to number and format
  const numValue = parseInt(cleanValue);
  return formatIDRCurrency(numValue);
};

export const parseIDRInput = (formattedValue: string): string => {
  // Remove formatting and return clean number string
  return formattedValue.replace(/[^\d]/g, '');
};

// Format currency with "Rp" prefix
export const formatIDRWithPrefix = (amount: string | number): string => {
  return `Rp ${formatIDRCurrency(amount)}`;
};