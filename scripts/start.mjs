import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'os';
import { createLogWriter } from './lib/log.mjs';

const PID_FILE = path.join(import.meta.dir, '.pids');
const LOG_DIR = path.join(import.meta.dir, '../packages/server/data/logs');

const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
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

function getServerPort() {
  try {
    const configPath = path.join(import.meta.dir, '../packages/server/data/config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config.port || 3000;
  } catch {
    return 3000;
  }
}

const lanIps = getLanIPs();
const port = getServerPort();

process.env.MSP_START_QUIET = '1';
await import('./cleanup.mjs');

// Build
process.stdout.write('Building... ');
const build = spawn('bun', ['run', 'build'], { stdio: 'pipe' });
let buildOutput = '';
build.stdout.on('data', d => { buildOutput += d.toString(); });
build.stderr.on('data', d => { buildOutput += d.toString(); });
await new Promise((resolve) => build.on('exit', resolve));

if (build.exitCode !== 0) {
  console.log('\n' + buildOutput);
  console.error('Build failed.');
  process.exit(1);
}
console.log(`${GREEN}done${RESET}`);

// Server
const serverLogger = createLogWriter('server', LOG_DIR);
const server = spawn('bun', ['packages/server/src/index.ts'], { stdio: ['inherit', 'pipe', 'pipe'] });
fs.writeFileSync(PID_FILE, JSON.stringify([server.pid]));

server.stdout.on('data', d => serverLogger.write(d.toString()));
server.stderr.on('data', d => {
  const str = d.toString();
  serverLogger.write(str);
  process.stderr.write(str);
});

server.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\nServer crashed (exit ${code}). Recent logs:\n`);
    console.error(serverLogger.tail(30));
  }
});

console.log(`\n${CYAN}http://localhost:${port}${RESET}`);
if (lanIps.length > 0) {
  console.log(`${CYAN}http://${lanIps[0]}:${port}${RESET}`);
}

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
