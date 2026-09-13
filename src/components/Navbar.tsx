import React from 'react';
import { Film, Home, Clapperboard, Heart, Search, Settings, Plus, RefreshCw } from 'lucide-react';
import { ViewType, LibraryStats } from '../types';

interface NavbarProps {
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
  onOpenAddFolder: () => void;
  onScanLibrary: () => void;
  isScanning: boolean;
  stats: LibraryStats | null;
  appName?: string;
  tagline?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  onOpenAddFolder,
  onScanLibrary,
  isScanning,
  stats,
  appName = 'CineVault',
  tagline = 'Your Personal Cinema'
}) => {
  return (
    <>
      {/* Desktop & Tablet Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#08090D]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-8">
            <button
              onClick={() => onSelectView('home')}
              className="flex items-center space-x-3 text-left group focus:outline-none"
              aria-label="CineVault Home"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E50914] shadow-lg shadow-[#E50914]/20 transition-transform group-hover:scale-105">
                <Film className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-white font-['Manrope']">
                  {appName}
                </span>
                <span className="hidden text-[11px] font-medium text-[#71717A] md:block -mt-1">
                  {tagline}
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
              <button
                onClick={() => onSelectView('home')}
                className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  currentView === 'home'
                    ? 'bg-white/10 text-white'
                    : 'text-[#A1A1AA] hover:bg-white/5 hover:text-white'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </button>

              <button
                onClick={() => onSelectView('movies')}
                className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  currentView === 'movies'
                    ? 'bg-white/10 text-white'
                    : 'text-[#A1A1AA] hover:bg-white/5 hover:text-white'
                }`}
              >
                <Clapperboard className="h-4 w-4" />
                <span>Library</span>
                {stats && stats.totalVideos > 0 && (
                  <span className="ml-1 rounded-full bg-[#181B24] px-2 py-0.5 text-xs text-[#A1A1AA]">
                    {stats.totalVideos}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectView('favorites')}
                className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  currentView === 'favorites'
                    ? 'bg-white/10 text-white'
                    : 'text-[#A1A1AA] hover:bg-white/5 hover:text-white'
                }`}
              >
                <Heart className="h-4 w-4" />
                <span>Favorites</span>
                {stats && stats.favoriteVideos > 0 && (
                  <span className="ml-1 rounded-full bg-[#E50914]/20 px-2 py-0.5 text-xs text-[#E50914]">
                    {stats.favoriteVideos}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectView('search')}
                className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  currentView === 'search'
                    ? 'bg-white/10 text-white'
                    : 'text-[#A1A1AA] hover:bg-white/5 hover:text-white'
                }`}
              >
                <Search className="h-4 w-4" />
                <span>Search</span>
              </button>
            </nav>
          </div>

          {/* Right Actions: Rescan, Add Folder, Settings */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onScanLibrary}
              disabled={isScanning}
              className={`flex items-center space-x-2 rounded-lg border border-white/10 bg-[#11131A] px-3 py-2 text-xs font-medium text-[#F8FAFC] transition-all hover:bg-[#181B24] disabled:opacity-50`}
              title="Rescan all local media folders"
              aria-label="Rescan Library"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin text-[#E50914]' : 'text-[#A1A1AA]'}`} />
              <span className="hidden sm:inline">{isScanning ? 'Scanning...' : 'Rescan'}</span>
            </button>

            <button
              onClick={onOpenAddFolder}
              className="flex items-center space-x-1.5 rounded-lg bg-[#E50914] px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-[#E50914]/30 transition-all hover:bg-[#F6121D] active:scale-95"
              aria-label="Add Folder"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Folder</span>
            </button>

            <button
              onClick={() => onSelectView('settings')}
              className={`rounded-lg p-2 transition-colors ${
                currentView === 'settings'
                  ? 'bg-white/10 text-white'
                  : 'text-[#A1A1AA] hover:bg-white/5 hover:text-white'
              }`}
              title="Library Settings"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 z-40 flex h-16 w-full items-center justify-around border-t border-white/5 bg-[#08090D]/95 px-2 backdrop-blur-lg md:hidden"
        aria-label="Mobile Navigation"
      >
        <button
          onClick={() => onSelectView('home')}
          className={`flex flex-col items-center justify-center p-2 ${
            currentView === 'home' ? 'text-[#E50914]' : 'text-[#71717A]'
          }`}
          aria-label="Home"
        >
          <Home className="h-5 w-5" />
          <span className="mt-1 text-[10px] font-medium">Home</span>
        </button>

        <button
          onClick={() => onSelectView('movies')}
          className={`flex flex-col items-center justify-center p-2 ${
            currentView === 'movies' ? 'text-[#E50914]' : 'text-[#71717A]'
          }`}
          aria-label="Movies"
        >
          <Clapperboard className="h-5 w-5" />
          <span className="mt-1 text-[10px] font-medium">Movies</span>
        </button>

        <button
          onClick={() => onSelectView('favorites')}
          className={`flex flex-col items-center justify-center p-2 ${
            currentView === 'favorites' ? 'text-[#E50914]' : 'text-[#71717A]'
          }`}
          aria-label="Favorites"
        >
          <Heart className="h-5 w-5" />
          <span className="mt-1 text-[10px] font-medium">Favorites</span>
        </button>

        <button
          onClick={() => onSelectView('search')}
          className={`flex flex-col items-center justify-center p-2 ${
            currentView === 'search' ? 'text-[#E50914]' : 'text-[#71717A]'
          }`}
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
          <span className="mt-1 text-[10px] font-medium">Search</span>
        </button>

        <button
          onClick={() => onSelectView('settings')}
          className={`flex flex-col items-center justify-center p-2 ${
            currentView === 'settings' ? 'text-[#E50914]' : 'text-[#71717A]'
          }`}
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
          <span className="mt-1 text-[10px] font-medium">Settings</span>
        </button>
      </nav>
    </>
  );
};
