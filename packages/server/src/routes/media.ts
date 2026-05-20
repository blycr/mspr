import { Elysia, t } from 'elysia';
import { default as db } from '../db/sqlite.js';
import { scannerEngine } from '../scanner/engine.js';
import { probeEngine } from '../streaming/probe-engine.js';
import { directStreamer } from '../streaming/direct-streamer.js';
import { transcodePipeline } from '../streaming/transcode-pipeline.js';
import { thumbnailGenerator } from '../streaming/thumbnail-generator.js';
import { resolveMediaPath } from '../utils/media-path.js';
import { notFound } from '../utils/errors.js';
import { STATUS_MESSAGES } from '../constants/index.js';

function parseOffset(raw: string | undefined): number {
  if (!raw) return 0;
  const val = parseFloat(raw);
  return isNaN(val) || val < 0 ? 0 : val;
}

export const mediaRoutes = new Elysia({ prefix: '/media' })
  .get('/', () => {
    const rows = db.query('SELECT * FROM media_items').all();
    return rows.map((item: { subtitles: string | null }) => ({
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
    const item = db.query('SELECT * FROM media_items WHERE id = ?').get(query.id);
    if (!item) {
      set.status = 404;
      return notFound(STATUS_MESSAGES.MEDIA_NOT_FOUND);
    }

    const fullPath = resolveMediaPath(item as { shareLabel: string; relPath: string });
    if (!fullPath) {
      set.status = 404;
      return notFound(STATUS_MESSAGES.SHARE_NOT_FOUND);
    }

    const probe = await probeEngine.probe(query.id);
    if (!probe) {
      set.status = 500;
      return notFound(STATUS_MESSAGES.PROBE_FAILED);
    }

    const offset = parseOffset(query.offset);

    // Force transcode if requested or if strategy is not direct
    if (query.transcode === '1' || probe.strategy !== 'direct') {
      return await transcodePipeline.transcode(fullPath, probe, offset);
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
    const item = db.query('SELECT * FROM media_items WHERE id = ?').get(query.id);
    if (!item) {
      set.status = 404;
      return notFound(STATUS_MESSAGES.SUBTITLE_NOT_FOUND);
    }

    const fullPath = resolveMediaPath(item as { shareLabel: string; relPath: string });
    if (!fullPath) {
      set.status = 404;
      return notFound(STATUS_MESSAGES.SHARE_NOT_FOUND);
    }

    const content = await Bun.file(fullPath).text();
    const { SubtitleConverter } = await import('../utils/subtitle-converter.js');
    set.headers['Content-Type'] = 'text/vtt';
    return SubtitleConverter.toVTT(content);
  }, {
    query: t.Object({ id: t.String() })
  })
  .get('/lyric', async ({ query, set }) => {
    const item = db.query('SELECT * FROM media_items WHERE id = ?').get(query.id);
    if (!item) {
      set.status = 404;
      return notFound(STATUS_MESSAGES.LYRIC_NOT_FOUND);
    }

    const fullPath = resolveMediaPath(item as { shareLabel: string; relPath: string });
    if (!fullPath) {
      set.status = 404;
      return notFound(STATUS_MESSAGES.SHARE_NOT_FOUND);
    }

    return await Bun.file(fullPath).text();
  }, {
    query: t.Object({ id: t.String() })
  });
