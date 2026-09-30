# DOCUMENT 6 OF 6: BUILD TOOLING, NATIVE REBUILD, PACKAGING, AND HACKATHON EXECUTION GUIDE

**File Target:** `docs/06_BUILD_TOOLING_NATIVE_REBUILD_PACKAGING_AND_HACKATHON_GUIDE.md`

**Series Roadmap:**

* **Doc 1: Master Architecture, System Topology, and IPC Contracts** *(Completed)*
* **Doc 2: Electron Main Process, WebContentsView Engine, and CDP Core** *(Completed)*
* **Doc 3: The 7 Autonomous Diagnostic & Load Engines** *(Completed)*
* **Doc 4: Nebius Token Factory, Nemotron Dual-Tier Routing, and Atomic File Patcher** *(Completed)*
* **Doc 5: Vue 3 Renderer Workspace, Dev Chat Sidebar, and UI Components** *(Completed)*
* **Doc 6: Build Tooling, Native Rebuild, Packaging, and Hackathon Execution Guide** *(Current)*

---

## 1. Master Dependency Configuration (`package.json`)

Dev-Shell integrates Node.js native C++ bindings (`node-pty`), Chromium runtime controls, the Vue 3 Vite compiler, and the Nebius Token Factory SDK.

```json
{
  "name": "dev-shell",
  "version": "1.0.0",
  "description": "AI-Native Autonomous Diagnostic Browser for Full-Stack Developers",
  "main": "dist/main/index.js",
  "author": "Dev-Shell Team",
  "license": "MIT",
  "scripts": {
    "clean": "rimraf dist release",
    "compile:main": "tsc -p tsconfig.node.json",
    "compile:renderer": "vite build",
    "build": "npm run clean && npm run compile:renderer && npm run compile:main",
    "rebuild:native": "electron-rebuild -f -w node-pty",
    "postinstall": "npm run rebuild:native",
    "dev:renderer": "vite",
    "dev:main": "tsc -p tsconfig.node.json --watch",
    "dev": "cross-env NODE_ENV=development concurrently -k \"npm run dev:renderer\" \"wait-on tcp:5173 && electron dist/main/index.js\"",
    "package:dir": "npm run build && electron-builder --dir",
    "package:linux": "npm run build && electron-builder --linux AppImage deb",
    "package:win": "npm run build && electron-builder --win nsis portable"
  },
  "dependencies": {
    "@xterm/addon-fit": "^0.8.0",
    "@xterm/addon-web-links": "^0.9.0",
    "@xterm/xterm": "^5.5.0",
    "dotenv": "^16.4.5",
    "node-pty": "^1.0.2",
    "openai": "^4.56.0",
    "pinia": "^2.2.2",
    "source-map-js": "^1.2.0",
    "vue": "^3.4.38"
  },
  "devDependencies": {
    "@electron/rebuild": "^3.6.0",
    "@types/node": "^20.14.14",
    "@types/node-pty": "^0.7.32",
    "@vitejs/plugin-vue": "^5.1.2",
    "autoprefixer": "^10.4.20",
    "concurrently": "^8.2.2",
    "cross-env": "^7.0.3",
    "electron": "^31.3.1",
    "electron-builder": "^24.13.3",
    "postcss": "^8.4.41",
    "rimraf": "^6.0.1",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.5.4",
    "vite": "^5.4.1",
    "wait-on": "^7.2.0"
  }
}

```

---

## 2. Native C++ Rebuild Pipeline (`node-pty` vs Electron ABI)

Standard npm installation compiles native C++ modules against the host machine's Node.js Application Binary Interface (ABI). Electron bundles a custom, modified Node.js runtime with a different ABI version. Running `node-pty` without recompilation causes an immediate native runtime panic on startup:

```text
Error: The module '\\?\...\node_modules\node-pty\build\Release\pty.node'
was compiled against a different Node.js version using NODE_MODULE_VERSION 115.
This version of Electron requires NODE_MODULE_VERSION 125.

```

### Resolution Strategy

1. **Prerequisites Checklist:**
* **Windows:** Install Python 3.11+ and Visual Studio C++ Build Tools (`Desktop development with C++`).
* **Linux (Ubuntu/Debian):** Install essential build packages:
```bash
sudo apt-get update && sudo apt-get install -y build-essential python3 make gcc g++ libx11-dev libxkbfile-dev

```




2. **Rebuild Execution:**
The `package.json` file configures `@electron/rebuild` via the `postinstall` hook. To trigger manual recompilation targeting the exact installed Electron version:
```bash
npx @electron/rebuild -f -w node-pty -v 31.3.1

```


3. **Verification Command:**
Assert that the compiled `.node` binary matches the active Electron header definitions:
```bash
node -e "console.log('Host Node ABI:', process.versions.modules)"
npx electron -e "console.log('Electron Node ABI:', process.versions.modules)"

```



---

## 3. Build & Compiler Pipeline Configurations

### Vite Configuration (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import * as path from 'path';

export default defineConfig({
  plugins: [vue()],
  root: path.resolve(__dirname, 'src/renderer'),
  base: './', // Enforce relative asset paths for packaged file:// protocols
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/renderer/index.html')
    }
  },
  server: {
    port: 5173,
    strictPort: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer/src'),
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  }
});

```

### TypeScript Configurations

#### Root Config (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}

```

#### Main Process Config (`tsconfig.node.json`)

```json
{
  "compilerOptions": {
    "composite": true,
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "./dist/main",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/main/**/*", "src/preload/**/*", "src/shared/**/*"]
}

```

---

## 4. Production Packaging (`electron-builder.yml`)

The packager must exclude development source trees while including native `.node` binaries for `node-pty`.

```yaml
appId: com.devshell.browser
productName: Dev-Shell
copyright: Copyright © 2026 Dev-Shell Architecture Team
directories:
  output: release
  buildResources: build

files:
  - "dist/**/*"
  - "node_modules/node-pty/build/Release/*"
  - "node_modules/node-pty/package.json"
  - "node_modules/node-pty/lib/**/*"
  - "package.json"

asar: true
asarUnpack:
  - "**/node_modules/node-pty/build/Release/*"

linux:
  target:
    - AppImage
    - deb
  category: Development
  synopsis: AI-Native Autonomous Diagnostic Browser for Full-Stack Developers
  maintainer: devshell-core@example.com

win:
  target:
    - nsis
    - portable
  icon: build/icon.ico

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true

```

---

## 5. Environment & Nebius Token Factory Setup

Create a `.env` file at the root of the project to authenticate against the Nebius Token Factory inference engine:

```bash
# .env Configuration File
NEBIUS_API_KEY=nvapi-your-nebius-token-factory-credential-here
NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1/
WORKSPACE_ROOT=/path/to/local/target/project
PORT=5173

```

### Pre-Flight Verification Script (`scripts/test-nebius.js`)

Run this standalone script to verify token connectivity and model availability before launching the application:

```javascript
const OpenAI = require('openai');
require('dotenv').config();

const client = new OpenAI({
  baseURL: process.env.NEBIUS_BASE_URL || 'https://api.tokenfactory.nebius.com/v1/',
  apiKey: process.env.NEBIUS_API_KEY
});

async function verify() {
  console.log('[DevShell Test] Probing Nebius Token Factory with Nemotron 3 Nano...');
  const t0 = Date.now();
  try {
    const res = await client.chat.completions.create({
      model: 'nvidia/nemotron-3-nano-30b',
      messages: [
        { role: 'system', content: 'You are a diagnostic probe.' },
        { role: 'user', content: 'Respond strictly with: "HEALTH_OK"' }
      ],
      temperature: 0.0,
      max_tokens: 10
    });
    console.log(`[Success] Received response in ${Date.now() - t0}ms:`, res.choices[0].message.content.trim());
  } catch (err) {
    console.error('[Failure] Nebius Token Factory probe failed:', err.message);
  }
}

verify();

```

---

## 6. The 5-Minute Hackathon Demo Script & Judge Presentation Runbook

To score highest in the **Coding and Agentic Engineering Track** or **Best Apps and Agents Track**, structure the demo around live execution, showing real-time CDP telemetry, multi-tier Nemotron dispatch, and atomic codebase patching without the overhead of external protocols.

```
                    HACKATHON PRESENTATION TIMELINE (5 MINUTES)
0:00 ──────────────── 1:00 ─────────────── 2:30 ─────────────── 3:45 ─────────────── 5:00
 │                     │                    │                    │                    │
 ▼                     ▼                    ▼                    ▼                    ▼
[The Problem:         [Live Detection:     [Agentic Triage:     [1-Click Atomic      [Concurrency Load
 Context Switching    CDP catches 3G       Nano filters logs;   Patch & Verification: & Rollback:
 & Protocol Lag]      stalls & hydration]  Ultra reasons]       writes disk live]    Stress test & backup]

```

### Minute 0:00 - 1:00: The Problem Statement & System Topology

1. **The Hook:**
> *"Modern web developers waste 40% of their day switching between VS Code, Chrome DevTools, Postman, and terminal windows. When an error occurs, the browser knows the runtime state, but the IDE holds the source code. They do not talk to each other."*


2. **The Innovation:**
> *"Dev-Shell consolidates these tools into an AI-native browser. We eliminated the latency and connection failure points of MCP by allowing Electron to inspect Chromium directly over CDP and patch local files with native atomic writes. All reasoning is powered by NVIDIA Nemotron on Nebius Token Factory."*


3. **Show the UI:**
Point out the unified workspace: Omnibar, responsive device toggles, native `node-pty` terminal, Smart cURL client, and the real-time 7-domain diagnostic badge bar.

---

### Minute 1:00 - 2:30: Live Detection (Hydration Error & 3G Network Throttling)

1. **Navigate to Buggy Target:**
In the Omnibar, navigate to `http://localhost:3000` (a local demo app containing an intentional SSR hydration mismatch and an uncompressed 1.2 MB bundle).
2. **Trigger Network Throttling:**
Select **Slow 3G** from the throttling dropdown. Reload the page.
3. **Show Real-Time CDP Interception:**
* Watch the `DiagnosticsBadgeBar.vue` immediately flag:
* **Console (Critical):** `Framework SSR Hydration Mismatch` (resolved to `src/components/Navbar.vue:42`).
* **Network (Critical):** `Monolithic JavaScript Bundle Detected: 1240 KB`.




4. **Inspect Node:**
Click the 🎯 Element Inspect button, click a poorly stacked navbar element, and show the CDP box-model and z-index warning appearing in the telemetry store.

---

### Minute 2:30 - 3:45: Dual-Tier Nemotron Orchestration & Deep Reasoning

1. **Show the Triage Feed:**
Explain that **Nemotron 3 Nano** processes incoming CDP events at sub-50ms latency, dropping operational noise while packaging critical telemetry into the chat context tray.
2. **Prompt the Model:**
Click the **"⚡ Fix with Nemotron"** button on the Hydration Error card, or type into the Dev Chat sidebar:
> *"Resolve the SSR hydration mismatch and optimize the network bundle."*


3. **Watch Nemotron 3 Ultra Reason:**
* Point out the live telemetry context badge attached to the prompt.
* Nemotron 3 Ultra analyzes the runtime trace alongside `Navbar.vue` read directly from disk via Node.js `fs`.
* The model streams its diagnosis and appends an interactive `PatchCard.vue`.



---

### Minute 3:45 - 4:30: 1-Click Codebase Patching & Automatic Verification

1. **Inspect the Side-by-Side Diff:**
Show the clean search-and-replace block rendered in the chat:
* **Red Block (`-`):** Deprecated client-only code running during initial render.
* **Green Block (`+`):** Deferral wrapped inside Vue's `onMounted()` hook.


2. **Click "⚡ Apply to Codebase":**
* Emphasize the speed: The `PatchEngine` creates a timestamped backup in `.devshell/backups/`, verifies the target string uniqueness, and writes the replacement via `fs.renameSync`.
* Show that the local source file updated instantly in the background.


3. **Live Verification:**
The browser view automatically hot-reloads via Vite HMR. Show the **Console Diagnostic Badge drop from 1 to 0**. The bug is resolved without touching an external IDE.

---

### Minute 4:30 - 5:00: Concurrency Stress Test & 1-Click Rollback

1. **Trigger Concurrency Load Engine:**
Open the bottom drawer, select **🔥 Concurrency Load**, configure 50 virtual users for 5 seconds against `/api/data`, and click **Start Test**.
* Show the Node.js worker pool streaming real-time RPS, p95 latency, and status code distributions.


2. **Show the Safety Net (Rollback):**
Return to the applied patch in the chat sidebar and click **Rollback**.
* Show that the backup snapshot is restored instantly, returning the file to its original state.


3. **The Closing Verdict:**
> *"Dev-Shell turns the browser from a passive viewing surface into an active development environment. By combining native CDP inspection with NVIDIA Nemotron's dual-tier reasoning on Nebius Token Factory, we have eliminated context switching entirely."*



---

## 7. Hackathon Submission Track Alignment

| Requirement / Track Metric | Dev-Shell Implementation Highlight |
| --- | --- |
| **Coding & Agentic Engineering Track** | Autonomous debugging loop: catches runtime exceptions, traces them to source files via sourcemaps, generates atomic diffs, and writes patches directly to disk. |
| **Best Apps & Agents Track** | Solves a real-world developer workflow problem by unifying browser inspection, terminal execution (`xterm.js`/`node-pty`), API testing, and AI diagnostics. |
| **Nebius Token Factory Utilization** | Dual-tier routing using official endpoints: **Nemotron 3 Nano** for high-frequency telemetry triage; **Nemotron 3 Ultra** for multi-file architectural reasoning and patch synthesis. |
| **Performance & Robustness** | Zero-MCP overhead. Direct Node.js filesystem I/O with automatic backups (`.devshell/backups/`), safe temporary file swapping, and full rollback capabilities. |