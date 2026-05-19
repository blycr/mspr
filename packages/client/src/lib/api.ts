import type { MediaItem } from '@mspr/shared';

const API_BASE = typeof window !== 'undefined'
  ? `http://${window.location.hostname}:3000`
  : ((import.meta as any).env?.VITE_API_URL || 'http://localhost:3000');

export const api = {
  baseUrl: API_BASE,

  async fetchMedia(): Promise<MediaItem[]> {
    const res = await fetch(`${API_BASE}/media`);
    return res.json();
  },

  async fetchHistory(): Promise<MediaItem[]> {
    const res = await fetch(`${API_BASE}/personal/history`);
    return res.json();
  },

  async fetchProgress(id: string): Promise<{ time: number }> {
    const res = await fetch(`${API_BASE}/personal/progress?id=${id}`);
    return res.json();
  },

  async saveProgress(id: string, time: number): Promise<void> {
    await fetch(`${API_BASE}/personal/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, time })
    });
  },

  thumbnailUrl(id: string): string {
    return `${API_BASE}/media/thumbnail?id=${id}`;
  },

  subtitleUrl(id: string): string {
    return `${API_BASE}/media/subtitle?id=${id}`;
  }
};
