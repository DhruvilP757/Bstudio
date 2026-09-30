# Bstudio

> **AI-Native Autonomous Diagnostic Browser & IDE for Full-Stack Developers**

Bstudio consolidates the modern web development toolchain into a single, high-performance desktop application. Built on **Electron, Vue 3, and Vite**, it integrates native terminal sessions, an API testing workspace, direct Chrome DevTools Protocol (CDP) telemetry, an in-app Monaco code editor, and multi-tier AI reasoning powered by **NVIDIA Nemotron** (via Nebius Token Factory).

## Features

- **Unified Workspace:** Seamlessly use an integrated browser, in-app Monaco editor, terminal (`node-pty`), API tester, and AI Copilot side-by-side.
- **Zero MCP Overhead:** Bypasses Model Context Protocol complexities by executing native atomic search-and-replace patches directly on your disk via Electron's privileged Node.js main process.
- **Dual-Tier Model Routing:** 
  - *Nemotron 3 Nano:* High-speed stream filtering of CDP events to detect anomalies.
  - *Nemotron 3 Ultra:* Advanced code synthesis and architectural diagnostics for generating fixes.
- **Native Chromium CDP Insights:** Uses CDP (`v1.3`) for real-time monitoring of Security, Network, DOM, Memory, and Console errors.
- **Safe 1-Click Codebase Patching:** Generates atomic diffs applied straight to the local filesystem, protected by automatic pre-patch backups (`.devshell/backups/`) and a 1-click rollback feature.

## Documentation

- [DESIGN.md](DESIGN.md) - UI/UX Design System Specification (VS Code, JetBrains, Safari & Chrome inspired).
- [ARCHITECTURE.md](ARCHITECTURE.md) - System topology, multi-process architecture, and IPC design.
- [FILE_STRUCTURE.md](FILE_STRUCTURE.md) - Complete repository blueprint and file functions.

---

## Prerequisites

- **Windows:** Python 3.11+ and Visual Studio C++ Build Tools (Desktop development with C++)
- **Linux (Ubuntu/Debian):** `build-essential`, `python3`, `make`, `gcc`, `g++`, `libx11-dev`, `libxkbfile-dev`
- **Node.js:** v18 or v20

## Environment Setup

Create a `.env` file at the root of the project to authenticate against the Nebius Token Factory inference engine:

```env
NEBIUS_API_KEY=nvapi-your-nebius-token-factory-credential-here
NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1/
WORKSPACE_ROOT=/path/to/local/target/project
PORT=5173
```

## Installation & Build

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Rebuild Native Modules (Required for `node-pty` in Electron):**
   ```bash
   npm run rebuild:native
   ```
3. **Verify Nebius Model Connectivity (Optional pre-flight check):**
   ```bash
   node scripts/test-nebius.js
   ```

## Running the Application

To launch Dev-Shell in development mode:

```bash
npm run dev
```

This concurrently starts the Vite renderer (Vue 3) and the Electron Main Process.

## Packaging

To package the application into distributable binaries:
- **Windows:** `npm run package:win` (Generates NSIS installer & portable `.exe`)
- **Linux:** `npm run package:linux` (Generates AppImage & `.deb`)

---

## 5-Minute Hackathon Demo Script

1. **Launch & Show UI:** Open Dev-Shell and show the Omnibar, device toggles, node-pty terminal, and the diagnostic badge bar.
2. **Live Detection:** Navigate to your local buggy app. Emulate "Slow 3G". Watch the CDP catch a "Monolithic JavaScript Bundle" and an "SSR Hydration Mismatch" instantly in the diagnostic bar.
3. **AI Triage:** The Copilot feed (powered by Nemotron 3 Nano) analyzes the problem. Click "⚡ Fix with Nemotron" to escalate to Nemotron 3 Ultra.
4. **1-Click Patch & Verify:** View the side-by-side diff within the chat. Click "Apply to Codebase". Watch the file write locally and hot-reload fix the bug instantly.
5. **Concurrency Test:** Use the bottom drawer load testing studio to stress-test your backend, proving live latency metrics. Revert changes safely via the Rollback button.
