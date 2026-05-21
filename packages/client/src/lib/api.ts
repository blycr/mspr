import type { MediaItem } from '@mspr/shared';
import { API_BASE, ENDPOINTS } from '../constants/api.js';

let pinHeader = '';

export function setPin(pin: string) {
  pinHeader = pin;
}

export function getPin(): string {
  return pinHeader;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (pinHeader) {
    headers['X-MSP-PIN'] = pinHeader;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

export const api = {
  baseUrl: API_BASE,

  async verifyPin(pin: string): Promise<{ valid: boolean }> {
    const res = await fetch(ENDPOINTS.AUTH_VERIFY, {
      method: 'POST',
      headers: { 'X-MSP-PIN': pin },
    });
    if (!res.ok) return { valid: false };
    return res.json();
  },

  async fetchMedia(): Promise<MediaItem[]> {
    const res = await fetch(ENDPOINTS.MEDIA, { headers: getHeaders() });
    return handleResponse<MediaItem[]>(res);
  },

  async refreshMedia(): Promise<void> {
    const res = await fetch(ENDPOINTS.MEDIA_REFRESH, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to refresh media');
  },

  async fetchHistory(): Promise<MediaItem[]> {
    const res = await fetch(ENDPOINTS.HISTORY, { headers: getHeaders() });
    return handleResponse<MediaItem[]>(res);
  },

  async clearHistory(): Promise<void> {
    const res = await fetch(ENDPOINTS.HISTORY, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to clear history');
  },

  async fetchProgress(mediaId: string): Promise<{ time: number }> {
    const res = await fetch(`${ENDPOINTS.PROGRESS}?id=${mediaId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) return { time: 0 };
    return res.json();
  },

  async saveProgress(mediaId: string, time: number): Promise<void> {
    const headers = getHeaders();
    headers['Content-Type'] = 'application/json';
    await fetch(ENDPOINTS.PROGRESS, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: mediaId, time }),
    });
  },

  thumbnailUrl(mediaId: string): string {
    const url = new URL(ENDPOINTS.MEDIA_THUMBNAIL);
    url.searchParams.set('id', mediaId);
    if (pinHeader) url.searchParams.set('pin', pinHeader);
    return url.toString();
  },

  imageUrl(mediaId: string): string {
    const url = new URL(ENDPOINTS.MEDIA_STREAM);
    url.searchParams.set('id', mediaId);
    if (pinHeader) url.searchParams.set('pin', pinHeader);
    return url.toString();
  },

  subtitleUrl(mediaId: string): string {
    const url = new URL(ENDPOINTS.MEDIA_SUBTITLE);
    url.searchParams.set('id', mediaId);
    if (pinHeader) url.searchParams.set('pin', pinHeader);
    return url.toString();
  },
};
