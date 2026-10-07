<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTelemetryStore } from '../../stores/telemetry-store';
import { useBrowserStore } from '../../stores/browser-store';
import { useGitStore } from '../../stores/git-store';
import { useFsStore } from '../../stores/fs-store';
import {
  GitBranch,
  RotateCw,
  XCircle,
  AlertTriangle,
  Check,
  Bell,
  Code2
} from 'lucide-vue-next';

const telemetryStore = useTelemetryStore();
const browserStore = useBrowserStore();
const gitStore = useGitStore();
const fsStore = useFsStore();

const activeLanguage = () => {
  const file = fsStore.activeFile?.name || '';
  if (file.endsWith('.tsx') || file.endsWith('.jsx')) return 'TypeScript React';
  if (file.endsWith('.ts')) return 'TypeScript';
  if (file.endsWith('.js')) return 'JavaScript';
  if (file.endsWith('.vue')) return 'Vue';
  if (file.endsWith('.css')) return 'CSS';
  if (file.endsWith('.json')) return 'JSON';
  if (file.endsWith('.html')) return 'HTML';
  return 'TypeScript React';
};

onMounted(() => {
  gitStore.fetchStatus();
});
</script>

<template>
  <div class="h-6 w-full bg-[#0e0e11] border-t border-[#222226] flex items-center justify-between px-3 shrink-0 z-30 select-none text-[11px] text-zinc-400 font-sans">
    <!-- Left Section: Git & Diagnostics -->
    <div class="flex items-center gap-3">
      <!-- Git Branch -->
      <button
        @click="gitStore.fetchStatus()"
        class="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
        :title="gitStore.isRepo ? `Branch: ${gitStore.branch}` : 'Branch: main'"
      >
        <GitBranch class="w-3 h-3 text-zinc-400" />
        <span class="font-mono text-zinc-300">{{ gitStore.branch || 'main' }}</span>
      </button>

      <!-- Sync Status -->
      <button
        @click="gitStore.fetchStatus()"
        class="hover:text-white transition-colors cursor-pointer"
        title="Sync Changes with Git Remote"
      >
        <RotateCw class="w-3 h-3 text-zinc-400" />
      </button>

      <!-- Errors & Warnings (Exact match to screenshot) -->
      <button
        @click="browserStore.openDrawer('console')"
        class="flex items-center gap-2 hover:text-zinc-200 transition-colors"
        title="View Problems"
      >
        <span class="flex items-center gap-1 text-zinc-400">
          <XCircle class="w-3 h-3 text-zinc-400" />
          <span>{{ telemetryStore.criticalCount }} errors</span>
        </span>
        <span class="flex items-center gap-1 text-zinc-400">
          <AlertTriangle class="w-3 h-3 text-zinc-400" />
          <span>{{ telemetryStore.warningCount }} warnings</span>
        </span>
      </button>
    </div>

    <!-- Right Section: Cursor, Encoding, Language, Prettier, Bell -->
    <div class="flex items-center gap-3.5 text-zinc-400">
      <span class="hover:text-zinc-200 transition-colors cursor-pointer">Ln 1, Col 1</span>
      <span class="hover:text-zinc-200 transition-colors cursor-pointer">Spaces: 2</span>
      <span class="hover:text-zinc-200 transition-colors cursor-pointer">UTF-8</span>
      <span class="hover:text-zinc-200 transition-colors cursor-pointer">LF</span>
      <span class="hover:text-zinc-200 transition-colors cursor-pointer text-zinc-300 font-medium">
        {{ activeLanguage() }}
      </span>

      <!-- Curly braces indicator -->
      <span class="hover:text-white transition-colors cursor-pointer font-mono font-bold text-zinc-400">{ }</span>

      <!-- Prettier with checkmark -->
      <div
        class="flex items-center gap-1 text-zinc-300 hover:text-white transition-colors cursor-pointer"
        title="Prettier Formatter Active"
      >
        <span>Prettier</span>
        <Check class="w-3 h-3 text-[#76b900]" />
      </div>

      <!-- Notifications Bell -->
      <button
        class="hover:text-white transition-colors cursor-pointer"
        title="Notifications"
      >
        <Bell class="w-3 h-3 text-zinc-400" />
      </button>
    </div>
  </div>
</template>
