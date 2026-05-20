import path from 'path';
import { CONTENT_TYPE_MAP, DEFAULT_CONTENT_TYPE } from '@mspr/shared';

export class DirectStreamer {
  public stream(filePath: string, range?: string): Response {
    const file = Bun.file(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const contentType = CONTENT_TYPE_MAP[ext] || DEFAULT_CONTENT_TYPE;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : file.size - 1;
      const chunkSize = end - start + 1;

      return new Response(file.slice(start, end + 1), {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${file.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
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
}

export const directStreamer = new DirectStreamer();
