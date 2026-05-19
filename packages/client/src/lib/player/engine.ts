import type { ProbeResult } from '@mspr/shared';
import { api } from '../api.js';

export class PlayerEngine {
  public async getPlaybackInfo(mediaId: string): Promise<{ src: string; probe: ProbeResult }> {
    const res = await fetch(`${api.baseUrl}/media/probe?id=${mediaId}`);
    const probe: ProbeResult = await res.json();

    let src = `${api.baseUrl}/media/stream?id=${mediaId}`;
    if (probe.strategy === 'transcode') {
      src += '&transcode=1';
    }

    return { src, probe };
  }

  public getStreamUrl(mediaId: string, transcode: boolean = false, offset: number = 0): string {
    let url = `${api.baseUrl}/media/stream?id=${mediaId}`;
    if (transcode) url += '&transcode=1';
    if (offset > 0) url += `&offset=${offset}`;
    return url;
  }
}

export const playerEngine = new PlayerEngine();
