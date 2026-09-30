import { BrowserWindow, WebContentsView } from 'electron';
import { CdpCore } from './cdp/cdp-core';
import { ViewportBounds, NavigationState } from '../preload/types';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import { DevicePreset } from '../shared/cdp-types';

export class ViewManager {
  private view: WebContentsView | null = null;
  private currentBounds: ViewportBounds = { x: 0, y: 0, width: 800, height: 600 };
  private isVisible: boolean = true;
  private currentDevice: DevicePreset = 'desktop';

  constructor(private mainWindow: BrowserWindow, private cdpCore: CdpCore) {
    this.createView();
  }

  private getPortalHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Bstudio Web Diagnostics Hub</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #0d0d11;
      color: #e4e4e7;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 24px;
      overflow-x: hidden;
    }
    .container {
      max-width: 680px;
      width: 100%;
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: rgba(118, 185, 0, 0.12);
      border: 1px solid rgba(118, 185, 0, 0.3);
      color: #76b900;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 20px;
    }
    .pulse {
      width: 6px; height: 6px;
      background: #76b900;
      border-radius: 50%;
      box-shadow: 0 0 8px #76b900;
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    h1 {
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.subtitle {
      color: #71717a;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .search-box {
      display: flex;
      align-items: center;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 6px 8px 6px 14px;
      margin-bottom: 28px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }
    .search-box:focus-within {
      border-color: #76b900;
      box-shadow: 0 0 0 2px rgba(118, 185, 0, 0.2);
    }
    .search-box input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #fff;
      font-size: 14px;
      font-family: inherit;
    }
    .search-box button {
      background: #76b900;
      color: #000;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.15s;
    }
    .search-box button:hover { background: #8bd000; }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .card {
      background: #141418;
      border: 1px solid #222228;
      border-radius: 10px;
      padding: 14px;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
      color: inherit;
    }
    .card:hover {
      background: #1c1c22;
      border-color: #3f3f46;
      transform: translateY(-2px);
    }
    .card-title {
      font-size: 13px;
      font-weight: 600;
      color: #f4f4f5;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .card-desc {
      font-size: 11px;
      color: #71717a;
      line-height: 1.4;
    }
    .demo-bar {
      background: #121216;
      border: 1px solid #1f1f24;
      border-radius: 10px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      text-align: left;
    }
    .demo-info {
      font-size: 12px;
      color: #a1a1aa;
    }
    .demo-info strong { color: #fff; display: block; font-size: 13px; margin-bottom: 2px; }
    .test-btn {
      background: #27272a;
      border: 1px solid #3f3f46;
      color: #e4e4e7;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .test-btn:hover { background: #3f3f46; color: #fff; }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">
      <span class="pulse"></span>
      Autonomous CDP Sentinel Active
    </div>
    <h1>Bstudio Diagnostic Viewport</h1>
    <p class="subtitle">Real-time Chromium DevTools Protocol monitoring. Enter any web address or localhost port above, or pick a diagnostic destination below.</p>

    <div class="search-box">
      <input type="text" id="urlInput" placeholder="Enter URL (e.g. google.com, localhost:5173, github.com)..." onkeydown="if(event.key==='Enter') navigate();" />
      <button onclick="navigate()">Explore</button>
    </div>

    <div class="grid">
      <a class="card" onclick="window.location.href='https://www.google.com'">
        <div class="card-title">🔍 Google</div>
        <div class="card-desc">Search docs, libraries, and web resources</div>
      </a>
      <a class="card" onclick="window.location.href='https://www.nvidia.com'">
        <div class="card-title">💚 NVIDIA</div>
        <div class="card-desc">Official accelerated computing hub</div>
      </a>
      <a class="card" onclick="window.location.href='https://github.com'">
        <div class="card-title">🐙 GitHub</div>
        <div class="card-desc">Open source repositories & commits</div>
      </a>
      <a class="card" onclick="window.location.href='https://developer.mozilla.org'">
        <div class="card-title">📖 MDN Web Docs</div>
        <div class="card-desc">Web standards, CSS, and JavaScript specs</div>
      </a>
      <a class="card" onclick="window.location.href='http://localhost:5173'">
        <div class="card-title">⚡ Vite HMR</div>
        <div class="card-desc">Inspect local running dev server on 5173</div>
      </a>
      <a class="card" onclick="window.location.href='http://localhost:3000'">
        <div class="card-title">🖥️ Localhost 3000</div>
        <div class="card-desc">Fullstack backend or Node service</div>
      </a>
    </div>

    <div class="demo-bar">
      <div class="demo-info">
        <strong>CDP DOM & Telemetry Test</strong>
        <span>Click the button to test live console error intercept & CDP telemetry</span>
      </div>
      <button class="test-btn" id="inspectBtn" onclick="triggerTest()">Trigger Event</button>
    </div>
  </div>

  <script>
    function navigate() {
      var val = document.getElementById('urlInput').value.trim();
      if (!val) return;
      if (!val.includes('://')) val = 'https://' + val;
      window.location.href = val;
    }
    function triggerTest() {
      console.warn('[Bstudio Telemetry Demo]: Synthetic test event dispatched for CDP sentinel verification.');
      alert('CDP Telemetry Event Triggered! Check the top Diagnostics Badge Bar and AI Copilot sidebar.');
    }
  </script>
</body>
</html>`;
  }

  private createView(): void {
    this.view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        spellcheck: false
      }
    });

    this.mainWindow.contentView.addChildView(this.view);
    this.cdpCore.attachToView(this.view.webContents);
    this.registerViewEvents();

    // Set standard modern User-Agent so websites don't reject the connection
    this.view.webContents.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    );

    // Make view visible by default and set initial bounds
    this.view.setVisible(true);
    this.isVisible = true;
    this.view.setBounds({ x: 500, y: 44, width: 800, height: 600 });

    // Load initial Bstudio Portal
    this.view.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(this.getPortalHtml())}`);
  }

  private registerViewEvents(): void {
    if (!this.view) return;
    const wc = this.view.webContents;

    const emitNavState = () => {
      if (this.mainWindow.isDestroyed()) return;
      const currentUrl = wc.getURL() || '';
      const isPortal = currentUrl.startsWith('data:text/html');
      const state: NavigationState = {
        url: isPortal ? 'bstudio://start' : currentUrl,
        canGoBack: wc.canGoBack(),
        canGoForward: wc.canGoForward(),
        isLoading: wc.isLoading(),
        title: isPortal ? 'Bstudio Web Hub' : (wc.getTitle() || currentUrl),
        sslSecure: currentUrl.startsWith('https://')
      };
      this.mainWindow.webContents.send(IPC_CHANNELS.BROWSER_NAV_STATE_CHANGED, state);
    };

    wc.on('did-navigate', emitNavState);
    wc.on('did-navigate-in-page', emitNavState);
    wc.on('page-title-updated', emitNavState);
    wc.on('did-stop-loading', emitNavState);

    // Fallback if loading a URL fails (e.g. offline, DNS failure, block)
    wc.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
      if (errorCode === -3) return; // ABORTED - ignore when user cancels or starts new navigation
      console.warn(`[ViewManager] Failed loading ${validatedURL}: ${errorDescription} (${errorCode})`);
      const errorHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; background: #0d0d11; color: #e4e4e7; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center; }
    h2 { font-size: 20px; color: #f43f5e; margin-bottom: 8px; }
    p { color: #a1a1aa; font-size: 13px; max-width: 480px; margin-bottom: 20px; line-height: 1.5; }
    .btn { background: #76b900; color: #000; font-weight: 600; padding: 8px 16px; border-radius: 6px; text-decoration: none; cursor: pointer; border: none; font-size: 12px; margin: 4px; display: inline-block; }
    .btn-secondary { background: #27272a; color: #fff; }
    code { font-family: monospace; background: #1c1c22; padding: 2px 6px; border-radius: 4px; color: #f59e0b; }
  </style>
</head>
<body>
  <h2>Unable to Load Webpage</h2>
  <p>Could not connect to <code>${validatedURL}</code>.<br/>Reason: ${errorDescription} (Error ${errorCode}).</p>
  <div>
    <button class="btn" onclick="window.location.reload()">Retry</button>
    <button class="btn btn-secondary" onclick="window.location.href='http://localhost:5173'">Open Localhost:5173</button>
    <button class="btn btn-secondary" onclick="window.history.back()">Go Back</button>
  </div>
</body>
</html>`;
      wc.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    });
  }

  public async navigate(url: string): Promise<void> {
    if (!this.view) return;
    let target = url.trim();
    if (!target) return;

    console.log('[ViewManager] Navigating to:', target);

    if (target === 'bstudio://start' || target === 'about:blank') {
      await this.view.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(this.getPortalHtml())}`);
      return;
    }

    if (!target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('file://') && !target.startsWith('data:')) {
      target = `https://${target}`;
    }

    try {
      await this.view.webContents.loadURL(target);
      console.log('[ViewManager] loadURL succeeded for:', target);
    } catch (e: any) {
      console.warn('[ViewManager] Navigation error:', e.message);
    }
  }

  public goBack(): void {
    if (this.view && this.view.webContents.canGoBack()) {
      this.view.webContents.goBack();
    }
  }

  public goForward(): void {
    if (this.view && this.view.webContents.canGoForward()) {
      this.view.webContents.goForward();
    }
  }

  public reload(): void {
    if (this.view) {
      this.view.webContents.reload();
    }
  }

  public stop(): void {
    if (this.view) {
      this.view.webContents.stop();
    }
  }

  public syncBounds(bounds: ViewportBounds): void {
    if (!this.view) return;
    this.currentBounds = bounds;
    if (!this.isVisible) return;

    const contentBounds = this.mainWindow.getContentBounds();
    const x = Math.max(0, Math.round(bounds.x));
    const y = Math.max(0, Math.round(bounds.y));
    const maxWidth = Math.max(50, contentBounds.width - x);
    const maxHeight = Math.max(50, contentBounds.height - y);
    let clampedWidth = Math.min(Math.round(bounds.width), maxWidth);
    let clampedHeight = Math.min(Math.round(bounds.height), maxHeight);

    if (this.currentDevice === 'mobile') {
      clampedWidth = Math.min(clampedWidth, 390);
    } else if (this.currentDevice === 'tablet') {
      clampedWidth = Math.min(clampedWidth, 768);
    }

    try {
      this.view.setBounds({
        x,
        y,
        width: clampedWidth,
        height: clampedHeight
      });
      console.log('[ViewManager] syncBounds applied:', { x, y, width: clampedWidth, height: clampedHeight });
    } catch (err) {
      console.warn('[ViewManager] syncBounds error:', err);
    }
  }

  public setVisibility(visible: boolean): void {
    this.isVisible = visible;
    if (this.view) {
      this.view.setVisible(visible);
      if (visible && this.currentBounds.width > 10) {
        this.syncBounds(this.currentBounds);
      }
    }
  }

  public setDeviceEmulation(device: DevicePreset, customBounds?: { width: number; height: number }): void {
    this.currentDevice = device;
    if (customBounds) {
      this.syncBounds({
        ...this.currentBounds,
        width: customBounds.width,
        height: customBounds.height
      });
    } else {
      this.syncBounds(this.currentBounds);
    }
  }

  public toggleDevTools(): void {
    if (this.view) {
      if (this.view.webContents.isDevToolsOpened()) {
        this.view.webContents.closeDevTools();
      } else {
        this.view.webContents.openDevTools({ mode: 'detach' });
      }
    }
  }

  public async captureScreenshot(): Promise<string> {
    if (this.view) {
      const img = await this.view.webContents.capturePage();
      return img.toDataURL();
    }
    return '';
  }

  public async executeJavaScript(code: string): Promise<any> {
    if (!this.view || !this.view.webContents) {
      throw new Error('No active web page view attached');
    }
    return this.view.webContents.executeJavaScript(code, true);
  }

  public getWebContents() {
    return this.view?.webContents;
  }
}
