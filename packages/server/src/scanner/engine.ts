import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { MediaItem, AppConfig } from '@mspr/shared';
import {
  EXTENSION_MAP,
  SUBTITLE_EXTS,
  LYRIC_EXTS,
  COVER_NAMES,
  SCANNER_ID_HASH_ALGO,
} from '@mspr/shared';
import { LOG_PREFIX } from '../constants/index.js';
import { configManager } from '../config/manager.js';
import { default as db } from '../db/sqlite.js';
import { DB_TABLES } from '../constants/index.js';

interface CompiledExcludeRule {
  type: 'exact' | 'regex';
  value: string;
  regex?: RegExp;
}

function compileExcludeRules(names: string[]): CompiledExcludeRule[] {
  return names.map(name => {
    if (name.startsWith('/') && name.endsWith('/')) {
      return {
        type: 'regex',
        value: name,
        regex: new RegExp(name.slice(1, -1), 'i')
      };
    }
    return { type: 'exact', value: name.toLowerCase() };
  });
}

function shouldExclude(entryName: string, rules: CompiledExcludeRule[]): boolean {
  const lower = entryName.toLowerCase();
  for (const rule of rules) {
    if (rule.type === 'exact' && lower === rule.value) return true;
    if (rule.type === 'regex' && rule.regex?.test(entryName)) return true;
  }
  return false;
}

function generateId(shareLabel: string, relPath: string): string {
  // Use forward slashes for consistent cross-platform IDs
  const normalized = path.posix.join(shareLabel, relPath.replace(/\\/g, '/'));
  return crypto.createHash(SCANNER_ID_HASH_ALGO).update(normalized).digest('hex');
}

function associateSidecars(items: MediaItem[]) {
  const dirMap = new Map<string, MediaItem[]>();
  for (const item of items) {
    const dir = path.dirname(item.relPath);
    if (!dirMap.has(dir)) dirMap.set(dir, []);
    dirMap.get(dir)!.push(item);
  }

  for (const [, dirItems] of dirMap.entries()) {
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

    // 3. Covers for Audios
    for (const audio of audios) {
      const cover = others.find(o =>
        o.kind === 'image' &&
        (COVER_NAMES.includes(o.name.toLowerCase()) || o.name === audio.name)
      );
      if (cover) audio.coverId = cover.id;
    }
  }
}

export class ScannerEngine {
  public async scanAll() {
    const config = configManager.get();
    console.log(`${LOG_PREFIX.SCANNER} Starting full scan...`);
    const allItems: MediaItem[] = [];

    const excludeRules = compileExcludeRules(config.scanner.excludeNames);

    for (const share of config.shares) {
      if (fs.existsSync(share.path)) {
        this.scanDir(share.path, '', share.label, allItems, config, excludeRules);
      }
    }

    associateSidecars(allItems);
    this.saveToDb(allItems);
    console.log(`${LOG_PREFIX.SCANNER} Complete. Found ${allItems.length} items.`);
  }

  private scanDir(
    basePath: string,
    relPath: string,
    shareLabel: string,
    results: MediaItem[],
    config: AppConfig,
    excludeRules: CompiledExcludeRule[]
  ) {
    const currentPath = path.join(basePath, relPath);
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryRelPath = path.posix.join(relPath, entry.name);

      if (shouldExclude(entry.name, excludeRules)) {
        continue;
      }

      if (entry.isDirectory()) {
        this.scanDir(basePath, entryRelPath, shareLabel, results, config, excludeRules);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).slice(1).toLowerCase();
        if (config.scanner.excludeExts.includes(ext)) continue;

        const stats = fs.statSync(path.join(basePath, entryRelPath));
        if (config.scanner.minSize && stats.size < config.scanner.minSize) continue;
        if (config.scanner.maxSize && stats.size > config.scanner.maxSize) continue;

        const kind = EXTENSION_MAP[ext] || 'other';

        if (kind === 'other' && !SUBTITLE_EXTS.includes(ext) && !LYRIC_EXTS.includes(ext)) {
          continue;
        }

        const name = path.basename(entry.name, path.extname(entry.name));

        results.push({
          id: generateId(shareLabel, entryRelPath),
          relPath: entryRelPath,
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

  private saveToDb(items: MediaItem[]) {
    const insert = db.prepare(`
      INSERT OR REPLACE INTO ${DB_TABLES.MEDIA_ITEMS} (id, relPath, name, ext, kind, shareLabel, size, modTime, subtitles, coverId, lyricsId)
      VALUES ($id, $relPath, $name, $ext, $kind, $shareLabel, $size, $modTime, $subtitles, $coverId, $lyricsId)
    `);

    const transaction = db.transaction((items: MediaItem[]) => {
      db.run(`DELETE FROM ${DB_TABLES.MEDIA_ITEMS}`);
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
