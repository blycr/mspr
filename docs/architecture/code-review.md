# Code Review & Normalization Notes

> Generated during deep exploration. Items marked [DONE] are already fixed.

## Naming Inconsistencies

| Current | Suggested | Location | Reason |
|---------|-----------|----------|--------|
| `getLanIps` | `getLanIPs` | `server/src/index.ts` | "IP" is an acronym; capitalize both letters |
| `securityMiddleware` | — | `server/src/security/middleware.ts` | Name implies Express-style middleware, but it's an Elysia plugin factory. Rename or document. |

## Import Style Inconsistencies

### Client (`packages/client/src/`)
- Some relative imports use `.js` extension (`../lib/api.js`)
- Some omit the extension (`../../lib/player/lyrics`)
- **Rule**: ESM requires `.js` for relative imports. Normalize all client relative imports to include `.js`.

### Server (`packages/server/src/`)
- Generally consistent with `.js` extensions for relative imports.
- **Exception**: `thumbnail-generator.ts` and `probe-engine.ts` use `await import('../config/manager.js')` dynamically. Should be static imports unless there's a real circular dependency.

## Singleton Export Pattern

All major service classes follow the same pattern (export class + export instance). This is consistent and acceptable.

| File | Class | Instance |
|------|-------|----------|
| `config/manager.ts` | `ConfigManager` | `configManager` |
| `scanner/engine.ts` | `ScannerEngine` | `scannerEngine` |
| `streaming/direct-streamer.ts` | `DirectStreamer` | `directStreamer` |
| `streaming/hw-accel-detector.ts` | `HWAccelDetector` | `hwAccelDetector` |
| `streaming/probe-engine.ts` | `ProbeEngine` | `probeEngine` |
| `streaming/thumbnail-generator.ts` | `ThumbnailGenerator` | `thumbnailGenerator` |
| `streaming/transcode-pipeline.ts` | `TranscodePipeline` | `transcodePipeline` |
| `lib/player/engine.ts` | `PlayerEngine` | `playerEngine` |
| `lib/player/playlist.ts` | `PlaylistManager` | `playlistManager` |

**Outlier**: `SubtitleConverter` only exports the class (no instance) because it has only static methods. Acceptable.

## Hard-Coded Values

### Server API port
- `packages/client/src/lib/api.ts` hardcodes `:3000`.
- In production (same-domain), this should ideally use a relative path or be overridable via env.
- **Current mitigation**: `API_BASE` already checks `import.meta.env?.VITE_API_URL`, but the fallback is hardcoded.

### Config file path
- `packages/server/src/config/manager.ts` hardcodes `../../data/config.json`.
- This is acceptable because it's anchored to `import.meta.dir`, so it survives cwd changes.

### Static file serving path
- `packages/server/src/index.ts` hardcodes `../../client/dist`.
- Acceptable for a monorepo.

## Structural Duplications

### Path resolution (3x duplicate)
Three files contain the same share-lookup + path-join logic:
```typescript
const config = configManager.get();
const share = config.shares.find(s => s.label === item.shareLabel);
if (!share) return ...;
const fullPath = path.join(share.path, item.relPath);
```
- `routes/media.ts` (stream, subtitle, lyric)
- `streaming/probe-engine.ts`
- `streaming/thumbnail-generator.ts`

**Recommendation**: Extract to `resolveMediaPath(item): string | null` in a shared server utility.

## Dead / Unused Code

1. `securityMiddleware` — defined, never imported/used in `index.ts`.
2. `export type App = typeof app` — exported but unused anywhere in the server source.

## Circular Dependency Risk

- `probe-engine.ts` dynamically imports `config/manager.js`.
- `thumbnail-generator.ts` dynamically imports both `config/manager.js` and `db/sqlite.js`.
- There is no obvious static circular dependency between these modules. The dynamic imports appear to be unnecessary and should be converted to static imports for clarity and performance.
