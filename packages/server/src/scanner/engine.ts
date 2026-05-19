import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MediaItem, EXTENSION_MAP, SUBTITLE_EXTS, LYRIC_EXTS, COVER_NAMES } from '@mspr/shared';
import { configManager } from '../config/manager.js';
import db from '../db/sqlite.js';

export class ScannerEngine {
  private config = configManager.get();

  public async scanAll() {
    console.log('Starting full scan...');
    const allItems: MediaItem[] = [];
    
    for (const share of this.config.shares) {
      if (fs.existsSync(share.path)) {
        this.scanDir(share.path, '', share.label, allItems);
      }
    }

    this.associateSidecars(allItems);
    this.saveToDb(allItems);
    console.log(`Scan complete. Found ${allItems.length} items with sidecar associations.`);
  }

  private scanDir(basePath: string, relPath: string, shareLabel: string, results: MediaItem[]) {
    const currentPath = path.join(basePath, relPath);
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryRelPath = path.join(relPath, entry.name);
      
      if (this.config.scanner.excludeNames.some(name => 
        entry.name.toLowerCase() === name.toLowerCase() || 
        (name.startsWith('/') && name.endsWith('/') && new RegExp(name.slice(1, -1), 'i').test(entry.name))
      )) {
        continue;
      }

      if (entry.isDirectory()) {
        this.scanDir(basePath, entryRelPath, shareLabel, results);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).slice(1).toLowerCase();
        if (this.config.scanner.excludeExts.includes(ext)) continue;

        const stats = fs.statSync(path.join(basePath, entryRelPath));
        if (this.config.scanner.minSize && stats.size < this.config.scanner.minSize) continue;
        if (this.config.scanner.maxSize && stats.size > this.config.scanner.maxSize) continue;

        const kind = EXTENSION_MAP[ext] || 'other';
        const name = path.basename(entry.name, path.extname(entry.name));

        results.push({
          id: crypto.createHash('md5').update(path.join(shareLabel, entryRelPath)).digest('hex'),
          relPath: entryRelPath.replace(/\\/g, '/'),
          name,
          ext,
          kind,
          shareLabel,
          size: stats.size,
          modTime: Math.floor(stats.mtimeMs),
          subtitles: []
        });
      }
    }
  }

  private associateSidecars(items: MediaItem[]) {
    // Index items by directory for faster lookup
    const dirMap = new Map<string, MediaItem[]>();
    for (const item of items) {
      const dir = path.dirname(item.relPath);
      if (!dirMap.has(dir)) dirMap.set(dir, []);
      dirMap.get(dir)!.push(item);
    }

    for (const [dir, dirItems] of dirMap.entries()) {
      const videos = dirItems.filter(i => i.kind === 'video');
      const audios = dirItems.filter(i => i.kind === 'audio');
      const others = dirItems.filter(i => i.kind === 'other' || i.kind === 'image');

      // 1. Subtitles for Videos
      for (const video of videos) {
        const subs = others.filter(o => 
          SUBTITLE_EXTS.includes(o.ext) && 
          (o.name.startsWith(video.name) || video.name.startsWith(o.name))
        );
        video.subtitles = subs.map(s => ({
          id: s.id,
          label: s.name.replace(video.name, '').replace(/^[._-]/, '') || 'Default',
          src: `/media/subtitle?id=${s.id}`,
          default: false
        }));
      }

      // 2. Lyrics for Audios
      for (const audio of audios) {
        const lrc = others.find(o => 
          LYRIC_EXTS.includes(o.ext) && 
          (o.name === audio.name || o.name.startsWith(audio.name))
        );
        if (lrc) audio.lyricsId = lrc.id;
      }

      // 3. Covers for Audios (folder.jpg, cover.png, or same-named)
      for (const audio of audios) {
        const cover = others.find(o => 
          o.kind === 'image' && 
          (COVER_NAMES.includes(o.name.toLowerCase()) || o.name === audio.name)
        );
        if (cover) audio.coverId = cover.id;
      }
    }
  }

  private saveToDb(items: MediaItem[]) {
    const insert = db.prepare(`
      INSERT OR REPLACE INTO media_items (id, relPath, name, ext, kind, shareLabel, size, modTime, subtitles, coverId, lyricsId)
      VALUES ($id, $relPath, $name, $ext, $kind, $shareLabel, $size, $modTime, $subtitles, $coverId, $lyricsId)
    `);

    const transaction = db.transaction((items: MediaItem[]) => {
      db.run('DELETE FROM media_items');
      for (const item of items) {
        insert.run({
          $id: item.id,
          $relPath: item.relPath,
          $name: item.name,
          $ext: item.ext,
          $kind: item.kind,
          $shareLabel: item.shareLabel,
          $size: item.size,
          $modTime: item.modTime,
          $subtitles: JSON.stringify(item.subtitles || []),
          $coverId: item.coverId || null,
          $lyricsId: item.lyricsId || null
        });
      }
    });

    transaction(items);
  }
}

export const scannerEngine = new ScannerEngine();
