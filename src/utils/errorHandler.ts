export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export class CustomError extends Error {
  code: string;
  details?: any;
  timestamp: Date;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = 'CustomError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

// Error types
export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  CLIENT_ERROR: 'CLIENT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Convert various error types to AppError
export function normalizeError(error: any): AppError {
  const timestamp = new Date();

  // Handle CustomError
  if (error instanceof CustomError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: error.timestamp
    };
  }

  // Handle Supabase errors
  if (error?.code && error?.message) {
    const code = error.code.includes('auth') ? ErrorCodes.AUTHENTICATION_ERROR :
                 error.code.includes('permission') ? ErrorCodes.AUTHORIZATION_ERROR :
                 error.code.includes('database') ? ErrorCodes.DATABASE_ERROR :
                 ErrorCodes.SERVER_ERROR;

    return {
      code,
      message: error.message,
      details: error,
      timestamp
    };
  }

  // Handle network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      code: ErrorCodes.NETWORK_ERROR,
      message: 'Network connection failed. Please check your internet connection.',
      details: error,
      timestamp
    };
  }

  // Handle generic errors
  return {
    code: ErrorCodes.UNKNOWN_ERROR,
    message: error?.message || 'An unexpected error occurred',
    details: error,
    timestamp
  };
}

// Get user-friendly error message
export function getErrorMessage(error: AppError): string {
  switch (error.code) {
    case ErrorCodes.NETWORK_ERROR:
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    
    case ErrorCodes.VALIDATION_ERROR:
      return error.message || 'Please check your input and try again.';
    
    case ErrorCodes.AUTHENTICATION_ERROR:
      return 'Authentication failed. Please check your credentials and try again.';
    
    case ErrorCodes.AUTHORIZATION_ERROR:
      return 'You do not have permission to perform this action.';
    
    case ErrorCodes.DATABASE_ERROR:
      return 'Database operation failed. Please try again later.';
    
    case ErrorCodes.SERVER_ERROR:
      return 'Server error occurred. Please try again later.';
    
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

// Log error (in production, this would send to error reporting service)
export function logError(error: AppError, context?: string) {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error ${context ? `in ${context}` : ''}`);
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    console.error('Timestamp:', error.timestamp);
    console.error('Details:', error.details);
    console.groupEnd();
  }

  // In production, send to error reporting service
  // Example: Sentry.captureException(error, { tags: { code: error.code }, extra: { context } });
}

// Async error handler wrapper
export function handleAsyncError<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  return operation().catch((error) => {
    const appError = normalizeError(error);
    logError(appError, context);
    throw appError;
  });
}