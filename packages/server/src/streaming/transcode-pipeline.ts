import { hwAccelDetector } from './hw-accel-detector.js';
import { ProbeResult } from '@mspr/shared';

export class TranscodePipeline {
  public async transcode(filePath: string, probe: ProbeResult, offset: number = 0): Promise<Response> {
    const hw = hwAccelDetector.getResult();

    // --- Audio-only path: output MP3 for maximum browser compatibility ---
    if (!probe.videoCodec) {
      const args = [
        'ffmpeg',
        '-hide_banner',
        '-y',
        '-loglevel', 'warning',
      ];

      if (offset > 0) {
        args.push('-ss', offset.toString());
      }

      args.push('-i', filePath);

      if (probe.audioCodec) {
        args.push('-map', '0:a:0');
      }

      args.push('-c:a', 'libmp3lame', '-b:a', '192k', '-ac', '2');
      args.push('-f', 'mp3', 'pipe:1');

      console.log('[Transcode] Audio-only -> MP3:', args.join(' '));

      const process = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' });

      // Collect stdout into a buffer (avoid ReadableStream issues)
      const stdout = await new Response(process.stdout).arrayBuffer();
      const stderr = await new Response(process.stderr).text();
      if (stderr.includes('Error')) {
        console.error('[Transcode] FFmpeg Error:', stderr);
      }

      return new Response(stdout, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'X-MSP-Transcode': 'active'
        }
      });
    }

    // --- Video path: output fragmented MP4 ---
    const args = [
      'ffmpeg',
      '-hide_banner',
      '-y',
      '-loglevel', 'warning',
      '-ss', offset.toString(),
      '-i', filePath,
    ];

    if (probe.videoCodec) {
      args.push('-map', '0:v:0');
    }
    if (probe.audioCodec) {
      args.push('-map', '0:a:0');
    }

    if (probe.needVideoTranscode) {
      if (hw.preferred !== 'cpu') {
        const encoder = hw.encoderMap[hw.preferred];
        args.push('-c:v', encoder);
        if (hw.preferred === 'nvenc') args.push('-preset', 'p4', '-cq', '23');
        else if (hw.preferred === 'qsv') args.push('-preset', 'medium');
      } else {
        args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23');
      }
    } else {
      args.push('-c:v', 'copy');
    }

    if (probe.needAudioTranscode) {
      args.push('-c:a', 'aac', '-b:a', '192k', '-ac', '2');
    } else if (probe.audioCodec) {
      args.push('-c:a', 'copy');
    }

    args.push(
      '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
      '-f', 'mp4',
      'pipe:1'
    );

    console.log('[Transcode] Video -> fMP4:', args.join(' '));

    const process = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' });

    const stdout = await new Response(process.stdout).arrayBuffer();
    const stderr = await new Response(process.stderr).text();
    if (stderr.includes('Error')) {
      console.error('[Transcode] FFmpeg Error:', stderr);
    }

    return new Response(stdout, {
      headers: {
        'Content-Type': 'video/mp4',
        'X-MSP-Transcode': 'active'
      }
    });
  }
}

export const transcodePipeline = new TranscodePipeline();
