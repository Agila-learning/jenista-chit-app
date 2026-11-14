/**
 * Jenista Chits - Indian Currency Formatting & Smart Cursor Positioning Utilities
 * 
 * Standards:
 * - Indian numbering system (en-IN):
 *   - 1,000 (Thousands)
 *   - 10,000 (Ten Thousands)
 *   - 1,00,000 (1 Lakh)
 *   - 10,00,000 (10 Lakhs)
 *   - 1,00,00,000 (1 Crore)
 * - Raw numeric extraction for MongoDB storage and zero floating point string pollution.
 * - Dynamic cursor retention calculation for live input typing.
 */

/**
 * Format a numeric or string value to Indian comma-separated format
 */
export const formatIndianNumber = (
  value: number | string | null | undefined,
  options?: {
    allowDecimals?: boolean;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  }
): string => {
  if (value === null || value === undefined || value === '') return '';

  const strVal = String(value).trim();
  const allowDecimals = options?.allowDecimals ?? true;

  // Split into integer and decimal parts
  const parts = strVal.split('.');
  const rawInteger = parts[0].replace(/\D/g, '');
  const rawDecimals = parts.length > 1 ? parts[1].replace(/\D/g, '') : null;

  if (!rawInteger && rawDecimals === null) return '';

  let formattedInteger = '';
  if (rawInteger) {
    if (rawInteger.length <= 3) {
      formattedInteger = rawInteger;
    } else {
      // Last 3 digits (hundreds)
      const lastThree = rawInteger.slice(-3);
      // Leading digits grouped by pairs (thousands, lakhs, crores)
      const leading = rawInteger.slice(0, -3);
      const formattedLeading = leading.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
      formattedInteger = `${formattedLeading},${lastThree}`;
    }
  } else if (rawDecimals !== null) {
    formattedInteger = '0';
  }

  if (allowDecimals && rawDecimals !== null) {
    const maxDigits = options?.maximumFractionDigits ?? 2;
    const truncatedDecimals = rawDecimals.slice(0, maxDigits);
    return `${formattedInteger}.${truncatedDecimals}`;
  }

  return formattedInteger;
};

/**
 * Format a number as Indian Currency with Rupee symbol (₹)
 */
export const formatIndianCurrency = (
  amount: number | string | null | undefined,
  options?: {
    showDecimals?: boolean;
    includeSymbol?: boolean;
  }
): string => {
  if (amount === null || amount === undefined || amount === '') return '₹0';
  
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return '₹0';

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const showDecimals = options?.showDecimals ?? false;
  const includeSymbol = options?.includeSymbol ?? true;

  const formatted = formatIndianNumber(absNum, {
    allowDecimals: showDecimals,
    maximumFractionDigits: showDecimals ? 2 : 0,
    minimumFractionDigits: showDecimals ? 2 : 0
  });

  const sign = isNegative ? '-' : '';
  const prefix = includeSymbol ? '₹' : '';

  return `${sign}${prefix}${formatted || '0'}`;
};

/**
 * Extract raw numeric value from any formatted string for MongoDB storage & calculations
 */
export const parseIndianNumber = (val: string | number | null | undefined): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;

  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  if (!cleaned) return 0;
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Calculate accurate cursor position after formatting so user cursor does not jump to end
 */
export const calculateIndianCursorPosition = (
  rawBeforeInput: string,
  currentCursor: number,
  formattedResult: string
): number => {
  // Count significant characters (digits & decimal points) before cursor in the pre-formatted string
  const textBeforeCursor = rawBeforeInput.slice(0, currentCursor);
  const significantCharsBefore = textBeforeCursor.replace(/[^\d.]/g, '').length;

  if (significantCharsBefore === 0) {
    return 0;
  }

  // Find index in formattedResult that matches the exact count of significant characters
  let seen = 0;
  let newPosition = formattedResult.length;

  for (let i = 0; i < formattedResult.length; i++) {
    if (/[\d.]/.test(formattedResult[i])) {
      seen++;
    }
    if (seen === significantCharsBefore) {
      newPosition = i + 1;
      break;
    }
  }

  return newPosition;
};
