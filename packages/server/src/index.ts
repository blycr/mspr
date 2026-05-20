import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import path from 'path';
import os from 'os';
import { configManager } from './config/manager.js';
import { mediaRoutes } from './routes/media.js';
import { personalRoutes } from './routes/personal.js';
import { hwAccelDetector } from './streaming/hw-accel-detector.js';
import { scannerEngine } from './scanner/engine.js';

function getLanIps(): string[] {
  const virtual = /virtual|vmware|vethernet|tap|wsl|loopback|hyper-v|gameviewer|mihomo|clash|v2ray|shadowsocks|sing-box|proxifier/i;
  const linkLocal = /^169\.254\./;
  const benchmarkNet = /^198\.1[89]\./;
  const results: string[] = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (!addrs || virtual.test(name)) continue;
    for (const a of addrs) {
      if (a.family === 'IPv4' && !a.internal && !linkLocal.test(a.address) && !benchmarkNet.test(a.address)) {
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
  console.log(`[Server] Serving client static files from ${distDir}`);

  app.get('/', () => Bun.file(distIndex));

  app.get('/assets/*', ({ params }) => {
    const filePath = path.join(distDir, 'assets', params['*']);
    // Path traversal guard
    if (!filePath.startsWith(path.join(distDir, 'assets'))) {
      return new Response('Forbidden', { status: 403 });
    }
    return Bun.file(filePath);
  });

  // SPA fallback: unmatched routes serve index.html
  app.get('*', () => Bun.file(distIndex));
}

app.listen(configManager.get().port);

const port = app.server?.port;
const lanIps = getLanIps();
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

console.log(`[Server] Local  http://localhost:${port}${RESET}`);
if (lanIps.length > 0) {
  for (const ip of lanIps) {
    console.log(`[Server] LAN    ${BOLD}${GREEN}http://${ip}:${port}${RESET}`);
  }
}

export type App = typeof app;
