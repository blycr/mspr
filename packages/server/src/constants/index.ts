export const LOG_PREFIX = {
  SERVER: '[Server]',
  SCANNER: '[Scanner]',
  PROBE: '[Probe]',
  TRANSCODE: '[Transcode]',
  THUMBNAIL: '[Thumbnail]',
  HWACCEL: '[HWAccel]',
  CONFIG: '[Config]',
};

export const ANSI_CODES = {
  BOLD: '\x1b[1m',
  CYAN: '\x1b[36m',
  GREEN: '\x1b[32m',
  RESET: '\x1b[0m',
};

export const STATUS_MESSAGES = {
  NOT_FOUND: 'Not found',
  SHARE_NOT_FOUND: 'Share not found',
  MEDIA_NOT_FOUND: 'Media not found',
  SUBTITLE_NOT_FOUND: 'Subtitle not found',
  LYRIC_NOT_FOUND: 'Lyric not found',
  GENERATION_FAILED: 'Generation failed',
  PROBE_FAILED: 'Probe failed',
  FORBIDDEN: 'Forbidden',
};

export const DB_TABLES = {
  MEDIA_ITEMS: 'media_items',
  PLAYBACK_PROGRESS: 'playback_progress',
  FAVORITES: 'favorites',
};

export const NETWORK_FILTER = {
  VIRTUAL: /virtual|vmware|vethernet|tap|wsl|loopback|hyper-v|gameviewer|mihomo|clash|v2ray|shadowsocks|sing-box|proxifier/i,
  LINK_LOCAL: /^169\.254\./,
  BENCHMARK: /^198\.1[89]\./,
};
