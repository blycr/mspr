import path from 'path';
import { configManager } from '../config/manager.js';

/**
 * Resolves a media item's absolute filesystem path by looking up its share.
 * Returns `null` if the share is not found or the item is invalid.
 * Also validates that the resolved path stays within the share root.
 */
export function resolveMediaPath(item: { shareLabel: string; relPath: string }): string | null {
  const config = configManager.get();
  const share = config.shares.find(s => s.label === item.shareLabel);
  if (!share) return null;

  const fullPath = path.resolve(path.join(share.path, item.relPath));
  const shareRoot = path.resolve(share.path);

  // Path sandbox validation
  if (!fullPath.startsWith(shareRoot)) {
    console.warn(`[Security] Path traversal blocked: ${fullPath}`);
    return null;
  }

  return fullPath;
}
