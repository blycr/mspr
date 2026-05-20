<script lang="ts">
  import { ICON_PATHS, type IconName } from '../lib/icons.js';

  interface Props {
    name: IconName;
    size?: number;
  }

  let { name, size = 20 }: Props = $props();

  const path = $derived(ICON_PATHS[name] ?? '');
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <path d={path} />
</svg>
