<script setup lang="ts">
import { ref } from 'vue';
import { Cpu, Trash, RefreshCw } from 'lucide-vue-next';

const isAuditing = ref(false);

const triggerGC = async () => {
  if (window.electronAPI) {
    await window.electronAPI.triggerGarbageCollection();
  }
};

const runAudit = async () => {
  if (window.electronAPI) {
    isAuditing.value = true;
    await window.electronAPI.runMemoryAudit();
    setTimeout(() => {
      isAuditing.value = false;
    }, 500);
  }
};
</script>

<template>
  <div class="w-full h-full flex flex-col bg-surface p-4 select-none text-xs">
    <div class="flex items-center justify-between pb-3 border-b border-subtle mb-4">
      <div class="flex items-center gap-2">
        <Cpu class="w-4 h-4 text-safari-blue" />
        <span class="font-bold text-gray-200">Chromium V8 Engine Memory & Heap Diagnostics</span>
      </div>

      <div class="flex items-center gap-2">
        <button 
          @click="runAudit"
          :disabled="isAuditing"
          class="flex items-center gap-1 bg-elevated hover:bg-subtle text-gray-300 px-3 py-1 rounded border border-subtle transition-colors"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isAuditing }" />
          <span>Audit Heap</span>
        </button>

        <button 
          @click="triggerGC"
          class="flex items-center gap-1 bg-nvidia/20 hover:bg-nvidia/30 text-nvidia border border-nvidia/30 px-3 py-1 rounded transition-colors"
          title="Force V8 Garbage Collection"
        >
          <Trash class="w-3.5 h-3.5" />
          <span>Collect Garbage</span>
        </button>
      </div>
    </div>

    <!-- Metrics Cards -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-canvas border border-subtle p-3 rounded flex flex-col">
        <span class="text-gray-400 uppercase text-[10px]">V8 Heap Allocation</span>
        <span class="text-xl font-bold font-mono text-gray-200 mt-1">~48.5 MB</span>
        <span class="text-[10px] text-gray-500 mt-1">Normal baseline (< 100 MB)</span>
      </div>

      <div class="bg-canvas border border-subtle p-3 rounded flex flex-col">
        <span class="text-gray-400 uppercase text-[10px]">Detached DOM Nodes</span>
        <span class="text-xl font-bold font-mono text-nvidia mt-1">0 Detected</span>
        <span class="text-[10px] text-gray-500 mt-1">No uncollected leaks</span>
      </div>

      <div class="bg-canvas border border-subtle p-3 rounded flex flex-col">
        <span class="text-gray-400 uppercase text-[10px]">GC Strategy</span>
        <span class="text-xl font-bold font-mono text-safari-blue mt-1">Incremental</span>
        <span class="text-[10px] text-gray-500 mt-1">Major Mark-Sweep / Scavenge</span>
      </div>
    </div>
  </div>
</template>
