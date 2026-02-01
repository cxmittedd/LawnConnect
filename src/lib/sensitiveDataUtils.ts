/**
 * Utility functions for handling sensitive data with masking/reveal functionality.
 * Used to protect PII like account numbers and TRNs in the admin interface.
 */

/**
 * Masks a string, showing only the last N characters
 * @param value - The string to mask
 * @param visibleChars - Number of characters to show at the end (default: 4)
 * @param maskChar - Character to use for masking (default: '*')
 * @returns Masked string with only the last N characters visible
 */
export function maskSensitiveData(
  value: string | null | undefined,
  visibleChars: number = 4,
  maskChar: string = '•'
): string {
  if (!value) return 'N/A';
  
  const cleanValue = value.replace(/\s/g, '');
  
  if (cleanValue.length <= visibleChars) {
    // If the value is shorter than visible chars, mask all but last 2
    const show = Math.max(1, Math.floor(cleanValue.length / 2));
    return maskChar.repeat(cleanValue.length - show) + cleanValue.slice(-show);
  }
  
  const maskedPortion = maskChar.repeat(cleanValue.length - visibleChars);
  const visiblePortion = cleanValue.slice(-visibleChars);
  
  return maskedPortion + visiblePortion;
}

/**
 * Masks a TRN (Tax Registration Number) - shows last 3 digits
 * Format: •••••••123
 */
export function maskTRN(trn: string | null | undefined): string {
  return maskSensitiveData(trn, 3);
}

/**
 * Masks an account number - shows last 4 digits
 * Format: ••••••••5678
 */
export function maskAccountNumber(accountNumber: string | null | undefined): string {
  return maskSensitiveData(accountNumber, 4);
}

/**
 * Determines if sensitive data should be revealed based on user action
 */
export interface RevealedDataState {
  [key: string]: boolean;
}

/**
 * Toggle reveal state for a specific field
 */
export function toggleReveal(
  currentState: RevealedDataState,
  fieldKey: string
): RevealedDataState {
  return {
    ...currentState,
    [fieldKey]: !currentState[fieldKey],
  };
}
