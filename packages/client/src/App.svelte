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
  <div class="app-background"></div>
  
  <aside class="sidebar">
    <div class="logo">
      <div class="logo-circle">
        <span class="logo-icon">▲</span>
      </div>
      <h2>MSP</h2>
    </div>
    
    <nav class="side-nav">
      <button class:active={activeTab === 'all'} onclick={() => activeTab = 'all'}>
        <span class="icon">📁</span> <span>All Library</span>
      </button>
      <button class:active={activeTab === 'video'} onclick={() => activeTab = 'video'}>
        <span class="icon">🎬</span> <span>Videos</span>
      </button>
      <button class:active={activeTab === 'audio'} onclick={() => activeTab = 'audio'}>
        <span class="icon">🎵</span> <span>Music</span>
      </button>
      <button class:active={activeTab === 'history'} onclick={() => activeTab = 'history'}>
        <span class="icon">🕒</span> <span>Recent</span>
      </button>
    </nav>

    <div class="sidebar-footer">
      <button class="refresh-btn" onclick={fetchMedia}>
        Sync Library
      </button>
    </div>
  </aside>

  <div class="main-content">
    <header class="search-header">
      <div class="search-box">
        <span class="search-icon">
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        </span>
        <input 
          type="text" 
          placeholder="Search by title, genre, or path..." 
          bind:value={searchQuery}
        />
      </div>
      <div class="user-info">
        <div class="server-status">
          <span class="status-dot pulse"></span>
          <span>Local Node Online</span>
        </div>
      </div>
    </header>

    <section class="scroll-area">
      <div class="view-header">
        <div class="title-group">
          <h3>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
          <p class="subtitle">{filteredItems.length} elements available</p>
        </div>
      </div>

      {#if loading}
        <div class="status-view">
          <div class="loader"></div>
          <p>Indexing your high-fidelity collection...</p>
        </div>
      {:else if filteredItems.length === 0}
        <div class="status-view">
          <p>No matches found in your library.</p>
        </div>
      {:else}
        <div class="media-grid">
          {#each filteredItems.slice(0, displayLimit) as item}
            <div class="media-card" onclick={() => handleCardClick(item)} role="button" tabindex="0">
              <div class="card-preview" class:is-audio={item.kind === 'audio'}>
                {#if item.kind === 'video'}
                  <img src="http://localhost:3000/media/thumbnail?id={item.id}" alt={item.name} loading="lazy" />
                  <div class="play-overlay">
                    <div class="play-btn-circle">▶</div>
                  </div>
                {:else if item.kind === 'audio'}
                  <img src="http://localhost:3000/media/thumbnail?id={item.id}" alt={item.name} class="audio-cover" />
                  <div class="audio-wave">
                    <span></span><span></span><span></span><span></span>
                  </div>
                {:else}
                  <div class="card-icon">📄</div>
                {/if}
              </div>
              <div class="card-info">
                <div class="name" title={item.name}>{item.name}</div>
                <div class="meta">
                  <span class="ext">{item.ext}</span>
                  <span class="dot">·</span>
                  <span>{formatSize(item.size)}</span>
                </div>
              </div>
            </div>
          {/each}
        </div>
        
        {#if displayLimit < filteredItems.length}
          <div class="pagination">
            <button class="load-more" onclick={() => displayLimit += 100}>
              Discover More
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
    background: #050505;
    color: var(--text-primary);
    overflow: hidden;
    position: relative;
  }

  .app-background {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% -20%, #1e1e2e 0%, #050505 80%);
    z-index: 0;
  }

  /* Sidebar */
  .sidebar {
    width: 280px;
    background: rgba(10, 10, 15, 0.4);
    backdrop-filter: blur(40px);
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    padding: 32px;
    z-index: 10;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 48px;
  }

  .logo-circle {
    width: 40px;
    height: 40px;
    background: var(--accent-color);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 16px rgba(139, 92, 246, 0.3);
  }

  .logo-icon {
    font-size: 1.2rem;
    color: white;
  }

  .logo h2 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .side-nav {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
  }

  .side-nav button {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    padding: 14px 18px;
    text-align: left;
    border-radius: 14px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 14px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .side-nav button:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
    transform: translateX(4px);
  }

  .side-nav button.active {
    background: var(--accent-color);
    color: white;
    box-shadow: 0 10px 20px rgba(139, 92, 246, 0.2);
  }

  .sidebar-footer {
    margin-top: auto;
    padding-top: 24px;
  }

  .refresh-btn {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 14px;
    border-radius: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: 0.2s;
  }

  .refresh-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  /* Main Content */
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    z-index: 10;
    position: relative;
  }

  .search-header {
    height: 90px;
    padding: 0 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(5, 5, 5, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  }

  .search-box {
    background: rgba(255, 255, 255, 0.04);
    padding: 0 20px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    gap: 14px;
    width: 440px;
    height: 50px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: 0.3s;
  }

  .search-box:focus-within {
    background: rgba(255, 255, 255, 0.08);
    border-color: var(--accent-color);
    width: 480px;
  }

  .search-box input {
    background: none;
    border: none;
    color: white;
    width: 100%;
    outline: none;
    font-size: 0.95rem;
    font-weight: 500;
  }

  .search-icon { color: rgba(255, 255, 255, 0.3); }

  .user-info {
    font-size: 0.85rem;
    color: var(--text-dim);
  }

  .server-status {
    background: rgba(74, 222, 128, 0.1);
    padding: 8px 16px;
    border-radius: 30px;
    color: #4ade80;
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    background: currentColor;
    border-radius: 50%;
  }

  .pulse { animation: pulse 2s infinite; }
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.4; }
    100% { opacity: 1; }
  }

  .scroll-area {
    flex: 1;
    overflow-y: auto;
    padding: 40px;
  }

  .view-header {
    margin-bottom: 40px;
  }

  .view-header h3 {
    font-size: 2.4rem;
    font-weight: 900;
    margin: 0;
    letter-spacing: -0.04em;
    background: linear-gradient(to bottom, #fff, #888);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .subtitle {
    color: var(--text-dim);
    margin: 8px 0 0;
    font-weight: 600;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  /* Grid */
  .media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 32px;
  }

  .media-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 24px;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    position: relative;
  }

  .media-card:hover {
    transform: translateY(-12px) scale(1.02);
    border-color: var(--accent-color);
    background: rgba(255, 255, 255, 0.07);
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
  }

  .card-preview {
    position: relative;
    aspect-ratio: 16 / 10;
    background: #000;
    overflow: hidden;
  }

  .card-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: 0.6s;
  }

  .media-card:hover .card-preview img {
    transform: scale(1.1);
  }

  .play-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: 0.3s;
  }

  .media-card:hover .play-overlay { opacity: 1; }

  .play-btn-circle {
    width: 60px;
    height: 60px;
    background: var(--accent-color);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.5rem;
    transform: scale(0.8);
    transition: 0.3s;
  }

  .media-card:hover .play-btn-circle { transform: scale(1); }

  .audio-wave {
    position: absolute;
    bottom: 20px;
    left: 20px;
    display: flex;
    gap: 3px;
  }

  .audio-wave span {
    width: 3px;
    height: 15px;
    background: var(--accent-color);
    border-radius: 3px;
    animation: wave 1s infinite ease-in-out;
  }

  .audio-wave span:nth-child(2) { animation-delay: 0.1s; height: 25px; }
  .audio-wave span:nth-child(3) { animation-delay: 0.2s; height: 18px; }
  .audio-wave span:nth-child(4) { animation-delay: 0.3s; height: 22px; }

  @keyframes wave {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(0.5); }
  }

  .card-info { padding: 24px; }

  .name {
    font-weight: 700;
    font-size: 1.1rem;
    margin-bottom: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: -0.02em;
  }

  .meta {
    font-size: 0.85rem;
    color: var(--text-dim);
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }

  .ext {
    text-transform: uppercase;
    color: var(--accent-color);
  }

  .dot { margin: 0 2px; }

  .status-view {
    height: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
  }

  .loader {
    width: 48px;
    height: 48px;
    border: 3px solid rgba(255, 255, 255, 0.05);
    border-top-color: var(--accent-color);
    border-radius: 50%;
    animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    margin-bottom: 32px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .pagination {
    display: flex;
    justify-content: center;
    padding: 60px 0;
  }

  .load-more {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    padding: 16px 48px;
    border-radius: 40px;
    cursor: pointer;
    font-weight: 800;
    font-size: 1rem;
    transition: 0.3s;
  }

  .load-more:hover {
    background: var(--accent-color);
    border-color: var(--accent-color);
    box-shadow: 0 10px 20px rgba(139, 92, 246, 0.2);
    transform: translateY(-2px);
  }
</style>

