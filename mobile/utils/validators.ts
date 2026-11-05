/**
 * UTR (Unique Transaction Reference) validation and sanitization utilities
 * Standard UPI / IMPS UTR in India is strictly 12 numeric digits (0-9).
 * Bank NEFT / RTGS can be 12-16 numeric digits.
 */

/**
 * Strips all non-digit characters and truncates to maxLength (default 12 digits for UPI)
 */
export const sanitizeUtr = (text: string, maxLength: number = 12): string => {
  return (text || '').replace(/\D/g, '').slice(0, maxLength);
};

/**
 * Validates whether the UTR is a valid 12-digit numeric code
 */
export const isValidUtr = (utr: string): boolean => {
  if (!utr) return false;
  const cleaned = utr.trim().replace(/\D/g, '');
  return cleaned.length === 12 && /^\d{12}$/.test(cleaned);
};

/**
 * Validates UTR with flexible range (e.g. 12-16 digits for bank transfers)
 */
export const isValidBankUtr = (utr: string, minLen: number = 12, maxLen: number = 16): boolean => {
  if (!utr) return false;
  const cleaned = utr.trim().replace(/\D/g, '');
  return cleaned.length >= minLen && cleaned.length <= maxLen;
};

