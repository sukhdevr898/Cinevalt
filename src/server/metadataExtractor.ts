import { Input, ALL_FORMATS, UrlSource, FilePathSource, Logging, LogLevel } from 'mediabunny';

// Suppress mediabunny internal warnings and fetch retry spam in the console
Logging.level = LogLevel.Silent;

export interface ProbeMetadata {
  durationSeconds: number;
  width: number | null;
  height: number | null;
  codec: string | null;
}

/**
 * Fast metadata extractor for remote HTTP/HTTPS video files using Mediabunny.
 * Reads minimal bytes required to parse duration via streaming.
 */
export async function extractRemoteVideoDuration(
  url: string,
  totalSizeBytes?: number
): Promise<number> {
  try {
    // Validate URL string first to prevent internal mediabunny throws
    try {
      new URL(url);
    } catch {
      return 0;
    }

    const input = new Input({
      source: new UrlSource(url, {
        getRetryDelay: () => null // Disable internal mediabunny retries for fast failing
      }),
      formats: ALL_FORMATS,
    });

    const timeoutPromise = new Promise<number>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 4000)
    );

    const durationSeconds = await Promise.race([
      input.computeDuration(),
      timeoutPromise
    ]);

    return typeof durationSeconds === 'number' && durationSeconds > 0 ? durationSeconds : 0;
  } catch {
    // Ignore network or parsing errors
  }
  return 0;
}

/**
 * Extracts video duration and media metadata using Mediabunny.
 * Much faster than ffprobe as it parses headers in-memory directly in V8.
 */
export async function extractVideoMetadata(
  filePathOrUrl: string,
  timeoutMs = 7000
): Promise<ProbeMetadata> {
  const result: ProbeMetadata = {
    durationSeconds: 0,
    width: null,
    height: null,
    codec: null
  };

  try {
    const isUrl = filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://');
    
    if (isUrl) {
      try {
        new URL(filePathOrUrl);
      } catch {
        return result;
      }
    }
    
    const source = isUrl ? new UrlSource(filePathOrUrl, {
      getRetryDelay: () => null
    }) : new FilePathSource(filePathOrUrl);

    const input = new Input({
      source,
      formats: ALL_FORMATS,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    );

    await Promise.race([
      (async () => {
        result.durationSeconds = await input.computeDuration();
        const videoTrack = await input.getPrimaryVideoTrack();
        
        if (videoTrack) {
          result.width = await videoTrack.getDisplayWidth();
          result.height = await videoTrack.getDisplayHeight();
          result.codec = await videoTrack.getCodec();
        }
      })(),
      timeoutPromise
    ]);
  } catch (err) {
    // Ignore errors to allow scanner to proceed smoothly
  }

  return result;
}
