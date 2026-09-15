import React, { useState, useMemo, useEffect } from 'react';
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
  Folder,
  Search,
  Shuffle,
  Sparkles,
  Film,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
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

const ITEMS_PER_PAGE = 20;

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
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const isFavoritesMode = filter === 'favorites' || initialFilter === 'favorites';

  // Ensure only video formats are processed in the library
  const videoOnlyList = useMemo(() => {
    const validVideoExts = new Set([
      '.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v', '.mkv',
      '.avi', '.3gp', '.ts', '.mpeg', '.mpg', '.wmv', '.flv',
      '.youtube', '.gdrive'
    ]);
    const nonVideoExts = new Set([
      '.srt', '.vtt', '.sub', '.idx', '.ass', '.ssa',
      '.txt', '.nfo', '.pdf', '.doc', '.docx', '.rtf', '.log', '.md',
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico',
      '.mp3', '.wav', '.flac', '.aac', '.m4a', '.wma', '.opus',
      '.zip', '.rar', '.7z', '.tar', '.gz', '.iso', '.exe',
      '.json', '.xml', '.html', '.htm', '.css', '.js', '.ts'
    ]);
    return videos.filter((v) => {
      const ext = (v.extension || '').toLowerCase();
      if (nonVideoExts.has(ext)) return false;
      if (ext && !validVideoExts.has(ext)) return false;
      const mime = (v.mime_type || '').toLowerCase();
      if (mime && !mime.startsWith('video/')) return false;
      return true;
    });
  }, [videos]);

  // Unique folders & extensions from video files only
  const folders = useMemo(() => {
    return Array.from(new Set(videoOnlyList.map((v) => v.folder_name)));
  }, [videoOnlyList]);

  const extensions = useMemo(() => {
    return Array.from(new Set(videoOnlyList.map((v) => v.extension.toLowerCase())));
  }, [videoOnlyList]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, sortBy, selectedFolder, selectedExt, searchQuery]);

  // Filtering and sorting logic
  const filteredVideos = useMemo(() => {
    let result = [...videoOnlyList];

    // Status filter
    if (filter === 'watched') {
      result = result.filter((v) => v.completed === 1);
    } else if (filter === 'unwatched') {
      result = result.filter((v) => !v.completed || v.completed === 0);
    } else if (filter === 'favorites') {
      result = result.filter((v) => v.is_favorite === 1);
    }

    // In-page search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.filename.toLowerCase().includes(q) ||
          v.folder_name.toLowerCase().includes(q)
      );
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
  }, [videoOnlyList, filter, sortBy, selectedFolder, selectedExt, searchQuery]);

  // Total duration of filtered videos
  const totalDuration = useMemo(() => {
    return filteredVideos.reduce((acc, v) => acc + (v.duration_seconds || 0), 0);
  }, [filteredVideos]);

  // Shuffle & play
  const handleShufflePlay = () => {
    if (filteredVideos.length === 0) return;
    const randomIndex = Math.floor(Math.random() * filteredVideos.length);
    onPlay(filteredVideos[randomIndex]);
  };

  // Pagination calculations (20 items per page)
  const totalItems = filteredVideos.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedVideos = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredVideos.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredVideos, safeCurrentPage]);

  const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(safeCurrentPage * ITEMS_PER_PAGE, totalItems);

  const handlePageChange = (newPage: number) => {
    const targetPage = Math.min(Math.max(1, newPage), totalPages);
    setCurrentPage(targetPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (safeCurrentPage > 3) {
      pages.push('...');
    }
    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(totalPages - 1, safeCurrentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (safeCurrentPage < totalPages - 2) {
      pages.push('...');
    }
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="space-y-6 pb-16">
      {/* If Favorites Mode: Showcase Header Banner */}
      {isFavoritesMode && (
        <div className="relative overflow-hidden rounded-3xl border border-rose-500/20 bg-gradient-to-r from-rose-950/40 via-[#0f172a] to-[#030712] p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-300">
                <Heart className="h-3.5 w-3.5 fill-current text-rose-400" />
                <span>Curated Favorites Vault</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-['Outfit']">
                Your Cinema Hall of Fame
              </h1>
              <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-xl">
                Every title you’ve bookmarked for quick replays, cinema nights, and offline viewing.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-[#A1A1AA]">
                <span className="font-semibold text-white">{filteredVideos.length} Titles</span>
                <span>•</span>
                <span>{formatDuration(totalDuration)} Runtime</span>
              </div>
            </div>

            {filteredVideos.length > 0 && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onPlay(filteredVideos[0])}
                  className="flex items-center space-x-2 rounded-2xl bg-rose-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-rose-500/30 hover:bg-rose-600 active:scale-95 transition-all"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Play First</span>
                </button>

                <button
                  onClick={handleShufflePlay}
                  className="flex items-center space-x-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-white hover:bg-white/10 active:scale-95 transition-all"
                  title="Shuffle Play"
                >
                  <Shuffle className="h-4 w-4" />
                  <span>Shuffle</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Standard Header & Toolbar Bar */}
      {!isFavoritesMode && (
        <div className="flex flex-col gap-4 border-b border-white/5 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
                Media Library
              </h1>
              <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300">
                20 per page
              </span>
            </div>
            <p className="mt-1 text-xs text-[#A1A1AA]">
              {filteredVideos.length} {filteredVideos.length === 1 ? 'title' : 'titles'} indexed across all folders
              {totalPages > 1 && ` • Page ${safeCurrentPage} of ${totalPages}`}
            </p>
          </div>

          {/* View Toggle */}
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
      )}

      {/* Filter and Search Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Quick Search In Library */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#71717A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter library..."
            className="w-full rounded-xl border border-white/10 bg-[#0f172a] py-2 pl-9 pr-3 text-xs text-white placeholder-[#71717A] focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center rounded-2xl border border-white/5 bg-[#0f172a] p-1 text-xs font-bold">
          {(['all', 'unwatched', 'watched', 'favorites'] as FilterOption[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`rounded-xl px-3.5 py-1.5 capitalize transition-all ${
                filter === opt
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-[#71717A] hover:text-white hover:bg-white/5'
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
            className="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 text-xs font-medium text-white focus:border-indigo-500 focus:outline-none"
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
            className="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 text-xs font-medium text-white focus:border-indigo-500 focus:outline-none"
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
          <ArrowUpDown className="h-3.5 w-3.5 text-[#71717A]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 text-xs font-medium text-white focus:border-indigo-500 focus:outline-none"
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
          {isFavoritesMode ? (
            <>
              <Heart className="mx-auto h-10 w-10 text-[#71717A]" />
              <h3 className="mt-3 text-base font-bold text-white">No Favorite Movies Yet</h3>
              <p className="mt-1 text-xs text-[#A1A1AA] max-w-sm mx-auto">
                Click the heart icon on any movie poster to add it to your private favorites collection.
              </p>
            </>
          ) : (
            <>
              <Film className="mx-auto h-10 w-10 text-[#71717A]" />
              <h3 className="mt-3 text-base font-bold text-white">No Media Matched</h3>
              <p className="mt-1 text-xs text-[#A1A1AA]">
                No videos match your active filter or search keywords.
              </p>
              <button
                onClick={() => {
                  setFilter('all');
                  setSelectedFolder('all');
                  setSelectedExt('all');
                  setSearchQuery('');
                }}
                className="mt-3 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Reset all filters
              </button>
            </>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {paginatedVideos.map((video, i) => (
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
          {paginatedVideos.map((video) => (
            <div
              key={video.id}
              className="flex items-center justify-between p-3 sm:p-4 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                <button
                  onClick={() => onPlay(video)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-black shadow-lg hover:scale-105 hover:bg-indigo-500 hover:text-white active:scale-95 transition-all"
                  aria-label={`Play ${video.title}`}
                >
                  <Play className="h-4 w-4 fill-current translate-x-0.5" />
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
                    <span className="uppercase font-semibold text-zinc-400">{video.extension.replace('.', '')}</span>
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
                    video.is_favorite ? 'text-rose-500' : 'text-[#71717A] hover:text-white'
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

      {/* Pagination Controls (20 items per page) */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0f172a] px-5 py-3.5 shadow-lg">
          <div className="text-xs text-[#A1A1AA]">
            Showing <span className="font-bold text-white">{startIndex}–{endIndex}</span> of{' '}
            <span className="font-bold text-white">{totalItems}</span> videos
            {totalPages > 1 && (
              <span className="ml-2 rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-indigo-300">
                Page {safeCurrentPage} of {totalPages}
              </span>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center space-x-1 sm:space-x-1.5">
              {/* First page button */}
              {totalPages > 4 && (
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={safeCurrentPage === 1}
                  className="rounded-xl p-2 text-xs font-semibold text-[#A1A1AA] hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                  aria-label="First page"
                  title="First page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
              )}

              {/* Previous page button */}
              <button
                onClick={() => handlePageChange(safeCurrentPage - 1)}
                disabled={safeCurrentPage === 1}
                className="flex items-center space-x-1 rounded-xl border border-white/5 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Previous</span>
              </button>

              {/* Dynamic Page numbers */}
              {getPageNumbers().map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-xs text-[#71717A]">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p as number)}
                    className={`h-8 min-w-[32px] rounded-xl px-2 text-xs font-bold transition-all ${
                      safeCurrentPage === p
                        ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                        : 'text-[#A1A1AA] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              {/* Next page button */}
              <button
                onClick={() => handlePageChange(safeCurrentPage + 1)}
                disabled={safeCurrentPage === totalPages}
                className="flex items-center space-x-1 rounded-xl border border-white/5 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                aria-label="Next page"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              {/* Last page button */}
              {totalPages > 4 && (
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="rounded-xl p-2 text-xs font-semibold text-[#A1A1AA] hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                  aria-label="Last page"
                  title="Last page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
