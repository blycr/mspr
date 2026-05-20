const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];
const BYTES_PER_KB = 1024;

export function formatSize(bytes: number): string {
  let val = bytes;
  let unitIndex = 0;
  while (val > BYTES_PER_KB && unitIndex < BYTE_UNITS.length - 1) {
    val /= BYTES_PER_KB;
    unitIndex++;
  }
  return `${val.toFixed(1)} ${BYTE_UNITS[unitIndex]}`;
}

const SECONDS_PER_MINUTE = 60;
const PAD_LENGTH = 2;
const PAD_CHAR = '0';

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / SECONDS_PER_MINUTE);
  const s = Math.floor(seconds % SECONDS_PER_MINUTE);
  return `${m}:${s.toString().padStart(PAD_LENGTH, PAD_CHAR)}`;
}
