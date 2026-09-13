# CineVault — Your Personal Cinema

> **Premium Self-Hosted Local OTT Media Player & Streaming Library**

CineVault is a lightweight, privacy-focused web application designed to organize and stream videos stored directly on your personal device (laptop, desktop, NAS, or Android phone via Termux). It features an original, dark cinematic OTT user experience inspired by leading streaming platforms—complete with responsive media rows, fluid search, and an HTML5 player supporting HTTP Range streaming.

---

## Key Features

- **Local-First & Offline**: Operates 100% locally on your machine. No mandatory external cloud accounts, tracking, or subscription paywalls.
- **Recursive Media Scanner**: Scans registered local directories for video media (`.mp4`, `.webm`, `.mkv`, `.avi`, `.mov`, `.ts`, etc.), automatically parsing release filenames into clean, human-readable movie titles.
- **HTTP Range Partial Content Streaming**: Native support for `Range: bytes=start-end` requests (HTTP 206), enabling instant seeking and smooth scrubbing without buffering entire files.
- **Persistent Playback Memory**: Remembers your playback position across sessions. Automatically marks movies as completed at 90% and offers an instant "Resume" prompt.
- **Security & Path Traversal Protection**: All streaming requests validate path canonicalization (`path.resolve`) against configured media directory roots, strictly rejecting directory traversal attempts (`../`, symlinks outside tree).
- **OTT Cinematic Interface**:
  - Hero banner featuring prominent local movies
  - "Continue Watching" row with visual progress bars
  - "Favorites" and "Recently Added" carousels
  - "Media Library" with multi-criteria filtering (All, Unwatched, Watched, Favorites, by Folder, by Extension) and sorting (Recent, Title, Size, Duration)
  - Grid View & List View modes
  - Instant debounced search
- **HTML5 Player with Custom OTT Controls**:
  - Play/pause, step backward 10s, step forward 10s, seek progress bar with buffer indicators
  - Keyboard shortcuts (`Space`/`K` to toggle play, `Left`/`Right` to seek, `Up`/`Down` for volume, `F` for fullscreen, `M` for mute, `Esc` to close)
  - Playback speed selector (`0.5x`, `0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`)
  - Next / Previous video navigation
  - Automatic progress persistence every 5 seconds
- **Built-in Demo Generator**: Creates playable sample videos on first boot so you can explore the interface without manual file setup.
- **Android / Termux Ready**: Runs natively on Android using Termux and can access phone storage (`/storage/emulated/0/Movies`).

---

## Technology Stack

- **Backend**: Node.js, Express, TypeScript, `sql.js` (WebAssembly SQLite engine)
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Testing**: Built-in `node:test` test runner executed with `tsx`

---

## Getting Started

### Prerequisites

- Node.js 20+ installed on your machine
- npm

### Installation

```bash
npm install
```

### Running in Development Mode

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

This builds the Vite frontend into `dist/` and bundles the Express server with `esbuild` into `dist/server.cjs`.

---

## Running on Android (Termux)

CineVault runs on Android devices using Termux:

1. Install **Termux** from F-Droid.
2. Grant Termux access to your phone's storage:
   ```bash
   termux-setup-storage
   ```
3. Install Node.js & Git in Termux:
   ```bash
   pkg update && pkg install nodejs git
   ```
4. Clone or copy CineVault to Termux:
   ```bash
   git clone <repo-url> cinevault
   cd cinevault
   npm install
   npm run dev
   ```
5. Open your mobile browser at `http://localhost:3000`.
6. In **Settings -> Add Folder**, add paths like:
   - `/storage/emulated/0/Movies`
   - `/storage/emulated/0/Download`

---

## REST API Reference

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/health` | `GET` | Health check endpoint |
| `/api/system/info` | `GET` | Hardware, RAM, platform, and storage diagnostics |
| `/api/system/sample-media` | `POST` | Generates sample demo video files and folders |
| `/api/folders` | `GET` | Lists all registered media folders |
| `/api/folders` | `POST` | Registers a new media folder and validates path |
| `/api/folders/:id` | `PATCH` | Updates folder display name or active state |
| `/api/folders/:id` | `DELETE` | Removes folder and unindexes its videos |
| `/api/folders/:id/scan` | `POST` | Triggers a scan on a specific folder |
| `/api/videos` | `GET` | Retrieves indexed videos with filtering & sorting |
| `/api/videos/:id` | `GET` | Retrieves full metadata for a specific video |
| `/api/videos/:id` | `PATCH` | Updates video title or favorite status |
| `/api/videos/:id` | `DELETE` | Removes video from library index |
| `/api/videos/:id/stream` | `GET` | Streams video binary with HTTP Range support |
| `/api/videos/:id/progress` | `PUT` | Updates watch time, duration, and completion status |
| `/api/search?q=...` | `GET` | Searches titles, original filenames, and paths |
| `/api/library/scan` | `POST` | Scans all active media folders |
| `/api/library/stats` | `GET` | Returns video counts, total bytes, and progress stats |
| `/api/library/cleanup` | `POST` | Removes entries for deleted files from the database |
| `/api/library/reset` | `POST` | Resets the library index (requires confirmation) |

---

## Running Automated Tests

Run the test suite via:

```bash
npm test
```

Tests cover:
- **MIME & Extension Detection**: Validating video types, browser compatibility, and filename cleaning.
- **Security & Path Traversal**: Validating canonical path containment and rejecting traversal attempts.
- **Database & State**: Verifying SQLite table schemas, insertions, queries, and playback progress updates.

---

## License

Apache-2.0
