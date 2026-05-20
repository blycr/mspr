import { SRT_TIME_REGEX } from '@mspr/shared';

const ASS_HEADER = '[Events]';
const ASS_DIALOGUE_PREFIX = 'Dialogue:';
const ASS_TAG_REGEX = /\{.*?\}/g;
const ASS_MIN_PARTS = 10;
const ASS_TEXT_INDEX = 9;
const ASS_START_INDEX = 1;
const ASS_END_INDEX = 2;
const VTT_TIME_SEPARATOR = ' --> ';
const WEBVTT_HEADER = 'WEBVTT';

function formatASSTime(assTime: string): string {
  const [h, m, s_cs] = assTime.split(':');
  const [s, cs] = s_cs.split('.');
  return `${h.padStart(2, '0')}:${m}:${s}.${cs.padEnd(3, '0')}`;
}

function convertASS(content: string): string {
  const lines = content.split('\n');
  const dialogueLines = lines.filter(l => l.startsWith(ASS_DIALOGUE_PREFIX));
  let vtt = `${WEBVTT_HEADER}\n\n`;

  dialogueLines.forEach((line, index) => {
    const parts = line.split(',');
    if (parts.length >= ASS_MIN_PARTS) {
      const start = formatASSTime(parts[ASS_START_INDEX]);
      const end = formatASSTime(parts[ASS_END_INDEX]);
      const text = parts.slice(ASS_TEXT_INDEX).join(',').replace(ASS_TAG_REGEX, '');
      vtt += `${index + 1}\n${start}${VTT_TIME_SEPARATOR}${end}\n${text}\n\n`;
    }
  });

  return vtt;
}

function convertSRT(content: string): string {
  let vtt = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  vtt = vtt.replace(SRT_TIME_REGEX, '$1.$2');
  return `${WEBVTT_HEADER}\n\n${vtt}`;
}

export class SubtitleConverter {
  public static toVTT(content: string): string {
    if (content.includes(ASS_HEADER)) {
      return convertASS(content);
    }
    return convertSRT(content);
  }
}
