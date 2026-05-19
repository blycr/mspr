# Evolution Log: 2025-05-20

## Summary

Full-stack bugfix and frontend UX overhaul. Eliminated emoji abuse, fixed audio playback failures, improved ffmpeg detection on Windows, simplified the UI, added playlist system with play modes, and optimized lyrics display.

---

## Backend Fixes

### 1. Audio Playback Failure — `transcode-pipeline.ts`

**Root cause (layer 1 — format mismatch):** `Content-Type` header for audio-only transcodes was incorrectly set to `audio/mpeg`, but the output format was always fMP4 (`-f mp4`). Browsers receiving `audio/mpeg` would attempt MP3 decoding on MP4 data, causing decode errors.

**Root cause (layer 2 — Bun ReadableStream binary corruption):** After fixing the format to output genuine MP3, audio still failed with "Format not supported." Deep investigation revealed that Bun's `ReadableStream` + `new Response(stream)` pipeline corrupts binary data when served over HTTP on Windows. Specifically, ~90% of MPEG audio frames were replaced with the UTF-8 replacement character sequence `0xEF 0xBF 0xBD`. This was verified by:
1. Direct `Bun.spawn` → `arrayBuffer()` = clean data
2. Same data through `new Response(stream)` → `arrayBuffer()` = clean data
3. Same data through Elysia/Bun HTTP server with `ReadableStream` = corrupted data
4. Same data through Elysia/Bun HTTP server with buffered `ArrayBuffer` = clean data

**Fix:**
- Audio-only transcodes now output genuine MP3 (`-c:a libmp3lame -f mp3`) instead of fMP4.
- **Critical:** Replaced streaming `ReadableStream` response with buffered `ArrayBuffer` response. FFmpeg stdout is fully collected into memory before constructing the `Response`. This avoids Bun's `ReadableStream` binary corruption bug.
- Video transcodes also switched to buffered mode for consistency.
- Added `-hide_banner` to reduce log noise.
- Fixed NVENC preset: changed `-crf` to `-cq` (NVENC does not support CRF).

### 2. FFmpeg Hardware Acceleration Detection — `hw-accel-detector.ts`

**Problem:** On Windows, `Bun.spawn(['ffmpeg', ...])` may fail if the binary is only available as `ffmpeg.exe`. Additionally, the fallback message was ambiguous, making users think ffmpeg was missing entirely rather than simply lacking GPU acceleration.

**Fix:**
- Added `findFfmpeg()` that probes both `ffmpeg` and `ffmpeg.exe`.
- Replaced emoji logs with structured `[HWAccel]` prefix logs.
- Clarified the CPU fallback message to explain that CPU-only ffmpeg builds or systems without supported GPUs are normal scenarios.

### 3. Thumbnail Generation — `thumbnail-generator.ts`

**Problem:** Only video files generated thumbnails. Audio files returned 404, and image files had no preview.

**Fix:**
- Audio: first attempts to extract embedded cover art via ffmpeg; falls back to an SVG placeholder with the file's initial letter.
- Image: resizes to webp via ffmpeg; falls back to serving the original file.
- Video: unchanged frame-at-10s logic.

### 4. Added Opus Support — `shared/src/constants/extensions.ts`

- Added `'opus': 'audio'` to `EXTENSION_MAP`.

### 5. Console Log Cleanup

- Replaced all emoji console logs across the server with bracket-prefixed logs (`[Transcode]`, `[Probe]`, `[Scanner]`, `[Config]`, `[Server]`).
- Fixed `configManager.watch()` to silently skip if `config.json` does not yet exist.

### 6. Scanner Config Hot-Reload — `scanner/engine.ts`

**Problem:** `ScannerEngine` cached `configManager.get()` in its constructor. When the config file was edited and hot-reloaded, subsequent `scanAll()` calls still used the stale config reference.

**Fix:** `scanAll()` now fetches fresh config at invocation time and passes it down to `scanDir()` as an explicit parameter.

---

## Frontend Fixes

### 1. Emoji Elimination

**Removed from UI:**
- `▲` logo → `Icon` component with SVG triangle
- `📁` All Library → Text + folder icon SVG
- `🎬` Videos → Text + video icon SVG
- `🎵` Music → Text + music icon SVG
- `🕒` Recent → Text + clock icon SVG
- `▶` Play button → SVG play icon
- `📄` File fallback → Initial-letter placeholder
- `⚠️` Error state → SVG warning icon

**Created:** `src/components/Icon.svelte` — single source of truth for inline SVG icons.

### 2. Player Fixes — `VideoPlayer.svelte`

- **Subtitle URLs:** Scanner stores relative paths (`/media/subtitle?id=...`). The frontend dev server runs on a different port, so these 404'd. Added `$derived` mapping that converts relative subtitle URLs to absolute URLs via `api.subtitleUrl()`.
- **Error handling:** `handleVideoError` now inspects `MediaError.code` and shows specific messages (network/decode/format) instead of a generic catch-all.
- **Progress save:** Close button now `await`s `saveProgress()` before calling `onClose()`.
- **Loading state:** Added explicit `isLoading` state to avoid showing the video element before `src` is ready.
- **Resume toast removed:** Smart resume behavior — manual click auto-seeks to saved progress (>10s), auto-advance starts from beginning.
- **Play modes:** Added mode button with `shuffle`/`repeat` icons, cycling through loop/shuffle/repeat-one.
- **Playlist controls:** Added prev/next buttons in audio control bar and video header.

### 3. App.svelte Overhaul

- **Removed god-component bloat:** Extracted `api.ts` and `format.ts` into `src/lib/`.
- **Removed dead code:** Deleted `Counter.svelte`, Vite template assets (`hero.png`, `svelte.svg`, `vite.svg`), and purged `app.css` (was 296 lines of unused template styles).
- **Added image tab:** New "Images" category alongside All/Videos/Music/Recent.
- **Accessibility:** Media cards now support keyboard activation (`Enter`/`Space`), have `aria-label`, and show `focus-visible` outlines.
- **Hardcoded URL elimination:** All `fetch('http://localhost:3000/...')` replaced with `api.*` helpers.
- **UI simplification:**
  - Sidebar width: 280px → 220px
  - Card hover: extreme translateY(-12px) + 60px shadow → subtle translateY(-4px) + border highlight
  - Card grid: minmax(260px, 1fr) → minmax(200px, 1fr) for denser layout
  - Removed "Local Node Online" status indicator
  - Simplified loading text: "Indexing your high-fidelity collection..." → "Loading..."
  - Simplified pagination button: "Discover More" → "Load More"
  - Search placeholder shortened
- **Playlist integration:** `handleCardClick` builds kind-specific playlist, `handleNext`/`handlePrev` advance with `isAutoPlay` flag.

### 4. LyricsOverlay Fix

- Replaced hardcoded `http://localhost:3000` with `api.baseUrl`.
- Desktop active line: `transform: scale(1.1)` + `text-shadow`.
- Mobile active line: `text-shadow` only (removed scale to prevent overflow clipping).
- Removed `mask-image` gradient to avoid edge fade-out masking.
- Padding: `60px 20px` for breathing room.

### 5. Playlist System — `src/lib/player/playlist.ts`

**New:** `PlaylistManager` singleton with per-kind playback lists:
- `setPlaylist(items, startIndex)` — initializes list, resets round tracking
- `next()` — weighted random selection for shuffle mode (played=0.05, unplayed=1.0, auto-reshuffle when round completes)
- `prev()` — decrements index with wrap
- `toggleMode()` — cycles loop → shuffle → repeat-one
- `mode` state synced to `App.svelte` via `$state`

### 6. Smart Resume

- Removed resume toast UI (user feedback: too intrusive).
- Manual click on card → auto-seeks to saved progress if > 10 seconds.
- Auto-advance (`onNext`/`onPrev`/`handleEnded`) → starts from beginning.

---

## Known Issues (Unresolved)

### Mobile Audio Player Lyrics Height Bug

**Status:** Attempted multiple fixes, none fully resolved.

**Symptom:** On mobile audio player, the currently highlighted lyric line (active line) appears too low on screen, visually "blocked" by the playback controls panel (`.audio-left`).

**Attempted fixes:**
1. `flex: 1` chain on `.player-content` and `.lyrics-section`
2. JS ResizeObserver calculating exact remaining height
3. `display: contents` on `.player-main.audio-layout` to let children participate in parent flex layout directly

**Likely correct approach:** Adjust LyricsOverlay auto-scroll offset on mobile so active line scrolls to upper portion of container (e.g., 20-30% from top) instead of exact center. Alternatively, restructure DOM so `.audio-left` is a sibling of `.player-main` rather than a child.

---

## Files Changed

### New
- `packages/client/src/components/Icon.svelte`
- `packages/client/src/components/MediaCard.svelte`
- `packages/client/src/lib/api.ts`
- `packages/client/src/lib/format.ts`
- `packages/client/src/lib/player/playlist.ts`
- `docs/evolution/2025-05-20-ui-rewrite-and-bugfixes.md`
- `docs/evolution/SESSION-HANDOFF-2025-05-20.md`

### Modified
- `packages/client/src/App.svelte`
- `packages/client/src/components/player/VideoPlayer.svelte`
- `packages/client/src/components/player/LyricsOverlay.svelte`
- `packages/client/src/lib/player/engine.ts`
- `packages/client/src/app.css`
- `packages/client/src/styles/tokens.css`
- `packages/server/src/streaming/transcode-pipeline.ts`
- `packages/server/src/streaming/hw-accel-detector.ts`
- `packages/server/src/streaming/thumbnail-generator.ts`
- `packages/server/src/streaming/probe-engine.ts`
- `packages/server/src/config/manager.ts`
- `packages/server/src/index.ts`
- `packages/server/src/scanner/engine.ts`
- `packages/shared/src/constants/extensions.ts`
- `AGENTS.md`

### Deleted
- `packages/client/src/lib/Counter.svelte`
- `packages/client/src/assets/hero.png`
- `packages/client/src/assets/svelte.svg`
- `packages/client/src/assets/vite.svg`
