import React from 'react';
import { Film, Play, Sparkles, FolderPlus, Clock, Heart, Folder } from 'lucide-react';
import { Video } from '../types';
import { HeroSection } from '../components/HeroSection';
import { MovieCard } from '../components/MovieCard';

interface HomeViewProps {
  videos: Video[];
  continueWatching: Video[];
  favorites: Video[];
  onPlay: (video: Video) => void;
  onOpenDetails: (video: Video) => void;
  onToggleFavorite: (video: Video, e?: React.MouseEvent) => void;
  onOpenAddFolder: () => void;
  onCreateSampleMedia: () => void;
  isCreatingSample: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  videos,
  continueWatching,
  favorites,
  onPlay,
  onOpenDetails,
  onToggleFavorite,
  onOpenAddFolder,
  onCreateSampleMedia,
  isCreatingSample
}) => {
  // Select featured hero video: either first in progress, or latest video
  const heroVideo = continueWatching[0] || videos[0] || null;

  // Recently added (top 12)
  const recentlyAdded = videos.slice(0, 12);

  // Group videos by folder
  const folderMap = new Map<string, Video[]>();
  videos.forEach((v) => {
    const list = folderMap.get(v.folder_name) || [];
    list.push(v);
    folderMap.set(v.folder_name, list);
  });

  if (videos.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-500/15 text-indigo-400 shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] border border-indigo-500/20">
          <Film className="h-10 w-10" />
        </div>
        <h2 className="mt-8 text-3xl sm:text-4xl font-extrabold text-white font-['Outfit'] tracking-tight">
          Your Cinema is Waiting
        </h2>
        <p className="mt-3 text-sm sm:text-base text-[#A1A1AA] leading-relaxed">
          CineVault streams videos directly from your local hard drive or phone storage.
          Add a folder containing movies, or generate sample media to explore the OTT interface right now.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onOpenAddFolder}
            className="flex items-center space-x-2 rounded-2xl bg-indigo-500 px-7 py-3.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:bg-indigo-400 hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] active:scale-95 transition-all"
          >
            <FolderPlus className="h-4 w-4" />
            <span>Add Local Folder</span>
          </button>

          <button
            onClick={onCreateSampleMedia}
            disabled={isCreatingSample}
            className="flex items-center space-x-2 rounded-2xl border border-white/10 bg-[#0f172a] px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>{isCreatingSample ? 'Preparing Sample Media...' : 'Load Demo Videos'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      {/* Featured Hero Banner */}
      {heroVideo && (
        <HeroSection
          video={heroVideo}
          onPlay={onPlay}
          onOpenDetails={onOpenDetails}
          onToggleFavorite={(v) => onToggleFavorite(v)}
        />
      )}

      {/* Continue Watching Section */}
      {continueWatching.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center space-x-2.5">
            <Clock className="h-5 w-5 text-indigo-400" />
            <h2 className="text-xl font-bold tracking-tight text-white font-['Outfit']">
              Continue Watching
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {continueWatching.map((v, i) => (
              <MovieCard
                key={v.id}
                video={v}
                index={i}
                onPlay={onPlay}
                onOpenDetails={onOpenDetails}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      {/* Favorites Section */}
      {favorites.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center space-x-2.5">
            <Heart className="h-5 w-5 text-rose-500 fill-current" />
            <h2 className="text-xl font-bold tracking-tight text-white font-['Outfit']">
              Favorite Movies
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {favorites.map((v, i) => (
              <MovieCard
                key={v.id}
                video={v}
                index={i}
                onPlay={onPlay}
                onOpenDetails={onOpenDetails}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recently Added Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight text-white font-['Outfit']">
              Recently Added
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {recentlyAdded.map((v, i) => (
            <MovieCard
              key={v.id}
              video={v}
              index={i}
              onPlay={onPlay}
              onOpenDetails={onOpenDetails}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      </section>

      {/* Grouped Folder Collections */}
      {Array.from(folderMap.entries()).map(([folderName, folderVideos]) => (
        <section key={folderName} className="space-y-4">
          <div className="flex items-center space-x-2.5">
            <Folder className="h-5 w-5 text-[#A1A1AA]" />
            <h2 className="text-xl font-bold tracking-tight text-white font-['Outfit']">
              {folderName}
            </h2>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-[#A1A1AA]">
              {folderVideos.length}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {folderVideos.slice(0, 12).map((v, i) => (
              <MovieCard
                key={v.id}
                video={v}
                index={i}
                onPlay={onPlay}
                onOpenDetails={onOpenDetails}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
