import fs from 'fs/promises';
import path from 'path';
import { getDb, queryAll, queryOne, runQuery, FolderRecord, VideoRecord } from './database.js';
import { isSupportedVideo, getMimeType, deriveTitleFromFilename } from './mimeTypes.js';
import { scanYouTubePlaylist, scanDriveFolder } from './cloudScanner.js';
import { scanHttpDirectory } from './httpScanner.js';
import { extractVideoMetadata } from './metadataExtractor.js';
import { getScannerSettings, ScannerSettings } from './scannerSettings.js';

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

export interface ScanProgress {
  isScanning: boolean;
  folderId: number | null;
  folderName: string | null;
  folderPath: string | null;
  folderType: 'local' | 'youtube' | 'gdrive' | 'http' | null;
  status: 'idle' | 'scanning' | 'completed' | 'error';
  progressPercent: number;
  message: string;
  currentFile: string | null;
  filesChecked: number;
  videosFound: number;
  newVideos: number;
  updatedVideos: number;
  removedVideos: number;
  errors: string[];
  startTime: number | null;
  elapsedSeconds: number;
  completedAt: string | null;
}

let scanProgress: ScanProgress = {
  isScanning: false,
  folderId: null,
  folderName: null,
  folderPath: null,
  folderType: null,
  status: 'idle',
  progressPercent: 0,
  message: '',
  currentFile: null,
  filesChecked: 0,
  videosFound: 0,
  newVideos: 0,
  updatedVideos: 0,
  removedVideos: 0,
  errors: [],
  startTime: null,
  elapsedSeconds: 0,
  completedAt: null
};

export function resetScanProgress() {
  scanProgress = {
    isScanning: false,
    folderId: null,
    folderName: null,
    folderPath: null,
    folderType: null,
    status: 'idle',
    progressPercent: 0,
    message: '',
    currentFile: null,
    filesChecked: 0,
    videosFound: 0,
    newVideos: 0,
    updatedVideos: 0,
    removedVideos: 0,
    errors: [],
    startTime: null,
    elapsedSeconds: 0,
    completedAt: null
  };
}

export function getScanProgress(): ScanProgress {
  if (scanProgress.isScanning && scanProgress.startTime) {
    scanProgress.elapsedSeconds = Math.round((Date.now() - scanProgress.startTime) / 1000);
  }
  return { ...scanProgress };
}

export function updateScanProgress(updates: Partial<ScanProgress>) {
  Object.assign(scanProgress, updates);
  if (scanProgress.startTime && scanProgress.isScanning) {
    scanProgress.elapsedSeconds = Math.round((Date.now() - scanProgress.startTime) / 1000);
  }
}

export function getScanState() {
  return getScanProgress();
}

let scanQueuePromise: Promise<any> = Promise.resolve();

export function scanFolder(folderId: number): Promise<ScanStats> {
  if (!scanProgress.isScanning) {
    updateScanProgress({
      isScanning: true,
      status: 'scanning',
      message: 'Scan queued...',
      folderId,
      progressPercent: 0
    });
  }

  const runPromise = scanQueuePromise.then(async () => {
    try {
      return await executeScanFolder(folderId);
    } finally {
      // nothing needed since queue handles it
    }
  });

  scanQueuePromise = runPromise.catch(() => {});
  return runPromise;
}

async function executeScanFolder(folderId: number): Promise<ScanStats> {
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

    const scannerSettings = await getScannerSettings();

    stats.folderPath = folder.path;

    updateScanProgress({
      isScanning: true,
      folderId,
      folderName: folder.name,
      folderPath: folder.path,
      folderType: folder.folder_type,
      status: 'scanning',
      progressPercent: 5,
      message: `Starting fetch for "${folder.name}"...`,
      currentFile: null,
      filesChecked: 0,
      videosFound: 0,
      newVideos: 0,
      updatedVideos: 0,
      removedVideos: 0,
      errors: [],
      startTime,
      elapsedSeconds: 0,
      completedAt: null
    });

    if (folder.folder_type === 'youtube') {
      runQuery("UPDATE folders SET scan_status = 'scanning', updated_at = ? WHERE id = ?", [new Date().toISOString(), folderId]);
      const ytStats = await scanYouTubePlaylist(folderId, folder.path, (prog) => {
        updateScanProgress({
          ...prog,
          newVideos: prog.videosFound !== undefined ? prog.videosFound : scanProgress.newVideos
        });
      }, scannerSettings);
      stats.newVideos = ytStats.newVideos;
      stats.updatedVideos = ytStats.updatedVideos;
      stats.videosFound = ytStats.videosFound;
      stats.scanDurationMs = Date.now() - startTime;

      updateScanProgress({
        isScanning: false,
        status: 'completed',
        progressPercent: 100,
        message: `Fetched ${stats.videosFound} YouTube videos successfully.`,
        videosFound: stats.videosFound,
        newVideos: stats.newVideos,
        updatedVideos: stats.updatedVideos,
        completedAt: new Date().toISOString()
      });
      return stats;
    } else if (folder.folder_type === 'gdrive') {
      runQuery("UPDATE folders SET scan_status = 'scanning', updated_at = ? WHERE id = ?", [new Date().toISOString(), folderId]);
      const driveStats = await scanDriveFolder(folderId, folder.path, (prog) => {
        updateScanProgress({
          ...prog,
          newVideos: prog.videosFound !== undefined ? prog.videosFound : scanProgress.newVideos
        });
      }, scannerSettings);
      stats.newVideos = driveStats.newVideos;
      stats.updatedVideos = driveStats.updatedVideos;
      stats.videosFound = driveStats.videosFound;
      stats.scanDurationMs = Date.now() - startTime;

      updateScanProgress({
        isScanning: false,
        status: 'completed',
        progressPercent: 100,
        message: `Fetched ${stats.videosFound} Google Drive videos successfully.`,
        videosFound: stats.videosFound,
        newVideos: stats.newVideos,
        updatedVideos: stats.updatedVideos,
        completedAt: new Date().toISOString()
      });
      return stats;
    } else if (folder.folder_type === 'http') {
      runQuery("UPDATE folders SET scan_status = 'scanning', updated_at = ? WHERE id = ?", [new Date().toISOString(), folderId]);
      const httpStats = await scanHttpDirectory(folderId, folder.path, (prog) => {
        updateScanProgress({
          ...prog,
          filesChecked: prog.filesChecked !== undefined ? prog.filesChecked : scanProgress.filesChecked,
          videosFound: prog.videosFound !== undefined ? prog.videosFound : scanProgress.videosFound
        });
      }, scannerSettings);
      stats.newVideos = httpStats.newVideos;
      stats.updatedVideos = httpStats.updatedVideos;
      stats.removedVideos = httpStats.removedVideos;
      stats.videosFound = httpStats.videosFound;
      stats.scanDurationMs = Date.now() - startTime;

      updateScanProgress({
        isScanning: false,
        status: 'completed',
        progressPercent: 100,
        message: `Fetched ${stats.videosFound} remote videos from server successfully.`,
        videosFound: stats.videosFound,
        newVideos: stats.newVideos,
        updatedVideos: stats.updatedVideos,
        removedVideos: stats.removedVideos,
        completedAt: new Date().toISOString()
      });
      return stats;
    }

    // Check directory accessibility for local folders
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

    updateScanProgress({
      message: `Scanning local directory: ${folder.path}...`,
      progressPercent: 15
    });

    // Track active file paths found during this scan to identify removed videos
    const activePaths = new Set<string>();

    await scanDirectoryRecursive(folder.path, folder.path, folder.id, stats, activePaths, scannerSettings);

    updateScanProgress({
      message: 'Checking for removed or modified files in library...',
      progressPercent: 94
    });

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

    stats.scanDurationMs = Date.now() - startTime;

    updateScanProgress({
      isScanning: false,
      status: 'completed',
      progressPercent: 100,
      message: `Local scan completed! Found ${stats.videosFound} videos (${stats.newVideos} new, ${stats.updatedVideos} updated).`,
      filesChecked: stats.totalFilesChecked,
      videosFound: stats.videosFound,
      newVideos: stats.newVideos,
      updatedVideos: stats.updatedVideos,
      removedVideos: stats.removedVideos,
      completedAt: now
    });
  } catch (err: any) {
    stats.errors.push(err.message || 'Unknown scan error');
    runQuery("UPDATE folders SET scan_status = 'error', updated_at = ? WHERE id = ?", [
      new Date().toISOString(),
      folderId
    ]);

    updateScanProgress({
      isScanning: false,
      status: 'error',
      message: `Scan failed: ${err.message || 'Unknown error'}`,
      errors: [...scanProgress.errors, err.message || 'Unknown error']
    });

    throw err;
  }

  return stats;
}

export function scanAllFolders(): Promise<ScanStats> {
  if (!scanProgress.isScanning) {
    updateScanProgress({
      isScanning: true,
      status: 'scanning',
      message: 'Library scan queued...',
      folderId: null,
      progressPercent: 0
    });
  }

  const runPromise = scanQueuePromise.then(async () => {
    try {
      return await executeScanAllFolders();
    } finally {
      // handled by queue
    }
  });

  scanQueuePromise = runPromise.catch(() => {});
  return runPromise;
}

async function executeScanAllFolders(): Promise<ScanStats> {
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

  updateScanProgress({
    isScanning: true,
    folderId: null,
    folderName: 'All Active Folders',
    folderPath: null,
    folderType: null,
    status: 'scanning',
    progressPercent: 5,
    message: `Starting library scan for ${folders.length} active sources...`,
    currentFile: null,
    filesChecked: 0,
    videosFound: 0,
    newVideos: 0,
    updatedVideos: 0,
    removedVideos: 0,
    errors: [],
    startTime,
    elapsedSeconds: 0,
    completedAt: null
  });

  for (let idx = 0; idx < folders.length; idx++) {
    const folder = folders[idx];
    try {
      updateScanProgress({
        folderId: folder.id,
        folderName: folder.name,
        message: `Scanning source (${idx + 1}/${folders.length}): ${folder.name}`,
        progressPercent: Math.min(90, Math.round(((idx + 0.1) / folders.length) * 85) + 5)
      });

      scanProgress.isScanning = false;
      const stats = await executeScanFolder(folder.id);
      scanProgress.isScanning = true;

      combinedStats.totalFolders += stats.totalFolders;
      combinedStats.totalFilesChecked += stats.totalFilesChecked;
      combinedStats.videosFound += stats.videosFound;
      combinedStats.newVideos += stats.newVideos;
      combinedStats.updatedVideos += stats.updatedVideos;
      combinedStats.removedVideos += stats.removedVideos;
      combinedStats.skippedFiles += stats.skippedFiles;
      combinedStats.errors.push(...stats.errors);

      updateScanProgress({
        filesChecked: combinedStats.totalFilesChecked,
        videosFound: combinedStats.videosFound,
        newVideos: combinedStats.newVideos,
        updatedVideos: combinedStats.updatedVideos,
        removedVideos: combinedStats.removedVideos
      });
    } catch (err: any) {
      combinedStats.errors.push(`Error scanning ${folder.name}: ${err.message}`);
    }
  }

  combinedStats.scanDurationMs = Date.now() - startTime;

  updateScanProgress({
    isScanning: false,
    status: 'completed',
    progressPercent: 100,
    message: `Library scan complete! Found ${combinedStats.videosFound} videos across ${folders.length} sources.`,
    filesChecked: combinedStats.totalFilesChecked,
    videosFound: combinedStats.videosFound,
    newVideos: combinedStats.newVideos,
    updatedVideos: combinedStats.updatedVideos,
    removedVideos: combinedStats.removedVideos,
    completedAt: new Date().toISOString()
  });

  return combinedStats;
}

async function scanDirectoryRecursive(
  currentPath: string,
  rootFolderPath: string,
  folderId: number,
  stats: ScanStats,
  activePaths: Set<string>,
  scannerSettings?: ScannerSettings
) {
  const filesToProcess: { fullPath: string; name: string }[] = [];

  const minSizeBytes = scannerSettings?.minSizeMB ? scannerSettings.minSizeMB * 1024 * 1024 : 0;
  const minDurationSeconds = scannerSettings?.minDurationSeconds || 0;
  const maxFetchLimit = scannerSettings?.maxFetchLimit || 0;
  const allowedExts = scannerSettings?.allowedExtensions;

  async function collectFiles(dir: string) {
    if (maxFetchLimit > 0 && filesToProcess.length >= maxFetchLimit) return;
    
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err: any) {
      stats.errors.push(`Cannot read directory ${dir}: ${err.message}`);
      return;
    }

    for (const entry of entries) {
      if (maxFetchLimit > 0 && filesToProcess.length >= maxFetchLimit) break;
      
      if (entry.name.startsWith('.') || entry.name.startsWith('$') || entry.name === 'node_modules' || entry.name === 'System Volume Information') {
        stats.skippedFiles++;
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        stats.totalFolders++;
        await collectFiles(fullPath);
      } else if (entry.isFile()) {
        if (isSupportedVideo(entry.name, allowedExts)) {
          filesToProcess.push({ fullPath, name: entry.name });
        } else {
          stats.skippedFiles++;
        }
      }
    }
  }

  updateScanProgress({ message: 'Discovering local files...', progressPercent: 15 });
  await collectFiles(currentPath);

  let index = 0;
  const CONCURRENCY_LOCAL = 8;
  const totalFiles = filesToProcess.length;

  const workers = Array(CONCURRENCY_LOCAL).fill(0).map(async () => {
    while (index < filesToProcess.length) {
      if (!scanProgress.isScanning) break;

      const currentIndex = index++;
      const { fullPath, name } = filesToProcess[currentIndex];

      stats.totalFilesChecked++;
      const estimatedPercent = Math.min(92, 15 + Math.round((stats.totalFilesChecked / Math.max(1, totalFiles)) * 77));
      
      updateScanProgress({
        filesChecked: stats.totalFilesChecked,
        progressPercent: estimatedPercent,
        message: `Inspecting file ${stats.totalFilesChecked}/${totalFiles}: "${name}"...`,
        currentFile: name
      });

      try {
        const fileStat = await fs.stat(fullPath);
        const sizeBytes = fileStat.size;

        if (minSizeBytes > 0 && sizeBytes < minSizeBytes) {
          stats.skippedFiles++;
          continue;
        }

        const modifiedAt = fileStat.mtime.toISOString();
        const createdAt = fileStat.birthtime.toISOString();

        const existing = queryOne<VideoRecord>(
          'SELECT id, size_bytes, modified_at, duration_seconds, width, height, codec FROM videos WHERE absolute_path = ?',
          [fullPath]
        );

        let meta = { durationSeconds: 0, width: null as number | null, height: null as number | null, codec: null as string | null };
        let needsFfprobe = true;

        if (existing && existing.size_bytes === sizeBytes && existing.modified_at === modifiedAt) {
          needsFfprobe = false;
          meta.durationSeconds = existing.duration_seconds;
          meta.width = existing.width;
          meta.height = existing.height;
          meta.codec = existing.codec;
        }

        if (needsFfprobe) {
          meta = await extractVideoMetadata(fullPath, 5000);
          if (minDurationSeconds > 0 && meta.durationSeconds > 0 && meta.durationSeconds < minDurationSeconds) {
            stats.skippedFiles++;
            continue;
          }
        }

        stats.videosFound++;
        activePaths.add(fullPath);

        const relativePath = path.relative(rootFolderPath, fullPath);
        const ext = path.extname(name).toLowerCase();
        const mimeType = getMimeType(name);
        const title = deriveTitleFromFilename(name);
        const now = new Date().toISOString();

        if (existing) {
          runQuery(
            `UPDATE videos 
             SET size_bytes = ?, modified_at = ?, duration_seconds = COALESCE(?, duration_seconds),
                 width = COALESCE(?, width), height = COALESCE(?, height), codec = COALESCE(?, codec),
                 is_available = 1, updated_at_db = ? 
             WHERE id = ?`,
            [sizeBytes, modifiedAt, meta.durationSeconds || null, meta.width, meta.height, meta.codec, now, existing.id]
          );
          stats.updatedVideos++;
        } else {
          runQuery(
            `INSERT INTO videos (
              folder_id, absolute_path, relative_path, filename, title,
              extension, mime_type, size_bytes, duration_seconds, width, height, codec,
              modified_at, created_at, is_available, created_at_db, updated_at_db
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [
              folderId,
              fullPath,
              relativePath,
              name,
              title,
              ext,
              mimeType,
              sizeBytes,
              meta.durationSeconds || 0,
              meta.width,
              meta.height,
              meta.codec,
              modifiedAt,
              createdAt,
              now,
              now
            ]
          );
          stats.newVideos++;
        }

        updateScanProgress({
          newVideos: stats.newVideos,
          updatedVideos: stats.updatedVideos,
          videosFound: stats.videosFound
        });
      } catch (fileErr: any) {
        stats.errors.push(`Error processing ${name}: ${fileErr.message}`);
      }
    }
  });

  await Promise.all(workers);
}
