import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'os';
import { createLogWriter } from './lib/log.mjs';

const PID_FILE = path.join(import.meta.dir, '.pids');
const LOG_DIR = path.join(import.meta.dir, '../packages/server/data/logs');

const B = '\x1b[1m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

function getLanIPs() {
  const virtual = /virtual|vmware|vethernet|tap|wsl|loopback|hyper-v|gameviewer|mihomo|clash|v2ray|shadowsocks|sing-box|proxifier/i;
  const linkLocal = /^169\.254\./;
  const benchmarkNet = /^198\.1[89]\./;
  const results = [];
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

const lanIps = getLanIPs();
const lanUrl = lanIps.length > 0 ? `  (LAN: ${B}${GREEN}http://${lanIps[0]}:5173${RESET})` : '';

await import('./cleanup.mjs');

const backendUrl = `${CYAN}http://localhost:3000${RESET}`;
const clientUrl = `${GREEN}http://localhost:5173${RESET}`;

console.log(`Backend  ${backendUrl}`);
console.log(`Client   ${clientUrl}${lanUrl}\n`);

const serverLogger = createLogWriter('server', LOG_DIR);
const clientLogger = createLogWriter('client', LOG_DIR);

const server = spawn('bun', ['--watch', 'packages/server/src/index.ts'], { stdio: ['inherit', 'pipe', 'pipe'] });
const client = spawn('bun', ['--cwd', 'packages/client', 'dev'], { stdio: ['inherit', 'pipe', 'pipe'] });

server.stdout.on('data', d => serverLogger.write(d.toString()));
server.stderr.on('data', d => {
  const str = d.toString();
  serverLogger.write(str);
  process.stderr.write(str);
});

client.stdout.on('data', d => clientLogger.write(d.toString()));
client.stderr.on('data', d => {
  const str = d.toString();
  clientLogger.write(str);
  process.stderr.write(str);
});

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
