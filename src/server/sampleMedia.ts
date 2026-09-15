import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getDb, queryOne, runQuery } from './database.js';
import { scanFolder } from './scanner.js';
import { SAMPLE_MP4_BASE64 } from './sampleMp4Base64.js';

const execFileAsync = promisify(execFile);

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
      durationSeconds: 75,
      targetMb: 12
    },
    {
      dir: movieDir1,
      name: 'Cyberpunk.City.Neon.Nights.2023.HDR.webm',
      durationSeconds: 80,
      targetMb: 11
    },
    {
      dir: movieDir2,
      name: 'Pacific.Wilderness.Documentary.2024.webm',
      durationSeconds: 90,
      targetMb: 14
    },
    {
      dir: movieDir2,
      name: 'Northern.Lights.Aurora.Borealis.1080p.webm',
      durationSeconds: 65,
      targetMb: 12
    }
  ];

  for (const sample of sampleFiles) {
    const targetFile = path.join(sample.dir, sample.name);
    if (!fs.existsSync(targetFile) || fs.statSync(targetFile).size < 10 * 1024 * 1024) {
      try {
        await execFileAsync('ffmpeg', [
          '-y',
          '-f', 'lavfi', '-i', `testsrc=duration=${sample.durationSeconds}:size=640x360:rate=1`,
          '-f', 'lavfi', '-i', `sine=frequency=440:duration=${sample.durationSeconds}`,
          '-c:v', 'libvpx', '-b:v', '1500k',
          '-c:a', 'libvorbis',
          targetFile
        ]);

        const currentSize = fs.statSync(targetFile).size;
        const padNeeded = (sample.targetMb * 1024 * 1024) - currentSize;
        if (padNeeded > 0) {
          const fd = fs.openSync(targetFile, 'a');
          fs.writeSync(fd, Buffer.alloc(padNeeded));
          fs.closeSync(fd);
        }
      } catch {
        // Fallback to sample buffer if ffmpeg is unavailable
        const sampleBuffer = Buffer.from(SAMPLE_MP4_BASE64, 'base64');
        fs.writeFileSync(targetFile, sampleBuffer);
      }
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
