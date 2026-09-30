import { BrowserWindow, WebContents } from 'electron';
import { DiagnosticTelemetry } from '../../shared/telemetry-types';
import { IPC_CHANNELS } from '../../shared/ipc-channels';

type CdpEventHandler = (params: any) => void;

export class CdpCore {
  private activeWebContents: WebContents | null = null;
  private isAttached: boolean = false;
  private subscribers: Map<string, Set<CdpEventHandler>> = new Map();
  private telemetryQueue: DiagnosticTelemetry[] = [];

  constructor(private mainWindow: BrowserWindow) {}

  public attachToView(targetWebContents: WebContents): void {
    if (this.activeWebContents === targetWebContents && this.isAttached) {
      return;
    }

    if (this.isAttached && this.activeWebContents) {
      this.detach();
    }

    this.activeWebContents = targetWebContents;

    try {
      this.activeWebContents.debugger.attach('1.3');
      this.isAttached = true;
      console.log('[CdpCore] Successfully attached debugger protocol 1.3 to active WebContents.');

      this.activeWebContents.debugger.on('message', (_, method, params) => {
        const handlers = this.subscribers.get(method);
        if (handlers) {
          for (const handler of handlers) {
            try {
              handler(params);
            } catch (err) {
              console.error(`[CdpCore] Error in handler for ${method}:`, err);
            }
          }
        }
      });

      this.activeWebContents.debugger.on('detach', (_, reason) => {
        console.warn('[CdpCore] Debugger detached:', reason);
        this.isAttached = false;
      });

      this.enableCoreDomains();
      this.registerNetworkTelemetry();
    } catch (err) {
      console.error('[CdpCore] Failed to attach debugger to target WebContents:', err);
    }
  }

  private registerNetworkTelemetry(): void {
    const pendingNetwork = new Map<string, { startTime: number; url: string; method: string; type: string }>();

    this.subscribe('Network.requestWillBeSent', (params: any) => {
      const { requestId, request, type } = params;
      if (!requestId || !request?.url) return;
      if (request.url.startsWith('data:') || request.url.startsWith('devtools:')) return;
      pendingNetwork.set(requestId, {
        startTime: Date.now(),
        url: request.url,
        method: request.method || 'GET',
        type: type || 'other'
      });
      this.emitNetworkEntry({
        id: requestId,
        url: request.url,
        method: request.method || 'GET',
        type: type || 'other',
        status: 0,
        statusText: 'Pending',
        timestamp: Date.now()
      });
    });

    this.subscribe('Network.responseReceived', (params: any) => {
      const { requestId, response, type } = params;
      if (!requestId) return;
      const initial = pendingNetwork.get(requestId);
      const duration = initial ? Date.now() - initial.startTime : 0;
      this.emitNetworkEntry({
        id: requestId,
        url: response?.url || initial?.url || '',
        method: initial?.method || 'GET',
        status: response?.status || 200,
        statusText: response?.statusText || 'OK',
        mimeType: response?.mimeType || '',
        type: type || initial?.type || 'other',
        duration,
        size: response?.encodedDataLength || 0,
        timestamp: Date.now()
      });
      pendingNetwork.delete(requestId);
    });

    this.subscribe('Network.loadingFailed', (params: any) => {
      const { requestId, errorText, type } = params;
      if (!requestId) return;
      const initial = pendingNetwork.get(requestId);
      const duration = initial ? Date.now() - initial.startTime : 0;
      this.emitNetworkEntry({
        id: requestId,
        url: initial?.url || '',
        method: initial?.method || 'GET',
        status: 0,
        statusText: errorText || 'FAILED',
        type: type || initial?.type || 'other',
        duration,
        error: errorText,
        timestamp: Date.now()
      });
      pendingNetwork.delete(requestId);
    });
  }

  private async enableCoreDomains(): Promise<void> {
    if (!this.isAttached) return;
    const domains = [
      'Page',
      'DOM',
      'CSS',
      'Overlay',
      'Network',
      'Runtime',
      'Security',
      'HeapProfiler',
      'Performance'
    ];

    for (const domain of domains) {
      try {
        await this.sendCommand(`${domain}.enable`);
      } catch (err) {
        // Some domains like Overlay require DOM.enable first
      }
    }
  }

  public async sendCommand(method: string, params: any = {}): Promise<any> {
    if (!this.isAttached || !this.activeWebContents) {
      throw new Error(`[CdpCore] Cannot send command '${method}': Debugger not attached.`);
    }
    return this.activeWebContents.debugger.sendCommand(method, params);
  }

  public subscribe(eventMethod: string, handler: CdpEventHandler): () => void {
    if (!this.subscribers.has(eventMethod)) {
      this.subscribers.set(eventMethod, new Set());
    }
    this.subscribers.get(eventMethod)!.add(handler);

    return () => {
      this.subscribers.get(eventMethod)?.delete(handler);
    };
  }

  public emitTelemetry(telemetry: DiagnosticTelemetry): void {
    this.telemetryQueue.push(telemetry);
    if (this.telemetryQueue.length > 200) {
      this.telemetryQueue.shift(); // Bound memory consumption
    }

    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.CDP_TELEMETRY_EMITTED, telemetry);
    }
  }

  public emitConsoleOutput(entry: any): void {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.CDP_CONSOLE_OUTPUT, entry);
    }
  }

  public emitNetworkEntry(entry: any): void {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.CDP_NETWORK_ENTRY, entry);
    }
  }

  public getRecentTelemetry(): DiagnosticTelemetry[] {
    return [...this.telemetryQueue];
  }

  public detach(): void {
    if (this.isAttached && this.activeWebContents) {
      try {
        this.activeWebContents.debugger.detach();
      } catch (e) {}
      this.isAttached = false;
    }
  }
}
