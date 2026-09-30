# Dev-Shell Master Architecture

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

## 3. End-to-End Diagnostic & Remediation Loop

1. **Chromium Native Event**
   (e.g., Unhandled Hydration Error / Detached DOM Node / Missing CSP Header / 3G Bundle Stalling)
   ⬇️
2. **CDP Domain Handlers (`src/main/cdp/*.ts`)**
   - Intercepts raw JSON payload via WebSocket debugger socket.
   - Resolves stack traces using source-map-js against local build directories.
   ⬇️
3. **Nemotron 3 Nano Stream Triage (Nebius Token Factory)**
   - High-speed classification. Drops normal HTTP/200 logs and benign noise.
   - Maps valid anomalies into strongly typed `DiagnosticTelemetry` objects.
   ⬇️
4. **Electron Main IPC Broadcast (`cdp:telemetry-emitted`)**
   - Telemetry delivered across isolated Preload bridge into Vue Pinia `telemetry-store`.
   - UI updates diagnostic counters in `DiagnosticsBadgeBar.vue` and injects contextual alert.
   ⬇️
5. **User Interaction / Autonomous Diagnostic Trigger**
   - Developer clicks "⚡ Fix with Nemotron" or inputs prompt in `DevChatSidebar.vue`.
   ⬇️
6. **Nemotron 3 Ultra Deep Reasoning Dispatch (Nebius Token Factory)**
   - Ingests sanitized telemetry, relevant source file contents (read via Node `fs`), and error traces.
   - Generates explanation and produces an atomic json-patch block.
   ⬇️
7. **Interactive Patch Review (`PatchCard.vue`)**
   - Side-by-side search/replace diff rendered inside the chat flow.
   - Developer clicks "⚡ Apply to Codebase".
   ⬇️
8. **Atomic Disk Patcher Execution (`src/main/patch-engine.ts`)**
   - Saves pristine backup of original file to `.devshell/backups/[timestamp]_[filename]`.
   - Executes atomic in-memory string replacement on local file.
   - Verifies string integrity and saves modified file via `fs.writeFileSync`.
   ⬇️
9. **Automatic Verification Loop**
   - Dev-Shell triggers live reload or re-evaluates CDP audit.
   - Badge updates from "Critical" to "Resolved". Backup remains restorable via 1-click Rollback.
