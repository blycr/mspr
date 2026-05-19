import type { MediaItem } from '@mspr/shared';

export type PlayMode = 'loop' | 'shuffle' | 'repeat-one';

export class PlaylistManager {
  items: MediaItem[] = [];
  currentIndex = 0;
  mode: PlayMode = 'loop';
  playedInRound = new Set<string>();

  setPlaylist(items: MediaItem[], startIndex: number) {
    this.items = [...items];
    this.currentIndex = Math.max(0, Math.min(startIndex, items.length - 1));
    this.playedInRound.clear();
    if (this.items.length > 0) {
      this.playedInRound.add(this.items[this.currentIndex].id);
    }
  }

  toggleMode() {
    const modes: PlayMode[] = ['loop', 'shuffle', 'repeat-one'];
    this.mode = modes[(modes.indexOf(this.mode) + 1) % modes.length];
  }

  next(): MediaItem | null {
    if (this.items.length === 0) return null;

    if (this.mode === 'repeat-one') {
      return this.items[this.currentIndex];
    }

    if (this.mode === 'loop') {
      this.currentIndex = (this.currentIndex + 1) % this.items.length;
      this.playedInRound.add(this.items[this.currentIndex].id);
      return this.items[this.currentIndex];
    }

    // shuffle
    if (this.playedInRound.size >= this.items.length) {
      this.playedInRound.clear();
    }

    const pick = this.weightedRandomNext();
    if (!pick) return null;

    this.currentIndex = pick.index;
    this.playedInRound.add(pick.item.id);
    return pick.item;
  }

  prev(): MediaItem | null {
    if (this.items.length === 0) return null;

    if (this.mode === 'repeat-one') {
      return this.items[this.currentIndex];
    }

    this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
    this.playedInRound.add(this.items[this.currentIndex].id);
    return this.items[this.currentIndex];
  }

  private weightedRandomNext(): { item: MediaItem; index: number } | null {
    if (this.items.length === 0) return null;
    if (this.items.length === 1) return { item: this.items[0], index: 0 };

    const weights = this.items.map((item, i) => {
      if (i === this.currentIndex) return 0;
      if (this.playedInRound.has(item.id)) return 0.05;
      return 1.0;
    });

    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) {
      // fallback: anything except current
      const fallback = (this.currentIndex + 1) % this.items.length;
      return { item: this.items[fallback], index: fallback };
    }

    let rnd = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      rnd -= weights[i];
      if (rnd <= 0) return { item: this.items[i], index: i };
    }
    return { item: this.items[this.items.length - 1], index: this.items.length - 1 };
  }
}

export const playlistManager = new PlaylistManager();
