# Module Dependency Graph

> Auto-generated. Last updated: 2026-05-20.

## Server Import Graph

```mermaid
graph TD
    A[index.ts] --> B[config/manager.ts]
    A --> C[routes/media.ts]
    A --> D[routes/personal.ts]
    A --> E[streaming/hw-accel-detector.ts]
    A --> F[scanner/engine.ts]

    C --> G[db/sqlite.ts]
    C --> F
    C --> H[streaming/probe-engine.ts]
    C --> I[streaming/direct-streamer.ts]
    C --> J[streaming/transcode-pipeline.ts]
    C --> K[streaming/thumbnail-generator.ts]
    C --> B

    D --> G

    F --> B
    F --> G
    F --> L[@mspr/shared]

    E --> L
    H --> L
    H --> G
    J --> E
    J --> L

    M[security/middleware.ts] --> B

    K -.dynamic.-> B
    K -.dynamic.-> G
    H -.dynamic.-> B

    N[utils/subtitle-converter.ts] --> |none| O[leaf]
```

## Client Import Graph

```mermaid
graph TD
    A[main.ts] --> B[App.svelte]
    B --> C[components/Icon.svelte]
    B --> D[components/MediaCard.svelte]
    B --> E[components/player/VideoPlayer.svelte]
    E --> C
    E --> F[components/player/LyricsOverlay.svelte]
    E --> G[lib/player/engine.ts]
    E --> H[lib/api.ts]
    E --> I[lib/format.ts]
    F --> H
    F --> J[lib/player/lyrics.ts]
    D --> C
    D --> H
    D --> I
    B --> H
    B --> K[lib/player/playlist.ts]
    G --> H
    G --> L[@mspr/shared]
```

## Function Call Graph (Server)

### Entry / Orchestration
- `index.ts:getLanIPs()` — utility, no dependents
- `index.ts` IIFE — calls `hwAccelDetector.detect()` → `scannerEngine.scanAll()`

### Config Layer
- `ConfigManager`
  - `load()` → `save()` (on missing file)
  - `get()` ← used by: `index.ts`, `media.ts`, `scanner/engine.ts`, `security/middleware.ts`, `probe-engine.ts`, `thumbnail-generator.ts`
  - `watch()` — side effect on module load

### Database Layer
- `db` (SQLite instance)
  - `db.query()` / `db.run()` / `db.transaction()` ← used by: `media.ts`, `personal.ts`, `scanner/engine.ts`, `probe-engine.ts`, `thumbnail-generator.ts`

### Scanner Layer
- `ScannerEngine.scanAll()` → `scanDir()` → `associateSidecars()` → `saveToDb()`
  - `scanDir()` recursive — walks filesystem, filters by `excludeExts`/`excludeNames`/`minSize`/`maxSize`
  - `associateSidecars()` — matches subtitles → videos, lyrics → audio, covers → audio
  - `saveToDb()` — batched SQLite transaction

### Streaming Layer
- `ProbeEngine.probe()` → spawns `ffprobe` → returns `ProbeResult`
- `DirectStreamer.stream()` → `Bun.file()` with Range support
- `TranscodePipeline.transcode()` → spawns `ffmpeg` → returns `Response`
  - Uses `hwAccelDetector.getResult()` for encoder selection
- `ThumbnailGenerator.getThumbnail()` → branch by `kind`
  - `generateVideoThumbnail()` → `ffmpeg -ss 10`
  - `generateAudioThumbnail()` → `ffmpeg -an` (embedded cover) || `generatePlaceholderThumbnail()`
  - `serveImageThumbnail()` → `ffmpeg` resize || original fallback

### Route Layer
- `mediaRoutes`
  - `GET /media` → `db.query()`
  - `POST /media/refresh` → `scannerEngine.scanAll()`
  - `GET /media/probe` → `probeEngine.probe()`
  - `GET /media/thumbnail` → `thumbnailGenerator.getThumbnail()`
  - `GET /media/stream` → path resolve → `probeEngine.probe()` → `transcodePipeline.transcode()` || `directStreamer.stream()`
  - `GET /media/subtitle` → `Bun.file()` → `SubtitleConverter.toVTT()`
  - `GET /media/lyric` → `Bun.file()`
- `personalRoutes`
  - `GET /personal/progress` → `db.query()`
  - `POST /personal/progress` → `db.run()`
  - `GET /personal/history` → `db.query()` JOIN
  - `GET|POST|DELETE /personal/favorites` → `db.run()`

## Known Architectural Gaps

1. **`securityMiddleware` is defined but never wired** into the Elysia app.
2. **`probe-engine.ts` and `thumbnail-generator.ts` use dynamic imports** for `configManager` and `db` to avoid circular dependencies, but the circular chain is unclear and should be documented or refactored.
3. **Path resolution logic is duplicated** in `media.ts`, `probe-engine.ts`, and `thumbnail-generator.ts` (lookup share by label → `path.join`).
4. **`App` type export** in `index.ts` is unused.
5. **No API prefix** — routes mount at root (`/media`, `/personal`), which may clash with static file serving.
