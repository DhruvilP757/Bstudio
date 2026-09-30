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
  <div class="glass-chrome flex items-center gap-2 px-3 h-11 shrink-0 z-40 select-none">

    <!-- Traffic-light area / Nav buttons -->
    <div class="flex items-center gap-0.5 mr-1">
      <button
        @click="browserStore.goBack"
        :disabled="!browserStore.canGoBack"
        class="w-7 h-7 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/5 disabled:opacity-25 disabled:hover:bg-transparent transition-colors no-drag"
        title="Back"
      >
        <ArrowLeft class="w-3.5 h-3.5" />
      </button>
      <button
        @click="browserStore.goForward"
        :disabled="!browserStore.canGoForward"
        class="w-7 h-7 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/5 disabled:opacity-25 disabled:hover:bg-transparent transition-colors no-drag"
        title="Forward"
      >
        <ArrowRight class="w-3.5 h-3.5" />
      </button>
      <button
        @click="browserStore.isLoading ? browserStore.stopLoading() : browserStore.reload()"
        class="w-7 h-7 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors no-drag"
        title="Reload"
      >
        <RotateCw v-if="!browserStore.isLoading" class="w-3.5 h-3.5" />
        <X v-else class="w-3.5 h-3.5 text-zinc-400" />
      </button>
      <button
        @click="browserStore.navigate('bstudio://start')"
        class="w-7 h-7 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors no-drag"
        title="Diagnostic Portal Home"
      >
        <Home class="w-3.5 h-3.5" />
      </button>
    </div>



    <!-- Safari-style Omnibar -->
    <div
      class="flex-1 max-w-2xl mx-auto no-drag"
      :class="browserStore.activeViewMode === 'editor' ? 'opacity-40 pointer-events-none' : ''"
    >
      <div
        class="flex items-center gap-2 h-8 px-3 rounded-lg transition-all duration-150"
        :class="isEditing
          ? 'bg-elevated border border-nvidia/50 shadow-glow-green'
          : 'bg-white/5 border border-white/0 hover:bg-white/8 hover:border-white/8 cursor-text'"
        @click="!isEditing && urlInputRef?.focus()"
      >
        <!-- SSL Icon -->
        <div class="shrink-0">
          <Lock v-if="isHttps" class="w-3 h-3 text-nvidia/70" />
          <AlertTriangle v-else class="w-3 h-3 text-diagnostic-amber/70" />
        </div>

        <!-- URL Input -->
        <input
          ref="urlInputRef"
          type="text"
          v-model="localUrl"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown="handleKeyDown"
          class="flex-1 min-w-0 bg-transparent text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none"
          :class="isEditing ? 'text-zinc-100' : 'text-zinc-400'"
          placeholder="Search or enter address..."
          spellcheck="false"
        />

        <!-- Loading spinner -->
        <div v-if="browserStore.isLoading" class="shrink-0">
          <div class="w-3 h-3 border border-zinc-600 border-t-nvidia rounded-full animate-spin" />
        </div>
      </div>
    </div>

    <!-- Right controls -->
    <div class="flex items-center gap-1.5 no-drag">
      <!-- Network throttle -->
      <select
        v-if="browserStore.activeViewMode !== 'editor'"
        v-model="browserStore.networkProfile"
        @change="browserStore.setNetwork(browserStore.networkProfile)"
        class="h-7 bg-elevated border border-border text-2xs text-zinc-400 rounded px-2 focus:outline-none hover:border-borderHover cursor-pointer transition-colors"
        title="Network throttling"
      >
        <option value="online">Online</option>
        <option value="fast-3g">Fast 3G</option>
        <option value="slow-3g">Slow 3G</option>
        <option value="offline">Offline</option>
      </select>

      <!-- View mode tabs -->
      <div class="flex items-center bg-elevated border border-border rounded overflow-hidden">
        <button
          @click="setMode('editor')"
          :class="browserStore.activeViewMode === 'editor' ? 'bg-white/10 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'"
          class="flex items-center gap-1 px-2.5 h-7 text-2xs font-medium transition-colors"
          title="Code editor only"
        >
          <Code2 class="w-3 h-3" />
          Code
        </button>
        <div class="w-px h-4 bg-border" />
        <button
          @click="setMode('split')"
          :class="browserStore.activeViewMode === 'split' ? 'bg-white/10 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'"
          class="flex items-center gap-1 px-2.5 h-7 text-2xs font-medium transition-colors"
          title="Split view"
        >
          <Layout class="w-3 h-3" />
          Split
        </button>
        <div class="w-px h-4 bg-border" />
        <button
          @click="setMode('browser')"
          :class="browserStore.activeViewMode === 'browser' ? 'bg-white/10 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'"
          class="flex items-center gap-1 px-2.5 h-7 text-2xs font-medium transition-colors"
          title="Browser only"
        >
          <Globe class="w-3 h-3" />
          Web
        </button>
      </div>

      <!-- DevTools quick action -->
      <button
        @click="window.electronAPI?.toggleDevTools()"
        class="h-7 px-2 bg-elevated border border-border hover:border-nvidia/50 rounded flex items-center gap-1 text-2xs text-zinc-400 hover:text-nvidia transition-colors"
        title="Toggle Chrome DevTools window (F12)"
      >
        <Bug class="w-3 h-3 text-nvidia" />
        <span class="hidden xl:inline">DevTools</span>
      </button>
    </div>
  </div>
</template>
