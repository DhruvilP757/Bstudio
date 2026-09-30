<script setup lang="ts">
import { useBrowserStore } from '../../stores/browser-store';
import { useDevToolsStore } from '../../stores/devtools-store';
import TerminalPanel from './TerminalPanel.vue';
import SmartCurlPanel from './SmartCurlPanel.vue';
import LoadTesterStudio from './LoadTesterStudio.vue';
import MemoryProfilerView from './MemoryProfilerView.vue';
import ConsolePanel from './ConsolePanel.vue';
import NetworkPanel from './NetworkPanel.vue';
import {
  X,
  TerminalSquare,
  Send,
  Activity,
  Cpu,
  ChevronDown,
  Bug,
  ArrowLeftRight,
  ExternalLink
} from 'lucide-vue-next';

const browserStore = useBrowserStore();
const devToolsStore = useDevToolsStore();

const tabs = [
  { id: 'terminal', label: 'Terminal',         icon: TerminalSquare, color: 'text-nvidia', badge: null },
  { id: 'console',  label: 'DevTools Console', icon: Bug,            color: 'text-amber-400', badge: () => devToolsStore.errorCount },
  { id: 'network',  label: 'Network',          icon: ArrowLeftRight,  color: 'text-cyan-400', badge: () => devToolsStore.networkFailedCount },
  { id: 'api',      label: 'Smart cURL',       icon: Send,            color: 'text-accent-blue', badge: null },
  { id: 'load',     label: 'Load Test',        icon: Activity,        color: 'text-diagnostic-amber', badge: null },
  { id: 'memory',   label: 'Memory',           icon: Cpu,             color: 'text-accent-purple', badge: null },
];

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
    // Dragging upwards increases drawer height
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
      class="w-full bg-sidebar border-t border-border flex flex-col shrink-0 z-20 overflow-hidden relative"
      :style="{
        height: browserStore.drawerHeight + 'px',
        transition: browserStore.isDraggingResizer ? 'none' : 'height 180ms ease'
      }"
    >
      <!-- Top Resizer Handle -->
      <div
        @pointerdown="startDrawerResize"
        class="w-full h-1.5 cursor-row-resize z-30 group hover:bg-nvidia/60 active:bg-nvidia transition-colors select-none relative shrink-0 -mt-0.5"
        title="Drag to resize Drawer"
      >
        <div class="absolute inset-x-0 -top-1 -bottom-1 z-10" />
      </div>

      <!-- Tab bar -->
      <div class="flex items-center bg-canvas/60 border-b border-border px-1 h-9 shrink-0 select-none">
        <div class="flex items-center flex-1 overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="browserStore.activeDrawerTab = tab.id as any"
            class="flex items-center gap-1.5 px-3 h-9 text-xs font-medium border-b-2 transition-all shrink-0"
            :class="browserStore.activeDrawerTab === tab.id
              ? `border-current ${tab.color} bg-white/4`
              : 'border-transparent text-zinc-600 hover:text-zinc-300'"
          >
            <component :is="tab.icon" class="w-3.5 h-3.5" />
            <span>{{ tab.label }}</span>
            <span
              v-if="tab.badge && tab.badge() > 0"
              class="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500/30 text-rose-300 font-mono font-bold"
            >
              {{ tab.badge() }}
            </span>
          </button>
        </div>

        <!-- DevTools Launch Button & Close -->
        <div class="flex items-center gap-1 shrink-0">
          <button
            @click="devToolsStore.openNativeDevTools"
            class="flex items-center gap-1 px-2 py-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/5 text-[11px] font-sans transition-colors"
            title="Inspect with Chrome DevTools Detached Window"
          >
            <ExternalLink class="w-3.5 h-3.5 text-nvidia" />
            <span class="hidden md:inline">Inspect DevTools</span>
          </button>

          <button
            @click="browserStore.isDrawerOpen = false"
            class="w-7 h-7 flex items-center justify-center rounded text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors mr-1"
            title="Close panel (Ctrl+`)"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Panel content -->
      <div class="flex-1 overflow-hidden">
        <TerminalPanel      v-if="browserStore.activeDrawerTab === 'terminal'" />
        <ConsolePanel       v-else-if="browserStore.activeDrawerTab === 'console'" />
        <NetworkPanel       v-else-if="browserStore.activeDrawerTab === 'network'" />
        <SmartCurlPanel     v-else-if="browserStore.activeDrawerTab === 'api'" />
        <LoadTesterStudio   v-else-if="browserStore.activeDrawerTab === 'load'" />
        <MemoryProfilerView v-else-if="browserStore.activeDrawerTab === 'memory'" />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: height 180ms cubic-bezier(0.4, 0, 0.2, 1), opacity 120ms ease;
  overflow: hidden;
}
.drawer-enter-from,
.drawer-leave-to {
  height: 0;
  opacity: 0;
}
.drawer-enter-to,
.drawer-leave-from {
  height: v-bind('browserStore.drawerHeight + "px"');
  opacity: 1;
}
</style>
