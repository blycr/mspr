import type { ProbeResult } from '@mspr/shared';
import {
  hwAccelDetector,
} from './hw-accel-detector.js';
import {
  TRANSCODE_AUDIO_BITRATE,
  TRANSCODE_AUDIO_CHANNELS,
  TRANSCODE_VIDEO_CRF,
  TRANSCODE_NVENC_CQ,
  TRANSCODE_NVENC_PRESET,
  TRANSCODE_QSV_PRESET,
  TRANSCODE_CPU_PRESET,
  TRANSCODE_MOVFLAGS,
  TRANSCODE_OUTPUT_FORMAT,
  TRANSCODE_AUDIO_CODEC_MP3,
  TRANSCODE_AUDIO_CODEC_AAC,
  TRANSCODE_VIDEO_CODEC_CPU,
} from '@mspr/shared';
import { LOG_PREFIX } from '../constants/index.js';

function checkFfmpegError(stderr: string): void {
  if (stderr.includes('Error')) {
    console.error(`${LOG_PREFIX.TRANSCODE} FFmpeg Error:`, stderr);
  }
}

function buildAudioArgs(offset: number): string[] {
  const args: string[] = [];
  if (offset > 0) {
    args.push('-ss', offset.toString());
  }
  return args;
}

function buildVideoArgs(hw: ReturnType<typeof hwAccelDetector.getResult>, probe: ProbeResult): string[] {
  const args: string[] = [];

  if (probe.needVideoTranscode) {
    if (hw.preferred !== 'cpu') {
      const encoder = hw.encoderMap[hw.preferred];
      args.push('-c:v', encoder);
      if (hw.preferred === 'nvenc') {
        args.push('-preset', TRANSCODE_NVENC_PRESET, '-cq', TRANSCODE_NVENC_CQ.toString());
      } else if (hw.preferred === 'qsv') {
        args.push('-preset', TRANSCODE_QSV_PRESET);
      }
    } else {
      args.push('-c:v', TRANSCODE_VIDEO_CODEC_CPU, '-preset', TRANSCODE_CPU_PRESET, '-crf', TRANSCODE_VIDEO_CRF.toString());
    }
  } else {
    args.push('-c:v', 'copy');
  }

  return args;
}

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
        ...buildAudioArgs(offset),
        '-i', filePath,
        ...(probe.audioCodec ? ['-map', '0:a:0'] : []),
        '-c:a', TRANSCODE_AUDIO_CODEC_MP3,
        '-b:a', TRANSCODE_AUDIO_BITRATE,
        '-ac', TRANSCODE_AUDIO_CHANNELS.toString(),
        '-f', 'mp3',
        'pipe:1'
      ];

      console.log(`${LOG_PREFIX.TRANSCODE} Audio-only -> MP3:`, args.join(' '));

      const process = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' });

      const stdout = await new Response(process.stdout).arrayBuffer();
      const stderr = await new Response(process.stderr).text();
      checkFfmpegError(stderr);

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
      ...(probe.videoCodec ? ['-map', '0:v:0'] : []),
      ...(probe.audioCodec ? ['-map', '0:a:0'] : []),
      ...buildVideoArgs(hw, probe),
      ...(probe.needAudioTranscode
        ? ['-c:a', TRANSCODE_AUDIO_CODEC_AAC, '-b:a', TRANSCODE_AUDIO_BITRATE, '-ac', TRANSCODE_AUDIO_CHANNELS.toString()]
        : probe.audioCodec ? ['-c:a', 'copy'] : []),
      '-movflags', TRANSCODE_MOVFLAGS,
      '-f', TRANSCODE_OUTPUT_FORMAT,
      'pipe:1'
    ];

    console.log(`${LOG_PREFIX.TRANSCODE} Video -> fMP4:`, args.join(' '));

    const process = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' });

    const stdout = await new Response(process.stdout).arrayBuffer();
    const stderr = await new Response(process.stderr).text();
    checkFfmpegError(stderr);

    return new Response(stdout, {
      headers: {
        'Content-Type': 'video/mp4',
        'X-MSP-Transcode': 'active'
      }
    });
  }
}

export const transcodePipeline = new TranscodePipeline();
