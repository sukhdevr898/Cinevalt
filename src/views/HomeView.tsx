import React from 'react';
import {
  Film,
  Play,
  Sparkles,
  FolderPlus,
  Clock,
  Heart,
  Folder,
  Tv,
  ArrowRight,
  ShieldCheck,
  Flame
} from 'lucide-react';
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
  onNavigateToRemote?: () => void;
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
  isCreatingSample,
  onNavigateToRemote
}) => {
  // Featured hero video: either first in progress, or latest video
  const heroVideo = continueWatching[0] || favorites[0] || videos[0] || null;

  // Recently added
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
          CineVault streams videos directly from your local hard drive, Termux, or phone storage.
          Add a folder containing movies, or generate sample media to explore the OTT player.
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

      {/* Android TV & Remote Access Quick Callout Card */}
      {onNavigateToRemote && (
        <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-[#0b0f19] to-[#030712] p-4 sm:p-5 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Tv className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Stream on Android TV or Other Devices</span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    NEW GUIDE
                  </span>
                </h3>
                <p className="text-xs text-[#A1A1AA]">
                  Bypass TV browser "Site Not Secure" & blank page errors using Cloudflare Tunnel or local port forwarding.
                </p>
              </div>
            </div>

            <button
              onClick={onNavigateToRemote}
              className="flex items-center space-x-1.5 self-start sm:self-auto rounded-xl bg-indigo-500/20 border border-indigo-500/40 px-4 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-500 hover:text-white transition-all group"
            >
              <span>View Remote Guide</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* Continue Watching Section */}
      {continueWatching.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <Clock className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white font-['Outfit']">
                Continue Watching
              </h2>
            </div>
            <span className="text-xs text-[#71717A] font-medium">
              {continueWatching.length} in progress
            </span>
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

      {/* Favorites Showcase Rail */}
      {favorites.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
                <Heart className="h-4 w-4 fill-current" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white font-['Outfit']">
                Your Favorites
              </h2>
            </div>
            <span className="text-xs text-rose-400 font-semibold">
              {favorites.length} saved
            </span>
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
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white font-['Outfit']">
              Recently Added
            </h2>
          </div>
          <span className="text-xs text-[#71717A] font-medium">
            {videos.length} total titles
          </span>
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
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-[#A1A1AA]">
              <Folder className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white font-['Outfit']">
              {folderName}
            </h2>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-[#A1A1AA] font-mono">
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
