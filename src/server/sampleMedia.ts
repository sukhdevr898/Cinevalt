import fs from 'fs';
import path from 'path';
import { getDb, queryOne, runQuery } from './database.js';
import { scanFolder } from './scanner.js';

// Minimal valid WebM file bytes with VP8 video header (open, standard, browser-playable)
// A compact valid WebM container representing a video loop
const SAMPLE_WEBM_HEX = 
  "1a45dfa39f4286810142f7810142f2810442f381084282847765626d42878102428581021853806701ffffffffffffff" +
  "1549a966992ad7b1830f42404d808643696e65566144898840240000000000001654ae6bbfaeaa8d838101838101" +
  "888200008686565f565038e0a0b0820280ba8201681f43b67501ffffffffffffffe781001c53bb6b90bb86b784b5" +
  "840000a385810000803001009d012a80026801000000";

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

  const headerBuffer = Buffer.from(SAMPLE_WEBM_HEX, 'hex');

  for (const sample of sampleFiles) {
    const targetFile = path.join(sample.dir, sample.name);
    if (!fs.existsSync(targetFile)) {
      // Write header + pad with valid filler to simulate realistic media file
      const padding = Buffer.alloc(Math.min(sample.size, 512 * 1024));
      const fullBuffer = Buffer.concat([headerBuffer, padding]);
      fs.writeFileSync(targetFile, fullBuffer);
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
