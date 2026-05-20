import { Elysia, t } from 'elysia';
import db from '../db/sqlite.js';

export const personalRoutes = new Elysia({ prefix: '/personal' })
  .get('/progress', ({ query }) => {
    const row = db.query('SELECT * FROM playback_progress WHERE mediaId = ?').get(query.id) as any;
    return row || { time: 0 };
  }, {
    query: t.Object({ id: t.String() })
  })
  .post('/progress', ({ body }) => {
    db.run(
      'INSERT OR REPLACE INTO playback_progress (mediaId, time, updatedAt) VALUES (?, ?, ?)',
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
      FROM media_items m
      JOIN playback_progress p ON m.id = p.mediaId
      ORDER BY p.updatedAt DESC
      LIMIT 20
    `).all();
  })
  .delete('/history', () => {
    db.run('DELETE FROM playback_progress');
    return { success: true };
  })
  .get('/favorites', () => {
    return db.query(`
      SELECT m.* FROM media_items m
      JOIN favorites f ON m.id = f.mediaId
      ORDER BY f.createdAt DESC
    `).all();
  })
  .post('/favorites', ({ body }) => {
    db.run(
      'INSERT OR REPLACE INTO favorites (mediaId, createdAt) VALUES (?, ?)',
      [body.id, Date.now()]
    );
    return { success: true };
  }, {
    body: t.Object({ id: t.String() })
  })
  .delete('/favorites', ({ body }) => {
    db.run('DELETE FROM favorites WHERE mediaId = ?', [body.id]);
    return { success: true };
  }, {
    body: t.Object({ id: t.String() })
  });
