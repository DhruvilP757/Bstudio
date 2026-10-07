<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useBrowserStore } from '../../stores/browser-store';
import { useFsStore } from '../../stores/fs-store';
import { useTerminalStore } from '../../stores/terminal-store';
import {
  Minus,
  Square,
  Copy,
  X,
  FolderOpen,
  FileCode,
  Save,
  Terminal,
  Bug,
  Layout,
  Code2,
  Globe,
  Bot,
  Settings,
  Sparkles,
  ChevronRight,
  Check,
  RotateCcw,
  Trash2,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Cpu,
  Layers
} from 'lucide-vue-next';

const browserStore = useBrowserStore();
const fsStore = useFsStore();
const terminalStore = useTerminalStore();

const isMaximized = ref(false);
const activeMenu = ref<string | null>(null);
const topNavbarRef = ref<HTMLElement | null>(null);

onMounted(async () => {
  if (window.electronAPI) {
    try {
      isMaximized.value = await window.electronAPI.isWindowMaximized();
    } catch {}

    window.electronAPI.onWindowMaximizedChange((max) => {
      isMaximized.value = max;
    });
  }

  window.addEventListener('click', handleGlobalClick);
  window.addEventListener('keydown', handleGlobalKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', handleGlobalClick);
  window.removeEventListener('keydown', handleGlobalKeyDown);
});

const handleGlobalClick = (e: MouseEvent) => {
  if (topNavbarRef.value && !topNavbarRef.value.contains(e.target as Node)) {
    activeMenu.value = null;
  }
};

const handleGlobalKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    activeMenu.value = null;
  }
};

const handleMenuClick = (menuName: string) => {
  if (activeMenu.value === menuName) {
    activeMenu.value = null;
  } else {
    activeMenu.value = menuName;
  }
};

const handleMenuHover = (menuName: string) => {
  // Like VS Code: only switch menu on hover if another menu is already open
  if (activeMenu.value !== null && activeMenu.value !== menuName) {
    activeMenu.value = menuName;
  }
};

const closeMenu = () => {
  activeMenu.value = null;
};

// Window Controls
const handleMinimize = () => {
  window.electronAPI?.minimizeWindow();
};

const handleMaximize = async () => {
  if (window.electronAPI) {
    isMaximized.value = await window.electronAPI.maximizeWindow();
  }
};

const handleClose = () => {
  window.electronAPI?.closeWindow();
};

// Menu Actions
const triggerNewFile = () => {
  closeMenu();
  fsStore.createUntitledFile();
};

const triggerOpenFile = () => {
  closeMenu();
  fsStore.openFileDialog();
};

const triggerOpenFolder = () => {
  closeMenu();
  fsStore.openFolderDialog();
};

const triggerSave = () => {
  closeMenu();
  fsStore.saveActiveFile();
};

const triggerSidebarTab = (tab: 'explorer' | 'extensions' | 'git') => {
  closeMenu();
  window.dispatchEvent(new CustomEvent('bstudio:open-sidebar', { detail: tab }));
};

const triggerSplitView = (mode: 'editor' | 'split' | 'browser') => {
  closeMenu();
  browserStore.activeViewMode = mode;
};

const triggerDrawerTab = (tab: 'terminal' | 'console' | 'network' | 'api' | 'load' | 'memory') => {
  closeMenu();
  browserStore.openDrawer(tab);
};

const triggerNewTerminal = () => {
  closeMenu();
  browserStore.openDrawer('terminal');
  terminalStore.addSession();
};

const triggerClearTerminal = () => {
  closeMenu();
  browserStore.openDrawer('terminal');
  window.dispatchEvent(new CustomEvent('bstudio:terminal-clear'));
};

const triggerRestartTerminal = () => {
  closeMenu();
  browserStore.openDrawer('terminal');
  window.dispatchEvent(new CustomEvent('bstudio:terminal-restart'));
};

const activeTitle = computed(() => {
  const fileName = fsStore.activeFile?.name || (fsStore.activeFilePath ? fsStore.activeFilePath.split(/[/\\]/).pop() : null);
  const project = fsStore.currentFolderName || 'Bstudio';
  if (fileName) return `${fileName} — ${project} — Bstudio`;
  return `${project} — Bstudio`;
});
</script>

<template>
  <header
    ref="topNavbarRef"
    class="w-full h-8 bg-[#111115] border-b border-border/80 flex items-center justify-between text-xs text-zinc-300 select-none shrink-0 z-50 relative app-drag"
  >
    <!-- Left Section: Logo & VS Code Menus -->
    <div class="flex items-center h-full no-drag">
      <!-- App Icon / Brand -->
      <div
        class="flex items-center gap-1.5 px-3 h-full hover:bg-white/5 transition-colors cursor-pointer"
        @click="browserStore.navigate('bstudio://start')"
        title="Bstudio"
      >
        <div class="w-4 h-4 rounded bg-nvidia/20 border border-nvidia/40 flex items-center justify-center">
          <Terminal class="w-2.5 h-2.5 text-nvidia" />
        </div>
        <span class="font-bold text-[11px] tracking-wider text-zinc-200">BSTUDIO</span>
      </div>

      <!-- Menu Items List -->
      <nav class="flex items-center h-full">
        <!-- 1. FILE -->
        <div class="relative h-full flex items-center">
          <button
            @click.stop="handleMenuClick('file')"
            @mouseenter="handleMenuHover('file')"
            class="px-2.5 h-full flex items-center text-[12px] font-sans transition-colors rounded-none"
            :class="activeMenu === 'file' ? 'bg-[#27272e] text-white' : 'hover:bg-white/5 text-zinc-300'"
          >
            File
          </button>

          <!-- File Dropdown -->
          <div
            v-if="activeMenu === 'file'"
            class="absolute left-0 top-8 w-60 bg-[#16161b] border border-border/90 rounded-md shadow-2xl py-1 z-50 text-[12px] text-zinc-300 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
          >
            <button @click="triggerNewFile" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span class="flex items-center gap-2"><FileCode class="w-3.5 h-3.5 text-zinc-400" /> New File</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+N</kbd>
            </button>
            <button @click="triggerOpenFile" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span class="flex items-center gap-2"><FileCode class="w-3.5 h-3.5 text-zinc-400" /> Open File...</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+O</kbd>
            </button>
            <button @click="triggerOpenFolder" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span class="flex items-center gap-2"><FolderOpen class="w-3.5 h-3.5 text-[#ff9f0a]" /> Open Folder...</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+Shift+O</kbd>
            </button>
            <div class="h-px bg-border/60 my-1" />
            <button @click="triggerSave" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span class="flex items-center gap-2"><Save class="w-3.5 h-3.5 text-zinc-400" /> Save</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+S</kbd>
            </button>
            <div class="h-px bg-border/60 my-1" />
            <button @click="closeMenu(); browserStore.isApiKeyModalOpen = true;" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span class="flex items-center gap-2"><Settings class="w-3.5 h-3.5 text-zinc-400" /> Preferences / Keys</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+,</kbd>
            </button>
            <div class="h-px bg-border/60 my-1" />
            <button @click="handleClose" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-500/20 hover:text-rose-300 transition-colors text-left">
              <span>Exit</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Alt+F4</kbd>
            </button>
          </div>
        </div>

        <!-- 2. EDIT -->
        <div class="relative h-full flex items-center">
          <button
            @click.stop="handleMenuClick('edit')"
            @mouseenter="handleMenuHover('edit')"
            class="px-2.5 h-full flex items-center text-[12px] font-sans transition-colors rounded-none"
            :class="activeMenu === 'edit' ? 'bg-[#27272e] text-white' : 'hover:bg-white/5 text-zinc-300'"
          >
            Edit
          </button>

          <!-- Edit Dropdown -->
          <div
            v-if="activeMenu === 'edit'"
            class="absolute left-0 top-8 w-56 bg-[#16161b] border border-border/90 rounded-md shadow-2xl py-1 z-50 text-[12px] text-zinc-300 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
          >
            <button @click="closeMenu()" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Undo</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+Z</kbd>
            </button>
            <button @click="closeMenu()" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Redo</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+Y</kbd>
            </button>
            <div class="h-px bg-border/60 my-1" />
            <button @click="closeMenu()" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Cut</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+X</kbd>
            </button>
            <button @click="closeMenu()" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Copy</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+C</kbd>
            </button>
            <button @click="closeMenu()" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Paste</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+V</kbd>
            </button>
            <div class="h-px bg-border/60 my-1" />
            <button @click="closeMenu()" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Find in Document</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+F</kbd>
            </button>
            <button @click="closeMenu()" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Format Document</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Shift+Alt+F</kbd>
            </button>
          </div>
        </div>

        <!-- 3. SELECTION -->
        <div class="relative h-full flex items-center">
          <button
            @click.stop="handleMenuClick('selection')"
            @mouseenter="handleMenuHover('selection')"
            class="px-2.5 h-full flex items-center text-[12px] font-sans transition-colors rounded-none"
            :class="activeMenu === 'selection' ? 'bg-[#27272e] text-white' : 'hover:bg-white/5 text-zinc-300'"
          >
            Selection
          </button>

          <!-- Selection Dropdown -->
          <div
            v-if="activeMenu === 'selection'"
            class="absolute left-0 top-8 w-56 bg-[#16161b] border border-border/90 rounded-md shadow-2xl py-1 z-50 text-[12px] text-zinc-300 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
          >
            <button @click="closeMenu()" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Select All</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+A</kbd>
            </button>
            <button @click="closeMenu()" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Expand Selection</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Shift+Alt+→</kbd>
            </button>
            <button @click="closeMenu()" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Shrink Selection</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Shift+Alt+←</kbd>
            </button>
            <div class="h-px bg-border/60 my-1" />
            <button @click="closeMenu()" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Copy Line Down</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Shift+Alt+↓</kbd>
            </button>
          </div>
        </div>

        <!-- 4. VIEW -->
        <div class="relative h-full flex items-center">
          <button
            @click.stop="handleMenuClick('view')"
            @mouseenter="handleMenuHover('view')"
            class="px-2.5 h-full flex items-center text-[12px] font-sans transition-colors rounded-none"
            :class="activeMenu === 'view' ? 'bg-[#27272e] text-white' : 'hover:bg-white/5 text-zinc-300'"
          >
            View
          </button>

          <!-- View Dropdown -->
          <div
            v-if="activeMenu === 'view'"
            class="absolute left-0 top-8 w-64 bg-[#16161b] border border-border/90 rounded-md shadow-2xl py-1 z-50 text-[12px] text-zinc-300 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
          >
            <button @click="triggerSidebarTab('explorer')" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>File Explorer</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+B</kbd>
            </button>
            <button @click="triggerSidebarTab('git')" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Source Control / Git</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+Shift+G</kbd>
            </button>
            <button @click="triggerSidebarTab('extensions')" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>VS Code Extensions</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+Shift+X</kbd>
            </button>
            <div class="h-px bg-border/60 my-1" />
            <button @click="triggerSplitView('split')" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Layout: Split (Code + Web)</span>
              <span v-if="browserStore.activeViewMode === 'split'" class="text-nvidia text-xs">✓</span>
            </button>
            <button @click="triggerSplitView('editor')" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Layout: Editor Only</span>
              <span v-if="browserStore.activeViewMode === 'editor'" class="text-nvidia text-xs">✓</span>
            </button>
            <button @click="triggerSplitView('browser')" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Layout: Browser Only</span>
              <span v-if="browserStore.activeViewMode === 'browser'" class="text-nvidia text-xs">✓</span>
            </button>
            <div class="h-px bg-border/60 my-1" />
            <button @click="triggerDrawerTab('terminal')" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span class="flex items-center gap-2"><Terminal class="w-3.5 h-3.5 text-nvidia" /> Terminal</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+`</kbd>
            </button>
            <button @click="triggerDrawerTab('console')" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span class="flex items-center gap-2"><Bug class="w-3.5 h-3.5 text-amber-400" /> DevTools Console</span>
              <span class="text-2xs text-zinc-500 font-mono">CDP</span>
            </button>
            <button @click="triggerDrawerTab('network')" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Network Stream</span>
            </button>
            <div class="h-px bg-border/60 my-1" />
            <button @click="closeMenu(); browserStore.isCopilotOpen = !browserStore.isCopilotOpen" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span class="flex items-center gap-2"><Bot class="w-3.5 h-3.5 text-accent-blue" /> AI Copilot</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+I</kbd>
            </button>
          </div>
        </div>

        <!-- 5. GO -->
        <div class="relative h-full flex items-center">
          <button
            @click.stop="handleMenuClick('go')"
            @mouseenter="handleMenuHover('go')"
            class="px-2.5 h-full flex items-center text-[12px] font-sans transition-colors rounded-none"
            :class="activeMenu === 'go' ? 'bg-[#27272e] text-white' : 'hover:bg-white/5 text-zinc-300'"
          >
            Go
          </button>

          <!-- Go Dropdown -->
          <div
            v-if="activeMenu === 'go'"
            class="absolute left-0 top-8 w-56 bg-[#16161b] border border-border/90 rounded-md shadow-2xl py-1 z-50 text-[12px] text-zinc-300 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
          >
            <button @click="closeMenu(); browserStore.goBack();" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Back in Browser</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Alt+←</kbd>
            </button>
            <button @click="closeMenu(); browserStore.goForward();" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Forward in Browser</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Alt+→</kbd>
            </button>
            <div class="h-px bg-border/60 my-1" />
            <button @click="closeMenu(); triggerOpenFile();" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Go to File...</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+P</kbd>
            </button>
            <button @click="closeMenu(); browserStore.navigate('bstudio://start');" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Diagnostics Portal</span>
            </button>
          </div>
        </div>

        <!-- 6. TERMINAL -->
        <div class="relative h-full flex items-center">
          <button
            @click.stop="handleMenuClick('terminal')"
            @mouseenter="handleMenuHover('terminal')"
            class="px-2.5 h-full flex items-center text-[12px] font-sans transition-colors rounded-none"
            :class="activeMenu === 'terminal' ? 'bg-[#27272e] text-white' : 'hover:bg-white/5 text-zinc-300'"
          >
            Terminal
          </button>

          <!-- Terminal Dropdown -->
          <div
            v-if="activeMenu === 'terminal'"
            class="absolute left-0 top-8 w-60 bg-[#16161b] border border-border/90 rounded-md shadow-2xl py-1 z-50 text-[12px] text-zinc-300 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
          >
            <button @click="triggerNewTerminal" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span class="flex items-center gap-2"><Terminal class="w-3.5 h-3.5 text-nvidia" /> New Terminal</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+Shift+`</kbd>
            </button>
            <button @click="triggerClearTerminal" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span class="flex items-center gap-2"><Trash2 class="w-3.5 h-3.5 text-zinc-400" /> Clear Terminal</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">Ctrl+L</kbd>
            </button>
            <button @click="triggerRestartTerminal" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span class="flex items-center gap-2"><RotateCcw class="w-3.5 h-3.5 text-zinc-400" /> Restart PowerShell Session</span>
            </button>
          </div>
        </div>

        <!-- 7. HELP -->
        <div class="relative h-full flex items-center">
          <button
            @click.stop="handleMenuClick('help')"
            @mouseenter="handleMenuHover('help')"
            class="px-2.5 h-full flex items-center text-[12px] font-sans transition-colors rounded-none"
            :class="activeMenu === 'help' ? 'bg-[#27272e] text-white' : 'hover:bg-white/5 text-zinc-300'"
          >
            Help
          </button>

          <!-- Help Dropdown -->
          <div
            v-if="activeMenu === 'help'"
            class="absolute left-0 top-8 w-60 bg-[#16161b] border border-border/90 rounded-md shadow-2xl py-1 z-50 text-[12px] text-zinc-300 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
          >
            <button @click="closeMenu(); browserStore.isApiKeyModalOpen = true;" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span class="flex items-center gap-2"><Sparkles class="w-3.5 h-3.5 text-accent-blue" /> AI Provider Keys (Gemini & Nebius)</span>
            </button>
            <button @click="closeMenu(); window.electronAPI?.toggleDevTools();" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span class="flex items-center gap-2"><ExternalLink class="w-3.5 h-3.5 text-nvidia" /> Toggle Chrome DevTools</span>
              <kbd class="text-[10px] text-zinc-500 font-mono">F12</kbd>
            </button>
            <div class="h-px bg-border/60 my-1" />
            <button @click="closeMenu()" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>Bstudio Documentation</span>
            </button>
            <button @click="closeMenu()" class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-nvidia/15 hover:text-white transition-colors text-left">
              <span>About Bstudio v1.0.0</span>
            </button>
          </div>
        </div>
      </nav>
    </div>

    <!-- Center Section: Clean Window Title (Native Window Drag Area) -->
    <div class="flex-1 flex items-center justify-center h-full select-none pointer-events-none px-4">
      <span class="text-[11px] text-zinc-400 font-sans tracking-wide truncate max-w-lg select-none">
        {{ activeTitle }}
      </span>
    </div>

    <!-- Right Section: Quick Layout Toggles & Windows 11-style Control Buttons -->
    <div class="flex items-center h-full shrink-0 no-drag">
      <!-- Quick View Toggle Buttons -->
      <div class="hidden sm:flex items-center mr-1 text-zinc-500">
        <button
          @click="triggerSplitView(browserStore.activeViewMode === 'split' ? 'editor' : 'split')"
          class="w-7 h-7 flex items-center justify-center rounded hover:text-zinc-200 hover:bg-white/5 transition-colors"
          title="Toggle Split Code/Web View"
        >
          <Layout class="w-3.5 h-3.5" :class="browserStore.activeViewMode === 'split' ? 'text-nvidia' : ''" />
        </button>
        <button
          @click="browserStore.toggleDrawer('terminal')"
          class="w-7 h-7 flex items-center justify-center rounded hover:text-zinc-200 hover:bg-white/5 transition-colors"
          title="Toggle Terminal Drawer (Ctrl+`)"
        >
          <Terminal class="w-3.5 h-3.5" :class="browserStore.isDrawerOpen ? 'text-nvidia' : ''" />
        </button>
        <button
          @click="browserStore.isCopilotOpen = !browserStore.isCopilotOpen"
          class="w-7 h-7 flex items-center justify-center rounded hover:text-zinc-200 hover:bg-white/5 transition-colors"
          title="Toggle AI Copilot (Ctrl+I)"
        >
          <Bot class="w-3.5 h-3.5" :class="browserStore.isCopilotOpen ? 'text-accent-blue' : ''" />
        </button>
      </div>

      <!-- Windows 11 Native-Style Titlebar Window Control Buttons -->
      <div class="flex items-center h-full">
        <!-- Minimize -->
        <button
          @click="handleMinimize"
          class="w-11 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors"
          title="Minimize"
          aria-label="Minimize"
        >
          <Minus class="w-3.5 h-3.5" />
        </button>

        <!-- Maximize / Restore -->
        <button
          @click="handleMaximize"
          class="w-11 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors"
          :title="isMaximized ? 'Restore Down' : 'Maximize'"
          aria-label="Maximize"
        >
          <Copy v-if="isMaximized" class="w-3 h-3" />
          <Square v-else class="w-3 h-3" />
        </button>

        <!-- Close (VS Code Red Hover) -->
        <button
          @click="handleClose"
          class="w-11 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#e81123] transition-colors"
          title="Close"
          aria-label="Close"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* App Drag Region for frameless title bar */
.app-drag {
  -webkit-app-region: drag;
}
.no-drag {
  -webkit-app-region: no-drag;
}
</style>
