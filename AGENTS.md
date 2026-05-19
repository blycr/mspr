# MSP (Media Share & Preview) — Agent Guide

This file is the canonical reference for AI coding agents working on this project. It describes the actual implementation, not aspirational design. When in doubt, trust the source code over this document.

---

## Project Overview

MSP is a lightweight, private media server for local networks. A host machine runs the backend, and any modern browser on the same LAN can browse and stream the media collection without installing anything.

Key capabilities:
- **Media scanning** — recursively indexes configured directories and auto-associates sidecars (subtitles, lyrics, cover images).
- **Streaming** — direct zero-copy streaming for browser-native formats; on-the-fly FFmpeg transcoding for incompatible codecs.
- **Playback UX** — resume progress, playback history, favorites, synced lyrics, and subtitle display.
- **Single runtime** — the server is a single TypeScript process executed directly by Bun. No Docker, no external database server.

---

## Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | **Bun** (>= 1.x) | Native TypeScript execution, `bun:sqlite`, `Bun.spawn()`, `Bun.file()`. Node.js is not the target runtime. |
| Backend | **Elysia** (`latest`) | Lightweight Bun-native HTTP framework with CORS support via `@elysiajs/cors`. |
| Frontend | **Svelte 5** (`^5.55.5`) | Runes API (`$state`, `$derived`, `$effect`, `$props`). No class components. |
| Build Tool | **Vite** (`^8.0.12`) | Used only for the client SPA. |
| Database | **SQLite** via `bun:sqlite` | Embedded, WAL mode. DB file lives at `packages/server/data/mspr.db`. |
| Transcoding | **FFmpeg / FFprobe** | External binaries required on `PATH`. If missing, transcoding and thumbnails are disabled; direct play still works. |
| Monorepo | Bun workspaces | Three packages under `packages/*`. |

---

## Repository Structure

```
.
├── package.json               # Root workspace manifest
├── tsconfig.json              # Root TS config with path mapping for @mspr/shared
├── docs/
│   ├── architecture/          # Design specs (may be ahead of implementation)
│   └── spec/                  # User requirements and architecture overview
├── packages/
│   ├── shared/                # Pure TypeScript types & constants
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types/media.ts
│   │       └── constants/extensions.ts
│   ├── server/                # Bun + Elysia backend
│   │   ├── src/
│   │   │   ├── index.ts              # Entry point
│   │   │   ├── config/manager.ts     # JSON config loader with fs.watch hot-reload
│   │   │   ├── db/sqlite.ts          # DB initialization
│   │   │   ├── routes/
│   │   │   │   ├── media.ts          # /media/* endpoints
│   │   │   │   └── personal.ts       # /personal/* endpoints
│   │   │   ├── scanner/engine.ts     # File system scanner
│   │   │   ├── streaming/
│   │   │   │   ├── direct-streamer.ts
│   │   │   │   ├── probe-engine.ts
│   │   │   │   ├── transcode-pipeline.ts
│   │   │   │   ├── thumbnail-generator.ts
│   │   │   │   └── hw-accel-detector.ts
│   │   │   ├── security/middleware.ts
│   │   │   └── utils/subtitle-converter.ts
│   │   └── data/
│   │       ├── config.json           # Runtime configuration (gitignored)
│   │       ├── mspr.db               # SQLite database (gitignored)
│   │       └── thumbnails/           # Cached WebP thumbnails (gitignored)
│   └── client/                # Svelte 5 SPA
│       ├── src/
│       │   ├── main.ts
│       │   ├── App.svelte            # Root component (single view, no router)
│       │   ├── app.css
│       │   ├── styles/tokens.css     # Glassmorphism design tokens
│       │   ├── components/player/
│       │   │   ├── VideoPlayer.svelte
│       │   │   └── LyricsOverlay.svelte
│       │   └── lib/player/
│       │       ├── engine.ts
│       │       └── lyrics.ts
│       ├── index.html
│       └── vite.config.ts
```

---

## Build and Development Commands

Run all commands from the repository root unless noted otherwise.

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies for all workspace packages. |
| `bun run dev:server` | Start the backend in Bun watch mode (`bun --watch src/index.ts`). |
| `bun run dev:client` | Start the Vite dev server for the frontend. |
| `bun run build` | Build all workspace packages (`bun --filter "*" build`). For the client this runs `vite build` and outputs to `packages/client/dist/`. |
| `bun run check` | (In `packages/client`) Run `svelte-check` and `tsc` for type checking. |

The server has **no build step** — Bun executes TypeScript directly. The client is the only package that gets bundled.

---

## Package Relationships

- **`@mspr/shared`** — Consumed by both server and client via `workspace:*`. Contains domain types (`MediaItem`, `AppConfig`, `ProbeResult`, etc.) and extension constants (`EXTENSION_MAP`, `SUBTITLE_EXTS`, etc.). No runtime logic.
- **`@mspr/server`** — Depends on `@mspr/shared`, `elysia`, `@elysiajs/cors`.
- **`@mspr/client`** — Depends on `@mspr/shared`. Dev dependencies include Svelte 5, Vite, and related tooling.

Path mapping in root `tsconfig.json`:
```json
"@mspr/shared": ["packages/shared/src"],
"@mspr/shared/*": ["packages/shared/src/*"]
```

---

## Code Style and Conventions

- **Module system**: ESM everywhere. All `package.json` files set `"type": "module"`.
- **Import extensions**: TypeScript source files use `.js` extensions in relative imports (e.g., `import { foo } from './bar.js'`). This is required for ESM resolution.
- **Shared imports**: Import from `@mspr/shared` without extension (e.g., `import { MediaItem } from '@mspr/shared'`).
- **Formatting**: No explicit formatter (Prettier/Biome) is configured. Keep existing indentation (2 spaces) and brace style.
- **Svelte 5 patterns**:
  - Use runes: `$state`, `$derived`, `$effect`, `$props`.
  - Components are mounted via `mount()` in `main.ts`, not instantiated with `new`.
  - Transitions are used in templates (e.g., `transition:fade`).
- **Server patterns**:
  - Elysia routes are built with `.get()`, `.post()`, etc., often with `t` validation schemas from `elysia`.
  - Database queries use raw SQL against `bun:sqlite`.
  - Async I/O prefers `Bun.file()`, `Bun.spawn()`, and `fs.promises` / `fs.*Sync` where appropriate.

---

## Configuration

The server reads `packages/server/data/config.json`. It is **gitignored**; each developer maintains their own copy.

Example structure:
```json
{
  "shares": [
    { "label": "Music", "path": "D:/Music" }
  ],
  "port": 3000,
  "security": {
    "allowedIps": [],
    "blockedIps": [],
    "pin": null
  },
  "scanner": {
    "excludeExts": ["tmp", "log", "torrent"],
    "excludeNames": ["thumbs.db", "desktop.ini", "$RECYCLE.BIN", ".git"],
    "minSize": null,
    "maxSize": null
  }
}
```

The config manager watches the file with `fs.watch()` and reloads it automatically without restarting the server.

---

## Database Schema

SQLite database at `packages/server/data/mspr.db`. Initialized programmatically in `packages/server/src/db/sqlite.ts`.

Current tables:
- **`media_items`** — `id`, `relPath`, `name`, `ext`, `kind`, `shareLabel`, `size`, `modTime`, `subtitles` (JSON string), `coverId`, `lyricsId`
- **`playback_progress`** — `mediaId`, `time`, `updatedAt`
- **`favorites`** — `mediaId`, `createdAt`

---

## API Surface

All routes are mounted under root (no `/api` prefix in the current implementation).

### Media (`/media`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/media` | List all indexed media items. |
| POST | `/media/refresh` | Trigger a full filesystem rescan. |
| GET | `/media/probe?id=` | Return probe result (strategy, codecs, dimensions, duration). |
| GET | `/media/thumbnail?id=` | Return a WebP thumbnail (cached or generated). |
| GET | `/media/stream?id=&[transcode=1]&[offset=]` | Direct stream or transcode. |
| GET | `/media/subtitle?id=` | Convert sidecar subtitle to WebVTT. |
| GET | `/media/lyric?id=` | Return raw lyric file content. |

### Personal (`/personal`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/personal/progress?id=` | Get saved playback position. |
| POST | `/personal/progress` | Save playback position (`{ id, time }`). |
| GET | `/personal/history` | Last 20 played items. |
| GET | `/personal/favorites` | List favorites. |
| POST | `/personal/favorites` | Add favorite (`{ id }`). |
| DELETE | `/personal/favorites` | Remove favorite (`{ id }`). |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/ping` | Returns `pong`. |

The client hardcodes the server base URL to `http://localhost:3000`.

---

## Streaming Architecture

1. **Probe** (`probe-engine.ts`) spawns `ffprobe -print_format json` to inspect codecs and container.
2. **Strategy decision**:
   - `direct` — browser can play natively (e.g., H.264 + AAC in MP4).
   - `transcode` — re-encode video/audio to H.264/AAC.
   - `remux` — copy streams into a compatible container.
3. **Hardware acceleration** (`hw-accel-detector.ts`) probes available encoders (nvenc, qsv, videotoolbox, vaapi, amf) and falls back to `libx264`.
4. **Transcode** (`transcode-pipeline.ts`) spawns FFmpeg with `movflags frag_keyframe+empty_moov+default_base_moof` and pipes stdout directly to the HTTP response as a `ReadableStream`. Client disconnect kills the FFmpeg process via `cancel()`.
5. **Direct stream** (`direct-streamer.ts`) uses `Bun.file()` with HTTP `Range` request support.

---

## Scanner Behavior

- Scans all directories listed in `config.json` recursively.
- Generates deterministic IDs with `crypto.createHash('md5').update(path.join(shareLabel, relPath)).digest('hex')`.
- Associates sidecars by filename prefix within the same directory:
  - Subtitles (`.srt`, `.vtt`, `.ass`) → videos
  - Lyrics (`.lrc`) → audio
  - Cover images (`cover.*`, `folder.*`, or same-named image) → audio
- Persists results in a batched SQLite transaction that clears and rewrites `media_items`.

---

## Security Considerations (Current State)

- **IP filtering** exists in `security/middleware.ts` but is not integrated into the main Elysia app yet.
- **PIN** logic reads the `X-MSP-PIN` header in some planned routes but is not enforced on existing endpoints.
- **Path sandbox** — routes reconstruct absolute paths by joining `share.path` + `item.relPath`. Always validate that the resolved path stays inside the share root.
- **No HTTPS** — intended for trusted LAN use only.
- **No rate limiting** implemented yet.
- **No auth tokens / JWT** yet.

> The architecture docs describe a more complete security model (CIDR, hashed PIN, rate limiting, JWT). The actual implementation is partially complete. Do not assume those features are wired up.

---

## Testing

**There is no testing framework configured.** There are no unit tests, integration tests, or E2E tests. Manual testing is done with the files in `packages/server/test_media/`.

If you add tests:
- The server code relies on Bun APIs (`bun:sqlite`, `Bun.file`, `Bun.spawn`), so tests should run under Bun.
- The client is a Svelte 5 SPA; consider `vitest` + `@testing-library/svelte` if adding unit tests.

---

## External Dependencies

The following must be installed on the host system and available on `PATH`:
- **ffmpeg** — transcoding, thumbnail generation, hardware acceleration detection.
- **ffprobe** — media analysis.

Without them, the server starts but transcoding and thumbnails will fail gracefully (direct play still works for compatible formats).

---

## Git Ignore Notes

The following are intentionally gitignored and will not exist on a fresh clone:
- `packages/server/data/config.json`
- `packages/server/data/mspr.db`
- `packages/server/data/thumbnails/`
- `dist/`, `static/`, `node_modules/`

New developers must create their own `config.json` before the server can scan media.

---

## Documentation

- `docs/architecture/` — Module-by-module design rationale (01–09). May describe features not yet implemented.
- `docs/spec/` — User requirements and high-level architecture overview.

Treat these as design specifications, not implementation contracts. Always verify behavior in source code.

---

## Agent Working Preferences

The following preferences are recalled from persistent memory and govern how agents should interact with the user on this project.

### Response Style

- **Concise and decisive** — The user dislikes verbose analysis and token waste. Expect terse, action-oriented responses.
- **No over-analysis** — Do not engage in "left-brain vs right-brain" deliberation (repeated self-questioning, hypothetical scenario expansion). For deterministic/common-sense issues, act immediately; analysis belongs *after* quick verification fails.
- **Fast trial-and-error** — Prefer rapid experimentation over perfect prediction. 1–2 quick probes are acceptable; more than 3 repetitive attempts are strictly prohibited.
- **Time-bound** — For environment/path issues, execute the most obvious fix within 30 seconds rather than deliberating.

### MCP Tool Usage

Configured MCP servers: **Playwright** (browser automation), **Memory** (knowledge graph), **web-search** (DuckDuckGo/Bing/Exa/Brave/Startpage via local proxy).

- **MCP first** — When multiple solutions exist and MCP can handle it, always prefer MCP.
- **No redundant workarounds** — Strictly forbidden to spin up HTTP servers, use `npx`/external CLIs, or inject file content as strings when an MCP tool (especially Playwright) already solves the problem.
- **Local HTML files** — Use `browser_run_code_unsafe` with `page.goto('file:///...')` to open local HTML; do **not** start an HTTP server.
- **Web content fetching** — `open-websearch` v2.1.11 has a bug on Windows where `fetchWebContent` rejects private/local URLs. Use **Playwright** for full-page text extraction instead.

### Environment & Package Management

- **Bun** is the preferred runtime for JS/TS (aligned with this project).
- **uv** for Python; if a `python` shim from `.local/bin` fails in Git Bash, fall back to the real uv-managed Python executable.
- **Network** — Local Socks5 proxy available on port `7890`; prefer domestic mirrors when installation sources are slow.
- **Windows basics** — Native Windows only recognizes executables with `.exe`/`.bat`/`.com` extensions. No need to verify this; treat it as given.

### Memory Management

- The user may explicitly say **"remember this"** for important details or **"step by step"** for complex problems.
- Agents should proactively persist recurring pitfalls, environment quirks, and tool-behavior notes to Memory without waiting for the user to remind them.
- Before starting browser or local-file rendering tasks, check Memory for established patterns instead of improvising new approaches.

### UI/UX Preferences

- **Emoji aversion** — The user strongly dislikes gratuitous emoji usage. Prefer plain text labels or SVG icons instead. Only use emoji when semantically required (e.g., an actual emoji picker feature).

### Safety Boundaries

- **Read-only outside project** — Reading files outside the project directory is acceptable for diagnostics/research. Writing or deleting files outside the project directory is **strictly forbidden** under all circumstances. All edits must stay within this repo.
