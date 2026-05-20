import type { HWAccelResult, HWAccelName } from '@mspr/shared';
import {
  HW_ENCODER_TESTS,
  HW_ENCODER_TEST_SOURCE,
} from '@mspr/shared';
import { LOG_PREFIX } from '../constants/index.js';

export class HWAccelDetector {
  private result: HWAccelResult = {
    available: [],
    preferred: 'cpu',
    encoderMap: {} as Record<HWAccelName, string>
  };

  private async findFfmpeg(): Promise<string | null> {
    for (const cmd of ['ffmpeg', 'ffmpeg.exe']) {
      try {
        const proc = Bun.spawn([cmd, '-version'], { stderr: 'ignore' });
        const status = await proc.exited;
        if (status === 0) return cmd;
      } catch {
        // continue to next candidate
      }
    }
    return null;
  }

  public async detect(): Promise<HWAccelResult> {
    const ffmpegCmd = await this.findFfmpeg();
    if (!ffmpegCmd) {
      console.warn(`${LOG_PREFIX.HWACCEL} ffmpeg not found in PATH. Transcoding will not work.`);
      return this.result;
    }

    console.log(`${LOG_PREFIX.HWACCEL} Found ffmpeg: ${ffmpegCmd}`);

    try {
      const { stdout } = Bun.spawn([ffmpegCmd, '-hide_banner', '-hwaccels']);
      const output = await new Response(stdout).text();
      const hwaccels = output.split('\n')
        .slice(1)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('Hardware'));

      this.result.available = hwaccels;
      console.log(`${LOG_PREFIX.HWACCEL} Available hwaccels: ${hwaccels.join(', ') || 'none'}`);

      for (const test of HW_ENCODER_TESTS) {
        if (await this.testEncoder(ffmpegCmd, test.encoder)) {
          this.result.preferred = test.name as HWAccelName;
          this.result.encoderMap[test.name as HWAccelName] = test.encoder;
          console.log(`${LOG_PREFIX.HWACCEL} Using hardware acceleration: ${test.name} (${test.encoder})`);
          break;
        }
      }

      if (this.result.preferred === 'cpu') {
        console.log(`${LOG_PREFIX.HWACCEL} No hardware acceleration available, falling back to CPU (libx264).`);
      }

      return this.result;
    } catch (e) {
      console.error(`${LOG_PREFIX.HWACCEL} Detection failed:`, e);
      return this.result;
    }
  }

  private async testEncoder(ffmpegCmd: string, encoder: string): Promise<boolean> {
    try {
      const process = Bun.spawn([
        ffmpegCmd,
        '-hide_banner',
        '-f', 'lavfi',
        '-i', HW_ENCODER_TEST_SOURCE,
        '-c:v', encoder,
        '-f', 'null',
        '-'
      ], { stderr: 'pipe', stdout: 'pipe' });

      const stderr = await new Response(process.stderr).text();
      const status = await process.exited;

      const hasErrors = stderr.includes('Error') || stderr.includes('failed');
      const wroteFrames = stderr.includes('frame=') && !stderr.includes('frame=    0');

      return status === 0 && !hasErrors && wroteFrames;
    } catch {
      return false;
    }
  }

  public getResult(): HWAccelResult {
    return this.result;
  }
}

export const hwAccelDetector = new HWAccelDetector();
