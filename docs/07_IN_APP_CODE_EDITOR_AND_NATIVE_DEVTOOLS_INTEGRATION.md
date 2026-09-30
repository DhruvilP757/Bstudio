
# DOCUMENT 7: IN-APP CODE WORKBENCH (MONACO IDE) & NATIVE CHROMIUM DEVTOOLS INTEGRATION
**File Target:** `docs/07_IN_APP_CODE_EDITOR_AND_NATIVE_DEVTOOLS_INTEGRATION.md`  
**Subsystems Covered:** File System Explorer, Monaco Editor Integration, File Backups, Native DevTools Window Management, Preload Bridge APIs

---

## 1. Feature Overview & Design Rationale

While autonomous agentic patching powered by NVIDIA Nemotron resolves issues automatically, developers require manual intervention capabilities:
1. **Direct Code Inspection & Modification:** Developers need to inspect project structure, read source files, and make manual edits using an integrated IDE (Monaco Editor) without switching out to VS Code.
2. **Native Chromium DevTools Docking:** Developers need immediate access to Chromium's native developer tools (Elements tree, Console, Network waterfall, Sources debugger, Application storage) exactly as exposed in Google Chrome.



+----------------------------------------------------------------------------------------------------+
|                                    DEV-SHELL UNIFIED WORKBENCH                                     |
|                                                                                                    |
|  +----------------------+  +-----------------------------------+  +-----------------------------+  |
|  |    FILE EXPLORER     |  |       MONACO CODE EDITOR          |  |      LIVE WEB VIEW          |  |
|  | - Recursive Tree     |  | - Syntax Highlighting             |  |    (WebContentsView)        |  |
|  | - Directory Walking  |  | - In-Memory Model Cache           |  |                             |  |
|  | - Path Guards        |  | - Ctrl+S / Cmd+S Hotkeys          |  |  [Rendered Application]     |  |
|  | - Extension Badging  |  | - Auto-Backup on Save             |  |                             |  |
|  +----------------------+  +-----------------------------------+  +-----------------------------+  |
|  |                                                                                              |  |
|  |  [NATIVE CHROMIUM DEVTOOLS] (Docked Bottom / Right or Detached Window via F12)               |  |
|  |  Elements | Console | Sources | Network | Performance | Memory | Application                 |  |
|  +----------------------------------------------------------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+

```

---

## 2. In-App File Explorer & Monaco Editor Subsystem

### A. Main Process File System IPC (`src/main/ipc/register-fs-ipc.ts`)

This module provides directory traversal, file read/write operations, and backup creation while enforcing strict path-traversal security boundaries.

```typescript
import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  extension?: string;
  children?: FileNode[];
}

export function registerFsIpc(projectRoot: string): void {
  // 1. Recursive Directory Tree Scanner
  ipcMain.handle('fs:get-tree', async (_, relativeSubdir: string = '') => {
    const targetDir = path.resolve(projectRoot, relativeSubdir);

    // Prevent path traversal outside project root
    if (!targetDir.startsWith(projectRoot)) {
      throw new Error(`Security Violation: Access denied to path '${relativeSubdir}'`);
    }

    function scanDirectory(currentPath: string, depth = 0): FileNode[] {
      if (depth > 5) return []; // Guard against deep folder recursion

      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      const nodes: FileNode[] = [];

      for (const entry of entries) {
        // Exclude system and dependency folders
        if (
          entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === 'release' ||
          entry.name === 'build'
        ) {
          continue;
        }

        const fullPath = path.join(currentPath, entry.name);
        const relPath = path.relative(projectRoot, fullPath);

        if (entry.isDirectory()) {
          nodes.push({
            name: entry.name,
            path: relPath,
            isDirectory: true,
            children: scanDirectory(fullPath, depth + 1)
          });
        } else {
          const stats = fs.statSync(fullPath);
          nodes.push({
            name: entry.name,
            path: relPath,
            isDirectory: false,
            size: stats.size,
            extension: path.extname(entry.name).toLowerCase()
          });
        }
      }

      // Sort: Directories first, then alphabetical files
      return nodes.sort((a, b) => {
        if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
        return a.isDirectory ? -1 : 1;
      });
    }

    return scanDirectory(targetDir);
  });

  // 2. File Reader
  ipcMain.handle('fs:read-file', async (_, relativePath: string) => {
    const fullPath = path.resolve(projectRoot, relativePath);

    if (!fullPath.startsWith(projectRoot)) {
      throw new Error('Access denied: Path escapes project boundary');
    }
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${relativePath}`);
    }

    // Limit maximum read buffer to 5 MB for editor safety
    const stats = fs.statSync(fullPath);
    if (stats.size > 5 * 1024 * 1024) {
      throw new Error('File exceeds maximum editable limit of 5 MB.');
    }

    return fs.readFileSync(fullPath, 'utf8');
  });

  // 3. File Writer with Automatic Timestamped Backup
  ipcMain.handle(
    'fs:write-file',
    async (_, { relativePath, content }: { relativePath: string; content: string }) => {
      const fullPath = path.resolve(projectRoot, relativePath);

      if (!fullPath.startsWith(projectRoot)) {
        throw new Error('Access denied: Target path escapes project root');
      }

      // Create backup copy before saving manual edits
      const backupDir = path.join(projectRoot, '.devshell', 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      if (fs.existsSync(fullPath)) {
        const backupFileName = `${Date.now()}_manual_${path.basename(relativePath)}.bak`;
        fs.copyFileSync(fullPath, path.join(backupDir, backupFileName));
      }

      // Write updated content to disk atomically
      const tempPath = `${fullPath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, content, 'utf8');
      fs.renameSync(tempPath, fullPath);

      return {
        success: true,
        savedPath: fullPath,
        timestamp: Date.now()
      };
    }
  );
}

```

---

### B. Monaco Editor Workbench Component (`src/renderer/src/components/editor/CodeEditorWorkbench.vue`)

This component integrates Monaco Editor alongside an interactive file-tree sidebar. It supports syntax highlighting, dirty-state tracking, and `Ctrl+S` / `Cmd+S` keyboard shortcuts.

```vue
<template>
  <div class="flex h-full w-full bg-[#1e1e1e] text-xs font-mono overflow-hidden select-none">
    <!-- File Explorer Sidebar -->
    <aside class="w-60 border-r border-zinc-800 bg-zinc-950 flex flex-col">
      <div class="p-2 border-b border-zinc-800 flex justify-between items-center text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
        <span>Filesystem</span>
        <button @click="fetchFileTree" class="hover:text-zinc-100 transition p-1" title="Refresh Tree">
          ⟳
        </button>
      </div>

      <!-- Recursive Directory Tree -->
      <div class="flex-1 overflow-y-auto p-1.5 space-y-0.5 select-none">
        <template v-for="node in fileTree" :key="node.path">
          <FileTreeNodeItem :active-path="activeFilePath" :node="node" @select="handleSelectNode"/>
        </template>
      </div>
    </aside>

    <!-- Monaco Editor Panel -->
    <div class="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
      <!-- Tab / Status Bar -->
      <div class="flex items-center justify-between px-3 py-1.5 bg-[#18181b] border-b border-zinc-800">
        <div class="flex items-center gap-2 text-zinc-300">
          <span class="text-emerald-400">📄</span>
          <span class="font-semibold">{{ activeFilePath || 'No file selected' }}</span>
          <span 
            v-if="isDirty" 
            class="w-2 h-2 rounded-full bg-amber-400 animate-pulse" 
            title="Unsaved changes"
          ></span>
        </div>

        <div class="flex items-center gap-2">
          <span v-if="saveStatus" class="text-[10px] text-emerald-400 font-sans">{{ saveStatus }}</span>
          <button 
            @click="saveCurrentFile"
            :disabled="!isDirty"
            class="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white rounded text-[11px] font-sans font-semibold transition"
          >
            Save (Ctrl+S)
          </button>
        </div>
      </div>

      <!-- Monaco Mount Target -->
      <div ref="monacoRoot" class="flex-1 w-full h-full min-h-0"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as monaco from 'monaco-editor';
import FileTreeNodeItem from './FileTreeNodeItem.vue';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

const monacoRoot = ref<HTMLElement null |>(null);
const fileTree = ref<FileNode[]>([]);
const activeFilePath = ref<string>('');
const isDirty = ref(false);
const saveStatus = ref('');

let editorInstance: monaco.editor.IStandaloneCodeEditor | null = null;
const modelCache = new Map<string, monaco.editor.ITextModel>();

async function fetchFileTree() {
  fileTree.value = await window.electronAPI.getProjectTree();
}

function resolveLanguage(filePath: string): string {
  if (filePath.endsWith('.ts')) return 'typescript';
  if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) return 'javascript';
  if (filePath.endsWith('.vue') || filePath.endsWith('.html')) return 'html';
  if (filePath.endsWith('.css')) return 'css';
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.md')) return 'markdown';
  return 'plaintext';
}

async function handleSelectNode(node: FileNode) {
  if (node.isDirectory) return;
  activeFilePath.value = node.path;

  let model = modelCache.get(node.path);

  if (!model) {
    const content = await window.electronAPI.readFile(node.path);
    const lang = resolveLanguage(node.path);
    model = monaco.editor.createModel(content, lang);

    model.onDidChangeContent(() => {
      isDirty.value = true;
      saveStatus.value = '';
    });

    modelCache.set(node.path, model);
  }

  if (editorInstance) {
    editorInstance.setModel(model);
    isDirty.value = false;
  }
}

async function saveCurrentFile() {
  if (!editorInstance || !activeFilePath.value) return;

  const content = editorInstance.getValue();
  await window.electronAPI.writeFile({
    relativePath: activeFilePath.value,
    content
  });

  isDirty.value = false;
  saveStatus.value = 'Saved ✓';
  setTimeout(() => {
    saveStatus.value = '';
  }, 2500);
}

onMounted(() => {
  if (monacoRoot.value) {
    editorInstance = monaco.editor.create(monacoRoot.value, {
      theme: 'vs-dark',
      automaticLayout: true,
      fontSize: 12,
      fontFamily: 'Fira Code, Menlo, Monaco, Consolas, monospace',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      tabSize: 2
    });

    // Keyboard Accelerator: Save
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveCurrentFile();
    });
  }

  fetchFileTree();
});

onBeforeUnmount(() => {
  modelCache.forEach((model) => model.dispose());
  modelCache.clear();
  if (editorInstance) {
    editorInstance.dispose();
  }
});
</script>

```

---

## 3. Native Chrome DevTools Controller & Orchestrator

Dev-Shell allows opening Chromium's native developer tools directly on the active `WebContentsView`. This operates concurrently with the custom CDP diagnostic multiplexer (`CdpCore`) without socket collisions.

### A. ViewManager Extension (`src/main/view-manager.ts`)

```typescript
// Additions to src/main/view-manager.ts

export type DevToolsDockMode = 'bottom' | 'right' | 'detach';

export class ViewManager {
  // ... previous ViewManager implementation ...

  /**
   * Toggles native Chromium DevTools on the active tab.
   * - 'bottom': Docks DevTools under the rendered WebContentsView.
   * - 'right': Docks DevTools to the right side of the view.
   * - 'detach': Spawns DevTools into an independent, native OS window.
   */
  public toggleDevTools(mode: DevToolsDockMode = 'bottom'): void {
    const wc = this.getActiveWebContents();
    if (!wc) return;

    if (wc.isDevToolsOpened()) {
      wc.closeDevTools();
      console.log('[ViewManager] Native Chromium DevTools closed.');
    } else {
      wc.openDevTools({ mode, activate: true });
      console.log(`[ViewManager] Native Chromium DevTools opened in mode: ${mode}`);
    }
  }

  public isDevToolsOpened(): boolean {
    const wc = this.getActiveWebContents();
    return wc ? wc.isDevToolsOpened() : false;
  }
}

```

### B. Global Shortcuts & IPC Handlers (`src/main/ipc/register-browser-ipc.ts`)

Registers standard browser accelerators (`F12`, `Ctrl+Shift+I`, `Cmd+Option+I`) when the window is focused.

```typescript
import { BrowserWindow, ipcMain, globalShortcut } from 'electron';
import { ViewManager } from '../view-manager';

export function registerDevToolsIpc(mainWindow: BrowserWindow, viewManager: ViewManager): void {
  // 1. Direct IPC Trigger
  ipcMain.handle('browser:toggle-native-devtools', async (_, mode?: 'bottom' | 'right' | 'detach') => {
    viewManager.toggleDevTools(mode || 'bottom');
  });

  // 2. Global Accelerator Bindings
  mainWindow.on('focus', () => {
    // F12: Toggle Docked Bottom
    globalShortcut.register('F12', () => {
      viewManager.toggleDevTools('bottom');
    });

    // Ctrl+Shift+I / Cmd+Option+I: Toggle Detached Inspector
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      viewManager.toggleDevTools('detach');
    });
  });

  mainWindow.on('blur', () => {
    globalShortcut.unregister('F12');
    globalShortcut.unregister('CommandOrControl+Shift+I');
  });
}

```

---

## 4. Preload Context Bridge Interface (`src/preload/index.ts`)

Exposes filesystem and DevTools primitives to the Vue 3 renderer under the `window.electronAPI` namespace:

```typescript
// Additions to src/preload/index.ts

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing navigation, CDP, terminal, and AI bindings ...

  // Filesystem & Monaco Editor
  getProjectTree: (subdir?: string) => ipcRenderer.invoke('fs:get-tree', subdir),
  readFile: (relativePath: string) => ipcRenderer.invoke('fs:read-file', relativePath),
  writeFile: (payload: { relativePath: string; content: string }) => ipcRenderer.invoke('fs:write-file', payload),

  // Native Chromium DevTools
  toggleNativeDevTools: (mode?: 'bottom' | 'right' | 'detach') => ipcRenderer.invoke('browser:toggle-native-devtools', mode)
});

```

### Ambient TypeScript Declarations (`src/preload/types.d.ts`)

```typescript
// Additions to src/preload/types.d.ts

export interface IElectronAPI {
  // Filesystem & Monaco
  getProjectTree: (subdir?: string) => Promise<any[]>;
  readFile: (relativePath: string) => Promise<string>;
  writeFile: (payload: { relativePath: string; content: string }) => Promise<{ success: boolean; savedPath: string; timestamp: number }>;

  // Native DevTools
  toggleNativeDevTools: (mode?: 'bottom' | 'right' | 'detach') => Promise<void>;
}

```

---

## 5. UI Integration: Drawer Header & Omnibar Buttons

### A. Omnibar Trigger (`src/renderer/src/components/chrome/Omnibar.vue`)

Add the DevTools trigger button to the action cluster in `Omnibar.vue`:

```vue
<!-- Native Chrome DevTools Button -->
<button 
  @click="handleToggleDevTools"
  class="px-2 py-1 rounded hover:bg-zinc-800 text-zinc-300 transition flex items-center gap-1.5 font-mono text-xs border border-zinc-700/60"
  title="Toggle Native DevTools (F12 or Ctrl+Shift+I)"
>
  <span class="text-amber-400">⚙️</span>
  <span>DevTools</span>
</button>

<script setup lang="ts">
function handleToggleDevTools() {
  window.electronAPI.toggleNativeDevTools('bottom');
}
</script>

```

### B. Drawer Selector (`src/renderer/src/App.vue`)

Add the Code Editor tab to the bottom drawer in `App.vue`:

```vue
<!-- Inside App.vue bottom drawer tabs -->
<button 
  @click="browserStore.setDrawer('editor')"
  :class="['px-2.5 py-1 text-xs font-mono font-medium rounded transition', 
           browserStore.activeDrawer === 'editor' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200']"
>
  📝 Code Workbench
</button>

<!-- Inside App.vue bottom drawer body -->
<div v-show="browserStore.activeDrawer === 'editor'" class="h-full w-full">
  <CodeEditorWorkbench/>
</div>

```

---

## 6. End-to-End Verification Checklist

| Test Case | Procedure | Expected Outcome |
| --- | --- | --- |
| **Directory Scan** | Click `⟳` in File Explorer. | Project files populate hierarchically; `node_modules` and hidden files are excluded. |
| **Monaco Load** | Click `src/App.vue`. | Monaco editor loads the file with proper syntax highlighting. |
| **Manual Edit & Save** | Modify code and press `Ctrl+S`. | The dirty indicator clears, the file updates on disk, and a backup snapshot is created in `.devshell/backups/`. |
| **Native DevTools Dock** | Press `F12` or click `⚙️ DevTools`. | Native Chromium DevTools docks underneath the active `WebContentsView`. |
| **Detached DevTools** | Press `Ctrl+Shift+I` (or `Cmd+Option+I`). | Native Chromium DevTools opens in an independent, detachable window. |
| **CDP Concurrency** | Run an automated audit with DevTools open. | `CdpCore` telemetry continues streaming without colliding with native DevTools breakpoints. |

```

```