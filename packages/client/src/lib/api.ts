const API_BASE = `http://${window.location.hostname}:3000`;

export const api = {
  baseUrl: API_BASE,

  async fetchMedia(): Promise<import('@mspr/shared').MediaItem[]> {
    const res = await fetch(`${API_BASE}/media`);
    if (!res.ok) throw new Error('Failed to fetch media');
    return res.json();
  },

  async refreshMedia(): Promise<void> {
    const res = await fetch(`${API_BASE}/media/refresh`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to refresh media');
  },

  async fetchHistory(): Promise<import('@mspr/shared').MediaItem[]> {
    const res = await fetch(`${API_BASE}/personal/history`);
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  },

  async clearHistory(): Promise<void> {
    const res = await fetch(`${API_BASE}/personal/history`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to clear history');
  },

  async fetchProgress(mediaId: string): Promise<{ time: number }> {
    const res = await fetch(`${API_BASE}/personal/progress?id=${mediaId}`);
    if (!res.ok) return { time: 0 };
    return res.json();
  },

  async saveProgress(mediaId: string, time: number): Promise<void> {
    await fetch(`${API_BASE}/personal/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: mediaId, time }),
    });
  },

  thumbnailUrl(mediaId: string): string {
    return `${API_BASE}/media/thumbnail?id=${mediaId}`;
  },

  imageUrl(mediaId: string): string {
    return `${API_BASE}/media/stream?id=${mediaId}`;
  },

  subtitleUrl(mediaId: string): string {
    return `${API_BASE}/media/subtitle?id=${mediaId}`;
  },
};
