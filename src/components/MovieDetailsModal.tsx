import React, { useState } from 'react';
import {
  X,
  Play,
  Heart,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Folder,
  Calendar,
  FileVideo,
  HardDrive,
  Clock,
  Film,
  Youtube,
  Cloud,
  Globe
} from 'lucide-react';
import { motion } from 'motion/react';
import { Video } from '../types';
import { formatBytes, formatDuration, formatDate, getCinematicPalette } from '../utils/format';

interface MovieDetailsModalProps {
  video: Video;
  onClose: () => void;
  onPlay: (video: Video) => void;
  onToggleFavorite: (video: Video) => void;
  onUpdateProgress: (videoId: number, completed: boolean) => void;
  onDeleteVideo: (videoId: number) => void;
}

export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({
  video,
  onClose,
  onPlay,
  onToggleFavorite,
  onUpdateProgress,
  onDeleteVideo
}) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const palette = getCinematicPalette(video.title + video.filename);
  const isFavorite = video.is_favorite === 1;
  const isCompleted = video.completed === 1;
  
  const hasThumbnail = !!video.thumbnail_url;
  const isYoutube = video.source_type === 'youtube';
  const isDrive = video.source_type === 'gdrive';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.3 }}
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#060b17] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)]"
      >
        {/* Header Backdrop */}
        <div
          className="relative min-h-[220px] sm:min-h-[300px] w-full p-6 flex flex-col justify-between overflow-hidden"
        >
          {hasThumbnail ? (
            <div className="absolute inset-0">
               <img src={video.thumbnail_url!} alt="" className="w-full h-full object-cover opacity-50 mix-blend-screen scale-105" />
               <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D14] via-[#0B0D14]/70 to-[#0B0D14]/10" />
            </div>
          ) : (
            <div className="absolute inset-0 opacity-80" style={{
              background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.via} 60%, #0B0D14 100%)`
            }}>
               <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D14] to-transparent" />
            </div>
          )}

          {/* Close button */}
          <div className="relative z-10 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-full bg-black/50 p-2 text-white/80 backdrop-blur-md transition-colors hover:bg-black/80 hover:text-white"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Watermark & Badges */}
          <div className="relative z-10 flex items-end justify-between">
            <div>
              <span
                className="rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-widest backdrop-blur-md border border-white/10 shadow-sm"
                style={!hasThumbnail ? { backgroundColor: `${palette.accent}25`, color: palette.accent } : { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
              >
                {isYoutube ? 'YouTube' : isDrive ? 'Google Drive' : palette.genre}
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-xl font-['Outfit']">
                {video.title}
              </h2>
            </div>
            {!hasThumbnail && <Film className="h-16 w-16 opacity-15 text-white absolute -bottom-4 -right-4" />}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onPlay(video);
              }}
              className="flex items-center space-x-2.5 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-black shadow-[0_0_20px_-5px_rgba(255,255,255,0.4)] hover:bg-indigo-500 hover:text-white transition-transform active:scale-95 hover:shadow-[0_0_30px_rgba(99,102,241,0.6)]"
            >
              <Play className="h-5 w-5 fill-current" />
              <span>{video.position_seconds && video.position_seconds > 5 ? 'Resume Playback' : 'Play Now'}</span>
            </button>

            <button
              onClick={() => onToggleFavorite(video)}
              className={`flex items-center space-x-2.5 rounded-2xl border px-5 py-3.5 text-sm font-semibold transition-all ${
                isFavorite
                  ? 'bg-rose-500/20 text-rose-500 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
            </button>

            <button
              onClick={() => onUpdateProgress(video.id, !isCompleted)}
              className="flex items-center space-x-2.5 rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              {isCompleted ? (
                <>
                  <RotateCcw className="h-4 w-4 text-[#A1A1AA]" />
                  <span>Mark Unwatched</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
                  <span>Mark Watched</span>
                </>
              )}
            </button>
          </div>

          {/* Technical Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3.5 rounded-2xl border border-white/5 bg-white/5 p-4">
              <Folder className="h-5 w-5 text-[#A1A1AA]" />
              <div className="overflow-hidden">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">
                  Library Folder
                </span>
                <p className="truncate text-sm font-semibold text-white mt-0.5">{video.folder_name}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3.5 rounded-2xl border border-white/5 bg-white/5 p-4">
              {isYoutube ? <Youtube className="h-5 w-5 text-[#A1A1AA]" /> : isDrive ? <Cloud className="h-5 w-5 text-[#A1A1AA]" /> : <FileVideo className="h-5 w-5 text-[#A1A1AA]" />}
              <div className="overflow-hidden">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">
                  Format & Source
                </span>
                <p className="truncate text-sm font-semibold text-white mt-0.5">
                  {video.extension.replace('.', '').toUpperCase()} {isYoutube || isDrive ? '(Cloud)' : `(${video.mime_type})`}
                </p>
              </div>
            </div>

            {!isYoutube && (
              <div className="flex items-center space-x-3.5 rounded-2xl border border-white/5 bg-white/5 p-4">
                <HardDrive className="h-5 w-5 text-[#A1A1AA]" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">
                    File Size
                  </span>
                  <p className="text-sm font-semibold text-white mt-0.5">{formatBytes(video.size_bytes)}</p>
                </div>
              </div>
            )}

            <div className={`flex items-center space-x-3.5 rounded-2xl border border-white/5 bg-white/5 p-4 ${isYoutube ? 'sm:col-span-2' : ''}`}>
              <Clock className="h-5 w-5 text-[#A1A1AA]" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">
                  Duration
                </span>
                <p className="text-sm font-semibold text-white mt-0.5">{formatDuration(video.duration_seconds || 0)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3.5 rounded-2xl border border-white/5 bg-white/5 p-4 sm:col-span-2">
              <Calendar className="h-5 w-5 text-[#A1A1AA]" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">
                  Added to Vault
                </span>
                <p className="text-sm font-semibold text-white mt-0.5">{formatDate(video.created_at_db)}</p>
              </div>
            </div>
          </div>

          {/* Absolute File Path / URL Details */}
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] flex items-center gap-1.5">
              {isYoutube || isDrive ? <Globe className="w-3 h-3"/> : null}
              {isYoutube || isDrive ? 'Remote URL' : 'Local Storage Path'}
            </span>
            <p className="mt-2 break-all font-mono text-xs text-[#A1A1AA] bg-black/40 p-3 rounded-xl border border-white/5">
              {video.remote_url || video.absolute_path}
            </p>
          </div>

          {/* Remove from Library Safety Box */}
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
            {!showConfirmDelete ? (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-red-400">Remove from Library</h4>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    Removes entry from CineVault index.
                  </p>
                </div>
                <button
                  onClick={() => setShowConfirmDelete(true)}
                  className="flex items-center space-x-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Remove</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-400">Are you sure?</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      onDeleteVideo(video.id);
                      onClose();
                    }}
                    className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors"
                  >
                    Confirm Remove
                  </button>
                  <button
                    onClick={() => setShowConfirmDelete(false)}
                    className="rounded-xl bg-white/10 px-4 py-2 text-xs font-medium text-white hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
