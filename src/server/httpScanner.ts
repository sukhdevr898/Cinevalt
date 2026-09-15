import { getDb, runQuery, queryOne, queryAll, VideoRecord } from './database.js';
import { deriveTitleFromFilename, getMimeType, SUPPORTED_EXTENSIONS } from './mimeTypes.js';
import { extractRemoteVideoDuration } from './metadataExtractor.js';

const MIN_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MIN_DURATION_SECONDS = 60; // 1 minute

interface DiscoveredHttpVideo {
  url: string;
  filename: string;
  title: string;
  extension: string;
  sizeBytes: number;
  durationSeconds: number;
  relativePath: string;
}

// Parses sizes like "14M", "1.5G", "500K", "123456" into bytes
function parseHtmlFileSize(str: string): number {
  if (!str) return 0;
  const cleaned = str.trim().toUpperCase();
  const match = cleaned.match(/^([0-9.]+)\s*([KMGT]?B?)$/);
  if (!match) return 0;

  const val = parseFloat(match[1]);
  if (isNaN(val)) return 0;

  const unit = match[2];
  if (unit.startsWith('K')) return Math.round(val * 1024);
  if (unit.startsWith('M')) return Math.round(val * 1024 * 1024);
  if (unit.startsWith('G')) return Math.round(val * 1024 * 1024 * 1024);
  if (unit.startsWith('T')) return Math.round(val * 1024 * 1024 * 1024 * 1024);
  return Math.round(val);
}

// Check Content-Length via fast HEAD request
async function getRemoteFileSize(url: string): Promise<number> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (CineVault-Scanner)' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    const len = res.headers.get('content-length');
    return len ? parseInt(len, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function scanHttpDirectory(folderId: number, rootUrl: string): Promise<{
  videosFound: number;
  newVideos: number;
  updatedVideos: number;
  removedVideos: number;
}> {
  await getDb();
  let newVideos = 0;
  let updatedVideos = 0;
  let removedVideos = 0;
  const now = new Date().toISOString();

  // Normalize root URL
  let normalizedRoot = rootUrl.trim();
  if (!/^https?:\/\//i.test(normalizedRoot)) {
    normalizedRoot = `http://${normalizedRoot}`;
  }
  if (!normalizedRoot.endsWith('/') && !/\.[a-zA-Z0-9]{2,4}$/.test(normalizedRoot)) {
    normalizedRoot += '/';
  }

  const rootUrlObj = new URL(normalizedRoot);
  const rootDomain = rootUrlObj.origin;
  const rootBasePath = rootUrlObj.pathname;

  const visitedUrls = new Set<string>();
  const discoveredVideos: DiscoveredHttpVideo[] = [];
  const queue: { url: string; depth: number }[] = [{ url: normalizedRoot, depth: 0 }];
  const MAX_DEPTH = 3;
  const MAX_VIDEOS = 500;

  while (queue.length > 0 && discoveredVideos.length < MAX_VIDEOS) {
    const current = queue.shift()!;
    if (visitedUrls.has(current.url)) continue;
    visitedUrls.add(current.url);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(current.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CineVault/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) {
        console.warn(`[HTTP Scanner] Failed to fetch ${current.url}: Status ${res.status}`);
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      
      // If the URL itself directly returned a video stream or binary file
      if (contentType.startsWith('video/')) {
        const len = res.headers.get('content-length');
        const sizeBytes = len ? parseInt(len, 10) || 0 : 0;

        // Skip if size less than 10MB
        if (sizeBytes > 0 && sizeBytes < MIN_SIZE_BYTES) {
          break;
        }

        const durationSeconds = await extractRemoteVideoDuration(current.url, sizeBytes);
        // Skip if duration less than 1 minute (60s)
        if (durationSeconds > 0 && durationSeconds < MIN_DURATION_SECONDS) {
          break;
        }

        const pathname = new URL(current.url).pathname;
        const filename = decodeURIComponent(pathname.split('/').filter(Boolean).pop() || 'video.mp4');
        const ext = '.' + (filename.split('.').pop() || 'mp4').toLowerCase();
        const title = deriveTitleFromFilename(filename);
        discoveredVideos.push({
          url: current.url,
          filename,
          title,
          extension: ext,
          sizeBytes,
          durationSeconds,
          relativePath: filename
        });
        break;
      }

      const html = await res.text();
      const currentUrlObj = new URL(current.url);

      // Parse all <a> links
      const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi;
      let match: RegExpExecArray | null;

      while ((match = linkRegex.exec(html)) !== null) {
        if (discoveredVideos.length >= MAX_VIDEOS) break;

        const href = match[2].trim();
        const linkText = match[3].replace(/<[^>]*>/g, '').trim();

        // Filter out anchors, parameters, mailto, javascript, parent directories
        if (!href || href.startsWith('#') || href.startsWith('?') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
          continue;
        }
        if (href === '../' || href === '..' || href === '/' || /parent\s*directory/i.test(linkText)) {
          continue;
        }

        let resolvedUrl: string;
        try {
          resolvedUrl = new URL(href, current.url).href;
        } catch {
          continue;
        }

        const resolvedObj = new URL(resolvedUrl);

        // Security / Scope check: Stay on the same host and under the root directory tree
        if (resolvedObj.origin !== rootDomain) {
          continue;
        }
        if (!resolvedObj.pathname.startsWith(rootBasePath)) {
          continue;
        }

        const pathname = resolvedObj.pathname;
        const filename = decodeURIComponent(pathname.split('/').filter(Boolean).pop() || '');
        const ext = ('.' + (filename.split('.').pop() || '')).toLowerCase();

        // Check if this link points to a supported video
        if (SUPPORTED_EXTENSIONS.has(ext)) {
          // Look for file size in nearby HTML (Apache / Nginx table or pre row)
          let sizeBytes = 0;
          const matchIndex = match.index;
          const surroundingHtml = html.substring(matchIndex, matchIndex + 300);
          const sizeMatch = surroundingHtml.match(/\b([0-9.]+)\s*([KMGT]?B?)\b/i);
          if (sizeMatch) {
            sizeBytes = parseHtmlFileSize(sizeMatch[0]);
          }

          // If size not detected from HTML, fetch via fast HEAD request
          if (sizeBytes === 0) {
            sizeBytes = await getRemoteFileSize(resolvedUrl);
          }

          // Skip all videos that are less than 10MB
          if (sizeBytes > 0 && sizeBytes < MIN_SIZE_BYTES) {
            continue;
          }

          // Check video duration (range check on moov/mvhd)
          const durationSeconds = await extractRemoteVideoDuration(resolvedUrl, sizeBytes);

          // Skip all videos with duration less than 1 minute (60s)
          if (durationSeconds > 0 && durationSeconds < MIN_DURATION_SECONDS) {
            continue;
          }

          const relative = pathname.replace(rootBasePath, '').replace(/^\//, '') || filename;
          const title = deriveTitleFromFilename(filename);

          discoveredVideos.push({
            url: resolvedUrl,
            filename,
            title,
            extension: ext,
            sizeBytes,
            durationSeconds,
            relativePath: decodeURIComponent(relative)
          });
        } else if (
          (href.endsWith('/') || !href.includes('.')) &&
          current.depth < MAX_DEPTH &&
          !visitedUrls.has(resolvedUrl)
        ) {
          // Subdirectory link - enqueue for crawl
          queue.push({ url: resolvedUrl, depth: current.depth + 1 });
        }
      }
    } catch (err: any) {
      console.warn(`[HTTP Scanner] Error crawling ${current.url}:`, err.message);
    }
  }

  // Active URLs discovered in this scan
  const activeUrls = new Set<string>();

  for (const item of discoveredVideos) {
    activeUrls.add(item.url);
    const existing = queryOne<VideoRecord>(
      'SELECT id FROM videos WHERE absolute_path = ? AND folder_id = ?',
      [item.url, folderId]
    );

    const mimeType = getMimeType(item.filename);

    if (existing) {
      runQuery(
        'UPDATE videos SET title = ?, size_bytes = ?, duration_seconds = CASE WHEN ? > 0 THEN ? ELSE duration_seconds END, is_available = 1, updated_at_db = ? WHERE id = ?',
        [item.title, item.sizeBytes, item.durationSeconds, item.durationSeconds, now, existing.id]
      );
      updatedVideos++;
    } else {
      runQuery(
        `INSERT INTO videos (
          folder_id, source_type, remote_url, thumbnail_url, absolute_path, relative_path, filename,
          title, extension, mime_type, size_bytes, duration_seconds, modified_at, created_at, created_at_db, updated_at_db, is_available
        ) VALUES (?, 'http', ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          folderId,
          item.url,
          item.url,
          item.relativePath,
          item.filename,
          item.title,
          item.extension,
          mimeType,
          item.sizeBytes,
          item.durationSeconds || 0,
          now,
          now,
          now,
          now
        ]
      );
      newVideos++;
    }
  }

  // Remove videos that are no longer present in the remote directory
  const existingFolderVideos = queryAll<VideoRecord>(
    'SELECT id, absolute_path FROM videos WHERE folder_id = ?',
    [folderId]
  );

  for (const v of existingFolderVideos) {
    if (!activeUrls.has(v.absolute_path)) {
      runQuery('DELETE FROM videos WHERE id = ?', [v.id]);
      removedVideos++;
    }
  }

  const totalFound = newVideos + updatedVideos;

  runQuery(
    `UPDATE folders 
     SET scan_status = 'idle', 
         last_scanned_at = ?, 
         video_count = ?, 
         updated_at = ? 
     WHERE id = ?`,
    [now, totalFound, now, folderId]
  );

  return {
    videosFound: totalFound,
    newVideos,
    updatedVideos,
    removedVideos
  };
}
