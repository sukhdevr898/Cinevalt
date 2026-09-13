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
  Film
} from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Modal Card */}
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#11131A] shadow-2xl">
        {/* Header Backdrop */}
        <div
          className="relative min-h-[180px] sm:min-h-[220px] w-full p-6 flex flex-col justify-between"
          style={{
            background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.via} 60%, #11131A 100%)`
          }}
        >
          {/* Close button */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-full bg-black/50 p-2 text-white/80 backdrop-blur-md transition-colors hover:bg-black/80 hover:text-white"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Watermark & Badges */}
          <div className="flex items-end justify-between">
            <div>
              <span
                className="rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider"
                style={{ backgroundColor: `${palette.accent}25`, color: palette.accent }}
              >
                {palette.genre}
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white drop-shadow-md">
                {video.title}
              </h2>
            </div>
            <Film className="h-16 w-16 opacity-15 text-white" />
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
              className="flex items-center space-x-2 rounded-xl bg-[#E50914] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#E50914]/30 hover:bg-[#F6121D] transition-transform active:scale-95"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>{video.position_seconds && video.position_seconds > 5 ? 'Resume Playback' : 'Play Now'}</span>
            </button>

            <button
              onClick={() => onToggleFavorite(video)}
              className={`flex items-center space-x-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold transition-colors ${
                isFavorite
                  ? 'bg-[#E50914]/20 text-[#E50914] border-[#E50914]/40'
                  : 'bg-[#181B24] text-white hover:bg-white/10'
              }`}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
            </button>

            <button
              onClick={() => onUpdateProgress(video.id, !isCompleted)}
              className="flex items-center space-x-2 rounded-xl border border-white/10 bg-[#181B24] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex items-center space-x-3 rounded-xl border border-white/5 bg-[#181B24] p-3.5">
              <Folder className="h-5 w-5 text-[#A1A1AA]" />
              <div className="overflow-hidden">
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#71717A]">
                  Library Folder
                </span>
                <p className="truncate text-sm font-semibold text-white">{video.folder_name}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 rounded-xl border border-white/5 bg-[#181B24] p-3.5">
              <FileVideo className="h-5 w-5 text-[#A1A1AA]" />
              <div className="overflow-hidden">
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#71717A]">
                  Format & Container
                </span>
                <p className="truncate text-sm font-semibold text-white">
                  {video.extension.replace('.', '').toUpperCase()} ({video.mime_type})
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 rounded-xl border border-white/5 bg-[#181B24] p-3.5">
              <HardDrive className="h-5 w-5 text-[#A1A1AA]" />
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#71717A]">
                  File Size
                </span>
                <p className="text-sm font-semibold text-white">{formatBytes(video.size_bytes)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 rounded-xl border border-white/5 bg-[#181B24] p-3.5">
              <Clock className="h-5 w-5 text-[#A1A1AA]" />
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#71717A]">
                  Duration
                </span>
                <p className="text-sm font-semibold text-white">{formatDuration(video.duration_seconds)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 rounded-xl border border-white/5 bg-[#181B24] p-3.5 sm:col-span-2">
              <Calendar className="h-5 w-5 text-[#A1A1AA]" />
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#71717A]">
                  File Modified
                </span>
                <p className="text-sm font-semibold text-white">{formatDate(video.modified_at)}</p>
              </div>
            </div>
          </div>

          {/* Absolute File Path Details */}
          <div className="rounded-xl border border-white/5 bg-[#181B24] p-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#71717A]">
              Local Storage Path
            </span>
            <p className="mt-1 break-all font-mono text-xs text-[#A1A1AA] bg-black/30 p-2 rounded-lg">
              {video.absolute_path}
            </p>
          </div>

          {/* Remove from Library Safety Box */}
          <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-4">
            {!showConfirmDelete ? (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-red-200">Remove from Library</h4>
                  <p className="text-[11px] text-[#A1A1AA]">
                    Removes entry from CineVault index. Physical video file remains on disk.
                  </p>
                </div>
                <button
                  onClick={() => setShowConfirmDelete(true)}
                  className="flex items-center space-x-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-red-300">Are you sure?</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      onDeleteVideo(video.id);
                      onClose();
                    }}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                  >
                    Confirm Remove
                  </button>
                  <button
                    onClick={() => setShowConfirmDelete(false)}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
