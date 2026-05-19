import { HWAccelResult } from '@mspr/shared';

export class HWAccelDetector {
  private result: HWAccelResult = {
    available: [],
    preferred: 'cpu',
    encoderMap: {}
  };

  public async detect(): Promise<HWAccelResult> {
    try {
      const { stdout } = Bun.spawn(['ffmpeg', '-hwaccels']);
      const output = await new Response(stdout).text();
      const hwaccels = output.split('\n')
        .slice(1)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('Hardware'));

      this.result.available = hwaccels;

      // Test specific encoders
      const encodersToTest = [
        { name: 'nvenc', encoder: 'h264_nvenc' },
        { name: 'qsv', encoder: 'h264_qsv' },
        { name: 'videotoolbox', encoder: 'h264_videotoolbox' },
        { name: 'vaapi', encoder: 'h264_vaapi' },
        { name: 'amf', encoder: 'h264_amf' }
      ];

      for (const test of encodersToTest) {
        if (await this.testEncoder(test.encoder)) {
          this.result.preferred = test.name;
          this.result.encoderMap[test.name] = test.encoder;
          console.log(`✨ Hardware acceleration detected: ${test.name} (${test.encoder})`);
          break; // Stop at first working encoder
        }
      }

      if (this.result.preferred === 'cpu') {
        console.log('ℹ️ No hardware acceleration detected, falling back to CPU (libx264)');
      }

      return this.result;
    } catch (e) {
      console.error('Failed to detect HW acceleration:', e);
      return this.result;
    }
  }

  private async testEncoder(encoder: string): Promise<boolean> {
    try {
      const process = Bun.spawn([
        'ffmpeg',
        '-f', 'lavfi',
        '-i', 'nullsrc=s=64x64:d=1',
        '-c:v', encoder,
        '-f', 'null',
        '-'
      ], { stderr: 'ignore' });
      const status = await process.exited;
      return status === 0;
    } catch {
      return false;
    }
  }

  public getResult(): HWAccelResult {
    return this.result;
  }
}

export const hwAccelDetector = new HWAccelDetector();
