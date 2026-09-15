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
import { useVideoThumbnail } from '../utils/thumbnailExtractor';

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
  
  const { thumbnail: autoThumbnail } = useVideoThumbnail(video);
  const activeThumbnail = video.thumbnail_url || autoThumbnail;
  const hasThumbnail = !!activeThumbnail;
  const isYoutube = video.source_type === 'youtube';
  const isDrive = video.source_type === 'gdrive';
  const isHttp = video.source_type === 'http';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      {/* Dynamic Ambient Fullscreen Backdrop (Blurred, low-opacity movie thumbnail) */}
      <div className="absolute inset-0 -z-10 overflow-hidden bg-[#030712]/90 backdrop-blur-md">
        {hasThumbnail ? (
          <>
            <img
              src={activeThumbnail!}
              alt=""
              className="absolute inset-0 h-full w-full object-cover blur-3xl scale-125 opacity-25 brightness-75 transition-opacity duration-700 pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/80 to-[#030712]/60 pointer-events-none" />
          </>
        ) : (
          <div
            className="absolute inset-0 opacity-20 blur-3xl pointer-events-none"
            style={{
              background: `radial-gradient(circle at center, ${palette.accent} 0%, transparent 70%)`
            }}
          />
        )}
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 14 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/15 bg-[#060b17]/95 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
      >
        {/* Modal-Internal Dynamic Backdrop Layer */}
        {hasThumbnail && (
          <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
            <img
              src={activeThumbnail!}
              alt=""
              className="h-full w-full object-cover blur-2xl scale-110 opacity-15 brightness-90 transition-opacity duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#060b17]/85 to-[#060b17]" />
          </div>
        )}

        {/* Header Hero Backdrop */}
        <div
          className="relative min-h-[220px] sm:min-h-[300px] w-full p-6 sm:p-8 flex flex-col justify-between overflow-hidden border-b border-white/10"
        >
          {hasThumbnail ? (
            <div className="absolute inset-0 -z-10">
              <img
                src={activeThumbnail!}
                alt=""
                className="w-full h-full object-cover opacity-60 scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060b17] via-[#060b17]/60 to-black/40" />
            </div>
          ) : (
            <div
              className="absolute inset-0 opacity-80 -z-10"
              style={{
                background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.via} 60%, #060b17 100%)`
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#060b17] to-transparent" />
            </div>
          )}

          {/* Close button */}
          <div className="relative z-10 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-full bg-black/60 p-2.5 text-white/80 backdrop-blur-xl border border-white/10 transition-all hover:bg-black/90 hover:text-white hover:scale-105 active:scale-95"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Watermark & Badges & Title */}
          <div className="relative z-10 flex items-end justify-between gap-4">
            <div className="max-w-xl">
              <div className="flex items-center space-x-2">
                <span
                  className="rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-widest backdrop-blur-md border border-white/10 shadow-sm"
                  style={!hasThumbnail ? { backgroundColor: `${palette.accent}25`, color: palette.accent } : { backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }}
                >
                  {isYoutube ? 'YouTube' : isDrive ? 'Google Drive' : palette.genre}
                </span>
                <span className="rounded-lg bg-black/50 px-2.5 py-1 text-xs font-semibold text-white/90 uppercase tracking-wider backdrop-blur-md border border-white/10">
                  {video.extension.replace('.', '')}
                </span>
              </div>
              <h2 className="mt-3 text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-white drop-shadow-xl font-['Outfit'] break-words leading-snug">
                {video.title}
              </h2>
            </div>
            {!hasThumbnail && <Film className="h-20 w-20 opacity-15 text-white shrink-0 hidden sm:block" />}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
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
              {isYoutube ? <Youtube className="h-5 w-5 text-[#A1A1AA]" /> : isDrive ? <Cloud className="h-5 w-5 text-[#A1A1AA]" /> : isHttp ? <Globe className="h-5 w-5 text-indigo-400" /> : <FileVideo className="h-5 w-5 text-[#A1A1AA]" />}
              <div className="overflow-hidden">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">
                  Format & Source
                </span>
                <p className="truncate text-sm font-semibold text-white mt-0.5">
                  {video.extension.replace('.', '').toUpperCase()} {isYoutube ? '(YouTube)' : isDrive ? '(Google Drive)' : isHttp ? '(Remote Web Index)' : `(${video.mime_type})`}
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
