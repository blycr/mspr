<script lang="ts">
  import { onMount } from 'svelte';
  import type { MediaItem } from '@mspr/shared';
  import VideoPlayer from './components/player/VideoPlayer.svelte';
  import MediaCard from './components/MediaCard.svelte';
  import Icon from './components/Icon.svelte';
  import { api } from './lib/api.js';
  import { playlistManager } from './lib/player/playlist.js';
  import './styles/tokens.css';

  let items = $state<MediaItem[]>([]);
  let history = $state<MediaItem[]>([]);
  let loading = $state(true);
  let selectedItem = $state<MediaItem | null>(null);
  let searchQuery = $state('');
  let activeTab = $state<'all' | 'video' | 'audio' | 'image' | 'history'>('all');
  let isMobile = $state(false);
  let sidebarOpen = $state(false);
  let playMode = $state<'loop' | 'shuffle' | 'repeat-one'>(playlistManager.mode);
  let isAutoPlay = $state(false);

  /* Virtual scroll state */
  let scrollEl = $state<HTMLElement | null>(null);
  let gridCols = $state(4);
  let scrollTop = $state(0);
  let containerHeight = $state(0);

  const ROW_HEIGHT_DESKTOP = 280;
  const ROW_HEIGHT_MOBILE = 220;
  const BUFFER_ROWS = 4;

  const rowHeight = $derived(isMobile ? ROW_HEIGHT_MOBILE : ROW_HEIGHT_DESKTOP);

  const filteredItems = $derived.by(() => {
    let base = activeTab === 'history' ? history : items;
    if (activeTab === 'video') base = items.filter(i => i.kind === 'video');
    if (activeTab === 'audio') base = items.filter(i => i.kind === 'audio');
    if (activeTab === 'image') base = items.filter(i => i.kind === 'image');

    if (!searchQuery) return base;
    return base.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const totalRows = $derived(Math.ceil(filteredItems.length / gridCols));
  const totalHeight = $derived(totalRows * rowHeight);

  const startRow = $derived(Math.max(0, Math.floor(scrollTop / rowHeight) - BUFFER_ROWS));
  const endRow = $derived(Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / rowHeight) + BUFFER_ROWS));

  const startIndex = $derived(startRow * gridCols);
  const endIndex = $derived(Math.min(endRow * gridCols, filteredItems.length));
  const visibleItems = $derived(filteredItems.slice(startIndex, endIndex));
  const topOffset = $derived(startRow * rowHeight);

  /* Reset scroll on tab/filter change */
  $effect(() => {
    activeTab;
    searchQuery;
    if (scrollEl) scrollEl.scrollTop = 0;
  });

  async function fetchMedia() {
    try {
      loading = true;
      const [mediaRes, historyRes] = await Promise.all([
        api.fetchMedia(),
        api.fetchHistory()
      ]);
      items = mediaRes;
      history = historyRes;
    } catch (e) {
      console.error('Failed to fetch media:', e);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchMedia();
    const checkMobile = () => { isMobile = window.innerWidth <= 768; };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  });

  /* ResizeObserver: column count + viewport height */
  $effect(() => {
    if (!scrollEl) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        containerHeight = cr.height;
        const w = cr.width;
        if (w <= 480) gridCols = 2;
        else if (w <= 768) gridCols = 2;
        else gridCols = Math.max(2, Math.floor(w / 220));
      }
    });
    ro.observe(scrollEl);
    return () => ro.disconnect();
  });

  function handleCardClick(item: MediaItem) {
    if (item.kind === 'video' || item.kind === 'audio') {
      const list = items.filter(i => i.kind === item.kind);
      const idx = list.findIndex(i => i.id === item.id);
      playlistManager.setPlaylist(list, Math.max(0, idx));
      selectedItem = item;
      isAutoPlay = false;
    }
  }

  function handleNext() {
    isAutoPlay = true;
    const next = playlistManager.next();
    if (next) selectedItem = next;
    playMode = playlistManager.mode;
  }

  function handlePrev() {
    isAutoPlay = true;
    const prev = playlistManager.prev();
    if (prev) selectedItem = prev;
    playMode = playlistManager.mode;
  }

  function handleToggleMode() {
    playlistManager.toggleMode();
    playMode = playlistManager.mode;
  }

  function handleCardKey(event: KeyboardEvent, item: MediaItem) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick(item);
    }
  }

  const tabs = [
    { key: 'all' as const, label: 'All', icon: 'folder' as const },
    { key: 'video' as const, label: 'Videos', icon: 'video' as const },
    { key: 'audio' as const, label: 'Music', icon: 'music' as const },
    { key: 'image' as const, label: 'Images', icon: 'file' as const },
    { key: 'history' as const, label: 'Recent', icon: 'clock' as const },
  ];
</script>

<main class="app-container">
  {#if isMobile}
    <header class="mobile-header">
      <button class="icon-btn" onclick={() => sidebarOpen = !sidebarOpen} aria-label="Menu">
        <Icon name="menu" size={22} />
      </button>
      <span class="logo-text">MSP</span>
      <div class="mobile-search">
        <Icon name="search" size={16} />
        <input type="text" placeholder="Search..." bind:value={searchQuery} />
      </div>
    </header>

    {#if sidebarOpen}
      <div class="drawer-overlay" role="presentation" onclick={() => sidebarOpen = false}>
        <div class="mobile-drawer" aria-label="Navigation menu" onclick={e => e.stopPropagation()}>
          <div class="drawer-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <Icon name="logo" size={22} />
              <span class="logo-text">MSP</span>
            </div>
            <button class="icon-btn" onclick={() => sidebarOpen = false} aria-label="Close menu">
              <Icon name="close" size={20} />
            </button>
          </div>
          <nav class="drawer-nav">
            {#each tabs as tab}
              <button
                class:active={activeTab === tab.key}
                onclick={() => { activeTab = tab.key; sidebarOpen = false; }}
              >
                <Icon name={tab.icon} size={18} />
                <span>{tab.label}</span>
              </button>
            {/each}
          </nav>
          <div class="drawer-footer">
            <button class="refresh-btn" onclick={() => { fetchMedia(); sidebarOpen = false; }}>
              Refresh
            </button>
          </div>
        </div>
      </div>
    {/if}

    <nav class="mobile-tabs" aria-label="Library categories">
      {#each tabs as tab}
        <button
          class:active={activeTab === tab.key}
          onclick={() => activeTab = tab.key}
        >
          {tab.label}
        </button>
      {/each}
    </nav>
  {:else}
    <aside class="sidebar">
      <div class="logo">
        <Icon name="logo" size={22} />
        <span class="logo-text">MSP</span>
      </div>

      <nav class="side-nav" aria-label="Library categories">
        {#each tabs as tab}
          <button
            class:active={activeTab === tab.key}
            onclick={() => activeTab = tab.key}
            aria-current={activeTab === tab.key ? 'page' : undefined}
          >
            <Icon name={tab.icon} size={18} />
            <span>{tab.label}</span>
          </button>
        {/each}
      </nav>

      <div class="sidebar-footer">
        <button class="refresh-btn" onclick={fetchMedia}>
          Refresh
        </button>
      </div>
    </aside>
  {/if}

  <div class="main-content">
    {#if !isMobile}
      <header class="search-header">
        <div class="search-box">
          <span class="search-icon">
            <Icon name="search" size={18} />
          </span>
          <input
            type="text"
            placeholder="Search..."
            bind:value={searchQuery}
          />
        </div>
        <div class="header-meta">
          {filteredItems.length} items
        </div>
      </header>
    {/if}

    <section class="scroll-area" bind:this={scrollEl} onscroll={(e) => scrollTop = (e.currentTarget as HTMLElement).scrollTop}>
      {#if loading}
        <div class="status-view">
          <div class="loader"></div>
          <p>Loading...</p>
        </div>
      {:else if filteredItems.length === 0}
        <div class="status-view">
          <p>No items found.</p>
        </div>
      {:else}
        <div class="virtual-container" style="height: {totalHeight}px" role="list" aria-label="Media items">
          <div class="media-grid" style="top: {topOffset}px; --grid-cols: {gridCols}">
            {#each visibleItems as item (item.id)}
              <MediaCard {item} onClick={handleCardClick} onKey={handleCardKey} />
            {/each}
          </div>
        </div>
      {/if}
    </section>
  </div>

  {#if selectedItem}
    {#key selectedItem.id}
      <VideoPlayer
        item={selectedItem}
        onClose={() => { selectedItem = null; fetchMedia(); }}
        onNext={handleNext}
        onPrev={handlePrev}
        playMode={playMode}
        onToggleMode={handleToggleMode}
        isAutoPlay={isAutoPlay}
      />
    {/key}
  {/if}
</main>

<style>
  .app-container {
    display: flex;
    height: 100vh;
    width: 100vw;
    background: #0a0a0f;
    color: var(--text-primary);
    overflow: hidden;
  }

  /* ===== Desktop Sidebar ===== */
  .sidebar {
    width: 220px;
    background: rgba(255, 255, 255, 0.02);
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    padding: 24px 16px;
    flex-shrink: 0;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 32px;
    padding: 0 8px;
    color: var(--accent-color);
  }

  .logo-text {
    font-size: 1.2rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text-primary);
  }

  .side-nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .side-nav button {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    padding: 10px 12px;
    text-align: left;
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: background 0.15s ease;
  }

  .side-nav button:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
  }

  .side-nav button.active {
    background: var(--accent-color);
    color: white;
  }

  .sidebar-footer {
    margin-top: auto;
    padding-top: 16px;
  }

  .refresh-btn {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-secondary);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 10px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 0.85rem;
  }

  .refresh-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
  }

  /* ===== Mobile Header ===== */
  .mobile-header {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 52px;
    background: rgba(10, 10, 15, 0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    z-index: 100;
    align-items: center;
    padding: 0 12px;
    gap: 10px;
  }

  .icon-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    cursor: pointer;
  }

  .icon-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
  }

  .mobile-search {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    padding: 0 10px;
    height: 34px;
    color: rgba(255, 255, 255, 0.3);
  }

  .mobile-search input {
    background: none;
    border: none;
    color: white;
    width: 100%;
    outline: none;
    font-size: 0.85rem;
  }

  /* ===== Mobile Drawer ===== */
  .drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 200;
    display: flex;
  }

  .mobile-drawer {
    width: 260px;
    height: 100%;
    background: #0f0f14;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    padding: 20px 16px;
    animation: slideIn 0.2s ease;
  }

  @keyframes slideIn {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    padding: 0 8px;
    color: var(--accent-color);
  }

  .drawer-nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .drawer-nav button {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    padding: 10px 12px;
    text-align: left;
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .drawer-nav button.active {
    background: var(--accent-color);
    color: white;
  }

  .drawer-footer {
    margin-top: auto;
    padding-top: 16px;
  }

  /* ===== Mobile Tabs ===== */
  .mobile-tabs {
    display: none;
    position: fixed;
    top: 52px;
    left: 0;
    right: 0;
    height: 40px;
    background: rgba(10, 10, 15, 0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    z-index: 99;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .mobile-tabs::-webkit-scrollbar {
    display: none;
  }

  .mobile-tabs button {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .mobile-tabs button.active {
    background: var(--accent-color);
    color: white;
  }

  /* ===== Main Content ===== */
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .search-header {
    height: 64px;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    flex-shrink: 0;
  }

  .search-box {
    background: rgba(255, 255, 255, 0.04);
    padding: 0 14px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 320px;
    max-width: 100%;
    height: 38px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    transition: border-color 0.2s ease;
  }

  .search-box:focus-within {
    border-color: var(--accent-color);
  }

  .search-box input {
    background: none;
    border: none;
    color: white;
    width: 100%;
    outline: none;
    font-size: 0.9rem;
  }

  .search-icon {
    color: rgba(255, 255, 255, 0.3);
    flex-shrink: 0;
  }

  .header-meta {
    font-size: 0.85rem;
    color: var(--text-dim);
    font-weight: 500;
  }

  .scroll-area {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    scrollbar-width: none;
  }

  .scroll-area::-webkit-scrollbar {
    display: none;
  }

  /* ===== Virtual Grid ===== */
  .virtual-container {
    position: relative;
    width: 100%;
  }

  .media-grid {
    position: absolute;
    left: 0;
    right: 0;
    display: grid;
    grid-template-columns: repeat(var(--grid-cols), 1fr);
    gap: 20px;
  }

  .status-view {
    height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    gap: 16px;
  }

  .loader {
    width: 36px;
    height: 36px;
    border: 2px solid rgba(255, 255, 255, 0.06);
    border-top-color: var(--accent-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* ===== Responsive ===== */
  @media (max-width: 768px) {
    .app-container {
      flex-direction: column;
    }

    .mobile-header,
    .mobile-tabs {
      display: flex;
    }

    .main-content {
      margin-top: 92px; /* header + tabs */
      height: calc(100vh - 92px);
    }

    .search-header {
      display: none;
    }

    .scroll-area {
      padding: 12px;
    }

    .media-grid {
      gap: 10px;
    }
  }

  @media (max-width: 480px) {
    .media-grid {
      gap: 8px;
    }
  }
</style>
