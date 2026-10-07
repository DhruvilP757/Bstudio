<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useTerminalStore } from '../../stores/terminal-store';
import { useBrowserStore } from '../../stores/browser-store';
import { Plus, X, Trash2, RotateCcw, Terminal as TerminalIcon, Sparkles } from 'lucide-vue-next';

const containerRef    = ref<HTMLDivElement | null>(null);
const xtermRef        = ref<HTMLDivElement | null>(null);
const terminalStore   = useTerminalStore();
const browserStore    = useBrowserStore();

let term: Terminal | null = null;
let fitAddon: FitAddon | null = null;
let cleanupListener: (() => void) | null = null;
let ro: ResizeObserver | null = null;

const focusTerminal = () => {
  if (term) {
    term.focus();
  }
};

const initTerminal = async () => {
  await nextTick();
  if (!xtermRef.value) return;

  // Dispose previous instance if switching sessions
  if (term) { term.dispose(); term = null; }
  if (cleanupListener) { cleanupListener(); cleanupListener = null; }

  term = new Terminal({
    cursorBlink:  true,
    cursorStyle:  'block',
    cursorWidth:  2,
    fontSize:     13,
    lineHeight:   1.4,
    letterSpacing: 0.3,
    fontFamily:   "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, Menlo, monospace",
    theme: {
      background:         '#0c1013',
      foreground:         '#e4e4e7',
      cursor:             '#76b900',
      cursorAccent:       '#0c1013',
      selectionBackground:'rgba(118,185,0,0.3)',
      black:   '#18181b', red:    '#f87171', green:   '#4ade80', yellow: '#fbbf24',
      blue:    '#60a5fa', magenta:'#c084fc', cyan:    '#34d399', white:  '#e4e4e7',
      brightBlack:   '#3f3f46', brightRed:    '#f87171',
      brightGreen:   '#4ade80', brightYellow: '#fbbf24',
      brightBlue:    '#93c5fd', brightMagenta:'#d8b4fe',
      brightCyan:    '#6ee7b7', brightWhite:  '#f4f4f5',
    },
    allowTransparency: true,
  });

  fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.loadAddon(new WebLinksAddon());
  term.open(xtermRef.value);

  // Focus immediately after mount
  await nextTick();
  setTimeout(() => {
    fitAddon?.fit();
    term?.focus();
  }, 60);

  const sessionId = terminalStore.activeSessionId;

  if (window.electronAPI) {
    await window.electronAPI.createTerminalSession(sessionId, term.cols || 80, term.rows || 24);

    cleanupListener = window.electronAPI.onTerminalData((id, data) => {
      if (id === sessionId && term) term.write(data);
    });

    term.onData((data) => {
      if (window.electronAPI) {
        window.electronAPI.writeTerminalData(sessionId, data);
      }
    });

    term.onResize(({ cols, rows }) => {
      if (window.electronAPI) {
        window.electronAPI.resizeTerminalSession(sessionId, cols, rows);
      }
    });
  }

  // Ensure focus is solid
  setTimeout(() => {
    term?.focus();
  }, 120);

  // ResizeObserver to keep terminal fitted when drawer resizes
  if (ro) ro.disconnect();
  ro = new ResizeObserver(() => {
    fitAddon?.fit();
  });
  if (xtermRef.value) ro.observe(xtermRef.value);
};

const clearTerminal = () => {
  if (term) {
    term.clear();
    term.focus();
  }
};

const restartTerminal = async () => {
  const sessionId = terminalStore.activeSessionId;
  if (window.electronAPI) {
    await window.electronAPI.destroyTerminalSession(sessionId);
  }
  await initTerminal();
};

onMounted(() => {
  initTerminal();
});

// Re-init when active session changes
watch(() => terminalStore.activeSessionId, initTerminal);

// Focus when switching to terminal tab or opening drawer
watch(() => browserStore.activeDrawerTab, (tab) => {
  if (tab === 'terminal') {
    nextTick(() => {
      fitAddon?.fit();
      term?.focus();
    });
  }
});

watch(() => browserStore.isDrawerOpen, (isOpen) => {
  if (isOpen && browserStore.activeDrawerTab === 'terminal') {
    nextTick(() => {
      fitAddon?.fit();
      term?.focus();
    });
  }
});

onBeforeUnmount(() => {
  ro?.disconnect();
  cleanupListener?.();
  term?.dispose();
});
</script>

<template>
  <div
    ref="containerRef"
    class="w-full h-full flex flex-col overflow-hidden bg-[#0c1013] cursor-text"
    @click="focusTerminal"
    tabindex="0"
  >
    <!-- Tab bar for multiple terminal sessions & actions (shown if >1 session) -->
    <div
      v-if="terminalStore.sessions.length > 1"
      class="flex items-center justify-between bg-[#0e1214] border-b border-[#181f23] h-7 px-2 shrink-0 select-none"
    >
      <div class="flex items-center gap-1 overflow-x-auto">
        <button
          v-for="session in terminalStore.sessions"
          :key="session.id"
          @click.stop="terminalStore.setActiveSession(session.id); focusTerminal()"
          class="flex items-center gap-1.5 px-2.5 h-6 text-2xs font-medium rounded transition-colors"
          :class="terminalStore.activeSessionId === session.id
            ? 'text-zinc-100 bg-canvas border border-border shadow-sm font-semibold'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'"
        >
          <TerminalIcon class="w-3 h-3 text-nvidia" />
          <span>{{ session.name }}</span>
          <span
            v-if="terminalStore.sessions.length > 1"
            @click.stop="terminalStore.removeSession(session.id)"
            class="ml-1 text-zinc-500 hover:text-rose-400 w-3.5 h-3.5 flex items-center justify-center rounded"
          >
            <X class="w-2.5 h-2.5" />
          </span>
        </button>
        <button
          @click.stop="terminalStore.addSession(); focusTerminal()"
          class="w-6 h-6 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
          title="New terminal tab"
        >
          <Plus class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center gap-1">
        <span class="text-[10px] text-zinc-500 font-mono px-2 py-0.5 rounded bg-black/40 border border-white/5 hidden sm:inline-block">
          System Shell Active
        </span>
        <button
          @click.stop="clearTerminal"
          class="flex items-center gap-1 px-2 h-6 text-2xs text-zinc-500 hover:text-zinc-200 hover:bg-white/5 rounded transition-colors"
          title="Clear Terminal (Ctrl+L)"
        >
          <Trash2 class="w-3 h-3" />
          <span class="hidden md:inline">Clear</span>
        </button>
        <button
          @click.stop="restartTerminal"
          class="flex items-center gap-1 px-2 h-6 text-2xs text-zinc-500 hover:text-zinc-200 hover:bg-white/5 rounded transition-colors"
          title="Restart Shell Session"
        >
          <RotateCcw class="w-3 h-3" />
          <span class="hidden md:inline">Restart</span>
        </button>
      </div>
    </div>

    <!-- xterm.js canvas -->
    <div
      ref="xtermRef"
      class="flex-1 overflow-hidden"
      style="min-height: 0;"
      @click="focusTerminal"
    />
  </div>
</template>

<style scoped>
/* Ensure the xterm viewport fills the container correctly */
:deep(.xterm) {
  width: 100%;
  height: 100%;
  padding: 6px 12px;
}
:deep(.xterm-viewport) {
  background: transparent !important;
}
:deep(.xterm-screen) {
  width: 100% !important;
}
</style>
