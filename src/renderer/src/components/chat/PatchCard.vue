<script setup lang="ts">
import { ref } from 'vue';
import { FilePatch, PatchResult } from '../../../shared/patch-types';
import { useChatStore } from '../../stores/chat-store';
import { FileCode, Zap, Check, RotateCcw, AlertTriangle } from 'lucide-vue-next';

const props = defineProps<{
  patch: FilePatch;
}>();

const chatStore = useChatStore();
const isApplying = ref(false);
const patchResult = ref<PatchResult | null>(null);

const applyPatch = async () => {
  isApplying.value = true;
  try {
    const res = await chatStore.applyPatch(props.patch);
    if (res) patchResult.value = res;
  } finally {
    isApplying.value = false;
  }
};

const rollback = async () => {
  if (patchResult.value?.backupId) {
    const ok = await chatStore.rollbackPatch(patchResult.value.backupId);
    if (ok) {
      patchResult.value = null;
    }
  }
};
</script>

<template>
  <div class="my-3 bg-canvas border border-subtle rounded-lg overflow-hidden text-xs shadow-lg">
    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 bg-elevated border-b border-subtle">
      <div class="flex items-center gap-2">
        <FileCode class="w-4 h-4 text-nvidia" />
        <span class="font-mono text-gray-200 font-semibold">{{ patch.filePath }}</span>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <button 
          v-if="!patchResult?.success"
          @click="applyPatch"
          :disabled="isApplying"
          class="flex items-center gap-1.5 bg-nvidia hover:bg-nvidia-dark text-black px-3 py-1 rounded font-semibold transition-colors disabled:opacity-50"
        >
          <Zap class="w-3.5 h-3.5 fill-current" />
          <span>{{ isApplying ? 'Applying...' : 'Apply to Codebase' }}</span>
        </button>

        <div v-else class="flex items-center gap-2">
          <span class="flex items-center gap-1 text-nvidia font-medium text-[11px]">
            <Check class="w-3.5 h-3.5" />
            <span>Applied</span>
          </span>
          <button 
            @click="rollback"
            class="flex items-center gap-1 text-diagnostic-amber hover:text-white px-2 py-0.5 rounded hover:bg-diagnostic-amber/20 border border-diagnostic-amber/30 transition-colors text-[11px]"
            title="Rollback this patch using backup snapshot"
          >
            <RotateCcw class="w-3 h-3" />
            <span>Rollback</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Rationale -->
    <div v-if="patch.rationale" class="px-3 py-1.5 bg-sidebar text-gray-300 border-b border-subtle text-[11px] italic">
      "{{ patch.rationale }}"
    </div>

    <!-- Error notice if failed -->
    <div v-if="patchResult && !patchResult.success" class="px-3 py-2 bg-diagnostic-crimson/10 text-diagnostic-crimson border-b border-diagnostic-crimson/30 flex items-center gap-2">
      <AlertTriangle class="w-4 h-4 shrink-0" />
      <span>{{ patchResult.error }}</span>
    </div>

    <!-- Side-by-Side Diff Block (JetBrains / VS Code style) -->
    <div class="grid grid-cols-2 divide-x divide-subtle font-mono text-[11px] max-h-56 overflow-y-auto">
      <!-- Search Block (Deletions) -->
      <div class="p-2 bg-diagnostic-crimson/5">
        <div class="text-[10px] text-diagnostic-crimson font-bold uppercase mb-1">- Original Code</div>
        <pre class="text-red-300 whitespace-pre-wrap selection:bg-red-900/50">{{ patch.searchBlock }}</pre>
      </div>

      <!-- Replace Block (Additions) -->
      <div class="p-2 bg-nvidia/5">
        <div class="text-[10px] text-nvidia font-bold uppercase mb-1">+ Replacement</div>
        <pre class="text-emerald-300 whitespace-pre-wrap selection:bg-emerald-900/50">{{ patch.replaceBlock }}</pre>
      </div>
    </div>
  </div>
</template>
