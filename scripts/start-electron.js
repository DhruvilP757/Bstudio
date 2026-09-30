#!/usr/bin/env node
/**
 * scripts/start-electron.js
 * Waits for Vite dev server (port 5173) then launches Electron.
 * Used by "dev:electron" npm script to avoid PowerShell && quoting issues.
 */
const { spawn } = require('child_process');
const net = require('net');

const PORT = 5173;
const HOST = '127.0.0.1';
const POLL_MS = 500;
const MAX_WAIT_MS = 60_000;

function probe() {
  return new Promise((resolve) => {
    const sock = net.createConnection({ port: PORT, host: HOST });
    sock.on('connect', () => { sock.destroy(); resolve(true); });
    sock.on('error', () => { sock.destroy(); resolve(false); });
  });
}

async function waitForPort() {
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    if (await probe()) return;
    await new Promise(r => setTimeout(r, POLL_MS));
  }
  console.error(`[start-electron] Timed out waiting for http://localhost:${PORT}`);
  process.exit(1);
}

(async () => {
  console.log(`[start-electron] Waiting for Vite on ${HOST}:${PORT}...`);
  await waitForPort();
  console.log('[start-electron] Vite is up. Starting Electron...');

  const electronBin = require('electron');
  const child = spawn(String(electronBin), ['.', '--remote-debugging-port=9222'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });

  child.on('close', (code) => process.exit(code ?? 0));
})();
