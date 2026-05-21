<script lang="ts">
  import Icon from './Icon.svelte';

  interface Props {
    onSubmit: (pin: string) => void;
    onClose?: () => void;
    error?: string;
  }

  let { onSubmit, onClose, error = '' }: Props = $props();

  let pin = $state('');
  let inputRef = $state<HTMLInputElement | null>(null);

  $effect(() => {
    inputRef?.focus();
  });

  function handleSubmit() {
    if (pin.length > 0) {
      onSubmit(pin);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape' && onClose) {
      onClose();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="pin-overlay" role="dialog" aria-label="PIN authentication" tabindex="-1" onclick={handleBackdropClick}>
  <div class="pin-container" role="presentation" onclick={e => e.stopPropagation()}>
    <div class="pin-header">
      <Icon name="lock" size={20} />
      <h3>Enter PIN</h3>
    </div>

    <p class="pin-hint">This server requires a PIN to access.</p>

    <div class="pin-input-wrap">
      <input
        bind:this={inputRef}
        type="password"
        inputmode="numeric"
        maxlength="8"
        placeholder="••••"
        bind:value={pin}
        onkeydown={handleKeydown}
        aria-label="PIN"
      />
    </div>

    {#if error}
      <p class="pin-error">{error}</p>
    {/if}

    <button class="pin-submit" onclick={handleSubmit} disabled={pin.length === 0}>
      Unlock
    </button>
  </div>
</div>

<style>
  .pin-overlay {
    position: fixed;
    inset: 0;
    background: var(--overlay-bg);
    z-index: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .pin-container {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 16px;
    padding: 28px 24px;
    width: 320px;
    max-width: 90vw;
    display: flex;
    flex-direction: column;
    gap: 16px;
    animation: slideUp 0.25s ease;
  }

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to   { transform: translateY(0); opacity: 1; }
  }

  .pin-header {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--accent-color);
  }

  .pin-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .pin-hint {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-dim);
    line-height: 1.4;
  }

  .pin-input-wrap input {
    width: 100%;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 10px;
    padding: 12px 14px;
    color: var(--text-primary);
    font-size: 1.2rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-align: center;
    outline: none;
    transition: border-color 0.2s ease;
    box-sizing: border-box;
  }

  .pin-input-wrap input:focus {
    border-color: var(--accent-color);
  }

  .pin-input-wrap input::placeholder {
    color: var(--input-placeholder);
    letter-spacing: 0.15em;
  }

  .pin-error {
    margin: 0;
    font-size: 0.8rem;
    color: var(--error-color);
    text-align: center;
  }

  .pin-submit {
    width: 100%;
    background: var(--accent-color);
    color: white;
    border: none;
    border-radius: 10px;
    padding: 12px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pin-submit:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  .pin-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
