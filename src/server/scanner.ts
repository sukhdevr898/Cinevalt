import fs from 'fs/promises';
import path from 'path';
import { getDb, queryAll, queryOne, runQuery, FolderRecord, VideoRecord } from './database.js';
import { isSupportedVideo, getMimeType, deriveTitleFromFilename } from './mimeTypes.js';
import { scanYouTubePlaylist, scanDriveFolder } from './cloudScanner.js';

export interface ScanStats {
  folderId?: number;
  folderPath?: string;
  totalFolders: number;
  totalFilesChecked: number;
  videosFound: number;
  newVideos: number;
  updatedVideos: number;
  removedVideos: number;
  skippedFiles: number;
  errors: string[];
  scanDurationMs: number;
  lastScanTimestamp: string;
}

let isScanning = false;
let currentScanFolderId: number | null = null;

export function getScanState() {
  return {
    isScanning,
    currentScanFolderId
  };
}

export async function scanFolder(folderId: number): Promise<ScanStats> {
  if (isScanning) {
    throw new Error('A scan is already in progress. Please wait for it to complete.');
  }

  isScanning = true;
  currentScanFolderId = folderId;
  const startTime = Date.now();

  const stats: ScanStats = {
    folderId,
    totalFolders: 1,
    totalFilesChecked: 0,
    videosFound: 0,
    newVideos: 0,
    updatedVideos: 0,
    removedVideos: 0,
    skippedFiles: 0,
    errors: [],
    scanDurationMs: 0,
    lastScanTimestamp: new Date().toISOString()
  };

  try {
    await getDb();
    const folder = queryOne<FolderRecord>('SELECT * FROM folders WHERE id = ?', [folderId]);
    if (!folder) {
      throw new Error(`Folder with ID ${folderId} not found.`);
    }

    stats.folderPath = folder.path;

    if (folder.folder_type === 'youtube') {
      runQuery("UPDATE folders SET scan_status = 'scanning', updated_at = ? WHERE id = ?", [new Date().toISOString(), folderId]);
      const ytStats = await scanYouTubePlaylist(folderId, folder.path);
      stats.newVideos = ytStats.newVideos;
      stats.updatedVideos = ytStats.updatedVideos;
      stats.videosFound = ytStats.videosFound;
      isScanning = false;
      currentScanFolderId = null;
      stats.scanDurationMs = Date.now() - startTime;
      return stats;
    } else if (folder.folder_type === 'gdrive') {
      runQuery("UPDATE folders SET scan_status = 'scanning', updated_at = ? WHERE id = ?", [new Date().toISOString(), folderId]);
      const driveStats = await scanDriveFolder(folderId, folder.path);
      stats.newVideos = driveStats.newVideos;
      stats.updatedVideos = driveStats.updatedVideos;
      stats.videosFound = driveStats.videosFound;
      isScanning = false;
      currentScanFolderId = null;
      stats.scanDurationMs = Date.now() - startTime;
      return stats;
    }

    // Check directory accessibility
    try {
      const dirStat = await fs.stat(folder.path);
      if (!dirStat.isDirectory()) {
        throw new Error(`Path is not a directory: ${folder.path}`);
      }
    } catch (err: any) {
      runQuery("UPDATE folders SET scan_status = 'error', updated_at = ? WHERE id = ?", [
        new Date().toISOString(),
        folderId
      ]);
      throw new Error(`Cannot access folder ${folder.path}: ${err.message}`);
    }

    runQuery("UPDATE folders SET scan_status = 'scanning', updated_at = ? WHERE id = ?", [
      new Date().toISOString(),
      folderId
    ]);

    // Track active file paths found during this scan to identify removed videos
    const activePaths = new Set<string>();

    await scanDirectoryRecursive(folder.path, folder.path, folder.id, stats, activePaths);

    // Check for removed videos that were previously in this folder
    const existingVideos = queryAll<VideoRecord>(
      'SELECT id, absolute_path FROM videos WHERE folder_id = ?',
      [folder.id]
    );

    for (const vid of existingVideos) {
      if (!activePaths.has(vid.absolute_path)) {
        // Video file was deleted or moved
        runQuery('DELETE FROM videos WHERE id = ?', [vid.id]);
        stats.removedVideos++;
      }
    }

    const now = new Date().toISOString();
    runQuery(
      `UPDATE folders 
       SET scan_status = 'idle', 
           last_scanned_at = ?, 
           video_count = ?, 
           updated_at = ? 
       WHERE id = ?`,
      [now, stats.videosFound, now, folder.id]
    );
  } catch (err: any) {
    stats.errors.push(err.message || 'Unknown scan error');
    runQuery("UPDATE folders SET scan_status = 'error', updated_at = ? WHERE id = ?", [
      new Date().toISOString(),
      folderId
    ]);
    throw err;
  } finally {
    isScanning = false;
    currentScanFolderId = null;
    stats.scanDurationMs = Date.now() - startTime;
  }

  return stats;
}

export async function scanAllFolders(): Promise<ScanStats> {
  if (isScanning) {
    throw new Error('A scan is already in progress. Please wait for it to complete.');
  }

  await getDb();
  const folders = queryAll<FolderRecord>('SELECT * FROM folders WHERE enabled = 1');

  const combinedStats: ScanStats = {
    totalFolders: 0,
    totalFilesChecked: 0,
    videosFound: 0,
    newVideos: 0,
    updatedVideos: 0,
    removedVideos: 0,
    skippedFiles: 0,
    errors: [],
    scanDurationMs: 0,
    lastScanTimestamp: new Date().toISOString()
  };

  const startTime = Date.now();

  for (const folder of folders) {
    try {
      const stats = await scanFolder(folder.id);
      combinedStats.totalFolders += stats.totalFolders;
      combinedStats.totalFilesChecked += stats.totalFilesChecked;
      combinedStats.videosFound += stats.videosFound;
      combinedStats.newVideos += stats.newVideos;
      combinedStats.updatedVideos += stats.updatedVideos;
      combinedStats.removedVideos += stats.removedVideos;
      combinedStats.skippedFiles += stats.skippedFiles;
      combinedStats.errors.push(...stats.errors);
    } catch (err: any) {
      combinedStats.errors.push(`Error scanning ${folder.name}: ${err.message}`);
    }
  }

  combinedStats.scanDurationMs = Date.now() - startTime;
  return combinedStats;
}

async function scanDirectoryRecursive(
  currentPath: string,
  rootFolderPath: string,
  folderId: number,
  stats: ScanStats,
  activePaths: Set<string>
) {
  let entries;
  try {
    entries = await fs.readdir(currentPath, { withFileTypes: true });
  } catch (err: any) {
    stats.errors.push(`Cannot read directory ${currentPath}: ${err.message}`);
    return;
  }

  for (const entry of entries) {
    // Ignore hidden files and system dirs
    if (entry.name.startsWith('.') || entry.name.startsWith('$') || entry.name === 'node_modules' || entry.name === 'System Volume Information') {
      stats.skippedFiles++;
      continue;
    }

    const fullPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      stats.totalFolders++;
      await scanDirectoryRecursive(fullPath, rootFolderPath, folderId, stats, activePaths);
    } else if (entry.isFile()) {
      stats.totalFilesChecked++;

      if (!isSupportedVideo(entry.name)) {
        stats.skippedFiles++;
        continue;
      }

      stats.videosFound++;
      activePaths.add(fullPath);

      try {
        const fileStat = await fs.stat(fullPath);
        const relativePath = path.relative(rootFolderPath, fullPath);
        const ext = path.extname(entry.name).toLowerCase();
        const mimeType = getMimeType(entry.name);
        const title = deriveTitleFromFilename(entry.name);
        const modifiedAt = fileStat.mtime.toISOString();
        const createdAt = fileStat.birthtime.toISOString();
        const sizeBytes = fileStat.size;

        // Check if video already exists in database
        const existing = queryOne<VideoRecord>(
          'SELECT id, size_bytes, modified_at FROM videos WHERE absolute_path = ?',
          [fullPath]
        );

        const now = new Date().toISOString();

        if (existing) {
          // If size or modification time changed, update it
          if (existing.size_bytes !== sizeBytes || existing.modified_at !== modifiedAt) {
            runQuery(
              `UPDATE videos 
               SET size_bytes = ?, modified_at = ?, is_available = 1, updated_at_db = ? 
               WHERE id = ?`,
              [sizeBytes, modifiedAt, now, existing.id]
            );
            stats.updatedVideos++;
          }
        } else {
          // Insert new video
          runQuery(
            `INSERT INTO videos (
              folder_id, absolute_path, relative_path, filename, title,
              extension, mime_type, size_bytes, modified_at, created_at,
              is_available, created_at_db, updated_at_db
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [
              folderId,
              fullPath,
              relativePath,
              entry.name,
              title,
              ext,
              mimeType,
              sizeBytes,
              modifiedAt,
              createdAt,
              now,
              now
            ]
          );
          stats.newVideos++;
        }
      } catch (fileErr: any) {
        stats.errors.push(`Error processing ${entry.name}: ${fileErr.message}`);
      }
    }
  }
}
