import { Database } from 'bun:sqlite';
import path from 'path';
import fs from 'fs';
import { DB_TABLES } from '../constants/index.js';
import type { MediaItemRow, PlaybackProgressRow, FavoriteRow } from '@mspr/shared';

const DATA_DIR = path.resolve(import.meta.dir, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, 'mspr.db'));

// Initialize tables
db.run(`
  CREATE TABLE IF NOT EXISTS ${DB_TABLES.MEDIA_ITEMS} (
    id TEXT PRIMARY KEY,
    relPath TEXT NOT NULL,
    name TEXT NOT NULL,
    ext TEXT NOT NULL,
    kind TEXT NOT NULL,
    shareLabel TEXT NOT NULL,
    size INTEGER NOT NULL,
    modTime INTEGER NOT NULL,
    subtitles TEXT,
    coverId TEXT,
    lyricsId TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS ${DB_TABLES.PLAYBACK_PROGRESS} (
    mediaId TEXT PRIMARY KEY,
    time REAL NOT NULL,
    updatedAt INTEGER NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS ${DB_TABLES.FAVORITES} (
    mediaId TEXT PRIMARY KEY,
    createdAt INTEGER NOT NULL
  )
`);

export function queryMediaItems(): MediaItemRow[] {
  return db.query<MediaItemRow, []>(`SELECT * FROM ${DB_TABLES.MEDIA_ITEMS}`).all();
}

export function queryMediaItemById(id: string): MediaItemRow | null {
  return db.query<MediaItemRow, [string]>(`SELECT * FROM ${DB_TABLES.MEDIA_ITEMS} WHERE id = ?`).get(id);
}

export function queryPlaybackProgress(mediaId: string): PlaybackProgressRow | null {
  return db.query<PlaybackProgressRow, [string]>(`SELECT * FROM ${DB_TABLES.PLAYBACK_PROGRESS} WHERE mediaId = ?`).get(mediaId);
}

export function queryHistory(): unknown[] {
  return db.query(`
    SELECT m.*, p.time, p.updatedAt 
    FROM ${DB_TABLES.MEDIA_ITEMS} m
    JOIN ${DB_TABLES.PLAYBACK_PROGRESS} p ON m.id = p.mediaId
    ORDER BY p.updatedAt DESC
    LIMIT 20
  `).all();
}

export function queryFavorites(): unknown[] {
  return db.query(`
    SELECT m.* FROM ${DB_TABLES.MEDIA_ITEMS} m
    JOIN ${DB_TABLES.FAVORITES} f ON m.id = f.mediaId
    ORDER BY f.createdAt DESC
  `).all();
}

export default db;
