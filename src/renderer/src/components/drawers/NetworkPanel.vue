<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useDevToolsStore } from '../../stores/devtools-store';
import { DevToolsNetworkEntry } from '../../../shared/devtools-types';
import {
  Trash2,
  ExternalLink,
  Search,
  ArrowUpDown,
  X,
  Globe,
  AlertCircle,
  Clock,
  HardDrive
} from 'lucide-vue-next';

const devToolsStore = useDevToolsStore();
const selectedRequest = ref<DevToolsNetworkEntry | null>(null);

onMounted(() => {
  devToolsStore.initListeners();
});

const filters = [
  { id: 'all', label: 'All' },
  { id: 'xhr/fetch', label: 'Fetch/XHR' },
  { id: 'js', label: 'JS' },
  { id: 'css', label: 'CSS' },
  { id: 'img', label: 'Img' },
  { id: 'doc', label: 'Doc' },
  { id: 'failed', label: 'Failed' },
];

const formatSize = (bytes?: number) => {
  if (bytes === undefined || bytes === 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (ms: number) => {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
};

const getStatusColor = (status: number) => {
  if (status >= 200 && status < 300) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (status >= 300 && status < 400) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
  if (status >= 400 && status < 500) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  if (status >= 500 || status === 0) return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';
};

const totalTransferred = computed(() => {
  const sum = devToolsStore.networkEntries.reduce((acc, curr) => acc + (curr.size || 0), 0);
  return formatSize(sum);
});
</script>

<template>
  <div class="h-full flex flex-col bg-zinc-950 font-mono text-xs select-text overflow-hidden">
    <!-- Toolbar -->
    <div class="h-8 px-2 bg-sidebar border-b border-border flex items-center justify-between shrink-0 select-none">
      <!-- Filter Pills -->
      <div class="flex items-center gap-1">
        <button
          v-for="filter in filters"
          :key="filter.id"
          @click="devToolsStore.activeNetworkFilter = filter.id"
          class="px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors"
          :class="devToolsStore.activeNetworkFilter === filter.id
            ? 'bg-nvidia/20 text-nvidia border border-nvidia/40'
            : 'text-zinc-500 hover:text-zinc-300'"
        >
          {{ filter.label }}
          <span
            v-if="filter.id === 'failed' && devToolsStore.networkFailedCount > 0"
            class="ml-1 px-1 py-0.2 rounded-full bg-rose-500/30 text-rose-300 text-[9px]"
          >
            {{ devToolsStore.networkFailedCount }}
          </span>
        </button>
      </div>

      <!-- Search & Controls -->
      <div class="flex items-center gap-2">
        <div class="relative flex items-center">
          <Search class="w-3 h-3 text-zinc-500 absolute left-2 pointer-events-none" />
          <input
            v-model="devToolsStore.networkSearch"
            type="text"
            placeholder="Filter by URL..."
            class="pl-6 pr-2 py-0.5 text-[11px] bg-black/40 border border-border/70 rounded text-zinc-200 placeholder-zinc-600 outline-none w-36 focus:w-48 transition-all"
          />
        </div>

        <!-- Summary Stats -->
        <span class="text-[10px] text-zinc-500 font-sans hidden sm:inline">
          {{ devToolsStore.networkEntries.length }} reqs | {{ totalTransferred }}
        </span>

        <button
          @click="devToolsStore.clearNetwork"
          class="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
          title="Clear network logs"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>

        <button
          @click="devToolsStore.openNativeDevTools"
          class="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-100 text-[11px] font-sans transition-colors border border-border/50"
          title="Open Native Chrome DevTools in detached window"
        >
          <ExternalLink class="w-3 h-3 text-nvidia" />
          <span>Native DevTools</span>
        </button>
      </div>
    </div>

    <!-- Table Header & Body Container -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Main Request Table -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Table Header -->
        <div class="grid grid-cols-12 px-2 py-1 bg-white/[0.02] border-b border-border text-[10px] text-zinc-500 font-sans font-semibold uppercase tracking-wider select-none shrink-0">
          <div class="col-span-1">Status</div>
          <div class="col-span-1">Method</div>
          <div class="col-span-6">URL / Resource</div>
          <div class="col-span-1">Type</div>
          <div class="col-span-1 text-right">Time</div>
          <div class="col-span-2 text-right">Size</div>
        </div>

        <!-- Request Rows -->
        <div class="flex-1 overflow-y-auto divide-y divide-zinc-900/60">
          <div
            v-if="devToolsStore.filteredNetwork.length === 0"
            class="h-full flex items-center justify-center text-zinc-600 select-none text-[11px]"
          >
            No network requests recorded
          </div>

          <div
            v-for="entry in devToolsStore.filteredNetwork"
            :key="entry.id"
            @click="selectedRequest = entry"
            class="grid grid-cols-12 px-2 py-1 items-center hover:bg-white/[0.04] cursor-pointer transition-colors text-[11px]"
            :class="{ 'bg-nvidia/10 text-white': selectedRequest?.id === entry.id }"
          >
            <!-- Status -->
            <div class="col-span-1 flex items-center">
              <span
                class="px-1 py-0.2 rounded font-mono font-bold text-[10px] border"
                :class="getStatusColor(entry.status)"
              >
                {{ entry.status === 0 ? 'FAIL' : entry.status }}
              </span>
            </div>

            <!-- Method -->
            <div class="col-span-1 font-mono font-bold text-zinc-400">
              {{ entry.method }}
            </div>

            <!-- URL -->
            <div class="col-span-6 truncate font-sans pr-2" :title="entry.url">
              <span class="text-zinc-200">{{ entry.url.split('/').pop()?.split('?')[0] || '/' }}</span>
              <span class="text-[10px] text-zinc-500 ml-1.5 truncate">{{ entry.url }}</span>
            </div>

            <!-- Type -->
            <div class="col-span-1 truncate text-zinc-500 text-[10px] font-sans">
              {{ entry.type || entry.mimeType?.split('/')[1] || 'other' }}
            </div>

            <!-- Duration -->
            <div class="col-span-1 text-right font-mono text-zinc-400 text-[10px]">
              {{ formatDuration(entry.duration) }}
            </div>

            <!-- Size -->
            <div class="col-span-2 text-right font-mono text-zinc-400 text-[10px]">
              {{ formatSize(entry.size) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Detail Slideout when a request is clicked -->
      <div
        v-if="selectedRequest"
        class="w-72 bg-sidebar border-l border-border flex flex-col shrink-0 select-text overflow-hidden text-xs"
      >
        <div class="h-8 px-3 border-b border-border flex items-center justify-between bg-white/[0.02] shrink-0">
          <span class="font-sans font-semibold text-zinc-300 truncate">Request Details</span>
          <button @click="selectedRequest = null" class="text-zinc-500 hover:text-zinc-200">
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <div class="flex-1 p-3 overflow-y-auto flex flex-col gap-3 font-sans">
          <!-- General -->
          <div>
            <div class="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">General</div>
            <div class="p-2 rounded bg-black/40 border border-border/60 flex flex-col gap-1 text-[11px]">
              <div>
                <span class="text-zinc-500">Request URL:</span>
                <div class="break-all font-mono text-[10px] text-zinc-300 mt-0.5">{{ selectedRequest.url }}</div>
              </div>
              <div class="flex items-center justify-between mt-1">
                <span class="text-zinc-500">Request Method:</span>
                <span class="font-mono text-nvidia font-bold">{{ selectedRequest.method }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-zinc-500">Status Code:</span>
                <span class="font-mono font-bold" :class="getStatusColor(selectedRequest.status)">
                  {{ selectedRequest.status }} {{ selectedRequest.statusText }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-zinc-500">Resource Type:</span>
                <span class="text-zinc-300 capitalize">{{ selectedRequest.type }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-zinc-500">Duration:</span>
                <span class="font-mono text-zinc-300">{{ formatDuration(selectedRequest.duration) }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-zinc-500">Transfer Size:</span>
                <span class="font-mono text-zinc-300">{{ formatSize(selectedRequest.size) }}</span>
              </div>
              <div v-if="selectedRequest.mimeType" class="flex items-center justify-between">
                <span class="text-zinc-500">MIME Type:</span>
                <span class="font-mono text-zinc-300 text-[10px]">{{ selectedRequest.mimeType }}</span>
              </div>
              <div v-if="selectedRequest.error" class="mt-1 p-1.5 rounded bg-rose-500/10 text-rose-300 text-[10px]">
                Error: {{ selectedRequest.error }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
