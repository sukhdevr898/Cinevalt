import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ViewType, Video, Folder, LibraryStats, SystemInfo, ScanResult } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { HomeView } from './views/HomeView';
import { MoviesView } from './views/MoviesView';
import { SearchView } from './views/SearchView';
import { SettingsView } from './views/SettingsView';
import { PlayerModal } from './components/PlayerModal';
import { MovieDetailsModal } from './components/MovieDetailsModal';
import { AddFolderModal } from './components/AddFolderModal';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [videos, setVideos] = useState<Video[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  // Active modals
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [detailsVideo, setDetailsVideo] = useState<Video | null>(null);
  const [isAddFolderOpen, setIsAddFolderOpen] = useState<boolean>(false);

  // Loading & status states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isCreatingSample, setIsCreatingSample] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch all videos, folders, and statistics
  const loadData = useCallback(async () => {
    try {
      const [fetchedVideos, fetchedFolders, fetchedStats, fetchedSys] = await Promise.all([
        api.getVideos(),
        api.getFolders(),
        api.getLibraryStats(),
        api.getSystemInfo()
      ]);

      setVideos(fetchedVideos);
      setFolders(fetchedFolders);
      setStats(fetchedStats);
      setSystemInfo(fetchedSys);
    } catch (err: any) {
      console.error('Failed to load CineVault data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // If newly initialized with zero folders, automatically populate sample media
  useEffect(() => {
    if (!isLoading && folders.length === 0 && videos.length === 0) {
      handleCreateSampleMedia(true);
    }
  }, [isLoading, folders.length, videos.length]);

  // Handler: Scan library
  const handleScanLibrary = async () => {
    setIsScanning(true);
    try {
      const res = await api.scanLibrary();
      showToast(
        `Scan complete: Found ${res.videosFound} videos (${res.newVideos} new, ${res.updatedVideos} updated)`,
        'success'
      );
      await loadData();
    } catch (err: any) {
      showToast(`Scan failed: ${err.message}`, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // Handler: Create demo media
  const handleCreateSampleMedia = async (silent = false) => {
    setIsCreatingSample(true);
    try {
      const res = await api.createSampleMedia();
      if (!silent) {
        showToast(res.message, 'success');
      }
      await loadData();
    } catch (err: any) {
      if (!silent) {
        showToast(`Failed to create sample media: ${err.message}`, 'error');
      }
    } finally {
      setIsCreatingSample(false);
    }
  };

  // Handler: Toggle favorite
  const handleToggleFavorite = async (video: Video, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newFav = video.is_favorite === 1 ? 0 : 1;

    // Optimistic update
    setVideos((prev) =>
      prev.map((v) => (v.id === video.id ? { ...v, is_favorite: newFav } : v))
    );

    if (detailsVideo && detailsVideo.id === video.id) {
      setDetailsVideo((prev) => (prev ? { ...prev, is_favorite: newFav } : null));
    }

    try {
      await api.updateVideo(video.id, { is_favorite: newFav === 1 });
      const updatedStats = await api.getLibraryStats();
      setStats(updatedStats);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      // Revert on error
      await loadData();
    }
  };

  // Handler: Update progress (mark watched / unwatched)
  const handleUpdateProgress = async (videoId: number, completed: boolean) => {
    try {
      const vid = videos.find((v) => v.id === videoId);
      const dur = vid?.duration_seconds || 600;
      await api.updateProgress(videoId, completed ? dur : 0, dur, completed);
      await loadData();
      if (detailsVideo && detailsVideo.id === videoId) {
        setDetailsVideo((prev) =>
          prev
            ? {
                ...prev,
                completed: completed ? 1 : 0,
                position_seconds: completed ? dur : 0
              }
            : null
        );
      }
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  // Handler: Delete video from library index
  const handleDeleteVideo = async (videoId: number) => {
    try {
      await api.deleteVideo(videoId);
      showToast('Video removed from library index', 'info');
      await loadData();
    } catch (err: any) {
      showToast(`Failed to remove video: ${err.message}`, 'error');
    }
  };

  // Filtered views calculation
  const continueWatching = useMemo(() => {
    return videos.filter(
      (v) => v.position_seconds && v.position_seconds > 10 && v.completed !== 1
    );
  }, [videos]);

  const favorites = useMemo(() => {
    return videos.filter((v) => v.is_favorite === 1);
  }, [videos]);

  const [settingsInitialTab, setSettingsInitialTab] = useState<string>('health');

  const handleSelectView = (view: ViewType, subTab?: string) => {
    if (view === 'settings' && subTab) {
      setSettingsInitialTab(subTab as any);
    }
    setCurrentView(view);
  };

  const handleNavigateToRemote = () => {
    setSettingsInitialTab('remote');
    setCurrentView('settings');
  };

  return (
    <div className="min-h-screen bg-[#030712] text-[#F8FAFC] flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#030712] to-[#030712] pointer-events-none -z-10" />
      {/* Navbar */}
      <Navbar
        currentView={currentView}
        onSelectView={handleSelectView}
        onOpenAddFolder={() => setIsAddFolderOpen(true)}
        onScanLibrary={handleScanLibrary}
        isScanning={isScanning}
        stats={stats}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 animate-fade-in">
          <div
            className={`flex items-center space-x-2 rounded-xl border px-4 py-3 text-xs font-semibold shadow-2xl backdrop-blur-md ${
              toast.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-950/90 text-emerald-300'
                : toast.type === 'error'
                ? 'border-red-500/30 bg-red-950/90 text-red-300'
                : 'border-white/10 bg-[#181B24]/90 text-white'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-7xl">
        {isLoading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E50914] border-t-transparent" />
              <p className="text-xs font-medium text-[#71717A]">Connecting to CineVault...</p>
            </div>
          </div>
        ) : (
          <>
            {currentView === 'home' && (
              <HomeView
                videos={videos}
                continueWatching={continueWatching}
                favorites={favorites}
                onPlay={(v) => setActiveVideo(v)}
                onOpenDetails={(v) => setDetailsVideo(v)}
                onToggleFavorite={handleToggleFavorite}
                onOpenAddFolder={() => setIsAddFolderOpen(true)}
                onCreateSampleMedia={() => handleCreateSampleMedia(false)}
                isCreatingSample={isCreatingSample}
                onNavigateToRemote={handleNavigateToRemote}
              />
            )}

            {currentView === 'movies' && (
              <MoviesView
                videos={videos}
                onPlay={(v) => setActiveVideo(v)}
                onOpenDetails={(v) => setDetailsVideo(v)}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {currentView === 'favorites' && (
              <MoviesView
                videos={favorites}
                onPlay={(v) => setActiveVideo(v)}
                onOpenDetails={(v) => setDetailsVideo(v)}
                onToggleFavorite={handleToggleFavorite}
                initialFilter="favorites"
              />
            )}

            {currentView === 'search' && (
              <SearchView
                onPlay={(v) => setActiveVideo(v)}
                onOpenDetails={(v) => setDetailsVideo(v)}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {currentView === 'settings' && (
              <SettingsView
                folders={folders}
                onRefreshFolders={loadData}
                onOpenAddFolder={() => setIsAddFolderOpen(true)}
                onCreateSampleMedia={() => handleCreateSampleMedia(false)}
                isCreatingSample={isCreatingSample}
                systemInfo={systemInfo}
                stats={stats}
                initialTab={settingsInitialTab}
                onLibraryScanned={(res) => {
                  showToast(
                    `Scanned: Found ${res.videosFound} videos (${res.newVideos} new, ${res.updatedVideos} updated)`,
                    'success'
                  );
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Video Player Modal */}
      {activeVideo && (
        <PlayerModal
          video={activeVideo}
          allVideos={videos}
          onClose={() => {
            setActiveVideo(null);
            loadData();
          }}
          onSelectVideo={(next) => setActiveVideo(next)}
        />
      )}

      {/* Movie Details Modal */}
      {detailsVideo && (
        <MovieDetailsModal
          video={detailsVideo}
          onClose={() => setDetailsVideo(null)}
          onPlay={(v) => {
            setDetailsVideo(null);
            setActiveVideo(v);
          }}
          onToggleFavorite={(v) => handleToggleFavorite(v)}
          onUpdateProgress={handleUpdateProgress}
          onDeleteVideo={handleDeleteVideo}
        />
      )}

      {/* Add Media Folder Modal */}
      {isAddFolderOpen && (
        <AddFolderModal
          onClose={() => setIsAddFolderOpen(false)}
          onFolderAdded={() => {
            showToast('Media folder added successfully', 'success');
            loadData();
          }}
        />
      )}
    </div>
  );
}
