import React, { useState, useEffect } from 'react';
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
  Play,
  RotateCcw,
  Sliders
} from 'lucide-react';
import { Folder as FolderType, SystemInfo, LibraryStats, ScanResult } from '../types';
import { api } from '../services/api';
import { formatBytes, formatDate } from '../utils/format';

interface SettingsViewProps {
  folders: FolderType[];
  onRefreshFolders: () => void;
  onOpenAddFolder: () => void;
  onCreateSampleMedia: () => void;
  isCreatingSample: boolean;
  systemInfo: SystemInfo | null;
  stats: LibraryStats | null;
  onLibraryScanned: (result: ScanResult) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  folders,
  onRefreshFolders,
  onOpenAddFolder,
  onCreateSampleMedia,
  isCreatingSample,
  systemInfo,
  stats,
  onLibraryScanned
}) => {
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
    <div className="mx-auto max-w-5xl space-y-10 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Manrope']">
          Settings & Media Management
        </h1>
        <p className="mt-1 text-xs text-[#A1A1AA]">
          Configure local media folders, scanner behavior, playback preferences, and hardware stats
        </p>
      </div>

      {/* 1. Media Folders Section */}
      <section className="space-y-4 rounded-2xl border border-white/5 bg-[#11131A] p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Folder className="h-5 w-5 text-[#E50914]" />
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
              className="flex items-center space-x-1.5 rounded-xl border border-white/10 bg-[#181B24] px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>{isCreatingSample ? 'Generating...' : 'Add Demo Media'}</span>
            </button>

            <button
              onClick={onOpenAddFolder}
              className="flex items-center space-x-1.5 rounded-xl bg-[#E50914] px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-[#E50914]/30 hover:bg-[#F6121D]"
            >
              <FolderPlus className="h-4 w-4" />
              <span>Add Folder</span>
            </button>
          </div>
        </div>

        {folders.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#71717A]">
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
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        folder.enabled
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {folder.enabled ? 'ACTIVE' : 'DISABLED'}
                    </span>
                    <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-[#A1A1AA]">
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
                    className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/5"
                  >
                    {folder.enabled ? 'Disable' : 'Enable'}
                  </button>

                  <button
                    onClick={() => handleScanFolder(folder.id)}
                    disabled={scanningFolderId === folder.id}
                    className="flex items-center space-x-1 rounded-lg border border-white/10 bg-[#181B24] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${
                        scanningFolderId === folder.id ? 'animate-spin text-[#E50914]' : ''
                      }`}
                    />
                    <span>{scanningFolderId === folder.id ? 'Scanning...' : 'Scan'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteFolder(folder)}
                    className="rounded-lg p-1.5 text-[#71717A] hover:bg-red-500/20 hover:text-red-400"
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

      {/* 2. Library Maintenance Actions */}
      <section className="space-y-4 rounded-2xl border border-white/5 bg-[#11131A] p-6">
        <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-white/5 pb-4">
          <HardDrive className="h-5 w-5 text-[#E50914]" />
          <span>Library Maintenance & Indexing</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/5 bg-[#181B24] p-4 flex flex-col justify-between">
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
                className="flex items-center space-x-2 rounded-xl bg-[#E50914] px-4 py-2 text-xs font-bold text-white hover:bg-[#F6121D] disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isScanningAll ? 'animate-spin' : ''}`} />
                <span>{isScanningAll ? 'Scanning Library...' : 'Scan All Folders'}</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-[#181B24] p-4 flex flex-col justify-between">
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
                className="flex items-center space-x-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${isCleaningUp ? 'animate-spin' : ''}`} />
                <span>{isCleaningUp ? 'Cleaning...' : 'Run Cleanup'}</span>
              </button>
            </div>
          </div>
        </div>

        {cleanupMessage && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-emerald-300">
            {cleanupMessage}
          </div>
        )}
      </section>

      {/* 3. Playback & Experience Preferences */}
      <section className="space-y-4 rounded-2xl border border-white/5 bg-[#11131A] p-6">
        <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-white/5 pb-4">
          <Sliders className="h-5 w-5 text-[#E50914]" />
          <span>Playback Experience</span>
        </h2>

        <div className="divide-y divide-white/5 text-sm">
          <div className="flex items-center justify-between py-3">
            <div>
              <span className="font-semibold text-white">Autoplay Next Video</span>
              <p className="text-xs text-[#71717A]">
                Automatically play the next video in the folder when the current one finishes
              </p>
            </div>
            <button
              onClick={handleAutoplayToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoplayNext ? 'bg-[#E50914]' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoplayNext ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <span className="font-semibold text-white">Auto-Resume Playback</span>
              <p className="text-xs text-[#71717A]">
                Automatically resume videos where you previously stopped
              </p>
            </div>
            <button
              onClick={handleAutoResumeToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoResume ? 'bg-[#E50914]' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoResume ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* 4. System & Hardware Metrics */}
      {systemInfo && (
        <section className="space-y-4 rounded-2xl border border-white/5 bg-[#11131A] p-6">
          <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-white/5 pb-4">
            <Cpu className="h-5 w-5 text-[#E50914]" />
            <span>Local System Diagnostics</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-white/5 bg-[#181B24] p-3.5">
              <span className="text-[11px] font-medium text-[#71717A] uppercase">Platform</span>
              <p className="mt-0.5 text-sm font-bold text-white capitalize">{systemInfo.platform}</p>
            </div>

            <div className="rounded-xl border border-white/5 bg-[#181B24] p-3.5">
              <span className="text-[11px] font-medium text-[#71717A] uppercase">Node.js Runtime</span>
              <p className="mt-0.5 text-sm font-bold text-white font-mono">{systemInfo.nodeVersion}</p>
            </div>

            <div className="rounded-xl border border-white/5 bg-[#181B24] p-3.5">
              <span className="text-[11px] font-medium text-[#71717A] uppercase">Free Memory</span>
              <p className="mt-0.5 text-sm font-bold text-white">
                {formatBytes(systemInfo.freeMemBytes)} / {formatBytes(systemInfo.totalMemBytes)}
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-[#181B24] p-3.5">
              <span className="text-[11px] font-medium text-[#71717A] uppercase">Total Media Size</span>
              <p className="mt-0.5 text-sm font-bold text-white">
                {stats ? formatBytes(stats.totalStorageBytes) : '--'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 5. Android Termux Guide */}
      <section className="space-y-4 rounded-2xl border border-white/5 bg-[#11131A] p-6">
        <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-white/5 pb-4">
          <Smartphone className="h-5 w-5 text-[#E50914]" />
          <span>Android / Termux Self-Hosting Guide</span>
        </h2>
        <div className="space-y-3 text-xs text-[#A1A1AA] leading-relaxed">
          <p>
            CineVault is fully compatible with Android via <strong>Termux</strong>. You can run CineVault directly on your phone and play movies stored on your SD card or internal storage:
          </p>
          <div className="space-y-2 rounded-xl border border-white/5 bg-[#181B24] p-4 font-mono text-xs text-white/90">
            <p className="text-[#71717A]"># 1. Allow Termux to read your Android device storage:</p>
            <p className="text-emerald-400">termux-setup-storage</p>

            <p className="pt-2 text-[#71717A]"># 2. Typical folder paths to register in CineVault:</p>
            <p className="text-amber-300">/storage/emulated/0/Movies</p>
            <p className="text-amber-300">/storage/emulated/0/Download</p>
            <p className="text-amber-300">/storage/emulated/0/DCIM</p>
          </div>
        </div>
      </section>

      {/* 6. Danger Zone */}
      <section className="space-y-4 rounded-2xl border border-red-500/20 bg-red-950/10 p-6">
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
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-40"
          >
            {isResetting ? 'Resetting...' : 'Reset CineVault Database'}
          </button>
        </div>

        {resetMessage && (
          <p className="text-xs text-red-300 mt-2">{resetMessage}</p>
        )}
      </section>
    </div>
  );
};
