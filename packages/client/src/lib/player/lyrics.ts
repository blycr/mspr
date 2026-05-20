export interface LyricLine {
  time: number;
  text: string;
}

const LRC_TIME_REGEX = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
const MS_PAD_LENGTH = 3;
const MS_SLICE_END = 3;

export function parseLRC(content: string): LyricLine[] {
  const lines = content.split('\n');
  const result: LyricLine[] = [];

  for (const line of lines) {
    const text = line.replace(LRC_TIME_REGEX, '').trim();
    if (!text) continue;

    let match: RegExpExecArray | null;
    LRC_TIME_REGEX.lastIndex = 0;
    while ((match = LRC_TIME_REGEX.exec(line)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = parseInt(match[3].padEnd(MS_PAD_LENGTH, '0').slice(0, MS_SLICE_END), 10);
      const time = minutes * 60 + seconds + ms / 1000;
      result.push({ time, text });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}
