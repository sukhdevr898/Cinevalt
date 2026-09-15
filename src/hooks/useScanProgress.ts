import { useState, useEffect, useRef, useCallback } from 'react';
import { ScanProgress } from '../types';
import { api } from '../services/api';
import { logStore } from './useLogs';

export function useScanProgress(onScanFinished?: () => void) {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const wasScanningRef = useRef(false);

  const fetchProgress = useCallback(async () => {
    try {
      const data = await api.getScanProgress();
      
      if (data.isScanning && !wasScanningRef.current) {
        setIsDismissed(false); // Reset dismissal on new scan
      }

      setProgress(data);

      if (data.message) {
        // Only log if it's not spamming the same completed message, logStore handles dupes
        let type: 'info' | 'error' | 'success' = 'info';
        if (data.status === 'completed') type = 'success';
        if (data.status === 'error') type = 'error';
        logStore.addLog(data.message, type);
      }

      if (data.errors && data.errors.length > 0) {
        data.errors.forEach(err => logStore.addLog(err, 'error'));
      }

      if (wasScanningRef.current && !data.isScanning && data.status === 'completed') {
        // Just transitioned from scanning to finished!
        onScanFinished?.();
      }
      wasScanningRef.current = data.isScanning;
    } catch {
      // Ignore background transient network hiccups
    }
  }, [onScanFinished]);

  useEffect(() => {
    fetchProgress();
    const intervalTime = progress?.isScanning ? 800 : 3000;
    const timer = setInterval(fetchProgress, intervalTime);
    return () => clearInterval(timer);
  }, [fetchProgress, progress?.isScanning]);

  const dismissProgress = useCallback(() => {
    setIsDismissed(true);
  }, []);

  // Filter out the progress if it was locally dismissed and isn't scanning anymore
  const visibleProgress = (isDismissed && !progress?.isScanning) ? null : progress;

  return {
    progress: visibleProgress,
    isScanning: Boolean(progress?.isScanning),
    refreshProgress: fetchProgress,
    dismissProgress
  };
}
