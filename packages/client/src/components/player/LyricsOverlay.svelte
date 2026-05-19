<script lang="ts">
  import { onMount } from 'svelte';
  import { parseLRC, type LyricLine } from '../../lib/player/lyrics';
  import { api } from '../../lib/api.js';

  interface Props {
    lyricId: string;
    currentTime: number;
  }

  let { lyricId, currentTime }: Props = $props();
  let lyrics = $state<LyricLine[]>([]);
  let activeIndex = $derived.by(() => {
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].time) return i;
    }
    return -1;
  });

  let container = $state<HTMLElement | null>(null);

  onMount(async () => {
    try {
      const res = await fetch(`${api.baseUrl}/media/lyric?id=${lyricId}`);
      const text = await res.text();
      lyrics = parseLRC(text);
    } catch (e) {
      console.error('Failed to load lyrics:', e);
    }
  });

  $effect(() => {
    if (activeIndex >= 0 && container) {
      const activeEl = container.children[activeIndex] as HTMLElement;
      if (activeEl) {
        container.scrollTo({
          top: activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2,
          behavior: 'smooth'
        });
      }
    }
  });
</script>

<div class="lyrics-container" bind:this={container}>
  {#if lyrics.length > 0}
    {#each lyrics as line, i}
      <div class="lyric-line" class:active={i === activeIndex}>
        {line.text}
      </div>
    {/each}
  {:else}
    <div class="status">No lyrics available</div>
  {/if}
</div>

<style>
  .lyrics-container {
    height: 100%;
    overflow-y: auto;
    padding: 60px 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    scrollbar-width: none;
  }

  .lyrics-container::-webkit-scrollbar {
    display: none;
  }

  .lyric-line {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-dim);
    transition: var(--transition-smooth);
    text-align: center;
    line-height: 1.4;
    filter: blur(1px);
    opacity: 0.5;
  }

  .lyric-line.active {
    color: var(--text-primary);
    filter: blur(0);
    opacity: 1;
    text-shadow: 0 0 16px rgba(255, 255, 255, 0.25);
    transform: scale(1.1);
  }

  @media (max-width: 768px) {
    .lyric-line.active {
      transform: none;
    }
  }

  .status {
    text-align: center;
    color: var(--text-dim);
    margin-top: 50px;
  }
</style>
