# DOCUMENT 1 OF 6: MASTER ARCHITECTURE, SYSTEM TOPOLOGY, AND IPC CONTRACTS

**File Target:** `docs/01_MASTER_ARCHITECTURE_AND_SYSTEM_TOPOLOGY.md`

**Series Roadmap:**

* **Doc 1: Master Architecture, System Topology, and IPC Contracts** *(Current)*
* **Doc 2: Electron Main Process, WebContentsView Engine, and CDP Core**
* **Doc 3: The 7 Autonomous Diagnostic & Load Engines**
* **Doc 4: Nebius Token Factory, Nemotron Dual-Tier Routing, and Atomic File Patcher**
* **Doc 5: Vue 3 Renderer Workspace, Dev Chat Sidebar, and UI Components**
* **Doc 6: Build Tooling, Native Rebuild, Packaging, and Hackathon Execution Guide**

---

## 1. Executive System Overview & Design Philosophy

**Dev-Shell** is an AI-native desktop browser engineered specifically for full-stack software engineers. It bridges the critical divide between code authoring, live browser runtime execution, low-level DevTools diagnostics, and automated code remediation.

Traditional workflows force developers to bounce endlessly between an IDE (VS Code/Cursor), terminal windows, standalone API clients (Postman/Hoppscotch), and Chromium DevTools. Dev-Shell consolidates this entire toolchain into a single, high-performance desktop shell.

```
+----------------------------------------------------------------------------------------------------+
|                                    DEV-SHELL UNIFIED WORKSPACE                                     |
|                                                                                                    |
|  +------------------------------------------------------+  +------------------------------------+  |
|  |                   BROWSER CHROME                     |  |         DEV COPILOT SIDEBAR        |  |
|  | [Tabs] [Omnibar / URL] [Device Matrix] [Diagnostics] |  |                                    |  |
|  +------------------------------------------------------+  | - Live CDP Telemetry Stream        |  |
|  |                                                      |  | - Autonomous Vulnerability Feed    |  |
|  |                  LIVE WEB VIEW                       |  | - Nemotron 3 Reasoning Engine     |  |
|  |               (WebContentsView)                      |  | - Interactive Side-by-Side Diffs   |  |
|  |                                                      |  | - 1-Click "⚡ Apply to Codebase"   |  |
|  |                                                      |  | - BYOK Conversational Chat         |  |
|  +------------------------------------------------------+  |                                    |  |
|  |                 DRAWER WORKSPACES                    |  |                                    |  |
|  |  [xterm.js Terminal]   [Smart cURL API Tester]       |  |                                    |  |
|  |  [Memory Profiler]     [Load Testing Studio]         |  |                                    |  |
|  +------------------------------------------------------+  +------------------------------------+  |
+----------------------------------------------------------------------------------------------------+

```

### Architectural Axioms

1. **Zero Model Context Protocol (MCP) Overhead:** MCP introduces external stdio process spawning, JSON-RPC connection handshakes, and serialization overhead that add critical points of failure during live environments. Dev-Shell eliminates MCP entirely. The Electron Main Process operates as a secure, privileged Node.js runtime that performs atomic search-and-replace operations directly on disk with zero intermediaries.
2. **Dual-Tier Model Routing (NVIDIA Nemotron via Nebius Token Factory):** High-frequency telemetry streams cannot be pumped directly into massive frontier models without exhausting rate limits and budgets. Dev-Shell uses **Nemotron 3 Nano** as a high-speed, local-latency triage filter for continuous CDP event filtering, and escalates complex system repairs to **Nemotron 3 Ultra** for deep code synthesis and architectural fixes.
3. **Native Chromium Subsystems via CDP:** Dev-Shell does not simulate or scrape web pages via DOM injections. It establishes direct native sockets via the Chrome DevTools Protocol (`1.3`) to access low-level engine domains (`Security`, `Network`, `DOM`, `Overlay`, `Runtime`, `HeapProfiler`, and `Performance`).
4. **Hardware Occlusion Safety:** Electron's modern `WebContentsView` is a native Win32/X11/Cocoa surface that renders on top of the web contents. Dev-Shell enforces dynamic coordinate translation between Vue 3 DOM anchor elements and native OS view coordinates to eliminate layout collisions.

---

## 2. Process Model & System Topology

Dev-Shell operates on a multi-process architecture strictly separated by operating system privileges:

```
                                      +---------------------------------------------+
                                      |     NVIDIA NEMOTRON INFERENCE PIPELINE      |
                                      |         (Nebius Token Factory Cloud)        |
                                      +----------------------+----------------------+
                                                             ^
                                        HTTPS (OpenAI SDK)   |  Streaming JSON Patches
                                                             v
+--------------------------------------------------------------------------------------------------------------------+
|                                           ELECTRON MAIN PROCESS (Privileged Node.js)                               |
|                                                                                                                    |
|  +------------------------+  +------------------------+  +------------------------+  +--------------------------+  |
|  |    View Coordinator    |  |     CDP Multiplexer    |  |      PTY Manager       |  |    Atomic Patch Engine   |  |
|  | (WebContentsView Bounds|  | (Security, DOM, Net,   |  | (node-pty C++ Addon,   |  | (fs, Diff Verifier,      |  |
|  |  & Native Window Tree) |  |  Memory, Log, Heap)    |  |  Session Lifecycle)    |  |  .devshell/backups/)     |  |
|  +-----------+------------+  +-----------+------------+  +-----------+------------+  +------------+-------------+  |
|              |                           |                           |                            |                |
|              |                           |                           |                            |                |
|  +-----------v---------------------------v---------------------------v----------------------------v-------------+  |
|  |                                  Secure IPC Router & safeStorage Subsystem                                   |  |
|  +-------------------------------------------------------+------------------------------------------------------+  |
+----------------------------------------------------------|---------------------------------------------------------+
                                                           |
                                  Typed contextBridge IPC  | (Bidirectional Events & Handshakes)
                                                           v
+--------------------------------------------------------------------------------------------------------------------+
|                                     VUE 3 RENDERER PROCESS (Chromium Sandbox UI)                                   |
|                                                                                                                    |
|  +----------------------------------------------------+  +------------------------------------------------------+  |
|  |                 BROWSER WORKSPACE                  |  |                 DEV COPILOT WORKSPACE                |  |
|  | - Pinia State Stores (telemetry, terminal, browser)|  | - DevChatSidebar.vue (Telemetry Feed & Streamed Chat)|  |
|  | - ViewportAnchor.vue (Layout boundary tracking)   |  | - PatchCard.vue (Interactive Diff Inspector)          |  |
|  | - TerminalPanel.vue (xterm.js + WebLinks + Fit)    |  | - ModelSelector.vue (Nano vs. Ultra Manual Override) |  |
|  | - SmartCurlPanel.vue (Visual Request / HITL Gate)  |  | - SystemVulnerabilityBanner.vue (Auto Diagnostics)   |  |
|  +----------------------------------------------------+  +------------------------------------------------------+  |
+--------------------------------------------------------------------------------------------------------------------+
                                                           ^
                                                           | IPC Dispatch
                                                           v
+--------------------------------------------------------------------------------------------------------------------+
|                                      BACKGROUND LOAD ENGINE (Worker Threads Pool)                                  |
|                                                                                                                    |
|  +---------------------------------------------------------------------------------------------------------------+ |
|  | Worker 1 ... Worker N: Isolated Node.js HTTP/HTTPS pipelined virtual users executing concurrent load profiles | |
|  +---------------------------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------------------------------+

```

---

## 3. Comprehensive Repository Blueprint

```text
dev-shell/
├── .env.example                                # Template for NEBIUS_API_KEY, BASE_URL, PORT
├── .gitignore                                  # Ignores node_modules, dist, release, .devshell/
├── package.json                                # Scripts, Electron version, dependencies, rebuild rules
├── electron-builder.yml                        # Native compilation, packaging, and installer configs
├── vite.config.ts                              # Vite configuration for Vue 3 renderer build
├── tsconfig.json                               # Root TypeScript project references
├── tsconfig.node.json                          # Main process TypeScript configuration
├── tsconfig.web.json                           # Renderer process TypeScript configuration
├── src/
│   ├── shared/                                 # Cross-process shared types, interfaces, schemas
│   │   ├── cdp-types.ts                        # CDP events, domains, and extracted metrics
│   │   ├── telemetry-types.ts                  # Unified 7-domain diagnostic payload structures
│   │   ├── patch-types.ts                      # JSON-patch contract, file diff representations
│   │   ├── terminal-types.ts                   # Terminal session states and resize payloads
│   │   ├── api-tester-types.ts                 # Smart cURL request/response schemas
│   │   └── ipc-channels.ts                     # Strict string constants for all IPC channels
│   │
│   ├── main/                                   # Electron Main Process (Privileged Node.js)
│   │   ├── index.ts                            # Application entry point, single-instance lock
│   │   ├── view-manager.ts                     # WebContentsView lifecycle & coordinate translation
│   │   ├── secure-storage.ts                   # Native safeStorage key-value encryption
│   │   ├── patch-engine.ts                     # Atomic search-and-replace file modifier with backup
│   │   ├── nemotron-client.ts                  # Nebius Token Factory SDK (Nano & Ultra clients)
│   │   ├── cdp/                                # Chrome DevTools Protocol Diagnostic Engines
│   │   │   ├── cdp-core.ts                     # WebSocket debugger attachment & dispatcher
│   │   │   ├── element-inspector.ts            # Domain 1: DOM, overlay inspection, z-index, box model
│   │   │   ├── cdn-xml-sentinel.ts             # Domain 2: CDN SRI hash validator & XML/SVG parser
│   │   │   ├── console-sentinel.ts             # Domain 3: Runtime error catcher & source-map resolver
│   │   │   ├── network-throttler.ts            # Domain 4: Network conditions & waterfall profiler
│   │   │   ├── memory-profiler.ts              # Domain 6: HeapProfiler, GC, detached DOM detector
│   │   │   └── security-auditor.ts             # Domain 7: CSP, HSTS, CORS, and header analyzer
│   │   ├── load-tester/                        # Domain 5: Concurrent Load Engine
│   │   │   ├── load-orchestrator.ts            # Worker thread pool coordinator & stats accumulator
│   │   │   └── load-worker.ts                  # Raw worker thread executing pipelined HTTP requests
│   │   ├── terminal/
│   │   │   └── pty-manager.ts                  # node-pty shell spawning, resizing, and streaming
│   │   └── ipc/
│   │       ├── register-browser-ipc.ts         # Navigation, tab switching, and bound updating
│   │       ├── register-cdp-ipc.ts             # Throttling triggers, inspect modes, GC triggers
│   │       ├── register-terminal-ipc.ts        # PTY create, write, resize, destroy
│   │       ├── register-ai-ipc.ts              # Chat requests, patch approvals, rollback commands
│   │       └── register-storage-ipc.ts         # Encrypted key storage read/write
│   │
│   ├── preload/                                # Isolation Bridge Layer
│   │   ├── index.ts                            # contextBridge implementation exposing window.electronAPI
│   │   └── types.d.ts                          # Global ambient declaration for window.electronAPI
│   │
│   └── renderer/                               # Vue 3 Single Page Application (Sandboxed)
│       ├── index.html                          # Entry HTML shell mounting Vue
│       ├── src/
│       │   ├── main.ts                         # Vue initialization, Pinia mounting, icon imports
│       │   ├── App.vue                         # Master UI Grid (Chrome, Anchor, Drawers, Sidebar)
│       │   ├── stores/                         # Pinia Reactive Stores
│       │   │   ├── browser-store.ts            # Tabs, current URL, canGoBack, canGoForward, bounds
│       │   │   ├── telemetry-store.ts          # Consolidated state for all 7 diagnostic domains
│       │   │   ├── chat-store.ts               # Messages, streaming tokens, proposed patches
│       │   │   ├── terminal-store.ts           # PTY active sessions, open tabs, focus state
│       │   │   ├── api-tester-store.ts         # Active request, response history, HITL queue
│       │   │   └── load-tester-store.ts        # Concurrency params, real-time latency chart state
│       │   ├── components/
│       │   │   ├── chrome/                     # Browser Header Components
│       │   │   │   ├── TabBar.vue              # Native-styled tab bar with add/close controls
│       │   │   │   ├── Omnibar.vue             # URL input, reload, back, forward, SSL badge
│       │   │   │   ├── DeviceMatrixToolbar.vue # Responsive toggles (Mobile, Tablet, Desktop)
│       │   │   │   └── DiagnosticsBadgeBar.vue # Visual status counters for all 7 domains
│       │   │   ├── viewport/
│       │   │   │   └── ViewportAnchor.vue      # Empty DOM element tracked by ResizeObserver
│       │   │   ├── drawers/                    # Bottom Collapsible Drawers
│       │   │   │   ├── DrawerContainer.vue     # Resizable tabbed bottom drawer container
│       │   │   │   ├── TerminalPanel.vue       # xterm.js instance with FitAddon
│       │   │   │   ├── SmartCurlPanel.vue      # Visual HTTP runner with JSON editor & HITL gate
│       │   │   │   ├── MemoryProfilerView.vue  # Heap metrics, GC button, detached nodes table
│       │   │   │   └── LoadTesterStudio.vue    # Virtual user sliders, latency percentile graphs
│       │   │   ├── chat/                       # Right AI Assistant Sidebar
│       │   │   │   ├── DevChatSidebar.vue      # Root sidebar container, message feed, input box
│       │   │   │   ├── TelemetryContextPill.vue# Collapsible chip showing live attached telemetry
│       │   │   │   ├── ChatMessageItem.vue     # Markdown message renderer with syntax highlight
│       │   │   │   ├── PatchCard.vue           # Side-by-side search/replace diff with 1-click apply
│       │   │   │   └── RollbackBanner.vue      # Notice indicating previous backup is restorable
│       │   │   └── modals/
│       │   │       ├── ApiKeySettingsModal.vue # Secure entry modal for Nebius and custom BYOK keys
│       │   │       └── DiffViewerModal.vue     # Full-screen Monaco diff viewer for complex patches
│       │   └── assets/
│       │       ├── styles/
│       │       │   ├── main.css                # Tailwind imports, custom scrollbars, CSS variables
│       │       │   └── xterm.css               # xterm.js native styling overrides
│       │       └── icons/                      # Custom SVG icons for DevTools and AI states

```

---

## 4. Hardware Occlusion & Viewport Coordinate Synchronization

Electron's `WebContentsView` is instantiated in the Main Process and rendered directly by Chromium's compositor as a native platform view. It exists outside the HTML DOM of the Vue application.

If unmanaged:

* The native view will paint over any Vue HTML modal, dropdown, omnibar autocomplete list, or bottom drawer.
* Resizing the application window will cause visible latency, tearing, or misalignment between the Vue navigation headers and the loaded web page.

### The Dynamic Anchor Synchronization Protocol

```
+----------------------------------------------------------------------------------------------------+
|                                    RENDERER: ViewportAnchor.vue                                    |
|                                                                                                    |
|  1. Component mounts `<div id="viewport-anchor" class="w-full h-full"></div>`                      |
|  2. Instantiates ResizeObserver on `#viewport-anchor`                                              |
|  3. On resize/scroll: anchorEl.getBoundingClientRect() -> { x, y, width, height }                   |
|  4. Applies window.devicePixelRatio multiplier to convert CSS pixels to physical device pixels     |
|  5. Dispatches IPC: `browser:sync-viewport-bounds`                                                 |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  | IPC: browser:sync-viewport-bounds
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                      MAIN: ViewManager.ts                                          |
|                                                                                                    |
|  1. Receives raw coordinates: { x, y, width, height }                                              |
|  2. Clamps coordinates against mainWindow bounds to avoid negative/overflow dimensions             |
|  3. Invokes: `webContentsView.setBounds({ x: Math.round(x), y: Math.round(y), ... })`            |
|  4. If a modal or full-screen drawer opens in Vue:                                                 |
|     - Vue dispatches: `browser:set-view-visibility(false)`                                         |
|     - Main invokes: `webContentsView.setVisible(false)`                                            |
|  5. On modal close: `webContentsView.setVisible(true)`                                            |
+----------------------------------------------------------------------------------------------------+

```

### Coordinate Math Implementation Specification

```typescript
// Shared logic for coordinate calculation
export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeNativeBounds(
  anchorRect: DOMRect,
  windowScaleFactor: number = 1.0
): ViewportBounds {
  return {
    x: Math.max(0, Math.floor(anchorRect.x * windowScaleFactor)),
    y: Math.max(0, Math.floor(anchorRect.y * windowScaleFactor)),
    width: Math.max(100, Math.floor(anchorRect.width * windowScaleFactor)),
    height: Math.max(100, Math.floor(anchorRect.height * windowScaleFactor))
  };
}

```

---

## 5. Unified Preload IPC Contract (`window.electronAPI`)

The Preload layer establishes a cryptographically secure, isolated communication boundary. Remote code execution is strictly prohibited by setting `contextIsolation: true` and `nodeIntegration: false`.

### TypeScript Interface Definition (`src/preload/types.d.ts`)

```typescript
import { DiagnosticTelemetry } from '../shared/telemetry-types';
import { FilePatch, PatchResult } from '../shared/patch-types';
import { ApiRequest, ApiResponse } from '../shared/api-tester-types';
import { LoadTestConfig, LoadTestProgress, LoadTestSummary } from '../shared/telemetry-types';

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
  // ==========================================
  // 1. Browser Navigation & Viewport Sync
  // ==========================================
  navigate: (url: string) => Promise<void>;
  goBack: () => Promise<void>;
  goForward: () => Promise<void>;
  reload: () => Promise<void>;
  stopLoading: () => Promise<void>;
  syncViewportBounds: (bounds: ViewportBounds) => Promise<void>;
  setViewVisibility: (visible: boolean) => Promise<void>;
  onNavigationStateChanged: (callback: (state: NavigationState) => void) => () => void;

  // ==========================================
  // 2. Responsive Device Emulation
  // ==========================================
  setDeviceEmulation: (device: 'desktop' | 'tablet' | 'mobile' | 'responsive', customBounds?: { width: number; height: number }) => Promise<void>;
  setNetworkThrottling: (profile: 'online' | 'fast-3g' | 'slow-3g' | 'offline') => Promise<void>;

  // ==========================================
  // 3. Diagnostics & CDP Inspection Controls
  // ==========================================
  toggleElementInspectMode: (enabled: boolean) => Promise<void>;
  triggerGarbageCollection: () => Promise<void>;
  runMemoryAudit: () => Promise<void>;
  runFullSecurityAudit: () => Promise<void>;
  onTelemetryReceived: (callback: (telemetry: DiagnosticTelemetry) => void) => () => void;
  onNodeInspected: (callback: (nodeData: any) => void) => () => void;

  // ==========================================
  // 4. Integrated Pseudo-Terminal (node-pty)
  // ==========================================
  createTerminalSession: (sessionId: string, cols: number, rows: number) => Promise<void>;
  writeTerminalData: (sessionId: string, data: string) => Promise<void>;
  resizeTerminalSession: (sessionId: string, cols: number, rows: number) => Promise<void>;
  destroyTerminalSession: (sessionId: string) => Promise<void>;
  onTerminalData: (callback: (sessionId: string, data: string) => void) => () => void;

  // ==========================================
  // 5. Smart cURL / API Testing Engine
  // ==========================================
  executeApiRequest: (request: ApiRequest) => Promise<ApiResponse>;
  onAgentProposedApiRequest: (callback: (request: ApiRequest) => void) => () => void;

  // ==========================================
  // 6. Concurrent Load Testing Engine
  // ==========================================
  startLoadTest: (config: LoadTestConfig) => Promise<void>;
  stopLoadTest: () => Promise<void>;
  onLoadTestProgress: (callback: (progress: LoadTestProgress) => void) => () => void;
  onLoadTestComplete: (callback: (summary: LoadTestSummary) => void) => () => void;

  // ==========================================
  // 7. Nemotron AI Copilot & Atomic Disk Patcher
  // ==========================================
  sendCopilotMessage: (payload: { prompt: string; history: ChatMessage[]; telemetryContext?: DiagnosticTelemetry[] }) => Promise<ChatCompletionResponse>;
  applyFilePatch: (patch: FilePatch) => Promise<PatchResult>;
  rollbackLastPatch: (backupId: string) => Promise<boolean>;

  // ==========================================
  // 8. Secure Key Storage (safeStorage)
  // ==========================================
  saveEncryptedKey: (keyName: string, keyValue: string) => Promise<boolean>;
  getEncryptedKey: (keyName: string) => Promise<string | null>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

```

---

## 6. IPC Channel Enumeration & Type Safety

To prevent string drift and runtime message drops across process boundaries, all IPC communication is restricted to the strict `IPC_CHANNELS` constant object.

### Implementation Specification (`src/shared/ipc-channels.ts`)

```typescript
export const IPC_CHANNELS = {
  // Navigation & Viewport
  BROWSER_NAVIGATE: 'browser:navigate',
  BROWSER_GO_BACK: 'browser:go-back',
  BROWSER_GO_FORWARD: 'browser:go-forward',
  BROWSER_RELOAD: 'browser:reload',
  BROWSER_STOP: 'browser:stop',
  BROWSER_SYNC_BOUNDS: 'browser:sync-bounds',
  BROWSER_SET_VISIBILITY: 'browser:set-visibility',
  BROWSER_NAV_STATE_CHANGED: 'browser:nav-state-changed',

  // Emulation & Conditions
  EMULATION_SET_DEVICE: 'emulation:set-device',
  EMULATION_SET_NETWORK: 'emulation:set-network',

  // Diagnostics & CDP
  CDP_TOGGLE_INSPECT: 'cdp:toggle-inspect',
  CDP_TRIGGER_GC: 'cdp:trigger-gc',
  CDP_RUN_MEMORY_AUDIT: 'cdp:run-memory-audit',
  CDP_RUN_SECURITY_AUDIT: 'cdp:run-security-audit',
  CDP_TELEMETRY_EMITTED: 'cdp:telemetry-emitted',
  CDP_NODE_INSPECTED: 'cdp:node-inspected',

  // Terminal PTY
  PTY_CREATE: 'pty:create',
  PTY_WRITE: 'pty:write',
  PTY_RESIZE: 'pty:resize',
  PTY_DESTROY: 'pty:destroy',
  PTY_DATA_STREAM: 'pty:data-stream',

  // API Tester
  API_EXECUTE_REQUEST: 'api:execute-request',
  API_AGENT_PROPOSE_REQUEST: 'api:agent-propose-request',

  // Load Engine
  LOAD_START_TEST: 'load:start-test',
  LOAD_STOP_TEST: 'load:stop-test',
  LOAD_PROGRESS_STREAM: 'load:progress-stream',
  LOAD_COMPLETE: 'load:complete',

  // AI & Patching
  AI_SEND_MESSAGE: 'ai:send-message',
  AI_APPLY_PATCH: 'ai:apply-patch',
  AI_ROLLBACK_PATCH: 'ai:rollback-patch',

  // Secure Storage
  STORAGE_SAVE_KEY: 'storage:save-key',
  STORAGE_GET_KEY: 'storage:get-key',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

```

---

## 7. Core Telemetry & Patch Data Schemas

These TypeScript contracts form the communication backbone between native Chromium CDP hooks, the Nemotron reasoning pipeline, and the Vue renderer.

### Implementation Specification (`src/shared/telemetry-types.ts`)

```typescript
export type DiagnosticDomain = 
  | 'element' 
  | 'cdn-xml' 
  | 'console' 
  | 'network' 
  | 'load' 
  | 'memory' 
  | 'security';

export type DiagnosticSeverity = 'info' | 'warning' | 'critical';

export interface DiagnosticTelemetry {
  id: string;
  domain: DiagnosticDomain;
  severity: DiagnosticSeverity;
  timestamp: number;
  title: string;
  summary: string;
  technicalDetails: {
    url?: string;
    nodeId?: number;
    selector?: string;
    outerHtml?: string;
    stackTrace?: string;
    unresolvedSourceLine?: string;
    resolvedSourceFile?: string;
    resolvedSourceLine?: number;
    metrics?: Record<string, number | string>;
    headers?: Record<string, string>;
    rawPayload?: any;
  };
  suggestedAction?: {
    label: string;
    description: string;
    promptToCopilot: string;
  };
}

export interface LoadTestConfig {
  targetUrl: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  virtualUsers: number;    // Range: 1 to 200
  durationSeconds: number; // Range: 5 to 60
  timeoutMs: number;       // Default: 5000ms
}

export interface LoadTestProgress {
  elapsedSeconds: number;
  currentRps: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  currentP95Ms: number;
}

export interface LoadTestSummary {
  totalRequests: number;
  successRatePercentage: number;
  requestsPerSecond: number;
  latencies: {
    minMs: number;
    maxMs: number;
    avgMs: number;
    p50Ms: number;
    p90Ms: number;
    p95Ms: number;
    p99Ms: number;
  };
  statusCodeDistribution: Record<number, number>;
  failureReasons: Record<string, number>;
}

```

### Implementation Specification (`src/shared/patch-types.ts`)

```typescript
export interface FilePatch {
  id: string;
  filePath: string;         // Relative to workspace root, e.g. "src/components/Header.vue"
  searchBlock: string;      // The EXACT block of code to match on disk
  replaceBlock: string;     // The new replacement code block
  rationale: string;        // Nemotron 3 Ultra explanation for why this edit fixes the bug
  targetDomain: 'element' | 'cdn-xml' | 'console' | 'network' | 'load' | 'memory' | 'security';
}

export interface PatchResult {
  success: boolean;
  backupId?: string;
  backupFilePath?: string;
  error?: string;
  modifiedFilePath?: string;
}

export interface PatchBackupRecord {
  backupId: string;
  originalFilePath: string;
  backupLocation: string;
  timestamp: number;
  searchBlock: string;
  replaceBlock: string;
}

```

---

## 8. End-to-End Diagnostic & Remediation Loop

```
  1. Chromium Native Event
     (e.g., Unhandled Hydration Error / Detached DOM Node / Missing CSP Header / 3G Bundle Stalling)
         │
         ▼
  2. CDP Domain Handlers (src/main/cdp/*.ts)
     - Intercepts raw JSON payload via WebSocket debugger socket.
     - Resolves stack traces using source-map-js against local build directories.
         │
         ▼
  3. Nemotron 3 Nano Stream Triage (Nebius Token Factory)
     - High-speed classification. Drops normal HTTP/200 logs and benign noise.
     - Maps valid anomalies into strongly typed `DiagnosticTelemetry` objects.
         │
         ▼
  4. Electron Main IPC Broadcast (`cdp:telemetry-emitted`)
     - Telemetry delivered across isolated Preload bridge into Vue Pinia `telemetry-store`.
     - UI updates diagnostic counters in `DiagnosticsBadgeBar.vue` and injects contextual alert.
         │
         ▼
  5. User Interaction / Autonomous Diagnostic Trigger
     - Developer clicks "⚡ Fix with Nemotron" or inputs prompt in `DevChatSidebar.vue`.
         │
         ▼
  6. Nemotron 3 Ultra Deep Reasoning Dispatch (Nebius Token Factory)
     - Ingests sanitized telemetry, relevant source file contents (read via Node `fs`), and error traces.
     - Generates explanation and produces an atomic ````json-patch```` block.
         │
         ▼
  7. Interactive Patch Review (`PatchCard.vue`)
     - Side-by-side search/replace diff rendered inside the chat flow.
     - Developer clicks "⚡ Apply to Codebase".
         │
         ▼
  8. Atomic Disk Patcher Execution (`src/main/patch-engine.ts`)
     - Saves pristine backup of original file to `.devshell/backups/[timestamp]_[filename]`.
     - Executes atomic in-memory string replacement on local file.
     - Verifies string integrity and saves modified file via `fs.writeFileSync`.
         │
         ▼
  9. Automatic Verification Loop
     - Dev-Shell triggers live reload or re-evaluates CDP audit.
     - Badge updates from "Critical" to "Resolved". Backup remains restorable via 1-click Rollback.

```

---

*This concludes Document 1. Document 2 covers the complete implementation of the Electron Main Process, WebContentsView layout math, and the native Chrome DevTools Protocol core.*