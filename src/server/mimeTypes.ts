import path from 'path';

export const SUPPORTED_EXTENSIONS = new Set([
  '.mp4',
  '.webm',
  '.ogg',
  '.ogv',
  '.mov',
  '.m4v',
  '.mkv',
  '.avi',
  '.3gp',
  '.ts',
  '.mpeg',
  '.mpg',
  '.wmv',
  '.flv'
]);

export const EXCLUDED_NON_VIDEO_EXTENSIONS = new Set([
  '.srt', '.vtt', '.sub', '.idx', '.ass', '.ssa',
  '.txt', '.nfo', '.pdf', '.doc', '.docx', '.rtf', '.log', '.md',
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff',
  '.mp3', '.wav', '.flac', '.aac', '.m4a', '.wma', '.opus', '.mid', '.midi',
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.iso', '.exe', '.bin', '.dmg',
  '.json', '.xml', '.html', '.htm', '.css', '.js', '.ts', '.py', '.sh',
  '.torrent', '.part', '.crdownload', '.tmp'
]);

export const BROWSER_NATIVE_EXTENSIONS = new Set([
  '.mp4',
  '.webm',
  '.ogg',
  '.ogv',
  '.mov',
  '.m4v'
]);

export const MIME_TYPE_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.ogv': 'video/ogg',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.3gp': 'video/3gpp',
  '.ts': 'video/mp2t',
  '.mpeg': 'video/mpeg',
  '.mpg': 'video/mpeg',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv'
};

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPE_MAP[ext] || 'video/mp4';
}

export function isSupportedVideo(filePath: string, allowedExtensions?: string[]): boolean {
  const ext = (filePath.startsWith('.') && !filePath.includes('/') && !filePath.includes('\\') && filePath.indexOf('.', 1) === -1)
    ? filePath.toLowerCase()
    : path.extname(filePath).toLowerCase();
  if (EXCLUDED_NON_VIDEO_EXTENSIONS.has(ext)) {
    return false;
  }
  if (allowedExtensions && allowedExtensions.length > 0) {
    return allowedExtensions.includes(ext) || ext === '.youtube' || ext === '.gdrive';
  }
  return SUPPORTED_EXTENSIONS.has(ext) || ext === '.youtube' || ext === '.gdrive';
}

export function isNativeBrowserPlayable(filePath: string): boolean {
  const ext = (filePath.startsWith('.') && !filePath.includes('/') && !filePath.includes('\\') && filePath.indexOf('.', 1) === -1)
    ? filePath.toLowerCase()
    : path.extname(filePath).toLowerCase();
  return BROWSER_NATIVE_EXTENSIONS.has(ext);
}

export function deriveTitleFromFilename(filename: string): string {
  const ext = path.extname(filename);
  let base = path.basename(filename, ext);

  // Replace dots, underscores, dashes with spaces
  base = base.replace(/[._\-]+/g, ' ').trim();

  // Strip release tags like 1080p, 720p, 2160p, 4K, HDR, WEB-DL, BluRay, x264, x265, HEVC, AAC, etc.
  const tagsRegex = /\b(1080p|720p|2160p|4k|hdr|web-?dl|bluray|bdrip|dvdrip|hdtv|x264|x265|hevc|h264|h265|aac|dts|remux|repack|yify|rarbg)\b/gi;
  base = base.replace(tagsRegex, '');

  // Strip brackets and parentheses with junk
  base = base.replace(/\[.*?\]|\(.*?\)/g, (match) => {
    // Keep 4-digit years like (2023)
    if (/^\(\s*(19|20)\d{2}\s*\)$/.test(match)) {
      return match;
    }
    return '';
  });

  // Clean extra whitespace
  base = base.replace(/\s+/g, ' ').trim();

  if (!base) {
    base = path.basename(filename, ext);
  }

  // Capitalize words nicely
  return base
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
