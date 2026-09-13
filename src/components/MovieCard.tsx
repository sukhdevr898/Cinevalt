import React from 'react';
import { Play, Info, Heart, CheckCircle2, Film } from 'lucide-react';
import { Video } from '../types';
import { formatBytes, formatDuration, getCinematicPalette } from '../utils/format';

interface MovieCardProps {
  video: Video;
  onPlay: (video: Video) => void;
  onOpenDetails: (video: Video) => void;
  onToggleFavorite: (video: Video, e: React.MouseEvent) => void;
  density?: 'comfortable' | 'compact';
}

export const MovieCard: React.FC<MovieCardProps> = ({
  video,
  onPlay,
  onOpenDetails,
  onToggleFavorite,
  density = 'comfortable'
}) => {
  const palette = getCinematicPalette(video.title + video.filename);
  const watchedPercent =
    video.position_seconds && video.duration_seconds && video.duration_seconds > 0
      ? Math.min(100, Math.round((video.position_seconds / video.duration_seconds) * 100))
      : 0;

  const isCompleted = video.completed === 1;
  const isFavorite = video.is_favorite === 1;

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-xl border border-white/5 bg-[#11131A] transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-xl hover:shadow-black/60 focus-within:ring-2 focus-within:ring-[#E50914]"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onPlay(video);
      }}
    >
      {/* Poster Canvas (2:3 aspect ratio) */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#181B24]">
        {/* Custom Cinematic Visual Canvas */}
        <div
          className="absolute inset-0 flex flex-col justify-between p-4 transition-transform duration-500 group-hover:scale-105"
          style={{
            background: `linear-gradient(145deg, ${palette.from} 0%, ${palette.via} 50%, ${palette.to} 100%)`
          }}
        >
          {/* Top badges */}
          <div className="flex items-center justify-between">
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm"
              style={{
                backgroundColor: `${palette.accent}20`,
                color: palette.accent
              }}
            >
              {palette.genre}
            </span>

            <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white/90 uppercase tracking-wider backdrop-blur-sm">
              {video.extension.replace('.', '')}
            </span>
          </div>

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

        {/* Hover / Focus Dark Overlay & Play Button */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            onClick={() => onPlay(video)}
            className="flex h-13 w-13 items-center justify-center rounded-full bg-[#E50914] text-white shadow-xl shadow-[#E50914]/40 transition-transform duration-200 hover:scale-110 active:scale-95"
            aria-label={`Play ${video.title}`}
          >
            <Play className="h-6 w-6 fill-current translate-x-0.5" />
          </button>

          <div className="absolute top-2 right-2 flex space-x-1.5">
            <button
              onClick={(e) => onToggleFavorite(video, e)}
              className={`rounded-full p-2 backdrop-blur-md transition-colors ${
                isFavorite
                  ? 'bg-[#E50914] text-white'
                  : 'bg-black/60 text-white/80 hover:bg-black/90 hover:text-white'
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
              className="rounded-full bg-black/60 p-2 text-white/80 backdrop-blur-md transition-colors hover:bg-black/90 hover:text-white"
              title="Movie Details"
              aria-label="Movie Details"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Watched / Progress Indicators */}
        {isCompleted ? (
          <div className="absolute top-2 left-2 flex items-center space-x-1 rounded bg-[#22C55E]/90 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <CheckCircle2 className="h-3 w-3" />
            <span>Watched</span>
          </div>
        ) : watchedPercent > 0 ? (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-[#E50914] transition-all"
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
            {video.folder_name} • {video.extension.replace('.', '').toUpperCase()}
          </p>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-[#A1A1AA]">
          <span>{formatDuration(video.duration_seconds)}</span>
          <button
            onClick={() => onPlay(video)}
            className="text-xs font-semibold text-[#E50914] hover:underline"
          >
            {watchedPercent > 0 && !isCompleted ? 'Resume' : 'Play'}
          </button>
        </div>
      </div>
    </div>
  );
};
