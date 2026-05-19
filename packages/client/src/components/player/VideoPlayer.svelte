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

<div class="player-overlay">
  <div class="player-content" class:audio-mode={item.kind === 'audio'}>
    <header class="player-header">
      <span class="title">{item.name}</span>
      <div class="badges">
        {#if isTranscoding}
          <span class="badge">Transcoding</span>
        {/if}
        <span class="badge kind">{item.kind}</span>
      </div>
      <button class="close-btn" onclick={() => { saveProgress(); onClose(); }}>✕</button>
    </header>

    <div class="player-body">
      <div class="video-wrapper">
        {#if error}
          <div class="error-msg">{error}</div>
        {:else if src}
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
            <div class="resume-prompt">
              <span>Resume from {Math.floor(savedTime / 60)}:{(Math.floor(savedTime % 60)).toString().padStart(2, '0')}?</span>
              <div class="prompt-btns">
                <button onclick={resume}>Yes</button>
                <button class="no" onclick={() => showResumePrompt = false}>No</button>
              </div>
            </div>
          {/if}
        {:else}
          <div class="loading">Preparing stream...</div>
        {/if}
      </div>

      {#if item.kind === 'audio' && item.lyricsId}
        <div class="lyrics-wrapper">
          <LyricsOverlay lyricId={item.lyricsId} {currentTime} />
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .player-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(20px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .player-content {
    width: 90%;
    max-width: 1100px;
    background: var(--surface-color);
    border-radius: var(--radius-lg);
    overflow: hidden;
    border: 1px solid var(--glass-border);
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  }

  .audio-mode {
    max-width: 900px;
  }

  .player-header {
    padding: var(--gap-md);
    background: var(--glass-bg);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--glass-border);
  }

  .badges {
    display: flex;
    gap: 8px;
  }

  .badge {
    background: var(--accent-color);
    font-size: 0.7rem;
    padding: 2px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: 700;
  }

  .badge.kind {
    background: var(--surface-hover);
    color: var(--text-secondary);
  }

  .player-body {
    display: flex;
    flex-direction: column;
  }

  .audio-mode .player-body {
    flex-direction: row;
    height: 500px;
  }

  .video-wrapper {
    position: relative;
    aspect-ratio: 16 / 9;
    background: black;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
  }

  .audio-mode .video-wrapper {
    aspect-ratio: 1 / 1;
    max-width: 400px;
  }

  video {
    width: 100%;
    height: 100%;
  }

  .lyrics-wrapper {
    flex: 1;
    background: var(--bg-color);
    border-left: 1px solid var(--glass-border);
  }

  .resume-prompt {
    position: absolute;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    padding: 12px 24px;
    border-radius: var(--radius-md);
    border: 1px solid var(--accent-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    animation: slideUp 0.4s ease;
    z-index: 10;
  }

  @keyframes slideUp {
    from { transform: translate(-50%, 20px); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }

  .prompt-btns {
    display: flex;
    gap: 12px;
  }

  .prompt-btns button {
    background: var(--accent-color);
    color: white;
    border: none;
    padding: 6px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
  }

  .prompt-btns button.no {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.2rem;
    cursor: pointer;
  }
</style>
