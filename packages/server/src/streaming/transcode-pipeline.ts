import { hwAccelDetector } from './hw-accel-detector.js';
import { ProbeResult } from '@mspr/shared';

export class TranscodePipeline {
  public async transcode(filePath: string, probe: ProbeResult, offset: number = 0): Promise<Response> {
    const hw = hwAccelDetector.getResult();
    
    const args = [
      'ffmpeg',
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


    // Video Codec Decision
    if (probe.needVideoTranscode || probe.strategy === 'remux') {
      if (hw.preferred !== 'cpu') {
        const encoder = hw.encoderMap[hw.preferred];
        args.push('-c:v', encoder);
        if (hw.preferred === 'nvenc') args.push('-preset', 'p4', '-crf', '23');
        else if (hw.preferred === 'qsv') args.push('-preset', 'medium');
      } else {
        args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23');
      }
    } else {
      args.push('-c:v', 'copy');
    }

    // Audio Codec Decision
    if (probe.needAudioTranscode) {
      args.push('-c:a', 'aac', '-b:a', '192k', '-ac', '2');
    } else {
      args.push('-c:a', 'copy');
    }

    // fMP4 flags for rapid start and streaming
    args.push(
      '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
      '-f', 'mp4',
      'pipe:1'
    );

    console.log('🎬 Starting transcode:', args.join(' '));

    const process = Bun.spawn(args, {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Handle process termination when client disconnects
    const stream = new ReadableStream({
      async start(controller) {
        const reader = process.stdout.getReader();
        const errReader = process.stderr.getReader();

        // Log errors from FFmpeg
        (async () => {
          const { value } = await errReader.read();
          if (value) {
            const msg = new TextDecoder().decode(value);
            if (msg.includes('Error')) console.error('❌ FFmpeg Error:', msg);
          }
        })();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        } catch (e) {

          controller.error(e);
          process.kill();
        }
      },
      cancel() {
        process.kill();
        console.log('🛑 Transcode stopped (client disconnected)');
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': probe.videoCodec ? 'video/mp4' : 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
        'X-MSP-Transcode': 'active'
      }
    });
  }
}

export const transcodePipeline = new TranscodePipeline();
