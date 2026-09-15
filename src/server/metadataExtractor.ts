import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ProbeMetadata {
  durationSeconds: number;
  width: number | null;
  height: number | null;
  codec: string | null;
}

/**
 * Extracts duration from an MP4 buffer by parsing the mvhd box.
 */
function parseMvhdDuration(buf: Buffer): number | null {
  const idx = buf.indexOf('mvhd');
  if (idx === -1 || idx + 32 > buf.length) return null;

  const version = buf.readUInt8(idx + 4);
  let timescale: number;
  let duration: number;

  if (version === 1) {
    if (idx + 36 > buf.length) return null;
    timescale = buf.readUInt32BE(idx + 24);
    duration = Number(buf.readBigUInt64BE(idx + 28));
  } else {
    if (idx + 24 > buf.length) return null;
    timescale = buf.readUInt32BE(idx + 16);
    duration = buf.readUInt32BE(idx + 20);
  }

  if (timescale > 0 && duration >= 0) {
    const seconds = duration / timescale;
    if (isFinite(seconds) && seconds >= 0) {
      return seconds;
    }
  }
  return null;
}

/**
 * Fast range-based metadata extractor for remote HTTP/HTTPS video files.
 * Reads first 1MB and last 2MB to find MP4 moov/mvhd atom in ~1-2 seconds.
 */
export async function extractRemoteVideoDuration(
  url: string,
  totalSizeBytes?: number
): Promise<number> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    // 1. Check head 1MB
    const headRes = await fetch(url, {
      headers: { Range: 'bytes=0-1048575', 'User-Agent': 'Mozilla/5.0 (CineVault-Scanner)' },
      signal: controller.signal
    });
    const headBuf = Buffer.from(await headRes.arrayBuffer());
    clearTimeout(timeout);

    const headDuration = parseMvhdDuration(headBuf);
    if (headDuration !== null && headDuration > 0) {
      return headDuration;
    }

    // 2. If moov is at tail and total size is known, check tail 2MB
    if (totalSizeBytes && totalSizeBytes > 1048576) {
      const tailStart = Math.max(0, totalSizeBytes - 2 * 1024 * 1024);
      const tailController = new AbortController();
      const tailTimeout = setTimeout(() => tailController.abort(), 4000);

      const tailRes = await fetch(url, {
        headers: { Range: `bytes=${tailStart}-${totalSizeBytes - 1}`, 'User-Agent': 'Mozilla/5.0 (CineVault-Scanner)' },
        signal: tailController.signal
      });
      const tailBuf = Buffer.from(await tailRes.arrayBuffer());
      clearTimeout(tailTimeout);

      const tailDuration = parseMvhdDuration(tailBuf);
      if (tailDuration !== null && tailDuration > 0) {
        return tailDuration;
      }
    }
  } catch {
    // Ignore network or range errors
  }

  return 0;
}

/**
 * Extracts video duration and media metadata using ffprobe.
 * Applies strict timeouts to prevent scanner stalls.
 */
export async function extractVideoMetadata(
  filePathOrUrl: string,
  timeoutMs = 7000
): Promise<ProbeMetadata> {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=duration,width,height,codec_name:format=duration',
        '-of', 'json',
        filePathOrUrl
      ],
      { timeout: timeoutMs }
    );

    const parsed = JSON.parse(stdout || '{}');
    const stream = parsed.streams?.[0];
    const format = parsed.format;

    const rawDuration = stream?.duration || format?.duration || 0;
    const durationSeconds = parseFloat(rawDuration) || 0;
    const width = stream?.width ? parseInt(stream.width, 10) : null;
    const height = stream?.height ? parseInt(stream.height, 10) : null;
    const codec = stream?.codec_name ? String(stream.codec_name) : null;

    return {
      durationSeconds,
      width,
      height,
      codec
    };
  } catch {
    return {
      durationSeconds: 0,
      width: null,
      height: null,
      codec: null
    };
  }
}
