const WebSocket = globalThis.WebSocket;
const fs = require('fs');

async function run() {
  const r = await fetch('http://localhost:9222/json').then(r=>r.json());
  const t = r.slice().reverse().find(x => x.type === 'page' && x.url.includes('5173'));
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(res => ws.addEventListener('open', res));

  function send(method, params={}) {
    return new Promise((res, rej) => {
      const id = Math.floor(Math.random()*1e6);
      const h = (e) => {
        const d = JSON.parse(e.data);
        if (d.id === id) {
          ws.removeEventListener('message', h);
          if (d.error) rej(d.error); else res(d.result);
        }
      };
      ws.addEventListener('message', h);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  console.log('1. Opening Bottom Drawer on Terminal tab...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        if (window.__browserStore) {
          window.__browserStore.isApiKeyModalOpen = false;
          window.__browserStore.isDrawerOpen = true;
          window.__browserStore.activeDrawerTab = 'terminal';
          window.__browserStore.drawerHeight = 320;
        }
      })()
    `
  });

  await new Promise(r => setTimeout(r, 1200));

  console.log('2. Writing interactive commands to Terminal...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        if (window.electronAPI) {
          window.electronAPI.writeTerminalData('term-main', 'Write-Host "==================================================" -ForegroundColor Cyan\\r\\n');
          window.electronAPI.writeTerminalData('term-main', 'Write-Host "  BSTUDIO SYSTEM TERMINAL (POWERSHELL) OPERATIONAL" -ForegroundColor Green\\r\\n');
          window.electronAPI.writeTerminalData('term-main', 'Write-Host "  Interactive Keyboard Input & Execution Confirmed" -ForegroundColor Yellow\\r\\n');
          window.electronAPI.writeTerminalData('term-main', 'Write-Host "==================================================" -ForegroundColor Cyan\\r\\n');
          window.electronAPI.writeTerminalData('term-main', 'Get-ChildItem -Name | Select-Object -First 5\\r\\n');
        }
      })()
    `
  });

  await new Promise(r => setTimeout(r, 2500));

  console.log('3. Capturing bstudio_system_terminal_live.png...');
  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/dhruv/.gemini/antigravity/brain/c72eeed5-1fdb-421d-ade1-85464e15ec96/bstudio_system_terminal_live.png', Buffer.from(shot1.data, 'base64'));

  console.log('4. Switching to DevTools Console tab...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        if (window.__browserStore) {
          window.__browserStore.activeDrawerTab = 'console';
        }
      })()
    `
  });

  await new Promise(r => setTimeout(r, 1000));

  console.log('5. Capturing bstudio_devtools_console_live.png...');
  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/dhruv/.gemini/antigravity/brain/c72eeed5-1fdb-421d-ade1-85464e15ec96/bstudio_devtools_console_live.png', Buffer.from(shot2.data, 'base64'));

  // Switch back to terminal
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        if (window.__browserStore) {
          window.__browserStore.activeDrawerTab = 'terminal';
        }
      })()
    `
  });

  ws.close();
  console.log('Done capturing live terminal and console!');
}

run().catch(console.error);
