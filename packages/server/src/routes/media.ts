import { Elysia, t } from 'elysia';
import db from '../db/sqlite.js';
import { scannerEngine } from '../scanner/engine.js';
import { probeEngine } from '../streaming/probe-engine.js';
import { directStreamer } from '../streaming/direct-streamer.js';
import { transcodePipeline } from '../streaming/transcode-pipeline.js';
import { thumbnailGenerator } from '../streaming/thumbnail-generator.js';
import { configManager } from '../config/manager.js';
import path from 'path';

export const mediaRoutes = new Elysia({ prefix: '/media' })
  .get('/', () => {
    const items = db.query('SELECT * FROM media_items').all() as any[];
    return items.map(item => ({
      ...item,
      subtitles: item.subtitles ? JSON.parse(item.subtitles) : []
    }));
  })
  .post('/refresh', async () => {
    await scannerEngine.scanAll();
    return { success: true };
  })
  .get('/probe', async ({ query }) => {
    return await probeEngine.probe(query.id);
  }, {
    query: t.Object({ id: t.String() })
  })
  .get('/thumbnail', async ({ query }) => {
    return await thumbnailGenerator.getThumbnail(query.id);
  }, {
    query: t.Object({ id: t.String() })
  })
  .get('/stream', async ({ query, headers, set }) => {
    const item = db.query('SELECT * FROM media_items WHERE id = ?').get(query.id) as any;
    if (!item) return (set.status = 404, 'Media not found');

    const config = configManager.get();
    const share = config.shares.find(s => s.label === item.shareLabel);
    if (!share) return (set.status = 404, 'Share not found');

    const fullPath = path.join(share.path, item.relPath);
    const probe = await probeEngine.probe(query.id);

    if (!probe) return (set.status = 500, 'Probe failed');

    // Force transcode if requested or if strategy is not direct
    if (query.transcode === '1' || probe.strategy !== 'direct') {
      return await transcodePipeline.transcode(fullPath, probe, query.offset ? parseFloat(query.offset) : 0);
    }

    return directStreamer.stream(fullPath, headers.range);
  }, {
    query: t.Object({
      id: t.String(),
      transcode: t.Optional(t.String()),
      offset: t.Optional(t.String())
    })
  })
  .get('/subtitle', async ({ query, set }) => {
    const item = db.query('SELECT * FROM media_items WHERE id = ?').get(query.id) as any;
    if (!item) return (set.status = 404, 'Subtitle not found');

    const config = configManager.get();
    const share = config.shares.find(s => s.label === item.shareLabel);
    if (!share) return (set.status = 404, 'Share not found');

    const fullPath = path.join(share.path, item.relPath);
    const content = await Bun.file(fullPath).text();
    
    const { SubtitleConverter } = await import('../utils/subtitle-converter.js');
    set.headers['Content-Type'] = 'text/vtt';
    return SubtitleConverter.toVTT(content);
  }, {
    query: t.Object({ id: t.String() })
  })
  .get('/lyric', async ({ query, set }) => {
    const item = db.query('SELECT * FROM media_items WHERE id = ?').get(query.id) as any;
    if (!item) return (set.status = 404, 'Lyric not found');

    const config = configManager.get();
    const share = config.shares.find(s => s.label === item.shareLabel);
    if (!share) return (set.status = 404, 'Share not found');

    const fullPath = path.join(share.path, item.relPath);
    return await Bun.file(fullPath).text();
  }, {
    query: t.Object({ id: t.String() })
  });

