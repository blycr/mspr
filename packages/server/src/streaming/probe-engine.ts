import type { ProbeResult, StreamStrategy, MediaItemRow } from '@mspr/shared';
import {
  VIDEO_CODECS_DIRECT,
  AUDIO_CODECS_DIRECT,
  DIRECT_CONTAINERS,
  COVER_ART_CODECS,
} from '@mspr/shared';
import { LOG_PREFIX } from '../constants/index.js';
import { default as db } from '../db/sqlite.js';
import { resolveMediaPath } from '../utils/media-path.js';

interface FFProbeStream {
  codec_type: string;
  codec_name: string;
  width?: number;
  height?: number;
}

interface FFProbeFormat {
  format_name: string;
  duration: string;
}

interface FFProbeData {
  streams: FFProbeStream[];
  format: FFProbeFormat;
}

export class ProbeEngine {
  public async probe(mediaId: string): Promise<ProbeResult | null> {
    const item = db.query('SELECT * FROM media_items WHERE id = ?').get(mediaId) as MediaItemRow | null;
    if (!item) return null;

    const fullPath = resolveMediaPath(item);
    if (!fullPath) return null;

    // Images are served directly without probing
    if (item.kind === 'image') {
      return {
        mediaId,
        strategy: 'direct' as StreamStrategy,
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

      const stdout = await new Response(process.stdout).text();
      const stderr = await new Response(process.stderr).text();
      const exitCode = await process.exited;

      if (exitCode !== 0) {
        console.error(`${LOG_PREFIX.PROBE} ffprobe exited with code ${exitCode}: ${stderr}`);
        return null;
      }

      const data: FFProbeData = JSON.parse(stdout);

      const coverCodecs = new Set(COVER_ART_CODECS);
      const videoStream = data.streams.find(
        (s) => s.codec_type === 'video' && !coverCodecs.has(s.codec_name)
      );
      const audioStream = data.streams.find((s) => s.codec_type === 'audio');

      const videoCodec = videoStream?.codec_name || null;
      const audioCodec = audioStream?.codec_name || null;
      const container = data.format.format_name;
      const duration = parseFloat(data.format.duration) || 0;

      const isAudioOnly = !videoStream && !!audioStream;
      const needVideoTranscode = !isAudioOnly && !VIDEO_CODECS_DIRECT.includes(videoCodec || '');
      const needAudioTranscode = !AUDIO_CODECS_DIRECT.includes(audioCodec || '');

      let strategy: StreamStrategy = 'direct';
      if (isAudioOnly) {
        strategy = needAudioTranscode ? 'transcode' : 'direct';
      } else if (needVideoTranscode || needAudioTranscode) {
        strategy = 'transcode';
      } else if (!DIRECT_CONTAINERS.some((fmt) => container.includes(fmt))) {
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

      console.log(`${LOG_PREFIX.PROBE} ${item.name}: strategy=${result.strategy}, vcodec=${result.videoCodec}, acodec=${result.audioCodec}, container=${result.container}`);
      return result;

    } catch (e) {
      console.error(`${LOG_PREFIX.PROBE} Probe failed:`, e);
      return null;
    }
  }
}

export const probeEngine = new ProbeEngine();
