import path from 'path';
import { configManager } from '../config/manager.js';

/**
 * Resolves a media item's absolute filesystem path by looking up its share.
 * Returns `null` if the share is not found or the item is invalid.
 */
export function resolveMediaPath(item: { shareLabel: string; relPath: string }): string | null {
  const config = configManager.get();
  const share = config.shares.find(s => s.label === item.shareLabel);
  if (!share) return null;
  return path.join(share.path, item.relPath);
}
