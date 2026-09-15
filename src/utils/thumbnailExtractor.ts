import { useState, useEffect } from 'react';
import { Video } from '../types';
import { api } from '../services/api';

// In-memory cache of generated thumbnails (data URLs)
const thumbnailCache = new Map<number | string, string>();

// Failed videos cache so we don't repeatedly try to capture unplayable codecs
const failedVideoIds = new Set<number | string>();

// Queue management for concurrency limit (max 2 extractions at a time to keep CPU & network light)
type QueueItem = {
  video: Video;
  resolve: (url: string | null) => void;
};
const extractionQueue: QueueItem[] = [];
let activeWorkers = 0;
const MAX_CONCURRENT = 2;

function processQueue() {
  if (activeWorkers >= MAX_CONCURRENT || extractionQueue.length === 0) {
    return;
  }

  const item = extractionQueue.shift();
  if (!item) return;

  activeWorkers++;
  extractFrameFromVideo(item.video)
    .then((url) => {
      item.resolve(url);
    })
    .catch(() => {
      item.resolve(null);
    })
    .finally(() => {
      activeWorkers--;
      processQueue();
    });
}

function extractFrameFromVideo(video: Video): Promise<string | null> {
  return new Promise((resolve) => {
    // 1. If video already has a thumbnail URL in database, return it
    if (video.thumbnail_url) {
      thumbnailCache.set(video.id, video.thumbnail_url);
      return resolve(video.thumbnail_url);
    }

    // 2. If it's a YouTube video, generate YouTube HQ thumbnail URL
    if (video.source_type === 'youtube' && video.remote_url) {
      const ytMatch = video.remote_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (ytMatch && ytMatch[1]) {
        const ytThumb = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
        thumbnailCache.set(video.id, ytThumb);
        return resolve(ytThumb);
      }
    }

    // 3. For local videos, capture frame via HTML5 video + canvas
    const streamUrl = api.getVideoStreamUrl(video.id);

    const videoEl = document.createElement('video');
    videoEl.crossOrigin = 'anonymous';
    videoEl.preload = 'metadata';
    videoEl.muted = true;
    (videoEl as any).playsInline = true;

    // Timeout safety in case video cannot be decoded
    const timeout = setTimeout(() => {
      cleanUp();
      failedVideoIds.add(video.id);
      resolve(null);
    }, 6000);

    const cleanUp = () => {
      clearTimeout(timeout);
      videoEl.onloadedmetadata = null;
      videoEl.onseeked = null;
      videoEl.onerror = null;
      videoEl.src = '';
      videoEl.remove();
    };

    videoEl.onerror = () => {
      cleanUp();
      failedVideoIds.add(video.id);
      resolve(null);
    };

    videoEl.onloadedmetadata = () => {
      // Seek to ~10% or at least 2 seconds in to avoid initial black frames
      const dur = videoEl.duration;
      let targetTime = 2;
      if (Number.isFinite(dur) && dur > 5) {
        targetTime = Math.min(dur * 0.15, 10);
      }
      videoEl.currentTime = targetTime;
    };

    videoEl.onseeked = () => {
      try {
        const width = 360;
        const height = 202; // 16:9 standard
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanUp();
          resolve(null);
          return;
        }

        ctx.drawImage(videoEl, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);

        // Cache in memory and sessionStorage
        thumbnailCache.set(video.id, dataUrl);
        try {
          sessionStorage.setItem(`cv_thumb_${video.id}`, dataUrl);
        } catch {
          // ignore session quota overflow
        }

        cleanUp();
        resolve(dataUrl);
      } catch (err) {
        cleanUp();
        failedVideoIds.add(video.id);
        resolve(null);
      }
    };

    videoEl.src = streamUrl;
  });
}

/**
 * Queue a video for automatic thumbnail extraction
 */
export function getAutoThumbnail(video: Video): Promise<string | null> {
  // Check memory cache
  if (thumbnailCache.has(video.id)) {
    return Promise.resolve(thumbnailCache.get(video.id)!);
  }

  // Check sessionStorage cache
  try {
    const cached = sessionStorage.getItem(`cv_thumb_${video.id}`);
    if (cached) {
      thumbnailCache.set(video.id, cached);
      return Promise.resolve(cached);
    }
  } catch {}

  // Check if previously marked as unextractable
  if (failedVideoIds.has(video.id)) {
    return Promise.resolve(null);
  }

  // If already has direct thumbnail
  if (video.thumbnail_url) {
    thumbnailCache.set(video.id, video.thumbnail_url);
    return Promise.resolve(video.thumbnail_url);
  }

  return new Promise((resolve) => {
    extractionQueue.push({ video, resolve });
    processQueue();
  });
}

/**
 * React hook to automatically fetch or extract video thumbnail
 */
export function useVideoThumbnail(video: Video) {
  const [thumbnail, setThumbnail] = useState<string | null>(() => {
    if (video.thumbnail_url) return video.thumbnail_url;
    if (thumbnailCache.has(video.id)) return thumbnailCache.get(video.id)!;
    try {
      return sessionStorage.getItem(`cv_thumb_${video.id}`);
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(!thumbnail && !failedVideoIds.has(video.id));

  useEffect(() => {
    let isMounted = true;

    if (video.thumbnail_url) {
      setThumbnail(video.thumbnail_url);
      setIsLoading(false);
      return;
    }

    if (thumbnailCache.has(video.id)) {
      setThumbnail(thumbnailCache.get(video.id)!);
      setIsLoading(false);
      return;
    }

    if (failedVideoIds.has(video.id)) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    getAutoThumbnail(video).then((url) => {
      if (isMounted) {
        if (url) setThumbnail(url);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [video.id, video.thumbnail_url, video.source_type, video.remote_url]);

  return { thumbnail, isLoading };
}
