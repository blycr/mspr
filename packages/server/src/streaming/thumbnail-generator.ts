import path from 'path';
import fs from 'fs';
import db from '../db/sqlite.js';
import { configManager } from '../config/manager.js';
import { resolveMediaPath } from '../utils/media-path.js';

export class ThumbnailGenerator {
  public async getThumbnail(mediaId: string): Promise<Response> {

    const CACHE_DIR = path.resolve(import.meta.dir, '../../data', 'thumbnails');
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

    const cachePath = path.join(CACHE_DIR, `${mediaId}.webp`);

    if (fs.existsSync(cachePath)) {
      return new Response(Bun.file(cachePath));
    }

    const item = db.query('SELECT * FROM media_items WHERE id = ?').get(mediaId) as any;
    if (!item) return new Response('Not found', { status: 404 });

    const fullPath = resolveMediaPath(item);
    if (!fullPath) return new Response('Share not found', { status: 404 });

    // Audio: try to extract embedded cover art, or generate a waveform-style placeholder
    if (item.kind === 'audio') {
      return this.generateAudioThumbnail(fullPath, cachePath, item);
    }

    // Image: return the image itself, resized if needed
    if (item.kind === 'image') {
      return this.serveImageThumbnail(fullPath, cachePath);
    }

    // Video: extract frame at 10s
    if (item.kind === 'video') {
      return this.generateVideoThumbnail(fullPath, cachePath);
    }

    return new Response('Not supported', { status: 404 });
  }

  private async generateVideoThumbnail(fullPath: string, cachePath: string): Promise<Response> {
    try {
      const process = Bun.spawn([
        'ffmpeg',
        '-hide_banner',
        '-ss', '10',
        '-i', fullPath,
        '-vframes', '1',
        '-vf', 'scale=320:-1',
        '-f', 'image2pipe',
        '-c:v', 'webp',
        'pipe:1'
      ]);

      const buffer = await new Response(process.stdout).arrayBuffer();
      if (buffer.byteLength > 0) {
        fs.writeFileSync(cachePath, Buffer.from(buffer));
        return new Response(buffer, { headers: { 'Content-Type': 'image/webp' } });
      }
    } catch (e) {
      console.error('[Thumbnail] Video generation failed:', e);
    }
    return new Response('Generation failed', { status: 500 });
  }

  private async generateAudioThumbnail(fullPath: string, cachePath: string, item: any): Promise<Response> {
    // First try to extract embedded cover art
    try {
      const process = Bun.spawn([
        'ffmpeg',
        '-hide_banner',
        '-i', fullPath,
        '-an',
        '-vcodec', 'copy',
        '-f', 'image2pipe',
        'pipe:1'
      ]);
      const buffer = await new Response(process.stdout).arrayBuffer();
      if (buffer.byteLength > 100) {
        fs.writeFileSync(cachePath, Buffer.from(buffer));
        return new Response(buffer, { headers: { 'Content-Type': 'image/webp' } });
      }
    } catch {
      // No embedded cover, generate a visual placeholder
    }

    // Fallback: generate a simple colored placeholder with text
    return this.generatePlaceholderThumbnail(item.name, cachePath);
  }

  private async serveImageThumbnail(fullPath: string, cachePath: string): Promise<Response> {
    try {
      // For images, just copy and convert to webp via ffmpeg for consistency
      const process = Bun.spawn([
        'ffmpeg',
        '-hide_banner',
        '-i', fullPath,
        '-vf', 'scale=320:-1',
        '-f', 'image2pipe',
        '-c:v', 'webp',
        'pipe:1'
      ]);
      const buffer = await new Response(process.stdout).arrayBuffer();
      if (buffer.byteLength > 0) {
        fs.writeFileSync(cachePath, Buffer.from(buffer));
        return new Response(buffer, { headers: { 'Content-Type': 'image/webp' } });
      }
    } catch (e) {
      console.error('[Thumbnail] Image resize failed:', e);
    }
    // Fallback: serve original
    return new Response(Bun.file(fullPath));
  }

  private async generatePlaceholderThumbnail(name: string, cachePath: string): Promise<Response> {
    // Create a simple SVG placeholder with the first letter of the filename
    const initial = name.charAt(0).toUpperCase();
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
  <rect width="320" height="200" fill="#1a1a2e"/>
  <text x="160" y="115" font-family="system-ui, sans-serif" font-size="72" font-weight="700"
        fill="#8b5cf6" text-anchor="middle" dominant-baseline="middle">${initial}</text>
</svg>`;
    fs.writeFileSync(cachePath, svg);
    return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
  }
}

export const thumbnailGenerator = new ThumbnailGenerator();
