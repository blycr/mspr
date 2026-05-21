import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import path from 'path';
import os from 'os';
import { configManager } from './config/manager.js';
import { mediaRoutes } from './routes/media.js';
import { personalRoutes } from './routes/personal.js';
import { hwAccelDetector } from './streaming/hw-accel-detector.js';
import { scannerEngine } from './scanner/engine.js';
import { LOG_PREFIX, ANSI_CODES, NETWORK_FILTER } from './constants/index.js';

function getLanIPs(): string[] {
  const results: string[] = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (!addrs || NETWORK_FILTER.VIRTUAL.test(name)) continue;
    for (const a of addrs) {
      if (
        a.family === 'IPv4' &&
        !a.internal &&
        !NETWORK_FILTER.LINK_LOCAL.test(a.address) &&
        !NETWORK_FILTER.BENCHMARK.test(a.address)
      ) {
        results.push(a.address);
      }
    }
  }
  return results;
}

// Background initialization
(async () => {
  await hwAccelDetector.detect();
  await scannerEngine.scanAll();
})();

const app = new Elysia()
  .use(cors())
  .get('/ping', () => 'pong')
  .use(mediaRoutes)
  .use(personalRoutes);

// Serve client static files in production (when dist exists)
const distDir = path.resolve(import.meta.dir, '../../client/dist');
const distIndex = path.join(distDir, 'index.html');

if (Bun.file(distIndex).size > 0) {
  console.log(`${LOG_PREFIX.SERVER} Serving client static files from ${distDir}`);

  app.get('/', () => Bun.file(distIndex));

  app.get('/assets/*', ({ params }) => {
    const filePath = path.join(distDir, 'assets', params['*']);
    // Path traversal guard
    if (!filePath.startsWith(path.join(distDir, 'assets'))) {
      return new Response('Forbidden', { status: 403 });
    }
    return Bun.file(filePath);
  });

  // SPA fallback: serve actual static files if they exist, otherwise index.html
  app.get('*', ({ request }) => {
    const url = new URL(request.url);
    const filePath = path.join(distDir, url.pathname);
    // Path traversal guard
    if (!filePath.startsWith(distDir)) {
      return new Response('Forbidden', { status: 403 });
    }
    const file = Bun.file(filePath);
    if (file.size > 0) {
      return file;
    }
    return Bun.file(distIndex);
  });
}

app.listen(configManager.get().port);

const port = app.server?.port;
const lanIps = getLanIPs();
const { BOLD, CYAN, GREEN, RESET } = ANSI_CODES;

console.log(`${LOG_PREFIX.SERVER} Local  http://localhost:${port}${RESET}`);
if (lanIps.length > 0) {
  for (const ip of lanIps) {
    console.log(`${LOG_PREFIX.SERVER} LAN    ${BOLD}${GREEN}http://${ip}:${port}${RESET}`);
  }
}

export type App = typeof app;
