import { app, BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { ViewManager } from './view-manager';
import { CdpCore } from './cdp/cdp-core';
import { PtyManager } from './terminal/pty-manager';
import { PatchEngine } from './patch-engine';
import { SecureStorage } from './secure-storage';
import { NebiusClient } from './nemotron/nebius-client';
import { LoadOrchestrator } from './load-tester/load-orchestrator';

// Diagnostic Engines
import { ElementInspector } from './cdp/element-inspector';
import { CdnXmlSentinel } from './cdp/cdn-xml-sentinel';
import { ConsoleSentinel } from './cdp/console-sentinel';
import { NetworkThrottler } from './cdp/network-throttler';
import { MemoryProfiler } from './cdp/memory-profiler';
import { SecurityAuditor } from './cdp/security-auditor';

// IPC Registrars
import { registerBrowserIpc } from './ipc/register-browser-ipc';
import { registerCdpIpc } from './ipc/register-cdp-ipc';
import { registerTerminalIpc } from './ipc/register-terminal-ipc';
import { registerAiIpc } from './ipc/register-ai-ipc';
import { registerStorageIpc } from './ipc/register-storage-ipc';
import { registerLoadIpc } from './ipc/register-load-ipc';
import { registerFsIpc } from './ipc/register-fs-ipc';
import { registerGitIpc } from './ipc/register-git-ipc';
import { registerExtensionsIpc } from './ipc/register-extensions-ipc';

dotenv.config();

class BstudioApplication {
  private mainWindow: BrowserWindow | null = null;
  private viewManager: ViewManager | null = null;
  private cdpCore: CdpCore | null = null;
  private ptyManager: PtyManager | null = null;
  private patchEngine: PatchEngine | null = null;
  private secureStorage: SecureStorage | null = null;
  private nebiusClient: NebiusClient | null = null;
  private loadOrchestrator: LoadOrchestrator | null = null;

  // Diagnostic Engines
  private elementInspector: ElementInspector | null = null;
  private cdnXmlSentinel: CdnXmlSentinel | null = null;
  private consoleSentinel: ConsoleSentinel | null = null;
  private networkThrottler: NetworkThrottler | null = null;
  private memoryProfiler: MemoryProfiler | null = null;
  private securityAuditor: SecurityAuditor | null = null;

  private projectRoot: string;

  constructor() {
    this.projectRoot = process.env.WORKSPACE_ROOT
      ? path.resolve(process.env.WORKSPACE_ROOT)
      : process.cwd();

    this.enforceSingleInstance();
    this.configureHardwareAcceleration();
    this.registerLifecycleHooks();
  }

  private enforceSingleInstance(): void {
    const gotLock = app.requestSingleInstanceLock();
    if (!gotLock) {
      console.warn('[Bstudio] Another instance is already running. Quitting.');
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
    app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,CanvasOopRasterization');
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
      console.error('[Bstudio Main Critical Error]:', error);
    });

    process.on('unhandledRejection', (reason) => {
      console.error('[Bstudio Main Unhandled Rejection]:', reason);
    });
  }

  private async bootstrap(): Promise<void> {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    const preloadPath = path.resolve(__dirname, '../preload/index.js');
    console.log('[Main] Preload path resolved:', preloadPath, 'exists:', fs.existsSync(preloadPath));

    this.mainWindow = new BrowserWindow({
      width: Math.min(1920, width),
      height: Math.min(1080, height),
      minWidth: 1000,
      minHeight: 650,
      title: 'Bstudio | AI-Native Autonomous Diagnostic Browser & IDE',
      backgroundColor: '#09090b',
      autoHideMenuBar: true,
      frame: false,
      titleBarStyle: 'hidden',
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        backgroundThrottling: false
      }
    });

    // Window Controls IPC
    ipcMain.handle('window:minimize', () => {
      this.mainWindow?.minimize();
      return true;
    });

    ipcMain.handle('window:maximize', () => {
      if (!this.mainWindow) return false;
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
        return false;
      } else {
        this.mainWindow.maximize();
        return true;
      }
    });

    ipcMain.handle('window:close', () => {
      this.mainWindow?.close();
      return true;
    });

    ipcMain.handle('window:is-maximized', () => {
      return this.mainWindow?.isMaximized() || false;
    });

    this.mainWindow.on('maximize', () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('window:maximized-change', true);
      }
    });

    this.mainWindow.on('unmaximize', () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('window:maximized-change', false);
      }
    });

    // 1. Initialize Subsystems
    this.cdpCore = new CdpCore(this.mainWindow);
    this.viewManager = new ViewManager(this.mainWindow, this.cdpCore);
    this.ptyManager = new PtyManager(this.mainWindow);
    this.patchEngine = new PatchEngine(this.projectRoot);
    this.secureStorage = new SecureStorage();
    this.nebiusClient = new NebiusClient(this.secureStorage);
    await this.nebiusClient.initialize();
    this.loadOrchestrator = new LoadOrchestrator(this.mainWindow);

    // 2. Initialize Diagnostic Engines
    this.elementInspector = new ElementInspector(this.cdpCore, this.mainWindow);
    this.cdnXmlSentinel = new CdnXmlSentinel(this.cdpCore);
    this.consoleSentinel = new ConsoleSentinel(this.cdpCore, this.projectRoot);
    this.networkThrottler = new NetworkThrottler(this.cdpCore);
    this.memoryProfiler = new MemoryProfiler(this.cdpCore);
    this.securityAuditor = new SecurityAuditor(this.cdpCore);

    // 3. Register IPC Registrars
    registerBrowserIpc(this.viewManager);
    registerCdpIpc(this.elementInspector, this.memoryProfiler, this.securityAuditor, this.networkThrottler);
    registerTerminalIpc(this.ptyManager, this.projectRoot);
    registerAiIpc(this.nebiusClient, this.patchEngine);
    registerStorageIpc(this.secureStorage, this.nebiusClient);
    registerLoadIpc(this.loadOrchestrator);
    const fsState = registerFsIpc(this.projectRoot, this.mainWindow, this.viewManager);
    registerGitIpc(() => fsState.getProjectRoot(), this.mainWindow);
    registerExtensionsIpc();

    // 4. Load Renderer
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    if (isDev) {
      await this.mainWindow.loadURL('http://localhost:5173');
    } else {
      await this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.on('resize', () => {
      // Re-evaluate bounds if needed
    });
  }

  private cleanup(): void {
    if (this.ptyManager) {
      this.ptyManager.destroyAll();
    }
    if (this.loadOrchestrator) {
      this.loadOrchestrator.stopTest();
    }
    if (this.cdpCore) {
      this.cdpCore.detach();
    }
  }
}

new BstudioApplication();
