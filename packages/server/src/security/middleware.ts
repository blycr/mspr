import { Elysia } from 'elysia';
import { configManager } from '../config/manager.js';

export const securityMiddleware = (app: Elysia) => {
  return app.derive(({ request, set }) => {
    const config = configManager.get();
    const clientIp = app.server?.hostname || '127.0.0.1'; // Simple IP detection

    // 1. IP Filtering
    if (config.security.allowedIps.length > 0) {
      if (!config.security.allowedIps.includes(clientIp)) {
        set.status = 403;
        return { error: 'IP not allowed' };
      }
    }

    if (config.security.blockedIps.includes(clientIp)) {
      set.status = 403;
      return { error: 'IP blocked' };
    }

    // 2. PIN Check (Simplified for Phase 3)
    // In a real app, this would check a session cookie/header
    const pin = request.headers.get('X-MSP-PIN');
    if (config.security.pin && pin !== config.security.pin) {
      // We don't block all routes, just sensitive ones or if pin is set
      // This is a placeholder for the logic
    }

    return { clientIp };
  });
};
