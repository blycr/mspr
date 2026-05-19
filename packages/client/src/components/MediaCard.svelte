<script lang="ts">
  import type { MediaItem } from '@mspr/shared';
  import Icon from './Icon.svelte';
  import { api } from '../lib/api.js';
  import { formatSize } from '../lib/format.js';

  interface Props {
    item: MediaItem;
    onClick?: (item: MediaItem) => void;
    onKey?: (event: KeyboardEvent, item: MediaItem) => void;
  }

  let { item, onClick, onKey }: Props = $props();
</script>

<div
  class="media-card"
  onclick={() => onClick?.(item)}
  onkeydown={(e) => onKey?.(e, item)}
  role="button"
  tabindex="0"
  aria-label="{item.name}, {item.kind}"
>
  <div class="card-preview" class:is-audio={item.kind === 'audio'}>
    {#if item.kind === 'video'}
      <img src={api.thumbnailUrl(item.id)} alt="" loading="lazy" decoding="async" />
      <div class="play-overlay">
        <div class="play-btn-circle">
          <Icon name="play" size={24} />
        </div>
      </div>
    {:else if item.kind === 'audio'}
      <img src={api.thumbnailUrl(item.id)} alt="" class="audio-cover" loading="lazy" decoding="async" />
      <div class="audio-wave">
        <span></span><span></span><span></span><span></span>
      </div>
    {:else if item.kind === 'image'}
      <img src={api.thumbnailUrl(item.id)} alt={item.name} loading="lazy" decoding="async" />
    {:else}
      <div class="card-placeholder">
        <span class="placeholder-letter">{item.name.charAt(0).toUpperCase()}</span>
      </div>
    {/if}
  </div>
  <div class="card-info">
    <div class="name" title={item.name}>{item.name}</div>
    <div class="meta">
      <span class="ext">{item.ext}</span>
      <span>{formatSize(item.size)}</span>
    </div>
  </div>
</div>

<style>
  .media-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 14px;
    overflow: hidden;
    transition: transform 0.2s ease, border-color 0.2s ease;
    cursor: pointer;
    position: relative;
    content-visibility: auto;
    contain-intrinsic-size: auto 280px;
  }

  .media-card:hover {
    transform: translateY(-4px);
    border-color: var(--accent-color);
  }

  .media-card:focus-visible {
    outline: 2px solid var(--accent-color);
    outline-offset: 2px;
  }

  .card-preview {
    position: relative;
    aspect-ratio: 16 / 10;
    background: #111;
    overflow: hidden;
  }

  .card-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .media-card:hover .card-preview img {
    transform: scale(1.05);
  }

  .play-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .media-card:hover .play-overlay { opacity: 1; }

  .play-btn-circle {
    width: 48px;
    height: 48px;
    background: var(--accent-color);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    transform: scale(0.9);
    transition: transform 0.2s ease;
  }

  .media-card:hover .play-btn-circle { transform: scale(1); }

  .audio-wave {
    position: absolute;
    bottom: 14px;
    left: 14px;
    display: flex;
    gap: 3px;
  }

  .audio-wave span {
    width: 3px;
    height: 12px;
    background: var(--accent-color);
    border-radius: 3px;
    animation: wave 1.2s infinite ease-in-out;
  }

  .audio-wave span:nth-child(2) { animation-delay: 0.1s; height: 20px; }
  .audio-wave span:nth-child(3) { animation-delay: 0.2s; height: 15px; }
  .audio-wave span:nth-child(4) { animation-delay: 0.3s; height: 18px; }

  @keyframes wave {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(0.5); }
  }

  .card-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1a1a2e, #16213e);
  }

  .placeholder-letter {
    font-size: 3rem;
    font-weight: 700;
    color: var(--accent-color);
    opacity: 0.6;
  }

  .card-info { padding: 14px 16px; }

  .name {
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta {
    font-size: 0.8rem;
    color: var(--text-dim);
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
  }

  .ext {
    text-transform: uppercase;
    color: var(--accent-color);
    font-size: 0.75rem;
    font-weight: 700;
  }

  @media (max-width: 768px) {
    .media-card {
      border-radius: 10px;
      contain-intrinsic-size: auto 220px;
    }

    .card-info {
      padding: 10px 12px;
    }

    .name {
      font-size: 0.8rem;
    }

    .meta {
      font-size: 0.7rem;
    }

    .play-btn-circle {
      width: 36px;
      height: 36px;
    }
  }
</style>
