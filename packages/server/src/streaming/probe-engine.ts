import { ProbeResult } from '@mspr/shared';
import db from '../db/sqlite.js';
import path from 'path';

export class ProbeEngine {
  public async probe(mediaId: string): Promise<ProbeResult | null> {
    const item = db.query('SELECT * FROM media_items WHERE id = ?').get(mediaId) as any;
    if (!item) return null;

    // Get actual path (need to match shareLabel back to config path)
    // For Phase 2, we assume we can resolve the path. 
    // In a real implementation, we'd look up the share path.
    // Let's assume for now we store absolute path or can resolve it.
    // Optimization: Add 'fullPath' to MediaItem in DB if needed.
    // For now, let's look up share in config.
    const { configManager } = await import('../config/manager.js');
    const config = configManager.get();
    const share = config.shares.find(s => s.label === item.shareLabel);
    if (!share) return null;

    const fullPath = path.join(share.path, item.relPath);

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

      const videoStream = data.streams.find((s: any) => s.codec_type === 'video');
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

      console.log(`🔍 Probe Result for ${item.name}:`, JSON.stringify(result, null, 2));
      return result;

    } catch (e) {
      console.error('Probe failed:', e);
      return null;
    }
  }
}

export const probeEngine = new ProbeEngine();
