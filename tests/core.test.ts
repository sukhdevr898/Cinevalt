import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTitleFromFilename, getMimeType, isSupportedVideo, isNativeBrowserPlayable } from '../src/server/mimeTypes.js';
import { isPathContained } from '../src/server/streaming.js';

test('MIME Types & Extensions', async (t) => {
  await t.test('detects supported video files', () => {
    assert.equal(isSupportedVideo('movie.mp4'), true);
    assert.equal(isSupportedVideo('clip.webm'), true);
    assert.equal(isSupportedVideo('video.mkv'), true);
    assert.equal(isSupportedVideo('stream.ts'), true);
    assert.equal(isSupportedVideo('document.pdf'), false);
    assert.equal(isSupportedVideo('image.png'), false);
  });

  await t.test('detects native browser playable formats', () => {
    assert.equal(isNativeBrowserPlayable('.mp4'), true);
    assert.equal(isNativeBrowserPlayable('.webm'), true);
    assert.equal(isNativeBrowserPlayable('.mkv'), false);
    assert.equal(isNativeBrowserPlayable('.avi'), false);
  });

  await t.test('maps correct MIME types', () => {
    assert.equal(getMimeType('movie.mp4'), 'video/mp4');
    assert.equal(getMimeType('clip.webm'), 'video/webm');
    assert.equal(getMimeType('file.mkv'), 'video/x-matroska');
  });

  await t.test('derives clean human-readable title from release filenames', () => {
    const raw = 'Interstellar.Voyage.2024.1080p.WEBDL.x264.webm';
    const clean = deriveTitleFromFilename(raw);
    assert.equal(clean.includes('1080p'), false);
    assert.equal(clean.includes('x264'), false);
    assert.equal(clean.startsWith('Interstellar Voyage'), true);

    const raw2 = 'Cyberpunk_City_Neon_Nights_HDR.mp4';
    const clean2 = deriveTitleFromFilename(raw2);
    assert.equal(clean2.includes('_'), false);
    assert.equal(clean2.startsWith('Cyberpunk City Neon Nights'), true);
  });
});

test('Security & Path Traversal Protection', async (t) => {
  await t.test('allows paths strictly inside configured folder', () => {
    const parent = '/home/user/Movies';
    const child = '/home/user/Movies/Action/Film.mp4';
    assert.equal(isPathContained(child, parent), true);
  });

  await t.test('rejects path traversal outside configured folder', () => {
    const parent = '/home/user/Movies';
    const evil = '/home/user/Movies/../../etc/passwd';
    assert.equal(isPathContained(evil, parent), false);

    const evil2 = '/etc/shadow';
    assert.equal(isPathContained(evil2, parent), false);
  });

  await t.test('rejects sibling folder prefix collision attack', () => {
    const parent = '/home/user/Movies';
    const sibling = '/home/user/MoviesExtra/Secret.mp4';
    assert.equal(isPathContained(sibling, parent), false);
  });
});
