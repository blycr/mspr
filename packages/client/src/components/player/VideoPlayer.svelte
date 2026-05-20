<script lang="ts">
  import { playerEngine } from '../../lib/player/engine.js';
  import { api } from '../../lib/api.js';
  import { formatTime } from '../../lib/format.js';
  import Icon from '../Icon.svelte';
  import LyricsOverlay from './LyricsOverlay.svelte';
  import type { MediaItem, ProbeResult, PlayMode } from '@mspr/shared';
  import {
    PLAYER_PROGRESS_SAVE_INTERVAL_MS,
    PLAYER_RESUME_THRESHOLD_SECONDS,
    PLAYER_SEEK_KEYBOARD_STEP_SECONDS,
  } from '@mspr/shared';

  interface Props {
    item: MediaItem;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
    playMode: PlayMode;
    onToggleMode: () => void;
    isAutoPlay: boolean;
  }

  let { item, onClose, onNext, onPrev, playMode, onToggleMode, isAutoPlay }: Props = $props();
  let mediaElement = $state<HTMLVideoElement | HTMLAudioElement | null>(null);
  let src = $state('');
  let isTranscoding = $state(false);
  let error = $state('');
  let currentTime = $state(0);
  let duration = $state(0);
  let isPlaying = $state(false);
  let volume = $state(1);
  let isLoading = $state(true);
  let probeResult = $state<ProbeResult | null>(null);
  let seekOffset = $state(0);

  const MODE_LABELS: Record<PlayMode, string> = {
    loop: 'List loop',
    shuffle: 'Shuffle',
    'repeat-one': 'Repeat one',
  };

  const ERROR_MESSAGES: Record<number, string> = {
    2: 'Network error. Check server connection.',
    3: 'Decode error. File may be corrupted.',
    4: 'Format not supported.',
  };

  const DEFAULT_ERROR_MESSAGE = 'Playback failed.';

  /* ============================================================
     Initialization
     ============================================================ */
  $effect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await playerEngine.getPlaybackInfo(item.id);
        if (cancelled) return;
        src = info.src;
        probeResult = info.probe;
        isTranscoding = info.probe.strategy === 'transcode';
        duration = info.probe.duration || 0;
        isLoading = false;

        const prog = await api.fetchProgress(item.id);
        if (!cancelled && !isAutoPlay && prog.time > PLAYER_RESUME_THRESHOLD_SECONDS && mediaElement) {
          mediaElement.currentTime = prog.time;
        }
      } catch (e) {
        if (!cancelled) {
          error = 'Failed to load media.';
          isLoading = false;
        }
      }
    })();
    return () => { cancelled = true; };
  });

  /* ============================================================
     Progress save interval
     ============================================================ */
  $effect(() => {
    if (!mediaElement) return;
    const interval = setInterval(saveProgress, PLAYER_PROGRESS_SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  });

  /* ============================================================
     Derived state
     ============================================================ */
  const modeLabel = $derived(MODE_LABELS[playMode]);

  const subtitleTracks = $derived.by(() => {
    return (item.subtitles || []).map(sub => ({
      ...sub,
      src: sub.src.startsWith('http') ? sub.src : api.subtitleUrl(sub.id)
    }));
  });

  const displayTime = $derived(currentTime + seekOffset);

  const progressPct = $derived.by(() => {
    return duration > 0 ? (displayTime / duration) * 100 : 0;
  });

  /* ============================================================
     Event handlers
     ============================================================ */
  function handleMediaError() {
    const el = mediaElement;
    if (!el) return;
    const code = el.error?.code;

    if (!isTranscoding && (code === 3 || code === 4)) {
      src = playerEngine.getStreamUrl(item.id, true);
      isTranscoding = true;
      return;
    }

    error = code && ERROR_MESSAGES[code] ? ERROR_MESSAGES[code] : DEFAULT_ERROR_MESSAGE;
  }

  async function saveProgress() {
    if (mediaElement && mediaElement.currentTime > 0) {
      await api.saveProgress(item.id, mediaElement.currentTime);
    }
  }

  function togglePlay() {
    if (!mediaElement) return;
    if (isPlaying) mediaElement.pause();
    else mediaElement.play();
  }

  function handleEnded() {
    if (!mediaElement) return;
    if (playMode === 'repeat-one') {
      mediaElement.currentTime = 0;
      mediaElement.play().catch(() => {});
    } else {
      onNext();
    }
  }

  function seekTo(targetTime: number) {
    if (!mediaElement || !duration) return;
    targetTime = Math.max(0, Math.min(duration, targetTime));

    if (isTranscoding) {
      const wasPlaying = !mediaElement.paused;
      mediaElement.pause();
      seekOffset = Math.floor(targetTime);
      const newSrc = playerEngine.getStreamUrl(item.id, true, seekOffset);
      mediaElement.src = newSrc;
      mediaElement.load();
      if (wasPlaying) {
        mediaElement.play().catch(() => {});
      }
    } else {
      seekOffset = 0;
      mediaElement.currentTime = targetTime;
    }
  }

  function handleSeek(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(ratio * duration);
  }

  function handleSeekKey(e: KeyboardEvent) {
    if (!mediaElement || !duration) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      seekTo(displayTime - PLAYER_SEEK_KEYBOARD_STEP_SECONDS);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      seekTo(displayTime + PLAYER_SEEK_KEYBOARD_STEP_SECONDS);
    }
  }
</script>

<div class="player-overlay">
  <div class="player-container" class:audio-mode={item.kind === 'audio'}>
    {#if item.kind === 'audio'}
      <div class="player-bg" style="background-image: url('{api.thumbnailUrl(item.id)}')"></div>
    {/if}

    <div class="player-content">
      <header class="player-header">
        <div class="item-info">
          <span class="badge kind">{item.kind}</span>
          <h2 class="title">{item.name}</h2>
          {#if isTranscoding}
            <span class="badge transcoding">Transcoding</span>
          {/if}
        </div>
        <div class="header-actions">
          {#if item.kind === 'video'}
            <button class="ctrl-btn" onclick={onPrev} aria-label="Previous">
              <Icon name="skip-prev" size={18} />
            </button>
            <button class="ctrl-btn" onclick={onNext} aria-label="Next">
              <Icon name="skip-next" size={18} />
            </button>
            <button class="mode-btn" onclick={onToggleMode} aria-label="Play mode: {modeLabel}">
              <Icon name={playMode === 'shuffle' ? 'shuffle' : 'repeat'} size={16} />
              {#if playMode === 'repeat-one'}
                <span class="mode-badge">1</span>
              {/if}
            </button>
          {/if}
          <button class="close-btn" onclick={async () => { await saveProgress(); onClose(); }} aria-label="Close Player">
            <Icon name="close" size={20} />
          </button>
        </div>
      </header>

      <div class="player-main" class:audio-layout={item.kind === 'audio'}>
        {#if item.kind === 'audio'}
          <div class="audio-left">
            <div class="cover-wrap">
              <img src={api.thumbnailUrl(item.id)} alt="" class="cover-img" />
            </div>

            <div class="audio-controls">
              <div class="progress-track" onclick={handleSeek} onkeydown={handleSeekKey} role="slider" aria-valuenow={currentTime} aria-valuemax={duration} aria-label="Seek" tabindex="0">
                <div class="progress-fill" style="width: {progressPct}%"></div>
              </div>
              <div class="time-row">
                <span>{formatTime(displayTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div class="btn-row">
                <button class="ctrl-btn" onclick={onPrev} aria-label="Previous">
                  <Icon name="skip-prev" size={22} />
                </button>
                <button class="play-btn" onclick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                  <Icon name={isPlaying ? 'pause' : 'play'} size={28} />
                </button>
                <button class="ctrl-btn" onclick={onNext} aria-label="Next">
                  <Icon name="skip-next" size={22} />
                </button>
              </div>
              <div class="btn-row secondary">
                <button class="mode-btn" onclick={onToggleMode} aria-label="Play mode: {modeLabel}">
                  <Icon name={playMode === 'shuffle' ? 'shuffle' : 'repeat'} size={16} />
                  {#if playMode === 'repeat-one'}
                    <span class="mode-badge">1</span>
                  {/if}
                </button>
                <div class="volume-wrap">
                  <button class="vol-btn" onclick={() => { if (mediaElement) mediaElement.muted = !mediaElement.muted; }} aria-label="Toggle mute">
                    <Icon name={(mediaElement?.muted || volume === 0) ? 'volume-off' : 'volume-up'} size={20} />
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    oninput={(e) => { if (mediaElement) mediaElement.volume = parseFloat(e.currentTarget.value); }}
                    class="vol-slider"
                    aria-label="Volume"
                  />
                </div>
              </div>
            </div>

            <audio
              bind:this={mediaElement}
              {src}
              autoplay
              onplay={() => isPlaying = true}
              onpause={() => isPlaying = false}
              onloadedmetadata={() => { if (!duration) duration = mediaElement?.duration || 0; }}
              ontimeupdate={() => currentTime = mediaElement?.currentTime || 0}
              onvolumechange={() => volume = mediaElement?.muted ? 0 : (mediaElement?.volume || 0)}
              onended={handleEnded}
              onerror={handleMediaError}
            ></audio>
          </div>
        {:else}
          <div class="visual-section">
            {#if error}
              <div class="error-msg">
                <Icon name="warning" size={32} />
                <p>{error}</p>
              </div>
            {:else if isLoading}
              <div class="loading-state">
                <div class="loader"></div>
                <p>Preparing stream...</p>
              </div>
            {:else if src}
              <div class="media-wrapper">
                <!-- svelte-ignore a11y_media_has_caption -->
                <video
                  bind:this={mediaElement}
                  {src}
                  controls
                  autoplay
                  playsinline
                  ontimeupdate={() => currentTime = mediaElement?.currentTime || 0}
                  onended={handleEnded}
                  onerror={handleMediaError}
                >
                  {#each subtitleTracks as sub}
                    <track kind="subtitles" src={sub.src} srclang={sub.lang || ''} label={sub.label} default={sub.default} />
                  {/each}
                </video>
              </div>
            {/if}
          </div>
        {/if}

        {#if item.kind === 'audio' && item.lyricsId}
          <div class="lyrics-section">
            <LyricsOverlay lyricId={item.lyricsId} currentTime={displayTime} />
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
    background: var(--player-overlay-bg);
    z-index: var(--z-player);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .player-container {
    width: 100%;
    max-width: 1100px;
    height: 85vh;
    background: var(--player-container-bg);
    border-radius: 16px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--player-container-border);
  }

  .player-bg {
    position: absolute;
    inset: -40px;
    background-size: cover;
    background-position: center;
    filter: blur(50px) brightness(0.25);
    opacity: 0.5;
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
    padding: 18px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--player-header-gradient);
    flex-shrink: 0;
  }

  .item-info {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .badge {
    padding: 3px 8px;
    border-radius: 5px;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }

  .badge.kind {
    background: var(--btn-bg);
    color: var(--text-secondary);
  }

  .badge.transcoding {
    background: #d97706;
    color: white;
  }

  .close-btn {
    background: var(--btn-bg);
    border: none;
    color: var(--text-primary);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s ease;
    flex-shrink: 0;
  }

  .close-btn:hover {
    background: var(--btn-bg-hover);
  }

  .player-main {
    flex: 1;
    display: flex;
    min-height: 0;
  }

  .audio-layout {
    flex-direction: row;
  }

  /* ===== Audio Left Panel ===== */
  .audio-left {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    gap: 32px;
    position: relative;
    min-width: 0;
    overflow-y: auto;
    scrollbar-width: none;
  }

  .audio-left::-webkit-scrollbar {
    display: none;
  }

  .cover-wrap {
    width: 100%;
    max-width: 300px;
    aspect-ratio: 1 / 1;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 24px 80px var(--player-cover-shadow);
    flex-shrink: 0;
  }

  .cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .audio-controls {
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    flex-shrink: 0;
  }

  .progress-track {
    height: 5px;
    background: var(--player-progress-track);
    border-radius: 3px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }

  .progress-track:focus-visible {
    outline: 2px solid var(--accent-color);
    outline-offset: 2px;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent-color);
    border-radius: 3px;
    transition: width 0.1s linear;
    pointer-events: none;
  }

  .time-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--text-dim);
    font-weight: 500;
  }

  .btn-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
  }

  .btn-row.secondary {
    gap: 14px;
  }

  .play-btn {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--accent-color);
    border: none;
    color: #ffffff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease, background 0.15s ease;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  .play-btn:hover {
    transform: scale(1.06);
    background: var(--accent-hover);
  }

  .volume-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .vol-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 4px;
    transition: color 0.15s ease;
  }

  .vol-btn:hover {
    color: var(--text-primary);
  }

  .vol-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 90px;
    height: 4px;
    background: var(--player-progress-track);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }

  .vol-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent-color);
    cursor: pointer;
    transition: transform 0.15s ease;
  }

  .vol-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  .vol-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent-color);
    cursor: pointer;
    border: none;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .ctrl-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border-radius: 8px;
    transition: color 0.15s ease, background 0.15s ease;
  }

  .ctrl-btn:hover {
    color: var(--text-primary);
    background: var(--btn-bg-hover);
  }

  .mode-btn {
    position: relative;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border-radius: 8px;
    transition: color 0.15s ease, background 0.15s ease;
  }

  .mode-btn:hover {
    color: var(--text-primary);
    background: var(--btn-bg-hover);
  }

  .mode-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 0.55rem;
    font-weight: 700;
    background: var(--accent-color);
    color: white;
    border-radius: 3px;
    padding: 0 2px;
    line-height: 1;
  }

  /* ===== Video Section ===== */
  .visual-section {
    flex: 1.5;
    background: var(--player-visual-bg);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    min-width: 0;
  }

  .media-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  /* ===== Lyrics ===== */
  .lyrics-section {
    flex: 1;
    background: var(--player-lyrics-bg);
    border-left: 1px solid var(--player-lyrics-border);
    overflow: hidden;
    min-width: 0;
  }

  /* ===== Shared States ===== */
  .error-msg {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: var(--error-color);
    text-align: center;
    padding: 24px;
  }

  .error-msg p {
    color: var(--player-error-text-secondary);
    margin: 0;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    color: var(--player-loading-text);
  }

  .loader {
    width: 40px;
    height: 40px;
    border: 3px solid var(--player-loader-track);
    border-top-color: var(--accent-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* ===== Responsive ===== */
  @media (max-width: 640px) {
    .player-overlay {
      padding: 0;
    }

    .player-container {
      max-width: 100%;
      height: 100dvh;
      border-radius: 0;
      border: none;
    }

    .player-header {
      padding: 12px 16px;
    }

    .title {
      font-size: 0.9rem;
    }

    .player-main.audio-layout {
      display: contents;
    }

    .audio-left {
      flex: none;
      padding: 20px 16px;
      gap: 20px;
      justify-content: flex-start;
      padding-top: 24px;
      max-height: 55vh;
    }

    .cover-wrap {
      max-width: 220px;
    }

    .audio-controls {
      max-width: 100%;
    }

    .play-btn {
      width: 52px;
      height: 52px;
    }

    .lyrics-section {
      border-left: none;
      border-top: 1px solid var(--player-lyrics-border);
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .visual-section {
      flex: 1;
    }
  }
</style>
