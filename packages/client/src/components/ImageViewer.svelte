<script lang="ts">
  import type { MediaItem } from '@mspr/shared';
  import { VIEWER_MIN_SCALE, VIEWER_MAX_SCALE, VIEWER_ZOOM_STEP } from '@mspr/shared';
  import Icon from './Icon.svelte';
  import { api } from '../lib/api.js';

  interface Props {
    items: MediaItem[];
    currentIndex: number;
    onClose: () => void;
    onNavigate: (index: number) => void;
  }

  let { items, currentIndex, onClose, onNavigate }: Props = $props();

  let scale = $state(1);
  let offsetX = $state(0);
  let offsetY = $state(0);
  let isDragging = $state(false);
  let dragStartX = $state(0);
  let dragStartY = $state(0);
  let dragStartOffsetX = $state(0);
  let dragStartOffsetY = $state(0);

  const currentItem = $derived(items[currentIndex] ?? null);
  const hasPrev = $derived(currentIndex > 0);
  const hasNext = $derived(currentIndex < items.length - 1);
  const counterText = $derived(`${currentIndex + 1} / ${items.length}`);

  function goPrev() {
    if (hasPrev) {
      resetView();
      onNavigate(currentIndex - 1);
    }
  }

  function goNext() {
    if (hasNext) {
      resetView();
      onNavigate(currentIndex + 1);
    }
  }

  function resetView() {
    scale = 1;
    offsetX = 0;
    offsetY = 0;
  }

  function zoomIn() {
    scale = Math.min(VIEWER_MAX_SCALE, scale + VIEWER_ZOOM_STEP);
  }

  function zoomOut() {
    scale = Math.max(VIEWER_MIN_SCALE, scale - VIEWER_ZOOM_STEP);
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -VIEWER_ZOOM_STEP : VIEWER_ZOOM_STEP;
    scale = Math.min(VIEWER_MAX_SCALE, Math.max(VIEWER_MIN_SCALE, scale + delta));
  }

  function handleMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartOffsetX = offsetX;
    dragStartOffsetY = offsetY;
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    offsetX = dragStartOffsetX + (e.clientX - dragStartX);
    offsetY = dragStartOffsetY + (e.clientY - dragStartY);
  }

  function handleMouseUp() {
    isDragging = false;
  }

  function handleKey(e: KeyboardEvent) {
    switch (e.key) {
      case 'Escape': onClose(); break;
      case 'ArrowLeft': goPrev(); break;
      case 'ArrowRight': goNext(); break;
      case '+': case '=': zoomIn(); break;
      case '-': zoomOut(); break;
      case '0': resetView(); break;
    }
  }

  $effect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="viewer-overlay"
  onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  onwheel={handleWheel}
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  onmouseleave={handleMouseUp}
  onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
  role="dialog"
  tabindex="-1"
  aria-label="Image viewer"
>
  <header class="viewer-header">
    <span class="counter">{counterText}</span>
    <span class="filename" title={currentItem?.name}>{currentItem?.name}</span>
    <div class="toolbar-actions">
      <button class="tool-btn" onclick={zoomOut} aria-label="Zoom out">
        <Icon name="zoom-out" size={20} />
      </button>
      <button class="tool-btn" onclick={zoomIn} aria-label="Zoom in">
        <Icon name="zoom-in" size={20} />
      </button>
      <button class="tool-btn" onclick={resetView} aria-label="Fit screen">
        <Icon name="fit-screen" size={20} />
      </button>
      <button class="tool-btn" onclick={onClose} aria-label="Close viewer">
        <Icon name="close" size={20} />
      </button>
    </div>
  </header>

  {#if currentItem}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <img
      src={api.imageUrl(currentItem.id)}
      alt={currentItem.name}
      class="viewer-img"
      class:dragging={isDragging}
      style="transform: translate({offsetX}px, {offsetY}px) scale({scale});"
      onmousedown={handleMouseDown}
      ondblclick={resetView}
      draggable={false}
    />
  {/if}

  {#if hasPrev}
    <button class="nav-arrow left" onclick={goPrev} aria-label="Previous image">
      <Icon name="chevron-left" size={36} />
    </button>
  {/if}
  {#if hasNext}
    <button class="nav-arrow right" onclick={goNext} aria-label="Next image">
      <Icon name="chevron-right" size={36} />
    </button>
  {/if}

  <div class="scale-indicator">{Math.round(scale * 100)}%</div>
</div>

<style>
  .viewer-overlay {
    position: fixed;
    inset: 0;
    background: var(--viewer-overlay-bg);
    z-index: var(--z-viewer);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    user-select: none;
  }

  .viewer-overlay:active { cursor: grabbing; }

  .viewer-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 52px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--viewer-header-gradient);
    z-index: var(--z-viewer-header);
    color: var(--text-primary);
    gap: 12px;
  }

  .counter {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
    flex-shrink: 0;
    min-width: 48px;
  }

  .filename {
    font-size: 0.9rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
    flex: 1;
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .tool-btn {
    background: var(--viewer-btn-bg);
    border: none;
    color: var(--text-primary);
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .tool-btn:hover {
    background: var(--viewer-btn-bg-hover);
  }

  .viewer-img {
    max-width: 90vw;
    max-height: 85vh;
    object-fit: contain;
    will-change: transform;
    transition: transform 0.1s ease-out;
    cursor: grab;
  }

  .viewer-img.dragging {
    transition: none;
    cursor: grabbing;
  }

  .nav-arrow {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    background: var(--btn-bg);
    border: none;
    color: var(--text-primary);
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s ease;
    z-index: var(--z-viewer-nav);
  }

  .nav-arrow:hover { background: var(--btn-bg-hover); }
  .nav-arrow.left { left: 16px; }
  .nav-arrow.right { right: 16px; }

  .scale-indicator {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--viewer-scale-bg);
    color: var(--viewer-scale-text);
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    pointer-events: none;
    z-index: var(--z-viewer-scale);
  }

  @media (max-width: 640px) {
    .nav-arrow { width: 40px; height: 40px; }
    .nav-arrow.left { left: 8px; }
    .nav-arrow.right { right: 8px; }
    .viewer-header { padding: 0 12px; }
    .filename { font-size: 0.8rem; }
  }
</style>
