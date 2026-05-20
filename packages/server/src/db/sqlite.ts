import { Database } from 'bun:sqlite';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.resolve(import.meta.dir, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, 'mspr.db'));

// Initialize tables
db.run(`
  CREATE TABLE IF NOT EXISTS media_items (
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
  CREATE TABLE IF NOT EXISTS playback_progress (
    mediaId TEXT PRIMARY KEY,
    time REAL NOT NULL,
    updatedAt INTEGER NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS favorites (
    mediaId TEXT PRIMARY KEY,
    createdAt INTEGER NOT NULL
  )
`);

export default db;
