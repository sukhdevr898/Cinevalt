import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, X, Film, Sparkles, Filter, Heart, Clock, CheckCircle } from 'lucide-react';
import { Video } from '../types';
import { MovieCard } from '../components/MovieCard';
import { api } from '../services/api';

interface SearchViewProps {
  onPlay: (video: Video) => void;
  onOpenDetails: (video: Video) => void;
  onToggleFavorite: (video: Video, e?: React.MouseEvent) => void;
}

const QUICK_TAGS = [
  { label: 'Favorites', query: 'favorite' },
  { label: 'Unwatched', query: 'unwatched' },
  { label: 'MP4 Videos', query: '.mp4' },
  { label: 'MKV Movies', query: '.mkv' },
  { label: 'Action', query: 'action' },
  { label: 'Trailer', query: 'trailer' },
  { label: 'Sample', query: 'sample' },
];

export const SearchView: React.FC<SearchViewProps> = ({
  onPlay,
  onOpenDetails,
  onToggleFavorite
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Video[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.search(query.trim());
        setResults(res.videos);
        setHasSearched(true);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="space-y-8 pb-16">
      {/* Search Header Hero Bar */}
      <div className="relative mx-auto max-w-3xl space-y-4 text-center">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
            Search Local Cinema Library
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA]">
            Instant lookup across video titles, folder names, release tags, and file extensions
          </p>
        </div>

        {/* Input Bar */}
        <div className="relative flex items-center">
          <SearchIcon className="absolute left-4 h-5 w-5 text-indigo-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by movie name, folder, .mp4, .mkv..."
            className="w-full rounded-2xl border border-white/10 bg-[#0f172a] py-4 pl-12 pr-12 text-sm sm:text-base text-white placeholder-[#71717A] shadow-2xl focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 rounded-xl p-1.5 text-[#71717A] hover:bg-white/10 hover:text-white transition-all"
              aria-label="Clear Search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick Discovery Tag Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] mr-1 flex items-center space-x-1">
            <Filter className="h-3 w-3" />
            <span>Tags:</span>
          </span>
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag.label}
              onClick={() => setQuery(tag.query)}
              className={`rounded-xl border px-3 py-1 text-xs font-semibold transition-all ${
                query.toLowerCase() === tag.query.toLowerCase()
                  ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
                  : 'border-white/10 bg-[#0f172a] text-[#A1A1AA] hover:border-white/20 hover:text-white'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Meta Header */}
      {hasSearched && (
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
            {results.length} {results.length === 1 ? 'title' : 'titles'} found for "{query}"
          </p>
          {isSearching && (
            <div className="flex items-center space-x-2 text-xs text-indigo-400">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
              <span>Searching vault...</span>
            </div>
          )}
        </div>
      )}

      {/* Results or Initial Prompt */}
      {!hasSearched && !query ? (
        <div className="py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <SearchIcon className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-base font-bold text-white font-['Outfit']">Ready to Search</h3>
          <p className="mt-1 text-xs text-[#71717A] max-w-sm mx-auto">
            Type any keyword above or click a tag chip like <strong>.mp4</strong> or <strong>Favorites</strong> to discover titles.
          </p>
        </div>
      ) : results.length === 0 && hasSearched ? (
        <div className="rounded-3xl border border-white/5 bg-[#0f172a] p-12 text-center">
          <Film className="mx-auto h-10 w-10 text-[#71717A]" />
          <h3 className="mt-3 text-base font-bold text-white font-['Outfit']">No Matching Titles</h3>
          <p className="mt-1 text-xs text-[#71717A] max-w-md mx-auto">
            We couldn't find any indexed media matching "{query}". Check spelling, or try searching by extension like <code>.mp4</code>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {results.map((video, i) => (
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
      )}
    </div>
  );
};
