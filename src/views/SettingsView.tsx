import React, { useState } from 'react';
import {
  Folder,
  FolderPlus,
  RefreshCw,
  Trash2,
  HardDrive,
  Cpu,
  Sparkles,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Tv,
  User,
  Shield,
  Volume2,
  Settings,
  Check,
  Zap,
  Globe
} from 'lucide-react';
import { Folder as FolderType, SystemInfo, LibraryStats, ScanResult } from '../types';
import { api } from '../services/api';
import { formatBytes, formatDate } from '../utils/format';
import { RemoteAccessGuide } from '../components/RemoteAccessGuide';

interface SettingsViewProps {
  folders: FolderType[];
  onRefreshFolders: () => void;
  onOpenAddFolder: () => void;
  onCreateSampleMedia: () => void;
  isCreatingSample: boolean;
  systemInfo: SystemInfo | null;
  stats: LibraryStats | null;
  onLibraryScanned: (result: ScanResult) => void;
  initialTab?: 'remote' | 'profile' | 'folders' | 'playback' | 'system';
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
  initialTab = 'remote'
}) => {
  const [activeTab, setActiveTab] = useState<'remote' | 'profile' | 'folders' | 'playback' | 'system'>(initialTab);

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

  // Scanner and maintenance states
  const [scanningFolderId, setScanningFolderId] = useState<number | null>(null);
  const [isScanningAll, setIsScanningAll] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Experience preferences stored in localStorage
  const [autoplayNext, setAutoplayNext] = useState<boolean>(() => {
    return localStorage.getItem('cinevault_autoplay_next') !== 'false';
  });

  const [autoResume, setAutoResume] = useState<boolean>(() => {
    return localStorage.getItem('cinevault_auto_resume') !== 'false';
  });

  const [defaultVolume, setDefaultVolume] = useState<number>(() => {
    return parseInt(localStorage.getItem('cinevault_default_volume') || '80', 10);
  });

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
  };

  // Rescan specific folder
  const handleScanFolder = async (folderId: number) => {
    setScanningFolderId(folderId);
    try {
      const res = await api.scanFolder(folderId);
      onLibraryScanned(res);
      onRefreshFolders();
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
        `Are you sure you want to remove "${folder.name}"? Videos in this folder will be unindexed from CineVault (your local files will NOT be deleted).`
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
      const res = await api.scanLibrary();
      onLibraryScanned(res);
      onRefreshFolders();
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

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-20">
      {/* 1. Account & Profile Header Card (Looks like an Account Hub) */}
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
                      className="rounded-lg border border-indigo-500 bg-black/60 px-2 py-1 text-sm font-bold text-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className="rounded-lg bg-indigo-500 p-1.5 text-white hover:bg-indigo-400"
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
                      className="text-[11px] text-[#71717A] hover:text-indigo-400 underline ml-1"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="inline-flex items-center space-x-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300">
                  <Shield className="h-3 w-3" />
                  <span>Private Local Vault</span>
                </span>
                <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[11px] font-mono text-[#A1A1AA]">
                  Host: 0.0.0.0:3000
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Pills */}
          <div className="flex items-center gap-2 sm:self-center">
            <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-center">
              <span className="text-[10px] uppercase font-bold text-[#71717A] block">Movies</span>
              <span className="text-base font-extrabold text-white">{stats ? stats.totalVideos : 0}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-center">
              <span className="text-[10px] uppercase font-bold text-[#71717A] block">Storage</span>
              <span className="text-base font-extrabold text-white">
                {stats ? formatBytes(stats.totalStorageBytes) : '0 B'}
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-center">
              <span className="text-[10px] uppercase font-bold text-[#71717A] block">Favorites</span>
              <span className="text-base font-extrabold text-rose-400">
                {stats ? stats.favoriteVideos : 0}
              </span>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Pill Bar */}
        <div className="mt-8 flex flex-wrap gap-2 border-t border-white/10 pt-5">
          <button
            onClick={() => setActiveTab('remote')}
            className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'remote'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white/5 text-[#A1A1AA] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Tv className="h-4 w-4 text-indigo-300" />
            <span>Remote Access & Android TV</span>
            <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] text-emerald-300 uppercase">
              Guide
            </span>
          </button>

          <button
            onClick={() => setActiveTab('folders')}
            className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'folders'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white/5 text-[#A1A1AA] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Folder className="h-4 w-4" />
            <span>Media Folders ({folders.length})</span>
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
            <span>Player & Subtitles</span>
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
            <span>Account Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'system'
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white/5 text-[#A1A1AA] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Cpu className="h-4 w-4" />
            <span>System & Danger Zone</span>
          </button>
        </div>
      </section>

      {/* 2. Content for Selected Tab */}

      {/* TAB 1: REMOTE ACCESS & ANDROID TV */}
      {activeTab === 'remote' && <RemoteAccessGuide port={3000} />}

      {/* TAB 2: PROFILE & PREFERENCES */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <section className="space-y-4 rounded-3xl border border-white/5 bg-[#0b0f19] p-6 sm:p-8">
            <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-white/5 pb-4">
              <User className="h-5 w-5 text-indigo-400" />
              <span>Cinema Profile Customization</span>
            </h2>

            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] uppercase">Profile Display Name</label>
                <div className="mt-1.5 flex items-center space-x-2">
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
                  Customized locally on this device.
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
          </section>
        </div>
      )}

      {/* TAB 3: MEDIA FOLDERS */}
      {activeTab === 'folders' && (
        <section className="space-y-4 rounded-3xl border border-white/5 bg-[#0b0f19] p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Folder className="h-5 w-5 text-indigo-400" />
                <span>Configured Media Folders</span>
              </h2>
              <p className="text-xs text-[#71717A]">
                Directories scanned for video files (.mp4, .webm, .mkv, .ts, etc.)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onCreateSampleMedia}
                disabled={isCreatingSample}
                className="flex items-center space-x-1.5 rounded-xl border border-white/10 bg-[#181B24] px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition-all"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>{isCreatingSample ? 'Generating...' : 'Add Demo Media'}</span>
              </button>

              <button
                onClick={onOpenAddFolder}
                className="flex items-center space-x-1.5 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400 transition-all active:scale-95"
              >
                <FolderPlus className="h-4 w-4" />
                <span>Add Folder</span>
              </button>
            </div>
          </div>

          {folders.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#71717A]">
              No media folders added yet. Click "Add Folder" or "Add Demo Media" to start.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm text-white">{folder.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          folder.enabled
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {folder.enabled ? 'ACTIVE' : 'DISABLED'}
                      </span>
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-[#A1A1AA]">
                        {folder.video_count} videos
                      </span>
                    </div>
                    <p className="break-all font-mono text-xs text-[#71717A]">{folder.path}</p>
                    {folder.last_scanned_at && (
                      <p className="text-[11px] text-[#71717A]">
                        Last scanned: {formatDate(folder.last_scanned_at)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => handleToggleFolderEnabled(folder)}
                      className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/5 transition-all"
                    >
                      {folder.enabled ? 'Disable' : 'Enable'}
                    </button>

                    <button
                      onClick={() => handleScanFolder(folder.id)}
                      disabled={scanningFolderId === folder.id}
                      className="flex items-center space-x-1 rounded-xl border border-white/10 bg-[#060b17] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition-all"
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${
                          scanningFolderId === folder.id ? 'animate-spin text-indigo-400' : ''
                        }`}
                      />
                      <span>{scanningFolderId === folder.id ? 'Scanning...' : 'Scan'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteFolder(folder)}
                      className="rounded-xl p-2 text-[#71717A] hover:bg-red-500/20 hover:text-red-400 transition-all"
                      title="Remove folder"
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

      {/* TAB 4: PLAYBACK & EXPERIENCE */}
      {activeTab === 'playback' && (
        <section className="space-y-4 rounded-3xl border border-white/5 bg-[#0b0f19] p-6 sm:p-8">
          <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-white/5 pb-4">
            <Sliders className="h-5 w-5 text-indigo-400" />
            <span>Playback Experience & Audio</span>
          </h2>

          <div className="divide-y divide-white/5 text-sm">
            <div className="flex items-center justify-between py-4">
              <div>
                <span className="font-semibold text-white">Autoplay Next Video</span>
                <p className="text-xs text-[#71717A]">
                  Automatically play the next video in the folder when the current one finishes
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

            <div className="flex items-center justify-between py-4">
              <div>
                <span className="font-semibold text-white">Auto-Resume Playback</span>
                <p className="text-xs text-[#71717A]">
                  Automatically resume videos where you previously stopped
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

            <div className="py-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white flex items-center space-x-2">
                  <Volume2 className="h-4 w-4 text-indigo-400" />
                  <span>Default Startup Volume</span>
                </span>
                <span className="font-mono text-xs text-indigo-300 font-bold">{defaultVolume}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={defaultVolume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </section>
      )}

      {/* TAB 5: SYSTEM & DANGER ZONE */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* Library Maintenance Actions */}
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
                    className="flex items-center space-x-2 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-400 disabled:opacity-50 transition-all"
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
                    className="flex items-center space-x-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition-all"
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

          {/* Hardware & Diagnostics */}
          {systemInfo && (
            <section className="space-y-4 rounded-3xl border border-white/5 bg-[#0b0f19] p-6 sm:p-8">
              <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-white/5 pb-4">
                <Cpu className="h-5 w-5 text-indigo-400" />
                <span>Local System Diagnostics</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4">
                  <span className="text-[11px] font-medium text-[#71717A] uppercase">Platform</span>
                  <p className="mt-0.5 text-sm font-bold text-white capitalize">{systemInfo.platform}</p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4">
                  <span className="text-[11px] font-medium text-[#71717A] uppercase">Node.js Runtime</span>
                  <p className="mt-0.5 text-sm font-bold text-white font-mono">{systemInfo.nodeVersion}</p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4">
                  <span className="text-[11px] font-medium text-[#71717A] uppercase">Free Memory</span>
                  <p className="mt-0.5 text-sm font-bold text-white">
                    {formatBytes(systemInfo.freeMemBytes)} / {formatBytes(systemInfo.totalMemBytes)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-[#060b17] p-4">
                  <span className="text-[11px] font-medium text-[#71717A] uppercase">Total Media Size</span>
                  <p className="mt-0.5 text-sm font-bold text-white">
                    {stats ? formatBytes(stats.totalStorageBytes) : '--'}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Danger Zone */}
          <section className="space-y-4 rounded-3xl border border-red-500/20 bg-red-950/10 p-6 sm:p-8">
            <h2 className="text-base font-bold text-red-300 flex items-center space-x-2 border-b border-red-500/20 pb-4">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <span>Reset Library Database</span>
            </h2>
            <p className="text-xs text-[#A1A1AA]">
              Clears all indexed videos, folders, playback watch progress, and favorites from the CineVault database.
              <strong> Does not delete any video files from your device.</strong>
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
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-40 transition-all"
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
    </div>
  );
};
