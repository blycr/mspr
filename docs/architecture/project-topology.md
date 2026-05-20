# MSP Project Topology

> Auto-generated architecture map. Last updated: 2026-05-20.

## Monorepo Layout

```
.
├── package.json                 # Bun workspace root
├── tsconfig.json                # Path mapping: @mspr/shared
├── scripts/
│   ├── dev.mjs                  # Concurrent dev launcher (server + Vite)
│   ├── start.mjs                # Production launcher
│   └── cleanup.mjs              # Process killer / dist cleaner
├── packages/
│   ├── shared/                  # Pure types & constants
│   │   └── src/
│   │       ├── index.ts         # Re-exports
│   │       ├── types/media.ts   # Domain types
│   │       └── constants/
│   │           └── extensions.ts
│   ├── server/                  # Bun + Elysia backend
│   │   ├── src/
│   │   │   ├── index.ts         # Entry point
│   │   │   ├── config/manager.ts
│   │   │   ├── db/sqlite.ts
│   │   │   ├── routes/media.ts
│   │   │   ├── routes/personal.ts
│   │   │   ├── scanner/engine.ts
│   │   │   ├── security/middleware.ts
│   │   │   ├── streaming/
│   │   │   │   ├── direct-streamer.ts
│   │   │   │   ├── hw-accel-detector.ts
│   │   │   │   ├── probe-engine.ts
│   │   │   │   ├── thumbnail-generator.ts
│   │   │   │   └── transcode-pipeline.ts
│   │   │   └── utils/
│   │   │       └── subtitle-converter.ts
│   │   └── data/                # Runtime data (gitignored)
│   │       ├── config.json
│   │       ├── mspr.db
│   │       └── thumbnails/
│   └── client/                  # Svelte 5 SPA (Vite)
│       ├── src/
│       │   ├── main.ts
│       │   ├── App.svelte
│       │   ├── app.css
│       │   ├── styles/tokens.css
│       │   ├── components/
│       │   │   ├── Icon.svelte
│       │   │   ├── MediaCard.svelte
│       │   │   └── player/
│       │   │       ├── VideoPlayer.svelte
│       │   │       └── LyricsOverlay.svelte
│       │   └── lib/
│       │       ├── api.ts
│       │       ├── format.ts
│       │       └── player/
│       │           ├── engine.ts
│       │           ├── lyrics.ts
│       │           └── playlist.ts
│       ├── index.html
│       └── vite.config.ts
└── docs/
    ├── architecture/            # This directory
    ├── evolution/
    └── spec/
```

## Package Dependency Graph

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   @mspr/client  │────▶│   @mspr/shared  │◀────│   @mspr/server  │
│   (Vite/Svelte) │     │  (types/consts) │     │  (Bun/Elysia)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                              │
        │ dev proxy                                    │ direct Bun
        ▼                                              ▼
   localhost:5173                                localhost:3000
```

## Cross-Cutting Data Flow

```
config.json ──▶ ConfigManager ──▶ ScannerEngine ──▶ SQLite (mspr.db)
                                      │
                                      ▼
                              media_items table ◀──▶ Routes (media/personal)
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
            DirectStreamer    TranscodePipeline   ThumbnailGenerator
            ProbeEngine       HWAccelDetector     SubtitleConverter
```
