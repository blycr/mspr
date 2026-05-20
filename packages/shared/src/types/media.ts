export type MediaKind = 'video' | 'audio' | 'image' | 'other';

export type StreamStrategy = 'direct' | 'transcode' | 'remux';

export type PlayMode = 'loop' | 'shuffle' | 'repeat-one';

export type Theme = 'light' | 'dark';

export type TabKey = 'video' | 'audio' | 'image' | 'history';

export type HWAccelName = 'nvenc' | 'qsv' | 'videotoolbox' | 'vaapi' | 'amf' | 'cpu';

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

export interface SecurityConfig {
  pin?: string;
  allowedIps?: string[];
  blockedIps?: string[];
}

export interface ScannerConfig {
  excludeExts: string[];
  excludeNames: string[];
  minSize?: number;
  maxSize?: number;
}

export interface AppConfig {
  shares: Share[];
  port: number;
  security: SecurityConfig;
  scanner: ScannerConfig;
}

export interface ProbeResult {
  mediaId: string;
  strategy: StreamStrategy;
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
  preferred: HWAccelName;
  encoderMap: Record<HWAccelName, string>;
}

export interface MediaItemRow {
  id: string;
  relPath: string;
  name: string;
  ext: string;
  kind: MediaKind;
  shareLabel: string;
  size: number;
  modTime: number;
  subtitles: string | null;
  coverId: string | null;
  lyricsId: string | null;
}

export interface PlaybackProgressRow {
  mediaId: string;
  time: number;
  updatedAt: number;
}

export interface FavoriteRow {
  mediaId: string;
  createdAt: number;
}
