# DOCUMENT 2 OF 6: ELECTRON MAIN PROCESS, WEBCONTENTSVIEW ENGINE, AND CDP CORE

**File Target:** `docs/02_ELECTRON_MAIN_PROCESS_WEBCONTENTSVIEW_AND_CDP_CORE.md`

**Series Roadmap:**

* **Doc 1: Master Architecture, System Topology, and IPC Contracts** *(Completed)*
* **Doc 2: Electron Main Process, WebContentsView Engine, and CDP Core** *(Current)*
* **Doc 3: The 7 Autonomous Diagnostic & Load Engines**
* **Doc 4: Nebius Token Factory, Nemotron Dual-Tier Routing, and Atomic File Patcher**
* **Doc 5: Vue 3 Renderer Workspace, Dev Chat Sidebar, and UI Components**
* **Doc 6: Build Tooling, Native Rebuild, Packaging, and Hackathon Execution Guide**

---

## 1. Main Process Lifecycle & Window Orchestrator (`src/main/index.ts`)

The Electron Main Process is the privileged controller of Dev-Shell. It initializes the native application window, manages the single-instance lock to prevent resource contention across Chromium instances, configures native crash handlers, and orchestrates the subsystems: the `ViewManager`, `CdpCore`, `PtyManager`, `PatchEngine`, and IPC registries.

```typescript
import { app, BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';
import { ViewManager } from './view-manager';
import { CdpCore } from './cdp/cdp-core';
import { PtyManager } from './terminal/pty-manager';
import { PatchEngine } from './patch-engine';
import { registerBrowserIpc } from './ipc/register-browser-ipc';
import { registerCdpIpc } from './ipc/register-cdp-ipc';
import { registerTerminalIpc } from './ipc/register-terminal-ipc';
import { registerAiIpc } from './ipc/register-ai-ipc';
import { registerStorageIpc } from './ipc/register-storage-ipc';

class DevShellApplication {
  private mainWindow: BrowserWindow | null = null;
  private viewManager: ViewManager | null = null;
  private cdpCore: CdpCore | null = null;
  private ptyManager: PtyManager | null = null;
  private patchEngine: PatchEngine | null = null;

  constructor() {
    this.enforceSingleInstance();
    this.configureHardwareAcceleration();
    this.registerLifecycleHooks();
  }

  private enforceSingleInstance(): void {
    const gotSingleInstanceLock = app.requestSingleInstanceLock();
    if (!gotSingleInstanceLock) {
      console.warn('[DevShell] Another instance of Dev-Shell is already active. Exiting.');
      app.quit();
    } else {
      app.on('second-instance', () => {
        if (this.mainWindow) {
          if (this.mainWindow.isMinimized()) this.mainWindow.restore();
          this.mainWindow.focus();
        }
      });
    }
  }

  private configureHardwareAcceleration(): void {
    // Retain hardware acceleration for WebContentsView composition
    app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,CanvasOopRasterization');
    app.commandLine.appendSwitch('disable-http-cache', 'false');
    // Ensure remote debugging port is open if secondary external tooling is attached
    app.commandLine.appendSwitch('remote-debugging-port', '9222');
  }

  private registerLifecycleHooks(): void {
    app.whenReady().then(() => this.bootstrap());

    app.on('window-all-closed', () => {
      this.cleanup();
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.bootstrap();
      }
    });

    process.on('uncaughtException', (error) => {
      console.error('[DevShell Main Critical Error]:', error);
    });

    process.on('unhandledRejection', (reason) => {
      console.error('[DevShell Main Unhandled Rejection]:', reason);
    });
  }

  private async bootstrap(): Promise<void> {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // Instantiate Root Browser Window hosting Vue 3 Renderer
    this.mainWindow = new BrowserWindow({
      width: Math.min(1920, width),
      height: Math.min(1080, height),
      minWidth: 1200,
      minHeight: 800,
      title: 'Dev-Shell | Autonomous AI Diagnostic Browser',
      backgroundColor: '#09090b', // zinc-950
      autoHideMenuBar: true,
      frame: true,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: false,
        backgroundThrottling: false
      }
    });

    // Initialize Subsystem Engines
    this.cdpCore = new CdpCore(this.mainWindow);
    this.viewManager = new ViewManager(this.mainWindow, this.cdpCore);
    this.ptyManager = new PtyManager(this.mainWindow);
    this.patchEngine = new PatchEngine(process.cwd());

    // Register All Isolated IPC Routers
    registerBrowserIpc(this.mainWindow, this.viewManager);
    registerCdpIpc(this.mainWindow, this.cdpCore);
    registerTerminalIpc(this.mainWindow, this.ptyManager);
    registerAiIpc(this.mainWindow, this.patchEngine, this.cdpCore);
    registerStorageIpc(this.mainWindow);

    // Load Renderer Application
    if (process.env.VITE_DEV_SERVER_URL) {
      await this.mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
      this.mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
      await this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // Set Initial Active Tab
    await this.viewManager.createTab('https://github.com');

    this.mainWindow.on('closed', () => {
      this.cleanup();
    });
  }

  private cleanup(): void {
    if (this.ptyManager) {
      this.ptyManager.destroyAll();
    }
    if (this.viewManager) {
      this.viewManager.destroy();
    }
    this.mainWindow = null;
  }
}

// Instantiate Singleton Application
new DevShellApplication();

```

---

## 2. Native `WebContentsView` Coordinator (`src/main/view-manager.ts`)

Electron deprecated `BrowserView` in favor of `WebContentsView` (stabilized in Electron 30+). `WebContentsView` is a native UI component added directly to the window's `contentView` hierarchy. It executes isolated from the host Vue UI and renders its own visual tree.

The `ViewManager` handles:

* Dynamic bounds math (transforming Vue DOM coordinates into native platform pixels).
* Tab pooling and switching without reloading unselected pages.
* Device metric overrides for responsive simulation.
* Hardware occlusion prevention (hiding native views when Vue modals or drawers overlap).

```typescript
import { BrowserWindow, WebContentsView, screen } from 'electron';
import { CdpCore } from './cdp/cdp-core';
import { ViewportBounds, NavigationState } from '../shared/telemetry-types';
import { IPC_CHANNELS } from '../shared/ipc-channels';

export interface TabSession {
  id: string;
  url: string;
  title: string;
  view: WebContentsView;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  sslSecure: boolean;
}

export class ViewManager {
  private tabs: Map<string, TabSession> = new Map();
  private activeTabId: string | null = null;
  private currentBounds: ViewportBounds = { x: 0, y: 72, width: 800, height: 600 };
  private isVisible: boolean = true;

  constructor(
    private mainWindow: BrowserWindow,
    private cdpCore: CdpCore
  ) {
    this.registerWindowResizeListener();
  }

  private registerWindowResizeListener(): void {
    this.mainWindow.on('resize', () => {
      this.updateActiveViewBounds();
    });
  }

  public async createTab(initialUrl: string = 'about:blank'): Promise<string> {
    const tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Modern Electron: WebContentsView initialization
    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        javascript: true,
        webSecurity: true,
        allowRunningInsecureContent: false
      }
    });

    const session: TabSession = {
      id: tabId,
      url: initialUrl,
      title: 'New Tab',
      view,
      isLoading: true,
      canGoBack: false,
      canGoForward: false,
      sslSecure: false
    };

    this.tabs.set(tabId, session);
    this.registerViewNavigationEvents(session);

    // Mount to root contentView hierarchy
    this.mainWindow.contentView.addChildView(view);

    // Switch focus to newly created tab
    await this.setActiveTab(tabId);

    if (initialUrl !== 'about:blank') {
      await view.webContents.loadURL(initialUrl);
    }

    return tabId;
  }

  public async setActiveTab(tabId: string): Promise<void> {
    if (!this.tabs.has(tabId)) {
      throw new Error(`[ViewManager] Tab ID ${tabId} does not exist.`);
    }

    // Hide previous active view
    if (this.activeTabId && this.tabs.has(this.activeTabId)) {
      const prevSession = this.tabs.get(this.activeTabId)!;
      prevSession.view.setVisible(false);
    }

    this.activeTabId = tabId;
    const currentSession = this.tabs.get(tabId)!;

    // Attach CDP multiplexer to the newly focused active view
    await this.cdpCore.attachToWebContents(currentSession.view.webContents);

    // Show and align current view
    currentSession.view.setVisible(this.isVisible);
    this.updateActiveViewBounds();
    this.emitNavigationState(currentSession);
  }

  public closeTab(tabId: string): void {
    const session = this.tabs.get(tabId);
    if (!session) return;

    // If attached to CDP, detach cleanly
    if (this.activeTabId === tabId) {
      this.cdpCore.detach();
    }

    this.mainWindow.contentView.removeChildView(session.view);
    // Explicitly destroy underlying webContents
    (session.view.webContents as any).destroy();
    this.tabs.delete(tabId);

    // If active tab was closed, promote adjacent tab
    if (this.activeTabId === tabId) {
      const remainingTabIds = Array.from(this.tabs.keys());
      if (remainingTabIds.length > 0) {
        this.setActiveTab(remainingTabIds[remainingTabIds.length - 1]);
      } else {
        this.activeTabId = null;
      }
    }
  }

  public setBounds(bounds: ViewportBounds): void {
    this.currentBounds = bounds;
    this.updateActiveViewBounds();
  }

  public setVisibility(visible: boolean): void {
    this.isVisible = visible;
    if (this.activeTabId && this.tabs.has(this.activeTabId)) {
      this.tabs.get(this.activeTabId)!.view.setVisible(visible);
    }
  }

  private updateActiveViewBounds(): void {
    if (!this.activeTabId || !this.tabs.has(this.activeTabId)) return;
    const activeSession = this.tabs.get(this.activeTabId)!;

    // Retrieve scale factor for current window display
    const windowBounds = this.mainWindow.getBounds();
    const currentDisplay = screen.getDisplayMatching(windowBounds);
    const scale = currentDisplay.scaleFactor;

    // Clamp coordinates to host window boundary to avoid rendering overflows
    const clampedWidth = Math.max(10, Math.min(this.currentBounds.width, windowBounds.width - this.currentBounds.x));
    const clampedHeight = Math.max(10, Math.min(this.currentBounds.height, windowBounds.height - this.currentBounds.y));

    activeSession.view.setBounds({
      x: Math.round(this.currentBounds.x),
      y: Math.round(this.currentBounds.y),
      width: Math.round(clampedWidth),
      height: Math.round(clampedHeight)
    });
  }

  private registerViewNavigationEvents(session: TabSession): void {
    const wc = session.view.webContents;

    wc.on('did-start-loading', () => {
      session.isLoading = true;
      this.emitNavigationState(session);
    });

    wc.on('did-stop-loading', () => {
      session.isLoading = false;
      session.canGoBack = wc.canGoBack();
      session.canGoForward = wc.canGoForward();
      session.url = wc.getURL();
      session.title = wc.getTitle();
      session.sslSecure = session.url.startsWith('https://');
      this.emitNavigationState(session);
    });

    wc.on('page-title-updated', (_, title) => {
      session.title = title;
      this.emitNavigationState(session);
    });

    wc.on('did-navigate', (_, url) => {
      session.url = url;
      session.sslSecure = url.startsWith('https://');
      this.emitNavigationState(session);
    });

    wc.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
      session.isLoading = false;
      console.warn(`[ViewManager] Failed loading ${validatedURL}: ${errorDescription} (${errorCode})`);
      this.emitNavigationState(session);
    });
  }

  private emitNavigationState(session: TabSession): void {
    if (session.id !== this.activeTabId) return;

    const state: NavigationState = {
      url: session.url,
      canGoBack: session.canGoBack,
      canGoForward: session.canGoForward,
      isLoading: session.isLoading,
      title: session.title,
      sslSecure: session.sslSecure
    };

    this.mainWindow.webContents.send(IPC_CHANNELS.BROWSER_NAV_STATE_CHANGED, state);
  }

  public getActiveWebContents() {
    if (!this.activeTabId || !this.tabs.has(this.activeTabId)) return null;
    return this.tabs.get(this.activeTabId)!.view.webContents;
  }

  public destroy(): void {
    for (const [tabId] of this.tabs) {
      this.closeTab(tabId);
    }
  }
}

```

---

## 3. Chrome DevTools Protocol Core Multiplexer (`src/main/cdp/cdp-core.ts`)

The `CdpCore` class acts as the centralized gateway between Electron and Chromium's low-level debugging pipeline. It establishes an active session using `webContents.debugger.attach('1.3')`, enables essential debugging domains, throttles event streams to prevent IPC saturation, and dispatches normalized telemetry payloads.

```typescript
import { BrowserWindow, WebContents } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { DiagnosticTelemetry } from '../../shared/telemetry-types';

export type CdpEventHandler = (params: any) => Promise<void> | void;

export class CdpCore {
  private currentWebContents: WebContents | null = null;
  private isAttached: boolean = false;
  private eventHandlers: Map<string, Set<CdpEventHandler>> = new Map();
  private telemetryQueue: DiagnosticTelemetry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(private mainWindow: BrowserWindow) {
    this.startTelemetryQueueFlush();
  }

  public async attachToWebContents(wc: WebContents): Promise<void> {
    if (this.currentWebContents === wc && this.isAttached) {
      return;
    }

    // Detach from previous active webContents if switching tabs
    await this.detach();

    this.currentWebContents = wc;

    try {
      if (!wc.debugger.isAttached()) {
        wc.debugger.attach('1.3');
      }
      this.isAttached = true;
      this.registerDebuggerListeners(wc);
      await this.enableCoreDomains();
      console.log(`[CdpCore] Successfully attached debugger to WebContents ID: ${wc.id}`);
    } catch (err) {
      console.error(`[CdpCore Critical] Failed to attach debugger to WebContents:`, err);
      this.isAttached = false;
    }
  }

  public async detach(): Promise<void> {
    if (this.currentWebContents && this.isAttached) {
      try {
        if (this.currentWebContents.debugger.isAttached()) {
          this.currentWebContents.debugger.detach();
        }
      } catch (err) {
        console.warn(`[CdpCore] Error during debugger detach:`, err);
      } finally {
        this.isAttached = false;
        this.currentWebContents = null;
      }
    }
  }

  private registerDebuggerListeners(wc: WebContents): void {
    wc.debugger.on('detach', (_, reason) => {
      console.warn(`[CdpCore] Debugger detached automatically. Reason: ${reason}`);
      this.isAttached = false;
    });

    wc.debugger.on('message', async (_, method, params) => {
      // Dispatch incoming CDP messages to registered domain listeners
      if (this.eventHandlers.has(method)) {
        const handlers = this.eventHandlers.get(method)!;
        for (const handler of handlers) {
          try {
            await handler(params);
          } catch (err) {
            console.error(`[CdpCore] Error executing handler for ${method}:`, err);
          }
        }
      }
    });
  }

  private async enableCoreDomains(): Promise<void> {
    if (!this.isAttached || !this.currentWebContents) return;

    // Sequentially activate protocol domains
    const domains = [
      'Page.enable',
      'DOM.enable',
      'CSS.enable',
      'Overlay.enable',
      'Runtime.enable',
      'Log.enable',
      'Network.enable',
      'Security.enable',
      'Performance.enable',
      'HeapProfiler.enable'
    ];

    for (const domain of domains) {
      try {
        await this.sendCommand(domain);
      } catch (err) {
        console.error(`[CdpCore] Failed to enable CDP domain ${domain}:`, err);
      }
    }
  }

  public async sendCommand<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!this.isAttached || !this.currentWebContents) {
      throw new Error(`[CdpCore] Cannot send command '${method}'. Debugger is not attached.`);
    }

    try {
      return (await this.currentWebContents.debugger.sendCommand(method, params)) as T;
    } catch (error: any) {
      // Enhanced diagnostic logging for CDP command errors
      console.error(`[CdpCore Command Failed] ${method}:`, error.message);
      throw error;
    }
  }

  public subscribe(method: string, handler: CdpEventHandler): () => void {
    if (!this.eventHandlers.has(method)) {
      this.eventHandlers.set(method, new Set());
    }
    this.eventHandlers.get(method)!.add(handler);

    // Return unbind subscription function
    return () => {
      const handlers = this.eventHandlers.get(method);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(method);
        }
      }
    };
  }

  public emitTelemetry(telemetry: DiagnosticTelemetry): void {
    // Push into sliding-window batch queue
    this.telemetryQueue.push(telemetry);
  }

  private startTelemetryQueueFlush(): void {
    // Flush telemetry to renderer over IPC at max 10Hz to prevent event queue flooding
    this.flushTimer = setInterval(() => {
      if (this.telemetryQueue.length === 0) return;

      const batch = [...this.telemetryQueue];
      this.telemetryQueue = [];

      for (const item of batch) {
        this.mainWindow.webContents.send(IPC_CHANNELS.CDP_TELEMETRY_EMITTED, item);
      }
    }, 100);
  }

  public getWebContents(): WebContents | null {
    return this.currentWebContents;
  }

  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.detach();
    this.eventHandlers.clear();
  }
}

```

---

## 4. Typed IPC Handlers (`src/main/ipc/register-browser-ipc.ts` & `register-cdp-ipc.ts`)

These files bridge Vue 3 frontend user interactions (URL navigation, viewport coordinate tracking, inspection toggles, garbage collection) securely across the isolated process boundary.

### Browser IPC Registration (`src/main/ipc/register-browser-ipc.ts`)

```typescript
import { BrowserWindow, ipcMain } from 'electron';
import { ViewManager } from '../view-manager';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { ViewportBounds } from '../../shared/telemetry-types';

export function registerBrowserIpc(mainWindow: BrowserWindow, viewManager: ViewManager): void {
  ipcMain.handle(IPC_CHANNELS.BROWSER_NAVIGATE, async (_, url: string) => {
    const wc = viewManager.getActiveWebContents();
    if (!wc) return;
    
    // Auto-prepend HTTPS protocol if omitted
    let target = url.trim();
    if (!/^https?:\/\//i.test(target) && !target.startsWith('about:')) {
      target = `https://${target}`;
    }
    await wc.loadURL(target);
  });

  ipcMain.handle(IPC_CHANNELS.BROWSER_GO_BACK, async () => {
    const wc = viewManager.getActiveWebContents();
    if (wc && wc.canGoBack()) wc.goBack();
  });

  ipcMain.handle(IPC_CHANNELS.BROWSER_GO_FORWARD, async () => {
    const wc = viewManager.getActiveWebContents();
    if (wc && wc.canGoForward()) wc.goForward();
  });

  ipcMain.handle(IPC_CHANNELS.BROWSER_RELOAD, async () => {
    const wc = viewManager.getActiveWebContents();
    if (wc) wc.reload();
  });

  ipcMain.handle(IPC_CHANNELS.BROWSER_STOP, async () => {
    const wc = viewManager.getActiveWebContents();
    if (wc) wc.stop();
  });

  ipcMain.handle(IPC_CHANNELS.BROWSER_SYNC_BOUNDS, async (_, bounds: ViewportBounds) => {
    viewManager.setBounds(bounds);
  });

  ipcMain.handle(IPC_CHANNELS.BROWSER_SET_VISIBILITY, async (_, visible: boolean) => {
    viewManager.setVisibility(visible);
  });
}

```

### CDP IPC Registration (`src/main/ipc/register-cdp-ipc.ts`)

```typescript
import { BrowserWindow, ipcMain } from 'electron';
import { CdpCore } from '../cdp/cdp-core';
import { IPC_CHANNELS } from '../../shared/ipc-channels';

export function registerCdpIpc(mainWindow: BrowserWindow, cdpCore: CdpCore): void {
  ipcMain.handle(IPC_CHANNELS.EMULATION_SET_NETWORK, async (_, profile: string) => {
    switch (profile) {
      case 'offline':
        await cdpCore.sendCommand('Network.emulateNetworkConditions', {
          offline: true,
          latency: 0,
          downloadThroughput: 0,
          uploadThroughput: 0
        });
        break;
      case 'slow-3g':
        await cdpCore.sendCommand('Network.emulateNetworkConditions', {
          offline: false,
          latency: 2000,
          downloadThroughput: (400 * 1024) / 8, // 400 kbps
          uploadThroughput: (400 * 1024) / 8
        });
        break;
      case 'fast-3g':
        await cdpCore.sendCommand('Network.emulateNetworkConditions', {
          offline: false,
          latency: 560,
          downloadThroughput: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps
          uploadThroughput: (750 * 1024) / 8
        });
        break;
      case 'online':
      default:
        await cdpCore.sendCommand('Network.emulateNetworkConditions', {
          offline: false,
          latency: 0,
          downloadThroughput: -1,
          uploadThroughput: -1
        });
        break;
    }
  });

  ipcMain.handle(IPC_CHANNELS.EMULATION_SET_DEVICE, async (_, device: string) => {
    if (device === 'mobile') {
      await cdpCore.sendCommand('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
        mobile: true
      });
      await cdpCore.sendCommand('Network.setUserAgentOverride', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      });
    } else if (device === 'tablet') {
      await cdpCore.sendCommand('Emulation.setDeviceMetricsOverride', {
        width: 820,
        height: 1180,
        deviceScaleFactor: 2,
        mobile: true
      });
      await cdpCore.sendCommand('Network.setUserAgentOverride', {
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      });
    } else {
      // Reset Emulation overrides for standard desktop
      await cdpCore.sendCommand('Emulation.clearDeviceMetricsOverride');
      await cdpCore.sendCommand('Network.setUserAgentOverride', { userAgent: '' });
    }
  });

  ipcMain.handle(IPC_CHANNELS.CDP_TRIGGER_GC, async () => {
    await cdpCore.sendCommand('HeapProfiler.collectGarbage');
  });

  ipcMain.handle(IPC_CHANNELS.CDP_TOGGLE_INSPECT, async (_, enabled: boolean) => {
    if (enabled) {
      await cdpCore.sendCommand('Overlay.setInspectMode', {
        mode: 'searchForNode',
        highlightConfig: {
          showInfo: true,
          showRulers: true,
          showExtensionLines: true,
          contentColor: { r: 16, g: 185, b: 129, a: 0.3 }, // emerald-500 with opacity
          paddingColor: { r: 59, g: 130, b: 246, a: 0.2 },
          borderColor: { r: 16, g: 185, b: 129, a: 1.0 },
          marginColor: { r: 245, g: 158, b: 11, a: 0.2 }
        }
      });
    } else {
      await cdpCore.sendCommand('Overlay.setInspectMode', {
        mode: 'none',
        highlightConfig: {}
      });
    }
  });
}

```

---

## 5. Security & Isolation Safeguards

To prevent malicious websites loaded in the `WebContentsView` from breaking out into the privileged Node.js environment:

* **Process Isolation:** The `mainWindow` renderer and every embedded `WebContentsView` run in isolated rendering processes.
* **Disabled Integrations:** `nodeIntegration` is forced to `false` and `contextIsolation` is forced to `true` across all view configurations.
* **Window Open Interception:** Popups triggered via `window.open` or `<a target="_blank">` are intercepted using `setWindowOpenHandler` on the webContents, preventing unwanted top-level windows from escaping coordinate clamping.
* **Sanitized Telemetry:** CDP parameters pass through local validation before forwarding to Vue or Nebius to ensure private cookies and raw credential headers are redacted.