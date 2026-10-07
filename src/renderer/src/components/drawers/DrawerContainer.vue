<script setup lang="ts">
import { useBrowserStore } from '../../stores/browser-store';
import { useDevToolsStore } from '../../stores/devtools-store';
import { useTerminalStore } from '../../stores/terminal-store';
import TerminalPanel from './TerminalPanel.vue';
import SmartCurlPanel from './SmartCurlPanel.vue';
import LoadTesterStudio from './LoadTesterStudio.vue';
import MemoryProfilerView from './MemoryProfilerView.vue';
import ConsolePanel from './ConsolePanel.vue';
import NetworkPanel from './NetworkPanel.vue';
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  MoreHorizontal,
  ExternalLink,
  Split
} from 'lucide-vue-next';

const browserStore = useBrowserStore();
const devToolsStore = useDevToolsStore();
const terminalStore = useTerminalStore();

const tabs = [
  { id: 'terminal', label: 'Terminal' },
  { id: 'console',  label: 'Problems', badge: () => devToolsStore.errorCount || 0 },
  { id: 'network',  label: 'Network' },
  { id: 'memory',   label: 'Memory' },
];

const handleNewTerminal = () => {
  terminalStore.addSession();
};

const handleClearTerminal = () => {
  window.dispatchEvent(new CustomEvent('bstudio:terminal-clear'));
};

const startDrawerResize = (e: PointerEvent) => {
  e.preventDefault();
  const target = e.currentTarget as HTMLElement;
  try {
    target.setPointerCapture(e.pointerId);
  } catch {}
  browserStore.setDraggingResizer(true, 'row-resize');

  const startY = e.clientY;
  const startHeight = browserStore.drawerHeight;

  const onPointerMove = (ev: PointerEvent) => {
    const deltaY = startY - ev.clientY;
    browserStore.setDrawerHeight(startHeight + deltaY);
    window.dispatchEvent(new Event('resize'));
  };

  const onPointerUp = (ev: PointerEvent) => {
    try {
      target.releasePointerCapture(ev.pointerId);
    } catch {}
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    browserStore.setDraggingResizer(false);
    window.dispatchEvent(new Event('resize'));
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
};
</script>

<template>
  <Transition name="drawer">
    <div
      v-if="browserStore.isDrawerOpen"
      class="w-full bg-[#121215] border-t border-[#222226] flex flex-col shrink-0 z-20 overflow-hidden relative"
      :style="{
        height: browserStore.drawerHeight + 'px',
        transition: browserStore.isDraggingResizer ? 'none' : 'height 180ms ease'
      }"
    >
      <!-- Top Resizer Handle -->
      <div
        @pointerdown="startDrawerResize"
        class="w-full h-1.5 cursor-row-resize z-30 group hover:bg-[#76b900]/60 active:bg-[#76b900] transition-colors select-none relative shrink-0 -mt-0.5"
        title="Drag to resize Drawer"
      >
        <div class="absolute inset-x-0 -top-1 -bottom-1 z-10" />
      </div>

      <!-- Tab bar (Matched to Reference Screenshot) -->
      <div class="flex items-center bg-[#141418] border-b border-[#222226] px-2 h-8.5 shrink-0 select-none">
        <!-- Left Tabs -->
        <div class="flex items-center flex-1 h-full">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="browserStore.activeDrawerTab = tab.id as any"
            class="flex items-center gap-1.5 px-3 h-full text-xs font-sans transition-all border-b-2"
            :class="browserStore.activeDrawerTab === tab.id
              ? 'border-[#76b900] text-white font-medium bg-white/[0.02]'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'"
          >
            <span>{{ tab.label }}</span>
            <span
              v-if="tab.badge !== undefined"
              class="px-1.5 py-0.2 rounded-full text-[10px] bg-white/10 text-zinc-400 font-mono"
            >
              {{ tab.badge() }}
            </span>
          </button>
        </div>

        <!-- Right Terminal Toolbar Controls (Exact match to screenshot) -->
        <div class="flex items-center gap-1 text-zinc-400 shrink-0 pr-1">
          <!-- Add Terminal Session -->
          <button
            @click="handleNewTerminal"
            class="w-6 h-6 flex items-center justify-center rounded hover:text-white hover:bg-white/10 transition-colors"
            title="New Terminal Session"
          >
            <Plus class="w-3.5 h-3.5" />
          </button>

          <!-- Split Terminal -->
          <button
            @click="handleNewTerminal"
            class="w-6 h-6 flex items-center justify-center rounded hover:text-white hover:bg-white/10 transition-colors"
            title="Split Terminal"
          >
            <Split class="w-3.5 h-3.5" />
          </button>

          <!-- Clear Terminal -->
          <button
            @click="handleClearTerminal"
            class="w-6 h-6 flex items-center justify-center rounded hover:text-white hover:bg-white/10 transition-colors"
            title="Clear Terminal"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>

          <!-- Inspect DevTools detached -->
          <button
            @click="devToolsStore.openNativeDevTools"
            class="w-6 h-6 flex items-center justify-center rounded hover:text-white hover:bg-white/10 transition-colors"
            title="Inspect Chrome DevTools Window"
          >
            <ExternalLink class="w-3.5 h-3.5 text-[#76b900]" />
          </button>

          <!-- More Options -->
          <button
            class="w-6 h-6 flex items-center justify-center rounded hover:text-white hover:bg-white/10 transition-colors"
            title="More Options"
          >
            <MoreHorizontal class="w-3.5 h-3.5" />
          </button>

          <!-- Minimize / Close Drawer -->
          <button
            @click="browserStore.isDrawerOpen = false"
            class="w-6 h-6 flex items-center justify-center rounded hover:text-white hover:bg-white/10 transition-colors ml-1"
            title="Minimize Panel"
          >
            <ChevronDown class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Drawer Content Panels -->
      <div class="flex-1 overflow-hidden relative bg-[#101014]">
        <TerminalPanel v-show="browserStore.activeDrawerTab === 'terminal'" />
        <ConsolePanel v-show="browserStore.activeDrawerTab === 'console'" />
        <NetworkPanel v-show="browserStore.activeDrawerTab === 'network'" />
        <SmartCurlPanel v-show="browserStore.activeDrawerTab === 'api'" />
        <LoadTesterStudio v-show="browserStore.activeDrawerTab === 'load'" />
        <MemoryProfilerView v-show="browserStore.activeDrawerTab === 'memory'" />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: height 180ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.drawer-enter-from,
.drawer-leave-to {
  height: 0 !important;
}
</style>
