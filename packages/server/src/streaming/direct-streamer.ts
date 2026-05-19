import fs from 'fs';
import path from 'path';

export class DirectStreamer {
  public stream(filePath: string, range?: string): Response {
    const file = Bun.file(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const contentType = this.getContentType(ext);

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : file.size - 1;
      const chunksize = (end - start) + 1;

      return new Response(file.slice(start, end + 1), {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${file.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': contentType,
        },
      });
    }

    return new Response(file, {
      headers: {
        'Content-Type': contentType,
      },
    });
  }

  private getContentType(ext: string): string {
    const map: Record<string, string> = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mkv': 'video/x-matroska',
      'mp3': 'audio/mpeg',
      'flac': 'audio/flac',
      'wav': 'audio/wav',
      'aac': 'audio/aac',
      'ogg': 'audio/ogg',
      'm4a': 'audio/mp4',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
    };
    return map[ext] || 'application/octet-stream';
  }
}

export const directStreamer = new DirectStreamer();
