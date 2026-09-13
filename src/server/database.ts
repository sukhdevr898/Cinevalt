import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

export interface FolderRecord {
  id: number;
  name: string;
  path: string;
  folder_type: 'local' | 'youtube' | 'gdrive';
  enabled: number;
  created_at: string;
  updated_at: string;
  last_scanned_at: string | null;
  scan_status: string;
  video_count: number;
}

export interface VideoRecord {
  id: number;
  folder_id: number;
  folder_name?: string;
  source_type: 'local' | 'youtube' | 'gdrive';
  remote_url: string | null;
  thumbnail_url: string | null;
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
  // Join progress & favorites
  position_seconds?: number;
  completed?: number;
  is_favorite?: number;
}

export interface PlaybackProgressRecord {
  id: number;
  video_id: number;
  position_seconds: number;
  duration_seconds: number | null;
  completed: number;
  updated_at: string;
}

let db: Database | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cinevault.db');

export async function getDb(): Promise<Database> {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error('Failed to load existing DB, creating fresh one:', err);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  initSchema(db);
  persistDb();
  return db;
}

export function persistDb() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, buffer);
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error persisting database:', err);
  }
}

function initSchema(database: Database) {
  database.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      folder_type TEXT DEFAULT 'local',
      enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_scanned_at TEXT,
      scan_status TEXT DEFAULT 'idle',
      video_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_id INTEGER NOT NULL,
      source_type TEXT DEFAULT 'local',
      remote_url TEXT,
      thumbnail_url TEXT,
      absolute_path TEXT NOT NULL UNIQUE,
      relative_path TEXT NOT NULL,
      filename TEXT NOT NULL,
      title TEXT NOT NULL,
      extension TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      modified_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      duration_seconds REAL,
      width INTEGER,
      height INTEGER,
      codec TEXT,
      thumbnail_path TEXT,
      is_available INTEGER DEFAULT 1,
      created_at_db TEXT NOT NULL,
      updated_at_db TEXT NOT NULL,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS playback_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL UNIQUE,
      position_seconds REAL NOT NULL DEFAULT 0,
      duration_seconds REAL,
      completed INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_videos_folder ON videos(folder_id);
    CREATE INDEX IF NOT EXISTS idx_videos_filename ON videos(filename);
    CREATE INDEX IF NOT EXISTS idx_videos_title ON videos(title);
    CREATE INDEX IF NOT EXISTS idx_progress_video ON playback_progress(video_id);
  `);

  try { database.run("ALTER TABLE folders ADD COLUMN folder_type TEXT DEFAULT 'local'"); } catch(e) {}
  try { database.run("ALTER TABLE videos ADD COLUMN source_type TEXT DEFAULT 'local'"); } catch(e) {}
  try { database.run("ALTER TABLE videos ADD COLUMN remote_url TEXT"); } catch(e) {}
  try { database.run("ALTER TABLE videos ADD COLUMN thumbnail_url TEXT"); } catch(e) {}

  // Default settings
  const defaultSettings: Record<string, string> = {
    appName: 'CineVault',
    tagline: 'Your Personal Cinema',
    autoplayNext: 'true',
    resumePlayback: 'true',
    defaultSpeed: '1.0',
    rememberVolume: 'true',
    accentColor: '#E50914',
    cardDensity: 'comfortable',
    theme: 'dark'
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    const stmt = database.prepare("SELECT key FROM settings WHERE key = ?");
    stmt.bind([key]);
    const exists = stmt.step();
    stmt.free();

    if (!exists) {
      database.run(
        "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
        [key, value, new Date().toISOString()]
      );
    }
  }
}

// Database helper utilities for parameterized queries
export function queryAll<T = any>(sqlQuery: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sqlQuery);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sqlQuery: string, params: any[] = []): T | null {
  const rows = queryAll<T>(sqlQuery, params);
  return rows.length > 0 ? rows[0] : null;
}

export function runQuery(sqlQuery: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
  if (!db) throw new Error('Database not initialized');
  db.run(sqlQuery, params);
  const changes = db.getRowsModified();
  const idRes = queryOne<{ id: number }>('SELECT last_insert_rowid() as id');
  const lastInsertRowid = idRes ? idRes.id : 0;
  persistDb();
  return { changes, lastInsertRowid };
}
