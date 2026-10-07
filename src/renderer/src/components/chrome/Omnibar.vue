<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useBrowserStore } from '../../stores/browser-store';
import { useFsStore } from '../../stores/fs-store';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  X,
  Lock,
  AlertTriangle,
  Layout,
  Code2,
  Globe,
  Square,
  Home,
  ChevronDown,
  FolderOpen,
  FilePlus,
  FileCode,
  Save,
  Boxes,
  Bug
} from 'lucide-vue-next';

const browserStore = useBrowserStore();
const fsStore = useFsStore();
const isFileMenuOpen = ref(false);
const fileMenuRef = ref<HTMLElement | null>(null);

const handleClickOutside = (e: MouseEvent) => {
  if (fileMenuRef.value && !fileMenuRef.value.contains(e.target as Node)) {
    isFileMenuOpen.value = false;
  }
};

onMounted(() => {
  window.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutside);
});
const localUrl = ref(browserStore.url);
const isEditing = ref(false);
const urlInputRef = ref<HTMLInputElement | null>(null);

const isHttps = computed(() => browserStore.url.startsWith('https://'));
const displayUrl = computed(() => {
  if (isEditing.value) return localUrl.value;
  try {
    const u = new URL(browserStore.url);
    return u.hostname + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return browserStore.url;
  }
});

watch(() => browserStore.url, (v) => { if (!isEditing.value) localUrl.value = v; });

const handleFocus = () => {
  isEditing.value = true;
  localUrl.value = browserStore.url;
  setTimeout(() => urlInputRef.value?.select(), 10);
};

const handleBlur = () => {
  isEditing.value = false;
  localUrl.value = browserStore.url;
};

const handleNavigate = () => {
  let url = localUrl.value.trim();
  if (!url) return;
  if (!url.includes('://') && !url.startsWith('//') && !url.startsWith('bstudio://')) {
    // treat as search if no dot or starts with space
    if (!url.includes('.')) {
      url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
    } else {
      url = 'https://' + url;
    }
  }
  localUrl.value = url;
  browserStore.navigate(url);
  isEditing.value = false;
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') { handleNavigate(); urlInputRef.value?.blur(); }
  if (e.key === 'Escape') { isEditing.value = false; localUrl.value = browserStore.url; urlInputRef.value?.blur(); }
};

const setMode = (mode: 'editor' | 'split' | 'browser') => {
  browserStore.activeViewMode = mode;
};
</script>

<template>
  <div class="flex items-center gap-2.5 px-3 h-10 shrink-0 z-40 select-none bg-[#13181a] border-b border-[#1b2327]">

    <!-- Browser Navigation Controls -->
    <div class="flex items-center gap-1 shrink-0">
      <button
        @click="browserStore.goBack"
        :disabled="!browserStore.canGoBack"
        class="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/5 disabled:opacity-25 disabled:hover:bg-transparent transition-colors no-drag"
        title="Back"
      >
        <ArrowLeft class="w-4 h-4" />
      </button>
      <button
        @click="browserStore.goForward"
        :disabled="!browserStore.canGoForward"
        class="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/5 disabled:opacity-25 disabled:hover:bg-transparent transition-colors no-drag"
        title="Forward"
      >
        <ArrowRight class="w-4 h-4" />
      </button>
      <button
        @click="browserStore.isLoading ? browserStore.stopLoading() : browserStore.reload()"
        class="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors no-drag"
        title="Reload"
      >
        <RotateCw v-if="!browserStore.isLoading" class="w-3.5 h-3.5" />
        <X v-else class="w-3.5 h-3.5 text-zinc-400" />
      </button>
    </div>

    <!-- Central Address Bar (Matched to Screenshot) -->
    <div class="flex-1 max-w-3xl no-drag">
      <div
        class="flex items-center gap-2 h-7.5 px-3 rounded-lg bg-[#1a2023] border border-[#263036] transition-all duration-150 cursor-text"
        :class="isEditing ? 'border-[#76b900]/70 ring-1 ring-[#76b900]/20' : 'hover:border-[#383842]'"
        @click="!isEditing && urlInputRef?.focus()"
      >
        <!-- SSL Lock Icon -->
        <div class="shrink-0 flex items-center">
          <Lock v-if="isHttps" class="w-3 h-3 text-zinc-400" />
          <AlertTriangle v-else class="w-3 h-3 text-diagnostic-amber" />
        </div>

        <!-- URL Input -->
        <input
          ref="urlInputRef"
          type="text"
          v-model="localUrl"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown="handleKeyDown"
          class="flex-1 min-w-0 bg-transparent text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none"
          :class="isEditing ? 'text-zinc-100' : 'text-zinc-300'"
          placeholder="https://nvidia.com"
          spellcheck="false"
        />

        <!-- Loading spinner -->
        <div v-if="browserStore.isLoading" class="shrink-0">
          <div class="w-3 h-3 border border-zinc-600 border-t-nvidia rounded-full animate-spin" />
        </div>
      </div>
    </div>

    <!-- Right Controls: View Switcher & DevTools -->
    <div class="flex items-center gap-2 shrink-0 no-drag ml-auto">
      <!-- Segmented View Mode Buttons (Exact Match to Screenshot) -->
      <div class="flex items-center gap-1 bg-[#1a2023] p-0.5 rounded-lg border border-[#263036]">
        <button
          @click="setMode('editor')"
          :class="browserStore.activeViewMode === 'editor'
            ? 'border border-[#76b900] bg-[#76b900]/10 text-[#7ee712] font-semibold'
            : 'border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5'"
          class="px-3 py-0.5 rounded text-xs transition-all"
          title="Code editor only"
        >
          Code
        </button>
        <button
          @click="setMode('split')"
          :class="browserStore.activeViewMode === 'split'
            ? 'border border-[#76b900] bg-[#76b900]/10 text-[#7ee712] font-semibold'
            : 'border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5'"
          class="px-3 py-0.5 rounded text-xs transition-all"
          title="Split code & browser view"
        >
          Split
        </button>
        <button
          @click="setMode('browser')"
          :class="browserStore.activeViewMode === 'browser'
            ? 'border border-[#76b900] bg-[#76b900]/10 text-[#7ee712] font-semibold'
            : 'border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5'"
          class="px-3 py-0.5 rounded text-xs transition-all"
          title="Browser only"
        >
          Web
        </button>
      </div>

      <!-- DevTools Button (Bordered, matched to screenshot) -->
      <button
        @click="window.electronAPI?.toggleDevTools()"
        class="h-7 px-2.5 bg-[#1a2023] border border-[#263036] hover:border-zinc-500 rounded-lg flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white transition-colors"
        title="Toggle DevTools (F12)"
      >
        <Code2 class="w-3.5 h-3.5 text-zinc-400" />
        <span>DevTools</span>
      </button>

      <!-- Toggle Copilot Panel -->
      <button
        @click="browserStore.isCopilotOpen = !browserStore.isCopilotOpen"
        class="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
        :class="browserStore.isCopilotOpen ? 'text-[#7ee712]' : ''"
        title="Toggle Assistant Panel"
      >
        <Layout class="w-3.5 h-3.5 rotate-90" />
      </button>
    </div>
  </div>
</template>
