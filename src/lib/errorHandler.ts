import { toast as sonnerToast } from 'sonner';

// Check if we're in development mode
const isDevelopment = import.meta.env.DEV;

// Converts technical database errors into user-friendly messages
export function sanitizeError(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  
  const errorMessage = error instanceof Error 
    ? error.message 
    : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);

  // PostgreSQL error codes (SQLSTATE)
  if (errorMessage.includes('23505') || errorMessage.includes('duplicate key')) {
    return 'This item already exists. Please use a different value.';
  }
  
  if (errorMessage.includes('23503') || errorMessage.includes('foreign key')) {
    return 'This action references data that doesn\'t exist or has been removed.';
  }
  
  if (errorMessage.includes('23502') || errorMessage.includes('not-null')) {
    return 'Please fill in all required fields.';
  }
  
  if (errorMessage.includes('42501')) {
    return 'You don\'t have permission to perform this action.';
  }
  
  if (errorMessage.includes('42P01')) {
    return 'Something went wrong. Please try again or contact support.';
  }

  // Common database constraint errors
  if (errorMessage.includes('violates check constraint')) {
    return 'Unable to complete this action. Please check your input and try again.';
  }
  
  if (errorMessage.includes('violates row-level security') || errorMessage.includes('new row violates')) {
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
  
  if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
    return 'Request timed out. Please try again.';
  }

  if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
    return 'Unable to connect to the server. Please try again later.';
  }

  // Auth errors
  if (errorMessage.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  
  if (errorMessage.includes('Email not confirmed')) {
    return 'Please verify your email address before signing in.';
  }

  if (errorMessage.includes('User already registered')) {
    return 'An account with this email already exists.';
  }

  if (errorMessage.includes('Password should be')) {
    return 'Password does not meet the requirements.';
  }

  // Storage errors
  if (errorMessage.includes('Payload too large') || errorMessage.includes('413')) {
    return 'File is too large. Please use a smaller file.';
  }

  if (errorMessage.includes('mime type') || errorMessage.includes('file type')) {
    return 'This file type is not supported.';
  }

  // Rate limiting
  if (errorMessage.includes('rate limit') || errorMessage.includes('429') || errorMessage.includes('too many requests')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Common casting/syntax errors
  if (errorMessage.toLowerCase().includes('invalid input syntax')) {
    return 'Something went wrong. Please try again.';
  }

  // Generic patterns that indicate technical errors - don't expose details
  const technicalPatterns = [
    'postgres',
    'SQL',
    'relation',
    'constraint',
    'violates',
    'duplicate key',
    'syntax error',
    'invalid input syntax',
    'uuid',
    'column',
    'table',
    'schema',
    'function',
    'trigger',
    'policy',
    'PGRST',
    'operator does not exist',
    'permission denied',
    'access denied',
    'authentication failed',
    'JWT',
    'token',
    'supabase',
    'database',
    'query',
    'select',
    'insert',
    'update',
    'delete'
  ];

  const lowerMessage = errorMessage.toLowerCase();
  if (technicalPatterns.some(pattern => lowerMessage.includes(pattern.toLowerCase()))) {
    return 'Something went wrong. Please try again or contact support.';
  }

  // If it's already a friendly message (short and doesn't look technical), return it
  if (errorMessage.length < 100 && !errorMessage.includes('Error:') && !errorMessage.includes('error:')) {
    return errorMessage;
  }

  return 'Something went wrong. Please try again or contact support.';
}

// Safe toast wrapper that sanitizes error messages
export const safeToast = {
  error: (error: unknown) => {
    const message = sanitizeError(error);
    sonnerToast.error(message);
    // Only log original error in development to avoid exposing details in production
    if (isDevelopment) {
      console.error('Original error:', error);
    }
  },
  success: sonnerToast.success,
  info: sonnerToast.info,
  warning: sonnerToast.warning,
};
