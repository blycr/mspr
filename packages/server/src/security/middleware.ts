import { Elysia } from 'elysia';
import { configManager } from '../config/manager.js';

const STATIC_EXTS = new Set([
  '.html', '.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.ico', '.json', '.map'
]);

function isStaticRequest(path: string, acceptHeader: string | null): boolean {
  // Root path (homepage)
  if (path === '/') return true;

  // Check file extension
  const dotIndex = path.lastIndexOf('.');
  if (dotIndex > 0) {
    const ext = path.slice(dotIndex);
    if (STATIC_EXTS.has(ext)) return true;
  }

  // Browser page request (SPA navigation)
  if (acceptHeader?.includes('text/html')) return true;

  return false;
}

export function setupSecurity(app: Elysia) {
  app.onBeforeHandle(({ request, set }) => {
    const config = configManager.get();

    // Get client IP from x-forwarded-for or fallback
    const forwarded = request.headers.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    // 1. IP Filtering
    if (config.security.allowedIps.length > 0) {
      if (!config.security.allowedIps.includes(clientIp)) {
        set.status = 403;
        return new Response(JSON.stringify({ error: 'IP not allowed' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (config.security.blockedIps.includes(clientIp)) {
      set.status = 403;
      return new Response(JSON.stringify({ error: 'IP blocked' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. PIN Check — skip for public endpoints and static assets
    const url = new URL(request.url);
    const path = url.pathname;
    const accept = request.headers.get('accept');

    // Always allow these endpoints
    if (path === '/ping' || path.startsWith('/auth/')) {
      return;
    }

    // Skip PIN check for static files and SPA page requests
    if (isStaticRequest(path, accept)) {
      return;
    }

    // Check PIN from header or query param (for media streams)
    const pin = request.headers.get('X-MSP-PIN') || url.searchParams.get('pin');
    if (config.security.pin && config.security.pin.length > 0) {
      if (!pin || pin !== config.security.pin) {
        set.status = 401;
        return new Response(JSON.stringify({ error: 'Unauthorized: invalid or missing PIN' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  });
}
