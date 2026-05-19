<script lang="ts">
  import { onMount } from 'svelte';
  import { playerEngine } from '../../lib/player/engine';
  import LyricsOverlay from './LyricsOverlay.svelte';
  import type { MediaItem } from '@mspr/shared';

  interface Props {
    item: MediaItem;
    onClose: () => void;
  }

  let { item, onClose }: Props = $props();
  let videoElement = $state<HTMLVideoElement | null>(null);
  let src = $state('');
  let isTranscoding = $state(false);
  let error = $state('');
  let currentTime = $state(0);
  let showResumePrompt = $state(false);
  let savedTime = 0;

  onMount(async () => {
    try {
      const info = await playerEngine.getPlaybackInfo(item.id);
      src = info.src;
      isTranscoding = info.probe.strategy === 'transcode';

      // Check for saved progress
      const progRes = await fetch(`http://localhost:3000/personal/progress?id=${item.id}`);
      const prog = await progRes.json();
      if (prog.time > 10) { // Only prompt if > 10 seconds
        savedTime = prog.time;
        showResumePrompt = true;
      }
    } catch (e) {
      error = 'Failed to load video metadata.';
    }
  });

  function handleVideoError() {
    if (!isTranscoding) {
      src = playerEngine.getStreamUrl(item.id, true);
      isTranscoding = true;
    } else {
      error = 'Video playback failed even with transcoding.';
    }
  }

  function saveProgress() {
    if (videoElement && videoElement.currentTime > 0) {
      fetch('http://localhost:3000/personal/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, time: videoElement.currentTime })
      });
    }
  }

  function resume() {
    if (videoElement) {
      videoElement.currentTime = savedTime;
    }
    showResumePrompt = false;
  }

  // Auto-save progress every 10 seconds
  let interval: any;
  $effect(() => {
    if (videoElement) {
      interval = setInterval(saveProgress, 10000);
      return () => clearInterval(interval);
    }
  });
</script>

<div class="player-overlay" transition:fade>
  <div class="player-container" class:audio-mode={item.kind === 'audio'}>
    {#if item.kind === 'audio'}
      <div class="player-bg" style="background-image: url('http://localhost:3000/media/thumbnail?id={item.id}')"></div>
    {/if}

    <div class="player-content">
      <header class="player-header">
        <div class="item-info">
          <span class="badge kind">{item.kind}</span>
          <h2 class="title">{item.name}</h2>
          {#if isTranscoding}
            <span class="badge transcoding">Transcoding Stream</span>
          {/if}
        </div>
        <button class="close-btn" onclick={() => { saveProgress(); onClose(); }} aria-label="Close Player">
          <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </header>

      <div class="player-main">
        <div class="visual-section">
          {#if error}
            <div class="error-msg">
              <span class="error-icon">⚠️</span>
              <p>{error}</p>
            </div>
          {:else if src}
            <div class="media-wrapper">
              <!-- svelte-ignore a11y_media_has_caption -->
              <video
                bind:this={videoElement}
                {src}
                controls
                autoplay
                ontimeupdate={() => currentTime = videoElement?.currentTime || 0}
                onerror={handleVideoError}
              >
                {#each item.subtitles || [] as sub}
                  <track kind="subtitles" src={sub.src} label={sub.label} default={sub.default} />
                {/each}
              </video>

              {#if showResumePrompt}
                <div class="resume-toast">
                  <p>Resume from <strong>{Math.floor(savedTime / 60)}:{(Math.floor(savedTime % 60)).toString().padStart(2, '0')}</strong>?</p>
                  <div class="toast-actions">
                    <button class="btn-primary" onclick={resume}>Resume</button>
                    <button class="btn-ghost" onclick={() => showResumePrompt = false}>Dismiss</button>
                  </div>
                </div>
              {/if}
            </div>
          {:else}
            <div class="loading-state">
              <div class="shimmer"></div>
              <p>Preparing High-Quality Stream...</p>
            </div>
          {/if}
        </div>

        {#if item.kind === 'audio' && item.lyricsId}
          <div class="lyrics-section">
            <LyricsOverlay lyricId={item.lyricsId} {currentTime} />
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .player-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.95);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .player-container {
    width: 100%;
    max-width: 1200px;
    height: 90vh;
    background: #0a0a0c;
    border-radius: 24px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 40px 100px rgba(0, 0, 0, 0.8);
  }

  .player-bg {
    position: absolute;
    inset: -50px;
    background-size: cover;
    background-position: center;
    filter: blur(60px) brightness(0.3);
    opacity: 0.6;
    z-index: 0;
  }

  .player-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .player-header {
    padding: 24px 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
  }

  .item-info {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: white;
    letter-spacing: -0.02em;
  }

  .badge {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .badge.kind {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
  }

  .badge.transcoding {
    background: #f59e0b;
    color: black;
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }

  .player-main {
    flex: 1;
    display: flex;
    min-height: 0;
  }

  .audio-mode .player-main {
    flex-direction: row;
  }

  .visual-section {
    flex: 1.5;
    background: black;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .audio-mode .visual-section {
    flex: 1;
    background: transparent;
    padding: 40px;
  }

  .media-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .audio-mode .media-wrapper {
    aspect-ratio: 1;
    max-width: 500px;
    border-radius: 20px;
    box-shadow: 0 30px 60px rgba(0,0,0,0.5);
    overflow: hidden;
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .lyrics-section {
    flex: 1;
    background: rgba(0, 0, 0, 0.3);
    border-left: 1px solid rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
  }

  .resume-toast {
    position: absolute;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(20, 20, 22, 0.95);
    padding: 16px 24px;
    border-radius: 16px;
    border: 1px solid var(--accent-color);
    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    z-index: 100;
    text-align: center;
  }

  .toast-actions {
    display: flex;
    gap: 12px;
    margin-top: 12px;
    justify-content: center;
  }

  .btn-primary {
    background: var(--accent-color);
    color: white;
    border: none;
    padding: 8px 20px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-ghost {
    background: transparent;
    color: rgba(255,255,255,0.6);
    border: 1px solid rgba(255,255,255,0.1);
    padding: 8px 20px;
    border-radius: 8px;
    cursor: pointer;
  }

  .loading-state {
    text-align: center;
    color: rgba(255,255,255,0.4);
  }

  .shimmer {
    width: 60px;
    height: 60px;
    border: 4px solid rgba(255,255,255,0.1);
    border-top-color: var(--accent-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>
