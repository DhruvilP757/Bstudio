import { contextBridge, ipcRenderer } from 'electron';
import type { IElectronAPI, ViewportBounds, NavigationState } from './types';
import type { DiagnosticTelemetry, LoadTestConfig, LoadTestProgress, LoadTestSummary } from '../shared/telemetry-types';
import type { FilePatch, PatchResult } from '../shared/patch-types';
import type { ApiRequest, ApiResponse } from '../shared/api-tester-types';
import type { NetworkProfile, DevicePreset, InspectedNodeInfo } from '../shared/cdp-types';

console.log('[PRELOAD_DEBUG] Preload script starting...');

// Inlined IPC channels so the sandboxed preload script requires ZERO external modules
const CHANNELS = {
  BROWSER_NAVIGATE: 'browser:navigate',
  BROWSER_GO_BACK: 'browser:go-back',
  BROWSER_GO_FORWARD: 'browser:go-forward',
  BROWSER_RELOAD: 'browser:reload',
  BROWSER_STOP: 'browser:stop',
  BROWSER_SYNC_BOUNDS: 'browser:sync-bounds',
  BROWSER_SET_VISIBILITY: 'browser:set-visibility',
  BROWSER_NAV_STATE_CHANGED: 'browser:nav-state-changed',
  EMULATION_SET_DEVICE: 'emulation:set-device',
  EMULATION_SET_NETWORK: 'emulation:set-network',
  CDP_TOGGLE_INSPECT: 'cdp:toggle-inspect',
  CDP_TRIGGER_GC: 'cdp:trigger-gc',
  CDP_RUN_MEMORY_AUDIT: 'cdp:run-memory-audit',
  CDP_RUN_SECURITY_AUDIT: 'cdp:run-security-audit',
  CDP_TELEMETRY_EMITTED: 'cdp:telemetry-emitted',
  CDP_NODE_INSPECTED: 'cdp:node-inspected',
  PTY_CREATE: 'pty:create',
  PTY_WRITE: 'pty:write',
  PTY_RESIZE: 'pty:resize',
  PTY_DESTROY: 'pty:destroy',
  PTY_DATA_STREAM: 'pty:data-stream',
  API_EXECUTE_REQUEST: 'api:execute-request',
  API_AGENT_PROPOSE_REQUEST: 'api:agent-propose-request',
  LOAD_START_TEST: 'load:start-test',
  LOAD_STOP_TEST: 'load:stop-test',
  LOAD_PROGRESS_STREAM: 'load:progress-stream',
  LOAD_COMPLETE: 'load:complete',
  AI_SEND_MESSAGE: 'ai:send-message',
  AI_APPLY_PATCH: 'ai:apply-patch',
  AI_ROLLBACK_PATCH: 'ai:rollback-patch',
  STORAGE_SAVE_KEY: 'storage:save-key',
  STORAGE_GET_KEY: 'storage:get-key',
  FS_GET_TREE: 'fs:get-tree',
  FS_READ_FILE: 'fs:read-file',
  FS_WRITE_FILE: 'fs:write-file',
  FS_OPEN_FOLDER: 'fs:open-folder',
  FS_OPEN_FILE: 'fs:open-file',
  FS_CREATE_ITEM: 'fs:create-item',
  FS_DELETE_ITEM: 'fs:delete-item',
  FS_RENAME_ITEM: 'fs:rename-item',
  FS_REVEAL_ITEM: 'fs:reveal-item',
  DEVTOOLS_TOGGLE: 'devtools:toggle',
  GIT_STATUS: 'git:status',
  GIT_INIT: 'git:init',
  GIT_STAGE: 'git:stage',
  GIT_UNSTAGE: 'git:unstage',
  GIT_COMMIT: 'git:commit',
  GIT_PUSH: 'git:push',
  GIT_PULL: 'git:pull',
  GIT_DIFF: 'git:diff',
  CDP_CONSOLE_OUTPUT: 'cdp:console-output',
  CDP_NETWORK_ENTRY: 'cdp:network-entry',
  EXTENSIONS_GET_LOCAL: 'extensions:get-local',
  EXTENSIONS_SEARCH_MARKETPLACE: 'extensions:search-marketplace',
  EXTENSIONS_READ_THEME: 'extensions:read-theme',
} as const;

const api: IElectronAPI = {
  // 1. Navigation & Viewport Sync
  navigate: (url: string) => ipcRenderer.invoke(CHANNELS.BROWSER_NAVIGATE, url),
  goBack: () => ipcRenderer.invoke(CHANNELS.BROWSER_GO_BACK),
  goForward: () => ipcRenderer.invoke(CHANNELS.BROWSER_GO_FORWARD),
  reload: () => ipcRenderer.invoke(CHANNELS.BROWSER_RELOAD),
  stopLoading: () => ipcRenderer.invoke(CHANNELS.BROWSER_STOP),
  syncViewportBounds: (bounds: ViewportBounds) => ipcRenderer.invoke(CHANNELS.BROWSER_SYNC_BOUNDS, bounds),
  setViewVisibility: (visible: boolean) => ipcRenderer.invoke(CHANNELS.BROWSER_SET_VISIBILITY, visible),
  setBrowserVisibility: (visible: boolean) => ipcRenderer.invoke(CHANNELS.BROWSER_SET_VISIBILITY, visible),
  captureScreenshot: () => ipcRenderer.invoke('browser:capture-screenshot'),
  executeWebJavaScript: (code: string) => ipcRenderer.invoke('browser:execute-js', code),
  onNavigationStateChanged: (callback: (state: NavigationState) => void) => {
    const handler = (_: any, state: NavigationState) => callback(state);
    ipcRenderer.on(CHANNELS.BROWSER_NAV_STATE_CHANGED, handler);
    return () => ipcRenderer.removeListener(CHANNELS.BROWSER_NAV_STATE_CHANGED, handler);
  },

  // 2. Responsive Device Emulation & Throttling
  setDeviceEmulation: (device: DevicePreset, customBounds?: { width: number; height: number }) =>
    ipcRenderer.invoke(CHANNELS.EMULATION_SET_DEVICE, { device, customBounds }),
  setNetworkThrottling: (profile: NetworkProfile) =>
    ipcRenderer.invoke(CHANNELS.EMULATION_SET_NETWORK, profile),

  // 3. Diagnostics & CDP Inspection Controls
  toggleElementInspectMode: (enabled: boolean) =>
    ipcRenderer.invoke(CHANNELS.CDP_TOGGLE_INSPECT, enabled),
  triggerGarbageCollection: () =>
    ipcRenderer.invoke(CHANNELS.CDP_TRIGGER_GC),
  runMemoryAudit: () =>
    ipcRenderer.invoke(CHANNELS.CDP_RUN_MEMORY_AUDIT),
  runFullSecurityAudit: () =>
    ipcRenderer.invoke(CHANNELS.CDP_RUN_SECURITY_AUDIT),
  onTelemetryReceived: (callback: (telemetry: DiagnosticTelemetry) => void) => {
    const handler = (_: any, telemetry: DiagnosticTelemetry) => callback(telemetry);
    ipcRenderer.on(CHANNELS.CDP_TELEMETRY_EMITTED, handler);
    return () => ipcRenderer.removeListener(CHANNELS.CDP_TELEMETRY_EMITTED, handler);
  },
  onNodeInspected: (callback: (nodeData: InspectedNodeInfo) => void) => {
    const handler = (_: any, nodeData: InspectedNodeInfo) => callback(nodeData);
    ipcRenderer.on(CHANNELS.CDP_NODE_INSPECTED, handler);
    return () => ipcRenderer.removeListener(CHANNELS.CDP_NODE_INSPECTED, handler);
  },

  // 4. Integrated Pseudo-Terminal (System Shell + PTY)
  createTerminalSession: (sessionId: string, cols: number, rows: number) =>
    ipcRenderer.invoke(CHANNELS.PTY_CREATE, { sessionId, cols, rows }),
  writeTerminalData: (sessionId: string, data: string) =>
    ipcRenderer.invoke(CHANNELS.PTY_WRITE, { sessionId, data }),
  resizeTerminalSession: (sessionId: string, cols: number, rows: number) =>
    ipcRenderer.invoke(CHANNELS.PTY_RESIZE, { sessionId, cols, rows }),
  destroyTerminalSession: (sessionId: string) =>
    ipcRenderer.invoke(CHANNELS.PTY_DESTROY, sessionId),
  onTerminalData: (callback: (sessionId: string, data: string) => void) => {
    const handler = (_: any, payload: { sessionId: string; data: string }) =>
      callback(payload.sessionId, payload.data);
    ipcRenderer.on(CHANNELS.PTY_DATA_STREAM, handler);
    return () => ipcRenderer.removeListener(CHANNELS.PTY_DATA_STREAM, handler);
  },

  // 5. Smart cURL / API Testing Engine
  executeApiRequest: (request: ApiRequest) =>
    ipcRenderer.invoke(CHANNELS.API_EXECUTE_REQUEST, request),
  onAgentProposedApiRequest: (callback: (request: ApiRequest) => void) => {
    const handler = (_: any, req: ApiRequest) => callback(req);
    ipcRenderer.on(CHANNELS.API_AGENT_PROPOSE_REQUEST, handler);
    return () => ipcRenderer.removeListener(CHANNELS.API_AGENT_PROPOSE_REQUEST, handler);
  },

  // 6. Concurrent Load Testing Engine
  startLoadTest: (config: LoadTestConfig) =>
    ipcRenderer.invoke(CHANNELS.LOAD_START_TEST, config),
  stopLoadTest: () =>
    ipcRenderer.invoke(CHANNELS.LOAD_STOP_TEST),
  onLoadTestProgress: (callback: (progress: LoadTestProgress) => void) => {
    const handler = (_: any, progress: LoadTestProgress) => callback(progress);
    ipcRenderer.on(CHANNELS.LOAD_PROGRESS_STREAM, handler);
    return () => ipcRenderer.removeListener(CHANNELS.LOAD_PROGRESS_STREAM, handler);
  },
  onLoadTestComplete: (callback: (summary: LoadTestSummary) => void) => {
    const handler = (_: any, summary: LoadTestSummary) => callback(summary);
    ipcRenderer.on(CHANNELS.LOAD_COMPLETE, handler);
    return () => ipcRenderer.removeListener(CHANNELS.LOAD_COMPLETE, handler);
  },

  // 7. AI Copilot (Gemini + Nemotron) & Atomic Disk Patcher
  sendCopilotMessage: (payload) =>
    ipcRenderer.invoke(CHANNELS.AI_SEND_MESSAGE, payload),
  applyFilePatch: (patch: FilePatch) =>
    ipcRenderer.invoke(CHANNELS.AI_APPLY_PATCH, patch),
  rollbackLastPatch: (backupId: string) =>
    ipcRenderer.invoke(CHANNELS.AI_ROLLBACK_PATCH, backupId),

  // 8. Secure Key Storage
  saveEncryptedKey: (keyName: string, keyValue: string) =>
    ipcRenderer.invoke(CHANNELS.STORAGE_SAVE_KEY, { keyName, keyValue }),
  getEncryptedKey: (keyName: string) =>
    ipcRenderer.invoke(CHANNELS.STORAGE_GET_KEY, keyName),

  // 9. Filesystem & In-App Monaco IDE
  getDirectoryTree: (subdir?: string) =>
    ipcRenderer.invoke(CHANNELS.FS_GET_TREE, subdir),
  readFile: (filePath: string) =>
    ipcRenderer.invoke(CHANNELS.FS_READ_FILE, filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke(CHANNELS.FS_WRITE_FILE, { filePath, content }),
  openFolderDialog: () =>
    ipcRenderer.invoke(CHANNELS.FS_OPEN_FOLDER),
  openFileDialog: () =>
    ipcRenderer.invoke(CHANNELS.FS_OPEN_FILE),
  createItem: (targetPath: string, isDirectory: boolean) =>
    ipcRenderer.invoke(CHANNELS.FS_CREATE_ITEM, { targetPath, isDirectory }),
  deleteItem: (targetPath: string) =>
    ipcRenderer.invoke(CHANNELS.FS_DELETE_ITEM, targetPath),
  renameItem: (oldPath: string, newPath: string) =>
    ipcRenderer.invoke(CHANNELS.FS_RENAME_ITEM, { oldPath, newPath }),
  revealInExplorer: (targetPath: string) =>
    ipcRenderer.invoke(CHANNELS.FS_REVEAL_ITEM, targetPath),
  toggleDevTools: () =>
    ipcRenderer.invoke(CHANNELS.DEVTOOLS_TOGGLE),

  // 10. Git Version Control
  gitStatus: () => ipcRenderer.invoke(CHANNELS.GIT_STATUS),
  gitInit: () => ipcRenderer.invoke(CHANNELS.GIT_INIT),
  gitStage: (filePath?: string) => ipcRenderer.invoke(CHANNELS.GIT_STAGE, filePath),
  gitUnstage: (filePath?: string) => ipcRenderer.invoke(CHANNELS.GIT_UNSTAGE, filePath),
  gitCommit: (message: string) => ipcRenderer.invoke(CHANNELS.GIT_COMMIT, message),
  gitPush: () => ipcRenderer.invoke(CHANNELS.GIT_PUSH),
  gitPull: () => ipcRenderer.invoke(CHANNELS.GIT_PULL),
  gitDiff: (filePath?: string) => ipcRenderer.invoke(CHANNELS.GIT_DIFF, filePath),

  // 11. Chrome DevTools Streams
  onConsoleOutput: (callback: (entry: any) => void) => {
    const handler = (_: any, entry: any) => callback(entry);
    ipcRenderer.on(CHANNELS.CDP_CONSOLE_OUTPUT, handler);
    return () => ipcRenderer.removeListener(CHANNELS.CDP_CONSOLE_OUTPUT, handler);
  },
  onNetworkEntry: (callback: (entry: any) => void) => {
    const handler = (_: any, entry: any) => callback(entry);
    ipcRenderer.on(CHANNELS.CDP_NETWORK_ENTRY, handler);
    return () => ipcRenderer.removeListener(CHANNELS.CDP_NETWORK_ENTRY, handler);
  },

  // 12. Window Frame Controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onWindowMaximizedChange: (callback: (isMax: boolean) => void) => {
    const handler = (_: any, isMax: boolean) => callback(isMax);
    ipcRenderer.on('window:maximized-change', handler);
    return () => ipcRenderer.removeListener('window:maximized-change', handler);
  },

  // 13. VS Code Extensions & Marketplace
  getLocalExtensions: () => ipcRenderer.invoke(CHANNELS.EXTENSIONS_GET_LOCAL),
  searchMarketplaceExtensions: (payload?: { query?: string; category?: string; size?: number }) =>
    ipcRenderer.invoke(CHANNELS.EXTENSIONS_SEARCH_MARKETPLACE, payload),
  readExtensionTheme: (themeFilePath: string) =>
    ipcRenderer.invoke(CHANNELS.EXTENSIONS_READ_THEME, themeFilePath),
};

try {
  contextBridge.exposeInMainWorld('electronAPI', api);
  console.log('[PRELOAD_DEBUG] Successfully exposed electronAPI via contextBridge!');
} catch (err: any) {
  console.error('[PRELOAD_DEBUG] contextBridge.exposeInMainWorld failed:', err);
}

try {
  (window as any).electronAPI = api;
  console.log('[PRELOAD_DEBUG] Assigned electronAPI directly to window!');
} catch (e) {}
