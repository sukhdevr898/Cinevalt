import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { queryOne, queryAll, VideoRecord, FolderRecord } from './database.js';
import { getMimeType, isSupportedVideo } from './mimeTypes.js';

export function isPathContained(filePath: string, parentDir: string): boolean {
  const resolvedFile = path.resolve(filePath);
  const resolvedParent = path.resolve(parentDir);

  // Check case-insensitively on Windows or strictly on POSIX
  const isWindows = process.platform === 'win32';
  const fileToCompare = isWindows ? resolvedFile.toLowerCase() : resolvedFile;
  const parentToCompare = isWindows ? resolvedParent.toLowerCase() : resolvedParent;

  // Add trailing separator if missing to avoid prefix mismatches (e.g. /data/dir vs /data/dir2)
  const sep = path.sep;
  const normalizedParent = parentToCompare.endsWith(sep) ? parentToCompare : parentToCompare + sep;

  return fileToCompare === parentToCompare || fileToCompare.startsWith(normalizedParent);
}

export function handleVideoStream(req: Request, res: Response): void {
  const videoId = parseInt(req.params.id, 10);
  if (isNaN(videoId) || videoId <= 0) {
    res.status(400).json({
      success: false,
      data: null,
      error: { code: 'INVALID_VIDEO_ID', message: 'Invalid video ID provided.' }
    });
    return;
  }

  const video = queryOne<VideoRecord>('SELECT * FROM videos WHERE id = ?', [videoId]);
  if (!video) {
    res.status(404).json({
      success: false,
      data: null,
      error: { code: 'VIDEO_NOT_FOUND', message: 'The requested video was not found in the library.' }
    });
    return;
  }

  // Security check: Containment verification
  // Ensure the target file is inside one of the registered folders
  const allowedFolders = queryAll<FolderRecord>('SELECT path FROM folders');
  const isAllowed = allowedFolders.some(f => isPathContained(video.absolute_path, f.path));

  if (!isAllowed) {
    res.status(403).json({
      success: false,
      data: null,
      error: { code: 'ACCESS_DENIED', message: 'File is not within an authorized media folder.' }
    });
    return;
  }

  if (!isSupportedVideo(video.absolute_path)) {
    res.status(400).json({
      success: false,
      data: null,
      error: { code: 'UNSUPPORTED_FORMAT', message: 'File format is not supported.' }
    });
    return;
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(video.absolute_path);
  } catch (err: any) {
    res.status(404).json({
      success: false,
      data: null,
      error: { code: 'FILE_NOT_FOUND', message: 'Media file could not be read from disk.' }
    });
    return;
  }

  const fileSize = stat.size;
  const mimeType = video.mime_type || getMimeType(video.absolute_path);
  const range = req.headers.range;

  // Set default streaming headers
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'no-cache, private');

  if (req.method === 'HEAD') {
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', fileSize);
    res.status(200).end();
    return;
  }

  if (range) {
    // Format: "bytes=start-end"
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const endStr = parts[1];
    
    // Default chunk size ~2MB for smooth responsive seeking and buffering
    const CHUNK_SIZE = 2 * 1024 * 1024;
    let end = endStr ? parseInt(endStr, 10) : Math.min(start + CHUNK_SIZE - 1, fileSize - 1);

    // Range boundary validation
    if (isNaN(start) || start < 0 || start >= fileSize) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      res.status(416).json({
        success: false,
        data: null,
        error: { code: 'RANGE_NOT_SATISFIABLE', message: 'Requested byte range is out of bounds.' }
      });
      return;
    }

    if (end >= fileSize) {
      end = fileSize - 1;
    }

    const chunkLength = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkLength,
      'Content-Type': mimeType
    });

    const stream = fs.createReadStream(video.absolute_path, { start, end });
    stream.on('error', (streamErr) => {
      console.error('Video stream error:', streamErr);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    req.on('close', () => {
      stream.destroy();
    });

    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes'
    });

    const stream = fs.createReadStream(video.absolute_path);
    stream.on('error', (streamErr) => {
      console.error('Video stream error:', streamErr);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    req.on('close', () => {
      stream.destroy();
    });

    stream.pipe(res);
  }
}
