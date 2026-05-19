# MSP (Media Share & Preview)

MSP is a high-performance, private media server for local networks. Built with **Bun**, **Elysia**, and **Svelte 5**, it provides a premium experience for browsing and streaming your local media collection.

## 🚀 Features

- **Instant Streaming**: Zero-copy streaming for supported formats.
- **On-the-fly Transcoding**: Automatic FFmpeg-powered transcoding for all media types.
- **Smart Metadata**: Automatic association of lyrics, subtitles, and covers.
- **Premium UI**: Modern dark-mode interface with glassmorphism and smooth animations.
- **Lightweight**: Single-executable feel with Bun and an embedded SQLite database.

## 🛠️ Installation

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

## 📖 Usage

1. **Configure Shares**: Edit `packages/server/data/config.json` to add your media directories.
2. **Start Server**:
   ```bash
   bun run dev
   ```
3. **Open Browser**: Go to `http://localhost:5173` (Client) or `http://localhost:3000` (Server).

## 📄 License
MIT
