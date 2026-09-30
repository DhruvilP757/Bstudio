<script setup lang="ts">
import { useBrowserStore } from '../../stores/browser-store';
import { useGitStore } from '../../stores/git-store';
import { useDevToolsStore } from '../../stores/devtools-store';
import {
  Files,
  Boxes,
  GitBranch,
  TerminalSquare,
  Bug,
  ArrowLeftRight,
  Send,
  Activity,
  Bot,
  Settings,
  Cpu
} from 'lucide-vue-next';

const props = withDefaults(defineProps<{
  activeSidebarTab?: 'explorer' | 'extensions' | 'git';
  isSidebarOpen?: boolean;
}>(), {
  activeSidebarTab: 'explorer',
  isSidebarOpen: true
});

const emit = defineEmits<{
  (e: 'select-tab', tab: 'explorer' | 'extensions' | 'git'): void;
}>();

const browserStore = useBrowserStore();
const gitStore = useGitStore();
const devToolsStore = useDevToolsStore();

const handleSidebarTabClick = (tab: 'explorer' | 'extensions' | 'git') => {
  emit('select-tab', tab);
};

const navItems = [
  { id: 'terminal', icon: TerminalSquare, label: 'Terminal',         shortcut: 'Ctrl+`', action: () => browserStore.toggleDrawer('terminal') },
  { id: 'console',  icon: Bug,            label: 'DevTools Console', shortcut: '',       action: () => browserStore.toggleDrawer('console') },
  { id: 'network',  icon: ArrowLeftRight,  label: 'Network',          shortcut: '',       action: () => browserStore.toggleDrawer('network') },
  { id: 'api',      icon: Send,           label: 'API Tester',       shortcut: '',       action: () => browserStore.toggleDrawer('api') },
  { id: 'load',     icon: Activity,       label: 'Load Test',        shortcut: '',       action: () => browserStore.toggleDrawer('load') },
  { id: 'memory',   icon: Cpu,            label: 'Memory',           shortcut: '',       action: () => browserStore.toggleDrawer('memory') },
];

const isDrawerTabActive = (id: string) =>
  browserStore.isDrawerOpen && browserStore.activeDrawerTab === id;
</script>

<template>
  <div class="w-11 h-full bg-sidebar border-r border-border flex flex-col items-center py-1.5 shrink-0 z-20">
    <!-- Top nav icons -->
    <div class="flex flex-col items-center gap-0.5 w-full px-1">
      <!-- Explorer button -->
      <button
        @click="handleSidebarTabClick('explorer')"
        class="w-9 h-9 rounded flex items-center justify-center transition-all duration-100 relative group"
        :class="props.isSidebarOpen && props.activeSidebarTab === 'explorer'
          ? 'text-nvidia bg-nvidia/10'
          : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'"
        title="Explorer (Ctrl+B)"
      >
        <Files class="w-4 h-4" />
        <div
          v-if="props.isSidebarOpen && props.activeSidebarTab === 'explorer'"
          class="absolute left-0 top-2 bottom-2 w-0.5 bg-nvidia rounded-r"
        />
      </button>

      <!-- Extensions button -->
      <button
        @click="handleSidebarTabClick('extensions')"
        class="w-9 h-9 rounded flex items-center justify-center transition-all duration-100 relative group"
        :class="props.isSidebarOpen && props.activeSidebarTab === 'extensions'
          ? 'text-nvidia bg-nvidia/10'
          : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'"
        title="Extensions (Ctrl+Shift+X)"
      >
        <Boxes class="w-4 h-4" />
        <div
          v-if="props.isSidebarOpen && props.activeSidebarTab === 'extensions'"
          class="absolute left-0 top-2 bottom-2 w-0.5 bg-nvidia rounded-r"
        />
      </button>

      <!-- Source Control (Git) button -->
      <button
        @click="handleSidebarTabClick('git')"
        class="w-9 h-9 rounded flex items-center justify-center transition-all duration-100 relative group"
        :class="props.isSidebarOpen && props.activeSidebarTab === 'git'
          ? 'text-nvidia bg-nvidia/10'
          : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'"
        title="Source Control (Ctrl+Shift+G)"
      >
        <GitBranch class="w-4 h-4" />
        <span
          v-if="gitStore.totalChangesCount > 0"
          class="absolute top-1 right-1 px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-nvidia text-black text-[9px] font-bold font-mono"
        >
          {{ gitStore.totalChangesCount > 99 ? '99+' : gitStore.totalChangesCount }}
        </span>
        <div
          v-if="props.isSidebarOpen && props.activeSidebarTab === 'git'"
          class="absolute left-0 top-2 bottom-2 w-0.5 bg-nvidia rounded-r"
        />
      </button>

      <!-- Divider -->
      <div class="w-5 h-px bg-border/60 my-1" />
      <button
        v-for="item in navItems"
        :key="item.id"
        @click="item.action()"
        class="w-9 h-9 rounded flex items-center justify-center transition-all duration-100 relative group"
        :class="isDrawerTabActive(item.id)
          ? 'text-nvidia bg-nvidia/10'
          : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'"
        :title="`${item.label}${item.shortcut ? ' (' + item.shortcut + ')' : ''}`"
      >
        <component :is="item.icon" class="w-4 h-4" />
        <!-- Active indicator bar -->
        <div
          v-if="isDrawerTabActive(item.id)"
          class="absolute left-0 top-2 bottom-2 w-0.5 bg-nvidia rounded-r"
        />
      </button>
    </div>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Bottom icons -->
    <div class="flex flex-col items-center gap-0.5 w-full px-1 pb-1">
      <button
        @click="browserStore.isCopilotOpen = !browserStore.isCopilotOpen"
        class="w-9 h-9 rounded flex items-center justify-center transition-all duration-100 relative"
        :class="browserStore.isCopilotOpen
          ? 'text-nvidia bg-nvidia/10'
          : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'"
        title="AI Copilot (Ctrl+I)"
      >
        <Bot class="w-4 h-4" />
        <div v-if="browserStore.isCopilotOpen" class="absolute left-0 top-2 bottom-2 w-0.5 bg-nvidia rounded-r" />
      </button>

      <button
        @click="browserStore.isApiKeyModalOpen = true"
        class="w-9 h-9 rounded flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all duration-100"
        title="Settings & API Keys"
      >
        <Settings class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
