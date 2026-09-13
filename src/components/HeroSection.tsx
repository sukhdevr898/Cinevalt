import React from 'react';
import { Play, Info, Heart, Film, Folder, Youtube, Cloud } from 'lucide-react';
import { motion } from 'motion/react';
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
  
  const hasThumbnail = !!video.thumbnail_url;
  const isYoutube = video.source_type === 'youtube';
  const isDrive = video.source_type === 'gdrive';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#060b17] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]"
    >
      {/* Background Graphic Canvas or Thumbnail */}
      {hasThumbnail ? (
        <div className="absolute inset-0">
          <img src={video.thumbnail_url!} alt="" className="w-full h-full object-cover opacity-60 mix-blend-screen scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/80 to-[#030712]/30" />
        </div>
      ) : (
        <div
          className="absolute inset-0 transition-all duration-700 opacity-80"
          style={{
            background: `radial-gradient(circle at 75% 30%, ${palette.from} 0%, ${palette.via} 50%, #030712 100%)`
          }}
        >
          {/* Subtle Decorative Film Geometry */}
          <div className="absolute top-8 right-12 opacity-15">
            <Film className="h-64 w-64 md:h-96 md:w-96 text-white mix-blend-overlay" />
          </div>
        </div>
      )}

      {/* Cinematic Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/40 to-transparent md:bg-gradient-to-r md:from-[#030712] md:via-[#030712]/60 md:to-transparent" />

      {/* Content Container */}
      <div className="relative z-10 flex min-h-[420px] md:min-h-[500px] flex-col justify-end p-8 sm:p-12 md:w-3/4 lg:w-2/3">
        {/* Meta badges */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-4 flex flex-wrap items-center gap-2"
        >
          <span
            className="rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md shadow-sm border border-white/5"
            style={{
              backgroundColor: `${palette.accent}15`,
              color: palette.accent
            }}
          >
            {isYoutube ? 'YouTube' : isDrive ? 'Google Drive' : palette.genre}
          </span>

          <span className="flex items-center space-x-1.5 rounded-lg border border-white/5 bg-white/5 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
            {isYoutube ? <Youtube className="h-3.5 w-3.5 text-[#ff0000]" /> : isDrive ? <Cloud className="h-3.5 w-3.5 text-[#0F9D58]" /> : <Folder className="h-3.5 w-3.5 text-[#A1A1AA]" />}
            <span>{video.folder_name}</span>
          </span>

          <span className="rounded-lg border border-white/5 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-white/90 uppercase tracking-widest backdrop-blur-md">
            {isYoutube ? 'WEB' : isDrive ? 'DRIVE' : video.extension.replace('.', '')}
          </span>

          {video.duration_seconds && video.duration_seconds > 0 && (
            <span className="text-xs font-medium text-[#A1A1AA]">
              {formatDuration(video.duration_seconds)}
            </span>
          )}

          {!isYoutube && video.size_bytes > 0 && (
            <span className="text-xs font-medium text-[#71717A]">
              • {formatBytes(video.size_bytes)}
            </span>
          )}
        </motion.div>

        {/* Hero Title */}
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white font-['Outfit'] drop-shadow-2xl"
        >
          {video.title}
        </motion.h1>

        {/* File & Location Subtitle */}
        {!isYoutube && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-4 line-clamp-2 text-sm text-[#A1A1AA] max-w-xl"
          >
            Source: <code className="font-mono text-xs text-white/70 bg-white/5 px-1.5 py-0.5 rounded ml-1 border border-white/10">{video.filename}</code>
          </motion.p>
        )}

        {/* Actions Row */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <button
            onClick={() => onPlay(video)}
            className="flex items-center space-x-2.5 rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-black shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)] transition-all hover:bg-indigo-500 hover:text-white hover:shadow-[0_0_40px_-5px_rgba(99,102,241,0.5)] active:scale-95"
          >
            <Play className="h-5 w-5 fill-current" />
            <span>{isContinue ? 'Resume Playback' : 'Play Movie'}</span>
          </button>

          <button
            onClick={() => onOpenDetails(video)}
            className="flex items-center space-x-2.5 rounded-2xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-xl transition-all hover:bg-white/10 hover:border-white/30 active:scale-95"
          >
            <Info className="h-4 w-4" />
            <span>More Info</span>
          </button>

          <button
            onClick={() => onToggleFavorite(video)}
            className={`rounded-2xl border p-3.5 backdrop-blur-xl transition-all active:scale-95 ${
              isFavorite
                ? 'bg-rose-500/90 text-white border-rose-500 shadow-[0_0_20px_-5px_rgba(244,63,94,0.5)]'
                : 'bg-white/5 text-white/80 border-white/20 hover:bg-white/10 hover:border-white/30 hover:text-white'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-label="Toggle Favorite"
          >
            <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
};
