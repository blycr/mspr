/* ============================================================
   Content-Type mappings
   ============================================================ */

export const CONTENT_TYPE_MAP: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  mp3: 'audio/mpeg',
  flac: 'audio/flac',
  wav: 'audio/wav',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

/* ============================================================
   Thumbnail generation constants
   ============================================================ */

export const THUMBNAIL_WIDTH = 320;
export const THUMBNAIL_VIDEO_FRAME_TIME = 10; // seconds
export const THUMBNAIL_CACHE_EXT = 'webp';
export const THUMBNAIL_PLACEHOLDER_WIDTH = 320;
export const THUMBNAIL_PLACEHOLDER_HEIGHT = 200;
export const THUMBNAIL_PLACEHOLDER_BG = '#1a1a2e';
export const THUMBNAIL_PLACEHOLDER_TEXT_COLOR = '#8b5cf6';

/* ============================================================
   Transcoding constants
   ============================================================ */

export const TRANSCODE_AUDIO_BITRATE = '192k';
export const TRANSCODE_AUDIO_CHANNELS = 2;
export const TRANSCODE_VIDEO_CRF = 23;
export const TRANSCODE_NVENC_CQ = 23;
export const TRANSCODE_NVENC_PRESET = 'p4';
export const TRANSCODE_QSV_PRESET = 'medium';
export const TRANSCODE_CPU_PRESET = 'veryfast';
export const TRANSCODE_MOVFLAGS = 'frag_keyframe+empty_moov+default_base_moof';
export const TRANSCODE_OUTPUT_FORMAT = 'mp4';
export const TRANSCODE_AUDIO_CODEC_MP3 = 'libmp3lame';
export const TRANSCODE_AUDIO_CODEC_AAC = 'aac';
export const TRANSCODE_VIDEO_CODEC_CPU = 'libx264';

/* ============================================================
   Scanner constants
   ============================================================ */

export const SCANNER_DEFAULT_EXCLUDE_EXTS = ['tmp', 'log', 'torrent'];
export const SCANNER_DEFAULT_EXCLUDE_NAMES = ['thumbs.db', 'desktop.ini', '$RECYCLE.BIN', '.git'];
export const SCANNER_ID_HASH_ALGO = 'md5';

/* ============================================================
   Player constants (client-side)
   ============================================================ */

export const PLAYER_PROGRESS_SAVE_INTERVAL_MS = 10000;
export const PLAYER_RESUME_THRESHOLD_SECONDS = 10;
export const PLAYER_SEEK_KEYBOARD_STEP_SECONDS = 5;
export const PLAYER_VOLUME_STEP = 0.01;
export const PLAYER_VOLUME_MIN = 0;
export const PLAYER_VOLUME_MAX = 1;

/* ============================================================
   Layout constants (client-side)
   ============================================================ */

export const LAYOUT_MOBILE_BREAKPOINT = 640;
export const LAYOUT_SMALL_BREAKPOINT = 480;
export const LAYOUT_SIDEBAR_WIDTH_PX = 220;
export const LAYOUT_GRID_MIN_COL_WIDTH_PX = 220;
export const LAYOUT_ROW_HEIGHT_DESKTOP = 280;
export const LAYOUT_ROW_HEIGHT_MOBILE = 220;
export const LAYOUT_VIRTUAL_BUFFER_ROWS = 4;

/* ============================================================
   Image viewer constants (client-side)
   ============================================================ */

export const VIEWER_MIN_SCALE = 0.1;
export const VIEWER_MAX_SCALE = 5;
export const VIEWER_ZOOM_STEP = 0.2;

/* ============================================================
   API / Server constants
   ============================================================ */

export const API_DEFAULT_PORT = 3000;
export const API_BASE_PATH = '';

/* ============================================================
   Codec / Container constants
   ============================================================ */

export const VIDEO_CODECS_DIRECT = ['h264', 'vp9'];
export const AUDIO_CODECS_DIRECT = ['aac', 'mp3'];
export const DIRECT_CONTAINERS = ['mp4', 'mov', 'webm'];
export const COVER_ART_CODECS = ['mjpeg', 'png'];

/* ============================================================
   Hardware acceleration constants
   ============================================================ */

export const HW_ENCODER_TESTS = [
  { name: 'nvenc', encoder: 'h264_nvenc' },
  { name: 'qsv', encoder: 'h264_qsv' },
  { name: 'videotoolbox', encoder: 'h264_videotoolbox' },
  { name: 'vaapi', encoder: 'h264_vaapi' },
  { name: 'amf', encoder: 'h264_amf' },
];

export const HW_ENCODER_TEST_SOURCE = 'testsrc=duration=1:size=320x240:rate=1';

/* ============================================================
   Subtitle constants
   ============================================================ */

export const SRT_TIME_REGEX = /(\d{2}:\d{2}:\d{2}),(\d{3})/g;
export const ASS_TIME_SEPARATOR = ':';

/* ============================================================
   Theme constants
   ============================================================ */

export const THEME_STORAGE_KEY = 'msp-theme';
export const THEME_DARK_META_COLOR = '#0a0a0f';
export const THEME_LIGHT_META_COLOR = '#f0f0f5';
export const THEME_LIGHT_HOURS_START = 6;
export const THEME_LIGHT_HOURS_END = 18;
