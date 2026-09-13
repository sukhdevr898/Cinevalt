import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, X, Film, Sparkles } from 'lucide-react';
import { Video } from '../types';
import { MovieCard } from '../components/MovieCard';
import { api } from '../services/api';

interface SearchViewProps {
  onPlay: (video: Video) => void;
  onOpenDetails: (video: Video) => void;
  onToggleFavorite: (video: Video, e?: React.MouseEvent) => void;
}

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
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="space-y-6 pb-16">
      {/* Search Header Bar */}
      <div className="relative mx-auto max-w-3xl">
        <div className="relative flex items-center">
          <SearchIcon className="absolute left-4 h-5 w-5 text-[#71717A]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies by title, original filename, folder, or format..."
            className="w-full rounded-2xl border border-white/10 bg-[#11131A] py-4 pl-12 pr-12 text-base sm:text-lg text-white placeholder-[#71717A] shadow-xl focus:border-[#E50914] focus:outline-none focus:ring-2 focus:ring-[#E50914]/20"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 rounded-lg p-1 text-[#71717A] hover:text-white"
              aria-label="Clear Search"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Results Header */}
      {hasSearched && (
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
            {results.length} {results.length === 1 ? 'movie' : 'movies'} found for "{query}"
          </p>
          {isSearching && (
            <div className="flex items-center space-x-2 text-xs text-[#E50914]">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#E50914] border-t-transparent" />
              <span>Searching...</span>
            </div>
          )}
        </div>
      )}

      {/* Results or Initial Prompt */}
      {!hasSearched && !query ? (
        <div className="py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#11131A] text-[#71717A]">
            <SearchIcon className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-base font-bold text-white">Search Your Local Library</h3>
          <p className="mt-1 text-xs text-[#71717A]">
            Find titles, clean release names, specific video extensions, and folders.
          </p>
        </div>
      ) : results.length === 0 && hasSearched ? (
        <div className="rounded-2xl border border-white/5 bg-[#11131A] p-12 text-center">
          <Film className="mx-auto h-10 w-10 text-[#71717A]" />
          <h3 className="mt-3 text-base font-bold text-white">No Movies Found</h3>
          <p className="mt-1 text-xs text-[#71717A]">
            We couldn't find any media matching "{query}". Try checking for typos or searching by extension like .mp4.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {results.map((video) => (
            <MovieCard
              key={video.id}
              video={video}
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
