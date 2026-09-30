<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useBrowserStore } from '../../stores/browser-store';

const anchorRef = ref<HTMLDivElement | null>(null);
const browserStore = useBrowserStore();
let resizeObserver: ResizeObserver | null = null;
let rafId: number | null = null;

const syncBounds = () => {
  if (!anchorRef.value || !window.electronAPI) return;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    if (!anchorRef.value) return;
    const rect = anchorRef.value.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    window.electronAPI.syncViewportBounds({
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    });
  });
};

onMounted(() => {
  if (!anchorRef.value) return;
  resizeObserver = new ResizeObserver(syncBounds);
  resizeObserver.observe(anchorRef.value);
  window.addEventListener('resize', syncBounds);
  // Small delay to ensure layout has settled
  setTimeout(syncBounds, 80);
  setTimeout(syncBounds, 300);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener('resize', syncBounds);
  if (rafId) cancelAnimationFrame(rafId);
});

// Re-sync when view mode or panels change (layout shift)
watch(() => [browserStore.activeViewMode, browserStore.isDrawerOpen, browserStore.isCopilotOpen], () => {
  setTimeout(syncBounds, 50);
  setTimeout(syncBounds, 200);
  setTimeout(syncBounds, 400);
});

// Re-sync when resizer dragging ends
watch(() => browserStore.isDraggingResizer, (isDragging) => {
  if (!isDragging) {
    setTimeout(syncBounds, 20);
    setTimeout(syncBounds, 120);
  }
});
</script>

<template>
  <div class="relative w-full h-full overflow-hidden bg-canvas">
    <!-- Anchor div tracked by native WebContentsView -->
    <div
      ref="anchorRef"
      id="viewport-anchor"
      class="w-full h-full"
    />

    <!-- Placeholder shown only when browser mode is not active -->
    <div
      v-if="browserStore.activeViewMode === 'editor'"
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none"
    >
      <div class="text-4xl font-bold tracking-[0.25em] text-white/5 font-mono">BSTUDIO</div>
      <div class="text-xs text-white/10">Switch to Web or Split mode to browse</div>
    </div>

    <!-- Loading overlay -->
    <div
      v-if="browserStore.isLoading"
      class="absolute top-0 left-0 right-0 h-0.5 bg-border overflow-hidden"
    >
      <div class="h-full bg-nvidia animate-pulse-soft" style="width: 60%; margin-left: -10%; animation: progress 1.5s ease-in-out infinite;" />
    </div>
  </div>
</template>

<style scoped>
@keyframes progress {
  0%   { transform: translateX(0%); }
  50%  { transform: translateX(160%); }
  100% { transform: translateX(160%); }
}
</style>
