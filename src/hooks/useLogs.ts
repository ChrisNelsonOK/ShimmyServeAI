import { useState, useEffect, useCallback, useRef } from 'react';
import { LogEntry } from '../types';
import { realLoggingService, LogFilter, LogStats } from '../services/realLoggingService';

export function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const fetchLogs = useCallback(async (filters?: LogFilter) => {
    try {
      setLoading(true);
      setError(null);
      
      const fetchedLogs = await realLoggingService.getLogs(filters);
      
      // Convert to UI format with IDs
      const mappedLogs: LogEntry[] = fetchedLogs.map((log, index) => ({
        id: `log-${Date.now()}-${index}`,
        timestamp: log.timestamp || new Date().toISOString(),
        level: log.level,
        category: log.category,
        message: log.message,
        metadata: log.metadata
      }));

      setLogs(mappedLogs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchLogs = useCallback(async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const searchResults = await realLoggingService.searchLogs(query);
      
      // Convert to UI format with IDs
      const mappedLogs: LogEntry[] = searchResults.map((log, index) => ({
        id: `log-${Date.now()}-${index}`,
        timestamp: log.timestamp || new Date().toISOString(),
        level: log.level,
        category: log.category,
        message: log.message,
        metadata: log.metadata
      }));

      setLogs(mappedLogs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search logs');
      console.error('Error searching logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const logStats = await realLoggingService.getLogStats();
      setStats(logStats);
    } catch (err) {
      console.error('Error fetching log stats:', err);
    }
  }, []);

  const addLog = useCallback(async (logEntry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    try {
      await realLoggingService.log(
        logEntry.level,
        logEntry.category as any,
        logEntry.message,
        logEntry.metadata
      );

      // Refresh logs if not streaming
      if (!isStreaming) {
        await fetchLogs({ limit: 100 });
      }
    } catch (err) {
      console.error('Error adding log:', err);
    }
  }, [fetchLogs, isStreaming]);

  const clearLogs = useCallback(async (filters?: { level?: string; category?: string }) => {
    try {
      // For now, just clear the local display
      // In a real implementation, we'd have a backend endpoint to clear logs
      if (filters?.level || filters?.category) {
        setLogs(prevLogs => 
          prevLogs.filter(log => {
            if (filters.level && log.level !== filters.level) return true;
            if (filters.category && log.category !== filters.category) return true;
            return false;
          })
        );
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error('Error clearing logs:', err);
    }
  }, []);

  const exportLogs = useCallback(async (format: 'json' | 'csv' = 'json'): Promise<string> => {
    try {
      return await realLoggingService.exportLogs(format);
    } catch (err) {
      console.error('Error exporting logs:', err);
      throw err;
    }
  }, []);

  const startStreaming = useCallback(() => {
    if (unsubscribeRef.current) {
      return; // Already streaming
    }

    setIsStreaming(true);
    
    // Subscribe to real-time log stream
    unsubscribeRef.current = realLoggingService.subscribeToLogStream((newLog) => {
      const mappedLog: LogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: newLog.timestamp || new Date().toISOString(),
        level: newLog.level,
        category: newLog.category,
        message: newLog.message,
        metadata: newLog.metadata
      };

      setLogs(prevLogs => [mappedLog, ...prevLogs].slice(0, 1000)); // Keep max 1000 logs
    });
  }, []);

  const stopStreaming = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const toggleStreaming = useCallback(() => {
    if (isStreaming) {
      stopStreaming();
    } else {
      startStreaming();
    }
  }, [isStreaming, startStreaming, stopStreaming]);

  // Start capturing logs when component mounts
  useEffect(() => {
    realLoggingService.startCapturing();
    
    // Initial fetch
    fetchLogs({ limit: 100 });
    fetchStats();

    // Refresh stats periodically
    const statsInterval = setInterval(fetchStats, 30000);

    return () => {
      clearInterval(statsInterval);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [fetchLogs, fetchStats]);

  return {
    logs,
    loading,
    error,
    stats,
    isStreaming,
    fetchLogs,
    searchLogs,
    fetchStats,
    addLog,
    clearLogs,
    exportLogs,
    toggleStreaming
  };
}