import fs from 'fs/promises';
import path from 'path';

export interface ScannerSettings {
  maxFetchLimit: number;
  minSizeMB: number;
  minDurationSeconds: number;
  allowedExtensions: string[];
}

export const DEFAULT_SCANNER_SETTINGS: ScannerSettings = {
  maxFetchLimit: 0,
  minSizeMB: 0,
  minDurationSeconds: 0,
  allowedExtensions: [
    '.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v', '.mkv', '.avi', '.3gp', '.ts', '.mpeg', '.mpg', '.wmv', '.flv'
  ]
};

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'scanner_settings.json');

export async function getScannerSettings(): Promise<ScannerSettings> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SCANNER_SETTINGS, ...JSON.parse(data) };
  } catch {
    return DEFAULT_SCANNER_SETTINGS;
  }
}

export async function updateScannerSettings(settings: Partial<ScannerSettings>): Promise<ScannerSettings> {
  const current = await getScannerSettings();
  const updated = { ...current, ...settings };
  
  if (updated.allowedExtensions) {
    updated.allowedExtensions = updated.allowedExtensions.map(ext => ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`);
  }
  
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}
