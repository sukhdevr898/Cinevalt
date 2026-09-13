export interface Video {
  id: number;
  folder_id: number;
  folder_name: string;
  folder_path?: string;
  absolute_path: string;
  relative_path: string;
  filename: string;
  title: string;
  extension: string;
  mime_type: string;
  size_bytes: number;
  modified_at: string;
  created_at: string;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  codec: string | null;
  thumbnail_path: string | null;
  is_available: number;
  created_at_db: string;
  updated_at_db: string;
  position_seconds?: number;
  completed?: number;
  is_favorite?: number;
  is_browser_playable?: boolean;
  file_exists?: boolean;
}

export interface Folder {
  id: number;
  name: string;
  path: string;
  enabled: number;
  created_at: string;
  updated_at: string;
  last_scanned_at: string | null;
  scan_status: string;
  video_count: number;
}

export interface LibraryStats {
  totalVideos: number;
  totalStorageBytes: number;
  totalDurationSeconds: number;
  totalFolders: number;
  enabledFolders: number;
  watchedVideos: number;
  inProgressVideos: number;
  favoriteVideos: number;
}

export interface SystemInfo {
  platform: string;
  hostname: string;
  nodeVersion: string;
  freeMemBytes: number;
  totalMemBytes: number;
  dataDir: string;
  totalVideos: number;
  totalStorageBytes: number;
  totalFolders: number;
  scanState: {
    isScanning: boolean;
    currentScanFolderId: number | null;
  };
}

export interface ScanResult {
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

export type ViewType = 'home' | 'movies' | 'favorites' | 'search' | 'settings';
export type SortOption = 'recent' | 'name' | 'size' | 'duration' | 'played';
export type FilterOption = 'all' | 'unwatched' | 'watched' | 'favorites';
