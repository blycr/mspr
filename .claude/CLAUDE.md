# MSP (Media Share & Preview) — Claude Guide

This is the Claude-specific harness guide. For full project architecture, see [`AGENTS.md`](../AGENTS.md) in the repository root.

## Quick Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies for all workspace packages |
| `bun run dev` | Start backend + Vite dev server (cleans previous builds, kills lingering processes) |
| `bun run start` | Production mode: build client + start server |
| `bun run build` | Build all workspace packages (`bun --filter "*" build`) |
| `bun run dev:server` | Backend only in Bun watch mode |
| `bun run dev:client` | Vite dev server only |
| `cd packages/client && bun run check` | Type-check client (svelte-check + tsc) |

## Stack Notes

- **Runtime**: Bun (not Node.js). Uses `bun:sqlite`, `Bun.spawn()`, `Bun.file()`.
- **Server**: Elysia with CORS. No build step — Bun executes TypeScript directly.
- **Client**: Svelte 5 (runes API), Vite. Only package that gets bundled.
- **Monorepo**: Bun workspaces. `@mspr/shared` consumed via `workspace:*`.
- **ESM everywhere**: `.js` extensions in relative imports. No CommonJS.

## New Developer Setup

1. `bun install`
2. Create `packages/server/data/config.json` (gitignored, see `AGENTS.md` for schema)
3. Ensure `ffmpeg` and `ffprobe` are on PATH (optional but recommended)
4. `bun run dev`

## Testing

No test framework is configured. Manual testing uses files in `packages/server/test_media/`.

If adding tests:
- Server: must run under Bun (relies on `bun:sqlite`, `Bun.file`, `Bun.spawn`)
- Client: consider `vitest` + `@testing-library/svelte`
