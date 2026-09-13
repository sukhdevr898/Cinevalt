import test from 'node:test';
import assert from 'node:assert/strict';
import { getDb, queryAll, queryOne, runQuery } from '../src/server/database.js';

test('Database Operations', async (t) => {
  await t.test('initializes database and creates tables', async () => {
    const db = await getDb();
    assert.ok(db);

    const tables = queryAll<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).map(r => r.name);

    assert.ok(tables.includes('folders'));
    assert.ok(tables.includes('videos'));
    assert.ok(tables.includes('playback_progress'));
    assert.ok(tables.includes('settings'));
    assert.ok(tables.includes('favorites'));
  });

  await t.test('reads default settings', async () => {
    const appName = queryOne<{ value: string }>("SELECT value FROM settings WHERE key = 'appName'");
    assert.equal(appName?.value, 'CineVault');

    const tagline = queryOne<{ value: string }>("SELECT value FROM settings WHERE key = 'tagline'");
    assert.equal(tagline?.value, 'Your Personal Cinema');
  });

  await t.test('manages playback progress lifecycle', async () => {
    // Insert test folder and video
    const now = new Date().toISOString();
    const folderRes = runQuery(
      "INSERT OR IGNORE INTO folders (name, path, created_at, updated_at) VALUES (?, ?, ?, ?)",
      ['Test Folder', '/tmp/test-movies-' + Date.now(), now, now]
    );

    const videoRes = runQuery(
      `INSERT INTO videos (
        folder_id, absolute_path, relative_path, filename, title,
        extension, mime_type, size_bytes, modified_at, created_at,
        is_available, created_at_db, updated_at_db
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        folderRes.lastInsertRowid || 1,
        '/tmp/test-video-' + Date.now() + '.mp4',
        'test.mp4',
        'test.mp4',
        'Test Movie',
        '.mp4',
        'video/mp4',
        1048576,
        now,
        now,
        now,
        now
      ]
    );

    const videoId = videoRes.lastInsertRowid;

    // Record progress
    runQuery(
      "INSERT INTO playback_progress (video_id, position_seconds, duration_seconds, completed, updated_at) VALUES (?, ?, ?, ?, ?)",
      [videoId, 120, 600, 0, now]
    );

    const prog = queryOne<{ position_seconds: number; completed: number }>(
      "SELECT * FROM playback_progress WHERE video_id = ?",
      [videoId]
    );
    assert.equal(prog?.position_seconds, 120);
    assert.equal(prog?.completed, 0);

    // Update to completed
    runQuery(
      "UPDATE playback_progress SET position_seconds = 590, completed = 1 WHERE video_id = ?",
      [videoId]
    );

    const progUpdated = queryOne<{ position_seconds: number; completed: number }>(
      "SELECT * FROM playback_progress WHERE video_id = ?",
      [videoId]
    );
    assert.equal(progUpdated?.completed, 1);

    // Clean up test records
    runQuery("DELETE FROM videos WHERE id = ?", [videoId]);
    runQuery("DELETE FROM playback_progress WHERE video_id = ?", [videoId]);
  });
});
