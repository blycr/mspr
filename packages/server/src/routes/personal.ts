import { Elysia, t } from 'elysia';
import { default as db } from '../db/sqlite.js';
import { DB_TABLES } from '../constants/index.js';

export const personalRoutes = new Elysia({ prefix: '/personal' })
  .get('/progress', ({ query }) => {
    const row = db.query(`SELECT * FROM ${DB_TABLES.PLAYBACK_PROGRESS} WHERE mediaId = ?`).get(query.id);
    return row || { time: 0 };
  }, {
    query: t.Object({ id: t.String() })
  })
  .post('/progress', ({ body }) => {
    db.run(
      `INSERT OR REPLACE INTO ${DB_TABLES.PLAYBACK_PROGRESS} (mediaId, time, updatedAt) VALUES (?, ?, ?)`,
      [body.id, body.time, Date.now()]
    );
    return { success: true };
  }, {
    body: t.Object({
      id: t.String(),
      time: t.Number()
    })
  })
  .get('/history', () => {
    return db.query(`
      SELECT m.*, p.time, p.updatedAt 
      FROM ${DB_TABLES.MEDIA_ITEMS} m
      JOIN ${DB_TABLES.PLAYBACK_PROGRESS} p ON m.id = p.mediaId
      ORDER BY p.updatedAt DESC
      LIMIT 20
    `).all();
  })
  .delete('/history', () => {
    db.run(`DELETE FROM ${DB_TABLES.PLAYBACK_PROGRESS}`);
    return { success: true };
  })
  .get('/favorites', () => {
    return db.query(`
      SELECT m.* FROM ${DB_TABLES.MEDIA_ITEMS} m
      JOIN ${DB_TABLES.FAVORITES} f ON m.id = f.mediaId
      ORDER BY f.createdAt DESC
    `).all();
  })
  .post('/favorites', ({ body }) => {
    db.run(
      `INSERT OR REPLACE INTO ${DB_TABLES.FAVORITES} (mediaId, createdAt) VALUES (?, ?)`,
      [body.id, Date.now()]
    );
    return { success: true };
  }, {
    body: t.Object({ id: t.String() })
  })
  .delete('/favorites', ({ body }) => {
    db.run(`DELETE FROM ${DB_TABLES.FAVORITES} WHERE mediaId = ?`, [body.id]);
    return { success: true };
  }, {
    body: t.Object({ id: t.String() })
  });
