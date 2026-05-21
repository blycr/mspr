<script lang="ts">
  import type { MediaItem, TabKey, Theme } from '@mspr/shared';
  import {
    LAYOUT_MOBILE_BREAKPOINT,
    LAYOUT_SMALL_BREAKPOINT,
    LAYOUT_GRID_MIN_COL_WIDTH_PX,
    LAYOUT_ROW_HEIGHT_DESKTOP,
    LAYOUT_ROW_HEIGHT_MOBILE,
    LAYOUT_VIRTUAL_BUFFER_ROWS,
  } from '@mspr/shared';
  import VideoPlayer from './components/player/VideoPlayer.svelte';
  import ImageViewer from './components/ImageViewer.svelte';
  import MediaCard from './components/MediaCard.svelte';
  import PinModal from './components/PinModal.svelte';
  import Icon from './components/Icon.svelte';
  import { api, setPin } from './lib/api.js';
  import { playlistManager } from './lib/player/playlist.js';
  import { matchesQuery } from './lib/search.js';
  import { initTheme, applyTheme, saveTheme } from './lib/theme.js';
  import './styles/tokens.css';

  /* ============================================================
     State
     ============================================================ */
  let items = $state<MediaItem[]>([]);
  let history = $state<MediaItem[]>([]);
  let loading = $state(true);
  let selectedItem = $state<MediaItem | null>(null);
  let searchQuery = $state('');

  let activeTab = $state<TabKey>('video');
  let theme = $state<Theme>(initTheme());
  let forceLayout = $state<'desktop' | 'mobile' | null>(null);
  let windowWidth = $state(0);
  let sidebarOpen = $state(false);
  let playMode = $state(playlistManager.mode);
  let isAutoPlay = $state(false);

  /* PIN auth state */
  let pinModalOpen = $state(false);
  let pinError = $state('');
  let authChecked = $state(false);

  /* Image viewer state */
  let imageItems = $state<MediaItem[]>([]);
  let imageIndex = $state(0);
  let imageViewerOpen = $state(false);

  /* Virtual scroll state */
  let scrollEl = $state<HTMLElement | null>(null);
  let gridCols = $state(4);
  let scrollTop = $state(0);
  let containerHeight = $state(0);

  /* ============================================================
     Constants
     ============================================================ */
  const TABS: { key: TabKey; label: string; icon: 'video' | 'music' | 'file' | 'clock' }[] = [
    { key: 'video', label: 'Videos', icon: 'video' },
    { key: 'audio', label: 'Music', icon: 'music' },
    { key: 'image', label: 'Images', icon: 'file' },
    { key: 'history', label: 'Recent', icon: 'clock' },
  ];

  /* ============================================================
     Derived state
     ============================================================ */
  const isMobile = $derived(forceLayout === 'mobile' || (forceLayout === null && windowWidth <= LAYOUT_MOBILE_BREAKPOINT));
  const rowHeight = $derived(isMobile ? LAYOUT_ROW_HEIGHT_MOBILE : LAYOUT_ROW_HEIGHT_DESKTOP);

  const filteredItems = $derived.by(() => {
    let base = activeTab === 'history' ? history : items;
    if (activeTab === 'video') base = items.filter(i => i.kind === 'video');
    if (activeTab === 'audio') base = items.filter(i => i.kind === 'audio');
    if (activeTab === 'image') base = items.filter(i => i.kind === 'image');

    if (!searchQuery) return base;
    return base.filter(i => matchesQuery(i.name, searchQuery));
  });

  const totalRows = $derived(Math.ceil(filteredItems.length / gridCols));
  const totalHeight = $derived(totalRows * rowHeight);

  const startRow = $derived(Math.max(0, Math.floor(scrollTop / rowHeight) - LAYOUT_VIRTUAL_BUFFER_ROWS));
  const endRow = $derived(Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / rowHeight) + LAYOUT_VIRTUAL_BUFFER_ROWS));

  const startIndex = $derived(startRow * gridCols);
  const endIndex = $derived(Math.min(endRow * gridCols, filteredItems.length));
  const visibleItems = $derived(filteredItems.slice(startIndex, endIndex));
  const topOffset = $derived(startRow * rowHeight);

  /* ============================================================
     Effects
     ============================================================ */
  $effect(() => {
    activeTab;
    searchQuery;
    if (scrollEl) scrollEl.scrollTop = 0;
  });

  $effect(() => {
    applyTheme(theme);
  });

  $effect(() => {
    windowWidth = window.innerWidth;
    const handleResize = () => { windowWidth = window.innerWidth; };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  $effect(() => {
    if (!authChecked) {
      checkAuth();
    }
  });

  $effect(() => {
    if (!scrollEl) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        containerHeight = cr.height;
        const w = cr.width;
        if (w <= LAYOUT_SMALL_BREAKPOINT) gridCols = 2;
        else if (w <= LAYOUT_MOBILE_BREAKPOINT) gridCols = 2;
        else gridCols = Math.max(2, Math.floor(w / LAYOUT_GRID_MIN_COL_WIDTH_PX));
      }
    });
    ro.observe(scrollEl);
    return () => ro.disconnect();
  });

  /* ============================================================
     Actions
     ============================================================ */
  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    saveTheme(theme);
  }

  function toggleLayout() {
    forceLayout = isMobile ? 'desktop' : 'mobile';
  }

  async function checkAuth() {
    try {
      const savedPin = localStorage.getItem('msp-pin');
      if (savedPin) {
        const result = await api.verifyPin(savedPin);
        if (result.valid) {
          setPin(savedPin);
          authChecked = true;
          fetchMedia();
          return;
        }
        localStorage.removeItem('msp-pin');
      }
      // Try without PIN to see if server requires one
      const res = await fetch(api.baseUrl + '/media', { method: 'HEAD' });
      if (res.status === 401) {
        pinModalOpen = true;
      } else {
        authChecked = true;
        fetchMedia();
      }
    } catch (e) {
      authChecked = true;
      fetchMedia();
    }
  }

  async function handlePinSubmit(pin: string) {
    pinError = '';
    const result = await api.verifyPin(pin);
    if (result.valid) {
      setPin(pin);
      localStorage.setItem('msp-pin', pin);
      pinModalOpen = false;
      authChecked = true;
      fetchMedia();
    } else {
      pinError = 'Invalid PIN. Please try again.';
    }
  }

  async function fetchMedia() {
    try {
      loading = true;
      const [mediaRes, historyRes] = await Promise.all([
        api.fetchMedia(),
        api.fetchHistory()
      ]);
      items = mediaRes;
      history = historyRes;
    } catch (e: any) {
      if (e.message?.includes('401')) {
        pinError = 'Session expired. Please enter PIN again.';
        pinModalOpen = true;
        localStorage.removeItem('msp-pin');
        setPin('');
      }
      console.error('Failed to fetch media:', e);
    } finally {
      loading = false;
    }
  }

  function handleCardClick(item: MediaItem) {
    if (item.kind === 'video' || item.kind === 'audio') {
      const list = items.filter(i => i.kind === item.kind);
      const idx = list.findIndex(i => i.id === item.id);
      playlistManager.setPlaylist(list, Math.max(0, idx));
      selectedItem = item;
      isAutoPlay = false;
    } else if (item.kind === 'image') {
      const list = items.filter(i => i.kind === 'image');
      const idx = list.findIndex(i => i.id === item.id);
      imageItems = list;
      imageIndex = Math.max(0, idx);
      imageViewerOpen = true;
    }
  }

  function handleCardKey(event: KeyboardEvent, item: MediaItem) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick(item);
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

  async function clearHistory() {
    try {
      await api.clearHistory();
      history = [];
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  }
</script>

<main class="app-container" class:force-mobile={forceLayout === 'mobile'} class:force-desktop={forceLayout === 'desktop'}>
  {#if isMobile}
    <header class="mobile-header">
      <button class="icon-btn" onclick={() => sidebarOpen = !sidebarOpen} aria-label="Menu">
        <Icon name="menu" size={22} />
      </button>
      <span style="color: var(--accent-color); line-height: 0;">
        <Icon name="logo" size={22} />
      </span>
      <span class="logo-text">MSP</span>
      <div class="mobile-search">
        <Icon name="search" size={16} />
        <input type="text" placeholder="Search..." bind:value={searchQuery} />
      </div>
      <button class="icon-btn" onclick={toggleTheme} aria-label="Toggle theme" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
      </button>
    </header>

    {#if sidebarOpen}
      <div class="drawer-overlay" role="presentation" onclick={() => sidebarOpen = false}>
        <div class="mobile-drawer" aria-label="Navigation menu" role="dialog" tabindex="-1" onclick={e => e.stopPropagation()} onkeydown={(e) => { if (e.key === 'Escape') sidebarOpen = false; }}>
          <div class="drawer-header">
            <div class="drawer-header-brand">
              <Icon name="logo" size={22} />
              <span class="logo-text">MSP</span>
            </div>
            <button class="icon-btn" onclick={() => sidebarOpen = false} aria-label="Close menu">
              <Icon name="close" size={20} />
            </button>
          </div>
          <nav class="drawer-nav">
            {#each TABS as tab}
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
            {#if activeTab === 'history'}
              <button class="clear-btn" onclick={() => { clearHistory(); sidebarOpen = false; }}>
                Clear Recent
              </button>
            {/if}
            <button class="refresh-btn" onclick={() => { fetchMedia(); sidebarOpen = false; }}>
              Refresh
            </button>
            <button class="layout-toggle" onclick={toggleLayout}>
              <Icon name="desktop" size={16} />
              <span>PC Mode</span>
            </button>
          </div>
        </div>
      </div>
    {/if}
  {:else}
    <aside class="sidebar">
      <div class="logo">
        <Icon name="logo" size={22} />
        <span class="logo-text">MSP</span>
      </div>

      <nav class="side-nav" aria-label="Library categories">
        {#each TABS as tab}
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
        {#if activeTab === 'history'}
          <button class="clear-btn" onclick={clearHistory}>
            Clear Recent
          </button>
        {/if}
        <button class="refresh-btn" onclick={fetchMedia}>
          Refresh
        </button>
        <button class="layout-toggle" onclick={toggleLayout} title={isMobile ? 'Switch to PC mode' : 'Switch to Mobile mode'}>
          <Icon name="smartphone" size={16} />
          <span>Mobile Mode</span>
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
        <div class="header-actions">
          <button class="theme-toggle" onclick={toggleTheme} aria-label="Toggle theme" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
          <div class="header-meta">
            {filteredItems.length} items
          </div>
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

  {#if imageViewerOpen}
    <ImageViewer
      items={imageItems}
      currentIndex={imageIndex}
      onClose={() => imageViewerOpen = false}
      onNavigate={(idx) => imageIndex = idx}
    />
  {/if}

  {#if pinModalOpen}
    <PinModal
      onSubmit={handlePinSubmit}
      error={pinError}
    />
  {/if}
</main>

<style>
  .app-container {
    display: flex;
    height: 100vh;
    width: 100vw;
    background: var(--app-bg);
    color: var(--text-primary);
    overflow: hidden;
    transition: background 0.3s ease;
  }

  /* ===== Desktop Sidebar ===== */
  .sidebar {
    width: 220px;
    background: var(--sidebar-bg);
    border-right: 1px solid var(--sidebar-border);
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
    background: var(--btn-bg);
    color: var(--text-primary);
  }

  .side-nav button.active {
    background: var(--accent-color);
    color: white;
  }

  .sidebar-footer {
    margin-top: auto;
    padding-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .refresh-btn {
    width: 100%;
    background: var(--btn-bg);
    color: var(--text-secondary);
    border: 1px solid var(--btn-border);
    padding: 10px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 0.85rem;
  }

  .refresh-btn:hover {
    background: var(--btn-bg-hover);
    color: var(--text-primary);
  }

  .layout-toggle {
    width: 100%;
    background: var(--btn-bg);
    color: var(--text-secondary);
    border: 1px solid var(--btn-border);
    padding: 10px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .layout-toggle:hover {
    background: var(--btn-bg-hover);
    color: var(--text-primary);
  }

  .clear-btn {
    width: 100%;
    background: transparent;
    color: var(--text-dim);
    border: 1px solid var(--btn-border);
    padding: 10px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 0.85rem;
  }

  .clear-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    color: var(--error-color);
    border-color: rgba(239, 68, 68, 0.2);
  }

  /* ===== Mobile Header ===== */
  .mobile-header {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 52px;
    background: var(--header-bg);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--sidebar-border);
    z-index: var(--z-header);
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
    background: var(--btn-bg-hover);
    color: var(--text-primary);
  }

  .mobile-search {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 8px;
    padding: 0 10px;
    height: 34px;
    color: var(--input-placeholder);
  }

  .mobile-search input {
    background: none;
    border: none;
    color: var(--text-primary);
    width: 100%;
    outline: none;
    font-size: 0.85rem;
  }

  /* ===== Mobile Drawer ===== */
  .drawer-overlay {
    position: fixed;
    inset: 0;
    background: var(--overlay-bg);
    z-index: var(--z-drawer);
    display: flex;
  }

  .mobile-drawer {
    width: 260px;
    height: 100%;
    background: var(--drawer-bg);
    border-right: 1px solid var(--sidebar-border);
    display: flex;
    flex-direction: column;
    padding: 20px 16px;
    animation: slideIn 0.2s ease;
  }

  @keyframes slideIn {
    from { transform: translateX(-100%); }
    to   { transform: translateX(0); }
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    padding: 0 8px;
    color: var(--accent-color);
  }

  .drawer-header-brand {
    display: flex;
    align-items: center;
    gap: 10px;
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
    display: flex;
    flex-direction: column;
    gap: 8px;
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
    border-bottom: 1px solid var(--sidebar-border);
    flex-shrink: 0;
  }

  .search-box {
    background: var(--input-bg);
    padding: 0 14px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 320px;
    max-width: 100%;
    height: 38px;
    border: 1px solid var(--input-border);
    transition: border-color 0.2s ease;
  }

  .search-box:focus-within {
    border-color: var(--accent-color);
  }

  .search-box input {
    background: none;
    border: none;
    color: var(--text-primary);
    width: 100%;
    outline: none;
    font-size: 0.9rem;
  }

  .search-icon {
    color: var(--input-placeholder);
    flex-shrink: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .theme-toggle {
    background: none;
    border: none;
    color: var(--text-secondary);
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .theme-toggle:hover {
    background: var(--btn-bg-hover);
    color: var(--text-primary);
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
    border: 2px solid var(--btn-border);
    border-top-color: var(--accent-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* ===== Responsive ===== */
  @media (max-width: 640px) {
    .app-container {
      flex-direction: column;
    }

    .mobile-header {
      display: flex;
    }

    .main-content {
      margin-top: 52px;
      height: calc(100vh - 52px);
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

  .app-container.force-mobile {
    flex-direction: column;
  }

  .app-container.force-mobile .mobile-header {
    display: flex;
  }

  .app-container.force-mobile .main-content {
    margin-top: 52px;
    height: calc(100vh - 52px);
  }

  .app-container.force-mobile .search-header {
    display: none;
  }

  .app-container.force-mobile .scroll-area {
    padding: 12px;
  }

  .app-container.force-mobile .media-grid {
    gap: 10px;
  }

  .app-container.force-desktop .mobile-header {
    display: none !important;
  }

  .app-container.force-desktop .main-content {
    margin-top: 0 !important;
    height: auto !important;
  }

  .app-container.force-desktop .search-header {
    display: flex !important;
  }

  .app-container.force-desktop .scroll-area {
    padding: 24px !important;
  }

  .app-container.force-desktop .media-grid {
    gap: 20px !important;
  }
</style>
