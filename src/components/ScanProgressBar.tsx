import React, { useState } from 'react';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Globe,
  Youtube,
  Cloud,
  ChevronDown,
  ChevronUp,
  X,
  FileVideo,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScanProgress } from '../types';

interface ScanProgressBarProps {
  progress: ScanProgress | null;
  onDismissCompleted?: () => void;
}

export const ScanProgressBar: React.FC<ScanProgressBarProps> = ({ progress, onDismissCompleted }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!progress) return null;

  const {
    isScanning,
    status,
    progressPercent = 0,
    message,
    folderName,
    folderType,
    filesChecked,
    videosFound,
    newVideos,
    updatedVideos,
    elapsedSeconds,
    currentFile
  } = progress;

  // Show if actively scanning OR completed/error with message
  if (!isScanning && status !== 'completed' && status !== 'error') {
    return null;
  }

  const getSourceIcon = () => {
    switch (folderType) {
      case 'youtube':
        return <Youtube className="h-4 w-4 text-red-400" />;
      case 'gdrive':
        return <Cloud className="h-4 w-4 text-blue-400" />;
      case 'http':
        return <Globe className="h-4 w-4 text-emerald-400" />;
      default:
        return <HardDrive className="h-4 w-4 text-indigo-400" />;
    }
  };

  const clampedPercent = Math.min(100, Math.max(0, Math.round(progressPercent)));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="w-full mb-4 px-2 sm:px-0"
      >
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-[#0E121E]/95 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] transition-all">
          {/* Top subtle progress glow */}
          <div
            className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-300 ease-out"
            style={{ width: `${clampedPercent}%` }}
          />

          <div className="p-3.5 sm:p-4">
            {/* Header row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                  {isScanning ? (
                    <>
                      {getSourceIcon()}
                      <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                      </span>
                    </>
                  ) : status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white truncate font-['Outfit']">
                      {folderName || 'Library Media Source'}
                    </span>
                    {isScanning && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mr-1.5 animate-pulse" />
                        Working in background
                      </span>
                    )}
                    {status === 'completed' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Fetch Completed
                      </span>
                    )}
                    {status === 'error' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                        Scan Alert
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#94A3B8] truncate mt-0.5">
                    {message || (isScanning ? 'Fetching videos in background...' : 'Ready')}
                  </p>
                </div>
              </div>

              {/* Right status & controls */}
              <div className="flex items-center space-x-2 shrink-0">
                {isScanning && (
                  <div className="text-right mr-1">
                    <span className="text-sm font-extrabold text-indigo-300 font-mono">
                      {clampedPercent}%
                    </span>
                    {elapsedSeconds !== undefined && elapsedSeconds > 0 && (
                      <div className="text-[10px] text-[#64748B] flex items-center justify-end space-x-1">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{elapsedSeconds}s</span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="rounded-lg p-1.5 text-[#64748B] hover:text-white hover:bg-white/5 transition-colors"
                  title={isCollapsed ? 'Expand details' : 'Collapse bar'}
                  aria-label={isCollapsed ? 'Expand progress details' : 'Collapse progress details'}
                >
                  {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>

                {onDismissCompleted && !isScanning && (
                  <button
                    type="button"
                    onClick={onDismissCompleted}
                    className="rounded-lg p-1.5 text-[#64748B] hover:text-white hover:bg-white/5 transition-colors"
                    title="Dismiss"
                    aria-label="Dismiss message"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar & Details */}
            {!isCollapsed && (
              <div className="mt-3 space-y-2.5">
                {/* Visual Progress Track */}
                <div className="relative w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      status === 'error'
                        ? 'bg-red-500'
                        : status === 'completed'
                        ? 'bg-emerald-500'
                        : 'bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-400'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${clampedPercent}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>

                {/* Status Badges & Counters */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px] text-[#94A3B8]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.04] text-white/90 border border-white/[0.06]">
                      <FileVideo className="h-3 w-3 text-indigo-400 mr-1.5" />
                      {videosFound} videos discovered
                    </span>
                    {newVideos > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                        +{newVideos} new
                      </span>
                    )}
                    {updatedVideos > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                        {updatedVideos} updated
                      </span>
                    )}
                    {filesChecked > 0 && (
                      <span className="text-[#64748B] hidden sm:inline">
                        ({filesChecked} files/pages checked)
                      </span>
                    )}
                  </div>

                  {currentFile && (
                    <div className="text-[11px] text-[#64748B] truncate max-w-xs text-right hidden md:block">
                      <span className="text-[#475569] mr-1">Current:</span>
                      <span className="text-[#94A3B8] font-mono">{currentFile}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
