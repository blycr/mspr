import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'os';

const PID_FILE = path.join(import.meta.dir, '.pids');
const serverDir = path.resolve(import.meta.dir, '../packages/server');
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

// Clean up previous builds and lingering processes first
await import('./cleanup.mjs');

console.log('[Start] Building...');
const build = spawn('bun', ['run', 'build'], { stdio: 'inherit' });
await new Promise((resolve) => build.on('exit', resolve));

if (build.exitCode !== 0) {
  console.error('[Start] Build failed.');
  process.exit(1);
}

console.log('[Start] Starting server...');
const server = spawn('bun', ['src/index.ts'], {
  stdio: 'inherit',
  cwd: serverDir,
});

fs.writeFileSync(PID_FILE, JSON.stringify([server.pid]));

// Print a bold reminder after things settle
setTimeout(() => {
  console.log(`\n${YELLOW}>>>${RESET} ${B}Open${RESET}   ${CYAN}http://localhost:3000${RESET}`);
  if (lanIps.length > 0) {
    console.log(`${YELLOW}>>>${RESET} ${B}LAN ${RESET}   ${GREEN}http://${lanIps[0]}:3000${RESET}`);
  }
  console.log(`${YELLOW}<<<${RESET}\n`);
}, 2000);

function cleanup(signal) {
  console.log(`\n[Start] Received ${signal}, shutting down...`);
  try { fs.unlinkSync(PID_FILE); } catch {}

  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    } catch {
      server.kill('SIGTERM');
    }
  } else {
    server.kill('SIGTERM');
  }

  setTimeout(() => {
    server.kill('SIGKILL');
    process.exit(0);
  }, 3000);
}

process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));
server.on('exit', () => {
  try { fs.unlinkSync(PID_FILE); } catch {}
});
