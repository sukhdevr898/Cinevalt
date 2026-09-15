import express, { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  getDb,
  queryAll,
  queryOne,
  runQuery,
  FolderRecord,
  VideoRecord,
  PlaybackProgressRecord
} from './database.js';
import { scanFolder, scanAllFolders, getScanState, getScanProgress, resetScanProgress } from './scanner.js';
import { handleVideoStream, isPathContained } from './streaming.js';
import { createSampleMediaIfEmpty } from './sampleMedia.js';
import { isNativeBrowserPlayable, isSupportedVideo } from './mimeTypes.js';

export function createApiRouter(): Router {
  const router = Router();

  // Helper response wrappers
  const sendSuccess = (res: Response, data: any, status = 200) => {
    res.status(status).json({ success: true, data, error: null });
  };

  const sendError = (res: Response, code: string, message: string, status = 400) => {
    res.status(status).json({ success: false, data: null, error: { code, message } });
  };

  // --- HEALTH & SYSTEM ---
  router.get('/health', async (_req: Request, res: Response) => {
    try {
      await getDb();
      sendSuccess(res, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: 'connected',
        streamingEngine: 'active',
        nodeVersion: process.version,
        freeMemBytes: os.freemem(),
        totalMemBytes: os.totalmem()
      });
    } catch (err: any) {
      sendError(res, 'HEALTH_ERROR', err.message, 500);
    }
  });

  router.get('/system/info', async (_req: Request, res: Response) => {
    try {
      await getDb();
      const stats = queryOne<{ count: number; total_bytes: number }>(
        'SELECT COUNT(*) as count, COALESCE(SUM(size_bytes), 0) as total_bytes FROM videos WHERE is_available = 1'
      );
      const folderCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM folders');

      sendSuccess(res, {
        platform: process.platform,
        hostname: os.hostname(),
        nodeVersion: process.version,
        freeMemBytes: os.freemem(),
        totalMemBytes: os.totalmem(),
        dataDir: path.resolve(process.cwd(), 'data'),
        totalVideos: stats?.count || 0,
        totalStorageBytes: stats?.total_bytes || 0,
        totalFolders: folderCount?.count || 0,
        scanState: getScanState()
      });
    } catch (err: any) {
      sendError(res, 'SYSTEM_INFO_ERROR', err.message, 500);
    }
  });

  router.post('/system/sample-media', async (_req: Request, res: Response) => {
    try {
      const result = await createSampleMediaIfEmpty();
      sendSuccess(res, result);
    } catch (err: any) {
      sendError(res, 'SAMPLE_MEDIA_ERROR', err.message, 500);
    }
  });

  // --- FOLDERS ---
  router.get('/folders', async (_req: Request, res: Response) => {
    try {
      await getDb();
      const folders = queryAll<FolderRecord>('SELECT * FROM folders ORDER BY created_at DESC');
      sendSuccess(res, folders);
    } catch (err: any) {
      sendError(res, 'FOLDERS_FETCH_ERROR', err.message, 500);
    }
  });

  router.post('/folders', async (req: Request, res: Response) => {
    try {
      const { path: folderPath, name, folder_type = 'local' } = req.body;
      if (!folderPath || typeof folderPath !== 'string') {
        return sendError(res, 'INVALID_PATH', 'A valid path or ID must be provided.');
      }

      const trimmedPath = folderPath.trim();
      let resolvedPath = trimmedPath;
      
      // For local folders, resolve and check fs
      if (folder_type === 'local') {
        resolvedPath = path.resolve(trimmedPath);

        // Validate folder exists and is a directory
        if (!fs.existsSync(resolvedPath)) {
          return sendError(res, 'FOLDER_NOT_FOUND', `Directory does not exist: "${resolvedPath}"`);
        }

        const stat = fs.statSync(resolvedPath);
        if (!stat.isDirectory()) {
          return sendError(res, 'NOT_A_DIRECTORY', `Specified path is not a directory: "${resolvedPath}"`);
        }

        // Check readable
        try {
          fs.accessSync(resolvedPath, fs.constants.R_OK);
        } catch {
          return sendError(res, 'PERMISSION_DENIED', `Permission denied reading folder: "${resolvedPath}"`);
        }
      } else if (folder_type === 'http') {
        if (!/^https?:\/\//i.test(trimmedPath)) {
          resolvedPath = `http://${trimmedPath}`;
        }
        try {
          new URL(resolvedPath);
        } catch {
          return sendError(res, 'INVALID_URL', `Specified URL is not valid: "${folderPath}"`);
        }
      }

      await getDb();
      const existing = queryOne<FolderRecord>('SELECT id FROM folders WHERE path = ? AND folder_type = ?', [resolvedPath, folder_type]);
      if (existing) {
        return sendError(res, 'DUPLICATE_FOLDER', `This folder/playlist is already registered in CineVault.`);
      }

      let defaultName = resolvedPath;
      if (folder_type === 'youtube') defaultName = 'YouTube Playlist';
      if (folder_type === 'gdrive') defaultName = 'Google Drive Folder';
      if (folder_type === 'http') {
        try {
          const u = new URL(resolvedPath);
          const cleanPath = u.pathname.split('/').filter(Boolean).pop();
          defaultName = cleanPath ? decodeURIComponent(cleanPath) : u.hostname;
        } catch {
          defaultName = 'Remote Web Directory';
        }
      }
      
      const folderName = (name && typeof name === 'string' && name.trim()) 
        ? name.trim() 
        : (folder_type === 'local' ? path.basename(resolvedPath) || resolvedPath : defaultName);

      const now = new Date().toISOString();
      const result = runQuery(
        `INSERT INTO folders (name, path, folder_type, enabled, created_at, updated_at, scan_status, video_count)
         VALUES (?, ?, ?, 1, ?, ?, 'idle', 0)`,
        [folderName, resolvedPath, folder_type, now, now]
      );

      const newFolder = queryOne<FolderRecord>('SELECT * FROM folders WHERE id = ?', [result.lastInsertRowid]);
      
      // Automatically trigger background fetching for newly added folder/server
      if (newFolder) {
        scanFolder(newFolder.id).catch((scanErr: any) => {
          console.warn(`[Auto-Scan Note] Folder ${newFolder.id}:`, scanErr.message);
        });
      }

      sendSuccess(res, newFolder, 201);
    } catch (err: any) {
      sendError(res, 'FOLDER_ADD_ERROR', err.message, 500);
    }
  });

  router.patch('/folders/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return sendError(res, 'INVALID_ID', 'Invalid folder ID.');

      const { name, enabled } = req.body;
      await getDb();
      const folder = queryOne<FolderRecord>('SELECT * FROM folders WHERE id = ?', [id]);
      if (!folder) return sendError(res, 'FOLDER_NOT_FOUND', 'Folder not found.', 404);

      const updates: string[] = [];
      const params: any[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        params.push(String(name).trim());
      }
      if (enabled !== undefined) {
        updates.push('enabled = ?');
        params.push(enabled ? 1 : 0);
      }

      if (updates.length > 0) {
        updates.push('updated_at = ?');
        params.push(new Date().toISOString());
        params.push(id);

        runQuery(`UPDATE folders SET ${updates.join(', ')} WHERE id = ?`, params);
      }

      const updated = queryOne<FolderRecord>('SELECT * FROM folders WHERE id = ?', [id]);
      sendSuccess(res, updated);
    } catch (err: any) {
      sendError(res, 'FOLDER_UPDATE_ERROR', err.message, 500);
    }
  });

  router.delete('/folders/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return sendError(res, 'INVALID_ID', 'Invalid folder ID.');

      await getDb();
      const folder = queryOne<FolderRecord>('SELECT * FROM folders WHERE id = ?', [id]);
      if (!folder) return sendError(res, 'FOLDER_NOT_FOUND', 'Folder not found.', 404);

      // Deleting folder will cascade delete video and progress records in SQLite
      runQuery('DELETE FROM folders WHERE id = ?', [id]);
      runQuery('DELETE FROM videos WHERE folder_id = ?', [id]);

      sendSuccess(res, { message: `Folder "${folder.name}" removed from library. Local files were preserved.` });
    } catch (err: any) {
      sendError(res, 'FOLDER_DELETE_ERROR', err.message, 500);
    }
  });

  router.post('/folders/:id/scan', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return sendError(res, 'INVALID_ID', 'Invalid folder ID.');

      const isBackground = req.query.background === 'true' || req.body?.background === true;
      if (isBackground) {
        const progress = getScanProgress();
        if (progress.isScanning && progress.folderId === id) {
          return sendSuccess(res, { started: true, alreadyRunning: true, folderId: id, message: 'Scan already in progress for this folder' }, 200);
        }

        scanFolder(id).catch((err: any) => {
          console.warn(`[Background Scan Note] Folder ${id}:`, err.message);
        });
        return sendSuccess(res, { started: true, folderId: id, message: 'Background scan started' }, 202);
      }

      const stats = await scanFolder(id);
      sendSuccess(res, stats);
    } catch (err: any) {
      sendError(res, 'SCAN_FAILED', err.message, 400);
    }
  });

  // --- VIDEOS ---
  router.get('/videos', async (req: Request, res: Response) => {
    try {
      await getDb();
      const {
        q,
        folder_id,
        sort_by = 'recent',
        sort_order = 'desc',
        filter = 'all',
        limit,
        offset = '0'
      } = req.query;

      let sql = `
        SELECT 
          v.*,
          f.name as folder_name,
          p.position_seconds,
          p.completed,
          CASE WHEN fav.id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
        FROM videos v
        JOIN folders f ON v.folder_id = f.id
        LEFT JOIN playback_progress p ON v.id = p.video_id
        LEFT JOIN favorites fav ON v.id = fav.video_id
        WHERE v.is_available = 1 AND f.enabled = 1
          AND (
            v.mime_type LIKE 'video/%' 
            OR LOWER(v.extension) IN ('.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v', '.mkv', '.avi', '.3gp', '.ts', '.mpeg', '.mpg', '.wmv', '.flv', '.youtube', '.gdrive')
          )
          AND LOWER(v.extension) NOT IN ('.srt', '.vtt', '.sub', '.idx', '.ass', '.ssa', '.txt', '.nfo', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp3', '.wav', '.flac', '.aac', '.m4a', '.pdf', '.zip', '.rar', '.exe', '.json', '.xml', '.html')
      `;
      const params: any[] = [];

      if (folder_id) {
        sql += ' AND v.folder_id = ?';
        params.push(parseInt(String(folder_id), 10));
      }

      if (q && typeof q === 'string' && q.trim()) {
        const searchTerm = `%${q.trim()}%`;
        sql += ' AND (v.title LIKE ? OR v.filename LIKE ? OR v.relative_path LIKE ? OR f.name LIKE ?)';
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (filter === 'watched') {
        sql += ' AND p.completed = 1';
      } else if (filter === 'unwatched') {
        sql += ' AND (p.completed IS NULL OR p.completed = 0)';
      } else if (filter === 'continue') {
        sql += ' AND p.position_seconds > 5 AND (p.completed IS NULL OR p.completed = 0)';
      } else if (filter === 'favorites') {
        sql += ' AND fav.id IS NOT NULL';
      }

      // Sorting
      const order = String(sort_order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      switch (sort_by) {
        case 'name':
        case 'title':
          sql += ` ORDER BY v.title ${order}`;
          break;
        case 'size':
          sql += ` ORDER BY v.size_bytes ${order}`;
          break;
        case 'duration':
          sql += ` ORDER BY COALESCE(v.duration_seconds, 0) ${order}`;
          break;
        case 'played':
          sql += ` ORDER BY COALESCE(p.updated_at, '') ${order}`;
          break;
        case 'recent':
        default:
          sql += ` ORDER BY v.created_at_db ${order}`;
          break;
      }

      const numLimit = limit !== undefined
        ? Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 5000)
        : 5000;
      const numOffset = Math.max(parseInt(String(offset), 10) || 0, 0);

      sql += ` LIMIT ${numLimit} OFFSET ${numOffset}`;

      const videos = queryAll<VideoRecord>(sql, params)
        .filter(v => isSupportedVideo(v.extension) || v.mime_type?.startsWith('video/'))
        .map(v => ({
          ...v,
          is_browser_playable: isNativeBrowserPlayable(v.extension)
        }));

      sendSuccess(res, videos);
    } catch (err: any) {
      sendError(res, 'VIDEOS_FETCH_ERROR', err.message, 500);
    }
  });

  router.get('/videos/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return sendError(res, 'INVALID_ID', 'Invalid video ID.');

      await getDb();
      const sql = `
        SELECT 
          v.*,
          f.name as folder_name,
          f.path as folder_path,
          p.position_seconds,
          p.completed,
          CASE WHEN fav.id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
        FROM videos v
        JOIN folders f ON v.folder_id = f.id
        LEFT JOIN playback_progress p ON v.id = p.video_id
        LEFT JOIN favorites fav ON v.id = fav.video_id
        WHERE v.id = ?
      `;

      const video = queryOne<VideoRecord>(sql, [id]);
      if (!video) return sendError(res, 'VIDEO_NOT_FOUND', 'Video not found in library.', 404);

      // Verify file still exists on disk
      const fileExists = fs.existsSync(video.absolute_path);
      const enriched = {
        ...video,
        file_exists: fileExists,
        is_browser_playable: isNativeBrowserPlayable(video.extension)
      };

      sendSuccess(res, enriched);
    } catch (err: any) {
      sendError(res, 'VIDEO_FETCH_ERROR', err.message, 500);
    }
  });

  router.get('/videos/:id/stream', (req: Request, res: Response) => {
    handleVideoStream(req, res);
  });
  router.get('/videos/:id/stream/:filename', (req: Request, res: Response) => {
    handleVideoStream(req, res);
  });

  router.patch('/videos/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return sendError(res, 'INVALID_ID', 'Invalid video ID.');

      const { title, is_favorite } = req.body;
      await getDb();

      if (title !== undefined) {
        runQuery('UPDATE videos SET title = ?, updated_at_db = ? WHERE id = ?', [
          String(title).trim(),
          new Date().toISOString(),
          id
        ]);
      }

      if (is_favorite !== undefined) {
        if (is_favorite) {
          const favExists = queryOne('SELECT id FROM favorites WHERE video_id = ?', [id]);
          if (!favExists) {
            runQuery('INSERT INTO favorites (video_id, created_at) VALUES (?, ?)', [
              id,
              new Date().toISOString()
            ]);
          }
        } else {
          runQuery('DELETE FROM favorites WHERE video_id = ?', [id]);
        }
      }

      const updated = queryOne<VideoRecord>('SELECT * FROM videos WHERE id = ?', [id]);
      sendSuccess(res, updated);
    } catch (err: any) {
      sendError(res, 'VIDEO_UPDATE_ERROR', err.message, 500);
    }
  });

  router.delete('/videos/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return sendError(res, 'INVALID_ID', 'Invalid video ID.');

      await getDb();
      runQuery('DELETE FROM videos WHERE id = ?', [id]);
      runQuery('DELETE FROM playback_progress WHERE video_id = ?', [id]);
      runQuery('DELETE FROM favorites WHERE video_id = ?', [id]);

      sendSuccess(res, { message: 'Video removed from library.' });
    } catch (err: any) {
      sendError(res, 'VIDEO_DELETE_ERROR', err.message, 500);
    }
  });

  // --- PROGRESS ---
  router.get('/videos/:id/progress', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return sendError(res, 'INVALID_ID', 'Invalid video ID.');

      await getDb();
      const progress = queryOne<PlaybackProgressRecord>(
        'SELECT * FROM playback_progress WHERE video_id = ?',
        [id]
      );
      sendSuccess(res, progress || { video_id: id, position_seconds: 0, completed: 0 });
    } catch (err: any) {
      sendError(res, 'PROGRESS_FETCH_ERROR', err.message, 500);
    }
  });

  router.put('/videos/:id/progress', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return sendError(res, 'INVALID_ID', 'Invalid video ID.');

      const { position_seconds, duration_seconds, completed } = req.body;
      const pos = Math.max(0, parseFloat(position_seconds) || 0);
      const dur = duration_seconds ? Math.max(0, parseFloat(duration_seconds)) : null;
      const isCompleted = completed ? 1 : dur && pos > 0 && pos >= dur * 0.9 ? 1 : 0;
      const now = new Date().toISOString();

      await getDb();
      const existing = queryOne('SELECT id FROM playback_progress WHERE video_id = ?', [id]);

      if (existing) {
        runQuery(
          `UPDATE playback_progress 
           SET position_seconds = ?, duration_seconds = ?, completed = ?, updated_at = ? 
           WHERE video_id = ?`,
          [pos, dur, isCompleted, now, id]
        );
      } else {
        runQuery(
          `INSERT INTO playback_progress (video_id, position_seconds, duration_seconds, completed, updated_at) 
           VALUES (?, ?, ?, ?, ?)`,
          [id, pos, dur, isCompleted, now]
        );
      }

      // Update duration in videos table if known
      if (dur && dur > 0) {
        runQuery('UPDATE videos SET duration_seconds = ? WHERE id = ? AND duration_seconds IS NULL', [dur, id]);
      }

      sendSuccess(res, { video_id: id, position_seconds: pos, duration_seconds: dur, completed: isCompleted });
    } catch (err: any) {
      sendError(res, 'PROGRESS_UPDATE_ERROR', err.message, 500);
    }
  });

  router.delete('/videos/:id/progress', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return sendError(res, 'INVALID_ID', 'Invalid video ID.');

      await getDb();
      runQuery('DELETE FROM playback_progress WHERE video_id = ?', [id]);
      sendSuccess(res, { message: 'Playback progress reset.' });
    } catch (err: any) {
      sendError(res, 'PROGRESS_DELETE_ERROR', err.message, 500);
    }
  });

  // --- SEARCH ---
  router.get('/search', async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q || '').trim();
      if (!q) {
        return sendSuccess(res, { query: '', count: 0, videos: [] });
      }

      await getDb();
      const searchTerm = `%${q}%`;
      const sql = `
        SELECT 
          v.*,
          f.name as folder_name,
          p.position_seconds,
          p.completed,
          CASE WHEN fav.id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
        FROM videos v
        JOIN folders f ON v.folder_id = f.id
        LEFT JOIN playback_progress p ON v.id = p.video_id
        LEFT JOIN favorites fav ON v.id = fav.video_id
        WHERE v.is_available = 1 AND f.enabled = 1
          AND (
            v.mime_type LIKE 'video/%' 
            OR LOWER(v.extension) IN ('.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v', '.mkv', '.avi', '.3gp', '.ts', '.mpeg', '.mpg', '.wmv', '.flv', '.youtube', '.gdrive')
          )
          AND LOWER(v.extension) NOT IN ('.srt', '.vtt', '.sub', '.idx', '.ass', '.ssa', '.txt', '.nfo', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp3', '.wav', '.flac', '.aac', '.m4a', '.pdf', '.zip', '.rar', '.exe', '.json', '.xml', '.html')
          AND (v.title LIKE ? OR v.filename LIKE ? OR v.relative_path LIKE ? OR f.name LIKE ? OR v.extension LIKE ?)
        ORDER BY v.title ASC
        LIMIT 100
      `;

      const results = queryAll<VideoRecord>(sql, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm])
        .filter(v => isSupportedVideo(v.extension) || v.mime_type?.startsWith('video/'))
        .map(v => ({
          ...v,
          is_browser_playable: isNativeBrowserPlayable(v.extension)
        }));

      sendSuccess(res, { query: q, count: results.length, videos: results });
    } catch (err: any) {
      sendError(res, 'SEARCH_ERROR', err.message, 500);
    }
  });

  // --- SETTINGS ---
  router.get('/settings', async (_req: Request, res: Response) => {
    try {
      await getDb();
      const rows = queryAll<{ key: string; value: string }>('SELECT key, value FROM settings');
      const settingsObj: Record<string, string> = {};
      for (const row of rows) {
        settingsObj[row.key] = row.value;
      }
      sendSuccess(res, settingsObj);
    } catch (err: any) {
      sendError(res, 'SETTINGS_FETCH_ERROR', err.message, 500);
    }
  });

  router.patch('/settings', async (req: Request, res: Response) => {
    try {
      const updates = req.body;
      if (!updates || typeof updates !== 'object') {
        return sendError(res, 'INVALID_BODY', 'Settings body must be an object.');
      }

      await getDb();
      const now = new Date().toISOString();

      for (const [key, value] of Object.entries(updates)) {
        const valStr = String(value);
        const exists = queryOne('SELECT key FROM settings WHERE key = ?', [key]);
        if (exists) {
          runQuery('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?', [valStr, now, key]);
        } else {
          runQuery('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)', [key, valStr, now]);
        }
      }

      const rows = queryAll<{ key: string; value: string }>('SELECT key, value FROM settings');
      const settingsObj: Record<string, string> = {};
      for (const row of rows) {
        settingsObj[row.key] = row.value;
      }
      sendSuccess(res, settingsObj);
    } catch (err: any) {
      sendError(res, 'SETTINGS_UPDATE_ERROR', err.message, 500);
    }
  });

  // --- SCAN PROGRESS & STATUS ---
  router.get('/scan/progress', (_req: Request, res: Response) => {
    try {
      const progress = getScanProgress();
      sendSuccess(res, progress);
    } catch (err: any) {
      sendError(res, 'SCAN_PROGRESS_ERROR', err.message, 500);
    }
  });

  router.get('/scan/status', (_req: Request, res: Response) => {
    try {
      const progress = getScanProgress();
      sendSuccess(res, progress);
    } catch (err: any) {
      sendError(res, 'SCAN_STATUS_ERROR', err.message, 500);
    }
  });

  // --- LIBRARY SCAN & STATS ---
  router.post('/library/scan', async (req: Request, res: Response) => {
    try {
      const isBackground = req.query.background === 'true' || req.body?.background === true;
      if (isBackground) {
        const progress = getScanProgress();
        if (progress.isScanning) {
          return sendSuccess(res, { started: false, message: 'Scan already in progress' });
        }
        scanAllFolders().catch((err: any) => {
          console.warn('[Background Library Scan Error]:', err.message);
        });
        return sendSuccess(res, { started: true, message: 'Background library scan started' }, 202);
      }

      const stats = await scanAllFolders();
      sendSuccess(res, stats);
    } catch (err: any) {
      sendError(res, 'LIBRARY_SCAN_ERROR', err.message, 400);
    }
  });

  router.get('/library/stats', async (_req: Request, res: Response) => {
    try {
      await getDb();
      const videoStats = queryOne<{ count: number; total_bytes: number; total_duration: number }>(`
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM(size_bytes), 0) as total_bytes,
          COALESCE(SUM(duration_seconds), 0) as total_duration
        FROM videos WHERE is_available = 1
          AND (
            mime_type LIKE 'video/%' 
            OR LOWER(extension) IN ('.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v', '.mkv', '.avi', '.3gp', '.ts', '.mpeg', '.mpg', '.wmv', '.flv', '.youtube', '.gdrive')
          )
          AND LOWER(extension) NOT IN ('.srt', '.vtt', '.sub', '.idx', '.ass', '.ssa', '.txt', '.nfo', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp3', '.wav', '.flac', '.aac', '.m4a', '.pdf', '.zip', '.rar', '.exe', '.json', '.xml', '.html')
      `);

      const folderStats = queryOne<{ count: number; enabled_count: number }>(`
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END), 0) as enabled_count
        FROM folders
      `);

      const progressStats = queryOne<{ watched_count: number; in_progress_count: number }>(`
        SELECT 
          COALESCE(SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END), 0) as watched_count,
          COALESCE(SUM(CASE WHEN position_seconds > 5 AND completed = 0 THEN 1 ELSE 0 END), 0) as in_progress_count
        FROM playback_progress
      `);

      const favoritesStats = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM favorites');

      sendSuccess(res, {
        totalVideos: videoStats?.count || 0,
        totalStorageBytes: videoStats?.total_bytes || 0,
        totalDurationSeconds: videoStats?.total_duration || 0,
        totalFolders: folderStats?.count || 0,
        enabledFolders: folderStats?.enabled_count || 0,
        watchedVideos: progressStats?.watched_count || 0,
        inProgressVideos: progressStats?.in_progress_count || 0,
        favoriteVideos: favoritesStats?.count || 0
      });
    } catch (err: any) {
      sendError(res, 'STATS_FETCH_ERROR', err.message, 500);
    }
  });

  router.post('/library/cleanup', async (_req: Request, res: Response) => {
    try {
      await getDb();
      const allVideos = queryAll<VideoRecord>('SELECT id, absolute_path, title FROM videos');
      let removedCount = 0;

      for (const vid of allVideos) {
        if (!fs.existsSync(vid.absolute_path)) {
          runQuery('DELETE FROM videos WHERE id = ?', [vid.id]);
          removedCount++;
        }
      }

      sendSuccess(res, {
        checked: allVideos.length,
        removedCount,
        message: `Library cleanup completed. Removed ${removedCount} stale entries.`
      });
    } catch (err: any) {
      sendError(res, 'CLEANUP_ERROR', err.message, 500);
    }
  });

  router.post('/library/reset', async (req: Request, res: Response) => {
    try {
      const { confirm } = req.body;
      if (confirm !== 'RESET' && confirm !== 'RESET_CINEVAULT_LIBRARY') {
        return sendError(res, 'CONFIRMATION_REQUIRED', 'Type "RESET" to confirm library reset.');
      }

      await getDb();
      runQuery('DELETE FROM favorites');
      runQuery('DELETE FROM playback_progress');
      runQuery('DELETE FROM videos');
      runQuery('DELETE FROM folders');

      resetScanProgress();

      sendSuccess(res, { message: 'Library database and all directories have been reset. Local files on disk were not modified.' });
    } catch (err: any) {
      sendError(res, 'RESET_ERROR', err.message, 500);
    }
  });

  return router;
}
