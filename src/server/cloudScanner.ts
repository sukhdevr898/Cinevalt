import youtubedl from 'youtube-dl-exec';
import { getDb, runQuery, queryOne, FolderRecord } from './database.js';
import { ScannerSettings } from './scannerSettings.js';

export async function scanYouTubePlaylist(
  folderId: number,
  playlistId: string,
  onProgress?: (update: { message?: string; progressPercent?: number; filesChecked?: number; videosFound?: number; currentFile?: string }) => void,
  scannerSettings?: ScannerSettings
): Promise<any> {
  let newVideos = 0;
  let updatedVideos = 0;
  const now = new Date().toISOString();

  const minDurationSeconds = scannerSettings?.minDurationSeconds || 0;
  const maxFetchLimit = scannerSettings?.maxFetchLimit || 0;

  onProgress?.({
    message: 'Connecting to YouTube playlist...',
    progressPercent: 15
  });

  const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
  
  const output: any = await youtubedl(playlistUrl, {
    dumpSingleJson: true,
    flatPlaylist: true,
    noWarnings: true
  });

  const items = output.entries || [];
  const total = items.length;

  onProgress?.({
    message: `Discovered ${total} items in YouTube playlist. Extracting videos...`,
    progressPercent: 30,
    filesChecked: total
  });
  
  for (let idx = 0; idx < items.length; idx++) {
    if (maxFetchLimit > 0 && (newVideos + updatedVideos) >= maxFetchLimit) break;
    
    const item = items[idx];
    const videoId = item.id;
    if (!videoId) continue;

    const duration = parseFloat(item.duration) || 0;
    if (minDurationSeconds > 0 && duration > 0 && duration < minDurationSeconds) {
      continue;
    }
    
    const title = item.title || 'Unknown Video';
    const thumbnail_url = item.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    
    const remote_url = `https://www.youtube.com/watch?v=${videoId}`;
    const absolute_path = remote_url;
    const filename = `${videoId}.youtube`;
    
    const percent = total > 0 ? Math.min(95, 30 + Math.round(((idx + 1) / total) * 65)) : 50;
    onProgress?.({
      message: `Processing YouTube video (${idx + 1}/${total}): "${title}"`,
      currentFile: title,
      progressPercent: percent,
      videosFound: newVideos + updatedVideos
    });

    const existing = queryOne('SELECT id FROM videos WHERE absolute_path = ? AND folder_id = ?', [absolute_path, folderId]);
    if (existing) {
      runQuery('UPDATE videos SET title = ?, thumbnail_url = ?, updated_at_db = ? WHERE id = ?', 
        [title, thumbnail_url, now, existing.id]);
      updatedVideos++;
    } else {
      runQuery(`
        INSERT INTO videos (
          folder_id, source_type, remote_url, thumbnail_url, absolute_path, relative_path, filename, 
          title, extension, mime_type, size_bytes, duration_seconds, modified_at, created_at, created_at_db, updated_at_db, is_available
        ) VALUES (?, 'youtube', ?, ?, ?, ?, ?, ?, '.youtube', 'video/youtube', 0, ?, ?, ?, ?, ?, 1)
      `, [
        folderId, remote_url, thumbnail_url, absolute_path, videoId, filename, 
        title, item.duration || 0, now, now, now, now
      ]);
      newVideos++;
    }
  }

  runQuery('UPDATE folders SET scan_status = "idle", last_scanned_at = ?, updated_at = ? WHERE id = ?', [now, now, folderId]);
  
  return { videosFound: newVideos + updatedVideos, newVideos, updatedVideos };
}

export async function scanDriveFolder(
  folderId: number,
  driveFolderId: string,
  onProgress?: (update: { message?: string; progressPercent?: number; filesChecked?: number; videosFound?: number; currentFile?: string }) => void,
  scannerSettings?: ScannerSettings
): Promise<any> {
  let newVideos = 0;
  let updatedVideos = 0;
  const now = new Date().toISOString();

  const minDurationSeconds = scannerSettings?.minDurationSeconds || 0;
  const maxFetchLimit = scannerSettings?.maxFetchLimit || 0;

  onProgress?.({
    message: 'Connecting to Google Drive folder...',
    progressPercent: 15
  });

  const driveUrl = `https://drive.google.com/drive/folders/${driveFolderId}`;
  
  // youtube-dl-exec supports Google Drive Folders!
  const output: any = await youtubedl(driveUrl, {
    dumpSingleJson: true,
    flatPlaylist: true,
    noWarnings: true
  });

  const items = output.entries || [];
  const total = items.length;

  onProgress?.({
    message: `Discovered ${total} files in Google Drive folder. Extracting videos...`,
    progressPercent: 30,
    filesChecked: total
  });
  
  for (let idx = 0; idx < items.length; idx++) {
    if (maxFetchLimit > 0 && (newVideos + updatedVideos) >= maxFetchLimit) break;
    
    const item = items[idx];
    const videoId = item.id;
    if (!videoId) continue;

    const duration = parseFloat(item.duration) || 0;
    if (minDurationSeconds > 0 && duration > 0 && duration < minDurationSeconds) {
      continue;
    }
    
    const title = item.title || 'Drive Video';
    const thumbnail_url = item.thumbnails?.[0]?.url || null;
    
    const remote_url = item.url || `https://drive.google.com/file/d/${videoId}/view`;
    const absolute_path = remote_url;
    const filename = `${videoId}.gdrive`;
    
    const percent = total > 0 ? Math.min(95, 30 + Math.round(((idx + 1) / total) * 65)) : 50;
    onProgress?.({
      message: `Processing Drive video (${idx + 1}/${total}): "${title}"`,
      currentFile: title,
      progressPercent: percent,
      videosFound: newVideos + updatedVideos
    });

    const existing = queryOne('SELECT id FROM videos WHERE absolute_path = ? AND folder_id = ?', [absolute_path, folderId]);
    if (existing) {
      runQuery('UPDATE videos SET title = ?, thumbnail_url = ?, updated_at_db = ? WHERE id = ?', 
        [title, thumbnail_url, now, existing.id]);
      updatedVideos++;
    } else {
      runQuery(`
        INSERT INTO videos (
          folder_id, source_type, remote_url, thumbnail_url, absolute_path, relative_path, filename, 
          title, extension, mime_type, size_bytes, duration_seconds, modified_at, created_at, created_at_db, updated_at_db, is_available
        ) VALUES (?, 'gdrive', ?, ?, ?, ?, ?, ?, '.gdrive', 'video/mp4', 0, ?, ?, ?, ?, ?, 1)
      `, [
        folderId, remote_url, thumbnail_url, absolute_path, videoId, filename, 
        title, item.duration || 0, now, now, now, now
      ]);
      newVideos++;
    }
  }

  runQuery('UPDATE folders SET scan_status = "idle", last_scanned_at = ?, updated_at = ? WHERE id = ?', [now, now, folderId]);
  
  return { videosFound: newVideos + updatedVideos, newVideos, updatedVideos };
}
