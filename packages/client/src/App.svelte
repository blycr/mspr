<script lang="ts">
  import { onMount } from 'svelte';
  import type { MediaItem } from '@mspr/shared';
  import VideoPlayer from './components/player/VideoPlayer.svelte';
  import './styles/tokens.css';

  let items = $state<MediaItem[]>([]);
  let history = $state<MediaItem[]>([]);
  let loading = $state(true);
  let selectedItem = $state<MediaItem | null>(null);
  let searchQuery = $state('');
  let activeTab = $state<'all' | 'video' | 'audio' | 'history'>('all');
  let displayLimit = $state(100);

  // Reset limit on tab or search change
  $effect(() => {
    activeTab; searchQuery;
    displayLimit = 100;
  });

  const filteredItems = $derived.by(() => {
    let base = activeTab === 'history' ? history : items;
    if (activeTab === 'video') base = items.filter(i => i.kind === 'video');
    if (activeTab === 'audio') base = items.filter(i => i.kind === 'audio');
    
    if (!searchQuery) return base;
    return base.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  async function fetchMedia() {
    try {
      loading = true;
      const [mediaRes, historyRes] = await Promise.all([
        fetch('http://localhost:3000/media'),
        fetch('http://localhost:3000/personal/history')
      ]);
      items = await mediaRes.json();
      history = await historyRes.json();
    } catch (e) {
      console.error('Failed to fetch media:', e);
    } finally {
      loading = false;
    }
  }

  onMount(fetchMedia);

  function formatSize(bytes: number) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let val = bytes;
    let unitIndex = 0;
    while (val > 1024 && unitIndex < units.length - 1) {
      val /= 1024;
      unitIndex++;
    }
    return `${val.toFixed(1)} ${units[unitIndex]}`;
  }

  function handleCardClick(item: MediaItem) {
    if (item.kind === 'video' || item.kind === 'audio') {
      selectedItem = item;
    }
  }
</script>

<main class="app-container">
  <aside class="sidebar">
    <div class="logo">
      <span class="logo-icon">▲</span>
      <h2>MSP</h2>
    </div>
    
    <nav class="side-nav">
      <button class:active={activeTab === 'all'} onclick={() => activeTab = 'all'}>
        <span class="icon">📁</span> All Library
      </button>
      <button class:active={activeTab === 'video'} onclick={() => activeTab = 'video'}>
        <span class="icon">🎬</span> Videos
      </button>
      <button class:active={activeTab === 'audio'} onclick={() => activeTab = 'audio'}>
        <span class="icon">🎵</span> Music
      </button>
      <button class:active={activeTab === 'history'} onclick={() => activeTab = 'history'}>
        <span class="icon">🕒</span> Recent
      </button>
    </nav>

    <div class="sidebar-footer">
      <button class="refresh-btn" onclick={fetchMedia}>Refresh Library</button>
    </div>
  </aside>

  <div class="main-content">
    <header class="search-header">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          placeholder="Search your media..." 
          bind:value={searchQuery}
        />
      </div>
      <div class="user-info">
        <span class="status-dot"></span> Local Server
      </div>
    </header>

    <section class="scroll-area">
      <div class="view-header">
        <h3>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
        <span class="count">{filteredItems.length} items</span>
      </div>

      {#if loading}
        <div class="status-view">
          <div class="spinner"></div>
          <p>Analyzing your library...</p>
        </div>
      {:else if filteredItems.length === 0}
        <div class="status-view">
          <p>No media matches your search.</p>
        </div>
      {:else}
        <div class="media-grid">
          {#each filteredItems.slice(0, displayLimit) as item}
            <div class="media-card" onclick={() => handleCardClick(item)} role="button" tabindex="0">
              <div class="card-preview">
                {#if item.kind === 'video'}
                  <img src="http://localhost:3000/media/thumbnail?id={item.id}" alt={item.name} loading="lazy" />
                  <div class="play-overlay">▶</div>
                {:else}
                  <div class="card-icon">{item.kind === 'audio' ? '🎵' : '🖼️'}</div>
                {/if}
              </div>
              <div class="card-info">
                <div class="name" title={item.name}>{item.name}</div>
                <div class="meta">{item.ext.toUpperCase()} • {formatSize(item.size)}</div>
              </div>
            </div>
          {/each}
        </div>
        
        {#if displayLimit < filteredItems.length}
          <div class="pagination">
            <button class="load-more" onclick={() => displayLimit += 100}>
              Load More ({filteredItems.length - displayLimit} remaining)
            </button>
          </div>
        {/if}
      {/if}

    </section>
  </div>

  {#if selectedItem}
    <VideoPlayer item={selectedItem} onClose={() => { selectedItem = null; fetchMedia(); }} />
  {/if}
</main>

<style>
  .app-container {
    display: flex;
    height: 100vh;
    width: 100vw;
    background: var(--bg-color);
    overflow: hidden;
  }

  /* Sidebar */
  .sidebar {
    width: 260px;
    background: var(--surface-color);
    border-right: 1px solid var(--glass-border);
    display: flex;
    flex-direction: column;
    padding: var(--gap-lg);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 40px;
  }

  .logo-icon {
    font-size: 1.5rem;
    color: var(--accent-color);
  }

  .logo h2 {
    margin: 0;
    font-size: 1.2rem;
    letter-spacing: 2px;
  }

  .side-nav {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }

  .side-nav button {
    background: none;
    border: none;
    color: var(--text-secondary);
    padding: 12px 16px;
    text-align: left;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 12px;
    transition: var(--transition-smooth);
  }

  .side-nav button:hover, .side-nav button.active {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  .side-nav button.active {
    border-left: 3px solid var(--accent-color);
  }

  /* Main Content */
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, var(--bg-color) 0%, var(--surface-color) 100%);
  }

  .search-header {
    height: 70px;
    padding: 0 var(--gap-lg);
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--glass-border);
  }

  .search-box {
    background: var(--surface-hover);
    padding: 8px 16px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 300px;
  }

  .search-box input {
    background: none;
    border: none;
    color: var(--text-primary);
    width: 100%;
    outline: none;
  }

  .user-info {
    font-size: 0.85rem;
    color: var(--text-dim);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    background: #4ade80;
    border-radius: 50%;
    box-shadow: 0 0 10px #4ade80;
  }

  .scroll-area {
    flex: 1;
    overflow-y: auto;
    padding: var(--gap-lg);
  }

  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: var(--gap-lg);
  }

  .view-header h3 {
    font-size: 1.5rem;
    margin: 0;
  }

  .view-header .count {
    color: var(--text-dim);
    font-size: 0.9rem;
  }

  /* Grid */
  .media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--gap-lg);
  }

  .media-card {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    overflow: hidden;
    transition: var(--transition-smooth);
    cursor: pointer;
  }

  .media-card:hover {
    transform: translateY(-8px);
    border-color: var(--accent-color);
    box-shadow: 0 15px 30px rgba(0,0,0,0.4);
  }

  .card-preview {
    position: relative;
    aspect-ratio: 16 / 9;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .play-overlay {
    position: absolute;
    font-size: 2rem;
    opacity: 0;
    transition: 0.3s;
  }

  .media-card:hover .play-overlay {
    opacity: 1;
  }

  .card-icon { font-size: 3rem; }

  .card-info { padding: var(--gap-md); }

  .name {
    font-weight: 600;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .status-view {
    height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--glass-border);
    border-top-color: var(--accent-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .refresh-btn {
    width: 100%;
    background: var(--accent-color);
    color: white;
    border: none;
    padding: 12px;
    border-radius: var(--radius-sm);
    font-weight: 600;
    cursor: pointer;
  }

  .pagination {
    display: flex;
    justify-content: center;
    padding: 40px 0;
  }

  .load-more {
    background: var(--surface-hover);
    border: 1px solid var(--glass-border);
    color: var(--text-primary);
    padding: 12px 32px;
    border-radius: 30px;
    cursor: pointer;
    font-weight: 600;
    transition: var(--transition-smooth);
  }

  .load-more:hover {
    background: var(--accent-color);
    border-color: var(--accent-color);
  }
</style>
