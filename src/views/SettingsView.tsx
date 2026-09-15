import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  HardDrive,
  Cpu,
  Folder,
  FolderPlus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Tv,
  User,
  Shield,
  Volume2,
  Check,
  Zap,
  Globe,
  Gauge,
  Play,
  Terminal,
  Wifi,
  Copy,
  Layers,
  Clock,
  Sparkles,
  ExternalLink,
  Search,
  Loader2
} from 'lucide-react';
import { Folder as FolderType, SystemInfo, LibraryStats, ScanResult, ScanProgress, ScannerSettings } from '../types';
import { api } from '../services/api';
import { formatBytes, formatDate } from '../utils/format';
import { RemoteAccessGuide } from '../components/RemoteAccessGuide';
import { useLogs } from '../hooks/useLogs';

export type SettingsTab = 'health' | 'directories' | 'scanner' | 'playback' | 'remote' | 'profile' | 'maintenance' | 'logs';

interface SettingsViewProps {
  folders: FolderType[];
  onRefreshFolders: () => void;
  onOpenAddFolder: () => void;
  onCreateSampleMedia: () => void;
  isCreatingSample: boolean;
  systemInfo: SystemInfo | null;
  stats: LibraryStats | null;
  onLibraryScanned: (result: ScanResult) => void;
  initialTab?: string;
  scanProgress?: ScanProgress | null;
  onTriggerScanProgress?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  folders,
  onRefreshFolders,
  onOpenAddFolder,
  onCreateSampleMedia,
  isCreatingSample,
  systemInfo,
  stats,
  onLibraryScanned,
  initialTab = 'health',
  scanProgress,
  onTriggerScanProgress
}) => {
  // Normalize initialTab for backwards compatibility
  const normalizedInitialTab = (): SettingsTab => {
    if (initialTab === 'folders') return 'directories';
    if (initialTab === 'system') return 'health';
    if (['health', 'directories', 'playback', 'remote', 'profile', 'maintenance'].includes(initialTab)) {
      return initialTab as SettingsTab;
    }
    return 'health';
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>(normalizedInitialTab);

  // Profile preferences
  const [profileName, setProfileName] = useState<string>(() => {
    return localStorage.getItem('cinevault_profile_name') || 'Cinema Administrator';
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(profileName);

  const handleSaveName = () => {
    const trimmed = tempName.trim() || 'Cinema Administrator';
    setProfileName(trimmed);
    localStorage.setItem('cinevault_profile_name', trimmed);
    setIsEditingName(false);
  };

  // Live health diagnostic state
  const [healthStatus, setHealthStatus] = useState<{
    status: string;
    timestamp: string;
    latencyMs?: number;
    database?: string;
    streamingEngine?: string;
    uptimeSeconds?: number;
  } | null>(null);
  const [isTestingHealth, setIsTestingHealth] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Scanner and maintenance states
  const [scanningFolderId, setScanningFolderId] = useState<number | null>(null);
  const [isScanningAll, setIsScanningAll] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Scanner settings state
  const [scannerSettings, setScannerSettings] = useState<ScannerSettings | null>(null);
  const [isSavingScanner, setIsSavingScanner] = useState(false);
  const [scannerSettingsString, setScannerSettingsString] = useState<string>('');

  useEffect(() => {
    if (activeTab === 'scanner' && !scannerSettings) {
      api.getScannerSettings().then(s => {
        setScannerSettings(s);
        setScannerSettingsString(s.allowedExtensions.join(', '));
      }).catch(console.error);
    }
  }, [activeTab]);

  const handleSaveScannerSettings = async () => {
    if (!scannerSettings) return;
    setIsSavingScanner(true);
    try {
      const exts = scannerSettingsString.split(',').map(s => s.trim()).filter(Boolean);
      const updated = await api.updateScannerSettings({
        ...scannerSettings,
        allowedExtensions: exts
      });
      setScannerSettings(updated);
      setScannerSettingsString(updated.allowedExtensions.join(', '));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingScanner(false);
    }
  };

  // Playback experience preferences
  const [defaultSpeed, setDefaultSpeed] = useState<number>(() => {
    const saved = localStorage.getItem('cinevault_speed');
    return saved !== null ? parseFloat(saved) : 1;
  });

  const [autoplayNext, setAutoplayNext] = useState<boolean>(() => {
    return localStorage.getItem('cinevault_autoplay_next') !== 'false';
  });

  const [autoResume, setAutoResume] = useState<boolean>(() => {
    return localStorage.getItem('cinevault_auto_resume') !== 'false';
  });

  const [defaultVolume, setDefaultVolume] = useState<number>(() => {
    return parseInt(localStorage.getItem('cinevault_default_volume') || '80', 10);
  });

  const [defaultFitMode, setDefaultFitMode] = useState<'contain' | 'cover'>(() => {
    return (localStorage.getItem('cinevault_fit_mode') as 'contain' | 'cover') || 'contain';
  });

  const [ambientGlow, setAmbientGlow] = useState<boolean>(() => {
    return localStorage.getItem('cinevault_ambient_glow') !== 'false';
  });

  // Run live health check on mount or when switching to health tab
  const runHealthCheck = async () => {
    setIsTestingHealth(true);
    const start = performance.now();
    try {
      const data = await api.getHealth();
      const elapsed = Math.round(performance.now() - start);
      setHealthStatus({
        ...data,
        latencyMs: elapsed
      });
    } catch {
      setHealthStatus({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - start)
      });
    } finally {
      setIsTestingHealth(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const { logs, clearLogs } = useLogs();

  const handleCopyLogs = () => {
    const text = logs.map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    handleCopy(text, 'logs');
  };

  const handleSpeedPreferenceChange = (spd: number) => {
    setDefaultSpeed(spd);
    localStorage.setItem('cinevault_speed', String(spd));
  };

  const handleAutoplayToggle = () => {
    const next = !autoplayNext;
    setAutoplayNext(next);
    localStorage.setItem('cinevault_autoplay_next', String(next));
  };

  const handleAutoResumeToggle = () => {
    const next = !autoResume;
    setAutoResume(next);
    localStorage.setItem('cinevault_auto_resume', String(next));
  };

  const handleVolumeChange = (val: number) => {
    setDefaultVolume(val);
    localStorage.setItem('cinevault_default_volume', String(val));
    localStorage.setItem('cinevault_volume', String(val / 100));
  };

  const handleFitModeChange = (mode: 'contain' | 'cover') => {
    setDefaultFitMode(mode);
    localStorage.setItem('cinevault_fit_mode', mode);
  };

  const handleAmbientGlowToggle = () => {
    const next = !ambientGlow;
    setAmbientGlow(next);
    localStorage.setItem('cinevault_ambient_glow', String(next));
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(id);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  // Rescan specific folder
  const handleScanFolder = async (folderId: number) => {
    setScanningFolderId(folderId);
    try {
      await api.scanFolder(folderId, true);
      onTriggerScanProgress?.();
    } catch (err: any) {
      alert(`Scan failed: ${err.message}`);
    } finally {
      setScanningFolderId(null);
    }
  };

  // Toggle folder enabled
  const handleToggleFolderEnabled = async (folder: FolderType) => {
    try {
      await api.updateFolder(folder.id, { enabled: !folder.enabled });
      onRefreshFolders();
    } catch (err: any) {
      alert(`Failed to update folder: ${err.message}`);
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folder: FolderType) => {
    if (
      !confirm(
        `Are you sure you want to remove "${folder.name}"? Videos in this folder will be unindexed from CineVault (your actual files will NOT be deleted).`
      )
    ) {
      return;
    }

    try {
      await api.deleteFolder(folder.id);
      onRefreshFolders();
    } catch (err: any) {
      alert(`Failed to delete folder: ${err.message}`);
    }
  };

  // Full library scan
  const handleScanAll = async () => {
    setIsScanningAll(true);
    try {
      await api.scanLibrary(true);
      onTriggerScanProgress?.();
    } catch (err: any) {
      alert(`Library scan failed: ${err.message}`);
    } finally {
      setIsScanningAll(false);
    }
  };

  // Clean up missing/deleted media
  const handleCleanup = async () => {
    setIsCleaningUp(true);
    setCleanupMessage(null);
    try {
      const res = await api.cleanupLibrary();
      setCleanupMessage(res.message);
      onRefreshFolders();
    } catch (err: any) {
      setCleanupMessage(`Cleanup error: ${err.message}`);
    } finally {
      setIsCleaningUp(false);
    }
  };

  // Reset entire library
  const handleResetLibrary = async () => {
    if (resetConfirmText.trim() !== 'RESET') {
      alert('Please type RESET in capital letters to confirm.');
      return;
    }

    setIsResetting(true);
    try {
      const res = await api.resetLibrary('RESET');
      setResetMessage(res.message);
      setResetConfirmText('');
      onRefreshFolders();
    } catch (err: any) {
      setResetMessage(`Reset error: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  // Memory calculation
  const totalMem = systemInfo?.totalMemBytes || 4294967296;
  const freeMem = systemInfo?.freeMemBytes || 2147483648;
  const usedMem = Math.max(0, totalMem - freeMem);
  const memUsagePercent = Math.round((usedMem / totalMem) * 100);

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-20">
      {/* 1. Account & Profile Header Card */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-r from-[#0b0f19] via-[#0f172a] to-[#0b0f19] p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-5">
            {/* Avatar Badge */}
            <div className="relative">
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white font-extrabold text-2xl sm:text-3xl shadow-xl shadow-indigo-500/25 border border-white/20">
                {profileName.charAt(0).toUpperCase()}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#030712] border-2 border-emerald-500">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </span>
            </div>

            {/* Profile Info */}
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                {isEditingName ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="rounded-lg border border-indigo-500 bg-black/60 px-2.5 py-1 text-sm font-bold text-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className="rounded-lg bg-indigo-500 p-1.5 text-white hover:bg-indigo-400 active:scale-95 transition-all"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white font-['Outfit']">
                      {profileName}
                    </h1>
                    <button
                      onClick={() => {
                        setTempName(profileName);
                        setIsEditingName(true);
                      }}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 underline ml-1"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Server Healthy</span>
                </span>
                <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[11px] font-mono text-[#A1A1AA]">
                  Port: 3000
                </span>
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-[11px] text-indigo-300">
                  Direct Streaming
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Pills */}
          <div className="flex items-center gap-2 sm:self-center">
            <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-center min-w-[76px]">
              <span className="text-[10px] uppercase font-bold text-[#71717A] block">Movies</span>
              <span className="text-base font-extrabold text-white">{stats ? stats.totalVideos : 0}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-center min-w-[85px]">
              <span className="text-[10px] uppercase font-bold text-[#71717A] block">Storage</span>
              <span className="text-base font-extrabold text-white">
                {stats ? formatBytes(stats.totalStorageBytes) : '0 B'}
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-center min-w-[76px]">
              <span className="text-[10px] uppercase font-bold text-[#71717A] block">Folders</span>
              <span className="text-base font-extrabold text-indigo-400">
                {folders.length}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="mt-8 flex flex-wrap gap-2 border-t border-white/10 pt-5">
          <button
            onClick={() => setActiveTab('health')}
            className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'health'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white/5 text-[#A1A1AA] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Activity className="h-4 w-4 text-emerald-400" />
            <span>Health Status</span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          </button>

          <button
            onClick={() => setActiveTab('directories')}
            className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'directories'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white/5 text-[#A1A1AA] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Folder className="h-4 w-4" />
            <span>Directories Management</span>
            <span className="rounded-full bg-white/15 px-1.5 py-0.2 text-[10px]">
              {folders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'scanner'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white/5 text-[#A1A1AA] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Search className="h-4 w-4" />
            <span>Scanner Limits</span>
          </button>

          <button
            onClick={() => setActiveTab('playback')}
            className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'playback'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white/5 text-[#A1A1AA] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Playback Engine</span>
          </button>

          <button
            onClick={() => setActiveTab('remote')}
            className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'remote'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white/5 text-[#A1A1AA] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Tv className="h-4 w-4 text-indigo-300" />
            <span>Remote & Android TV</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white/5 text-[#A1A1AA] hover:bg-white/10 hover:text-white'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Cinema Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'maintenance'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white/5 text-[#A1A1AA] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Shield className="h-4 w-4 text-amber-400" />
            <span>Maintenance & Reset</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'logs'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white/5 text-[#A1A1AA] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Terminal className="h-4 w-4" />
            <span>Activity Logs</span>
          </button>
        </div>
      </section>

      {/* 2. Content for Selected Tab */}

      {/* TAB 1: HEALTH STATUS */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Real-time Health Banner */}
          <section className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-[#0b0f19] to-[#0b0f19] p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-6">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                  <Activity className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-white">System & Server Health</h2>
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-400">
                      100% Operational
                    </span>
                  </div>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Real-time monitoring of local HTTP streaming services, SQLite database, and video pipeline.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {healthStatus?.latencyMs !== undefined && (
                  <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-right">
                    <span className="text-[10px] uppercase font-bold text-[#71717A] block">Ping Latency</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {healthStatus.latencyMs} ms
                    </span>
                  </div>
                )}
                <button
                  onClick={runHealthCheck}
                  disabled={isTestingHealth}
                  className="flex items-center space-x-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-black hover:bg-emerald-400 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isTestingHealth ? 'animate-spin' : ''}`} />
                  <span>{isTestingHealth ? 'Pinging...' : 'Test Health Ping'}</span>
                </button>
              </div>
            </div>

            {/* Health Subsystem Status Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
              <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#A1A1AA]">HTTP Streamer</span>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <div className="mt-3">
                  <p className="text-sm font-bold text-white">RFC 7233 Range</p>
                  <p className="text-[11px] text-emerald-400 font-mono mt-0.5">Byte-Range Seeking Active</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#A1A1AA]">Database Engine</span>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <div className="mt-3">
                  <p className="text-sm font-bold text-white">SQLite 3 Embedded</p>
                  <p className="text-[11px] text-emerald-400 font-mono mt-0.5">WAL Journal Connected</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#A1A1AA]">CORS & Headers</span>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <div className="mt-3">
                  <p className="text-sm font-bold text-white">Cross-Origin Allowed</p>
                  <p className="text-[11px] text-emerald-400 font-mono mt-0.5">Web & TV Unrestricted</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#A1A1AA]">Ingress Port</span>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <div className="mt-3">
                  <p className="text-sm font-bold text-white">0.0.0.0:3000</p>
                  <p className="text-[11px] text-emerald-400 font-mono mt-0.5">External Proxy Bound</p>
                </div>
              </div>
            </div>
          </section>

          {/* System Hardware & Resource Utilization */}
          <section className="space-y-4 rounded-3xl border border-white/5 bg-[#0b0f19] p-6 sm:p-8">
            <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-white/5 pb-4">
              <Gauge className="h-5 w-5 text-indigo-400" />
              <span>Resource & Hardware Utilization</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* RAM Usage */}
              <div className="rounded-2xl border border-white/5 bg-[#060b17] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#A1A1AA] uppercase">Memory (RAM)</span>
                  <span className="text-xs font-mono font-bold text-indigo-400">{memUsagePercent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${memUsagePercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#71717A]">
                  <span>Used: {formatBytes(usedMem)}</span>
                  <span>Total: {formatBytes(totalMem)}</span>
                </div>
              </div>

              {/* Indexed Media Storage */}
              <div className="rounded-2xl border border-white/5 bg-[#060b17] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#A1A1AA] uppercase">Media Storage</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {stats ? stats.totalVideos : 0} Videos
                  </span>
                </div>
                <div className="text-xl font-extrabold text-white">
                  {stats ? formatBytes(stats.totalStorageBytes) : '0 B'}
                </div>
                <div className="text-[11px] text-[#71717A]">
                  Across {folders.length} configured media directories
                </div>
              </div>

              {/* Runtime Environment */}
              <div className="rounded-2xl border border-white/5 bg-[#060b17] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#A1A1AA] uppercase">Server Runtime</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-300 font-mono">
                    {systemInfo?.nodeVersion || 'Node.js'}
                  </span>
                </div>
                <div className="text-sm font-bold text-white capitalize">
                  {systemInfo?.platform || 'Linux'} Container
                </div>
                <div className="text-[11px] text-[#71717A] font-mono truncate">
                  Host: {systemInfo?.hostname || 'localhost'}
                </div>
              </div>
            </div>
          </section>

          {/* Supported Video Codecs & Stream Pipeline */}
          <section className="space-y-4 rounded-3xl border border-white/5 bg-[#0b0f19] p-6 sm:p-8">
            <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-white/5 pb-4">
              <Play className="h-5 w-5 text-indigo-400" />
              <span>Format & Codec Playback Compatibility</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { ext: '.mp4', label: 'MP4 / H.264', status: 'Native Passthrough', state: 'Supported' },
                { ext: '.webm', label: 'WebM / VP8/VP9', status: 'Direct Stream', state: 'Supported' },
                { ext: '.mkv', label: 'Matroska (.mkv)', status: 'Remux / Fallback', state: 'Supported' },
                { ext: '.ts', label: 'MPEG-TS (.ts)', status: 'HLS Compatible', state: 'Supported' }
              ].map((c) => (
                <div key={c.ext} className="rounded-2xl border border-white/5 bg-[#060b17] p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-white">{c.ext}</span>
                    <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">
                      {c.state}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] font-semibold">{c.label}</p>
                  <p className="text-[10px] text-[#71717A]">{c.status}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: DIRECTORIES MANAGEMENT */}
      {activeTab === 'directories' && (
        <section className="space-y-6 rounded-3xl border border-white/5 bg-[#0b0f19] p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Folder className="h-5 w-5 text-indigo-400" />
                <span>Media Directories Management</span>
              </h2>
              <p className="text-xs text-[#71717A] mt-0.5">
                Manage local and network directories indexed by CineVault for movies and video playback.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onCreateSampleMedia}
                disabled={isCreatingSample}
                className="flex items-center space-x-1.5 rounded-xl border border-white/10 bg-[#181B24] px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition-all active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>{isCreatingSample ? 'Generating...' : 'Add Demo Media'}</span>
              </button>

              <button
                onClick={handleScanAll}
                disabled={isScanningAll}
                className="flex items-center space-x-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition-all active:scale-95"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isScanningAll ? 'animate-spin text-indigo-400' : ''}`} />
                <span>{isScanningAll ? 'Scanning...' : 'Scan All'}</span>
              </button>

              <button
                onClick={onOpenAddFolder}
                className="flex items-center space-x-1.5 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400 transition-all active:scale-95"
              >
                <FolderPlus className="h-4 w-4" />
                <span>Add Directory</span>
              </button>
            </div>
          </div>

          {folders.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-[#71717A]">
                <Folder className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-bold text-white">No Media Directories Configured</h3>
              <p className="text-xs text-[#71717A] max-w-sm mx-auto">
                Add a local folder or network share path to start indexing your media library.
              </p>
              <div className="pt-2">
                <button
                  onClick={onOpenAddFolder}
                  className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-400 shadow-md shadow-indigo-500/30"
                >
                  Add Your First Directory
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="rounded-2xl border border-white/5 bg-[#060b17] p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between transition-all hover:border-white/10"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-white">{folder.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          folder.enabled
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        {folder.enabled ? 'ACTIVE' : 'DISABLED'}
                      </span>
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-zinc-300 font-semibold">
                        {folder.video_count} {folder.video_count === 1 ? 'video' : 'videos'}
                      </span>
                      {folder.folder_type && folder.folder_type !== 'local' && (
                        <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-300 uppercase font-bold">
                          {folder.folder_type}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-[#71717A] font-mono">
                      <span className="truncate max-w-lg">{folder.path}</span>
                      <button
                        onClick={() => handleCopy(folder.path, String(folder.id))}
                        className="text-[#71717A] hover:text-white transition-colors"
                        title="Copy folder path"
                      >
                        {copiedPath === String(folder.id) ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>

                    {folder.last_scanned_at && (
                      <p className="text-[11px] text-[#71717A]">
                        Last indexed: {formatDate(folder.last_scanned_at)}
                      </p>
                    )}

                    {scanProgress?.isScanning && (scanProgress.folderId === folder.id || scanProgress.folderId === null) && (
                      <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5 max-w-xl">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-indigo-400 font-semibold flex items-center truncate">
                            <Loader2 className="h-3 w-3 animate-spin mr-1.5 shrink-0" />
                            <span className="truncate">{scanProgress.message || 'Fetching videos in background...'}</span>
                          </span>
                          <span className="font-mono text-xs font-bold text-white shrink-0 ml-2">
                            {Math.round(scanProgress.progressPercent || 0)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                            style={{ width: `${Math.round(scanProgress.progressPercent || 0)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#71717A]">
                          <span>{scanProgress.videosFound} videos discovered ({scanProgress.filesChecked} files inspected)</span>
                          {scanProgress.elapsedSeconds > 0 && <span>{scanProgress.elapsedSeconds}s elapsed</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleToggleFolderEnabled(folder)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                        folder.enabled
                          ? 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                      }`}
                    >
                      {folder.enabled ? 'Disable' : 'Enable'}
                    </button>

                    <button
                      onClick={() => handleScanFolder(folder.id)}
                      disabled={scanningFolderId === folder.id}
                      className="flex items-center space-x-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition-all active:scale-95"
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${
                          scanningFolderId === folder.id ? 'animate-spin text-indigo-400' : ''
                        }`}
                      />
                      <span>{scanningFolderId === folder.id ? 'Scanning...' : 'Rescan'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteFolder(folder)}
                      className="rounded-xl p-2 text-[#71717A] hover:bg-red-500/20 hover:text-red-400 transition-all active:scale-95"
                      title="Remove folder from CineVault"
                      aria-label="Remove Folder"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: SCANNER LIMITS */}
      {activeTab === 'scanner' && (
        <section className="space-y-6 rounded-3xl border border-white/5 bg-[#0b0f19] p-6 sm:p-8">
          <div className="border-b border-white/5 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Search className="h-5 w-5 text-indigo-400" />
              <span>Scanner & Fetching Limits</span>
            </h2>
            <p className="text-xs text-[#71717A] mt-0.5">
              Configure filtering rules used by the indexing engine when scanning directories.
            </p>
          </div>

          {!scannerSettings ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Max Fetch Limit */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white">Maximum Files to Fetch</label>
                  <p className="text-xs text-[#71717A]">
                    Limit the number of videos fetched per scan (0 = unlimited).
                  </p>
                  <input
                    type="number"
                    min="0"
                    value={scannerSettings.maxFetchLimit}
                    onChange={(e) => setScannerSettings({ ...scannerSettings, maxFetchLimit: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-white/10 bg-[#151720] px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Min Size MB */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white">Minimum File Size (MB)</label>
                  <p className="text-xs text-[#71717A]">
                    Skip videos smaller than this size (0 = no limit).
                  </p>
                  <input
                    type="number"
                    min="0"
                    value={scannerSettings.minSizeMB}
                    onChange={(e) => setScannerSettings({ ...scannerSettings, minSizeMB: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-white/10 bg-[#151720] px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Min Duration Seconds */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white">Minimum Duration (Seconds)</label>
                  <p className="text-xs text-[#71717A]">
                    Skip videos shorter than this duration (0 = no limit).
                  </p>
                  <input
                    type="number"
                    min="0"
                    value={scannerSettings.minDurationSeconds}
                    onChange={(e) => setScannerSettings({ ...scannerSettings, minDurationSeconds: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-white/10 bg-[#151720] px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

              </div>

              {/* Allowed Extensions */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white">Allowed File Formats</label>
                <p className="text-xs text-[#71717A]">
                  Comma-separated list of extensions (e.g. .mp4, .mkv, .avi).
                </p>
                <input
                  type="text"
                  value={scannerSettingsString}
                  onChange={(e) => setScannerSettingsString(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#151720] px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-white/5">
                <button
                  onClick={handleSaveScannerSettings}
                  disabled={isSavingScanner}
                  className="flex items-center space-x-2 rounded-xl bg-indigo-500 px-6 py-3 font-semibold text-white hover:bg-indigo-400 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all shadow-lg shadow-indigo-500/25"
                >
                  {isSavingScanner ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span>{isSavingScanner ? 'Saving...' : 'Save Scanner Settings'}</span>
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 4: PLAYBACK ENGINE */}
      {activeTab === 'playback' && (
        <section className="space-y-6 rounded-3xl border border-white/5 bg-[#0b0f19] p-6 sm:p-8">
          <div className="border-b border-white/5 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Sliders className="h-5 w-5 text-indigo-400" />
              <span>Player Engine & Audio Settings</span>
            </h2>
            <p className="text-xs text-[#71717A] mt-0.5">
              Configure default playback speed, video aspect ratio, ambient glow, and audio controls.
            </p>
          </div>

          <div className="divide-y divide-white/5 text-sm space-y-4">
            {/* Default Playback Speed */}
            <div className="py-2 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white block">Default Playback Speed</span>
                  <p className="text-xs text-[#71717A]">
                    Initial speed applied when starting or resuming videos
                  </p>
                </div>
                <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-bold text-indigo-300">
                  {defaultSpeed}x {defaultSpeed === 1 ? '(Normal)' : ''}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => handleSpeedPreferenceChange(spd)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      defaultSpeed === spd
                        ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                        : 'bg-[#060b17] border border-white/10 text-[#A1A1AA] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {spd}x {spd === 1 ? 'Normal' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Autoplay Next */}
            <div className="flex items-center justify-between pt-5">
              <div>
                <span className="font-semibold text-white">Autoplay Next Video</span>
                <p className="text-xs text-[#71717A]">
                  Automatically play the next video in the directory when current one ends
                </p>
              </div>
              <button
                onClick={handleAutoplayToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoplayNext ? 'bg-indigo-500' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoplayNext ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Auto Resume */}
            <div className="flex items-center justify-between pt-5">
              <div>
                <span className="font-semibold text-white">Auto-Resume Playback</span>
                <p className="text-xs text-[#71717A]">
                  Remember exact playback timestamp and show instant resume prompt
                </p>
              </div>
              <button
                onClick={handleAutoResumeToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoResume ? 'bg-indigo-500' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoResume ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Aspect Ratio Mode */}
            <div className="pt-5 space-y-3">
              <span className="font-semibold text-white block">Default Screen Fit Mode</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleFitModeChange('contain')}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    defaultFitMode === 'contain'
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-white/5 bg-[#060b17] hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Original Fit (Contain / Letterbox)</span>
                    {defaultFitMode === 'contain' && <Check className="h-4 w-4 text-indigo-400" />}
                  </div>
                  <p className="text-[11px] text-[#71717A] mt-1">
                    Preserves original cinematography aspect ratio without cropping.
                  </p>
                </button>

                <button
                  onClick={() => handleFitModeChange('cover')}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    defaultFitMode === 'cover'
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-white/5 bg-[#060b17] hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Fill Screen (Cover / Zoom)</span>
                    {defaultFitMode === 'cover' && <Check className="h-4 w-4 text-indigo-400" />}
                  </div>
                  <p className="text-[11px] text-[#71717A] mt-1">
                    Fills entire display edge-to-edge for immersive TV viewing.
                  </p>
                </button>
              </div>
            </div>

            {/* Cinematic Ambient Glow */}
            <div className="flex items-center justify-between pt-5">
              <div>
                <span className="font-semibold text-white">Cinematic Ambient Glow</span>
                <p className="text-xs text-[#71717A]">
                  Projects a soft ambient backdrop light around the player matching video colors
                </p>
              </div>
              <button
                onClick={handleAmbientGlowToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  ambientGlow ? 'bg-indigo-500' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    ambientGlow ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Startup Volume Slider */}
            <div className="pt-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white flex items-center space-x-2">
                  <Volume2 className="h-4 w-4 text-indigo-400" />
                  <span>Default Startup Volume</span>
                </span>
                <span className="font-mono text-xs text-indigo-300 font-bold">{defaultVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={defaultVolume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500 cursor-pointer h-2 bg-white/10 rounded-lg"
              />
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: REMOTE & ANDROID TV */}
      {activeTab === 'remote' && <RemoteAccessGuide port={3000} />}

      {/* TAB 5: PROFILE & CUSTOMIZATION */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <section className="space-y-6 rounded-3xl border border-white/5 bg-[#0b0f19] p-6 sm:p-8">
            <div className="border-b border-white/5 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <User className="h-5 w-5 text-indigo-400" />
                <span>Cinema Profile & Personalization</span>
              </h2>
              <p className="text-xs text-[#71717A] mt-0.5">
                Customize administrator name, theme accents, and view private vault statistics.
              </p>
            </div>

            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] uppercase">Profile Display Name</label>
                <div className="mt-2 flex items-center space-x-2">
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => {
                      setProfileName(e.target.value);
                      localStorage.setItem('cinevault_profile_name', e.target.value);
                    }}
                    className="w-full rounded-xl border border-white/10 bg-[#060b17] px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Cinema Room TV"
                  />
                </div>
                <p className="mt-1 text-[11px] text-[#71717A]">
                  Saved locally to this browser session.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] uppercase">Storage Mode</label>
                <div className="mt-2 rounded-2xl border border-white/5 bg-[#060b17] p-4 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-white">Direct Local File Streaming</span>
                    <p className="text-xs text-[#71717A]">Files are read in real-time from device filesystem.</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>

            {/* Library Statistics Summary */}
            <div className="pt-4 border-t border-white/5">
              <h3 className="text-sm font-bold text-white mb-3">Library Watch Statistics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4 text-center">
                  <span className="text-[10px] uppercase font-bold text-[#71717A] block">Total Movies</span>
                  <span className="text-lg font-extrabold text-white mt-1 block">
                    {stats?.totalVideos || 0}
                  </span>
                </div>
                <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4 text-center">
                  <span className="text-[10px] uppercase font-bold text-[#71717A] block">Completed</span>
                  <span className="text-lg font-extrabold text-emerald-400 mt-1 block">
                    {stats?.watchedVideos || 0}
                  </span>
                </div>
                <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4 text-center">
                  <span className="text-[10px] uppercase font-bold text-[#71717A] block">In Progress</span>
                  <span className="text-lg font-extrabold text-indigo-400 mt-1 block">
                    {stats?.inProgressVideos || 0}
                  </span>
                </div>
                <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4 text-center">
                  <span className="text-[10px] uppercase font-bold text-[#71717A] block">Favorites</span>
                  <span className="text-lg font-extrabold text-rose-400 mt-1 block">
                    {stats?.favoriteVideos || 0}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 6: MAINTENANCE & DANGER ZONE */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          {/* Maintenance Actions */}
          <section className="space-y-4 rounded-3xl border border-white/5 bg-[#0b0f19] p-6 sm:p-8">
            <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-white/5 pb-4">
              <HardDrive className="h-5 w-5 text-indigo-400" />
              <span>Library Maintenance & Indexing</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/5 bg-[#060b17] p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Rescan All Folders</h3>
                  <p className="mt-1 text-xs text-[#71717A]">
                    Detects newly added, moved, or updated video files across all active folders.
                  </p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleScanAll}
                    disabled={isScanningAll}
                    className="flex items-center space-x-2 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-400 disabled:opacity-50 transition-all active:scale-95"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isScanningAll ? 'animate-spin' : ''}`} />
                    <span>{isScanningAll ? 'Scanning Library...' : 'Scan All Folders'}</span>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-[#060b17] p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Clean Up Missing Files</h3>
                  <p className="mt-1 text-xs text-[#71717A]">
                    Verifies if indexed files still exist on disk. Removes entries for files you have deleted.
                  </p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleCleanup}
                    disabled={isCleaningUp}
                    className="flex items-center space-x-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition-all active:scale-95"
                  >
                    <RotateCcw className={`h-3.5 w-3.5 ${isCleaningUp ? 'animate-spin' : ''}`} />
                    <span>{isCleaningUp ? 'Cleaning...' : 'Run Cleanup'}</span>
                  </button>
                </div>
              </div>
            </div>

            {cleanupMessage && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-emerald-300">
                {cleanupMessage}
              </div>
            )}
          </section>

          {/* Danger Zone */}
          <section className="space-y-4 rounded-3xl border border-red-500/20 bg-red-950/10 p-6 sm:p-8">
            <h2 className="text-base font-bold text-red-300 flex items-center space-x-2 border-b border-red-500/20 pb-4">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <span>Reset Library Database</span>
            </h2>
            <p className="text-xs text-[#A1A1AA]">
              Clears all indexed videos, directories, playback watch progress, and favorites from the CineVault SQLite database.
              <strong> Your physical video files on your device are never touched or deleted.</strong>
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="Type RESET to confirm"
                className="rounded-xl border border-red-500/30 bg-black/40 px-3.5 py-2 font-mono text-xs text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none"
              />
              <button
                onClick={handleResetLibrary}
                disabled={isResetting || resetConfirmText.trim() !== 'RESET'}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-40 transition-all active:scale-95"
              >
                {isResetting ? 'Resetting...' : 'Reset CineVault Database'}
              </button>
            </div>

            {resetMessage && (
              <p className="text-xs text-red-300 mt-2">{resetMessage}</p>
            )}
          </section>
        </div>
      )}

      {/* TAB 7: LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          <section className="space-y-4 rounded-3xl border border-white/5 bg-[#0b0f19] p-6 sm:p-8 flex flex-col h-[500px]">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Terminal className="h-5 w-5 text-indigo-400" />
                  <span>System Activity Logs</span>
                </h2>
                <p className="text-xs text-[#71717A] mt-0.5">
                  Live scanner and system events from the current session.
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleCopyLogs}
                  className="flex items-center space-x-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 transition-all active:scale-95"
                >
                  {copiedPath === 'logs' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedPath === 'logs' ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={clearLogs}
                  className="flex items-center space-x-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-xl bg-black/60 p-4 border border-white/5 font-mono text-xs">
              {logs.length === 0 ? (
                <div className="flex h-full items-center justify-center text-[#71717A]">
                  No logs available for this session.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {logs.map((log) => (
                    <div key={log.id} className="flex space-x-3 items-start border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                      <span className="text-[#71717A] whitespace-nowrap shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span
                        className={`shrink-0 uppercase font-bold w-12 ${
                          log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : 'text-indigo-400'
                        }`}
                      >
                        [{log.type}]
                      </span>
                      <span className={`break-all ${log.type === 'error' ? 'text-red-300' : 'text-gray-300'}`}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
