# RUN.md - Complete Project Execution Guide for Bstudio

This document provides complete, step-by-step instructions for running **Bstudio** (AI-Native Autonomous Diagnostic Browser & IDE for Full-Stack Developers).

---

## ⚡ Agent Quick Execution Directive

When instructed: **"Run the RUN.md file"**, follow these exact automated steps:

```powershell
# 1. Set working directory to the Bstudio repository root:
cd "c:\Users\pushp\OneDrive\Desktop\AntiGravity\BStudio\Bstudio"

# 2. Ensure environment file exists:
if (-not (Test-Path .env)) { Copy-Item .env.example .env }

# 3. Ensure dependencies are installed:
if (-not (Test-Path node_modules)) { npm install }

# 4. Compile the Electron main process:
npm run compile:main

# 5. Launch the dev environment (Vite + Electron + Main watcher) in background/daemon mode:
npm run dev
```

---

## 📋 System Requirements & Prerequisites

- **Node.js**: `v20.x` or higher (verified on `v24.21.0`)
- **npm**: `v10.x` or higher (verified on `v11.19.0`)
- **OS**: Windows 10/11, macOS, or Linux
- **Working Directory**: Always run all commands from the inner `Bstudio` folder:
  `c:\Users\pushp\OneDrive\Desktop\AntiGravity\BStudio\Bstudio`

---

## 🛠️ Step-by-Step Instructions

### Step 1: Open the Project Directory
Make sure your terminal is located in the `Bstudio` project root:
```powershell
cd "c:\Users\pushp\OneDrive\Desktop\AntiGravity\BStudio\Bstudio"
```

### Step 2: Environment Configuration
Check if `.env` exists. If not, copy it from the template:
```powershell
Copy-Item .env.example .env
```
Key configuration values in `.env`:
- `NEBIUS_API_KEY`: API key for Nebius Token Factory (Nemotron AI engine)
- `NEBIUS_BASE_URL`: Nebius API endpoint (`https://api.tokenfactory.nebius.com/v1/`)
- `PORT`: Vite development server port (default `5173`)
- `WORKSPACE_ROOT`: Path to the active workspace project (default `./`)

### Step 3: Install Dependencies
If `node_modules` is not yet installed:
```powershell
npm install
```

### Step 4: Compile TypeScript Main Process
Compile `src/main` and `src/preload` to the `dist/` folder:
```powershell
npm run compile:main
```

### Step 5: Start the Development Environment
Run the unified development command:
```powershell
npm run dev
```

#### What happens during `npm run dev`:
1. **Compiles the main process**: Runs `tsc --build tsconfig.node.json --force`.
2. **Concurrently starts 3 services**:
   - `[renderer]`: Vite dev server starts at `http://localhost:5173/`.
   - `[main]`: TypeScript runs in watch mode (`tsc --watch`) for hot re-compilation of main process code.
   - `[electron]`: `scripts/start-electron.js` probes `127.0.0.1:5173`, waits for Vite to be ready, and then spawns the Electron desktop application with Chrome DevTools Protocol attached on port `9222`.

---

## 📦 Available Scripts Reference

| Command | Description |
|---|---|
| `npm run dev` | Full dev mode: Vite dev server + TS watch + Electron desktop app |
| `npm run dev:renderer` | Starts only the Vite Vue 3 renderer dev server on port 5173 |
| `npm run dev:main` | Starts TypeScript watch mode on the main process |
| `npm run dev:electron` | Waits for Vite on port 5173 and starts Electron |
| `npm run compile:main` | One-shot compile of main & preload scripts |
| `npm run compile:renderer`| Production build of the Vue 3 renderer |
| `npm run clean` | Cleans `dist`, `release`, and tsbuildinfo files |
| `npm run build` | Full production build (`clean` + renderer + main) |
| `npm run package:win` | Packages Windows NSIS installer and portable executable |
| `npm run rebuild:native` | Rebuilds native addons (like `node-pty`) for Electron |

---

## 🔍 Troubleshooting

- **Port 5173 already in use**:
  Kill any lingering Node/Vite processes using port 5173:
  ```powershell
  Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  ```
- **Electron window doesn't open**:
  Ensure port `5173` is healthy by running `npm run dev:renderer` and visiting `http://localhost:5173` in your browser.
- **Git note**:
  Always execute git commands inside `c:\Users\pushp\OneDrive\Desktop\AntiGravity\BStudio\Bstudio` to push to the Bstudio repository.
