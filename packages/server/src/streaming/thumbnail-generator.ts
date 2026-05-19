import { probeEngine } from './probe-engine.js';
import path from 'path';
import fs from 'fs';

export class ThumbnailGenerator {
  public async getThumbnail(mediaId: string): Promise<Response> {
    const { configManager } = await import('../config/manager.js');
    const { default: db } = await import('../db/sqlite.js');
    
    const CACHE_DIR = path.resolve(process.cwd(), 'data', 'thumbnails');
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

    const cachePath = path.join(CACHE_DIR, `${mediaId}.webp`);

    if (fs.existsSync(cachePath)) {
      return new Response(Bun.file(cachePath));
    }

    const item = db.query('SELECT * FROM media_items WHERE id = ?').get(mediaId) as any;
    if (!item || item.kind !== 'video') return new Response('Not found', { status: 404 });

    const config = configManager.get();
    const share = config.shares.find(s => s.label === item.shareLabel);
    if (!share) return new Response('Share not found', { status: 404 });

    const fullPath = path.join(share.path, item.relPath);

    try {
      const process = Bun.spawn([
        'ffmpeg',
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
      console.error('Thumbnail generation failed:', e);
    }

    return new Response('Generation failed', { status: 500 });
  }
}

export const thumbnailGenerator = new ThumbnailGenerator();
