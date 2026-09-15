import { Video, Folder, LibraryStats, SystemInfo, ScanResult, ScanProgress, ScannerSettings } from '../types';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    },
    ...options
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    const errorMsg = payload.error?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg) as any;
    err.code = payload.error?.code;
    throw err;
  }

  return payload.data as T;
}

export const api = {
  // System & Health
  async getHealth(): Promise<{
    status: string;
    timestamp: string;
    uptimeSeconds?: number;
    database?: string;
    streamingEngine?: string;
    nodeVersion?: string;
    freeMemBytes?: number;
    totalMemBytes?: number;
  }> {
    return fetchJson('/api/health');
  },

  async getSystemInfo(): Promise<SystemInfo> {
    return fetchJson<SystemInfo>('/api/system/info');
  },

  async createSampleMedia(): Promise<{ created: boolean; folderPath?: string; message: string }> {
    return fetchJson<{ created: boolean; folderPath?: string; message: string }>('/api/system/sample-media', {
      method: 'POST'
    });
  },

  // Folders
  async getFolders(): Promise<Folder[]> {
    return fetchJson<Folder[]>('/api/folders');
  },

  async addFolder(folderPath: string, name?: string, folder_type: 'local' | 'youtube' | 'gdrive' | 'http' = 'local'): Promise<Folder> {
    return fetchJson<Folder>('/api/folders', {
      method: 'POST',
      body: JSON.stringify({ path: folderPath, name, folder_type })
    });
  },

  async updateFolder(id: number, data: { name?: string; enabled?: boolean }): Promise<Folder> {
    return fetchJson<Folder>(`/api/folders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async deleteFolder(id: number): Promise<{ message: string }> {
    return fetchJson<{ message: string }>(`/api/folders/${id}`, {
      method: 'DELETE'
    });
  },

  async scanFolder(id: number, background = false): Promise<ScanResult | { started: boolean }> {
    const qs = background ? '?background=true' : '';
    return fetchJson<ScanResult | { started: boolean }>(`/api/folders/${id}/scan${qs}`, {
      method: 'POST'
    });
  },

  // Videos
  async getVideos(params?: {
    q?: string;
    folder_id?: number;
    sort_by?: string;
    sort_order?: string;
    filter?: string;
    limit?: number;
    offset?: number;
  }): Promise<Video[]> {
    const query = new URLSearchParams();
    if (params) {
      if (params.q) query.set('q', params.q);
      if (params.folder_id) query.set('folder_id', String(params.folder_id));
      if (params.sort_by) query.set('sort_by', params.sort_by);
      if (params.sort_order) query.set('sort_order', params.sort_order);
      if (params.filter) query.set('filter', params.filter);
      if (params.limit) query.set('limit', String(params.limit));
      if (params.offset) query.set('offset', String(params.offset));
    }
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<Video[]>(`/api/videos${qs}`);
  },

  async getVideo(id: number): Promise<Video> {
    return fetchJson<Video>(`/api/videos/${id}`);
  },

  async updateVideo(id: number, data: { title?: string; is_favorite?: boolean }): Promise<Video> {
    return fetchJson<Video>(`/api/videos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async deleteVideo(id: number): Promise<{ message: string }> {
    return fetchJson<{ message: string }>(`/api/videos/${id}`, {
      method: 'DELETE'
    });
  },

  // Progress
  async updateProgress(id: number, position_seconds: number, duration_seconds?: number, completed?: boolean) {
    return fetchJson<{ video_id: number; position_seconds: number; completed: number }>(
      `/api/videos/${id}/progress`,
      {
        method: 'PUT',
        body: JSON.stringify({ position_seconds, duration_seconds, completed })
      }
    );
  },

  async resetProgress(id: number): Promise<{ message: string }> {
    return fetchJson<{ message: string }>(`/api/videos/${id}/progress`, {
      method: 'DELETE'
    });
  },

  // Search
  async search(query: string): Promise<{ query: string; count: number; videos: Video[] }> {
    return fetchJson<{ query: string; count: number; videos: Video[] }>(`/api/search?q=${encodeURIComponent(query)}`);
  },

  // Settings
  async getSettings(): Promise<Record<string, string>> {
    return fetchJson<Record<string, string>>('/api/settings');
  },

  async updateSettings(settings: Record<string, string>): Promise<Record<string, string>> {
    return fetchJson<Record<string, string>>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings)
    });
  },

  // Scanner Settings
  async getScannerSettings(): Promise<ScannerSettings> {
    return fetchJson<ScannerSettings>('/api/scanner/settings');
  },

  async updateScannerSettings(settings: Partial<ScannerSettings>): Promise<ScannerSettings> {
    return fetchJson<ScannerSettings>('/api/scanner/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },

  // Library & Scan
  async getScanProgress(): Promise<ScanProgress> {
    return fetchJson<ScanProgress>('/api/scan/progress');
  },

  async scanLibrary(background = false): Promise<ScanResult | { started: boolean }> {
    const qs = background ? '?background=true' : '';
    return fetchJson<ScanResult | { started: boolean }>(`/api/library/scan${qs}`, {
      method: 'POST'
    });
  },

  async getLibraryStats(): Promise<LibraryStats> {
    return fetchJson<LibraryStats>('/api/library/stats');
  },

  async cleanupLibrary(): Promise<{ checked: number; removedCount: number; message: string }> {
    return fetchJson<{ checked: number; removedCount: number; message: string }>('/api/library/cleanup', {
      method: 'POST'
    });
  },

  async resetLibrary(confirmToken: string): Promise<{ message: string }> {
    return fetchJson<{ message: string }>('/api/library/reset', {
      method: 'POST',
      body: JSON.stringify({ confirm: confirmToken })
    });
  },

  getVideoStreamUrl(id: number, extension?: string): string {
    const ext = extension ? (extension.startsWith('.') ? extension : `.${extension}`) : '.mp4';
    return `/api/videos/${id}/stream/video${ext}`;
  }
};
