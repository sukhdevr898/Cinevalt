import React from 'react';
import { Play, Info, Heart, Film, Folder } from 'lucide-react';
import { Video } from '../types';
import { formatBytes, formatDuration, getCinematicPalette } from '../utils/format';

interface HeroSectionProps {
  video: Video | null;
  onPlay: (video: Video) => void;
  onOpenDetails: (video: Video) => void;
  onToggleFavorite: (video: Video) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  video,
  onPlay,
  onOpenDetails,
  onToggleFavorite
}) => {
  if (!video) return null;

  const palette = getCinematicPalette(video.title + video.filename);
  const isFavorite = video.is_favorite === 1;
  const isContinue = video.position_seconds && video.position_seconds > 5 && !video.completed;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#11131A] shadow-2xl">
      {/* Background Graphic Canvas */}
      <div
        className="absolute inset-0 transition-all duration-700"
        style={{
          background: `radial-gradient(circle at 75% 30%, ${palette.from} 0%, ${palette.via} 50%, #08090D 100%)`
        }}
      >
        {/* Subtle Decorative Film Geometry */}
        <div className="absolute top-8 right-12 opacity-15">
          <Film className="h-64 w-64 md:h-96 md:w-96 text-white" />
        </div>
      </div>

      {/* Cinematic Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#08090D] via-transparent to-transparent md:bg-gradient-to-r md:from-[#08090D] md:via-[#08090D]/80 md:to-transparent" />

      {/* Content Container */}
      <div className="relative z-10 flex min-h-[360px] md:min-h-[460px] flex-col justify-end p-6 sm:p-10 md:w-3/4 lg:w-2/3">
        {/* Meta badges */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className="rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-sm"
            style={{
              backgroundColor: `${palette.accent}25`,
              color: palette.accent
            }}
          >
            {palette.genre}
          </span>

          <span className="flex items-center space-x-1 rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <Folder className="h-3.5 w-3.5 text-[#A1A1AA]" />
            <span>{video.folder_name}</span>
          </span>

          <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-white/90 uppercase tracking-wider">
            {video.extension.replace('.', '')}
          </span>

          {video.duration_seconds && video.duration_seconds > 0 && (
            <span className="text-xs text-[#A1A1AA]">
              {formatDuration(video.duration_seconds)}
            </span>
          )}

          <span className="text-xs text-[#71717A]">
            • {formatBytes(video.size_bytes)}
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white font-['Manrope'] drop-shadow-md">
          {video.title}
        </h1>

        {/* File & Location Subtitle */}
        <p className="mt-2 line-clamp-2 text-sm text-[#A1A1AA] max-w-xl">
          Original file: <code className="font-mono text-xs text-white/70">{video.filename}</code>
        </p>

        {/* Actions Row */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => onPlay(video)}
            className="flex items-center space-x-2 rounded-xl bg-[#E50914] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#E50914]/40 transition-all hover:bg-[#F6121D] hover:scale-105 active:scale-95"
          >
            <Play className="h-5 w-5 fill-current" />
            <span>{isContinue ? 'Resume Playback' : 'Play Video'}</span>
          </button>

          <button
            onClick={() => onOpenDetails(video)}
            className="flex items-center space-x-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
          >
            <Info className="h-4 w-4" />
            <span>Details</span>
          </button>

          <button
            onClick={() => onToggleFavorite(video)}
            className={`rounded-xl border border-white/15 p-3 backdrop-blur-md transition-all active:scale-95 ${
              isFavorite
                ? 'bg-[#E50914] text-white border-[#E50914]'
                : 'bg-white/5 text-white hover:bg-white/15'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-label="Toggle Favorite"
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
