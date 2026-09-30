<script setup lang="ts">
import { useTelemetryStore } from '../../stores/telemetry-store';
import { useBrowserStore } from '../../stores/browser-store';
import { AlertCircle, AlertTriangle, Info, Trash2 } from 'lucide-vue-next';

const telemetryStore = useTelemetryStore();
const browserStore = useBrowserStore();
</script>

<template>
  <div class="flex items-center gap-2 px-3 py-1 bg-surface border-b border-subtle text-xs">
    <div class="flex items-center gap-1.5 font-medium text-gray-400 mr-2">
      <span class="w-2 h-2 rounded-full bg-nvidia animate-pulse"></span>
      <span class="text-[11px] tracking-wide uppercase text-gray-300">CDP Telemetry</span>
    </div>

    <!-- Counters -->
    <div class="flex items-center gap-2">
      <!-- Critical Errors Badge -->
      <button 
        @click="telemetryStore.domainFilter = null; browserStore.isCopilotOpen = true"
        class="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono transition-colors"
        :class="telemetryStore.criticalCount > 0 ? 'bg-diagnostic-crimson/20 text-diagnostic-crimson border border-diagnostic-crimson/30' : 'bg-elevated text-gray-500'"
      >
        <AlertCircle class="w-3 h-3" />
        <span>{{ telemetryStore.criticalCount }} Critical</span>
      </button>

      <!-- Warnings Badge -->
      <button 
        @click="telemetryStore.domainFilter = null; browserStore.isCopilotOpen = true"
        class="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono transition-colors"
        :class="telemetryStore.warningCount > 0 ? 'bg-diagnostic-amber/20 text-diagnostic-amber border border-diagnostic-amber/30' : 'bg-elevated text-gray-500'"
      >
        <AlertTriangle class="w-3 h-3" />
        <span>{{ telemetryStore.warningCount }} Warn</span>
      </button>

      <!-- Info Badge -->
      <button 
        class="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono transition-colors"
        :class="telemetryStore.infoCount > 0 ? 'bg-safari-blue/20 text-safari-blue border border-safari-blue/30' : 'bg-elevated text-gray-500'"
      >
        <Info class="w-3 h-3" />
        <span>{{ telemetryStore.infoCount }} Info</span>
      </button>
    </div>

    <!-- Active Inspected Element Chip -->
    <div v-if="telemetryStore.inspectedNode" class="ml-3 flex items-center gap-1 text-[11px] bg-elevated px-2 py-0.5 rounded border border-subtle text-nvidia">
      <span>Target:</span>
      <span class="font-mono text-white">&lt;{{ telemetryStore.inspectedNode.localName }}&gt;</span>
      <span v-if="telemetryStore.inspectedNode.attributes.id" class="text-gray-400">#{{ telemetryStore.inspectedNode.attributes.id }}</span>
    </div>

    <!-- Clear Feed -->
    <div class="ml-auto flex items-center">
      <button 
        @click="telemetryStore.clearEvents"
        class="text-gray-500 hover:text-gray-300 p-1 rounded transition-colors"
        title="Clear Telemetry Feed"
      >
        <Trash2 class="w-3 h-3" />
      </button>
    </div>
  </div>
</template>
