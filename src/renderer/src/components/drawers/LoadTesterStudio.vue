<script setup lang="ts">
import { useLoadTesterStore } from '../../stores/load-tester-store';
import { Play, Square, Activity, Zap, CheckCircle2, AlertOctagon } from 'lucide-vue-next';

const loadStore = useLoadTesterStore();

if (window.electronAPI) {
  window.electronAPI.onLoadTestProgress((progress) => {
    loadStore.updateProgress(progress);
  });
  window.electronAPI.onLoadTestComplete((summary) => {
    loadStore.setSummary(summary);
  });
}
</script>

<template>
  <div class="w-full h-full flex flex-col bg-surface p-3 select-none text-xs overflow-y-auto">
    <!-- Controls Bar -->
    <div class="flex items-center gap-4 mb-4 pb-3 border-b border-subtle">
      <!-- Target URL -->
      <div class="flex-1 flex flex-col gap-1">
        <label class="text-[10px] uppercase font-semibold text-gray-400">Target Endpoint</label>
        <input 
          type="text" 
          v-model="loadStore.config.targetUrl"
          class="bg-elevated border border-subtle px-3 py-1.5 rounded font-mono text-gray-200 focus:outline-none focus:border-nvidia"
          :disabled="loadStore.isRunning"
        />
      </div>

      <!-- Virtual Users Slider -->
      <div class="w-44 flex flex-col gap-1">
        <div class="flex items-center justify-between text-[10px] uppercase font-semibold text-gray-400">
          <span>Virtual Users</span>
          <span class="text-nvidia font-mono">{{ loadStore.config.virtualUsers }} VUs</span>
        </div>
        <input 
          type="range" 
          min="1" 
          max="100" 
          v-model.number="loadStore.config.virtualUsers" 
          :disabled="loadStore.isRunning"
          class="accent-nvidia cursor-pointer"
        />
      </div>

      <!-- Duration Slider -->
      <div class="w-36 flex flex-col gap-1">
        <div class="flex items-center justify-between text-[10px] uppercase font-semibold text-gray-400">
          <span>Duration</span>
          <span class="text-nvidia font-mono">{{ loadStore.config.durationSeconds }}s</span>
        </div>
        <input 
          type="range" 
          min="5" 
          max="60" 
          v-model.number="loadStore.config.durationSeconds" 
          :disabled="loadStore.isRunning"
          class="accent-nvidia cursor-pointer"
        />
      </div>

      <!-- Run / Stop Button -->
      <div class="pt-4">
        <button 
          v-if="!loadStore.isRunning"
          @click="loadStore.startTest"
          class="flex items-center gap-1.5 bg-nvidia hover:bg-nvidia-dark text-black px-4 py-1.5 rounded font-medium transition-colors"
        >
          <Play class="w-3.5 h-3.5 fill-current" />
          <span>Start Stress Test</span>
        </button>
        <button 
          v-else
          @click="loadStore.stopTest"
          class="flex items-center gap-1.5 bg-diagnostic-crimson hover:bg-red-600 text-white px-4 py-1.5 rounded font-medium transition-colors"
        >
          <Square class="w-3.5 h-3.5 fill-current" />
          <span>Stop Test</span>
        </button>
      </div>
    </div>

    <!-- Live Performance Metrics -->
    <div v-if="loadStore.isRunning && loadStore.progress" class="grid grid-cols-4 gap-3 mb-4">
      <div class="bg-canvas border border-subtle p-3 rounded flex flex-col">
        <span class="text-[10px] text-gray-400 uppercase">Requests / Sec</span>
        <span class="text-2xl font-bold font-mono text-nvidia mt-1">{{ loadStore.progress.currentRps }}</span>
      </div>
      <div class="bg-canvas border border-subtle p-3 rounded flex flex-col">
        <span class="text-[10px] text-gray-400 uppercase">p95 Latency</span>
        <span class="text-2xl font-bold font-mono text-safari-blue mt-1">{{ loadStore.progress.currentP95Ms }}ms</span>
      </div>
      <div class="bg-canvas border border-subtle p-3 rounded flex flex-col">
        <span class="text-[10px] text-gray-400 uppercase">Total Executed</span>
        <span class="text-2xl font-bold font-mono text-gray-200 mt-1">{{ loadStore.progress.totalRequests }}</span>
      </div>
      <div class="bg-canvas border border-subtle p-3 rounded flex flex-col">
        <span class="text-[10px] text-gray-400 uppercase">Failed Requests</span>
        <span class="text-2xl font-bold font-mono text-diagnostic-crimson mt-1">{{ loadStore.progress.failedRequests }}</span>
      </div>
    </div>

    <!-- Summary Report -->
    <div v-if="loadStore.summary" class="bg-canvas border border-subtle p-4 rounded flex flex-col">
      <div class="flex items-center gap-2 mb-3 pb-2 border-b border-subtle">
        <CheckCircle2 class="w-4 h-4 text-nvidia" />
        <span class="font-bold text-gray-200 text-sm">Stress Test Completed</span>
        <span class="text-gray-400 ml-auto font-mono text-xs">{{ loadStore.summary.totalRequests }} requests @ {{ loadStore.summary.requestsPerSecond }} req/s</span>
      </div>

      <div class="grid grid-cols-5 gap-3 text-center">
        <div class="p-2 bg-elevated rounded">
          <div class="text-[10px] text-gray-400">Success Rate</div>
          <div class="text-base font-bold font-mono text-nvidia mt-0.5">{{ loadStore.summary.successRatePercentage }}%</div>
        </div>
        <div class="p-2 bg-elevated rounded">
          <div class="text-[10px] text-gray-400">Avg Latency</div>
          <div class="text-base font-bold font-mono text-gray-200 mt-0.5">{{ loadStore.summary.latencies.avgMs }}ms</div>
        </div>
        <div class="p-2 bg-elevated rounded">
          <div class="text-[10px] text-gray-400">p50 Median</div>
          <div class="text-base font-bold font-mono text-gray-200 mt-0.5">{{ loadStore.summary.latencies.p50Ms }}ms</div>
        </div>
        <div class="p-2 bg-elevated rounded">
          <div class="text-[10px] text-gray-400">p95 Tail</div>
          <div class="text-base font-bold font-mono text-diagnostic-amber mt-0.5">{{ loadStore.summary.latencies.p95Ms }}ms</div>
        </div>
        <div class="p-2 bg-elevated rounded">
          <div class="text-[10px] text-gray-400">p99 Max</div>
          <div class="text-base font-bold font-mono text-diagnostic-crimson mt-0.5">{{ loadStore.summary.latencies.p99Ms }}ms</div>
        </div>
      </div>
    </div>
  </div>
</template>
