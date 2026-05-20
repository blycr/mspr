import { ProbeResult } from '@mspr/shared';
import db from '../db/sqlite.js';
import { resolveMediaPath } from '../utils/media-path.js';

export class ProbeEngine {
  public async probe(mediaId: string): Promise<ProbeResult | null> {
    const item = db.query('SELECT * FROM media_items WHERE id = ?').get(mediaId) as any;
    if (!item) return null;

    const fullPath = resolveMediaPath(item);
    if (!fullPath) return null;

    // Images are served directly without probing
    if (item.kind === 'image') {
      return {
        mediaId,
        strategy: 'direct' as const,
        container: item.ext,
        videoCodec: null,
        audioCodec: null,
        needVideoTranscode: false,
        needAudioTranscode: false,
        duration: 0,
        width: null,
        height: null
      };
    }

    try {
      const process = Bun.spawn([
        'ffprobe',
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        fullPath
      ]);

      const output = await new Response(process.stdout).text();
      const data = JSON.parse(output);

      // Ignore cover-art streams (mjpeg/png embedded in audio files)
      const coverCodecs = new Set(['mjpeg', 'png']);
      const videoStream = data.streams.find((s: any) => s.codec_type === 'video' && !coverCodecs.has(s.codec_name));
      const audioStream = data.streams.find((s: any) => s.codec_type === 'audio');

      const videoCodec = videoStream?.codec_name || null;
      const audioCodec = audioStream?.codec_name || null;
      const container = data.format.format_name;
      const duration = parseFloat(data.format.duration) || 0;

      const isAudioOnly = !videoStream && !!audioStream;
      const needVideoTranscode = !isAudioOnly && videoCodec !== 'h264' && videoCodec !== 'vp9';
      const needAudioTranscode = audioCodec !== 'aac' && audioCodec !== 'mp3';

      let strategy: 'direct' | 'transcode' | 'remux' = 'direct';
      if (isAudioOnly) {
        strategy = needAudioTranscode ? 'transcode' : 'direct';
      } else if (needVideoTranscode || needAudioTranscode) {
        strategy = 'transcode';
      } else if (!['mp4', 'mov', 'webm'].some(fmt => container.includes(fmt))) {
        strategy = 'remux';
      }

      const result: ProbeResult = {
        mediaId,
        strategy,
        container,
        videoCodec,
        audioCodec,
        needVideoTranscode,
        needAudioTranscode,
        duration,
        width: videoStream?.width || null,
        height: videoStream?.height || null
      };

      console.log(`[Probe] ${item.name}: strategy=${result.strategy}, vcodec=${result.videoCodec}, acodec=${result.audioCodec}, container=${result.container}`);
      return result;

    } catch (e) {
      console.error('Probe failed:', e);
      return null;
    }
  }
}

export const probeEngine = new ProbeEngine();
