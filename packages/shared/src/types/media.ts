export type MediaKind = 'video' | 'audio' | 'image' | 'other';

export interface Subtitle {
  id: string;
  label: string;
  lang?: string;
  src: string;
  default: boolean;
}

export interface MediaItem {
  id: string;
  relPath: string;
  name: string;
  ext: string;
  kind: MediaKind;
  shareLabel: string;
  size: number;
  modTime: number;
  subtitles?: Subtitle[];
  coverId?: string;
  lyricsId?: string;
}

export interface Share {
  label: string;
  path: string;
}

export interface AppConfig {
  shares: Share[];
  port: number;
  security: {
    pin?: string;
    allowedIps?: string[];
    blockedIps?: string[];
  };
  scanner: {
    excludeExts: string[];
    excludeNames: string[];
    minSize?: number;
    maxSize?: number;
  };
}

export interface ProbeResult {
  mediaId: string;
  strategy: 'direct' | 'transcode' | 'remux';
  container: string;
  videoCodec: string | null;
  audioCodec: string | null;
  needVideoTranscode: boolean;
  needAudioTranscode: boolean;
  duration: number;
  width: number | null;
  height: number | null;
}

export interface HWAccelResult {
  available: string[];
  preferred: string | 'cpu';
  encoderMap: Record<string, string>;
}
