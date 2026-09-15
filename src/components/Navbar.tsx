import React from 'react';
import {
  Film,
  Home,
  Clapperboard,
  Heart,
  Search,
  Settings,
  Plus,
  RefreshCw,
  Tv,
  User,
  Radio
} from 'lucide-react';
import { motion } from 'motion/react';
import { ViewType, LibraryStats } from '../types';

interface NavbarProps {
  currentView: ViewType;
  onSelectView: (view: ViewType, subTab?: string) => void;
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
  const profileName = localStorage.getItem('cinevault_profile_name') || 'Cinema Administrator';
  const initialLetter = profileName.charAt(0).toUpperCase();

  return (
    <>
      {/* Desktop & Tablet Top Navigation */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#030712]/80 backdrop-blur-2xl"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-8">
            <button
              onClick={() => onSelectView('home')}
              className="flex items-center space-x-3 text-left group focus:outline-none"
              aria-label="CineVault Home"
            >
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg shadow-indigo-500/25 border border-white/20 transition-transform duration-300 group-hover:scale-105">
                <Film className="h-5 w-5 text-white" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-white font-['Outfit']">
                  {appName}
                </span>
                <span className="hidden text-[10px] font-bold tracking-widest text-indigo-400/80 md:block uppercase -mt-0.5">
                  {tagline}
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
              <button
                onClick={() => onSelectView('home')}
                className={`relative flex items-center space-x-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  currentView === 'home'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-[#A1A1AA] hover:bg-white/5 hover:text-white'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
                {currentView === 'home' && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-indigo-500 rounded-full" />
                )}
              </button>

              <button
                onClick={() => onSelectView('movies')}
                className={`relative flex items-center space-x-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  currentView === 'movies'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-[#A1A1AA] hover:bg-white/5 hover:text-white'
                }`}
              >
                <Clapperboard className="h-4 w-4" />
                <span>Library</span>
                {stats && stats.totalVideos > 0 && (
                  <span className="ml-1 rounded-full bg-white/10 px-2 py-0.2 text-[10px] text-zinc-300">
                    {stats.totalVideos}
                  </span>
                )}
                {currentView === 'movies' && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-indigo-500 rounded-full" />
                )}
              </button>

              <button
                onClick={() => onSelectView('favorites')}
                className={`relative flex items-center space-x-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  currentView === 'favorites'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-[#A1A1AA] hover:bg-white/5 hover:text-white'
                }`}
              >
                <Heart className={`h-4 w-4 ${currentView === 'favorites' ? 'fill-rose-500 text-rose-500' : 'text-rose-400'}`} />
                <span>Favorites</span>
                {stats && stats.favoriteVideos > 0 && (
                  <span className="ml-1 rounded-full bg-rose-500/20 px-2 py-0.2 text-[10px] text-rose-300 font-bold">
                    {stats.favoriteVideos}
                  </span>
                )}
                {currentView === 'favorites' && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-rose-500 rounded-full" />
                )}
              </button>

              <button
                onClick={() => onSelectView('search')}
                className={`relative flex items-center space-x-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  currentView === 'search'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-[#A1A1AA] hover:bg-white/5 hover:text-white'
                }`}
              >
                <Search className="h-4 w-4" />
                <span>Search</span>
                {currentView === 'search' && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-indigo-500 rounded-full" />
                )}
              </button>
            </nav>
          </div>

          {/* Right Actions: TV Remote, Rescan, Add Folder, Account */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick TV Connect Button */}
            <button
              onClick={() => onSelectView('settings')}
              className="flex items-center space-x-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20 hover:text-white transition-all shadow-sm"
              title="Setup Android TV & Remote Access"
              aria-label="TV Remote Access"
            >
              <Tv className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">TV Remote</span>
            </button>

            {/* Rescan Button */}
            <button
              onClick={onScanLibrary}
              disabled={isScanning}
              className="flex items-center space-x-1.5 rounded-xl border border-white/10 bg-[#0f172a] px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-50 transition-all"
              title="Rescan media folders"
              aria-label="Rescan Library"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="hidden lg:inline">{isScanning ? 'Scanning...' : 'Rescan'}</span>
            </button>

            {/* Add Folder Button */}
            <button
              onClick={onOpenAddFolder}
              className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-500/25 hover:bg-indigo-500 active:scale-95 transition-all"
              aria-label="Add Folder"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Folder</span>
            </button>

            {/* Account & Settings Avatar Button */}
            <button
              onClick={() => onSelectView('settings')}
              className={`flex items-center space-x-2 rounded-xl p-1.5 pr-3 transition-all ${
                currentView === 'settings'
                  ? 'bg-white/15 ring-2 ring-indigo-500/40'
                  : 'hover:bg-white/5'
              }`}
              title="Account & Settings"
              aria-label="Account Settings"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-[11px] font-bold text-white shadow-md">
                {initialLetter}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-[11px] font-bold text-white leading-tight truncate max-w-[100px]">
                  {profileName}
                </span>
                <span className="text-[9px] text-indigo-400 uppercase tracking-wider font-semibold">
                  Account
                </span>
              </div>
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 z-40 flex h-16 w-full items-center justify-around border-t border-white/[0.08] bg-[#030712]/95 px-2 backdrop-blur-2xl md:hidden"
        aria-label="Mobile Navigation"
      >
        <button
          onClick={() => onSelectView('home')}
          className={`flex flex-col items-center justify-center p-2 transition-colors ${
            currentView === 'home' ? 'text-indigo-400 font-bold' : 'text-[#71717A]'
          }`}
          aria-label="Home"
        >
          <Home className="h-5 w-5" />
          <span className="mt-1 text-[10px]">Home</span>
        </button>

        <button
          onClick={() => onSelectView('movies')}
          className={`flex flex-col items-center justify-center p-2 transition-colors ${
            currentView === 'movies' ? 'text-indigo-400 font-bold' : 'text-[#71717A]'
          }`}
          aria-label="Movies"
        >
          <Clapperboard className="h-5 w-5" />
          <span className="mt-1 text-[10px]">Library</span>
        </button>

        <button
          onClick={() => onSelectView('favorites')}
          className={`flex flex-col items-center justify-center p-2 transition-colors ${
            currentView === 'favorites' ? 'text-rose-400 font-bold' : 'text-[#71717A]'
          }`}
          aria-label="Favorites"
        >
          <Heart className={`h-5 w-5 ${currentView === 'favorites' ? 'fill-rose-400' : ''}`} />
          <span className="mt-1 text-[10px]">Favorites</span>
        </button>

        <button
          onClick={() => onSelectView('search')}
          className={`flex flex-col items-center justify-center p-2 transition-colors ${
            currentView === 'search' ? 'text-indigo-400 font-bold' : 'text-[#71717A]'
          }`}
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
          <span className="mt-1 text-[10px]">Search</span>
        </button>

        <button
          onClick={() => onSelectView('settings')}
          className={`flex flex-col items-center justify-center p-2 transition-colors ${
            currentView === 'settings' ? 'text-indigo-400 font-bold' : 'text-[#71717A]'
          }`}
          aria-label="Settings and Account"
        >
          <User className="h-5 w-5" />
          <span className="mt-1 text-[10px]">Account</span>
        </button>
      </nav>
    </>
  );
};
