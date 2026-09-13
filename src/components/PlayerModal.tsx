import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactPlayer from 'react-player';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  ArrowLeft,
  Settings,
  AlertTriangle,
  Film
} from 'lucide-react';
import { Video } from '../types';
import { api } from '../services/api';
import { formatTimeCode } from '../utils/format';

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
  const [showControls, setShowControls] = useState<boolean>(true);
  const [hasError, setHasError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [resumePrompt, setResumePrompt] = useState<number | null>(
    video.position_seconds && video.position_seconds > 10 && !video.completed
      ? video.position_seconds
      : null
  );

  const currentIndex = allVideos.findIndex((v) => v.id === video.id);
  const prevVideo = currentIndex > 0 ? allVideos[currentIndex - 1] : null;
  const nextVideo = currentIndex < allVideos.length - 1 ? allVideos[currentIndex + 1] : null;

  // Stream URL
  const streamUrl = video.source_type === 'youtube' || video.source_type === 'gdrive' 
    ? (video.remote_url || video.absolute_path)
    : api.getVideoStreamUrl(video.id);

  // Auto-hide controls after 3 seconds of inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
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

  // Play / Pause toggle
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // Seek helper
  const seekTo = (seconds: number) => {
    if (!playerRef.current) return;
    const target = Math.max(0, Math.min(seconds, duration || 100));
    playerRef.current.currentTime = target;
    setCurrentTime(target);
  };

  // Step seek (-10s / +10s)
  const stepSeek = (delta: number) => {
    if (!playerRef.current) return;
    seekTo((playerRef.current.currentTime || 0) + delta);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Speed change
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
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
          e.preventDefault();
          stepSeek(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          stepSeek(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume((prev) => Math.min(1, prev + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume((prev) => Math.max(0, prev - 0.1));
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          setIsMuted((prev) => !prev);
          break;
        case 'Escape':
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          } else {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, duration, onClose]);

  // Periodic progress saving every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && isPlaying) {
        saveProgress(playerRef.current.currentTime || 0, playerRef.current.duration || duration);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [saveProgress, isPlaying, duration]);

  // Save progress on unmount / close
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        saveProgress(playerRef.current.currentTime || 0, playerRef.current.duration || duration);
      }
    };
  }, [saveProgress, duration]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 flex flex-col bg-black select-none"
    >
      {/* Top Header Bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              if (playerRef.current) {
                saveProgress(playerRef.current.currentTime || 0, playerRef.current.duration || duration);
              }
              onClose();
            }}
            className="rounded-full bg-black/50 p-2.5 text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
            aria-label="Back to Library"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
              {video.title}
            </h2>
            <p className="text-xs text-[#A1A1AA]">
              {video.folder_name} • {(video.source_type || 'local').toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Resume Notification Prompt if partially watched */}
      {resumePrompt !== null && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-3 rounded-2xl border border-white/10 bg-[#0f172a]/95 px-5 py-3 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all">
          <span className="text-xs font-semibold text-white tracking-wide">
            Resume from {formatTimeCode(resumePrompt)}?
          </span>
          <button
            onClick={() => {
              seekTo(resumePrompt);
              setResumePrompt(null);
            }}
            className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] hover:bg-indigo-400 active:scale-95 transition-all"
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
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 z-0 pointer-events-none" />
        
        <ReactPlayer
          ref={playerRef as any}
          src={streamUrl}
          playing={isPlaying}
          volume={volume}
          muted={isMuted}
          playbackRate={playbackSpeed}
          width="100%"
          height="100%"
          style={{ position: 'absolute', top: 0, left: 0 }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => setIsLoading(false)}
          onTimeUpdate={(e: any) => {
            const current = e.currentTarget?.currentTime || 0;
            setCurrentTime(current);
            if (!duration && e.currentTarget?.duration > 0) {
              setDuration(e.currentTarget.duration);
            }
          }}
          onDurationChange={(e: any) => {
            const dur = e.currentTarget?.duration || 0;
            setDuration(dur);
            setIsLoading(false);
            if (video.position_seconds && video.position_seconds > 10 && !video.completed && resumePrompt === null) {
               seekTo(video.position_seconds);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            if (playerRef.current) {
              saveProgress(duration, duration);
            }
            if (autoplayNext && nextVideo) {
              onSelectVideo(nextVideo);
            }
          }}
          onError={(e) => {
            setIsLoading(false);
            console.error('ReactPlayer error', e);
            setHasError(`Unable to play media source (${video.source_type}). Ensure API limits or permissions are valid.`);
          }}
          config={{
            youtube: { playerVars: { modestbranding: 1, controls: 0 } },
            html: { attributes: { playsInline: true, crossOrigin: 'anonymous' } }
          } as any}
        />

        {/* Center Spinner Loader */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-10">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#E50914] border-t-transparent" />
          </div>
        )}

        {/* Invisible overlay to catch clicks for play/pause toggling */}
        <div className="absolute inset-0 z-10 cursor-pointer" onClick={togglePlay} />

        {/* Play / Pause Flash Overlay Icon */}
        {!isPlaying && !isLoading && !hasError && (
          <div className="absolute z-10 flex h-20 w-20 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md pointer-events-none">
            <Play className="h-10 w-10 fill-current translate-x-1" />
          </div>
        )}

        {/* Error State Banner */}
        {hasError && (
          <div className="absolute z-10 max-w-lg rounded-2xl border border-red-500/30 bg-[#181B24]/95 p-6 text-center shadow-2xl backdrop-blur-md">
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
        className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-6 pt-12 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress / Seek Slider */}
        <div className="mb-4 flex items-center space-x-3">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            aria-label="Seek Slider"
          />
        </div>

        {/* Main Controls Row */}
        <div className="flex items-center justify-between mt-2">
          {/* Left Controls: Prev, Play, Next, Seek Steps, Volume */}
          <div className="flex items-center space-x-2 sm:space-x-5">
            <button
              onClick={() => prevVideo && onSelectVideo(prevVideo)}
              disabled={!prevVideo}
              className="rounded-full p-2.5 text-white/80 transition-all hover:bg-white/10 hover:text-white disabled:opacity-30 active:scale-95"
              title="Previous Video"
              aria-label="Previous Video"
            >
              <SkipBack className="h-5 w-5" />
            </button>

            <button
              onClick={togglePlay}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-transform hover:scale-110 hover:bg-indigo-500 hover:text-white hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] active:scale-95 z-20"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 fill-current" />
              ) : (
                <Play className="h-6 w-6 fill-current translate-x-0.5" />
              )}
            </button>

            <button
              onClick={() => nextVideo && onSelectVideo(nextVideo)}
              disabled={!nextVideo}
              className="rounded-full p-2.5 text-white/80 transition-all hover:bg-white/10 hover:text-white disabled:opacity-30 active:scale-95"
              title="Next Video"
              aria-label="Next Video"
            >
              <SkipForward className="h-5 w-5" />
            </button>

            <button
              onClick={() => stepSeek(-10)}
              className="hidden sm:inline-flex rounded-lg p-2 text-white/80 hover:text-white"
              title="Rewind 10s"
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              onClick={() => stepSeek(10)}
              className="hidden sm:inline-flex rounded-lg p-2 text-white/80 hover:text-white"
              title="Forward 10s"
              aria-label="Forward 10 seconds"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            {/* Volume */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="rounded-lg p-2 text-white/80 hover:text-white"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  setIsMuted(false);
                }}
                className="hidden md:inline-block h-1.5 w-20 cursor-pointer appearance-none rounded-lg bg-white/20 accent-white"
                aria-label="Volume Slider"
              />
            </div>

            {/* Time Stamp */}
            <div className="text-xs font-medium text-[#A1A1AA]">
              <span className="text-white">{formatTimeCode(currentTime)}</span>
              <span className="mx-1">/</span>
              <span>{formatTimeCode(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Speed, Fullscreen */}
          <div className="relative flex items-center space-x-2 z-20">
            {/* Speed Selector */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-xs font-semibold text-white/90 hover:bg-white/10"
                aria-label="Playback Speed"
              >
                {playbackSpeed}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-10 right-0 z-30 flex flex-col rounded-xl border border-white/10 bg-[#181B24] p-1.5 shadow-2xl">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium text-left ${
                        playbackSpeed === s
                          ? 'bg-[#E50914] text-white'
                          : 'text-[#A1A1AA] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="rounded-lg p-2 text-white/80 hover:text-white"
              title="Toggle Fullscreen (F)"
              aria-label="Fullscreen"
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
