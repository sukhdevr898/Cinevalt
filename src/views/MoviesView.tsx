import React, { useState, useMemo } from 'react';
import {
  LayoutGrid,
  List,
  SlidersHorizontal,
  ArrowUpDown,
  Play,
  Heart,
  Info,
  Clock,
  HardDrive,
  Folder
} from 'lucide-react';
import { Video, SortOption, FilterOption } from '../types';
import { MovieCard } from '../components/MovieCard';
import { formatBytes, formatDuration } from '../utils/format';

interface MoviesViewProps {
  videos: Video[];
  onPlay: (video: Video) => void;
  onOpenDetails: (video: Video) => void;
  onToggleFavorite: (video: Video, e?: React.MouseEvent) => void;
  initialFilter?: FilterOption;
}

export const MoviesView: React.FC<MoviesViewProps> = ({
  videos,
  onPlay,
  onOpenDetails,
  onToggleFavorite,
  initialFilter = 'all'
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<FilterOption>(initialFilter);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedExt, setSelectedExt] = useState<string>('all');

  // Unique folders & extensions
  const folders = useMemo(() => {
    return Array.from(new Set(videos.map((v) => v.folder_name)));
  }, [videos]);

  const extensions = useMemo(() => {
    return Array.from(new Set(videos.map((v) => v.extension.toLowerCase())));
  }, [videos]);

  // Filtering and sorting logic
  const filteredVideos = useMemo(() => {
    let result = [...videos];

    // Status filter
    if (filter === 'watched') {
      result = result.filter((v) => v.completed === 1);
    } else if (filter === 'unwatched') {
      result = result.filter((v) => !v.completed || v.completed === 0);
    } else if (filter === 'favorites') {
      result = result.filter((v) => v.is_favorite === 1);
    }

    // Folder filter
    if (selectedFolder !== 'all') {
      result = result.filter((v) => v.folder_name === selectedFolder);
    }

    // Extension filter
    if (selectedExt !== 'all') {
      result = result.filter((v) => v.extension.toLowerCase() === selectedExt);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'size':
          return b.size_bytes - a.size_bytes;
        case 'duration':
          return (b.duration_seconds || 0) - (a.duration_seconds || 0);
        case 'played':
          return (b.position_seconds || 0) - (a.position_seconds || 0);
        case 'recent':
        default:
          return new Date(b.created_at_db).getTime() - new Date(a.created_at_db).getTime();
      }
    });

    return result;
  }, [videos, filter, sortBy, selectedFolder, selectedExt]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Controls Bar */}
      <div className="flex flex-col gap-4 border-b border-white/5 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
            {filter === 'favorites' ? 'Favorite Movies' : 'Media Library'}
          </h1>
          <p className="mt-1 text-xs text-[#A1A1AA]">
            Showing {filteredVideos.length} of {videos.length} videos
          </p>
        </div>

        {/* View Toggle & Count */}
        <div className="flex items-center space-x-2 self-start md:self-auto">
          <div className="flex items-center rounded-2xl border border-white/10 bg-[#0f172a] p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-xl p-2 transition-colors ${
                viewMode === 'grid' ? 'bg-indigo-500 text-white shadow-lg' : 'text-[#71717A] hover:text-white'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-xl p-2 transition-colors ${
                viewMode === 'list' ? 'bg-indigo-500 text-white shadow-lg' : 'text-[#71717A] hover:text-white'
              }`}
              title="List View"
              aria-label="List View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center rounded-2xl border border-white/5 bg-[#0f172a] p-1 text-xs font-bold">
          {(['all', 'unwatched', 'watched', 'favorites'] as FilterOption[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`rounded-xl px-4 py-2 capitalize transition-all ${
                filter === opt ? 'bg-white/10 text-white shadow-sm' : 'text-[#71717A] hover:text-white hover:bg-white/5'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Folder Select Dropdown */}
        {folders.length > 1 && (
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#11131A] px-3 py-2 text-xs font-medium text-white focus:border-[#E50914] focus:outline-none"
          >
            <option value="all">All Folders</option>
            {folders.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        )}

        {/* Format Select Dropdown */}
        {extensions.length > 1 && (
          <select
            value={selectedExt}
            onChange={(e) => setSelectedExt(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#11131A] px-3 py-2 text-xs font-medium text-white focus:border-[#E50914] focus:outline-none"
          >
            <option value="all">All Formats</option>
            {extensions.map((ext) => (
              <option key={ext} value={ext}>
                {ext.toUpperCase().replace('.', '')}
              </option>
            ))}
          </select>
        )}

        {/* Sort Select */}
        <div className="ml-auto flex items-center space-x-2">
          <ArrowUpDown className="h-4 w-4 text-[#71717A]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-xl border border-white/10 bg-[#11131A] px-3 py-2 text-xs font-medium text-white focus:border-[#E50914] focus:outline-none"
          >
            <option value="recent">Recently Added</option>
            <option value="name">Title (A-Z)</option>
            <option value="size">File Size</option>
            <option value="duration">Duration</option>
            <option value="played">Last Played</option>
          </select>
        </div>
      </div>

      {/* Media Grid or List Display */}
      {filteredVideos.length === 0 ? (
        <div className="rounded-3xl border border-white/5 bg-[#0f172a] p-12 text-center shadow-lg">
          <p className="text-sm font-semibold text-[#A1A1AA]">No videos matched your filter criteria.</p>
          <button
            onClick={() => {
              setFilter('all');
              setSelectedFolder('all');
              setSelectedExt('all');
            }}
            className="mt-3 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Reset all filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredVideos.map((video, i) => (
            <MovieCard
              key={video.id}
              video={video}
              index={i}
              onPlay={onPlay}
              onOpenDetails={onOpenDetails}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      ) : (
        /* List View */
        <div className="divide-y divide-white/5 rounded-3xl border border-white/5 bg-[#0f172a] shadow-lg overflow-hidden">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="flex items-center justify-between p-3 sm:p-4 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                <button
                  onClick={() => onPlay(video)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-black shadow-lg hover:scale-105 hover:bg-indigo-500 hover:text-white active:scale-95 transition-all"
                  aria-label={`Play ${video.title}`}
                >
                  <Play className="h-5 w-5 fill-current translate-x-0.5" />
                </button>

                <div className="min-w-0 flex-1">
                  <h3
                    onClick={() => onOpenDetails(video)}
                    className="truncate text-sm font-bold text-white hover:text-indigo-400 cursor-pointer transition-colors"
                  >
                    {video.title}
                  </h3>
                  <div className="mt-0.5 flex items-center space-x-3 text-xs text-[#71717A]">
                    <span className="flex items-center space-x-1">
                      <Folder className="h-3 w-3" />
                      <span>{video.folder_name}</span>
                    </span>
                    <span>•</span>
                    <span className="uppercase font-semibold">{video.extension.replace('.', '')}</span>
                    <span>•</span>
                    <span>{formatBytes(video.size_bytes)}</span>
                    {video.duration_seconds && (
                      <>
                        <span>•</span>
                        <span>{formatDuration(video.duration_seconds)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pl-3">
                <button
                  onClick={() => onToggleFavorite(video)}
                  className={`rounded-lg p-2 transition-colors ${
                    video.is_favorite ? 'text-[#E50914]' : 'text-[#71717A] hover:text-white'
                  }`}
                  aria-label="Toggle Favorite"
                >
                  <Heart className={`h-4 w-4 ${video.is_favorite ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={() => onOpenDetails(video)}
                  className="rounded-lg p-2 text-[#71717A] hover:text-white"
                  aria-label="Details"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
