<script setup lang="ts">
import { DiagnosticTelemetry } from '../../../shared/telemetry-types';
import { X, AlertCircle, AlertTriangle, Info } from 'lucide-vue-next';

defineProps<{
  telemetry: DiagnosticTelemetry;
}>();

const emit = defineEmits(['remove']);
</script>

<template>
  <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-elevated border border-subtle text-gray-200 shadow-sm">
    <AlertCircle v-if="telemetry.severity === 'critical'" class="w-3.5 h-3.5 text-diagnostic-crimson shrink-0" />
    <AlertTriangle v-else-if="telemetry.severity === 'warning'" class="w-3.5 h-3.5 text-diagnostic-amber shrink-0" />
    <Info v-else class="w-3.5 h-3.5 text-safari-blue shrink-0" />

    <span class="font-medium truncate max-w-[140px]">{{ telemetry.title }}</span>

    <button 
      @click="emit('remove')"
      class="hover:text-white text-gray-400 p-0.5 rounded-full ml-1"
    >
      <X class="w-3 h-3" />
    </button>
  </div>
</template>
