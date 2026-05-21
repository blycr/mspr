import { API_DEFAULT_PORT } from '@mspr/shared';

export const API_BASE = `http://${window.location.hostname}:${API_DEFAULT_PORT}`;

export const ENDPOINTS = {
  MEDIA: `${API_BASE}/media`,
  MEDIA_REFRESH: `${API_BASE}/media/refresh`,
  MEDIA_PROBE: `${API_BASE}/media/probe`,
  MEDIA_THUMBNAIL: `${API_BASE}/media/thumbnail`,
  MEDIA_STREAM: `${API_BASE}/media/stream`,
  MEDIA_SUBTITLE: `${API_BASE}/media/subtitle`,
  MEDIA_LYRIC: `${API_BASE}/media/lyric`,
  PROGRESS: `${API_BASE}/personal/progress`,
  HISTORY: `${API_BASE}/personal/history`,
  FAVORITES: `${API_BASE}/personal/favorites`,
  AUTH_VERIFY: `${API_BASE}/auth/verify`,
};
