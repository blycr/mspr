import path from 'path';
import fs from 'fs';
import { default as db } from '../db/sqlite.js';
import { configManager } from '../config/manager.js';
import { resolveMediaPath } from '../utils/media-path.js';
import { serverError } from '../utils/errors.js';
import {
  THUMBNAIL_WIDTH,
  THUMBNAIL_VIDEO_FRAME_TIME,
  THUMBNAIL_CACHE_EXT,
  THUMBNAIL_PLACEHOLDER_WIDTH,
  THUMBNAIL_PLACEHOLDER_HEIGHT,
  THUMBNAIL_PLACEHOLDER_BG,
  THUMBNAIL_PLACEHOLDER_TEXT_COLOR,
} from '@mspr/shared';
import { STATUS_MESSAGES } from '../constants/index.js';
import type { MediaItemRow } from '@mspr/shared';

const CACHE_DIR = path.resolve(import.meta.dir, '../../data', 'thumbnails');

export class ThumbnailGenerator {
  public async getThumbnail(mediaId: string): Promise<Response> {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    const cachePath = path.join(CACHE_DIR, `${mediaId}.${THUMBNAIL_CACHE_EXT}`);

    if (fs.existsSync(cachePath)) {
      return new Response(Bun.file(cachePath), {
        headers: { 'Content-Type': 'image/webp' }
      });
    }

    const item = db.query('SELECT * FROM media_items WHERE id = ?').get(mediaId) as MediaItemRow | null;
    if (!item) return new Response(STATUS_MESSAGES.NOT_FOUND, { status: 404 });

    const fullPath = resolveMediaPath(item);
    if (!fullPath) return new Response(STATUS_MESSAGES.SHARE_NOT_FOUND, { status: 404 });

    switch (item.kind) {
      case 'audio':
        return this.generateAudioThumbnail(fullPath, cachePath, item);
      case 'image':
        return this.serveImageThumbnail(fullPath, cachePath);
      case 'video':
        return this.generateVideoThumbnail(fullPath, cachePath);
      default:
        return new Response(STATUS_MESSAGES.NOT_FOUND, { status: 404 });
    }
  }

  private async generateVideoThumbnail(fullPath: string, cachePath: string): Promise<Response> {
    try {
      const process = Bun.spawn([
        'ffmpeg',
        '-hide_banner',
        '-ss', THUMBNAIL_VIDEO_FRAME_TIME.toString(),
        '-i', fullPath,
        '-vframes', '1',
        '-vf', `scale=${THUMBNAIL_WIDTH}:-1`,
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
    return serverError(STATUS_MESSAGES.GENERATION_FAILED);
  }

  private async generateAudioThumbnail(fullPath: string, cachePath: string, item: MediaItemRow): Promise<Response> {
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

    return this.generatePlaceholderThumbnail(item.name, cachePath);
  }

  private async serveImageThumbnail(fullPath: string, cachePath: string): Promise<Response> {
    try {
      const process = Bun.spawn([
        'ffmpeg',
        '-hide_banner',
        '-i', fullPath,
        '-vf', `scale=${THUMBNAIL_WIDTH}:-1`,
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
    const initial = name.charAt(0).toUpperCase();
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${THUMBNAIL_PLACEHOLDER_WIDTH}" height="${THUMBNAIL_PLACEHOLDER_HEIGHT}" viewBox="0 0 ${THUMBNAIL_PLACEHOLDER_WIDTH} ${THUMBNAIL_PLACEHOLDER_HEIGHT}">
  <rect width="${THUMBNAIL_PLACEHOLDER_WIDTH}" height="${THUMBNAIL_PLACEHOLDER_HEIGHT}" fill="${THUMBNAIL_PLACEHOLDER_BG}"/>
  <text x="${THUMBNAIL_PLACEHOLDER_WIDTH / 2}" y="${THUMBNAIL_PLACEHOLDER_HEIGHT / 2 + 15}" font-family="system-ui, sans-serif" font-size="72" font-weight="700"
        fill="${THUMBNAIL_PLACEHOLDER_TEXT_COLOR}" text-anchor="middle" dominant-baseline="middle">${initial}</text>
</svg>`;
    // Use .svg extension for SVG placeholders to avoid mime mismatch
    const svgCachePath = cachePath.replace(`.${THUMBNAIL_CACHE_EXT}`, '.svg');
    fs.writeFileSync(svgCachePath, svg);
    return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
  }
}

export const thumbnailGenerator = new ThumbnailGenerator();
