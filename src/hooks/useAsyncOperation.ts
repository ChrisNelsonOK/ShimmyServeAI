import { useState, useCallback } from 'react';
import { AppError, normalizeError, logError } from '../utils/errorHandler';

interface AsyncOperationState<T> {
  data: T | null;
  loading: boolean;
  error: AppError | null;
}

interface UseAsyncOperationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: AppError) => void;
  context?: string;
}

export function useAsyncOperation<T = any>(options: UseAsyncOperationOptions = {}) {
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (operation: () => Promise<T>): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await operation();
      setState(prev => ({ ...prev, data: result, loading: false, error: null }));
      options.onSuccess?.(result);
      return result;
    } catch (error) {
      const appError = normalizeError(error);
      logError(appError, options.context);
      setState(prev => ({ ...prev, loading: false, error: appError }));
      options.onError?.(appError);
      return null;
    }
  }, [options.onSuccess, options.onError, options.context]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}