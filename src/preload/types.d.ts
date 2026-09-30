import { DiagnosticTelemetry, LoadTestConfig, LoadTestProgress, LoadTestSummary } from '../shared/telemetry-types';
import { FilePatch, PatchResult } from '../shared/patch-types';
import { ApiRequest, ApiResponse } from '../shared/api-tester-types';
import { NetworkProfile, DevicePreset, InspectedNodeInfo } from '../shared/cdp-types';
import { FileNode, FileContent } from '../shared/fs-types';
import { GitRepoStatus, GitActionResult, GitDiffResult } from '../shared/git-types';
import { DevToolsConsoleEntry, DevToolsNetworkEntry } from '../shared/devtools-types';

export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NavigationState {
  url: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  title: string;
  sslSecure: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  patch?: FilePatch;
  telemetryContext?: DiagnosticTelemetry[];
}

export interface ChatCompletionResponse {
  reply: string;
  patch?: FilePatch;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface IElectronAPI {
  // 1. Navigation & Viewport Sync
  navigate: (url: string) => Promise<void>;
  goBack: () => Promise<void>;
  goForward: () => Promise<void>;
  reload: () => Promise<void>;
  stopLoading: () => Promise<void>;
  syncViewportBounds: (bounds: ViewportBounds) => Promise<void>;
  setViewVisibility: (visible: boolean) => Promise<void>;
  setBrowserVisibility: (visible: boolean) => Promise<void>;
  captureScreenshot: () => Promise<string>;
  executeWebJavaScript: (code: string) => Promise<{ success: boolean; result?: any; error?: string }>;
  onNavigationStateChanged: (callback: (state: NavigationState) => void) => () => void;

  // 2. Responsive Device Emulation & Throttling
  setDeviceEmulation: (device: DevicePreset, customBounds?: { width: number; height: number }) => Promise<void>;
  setNetworkThrottling: (profile: NetworkProfile) => Promise<void>;

  // 3. Diagnostics & CDP Inspection Controls
  toggleElementInspectMode: (enabled: boolean) => Promise<void>;
  triggerGarbageCollection: () => Promise<void>;
  runMemoryAudit: () => Promise<void>;
  runFullSecurityAudit: () => Promise<void>;
  onTelemetryReceived: (callback: (telemetry: DiagnosticTelemetry) => void) => () => void;
  onNodeInspected: (callback: (nodeData: InspectedNodeInfo) => void) => () => void;

  // 4. Integrated Pseudo-Terminal (node-pty)
  createTerminalSession: (sessionId: string, cols: number, rows: number) => Promise<void>;
  writeTerminalData: (sessionId: string, data: string) => Promise<void>;
  resizeTerminalSession: (sessionId: string, cols: number, rows: number) => Promise<void>;
  destroyTerminalSession: (sessionId: string) => Promise<void>;
  onTerminalData: (callback: (sessionId: string, data: string) => void) => () => void;

  // 5. Smart cURL / API Testing Engine
  executeApiRequest: (request: ApiRequest) => Promise<ApiResponse>;
  onAgentProposedApiRequest: (callback: (request: ApiRequest) => void) => () => void;

  // 6. Concurrent Load Testing Engine
  startLoadTest: (config: LoadTestConfig) => Promise<void>;
  stopLoadTest: () => Promise<void>;
  onLoadTestProgress: (callback: (progress: LoadTestProgress) => void) => () => void;
  onLoadTestComplete: (callback: (summary: LoadTestSummary) => void) => () => void;

  // 7. Nemotron AI Copilot & Atomic Disk Patcher
  sendCopilotMessage: (payload: { prompt: string; history: ChatMessage[]; telemetryContext?: DiagnosticTelemetry[]; devtoolsContext?: any; model?: string; provider?: 'nebius' | 'gemini' }) => Promise<ChatCompletionResponse>;
  applyFilePatch: (patch: FilePatch) => Promise<PatchResult>;
  rollbackLastPatch: (backupId: string) => Promise<boolean>;

  // 8. Secure Key Storage (safeStorage)
  saveEncryptedKey: (keyName: string, keyValue: string) => Promise<boolean>;
  getEncryptedKey: (keyName: string) => Promise<string | null>;

  // 9. Filesystem & In-App Monaco IDE
  getDirectoryTree: (subdir?: string) => Promise<FileNode[]>;
  readFile: (filePath: string) => Promise<FileContent>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  openFolderDialog: () => Promise<{ canceled: boolean; folderPath?: string; folderName?: string }>;
  openFileDialog: () => Promise<{ canceled: boolean; filePath?: string; relativePath?: string; name?: string; content?: string }>;
  createItem: (targetPath: string, isDirectory: boolean) => Promise<{ success: boolean; error?: string }>;
  deleteItem: (targetPath: string) => Promise<{ success: boolean; error?: string }>;
  renameItem: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>;
  revealInExplorer: (targetPath: string) => Promise<{ success: boolean; error?: string }>;
  toggleDevTools: () => Promise<void>;

  // 10. Git Version Control
  gitStatus: () => Promise<GitRepoStatus>;
  gitInit: () => Promise<GitActionResult>;
  gitStage: (filePath?: string) => Promise<GitActionResult>;
  gitUnstage: (filePath?: string) => Promise<GitActionResult>;
  gitCommit: (message: string) => Promise<GitActionResult>;
  gitPush: () => Promise<GitActionResult>;
  gitPull: () => Promise<GitActionResult>;
  gitDiff: (filePath?: string) => Promise<GitDiffResult>;

  // 11. Chrome DevTools Streams
  onConsoleOutput: (callback: (entry: DevToolsConsoleEntry) => void) => () => void;
  onNetworkEntry: (callback: (entry: DevToolsNetworkEntry) => void) => () => void;

  // 12. Window Frame Controls
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<boolean>;
  closeWindow: () => Promise<void>;
  isWindowMaximized: () => Promise<boolean>;
  onWindowMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;

  // 13. VS Code Extensions & Marketplace
  getLocalExtensions: () => Promise<VscodeExtensionManifest[]>;
  searchMarketplaceExtensions: (payload?: { query?: string; category?: string; size?: number }) => Promise<VscodeExtensionManifest[]>;
  readExtensionTheme: (themeFilePath: string) => Promise<any>;
}

export interface VscodeExtensionManifest {
  id: string;
  name: string;
  displayName: string;
  publisher: string;
  version: string;
  description: string;
  categories: string[];
  category?: string;
  icon?: string | null;
  downloads?: string;
  rating?: number;
  installed: boolean;
  enabled: boolean;
  isLocal: boolean;
  folderPath?: string;
  downloadUrl?: string | null;
  verified?: boolean;
  contributes?: {
    themes?: any[];
    snippets?: any[];
    languages?: any[];
    commands?: any[];
    iconThemes?: any[];
  };
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
