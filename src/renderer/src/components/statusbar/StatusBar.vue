<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTelemetryStore } from '../../stores/telemetry-store';
import { useBrowserStore } from '../../stores/browser-store';
import { useGitStore } from '../../stores/git-store';
import { useExtensionsStore } from '../../stores/extensions-store';
import { GitBranch, AlertCircle, AlertTriangle, Cpu, WifiOff, Radio, ChevronRight, Sparkles, TerminalSquare, Bug, Palette, Zap, CheckCheck } from 'lucide-vue-next';

const telemetryStore = useTelemetryStore();
const browserStore = useBrowserStore();
const gitStore = useGitStore();
const extensionsStore = useExtensionsStore();
const hasNebius = ref(false);
const hasGemini = ref(false);

const handleGoLive = () => {
  browserStore.activeViewMode = 'split';
  browserStore.navigate('http://localhost:5173');
};

onMounted(async () => {
  if (window.electronAPI) {
    const nk = await window.electronAPI.getEncryptedKey('NEBIUS_API_KEY');
    hasNebius.value = !!(nk && nk.trim().length > 0);
    const gk = await window.electronAPI.getEncryptedKey('GEMINI_API_KEY');
    hasGemini.value = !!(gk && gk.trim().length > 0);
  }
});
</script>

<template>
  <div class="h-6 w-full bg-[#0a0a0c] border-t border-border flex items-center justify-between px-3 shrink-0 z-30 select-none">
    <!-- Left -->
    <div class="flex items-center gap-3">
      <!-- Git branch -->
      <div
        @click="gitStore.fetchStatus()"
        class="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors group"
        :title="gitStore.isRepo ? `Branch: ${gitStore.branch}` : 'No Git repo'"
      >
        <GitBranch class="w-3 h-3 text-nvidia" />
        <span class="font-mono text-2xs">{{ gitStore.branch || (gitStore.isRepo ? 'detached' : 'no git') }}</span>
        <span v-if="gitStore.totalChangesCount > 0" class="text-[10px] text-amber-400 font-bold font-mono">
          *{{ gitStore.totalChangesCount }}
        </span>
        <ChevronRight class="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <!-- Error/Warning counts -->
      <button
        @click="browserStore.openDrawer('console')"
        class="flex items-center gap-2 text-2xs hover:text-zinc-200 transition-colors"
        title="Open DevTools Console"
      >
        <span class="flex items-center gap-1" :class="telemetryStore.criticalCount > 0 ? 'text-diagnostic-crimson' : 'text-zinc-600'">
          <AlertCircle class="w-3 h-3" />
          {{ telemetryStore.criticalCount }}
        </span>
        <span class="flex items-center gap-1" :class="telemetryStore.warningCount > 0 ? 'text-diagnostic-amber' : 'text-zinc-600'">
          <AlertTriangle class="w-3 h-3" />
          {{ telemetryStore.warningCount }}
        </span>
      </button>

      <!-- Terminal Quick Button -->
      <button
        @click="browserStore.toggleDrawer('terminal')"
        class="flex items-center gap-1 text-2xs hover:text-zinc-200 transition-colors px-1 py-0.5 rounded hover:bg-white/5"
        :class="browserStore.isDrawerOpen && browserStore.activeDrawerTab === 'terminal' ? 'text-nvidia font-medium' : 'text-zinc-500'"
        title="Toggle Integrated Terminal (Ctrl+`)"
      >
        <TerminalSquare class="w-3 h-3 text-nvidia" />
        <span>Terminal</span>
      </button>

      <!-- DevTools Console Quick Button -->
      <button
        @click="browserStore.toggleDrawer('console')"
        class="flex items-center gap-1 text-2xs hover:text-zinc-200 transition-colors px-1 py-0.5 rounded hover:bg-white/5"
        :class="browserStore.isDrawerOpen && browserStore.activeDrawerTab === 'console' ? 'text-amber-400 font-medium' : 'text-zinc-500'"
        title="Toggle DevTools Console"
      >
        <Bug class="w-3 h-3 text-amber-400" />
        <span>Console</span>
      </button>
    </div>

    <!-- Center -->
    <div class="flex items-center gap-1.5 text-2xs text-zinc-600">
      <span class="pulse-dot w-1.5 h-1.5 rounded-full bg-nvidia inline-block" />
      <span>HMR</span>
    </div>

    <!-- Right -->
    <div class="flex items-center gap-3 text-2xs text-zinc-600">
      <div
        v-if="hasGemini"
        class="flex items-center gap-1 text-accent-blue cursor-pointer hover:underline transition-colors"
        title="Google Gemini Connected"
        @click="browserStore.isApiKeyModalOpen = true"
      >
        <Sparkles class="w-3 h-3" />
        <span>Gemini AI</span>
      </div>
      <div
        v-else-if="hasNebius"
        class="flex items-center gap-1 text-nvidia cursor-pointer hover:underline transition-colors"
        title="Nebius Nemotron Connected"
        @click="browserStore.isApiKeyModalOpen = true"
      >
        <Cpu class="w-3 h-3" />
        <span>Nemotron 3</span>
      </div>
      <div
        v-else
        class="flex items-center gap-1 text-diagnostic-amber/70 cursor-pointer hover:text-diagnostic-amber transition-colors"
        title="No API key — offline editor mode"
        @click="browserStore.isApiKeyModalOpen = true"
      >
        <WifiOff class="w-3 h-3" />
        <span>Offline Mode</span>
      </div>
      <!-- Live Server Extension: Go Live -->
      <button
        v-if="extensionsStore.isLiveServerActive"
        @click="handleGoLive"
        class="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors px-1 py-0.5 rounded hover:bg-white/5"
        title="Live Server: Preview app on localhost:5173"
      >
        <Zap class="w-3 h-3 text-sky-400" />
        <span>Go Live</span>
      </button>

      <!-- Prettier Formatter Extension -->
      <div
        v-if="extensionsStore.isPrettierActive"
        class="flex items-center gap-1 text-amber-400/90 font-mono text-[10px]"
        title="Prettier Formatter Active (Shift+Alt+F)"
      >
        <CheckCheck class="w-2.5 h-2.5 text-amber-400" />
        <span>Prettier</span>
      </div>

      <!-- Theme Switcher -->
      <button
        @click="window.dispatchEvent(new CustomEvent('bstudio:open-extensions'))"
        class="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-white/5"
        title="Current Color Theme (Click to change in Extensions)"
      >
        <Palette class="w-3 h-3 text-[#ff9f0a]" />
        <span class="capitalize text-zinc-300 font-mono text-[10px]">{{ extensionsStore.activeTheme.replace(/-/g, ' ') }}</span>
      </button>

      <span class="text-zinc-700">UTF-8</span>
      <span class="text-zinc-700">Vue 3</span>
    </div>
  </div>
</template>
