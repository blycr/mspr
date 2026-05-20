# MSP (Media Share & Preview)

MSP is a high-performance, private media server for local networks. Built with **Bun**, **Elysia**, and **Svelte 5**, it provides a premium experience for browsing and streaming your local media collection.

## Features

- **Instant Streaming**: Zero-copy streaming for supported formats.
- **On-the-fly Transcoding**: Automatic FFmpeg-powered transcoding for incompatible codecs (with GPU hardware acceleration on NVIDIA/Intel/AMD).
- **Smart Metadata**: Automatic association of lyrics, subtitles, and covers.
- **Premium UI**: Modern dark-mode interface with glassmorphism and smooth animations.
- **Playlist & Play Modes**: Loop, shuffle, and repeat-one with per-kind playlists.
- **Smart Resume**: Auto-resume to saved playback position on manual play.
- **LAN Access**: Works across all devices on your local network via browser.
- **Lightweight**: Single-executable feel with Bun and an embedded SQLite database.

## Installation

1. **Install Bun**:
   ```powershell
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```
2. **Install FFmpeg**: Ensure `ffmpeg` and `ffprobe` are in your system PATH.
3. **Clone & Setup**:
   ```bash
   git clone <repo-url>
   cd mspr
   bun install
   ```

## Usage

### 1. Configure Shares

Edit `packages/server/data/config.json` to add your media directories:

```json
{
  "shares": [
    { "label": "Movies", "path": "D:/Movies" },
    { "label": "Music", "path": "D:/Music" }
  ],
  "port": 3000
}
```

### 2. Development Mode

Starts backend (port 3000) + Vite dev server (port 5173) with auto-reload:

```bash
bun run dev
```

- Open `http://localhost:5173` for dev client with HMR
- Backend API runs at `http://localhost:3000`

### 3. Production Mode

Builds the frontend and starts the server (serves static files from a single port):

```bash
bun run start
```

- Open `http://localhost:3000` (or the LAN IP shown in the console)
- All devices on your network can access it via `http://<lan-ip>:3000`

The server automatically prints both localhost and LAN addresses on startup.

## License

MIT
