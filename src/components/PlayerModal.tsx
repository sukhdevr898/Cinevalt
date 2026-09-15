import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactPlayer from 'react-player';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  ArrowLeft,
  Settings,
  AlertTriangle,
  Film,
  Sparkles,
  PictureInPicture2,
  Keyboard,
  HelpCircle,
  Check,
  X,
  Scaling
} from 'lucide-react';
import { Video } from '../types';
import { api } from '../services/api';
import { formatTimeCode } from '../utils/format';
import { useVideoThumbnail } from '../utils/thumbnailExtractor';

interface PlayerModalProps {
  video: Video;
  allVideos: Video[];
  onClose: () => void;
  onSelectVideo: (video: Video) => void;
  autoplayNext?: boolean;
}

export const PlayerModal: React.FC<PlayerModalProps> = ({
  video,
  allVideos,
  onClose,
  onSelectVideo,
  autoplayNext = true
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const seekbarRef = useRef<HTMLDivElement | null>(null);
  const isSeekingRef = useRef(false);
  const hasResumedRef = useRef(false);
  const userPausedRef = useRef(false);
  const progressRef = useRef({ currentTime: 0, duration: video.duration_seconds || 0 });
  const videoIdRef = useRef(video.id);
  videoIdRef.current = video.id;

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(video.duration_seconds || 0);
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('cinevault_volume');
    return saved !== null ? parseFloat(saved) : 1;
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    const saved = localStorage.getItem('cinevault_muted');
    return saved !== null ? saved === 'true' : false;
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => {
    const saved = localStorage.getItem('cinevault_speed');
    return saved !== null ? parseFloat(saved) : 1;
  });
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [ambientGlow, setAmbientGlow] = useState<boolean>(() => {
    const saved = localStorage.getItem('cinevault_ambient_glow');
    return saved !== null ? saved === 'true' : true;
  });
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>(() => {
    return (localStorage.getItem('cinevault_fit_mode') as 'contain' | 'cover') || 'contain';
  });

  const [showControls, setShowControls] = useState<boolean>(true);
  const [hasError, setHasError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Hover timestamp preview state for seekbar
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPositionRatio, setHoverPositionRatio] = useState<number>(0);

  const [resumePrompt, setResumePrompt] = useState<number | null>(
    video.position_seconds && video.position_seconds > 10 && !video.completed
      ? video.position_seconds
      : null
  );

  // Reset state when active video changes
  useEffect(() => {
    hasResumedRef.current = false;
    userPausedRef.current = false;
    setIsPlaying(true);
    setIsLoading(true);
    setCurrentTime(0);
    setDuration(video.duration_seconds || 0);
    progressRef.current = { currentTime: 0, duration: video.duration_seconds || 0 };
    setResumePrompt(
      video.position_seconds && video.position_seconds > 10 && !video.completed
        ? video.position_seconds
        : null
    );
  }, [video.id, video.duration_seconds, video.position_seconds, video.completed]);

  const { thumbnail: autoThumbnail } = useVideoThumbnail(video);
  const activeThumbnail = video.thumbnail_url || autoThumbnail;

  const currentIndex = allVideos.findIndex((v) => v.id === video.id);
  const prevVideo = currentIndex > 0 ? allVideos[currentIndex - 1] : null;
  const nextVideo = currentIndex < allVideos.length - 1 ? allVideos[currentIndex + 1] : null;

  // Stream URL for media playback
  const [streamUrl, setStreamUrl] = useState<string>(() => {
    return video.source_type === 'youtube' || video.source_type === 'gdrive'
      ? (video.remote_url || video.absolute_path)
      : api.getVideoStreamUrl(video.id, video.extension);
  });

  useEffect(() => {
    const initialUrl =
      video.source_type === 'youtube' || video.source_type === 'gdrive'
        ? (video.remote_url || video.absolute_path)
        : api.getVideoStreamUrl(video.id, video.extension);
    setStreamUrl(initialUrl);
    setHasError(null);
  }, [video.id, video.source_type, video.remote_url, video.absolute_path, video.extension]);

  const showActionToast = (msg: string) => {
    setActionNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => {
      setActionNotice(null);
    }, 1200);
  };

  // Auto-hide controls after 3.5 seconds of inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying && !showSpeedMenu && !showShortcutsModal) {
        setShowControls(false);
      }
    }, 3500);
  };

  // Save progress helper
  const saveProgress = useCallback(
    (time: number, dur: number) => {
      if (time > 0 && dur > 0) {
        const isCompleted = time >= dur * 0.9;
        api.updateProgress(video.id, time, dur, isCompleted).catch(() => {});
      }
    },
    [video.id]
  );

  // Play / Pause toggle - updates state declaratively for ReactPlayer
  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      userPausedRef.current = !next;
      showActionToast(next ? 'Playing' : 'Paused');
      return next;
    });
  }, []);

  // Safe media element resolver across HTMLVideoElement, ReactPlayer v3, or custom web components
  const getMediaElement = useCallback((): any => {
    if (!playerRef.current) return null;
    if (typeof playerRef.current.getInternalPlayer === 'function') {
      try {
        const internal = playerRef.current.getInternalPlayer();
        if (internal) return internal;
      } catch {
        // fallback to playerRef.current
      }
    }
    return playerRef.current;
  }, []);

  // Graceful close & pause helper to prevent play() interruption
  const handleClose = useCallback(() => {
    userPausedRef.current = true;
    setIsPlaying(false);
    const media = getMediaElement();
    if (media && typeof media.pause === 'function') {
      try {
        media.pause();
      } catch {
        // ignore
      }
    }
    const { currentTime: cur, duration: dur } = progressRef.current;
    if (cur > 0 && dur > 0) {
      saveProgress(cur, dur);
    }
    onClose();
  }, [getMediaElement, saveProgress, onClose]);

  // Seek helper
  const seekTo = (seconds: number) => {
    isSeekingRef.current = true;
    const target = Math.max(0, Math.min(seconds, duration || 100));
    const media = getMediaElement();
    if (media) {
      if (typeof media.seekTo === 'function') {
        try {
          media.seekTo(target);
        } catch {
          // ignore
        }
      }
      if (typeof media.currentTime === 'number') {
        try {
          media.currentTime = target;
        } catch {
          // ignore
        }
      }
    }
    setCurrentTime(target);
    progressRef.current.currentTime = target;
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 400);
  };

  // Step seek (-10s / +10s)
  const stepSeek = (delta: number) => {
    const current = currentTime || 0;
    const target = Math.max(0, Math.min(current + delta, duration || 100));
    seekTo(target);
    showActionToast(`${delta > 0 ? '+' : ''}${delta}s`);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
      showActionToast('Fullscreen');
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
      showActionToast('Exit Fullscreen');
    }
  };

  // Picture in Picture
  const togglePiP = async () => {
    try {
      const media = getMediaElement();
      if (!media) {
        showActionToast('PiP not supported for this stream');
        return;
      }
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        showActionToast('Exited PiP');
      } else if (typeof media.requestPictureInPicture === 'function') {
        await media.requestPictureInPicture();
        showActionToast('Picture-in-Picture');
      } else {
        showActionToast('PiP not supported for this stream');
      }
    } catch (err) {
      showActionToast('PiP Unavailable');
    }
  };

  // Aspect ratio fit toggle
  const toggleFitMode = () => {
    const next = fitMode === 'contain' ? 'cover' : 'contain';
    setFitMode(next);
    localStorage.setItem('cinevault_fit_mode', next);
    showActionToast(next === 'cover' ? 'Fill Screen (Zoom)' : 'Original Fit (Letterbox)');
  };

  // Ambient glow toggle
  const toggleAmbientGlow = () => {
    const next = !ambientGlow;
    setAmbientGlow(next);
    localStorage.setItem('cinevault_ambient_glow', String(next));
    showActionToast(next ? 'Ambient Glow: ON' : 'Ambient Glow: OFF');
  };

  // Speed change
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    localStorage.setItem('cinevault_speed', String(speed));
    setShowSpeedMenu(false);
    const media = getMediaElement();
    if (media && typeof media === 'object' && 'playbackRate' in media) {
      try {
        (media as HTMLVideoElement).playbackRate = speed;
      } catch {
        // ignore
      }
    }
    showActionToast(speed === 1 ? 'Speed 1x (Normal)' : `Speed ${speed}x`);
  };

  // Seekbar mouse events for hover preview
  const handleSeekbarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!seekbarRef.current || !duration) return;
    const rect = seekbarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = pos / rect.width;
    setHoverPositionRatio(ratio);
    setHoverTime(ratio * duration);
  };

  const handleSeekbarMouseLeave = () => {
    setHoverTime(null);
  };

  // Persist user preferences
  useEffect(() => {
    localStorage.setItem('cinevault_volume', volume.toString());
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('cinevault_muted', isMuted.toString());
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem('cinevault_speed', playbackSpeed.toString());
  }, [playbackSpeed]);

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          e.preventDefault();
          stepSeek(-10);
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          e.preventDefault();
          stepSeek(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume((prev) => {
            const next = Math.min(1, Math.round((prev + 0.05) * 100) / 100);
            showActionToast(`Volume ${Math.round(next * 100)}%`);
            return next;
          });
          setIsMuted(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume((prev) => {
            const next = Math.max(0, Math.round((prev - 0.05) * 100) / 100);
            showActionToast(`Volume ${Math.round(next * 100)}%`);
            return next;
          });
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          setIsMuted((prev) => {
            const next = !prev;
            showActionToast(next ? 'Muted' : 'Unmuted');
            return next;
          });
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          togglePiP();
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          toggleFitMode();
          break;
        case '?':
          e.preventDefault();
          setShowShortcutsModal((prev) => !prev);
          break;
        case 'Escape':
          e.preventDefault();
          if (showShortcutsModal) {
            setShowShortcutsModal(false);
          } else if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          } else {
            handleClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, handleClose, showShortcutsModal, fitMode, togglePlay]);

  // Periodic progress saving every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        const { currentTime: cur, duration: dur } = progressRef.current;
        if (cur > 0 && dur > 0) {
          saveProgress(cur, dur);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [saveProgress, isPlaying]);

  // Save progress and pause strictly on unmount / modal close
  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      const media = getMediaElement();
      if (media && typeof media.pause === 'function') {
        try {
          media.pause();
        } catch {
          // ignore
        }
      }
      const { currentTime: cur, duration: dur } = progressRef.current;
      const targetId = videoIdRef.current;
      if (cur > 0 && dur > 0 && targetId) {
        api.updateProgress(targetId, cur, dur, cur >= dur * 0.9).catch(() => {});
      }
    };
  }, [getMediaElement]);

  // Calculate progress percentage
  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const isNearEnd = duration > 30 && currentTime >= duration - 25;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 flex flex-col bg-black select-none overflow-hidden"
    >
      {/* Dynamic Ambient Background Glow (Apple TV / YouTube Cinema Style) */}
      {ambientGlow && activeThumbnail && (
        <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden transition-opacity duration-1000">
          <img
            src={activeThumbnail}
            alt=""
            className="h-full w-full object-cover blur-[80px] scale-125 opacity-25 brightness-75 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-[#030712]/50 backdrop-blur-3xl" />
        </div>
      )}

      {/* Action Toast Notification (Volume, Speed, Seek, PiP) */}
      {actionNotice && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 flex items-center space-x-2 rounded-2xl border border-white/15 bg-black/80 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-2xl backdrop-blur-xl animate-fade-in pointer-events-none">
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Top Header Bar - Responsive Title & Controls */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-3 sm:p-6 bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-all duration-300 gap-2 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex items-center space-x-2.5 sm:space-x-4 min-w-0 flex-1">
          <button
            onClick={handleClose}
            className="shrink-0 rounded-full bg-black/60 p-2 sm:p-2.5 text-white/90 backdrop-blur-xl border border-white/10 transition-all hover:bg-white/20 hover:text-white hover:scale-105 active:scale-95"
            aria-label="Back to Library"
          >
            <ArrowLeft className="h-4 w-4 sm:h-6 sm:w-6" />
          </button>

          {/* Screen-Adjusting Title & Metadata */}
          <div className="min-w-0 flex-1">
            <h2
              className="text-xs sm:text-base md:text-lg font-extrabold text-white leading-tight truncate tracking-tight font-['Outfit']"
              title={video.title}
            >
              {video.title}
            </h2>
            <div className="flex items-center space-x-1.5 sm:space-x-2 mt-0.5 text-[9px] sm:text-xs text-[#A1A1AA] truncate">
              <span className="truncate max-w-[110px] sm:max-w-[240px]">{video.folder_name}</span>
              <span>•</span>
              <span className="uppercase font-semibold text-white/70">{video.extension.replace('.', '')}</span>
              <span>•</span>
              <span className="uppercase text-indigo-400 font-semibold">{video.source_type || 'LOCAL'}</span>
            </div>
          </div>
        </div>

        {/* Quick Top Controls: Ambient Glow, Shortcuts Help */}
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          <button
            onClick={toggleAmbientGlow}
            className={`rounded-xl border p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold backdrop-blur-xl transition-all flex items-center space-x-1 sm:space-x-1.5 shrink-0 ${
              ambientGlow
                ? 'border-indigo-500/40 bg-indigo-500/20 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                : 'border-white/10 bg-black/50 text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Ambient Glow Cinema Lighting"
          >
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Ambient</span>
          </button>

          <button
            onClick={() => setShowShortcutsModal(true)}
            className="hidden sm:inline-flex rounded-xl border border-white/10 bg-black/50 p-2 text-white/70 backdrop-blur-xl hover:bg-white/10 hover:text-white transition-all shrink-0"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Resume Notification Prompt if partially watched */}
      {resumePrompt !== null && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-3 rounded-2xl border border-white/15 bg-[#0f172a]/95 px-5 py-3 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all">
          <span className="text-xs font-semibold text-white tracking-wide">
            Resume from {formatTimeCode(resumePrompt)}?
          </span>
          <button
            onClick={() => {
              seekTo(resumePrompt);
              setResumePrompt(null);
            }}
            className="rounded-lg bg-indigo-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] hover:bg-indigo-400 active:scale-95 transition-all"
          >
            Resume
          </button>
          <button
            onClick={() => setResumePrompt(null)}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/20 hover:text-white active:scale-95 transition-all"
          >
            Start Over
          </button>
        </div>
      )}

      {/* Main Video Viewport */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {streamUrl && (
          <ReactPlayer
            ref={playerRef as any}
            src={streamUrl}
            playing={isPlaying}
            volume={volume}
            muted={isMuted}
            playbackRate={playbackSpeed}
            width="100%"
            height="100%"
            style={{
              position: 'absolute',
              top: 0,
              left: 0
            }}
            className={`react-player-wrapper ${
              fitMode === 'cover' ? '[&_video]:object-cover' : '[&_video]:object-contain'
            }`}
            onPlay={() => {
              userPausedRef.current = false;
              setIsPlaying(true);
              setIsLoading(false);
              const media = getMediaElement();
              if (media && typeof media === 'object' && 'playbackRate' in media) {
                try {
                  (media as HTMLVideoElement).playbackRate = playbackSpeed;
                } catch {
                  // ignore
                }
              }
            }}
            onPause={() => {
              // Only update isPlaying if user explicitly paused or via PiP mode
              if (userPausedRef.current || document.pictureInPictureElement) {
                setIsPlaying(false);
              }
            }}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => {
              setIsLoading(false);
              if (!userPausedRef.current) {
                setIsPlaying(true);
              }
            }}
            onTimeUpdate={(e: any) => {
              const current = e.currentTarget?.currentTime || 0;
              setCurrentTime(current);
              progressRef.current.currentTime = current;
              if (!duration && e.currentTarget?.duration > 0) {
                const dur = e.currentTarget.duration;
                setDuration(dur);
                progressRef.current.duration = dur;
              }
            }}
            onDurationChange={(e: any) => {
              const dur = e.currentTarget?.duration || 0;
              setDuration(dur);
              progressRef.current.duration = dur;
              setIsLoading(false);
              if (!hasResumedRef.current && video.position_seconds && video.position_seconds > 10 && !video.completed && resumePrompt === null) {
                hasResumedRef.current = true;
                seekTo(video.position_seconds);
              }
            }}
            onEnded={() => {
              userPausedRef.current = true;
              setIsPlaying(false);
              setIsLoading(false);
              const { duration: dur } = progressRef.current;
              if (dur > 0) {
                api.updateProgress(video.id, dur, dur, true).catch(() => {});
              }
              if (autoplayNext && nextVideo) {
                onSelectVideo(nextVideo);
              }
            }}
            onError={(e: any) => {
              const errName = typeof e?.name === 'string' ? e.name : '';
              const errMsg = typeof e === 'string' ? e : (typeof e?.message === 'string' ? e.message : (e?.type || ''));
              if (errName === 'AbortError' || errMsg.includes('interrupted') || errMsg.includes('abort')) {
                return;
              }

              setIsLoading(false);
              console.warn('Playback error message:', errMsg || errName || 'Codecs or network error');
              setHasError(`Unable to play media source (${video.source_type}). Ensure codecs or permissions are valid.`);
            }}
            config={{
              youtube: { playerVars: { modestbranding: 1, controls: 0 } },
              html: { attributes: { playsInline: true } }
            } as any}
          />
        )}

        {/* Center Spinner Loader */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-10">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
          </div>
        )}

        {/* Click overlay to catch clicks for play/pause toggling */}
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              togglePlay();
            }
          }}
        />

        {/* Center Big Play / Pause Overlay Icon (Visible when paused and not loading) */}
        {!isPlaying && !isLoading && !hasError && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="absolute z-20 flex h-16 w-16 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/10 shadow-2xl transition-transform hover:scale-110 active:scale-95"
            aria-label="Play Video"
          >
            <Play className="h-8 w-8 sm:h-12 sm:w-12 fill-current translate-x-1 text-white" />
          </button>
        )}

        {/* Up Next Floating Drawer (When approaching the end) */}
        {isNearEnd && nextVideo && (
          <div className="absolute bottom-28 right-6 z-30 max-w-sm rounded-2xl border border-white/15 bg-[#0f172a]/95 p-4 shadow-2xl backdrop-blur-xl animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">
                Up Next in CineVault
              </span>
              <span className="text-[10px] text-[#A1A1AA]">Autoplay active</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white line-clamp-1">{nextVideo.title}</p>
            <div className="mt-3 flex items-center space-x-2">
              <button
                onClick={() => onSelectVideo(nextVideo)}
                className="flex-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-indigo-500 hover:text-white transition-all shadow-md"
              >
                Play Next
              </button>
            </div>
          </div>
        )}

        {/* Playback Error Modal */}
        {hasError && (
          <div className="absolute z-30 max-w-lg rounded-2xl border border-red-500/30 bg-[#181B24]/95 p-6 text-center shadow-2xl backdrop-blur-md">
            <AlertTriangle className="mx-auto h-12 w-12 text-[#E50914]" />
            <h3 className="mt-3 text-lg font-bold text-white">Playback Error</h3>
            <p className="mt-2 text-sm text-[#A1A1AA] leading-relaxed">{hasError}</p>
            <div className="mt-4 flex justify-center space-x-3">
              <button
                onClick={onClose}
                className="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
              >
                Back to Library
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-3 sm:px-6 pb-4 sm:pb-6 pt-12 transition-all duration-300 w-full max-w-full overflow-visible ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Interactive Scrubbing Bar with Hover Preview Tooltip */}
        <div
          ref={seekbarRef}
          onMouseMove={handleSeekbarMouseMove}
          onMouseLeave={handleSeekbarMouseLeave}
          className="relative mb-3 sm:mb-4 flex items-center group cursor-pointer py-2 w-full"
          onClick={(e) => {
            if (!seekbarRef.current || !duration) return;
            const rect = seekbarRef.current.getBoundingClientRect();
            const pos = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const ratio = pos / rect.width;
            seekTo(ratio * duration);
          }}
        >
          {/* Hover Timestamp Badge */}
          {hoverTime !== null && (
            <div
              className="absolute -top-7 -translate-x-1/2 rounded-md bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-lg pointer-events-none whitespace-nowrap"
              style={{ left: `${Math.max(5, Math.min(95, hoverPositionRatio * 100))}%` }}
            >
              {formatTimeCode(hoverTime)}
            </div>
          )}

          {/* Track background */}
          <div className="relative h-1.5 group-hover:h-2.5 w-full rounded-full bg-white/20 transition-all overflow-hidden">
            {/* Played Fill */}
            <div
              className="h-full bg-indigo-500 transition-all rounded-full shadow-[0_0_12px_rgba(99,102,241,0.9)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Scrub Knob */}
          <div
            className="absolute h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-x-1/2 rounded-full bg-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* Main Controls Row */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-4 w-full min-w-0">
          {/* Left Controls: Prev, Play, Next, Seek Steps, Volume */}
          <div className="flex items-center space-x-1 sm:space-x-3 min-w-0 flex-1 sm:flex-initial">
            <button
              onClick={() => prevVideo && onSelectVideo(prevVideo)}
              disabled={!prevVideo}
              className="rounded-full p-1.5 sm:p-2 text-white/80 transition-all hover:bg-white/10 hover:text-white disabled:opacity-20 active:scale-95 shrink-0"
              title="Previous Video"
              aria-label="Previous Video"
            >
              <SkipBack className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            <button
              onClick={togglePlay}
              className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all hover:scale-105 hover:bg-indigo-500 hover:text-white hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] active:scale-95 shrink-0"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 sm:h-6 sm:w-6 fill-current" />
              ) : (
                <Play className="h-4 w-4 sm:h-6 sm:w-6 fill-current translate-x-0.5" />
              )}
            </button>

            <button
              onClick={() => nextVideo && onSelectVideo(nextVideo)}
              disabled={!nextVideo}
              className="rounded-full p-1.5 sm:p-2 text-white/80 transition-all hover:bg-white/10 hover:text-white disabled:opacity-20 active:scale-95 shrink-0"
              title="Next Video"
              aria-label="Next Video"
            >
              <SkipForward className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            <button
              onClick={() => stepSeek(-10)}
              className="hidden sm:inline-flex rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white transition-all active:scale-95 shrink-0"
              title="Rewind 10s (← / J)"
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              onClick={() => stepSeek(10)}
              className="hidden sm:inline-flex rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white transition-all active:scale-95 shrink-0"
              title="Forward 10s (→ / L)"
              aria-label="Forward 10 seconds"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="rounded-xl p-1.5 sm:p-2 text-white/80 hover:bg-white/10 hover:text-white transition-all shrink-0"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                title="Mute / Unmute (M)"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  setIsMuted(false);
                }}
                className="hidden md:inline-block h-1.5 w-16 lg:w-24 cursor-pointer appearance-none rounded-lg bg-white/20 accent-indigo-500"
                aria-label="Volume Slider"
              />
            </div>

            {/* Time Stamp Display */}
            <div className="text-[10px] sm:text-xs font-semibold text-[#A1A1AA] tracking-wider pl-0.5 sm:pl-1 shrink-0 whitespace-nowrap">
              <span className="text-white font-mono">{formatTimeCode(currentTime)}</span>
              <span className="mx-0.5 sm:mx-1 text-[#52525B]">/</span>
              <span className="font-mono">{formatTimeCode(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Fit Mode, PiP, Speed, Fullscreen */}
          <div className="relative flex items-center space-x-1 sm:space-x-2 shrink-0">
            {/* Fit Mode Toggle (Contain vs Cover) */}
            <button
              onClick={toggleFitMode}
              className="rounded-xl border border-white/10 bg-black/40 p-1.5 sm:p-2 text-white/80 hover:bg-white/10 hover:text-white transition-all shrink-0"
              title={`Screen Fit: ${fitMode === 'cover' ? 'Fill' : 'Original'} (C)`}
            >
              <Scaling className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>

            {/* Picture in Picture */}
            <button
              onClick={togglePiP}
              className="hidden xs:inline-flex sm:inline-flex rounded-xl border border-white/10 bg-black/40 p-1.5 sm:p-2 text-white/80 hover:bg-white/10 hover:text-white transition-all shrink-0"
              title="Picture in Picture (P)"
            >
              <PictureInPicture2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>

            {/* Speed Selector */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className={`rounded-xl border px-2 py-1 sm:px-2.5 sm:py-1.5 text-[11px] sm:text-xs font-bold transition-all shrink-0 ${
                  playbackSpeed !== 1
                    ? 'border-indigo-500/50 bg-indigo-600/30 text-indigo-200 shadow-sm'
                    : 'border-white/10 bg-black/40 text-white/90 hover:bg-white/10'
                }`}
                aria-label="Playback Speed"
                title="Playback Speed"
              >
                {playbackSpeed}x
              </button>

              {showSpeedMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSpeedMenu(false)}
                  />
                  <div className="absolute bottom-full mb-2.5 right-0 z-50 flex flex-col rounded-2xl border border-white/15 bg-[#0b0f19]/95 p-1.5 shadow-2xl backdrop-blur-2xl min-w-[130px] max-h-72 overflow-y-auto">
                    <div className="px-2.5 py-1 mb-1 border-b border-white/10 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
                        Speed
                      </span>
                      {playbackSpeed !== 1 && (
                        <button
                          onClick={() => handleSpeedChange(1)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          Reset 1x
                        </button>
                      )}
                    </div>
                    {[
                      { s: 0.25, label: '0.25x' },
                      { s: 0.5, label: '0.5x' },
                      { s: 0.75, label: '0.75x' },
                      { s: 1, label: '1x (Normal)' },
                      { s: 1.25, label: '1.25x' },
                      { s: 1.5, label: '1.5x' },
                      { s: 1.75, label: '1.75x' },
                      { s: 2, label: '2x' }
                    ].map(({ s, label }) => (
                      <button
                        key={s}
                        onClick={() => handleSpeedChange(s)}
                        className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all ${
                          playbackSpeed === s
                            ? 'bg-indigo-500 text-white font-bold shadow-sm shadow-indigo-500/30'
                            : 'text-[#A1A1AA] hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span>{label}</span>
                        {playbackSpeed === s && <Check className="h-3.5 w-3.5 ml-2 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="rounded-xl border border-white/10 bg-black/40 p-1.5 sm:p-2 text-white/80 hover:bg-white/10 hover:text-white transition-all shrink-0"
              title="Toggle Fullscreen (F)"
              aria-label="Fullscreen"
            >
              {isFullscreen ? (
                <Minimize className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              ) : (
                <Maximize className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0f172a] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center space-x-2 text-white">
                <Keyboard className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold font-['Outfit']">Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="rounded-xl p-1.5 text-[#71717A] hover:bg-white/10 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {[
                { keys: ['Space', 'K'], label: 'Play / Pause' },
                { keys: ['←', 'J'], label: 'Rewind 10 seconds' },
                { keys: ['→', 'L'], label: 'Fast-forward 10 seconds' },
                { keys: ['↑', '↓'], label: 'Adjust volume' },
                { keys: ['M'], label: 'Mute / Unmute' },
                { keys: ['F'], label: 'Toggle Fullscreen' },
                { keys: ['P'], label: 'Picture-in-Picture' },
                { keys: ['C'], label: 'Toggle Fit / Fill screen' },
                { keys: ['Esc'], label: 'Exit Fullscreen / Close player' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1">
                  <span className="text-[#A1A1AA]">{item.label}</span>
                  <div className="flex space-x-1.5">
                    {item.keys.map((k) => (
                      <kbd
                        key={k}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] font-bold text-white shadow-sm"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="w-full rounded-xl bg-indigo-500 py-2.5 text-xs font-bold text-white hover:bg-indigo-400 transition-all"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
