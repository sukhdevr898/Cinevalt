export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '--:--';
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimeCode(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return isoString;
  }
}

// Generates a deterministic, tasteful dark cinematic theme gradient based on string hash
const PALETTES = [
  { from: '#1a101f', via: '#2d122d', to: '#0d0d12', accent: '#c084fc', genre: 'DRAMA' },
  { from: '#0c1a29', via: '#162b45', to: '#080c14', accent: '#60a5fa', genre: 'SCI-FI' },
  { from: '#1c1917', via: '#292524', to: '#0a0a0a', accent: '#f59e0b', genre: 'CLASSIC' },
  { from: '#1f1313', via: '#381616', to: '#0d0707', accent: '#f87171', genre: 'ACTION' },
  { from: '#0f1f1d', via: '#13352f', to: '#081210', accent: '#34d399', genre: 'NATURE' },
  { from: '#181226', via: '#251b40', to: '#0a0712', accent: '#a78bfa', genre: 'MYSTERY' }
];

export function getCinematicPalette(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PALETTES.length;
  return PALETTES[index];
}
