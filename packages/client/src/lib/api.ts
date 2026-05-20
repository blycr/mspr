import type { MediaItem } from '@mspr/shared';
import { API_BASE, ENDPOINTS } from '../constants/api.js';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

export const api = {
  baseUrl: API_BASE,

  async fetchMedia(): Promise<MediaItem[]> {
    const res = await fetch(ENDPOINTS.MEDIA);
    return handleResponse<MediaItem[]>(res);
  },

  async refreshMedia(): Promise<void> {
    const res = await fetch(ENDPOINTS.MEDIA_REFRESH, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to refresh media');
  },

  async fetchHistory(): Promise<MediaItem[]> {
    const res = await fetch(ENDPOINTS.HISTORY);
    return handleResponse<MediaItem[]>(res);
  },

  async clearHistory(): Promise<void> {
    const res = await fetch(ENDPOINTS.HISTORY, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to clear history');
  },

  async fetchProgress(mediaId: string): Promise<{ time: number }> {
    const res = await fetch(`${ENDPOINTS.PROGRESS}?id=${mediaId}`);
    if (!res.ok) return { time: 0 };
    return res.json();
  },

  async saveProgress(mediaId: string, time: number): Promise<void> {
    await fetch(ENDPOINTS.PROGRESS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: mediaId, time }),
    });
  },

  thumbnailUrl(mediaId: string): string {
    return `${ENDPOINTS.MEDIA_THUMBNAIL}?id=${mediaId}`;
  },

  imageUrl(mediaId: string): string {
    return `${ENDPOINTS.MEDIA_STREAM}?id=${mediaId}`;
  },

  subtitleUrl(mediaId: string): string {
    return `${ENDPOINTS.MEDIA_SUBTITLE}?id=${mediaId}`;
  },
};
