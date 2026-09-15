import { useEffect, useState } from 'react';

export type LogEntry = { id: string; timestamp: number; message: string; type: 'info' | 'error' | 'success'; };

let logs: LogEntry[] = [];
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(l => l());

export const logStore = {
  addLog: (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    if (!message) return;
    if (logs.length > 0 && logs[0].message === message) return; // Prevent dupes
    logs = [{ id: Math.random().toString(36).substring(2, 9), timestamp: Date.now(), message, type }, ...logs].slice(0, 2000);
    notify();
  },
  clearLogs: () => {
    logs = [];
    notify();
  },
  getLogs: () => logs,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};

export function useLogs() {
  const [currentLogs, setCurrentLogs] = useState<LogEntry[]>(logStore.getLogs());

  useEffect(() => {
    return logStore.subscribe(() => {
      setCurrentLogs(logStore.getLogs());
    });
  }, []);

  return {
    logs: currentLogs,
    clearLogs: logStore.clearLogs
  };
}
