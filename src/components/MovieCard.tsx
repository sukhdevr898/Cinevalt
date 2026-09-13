import React from 'react';
import { Play, Info, Heart, CheckCircle2, Film, Youtube, Cloud } from 'lucide-react';
import { motion } from 'motion/react';
import { Video } from '../types';
import { formatBytes, formatDuration, getCinematicPalette } from '../utils/format';

interface MovieCardProps {
  video: Video;
  onPlay: (video: Video) => void;
  onOpenDetails: (video: Video) => void;
  onToggleFavorite: (video: Video, e: React.MouseEvent) => void;
  density?: 'comfortable' | 'compact';
  index?: number;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  video,
  onPlay,
  onOpenDetails,
  onToggleFavorite,
  density = 'comfortable',
  index = 0
}) => {
  const palette = getCinematicPalette(video.title + video.filename);
  const watchedPercent =
    video.position_seconds && video.duration_seconds && video.duration_seconds > 0
      ? Math.min(100, Math.round((video.position_seconds / video.duration_seconds) * 100))
      : 0;

  const isCompleted = video.completed === 1;
  const isFavorite = video.is_favorite === 1;
  
  const hasThumbnail = !!video.thumbnail_url;
  const isYoutube = video.source_type === 'youtube';
  const isDrive = video.source_type === 'gdrive';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.4), ease: [0.25, 0.1, 0.25, 1.0] }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#0b0f19] transition-all duration-300 hover:-translate-y-2 hover:border-white/10 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] hover:shadow-indigo-500/10 focus-within:ring-2 focus-within:ring-indigo-500"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onPlay(video);
      }}
    >
      {/* Poster Canvas (2:3 aspect ratio) */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0a0d14]">
        {hasThumbnail ? (
          <img 
            src={video.thumbnail_url!} 
            alt={video.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          /* Custom Cinematic Visual Canvas */
          <div
            className="absolute inset-0 flex flex-col justify-between p-4 transition-transform duration-500 group-hover:scale-105"
            style={{
              background: `linear-gradient(145deg, ${palette.from} 0%, ${palette.via} 50%, ${palette.to} 100%)`
            }}
          >
            {/* Top badges (empty spacer here as real badges are moved outside for both cases) */}
            <div className="flex items-center justify-between"></div>

            {/* Center Graphic Watermark / Film Reel */}
            <div className="flex flex-1 items-center justify-center opacity-20 transition-opacity group-hover:opacity-30">
              <Film className="h-16 w-16" style={{ color: palette.accent }} />
            </div>

            {/* Bottom Card Title Banner on Poster */}
            <div className="relative z-10">
              <h4 className="line-clamp-2 text-sm font-bold leading-tight text-white drop-shadow-md">
                {video.title}
              </h4>
              <div className="mt-1 flex items-center justify-between text-[11px] text-white/70">
                <span>{video.folder_name}</span>
                <span>{formatBytes(video.size_bytes)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Unified Top badges for both views */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 z-10 bg-gradient-to-b from-black/60 to-transparent">
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm border border-white/10"
            style={!hasThumbnail ? {
              backgroundColor: `${palette.accent}20`,
              color: palette.accent
            } : {
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'white'
            }}
          >
            {isYoutube ? 'YT' : isDrive ? 'GD' : palette.genre}
          </span>

          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white/90 uppercase tracking-wider backdrop-blur-sm flex items-center space-x-1 border border-white/10">
            {isYoutube ? <Youtube className="h-3 w-3 text-red-500" /> : isDrive ? <Cloud className="h-3 w-3 text-green-500" /> : null}
            <span>{isYoutube ? 'WEB' : isDrive ? 'DRV' : video.extension.replace('.', '')}</span>
          </span>
        </div>

        {/* Hover / Focus Dark Overlay & Play Button */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 backdrop-blur-[4px] transition-all duration-300 group-hover:opacity-100 group-focus-within:opacity-100 z-20">
          <button
            onClick={() => onPlay(video)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-2xl transition-transform duration-300 hover:scale-110 hover:bg-indigo-500 hover:text-white active:scale-95"
            aria-label={`Play ${video.title}`}
          >
            <Play className="h-6 w-6 fill-current translate-x-0.5" />
          </button>

          <div className="absolute top-3 right-3 flex space-x-2">
            <button
              onClick={(e) => onToggleFavorite(video, e)}
              className={`rounded-full p-2 backdrop-blur-md transition-all duration-300 hover:scale-110 ${
                isFavorite
                  ? 'bg-rose-500/90 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                  : 'bg-black/50 text-white/80 hover:bg-black/80 hover:text-white border border-white/10'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-label="Toggle Favorite"
            >
              <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(video);
              }}
              className="rounded-full bg-black/50 p-2 text-white/80 backdrop-blur-md border border-white/10 transition-all duration-300 hover:scale-110 hover:bg-black/80 hover:text-white"
              title="Movie Details"
              aria-label="Movie Details"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Watched / Progress Indicators */}
        {isCompleted ? (
          <div className="absolute bottom-2 left-2 z-10 flex items-center space-x-1.5 rounded-md bg-[#22C55E]/90 px-2 py-1 text-[10px] font-bold tracking-wide text-white backdrop-blur-md shadow-lg border border-[#22C55E]/20">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>WATCHED</span>
          </div>
        ) : watchedPercent > 0 ? (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-10">
            <div
              className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] transition-all"
              style={{ width: `${watchedPercent}%` }}
            />
          </div>
        ) : null}
      </div>

      {/* Card Info Below Poster */}
      <div className={`flex flex-1 flex-col justify-between ${density === 'compact' ? 'p-2.5' : 'p-3'}`}>
        <div>
          <h3
            onClick={() => onOpenDetails(video)}
            className="cursor-pointer truncate text-sm font-semibold text-[#F8FAFC] transition-colors hover:text-[#E50914]"
            title={video.title}
          >
            {video.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-[#71717A]">
            {video.folder_name} • {(video.source_type || 'local').toUpperCase()}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] font-semibold tracking-wide text-[#A1A1AA]">
          <span>{formatDuration(video.duration_seconds || 0)}</span>
          <button
            onClick={() => onPlay(video)}
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {watchedPercent > 0 && !isCompleted ? 'Resume' : 'Play'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
