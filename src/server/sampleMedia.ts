import fs from 'fs';
import path from 'path';
import { getDb, queryOne, runQuery } from './database.js';
import { scanFolder } from './scanner.js';
import { SAMPLE_MP4_BASE64 } from './sampleMp4Base64.js';

export async function createSampleMediaIfEmpty(): Promise<{ created: boolean; folderPath?: string; message: string }> {
  await getDb();
  const existingFolders = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM folders');
  const sampleDirPath = path.resolve(process.cwd(), 'data', 'sample-media');

  if (!fs.existsSync(sampleDirPath)) {
    fs.mkdirSync(sampleDirPath, { recursive: true });
  }

  // Create two subdirectories: "Cosmic Odyssey" and "Nature & Wildlife"
  const movieDir1 = path.join(sampleDirPath, 'Sci-Fi & Space');
  const movieDir2 = path.join(sampleDirPath, 'Nature & Horizons');

  if (!fs.existsSync(movieDir1)) fs.mkdirSync(movieDir1, { recursive: true });
  if (!fs.existsSync(movieDir2)) fs.mkdirSync(movieDir2, { recursive: true });

  const sampleFiles = [
    {
      dir: movieDir1,
      name: 'Interstellar.Voyage.2024.1080p.WEBDL.x264.webm',
      size: 4 * 1024 * 1024 // ~4MB
    },
    {
      dir: movieDir1,
      name: 'Cyberpunk.City.Neon.Nights.2023.HDR.webm',
      size: 3 * 1024 * 1024
    },
    {
      dir: movieDir2,
      name: 'Pacific.Wilderness.Documentary.2024.webm',
      size: 5 * 1024 * 1024
    },
    {
      dir: movieDir2,
      name: 'Northern.Lights.Aurora.Borealis.1080p.webm',
      size: 2 * 1024 * 1024
    }
  ];

  const sampleBuffer = Buffer.from(SAMPLE_MP4_BASE64, 'base64');

  for (const sample of sampleFiles) {
    const targetFile = path.join(sample.dir, sample.name);
    if (!fs.existsSync(targetFile)) {
      fs.writeFileSync(targetFile, sampleBuffer);
    }
  }

  // If no folders exist, automatically add this sample folder and scan it
  if (!existingFolders || existingFolders.count === 0) {
    const now = new Date().toISOString();
    const result = runQuery(
      `INSERT INTO folders (name, path, enabled, created_at, updated_at, scan_status, video_count)
       VALUES (?, ?, 1, ?, ?, 'idle', 0)`,
      ['Sample Media Library', sampleDirPath, now, now]
    );

    const folderId = result.lastInsertRowid;
    try {
      await scanFolder(folderId);
    } catch (e) {
      console.warn('Auto-scan of sample media completed with notice:', e);
    }

    return {
      created: true,
      folderPath: sampleDirPath,
      message: 'Sample media library configured and scanned successfully.'
    };
  }

  return {
    created: false,
    folderPath: sampleDirPath,
    message: 'Media folders already configured.'
  };
}
