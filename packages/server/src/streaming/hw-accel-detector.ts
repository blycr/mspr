import { HWAccelResult } from '@mspr/shared';

export class HWAccelDetector {
  private result: HWAccelResult = {
    available: [],
    preferred: 'cpu',
    encoderMap: {}
  };

  /** Try to find ffmpeg binary, with Windows .exe fallback */
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
      console.warn('[HWAccel] ffmpeg not found in PATH. Transcoding will not work.');
      return this.result;
    }

    console.log(`[HWAccel] Found ffmpeg: ${ffmpegCmd}`);

    try {
      const { stdout } = Bun.spawn([ffmpegCmd, '-hide_banner', '-hwaccels']);
      const output = await new Response(stdout).text();
      const hwaccels = output.split('\n')
        .slice(1)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('Hardware'));

      this.result.available = hwaccels;
      console.log(`[HWAccel] Available hwaccels: ${hwaccels.join(', ') || 'none'}`);

      // Test specific encoders
      const encodersToTest = [
        { name: 'nvenc', encoder: 'h264_nvenc' },
        { name: 'qsv', encoder: 'h264_qsv' },
        { name: 'videotoolbox', encoder: 'h264_videotoolbox' },
        { name: 'vaapi', encoder: 'h264_vaapi' },
        { name: 'amf', encoder: 'h264_amf' }
      ];

      for (const test of encodersToTest) {
        if (await this.testEncoder(ffmpegCmd, test.encoder)) {
          this.result.preferred = test.name;
          this.result.encoderMap[test.name] = test.encoder;
          console.log(`[HWAccel] Using hardware acceleration: ${test.name} (${test.encoder})`);
          break;
        }
      }

      if (this.result.preferred === 'cpu') {
        console.log('[HWAccel] No hardware acceleration available, falling back to CPU (libx264). This is normal on systems without a supported GPU or when using a CPU-only ffmpeg build.');
      }

      return this.result;
    } catch (e) {
      console.error('[HWAccel] Detection failed:', e);
      return this.result;
    }
  }

  private async testEncoder(ffmpegCmd: string, encoder: string): Promise<boolean> {
    try {
      const process = Bun.spawn([
        ffmpegCmd,
        '-hide_banner',
        '-f', 'lavfi',
        '-i', 'testsrc=duration=1:size=320x240:rate=1',
        '-c:v', encoder,
        '-f', 'null',
        '-'
      ], { stderr: 'pipe', stdout: 'pipe' });

      const stdout = await new Response(process.stdout).text();
      const stderr = await new Response(process.stderr).text();
      const status = await process.exited;

      // FFmpeg writes all output (including progress) to stderr, stdout is empty
      const output = stderr;
      const hasErrors = output.includes('Error') || output.includes('failed');
      const wroteFrames = output.includes('frame=') && !output.includes('frame=    0');

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
