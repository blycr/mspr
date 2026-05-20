import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'os';

const PID_FILE = path.join(import.meta.dir, '.pids');
const B = '\x1b[1m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function getLanIps() {
  const virtual = /virtual|vmware|vethernet|tap|wsl|loopback|hyper-v|gameviewer/i;
  const linkLocal = /^169\.254\./;
  const results = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (!addrs || virtual.test(name)) continue;
    for (const a of addrs) {
      if (a.family === 'IPv4' && !a.internal && !linkLocal.test(a.address)) {
        results.push(a.address);
      }
    }
  }
  return results;
}

const lanIps = getLanIps();
const lanText = lanIps.length > 0 ? ` (LAN: ${lanIps[0]})` : '';

// Clean up previous builds and lingering processes first
await import('./cleanup.mjs');

console.log('[Dev] Starting server + client...');
console.log(`[Dev] Server  ${B}${CYAN}http://localhost:3000${RESET}${lanText}`);
console.log(`[Dev] Client  ${B}${GREEN}http://localhost:5173${RESET}`);
console.log('[Dev] Press Ctrl+C to stop both\n');

const server = spawn('bun', ['run', 'dev:server'], { stdio: 'inherit' });
const client = spawn('bun', ['run', 'dev:client'], { stdio: 'inherit' });

fs.writeFileSync(PID_FILE, JSON.stringify([server.pid, client.pid]));

let shuttingDown = false;

function cleanup(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[Dev] Received ${signal}, shutting down...`);

  try { fs.unlinkSync(PID_FILE); } catch {}

  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
      spawn('taskkill', ['/pid', String(client.pid), '/T', '/F'], { stdio: 'ignore' });
    } catch {
      server.kill('SIGTERM');
      client.kill('SIGTERM');
    }
  } else {
    server.kill('SIGTERM');
    client.kill('SIGTERM');
  }

  setTimeout(() => {
    server.kill('SIGKILL');
    client.kill('SIGKILL');
    process.exit(0);
  }, 3000);
}

process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));

// Print a bold reminder after things settle
setTimeout(() => {
  console.log(`\n${YELLOW}>>>${RESET} ${B}Server${RESET}  ${CYAN}http://localhost:3000${RESET}`);
  if (lanIps.length > 0) {
    console.log(`${YELLOW}>>>${RESET} ${B}LAN   ${RESET}  ${GREEN}http://${lanIps[0]}:3000${RESET}`);
  }
  console.log(`${YELLOW}>>>${RESET} ${B}Client${RESET}  ${GREEN}http://localhost:5173${RESET}  ${YELLOW}<<<${RESET}\n`);
}, 2000);
