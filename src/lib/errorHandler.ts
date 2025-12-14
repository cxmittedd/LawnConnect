import { toast as sonnerToast } from 'sonner';

// Converts technical database errors into user-friendly messages
export function sanitizeError(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  
  const errorMessage = error instanceof Error 
    ? error.message 
    : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);

  // Common database constraint errors
  if (errorMessage.includes('violates check constraint')) {
    return 'Unable to complete this action. Please check your input and try again.';
  }
  
  if (errorMessage.includes('violates row-level security')) {
    return 'You don\'t have permission to perform this action.';
  }
  
  if (errorMessage.includes('violates foreign key constraint')) {
    return 'This action references data that doesn\'t exist or has been removed.';
  }
  
  if (errorMessage.includes('violates unique constraint')) {
    return 'This item already exists. Please use a different value.';
  }
  
  if (errorMessage.includes('violates not-null constraint')) {
    return 'Please fill in all required fields.';
  }
  
  // Network/connection errors
  if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
    return 'Connection error. Please check your internet and try again.';
  }
  
  if (errorMessage.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  // Auth errors
  if (errorMessage.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  
  if (errorMessage.includes('Email not confirmed')) {
    return 'Please verify your email address before signing in.';
  }

  // Storage errors
  if (errorMessage.includes('Payload too large')) {
    return 'File is too large. Please use a smaller file.';
  }

  // Generic fallback - don't expose technical details
  if (errorMessage.includes('postgres') || 
      errorMessage.includes('SQL') || 
      errorMessage.includes('relation') ||
      errorMessage.includes('constraint') ||
      errorMessage.includes('violates') ||
      errorMessage.includes('duplicate key')) {
    return 'Something went wrong. Please try again or contact support.';
  }

  // If it's already a friendly message, return it
  return errorMessage;
}

// Safe toast wrapper that sanitizes error messages
export const safeToast = {
  error: (error: unknown) => {
    const message = sanitizeError(error);
    sonnerToast.error(message);
    // Log the original error for debugging
    console.error('Original error:', error);
  },
  success: sonnerToast.success,
  info: sonnerToast.info,
  warning: sonnerToast.warning,
};
