export class SubtitleConverter {
  /**
   * Converts SRT or simple ASS content to WebVTT
   */
  public static toVTT(content: string): string {
    // 1. Convert line endings
    let vtt = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 2. Add WEBVTT header
    vtt = 'WEBVTT\n\n' + vtt;

    // 3. Fix time format (00:00:00,000 -> 00:00:00.000)
    vtt = vtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

    // 4. Basic ASS removal (if input is ASS)
    if (content.includes('[Events]')) {
      const lines = content.split('\n');
      const dialogueLines = lines.filter(l => l.startsWith('Dialogue:'));
      vtt = 'WEBVTT\n\n';
      
      dialogueLines.forEach((line, index) => {
        const parts = line.split(',');
        if (parts.length >= 10) {
          const start = parts[1].replace('.', ':') + '.000'; // ASS is usually 0:00:00.00
          const end = parts[2].replace('.', ':') + '.000';
          const text = parts.slice(9).join(',').replace(/\{.*?\}/g, ''); // Strip ASS tags
          vtt += `${index + 1}\n${this.formatASSTime(parts[1])} --> ${this.formatASSTime(parts[2])}\n${text}\n\n`;
        }
      });
    }

    return vtt;
  }

  private static formatASSTime(assTime: string): string {
    // ASS: H:MM:SS.cs -> VTT: HH:MM:SS.mmm
    const [h, m, s_cs] = assTime.split(':');
    const [s, cs] = s_cs.split('.');
    return `${h.padStart(2, '0')}:${m}:${s}.${cs.padEnd(3, '0')}`;
  }
}
