# Dev-Shell File Structure

This document outlines the comprehensive repository blueprint for Dev-Shell, an AI-native desktop browser for full-stack developers.

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
