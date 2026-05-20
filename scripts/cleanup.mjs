import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ALLOWED_NAMES = /bun|node|vite/i;
const PID_FILE = path.join(import.meta.dir, '.pids');

function log(msg) {
  console.log(`[Cleanup] ${msg}`);
}

function cleanDist() {
  const distDir = path.resolve(import.meta.dir, '../packages/client/dist');
  if (fs.existsSync(distDir)) {
    log(`Removing ${distDir}`);
    fs.rmSync(distDir, { recursive: true, force: true });
  }
}

function getPidsFromNetstat(port) {
  try {
    const output = execSync('netstat -ano', {
      encoding: 'utf-8',
      windowsHide: true,
    });
    const pids = new Set();
    for (const line of output.trim().split('\n')) {
      if (line.includes(`:${port}`) && line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(Number(pid)) && Number(pid) > 100) {
          pids.add(Number(pid));
        }
      }
    }
    return Array.from(pids);
  } catch {
    return [];
  }
}

function getProcessName(pid) {
  try {
    const output = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
      encoding: 'utf-8',
      windowsHide: true,
    });
    const lines = output.trim().split('\n').filter(l => l);
    if (lines.length === 0) return null;
    const match = lines[0].match(/^"([^"]+)"/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function killPid(pid) {
  try {
    const name = getProcessName(pid);
    if (!name) {
      log(`PID ${pid} already gone`);
      return true;
    }
    if (!ALLOWED_NAMES.test(name)) {
      log(`Skipping ${name} (PID ${pid}) — not a bun/node/vite process`);
      return false;
    }
    log(`Killing ${name} (PID ${pid})`);
    execSync(`taskkill /PID ${pid} /F`, { windowsHide: true });
    return true;
  } catch (e) {
    log(`Failed to kill PID ${pid}: ${e.message}`);
    return false;
  }
}

function killByPort(port) {
  const pids = getPidsFromNetstat(port);
  if (pids.length === 0) return;
  for (const pid of pids) {
    killPid(pid);
  }
}

function killByPidsFile() {
  if (!fs.existsSync(PID_FILE)) return;
  try {
    const pids = JSON.parse(fs.readFileSync(PID_FILE, 'utf-8'));
    if (Array.isArray(pids)) {
      for (const pid of pids) {
        killPid(pid);
      }
    }
    fs.unlinkSync(PID_FILE);
  } catch (e) {
    log(`Failed to read PID file: ${e.message}`);
    try { fs.unlinkSync(PID_FILE); } catch {}
  }
}

// Main
log('Starting...');
cleanDist();
killByPidsFile();
killByPort(3000);
killByPort(5173);
killByPort(5174);
log('Done.');
