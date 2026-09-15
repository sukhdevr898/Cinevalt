import React, { useState, useEffect } from 'react';
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
  Clock,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScanProgress } from '../types';

interface ScanProgressBarProps {
  progress: ScanProgress | null;
  onDismissCompleted?: () => void;
}

export const ScanProgressBar: React.FC<ScanProgressBarProps> = ({ progress, onDismissCompleted }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isFinished = progress?.status === 'completed' || progress?.status === 'error';

  useEffect(() => {
    if (isFinished && onDismissCompleted) {
      const timer = setTimeout(() => {
        onDismissCompleted();
      }, 6000); // Auto hide after 6 seconds
      return () => clearTimeout(timer);
    }
  }, [isFinished, onDismissCompleted]);

  const shouldShow = progress && (progress.isScanning || progress.status === 'completed' || progress.status === 'error');

  const getSourceIcon = (folderType?: string) => {
    switch (folderType) {
      case 'youtube': return <Youtube className="h-4 w-4" />;
      case 'gdrive': return <Cloud className="h-4 w-4" />;
      case 'http': return <Globe className="h-4 w-4" />;
      default: return <HardDrive className="h-4 w-4" />;
    }
  };

  const clampedPercent = Math.min(100, Math.max(0, Math.round(progress?.progressPercent || 0)));

  return (
    <AnimatePresence>
      {shouldShow && progress && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95, filter: 'blur(10px)' }}
          className="fixed top-24 left-0 right-0 z-[60] flex justify-center pointer-events-none px-4"
        >
          <div className="pointer-events-auto flex flex-col items-center max-w-2xl w-full">
            {/* Dynamic Island Container */}
            <motion.div
              layout
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              className={`
                relative overflow-hidden rounded-[2rem] 
                border border-white/10 bg-black/60 backdrop-blur-2xl 
                shadow-[0_8px_32px_rgba(0,0,0,0.8)] 
                ring-1 ring-white/5 w-full
                ${isFinished ? 'ring-emerald-500/30' : 'ring-indigo-500/30'}
              `}
            >
              {/* Glowing orb behind the content */}
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-30 mix-blend-screen blur-[64px] pointer-events-none transition-all duration-1000 ${isFinished ? 'bg-emerald-600' : 'bg-indigo-600'}`} />

              {/* Content Container */}
              <div className="relative p-2 flex flex-col w-full">
                
                {/* Header row / Collapsed View */}
                <div className="flex items-center justify-between gap-4 px-2 sm:px-4 py-1.5">
                  
                  {/* Left Side: Icon & Title */}
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`
                      relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[1.25rem] 
                      border shadow-inner
                      ${progress.isScanning ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 
                        progress.status === 'completed' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 
                        'bg-red-500/20 border-red-500/30 text-red-400'}
                    `}>
                      {progress.isScanning ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                        >
                          <Loader2 className="h-5 w-5" />
                        </motion.div>
                      ) : progress.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <AlertCircle className="h-5 w-5" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-white truncate font-['Outfit']">
                          {progress.folderName || 'System Scanner'}
                        </span>
                        {progress.isScanning && (
                          <span className="inline-flex items-center space-x-1.5 rounded-full bg-indigo-500/10 px-2 py-0.5 border border-indigo-500/20">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-indigo-300 tracking-wider uppercase">Active</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#94A3B8] truncate w-[200px] sm:w-auto">
                        {progress.message || (progress.isScanning ? 'Scanning media files...' : 'Scan complete.')}
                      </span>
                    </div>
                  </div>

                  {/* Right Side: Percent & Controls */}
                  <div className="flex items-center space-x-3 shrink-0">
                    {progress.isScanning && (
                      <div className="flex flex-col items-end justify-center mr-2">
                        <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 font-mono tracking-tighter">
                          {clampedPercent}%
                        </span>
                        {progress.elapsedSeconds !== undefined && progress.elapsedSeconds > 0 && (
                          <div className="text-[10px] text-[#64748B] flex items-center font-mono">
                            <Clock className="h-3 w-3 mr-1" />
                            {progress.elapsedSeconds}s
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => setIsCollapsed(!isCollapsed)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white transition-all active:scale-90 border border-white/5"
                    >
                      {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </button>

                    {onDismissCompleted && !progress.isScanning && (
                      <button
                        onClick={onDismissCompleted}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-[#94A3B8] hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all active:scale-90 border border-white/5"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details Area */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-2 sm:px-4 pb-2 pt-3">
                        
                        {/* Animated Progress Bar */}
                        <div className="relative w-full h-2 bg-black/40 rounded-full overflow-hidden mb-4 border border-white/5 shadow-inner">
                          <motion.div
                            className={`absolute top-0 left-0 h-full rounded-full ${
                              progress.status === 'error' ? 'bg-red-500' :
                              progress.status === 'completed' ? 'bg-emerald-500' :
                              'bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500 bg-[length:200%_100%]'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ 
                              width: `${clampedPercent}%`,
                              backgroundPosition: progress.isScanning ? ['100% 0%', '-100% 0%'] : '0% 0%'
                            }}
                            transition={{ 
                              width: { duration: 0.3, ease: "easeOut" },
                              backgroundPosition: { duration: 2, repeat: Infinity, ease: "linear" }
                            }}
                          />
                        </div>

                        {/* Badges row */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">
                            <FileVideo className="h-3.5 w-3.5 text-indigo-400" />
                            <span className="text-white font-medium">{progress.videosFound || 0}</span>
                            <span className="text-[#64748B]">total</span>
                          </div>
                          
                          {(progress.newVideos || 0) > 0 && (
                            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold">
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>+{progress.newVideos} new</span>
                            </div>
                          )}

                          {(progress.updatedVideos || 0) > 0 && (
                            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-bold">
                              <span>{progress.updatedVideos} updated</span>
                            </div>
                          )}

                          {(progress.filesChecked || 0) > 0 && (
                            <div className="px-2.5 py-1 text-[#64748B] font-mono">
                              {(progress.filesChecked || 0).toLocaleString()} files scanned
                            </div>
                          )}
                        </div>

                        {progress.currentFile && (
                          <div className="mt-3 text-[10px] text-[#475569] font-mono truncate border-t border-white/5 pt-2">
                            <span className="uppercase tracking-widest text-indigo-500/50 mr-2">Target:</span>
                            <span className="text-[#94A3B8]">{progress.currentFile}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
