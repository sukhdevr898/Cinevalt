import { useState, useEffect, useRef, useCallback } from 'react';
import { ScanProgress } from '../types';
import { api } from '../services/api';

export function useScanProgress(onScanFinished?: () => void) {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const wasScanningRef = useRef(false);

  const fetchProgress = useCallback(async () => {
    try {
      const data = await api.getScanProgress();
      setProgress(data);

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
    setProgress(prev => (prev ? { ...prev, status: 'idle', isScanning: false } : null));
  }, []);

  return {
    progress,
    isScanning: Boolean(progress?.isScanning),
    refreshProgress: fetchProgress,
    dismissProgress
  };
}
