import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { configManager } from './config/manager.js';
import { mediaRoutes } from './routes/media.js';
import { personalRoutes } from './routes/personal.js';
import { hwAccelDetector } from './streaming/hw-accel-detector.js';

import { scannerEngine } from './scanner/engine.js';

// Background initialization
(async () => {
  await hwAccelDetector.detect();
  await scannerEngine.scanAll();
})();

const app = new Elysia()
  .use(cors())
  .get('/ping', () => 'pong')
  .use(mediaRoutes)
  .use(personalRoutes)
  .listen(configManager.get().port);

console.log(`🚀 MSP Server running at http://localhost:${app.server?.port}`);

export type App = typeof app;

