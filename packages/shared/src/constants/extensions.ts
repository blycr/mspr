import { MediaKind } from '../types/media.js';

export const EXTENSION_MAP: Record<string, MediaKind> = {
  // Video
  'mp4': 'video',
  'mkv': 'video',
  'avi': 'video',
  'mov': 'video',
  'wmv': 'video',
  'flv': 'video',
  'webm': 'video',
  'ts': 'video',
  'm4v': 'video',
  
  // Audio
  'mp3': 'audio',
  'wav': 'audio',
  'flac': 'audio',
  'aac': 'audio',
  'ogg': 'audio',
  'm4a': 'audio',
  'wma': 'audio',
  'ape': 'audio',
  
  // Image
  'jpg': 'image',
  'jpeg': 'image',
  'png': 'image',
  'gif': 'image',
  'webp': 'image',
  'bmp': 'image',
  'svg': 'image'
};

export const SUBTITLE_EXTS = ['srt', 'vtt', 'ass'];
export const LYRIC_EXTS = ['lrc'];
export const COVER_NAMES = ['cover', 'folder', 'poster'];
