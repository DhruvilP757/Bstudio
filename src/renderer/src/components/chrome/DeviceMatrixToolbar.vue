<script setup lang="ts">
import { useBrowserStore } from '../../stores/browser-store';
import { Monitor, Tablet, Smartphone, Maximize2 } from 'lucide-vue-next';

const browserStore = useBrowserStore();
</script>

<template>
  <div class="flex items-center gap-1 bg-surface px-2 py-1 border-b border-subtle text-xs">
    <span class="text-[11px] text-gray-500 mr-1">Viewport:</span>
    <button 
      @click="browserStore.setDevice('desktop')"
      :class="browserStore.currentDevice === 'desktop' ? 'bg-elevated text-nvidia border-subtle' : 'text-gray-400 hover:text-white border-transparent'"
      class="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border transition-colors"
      title="Desktop (100%)"
    >
      <Monitor class="w-3.5 h-3.5" />
      <span>Desktop</span>
    </button>

    <button 
      @click="browserStore.setDevice('tablet')"
      :class="browserStore.currentDevice === 'tablet' ? 'bg-elevated text-nvidia border-subtle' : 'text-gray-400 hover:text-white border-transparent'"
      class="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border transition-colors"
      title="Tablet (768px)"
    >
      <Tablet class="w-3.5 h-3.5" />
      <span>Tablet</span>
    </button>

    <button 
      @click="browserStore.setDevice('mobile')"
      :class="browserStore.currentDevice === 'mobile' ? 'bg-elevated text-nvidia border-subtle' : 'text-gray-400 hover:text-white border-transparent'"
      class="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border transition-colors"
      title="Mobile (390px)"
    >
      <Smartphone class="w-3.5 h-3.5" />
      <span>Mobile</span>
    </button>

    <button 
      @click="browserStore.setDevice('responsive')"
      :class="browserStore.currentDevice === 'responsive' ? 'bg-elevated text-nvidia border-subtle' : 'text-gray-400 hover:text-white border-transparent'"
      class="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border transition-colors"
      title="Fluid Responsive"
    >
      <Maximize2 class="w-3.5 h-3.5" />
      <span>Fluid</span>
    </button>
  </div>
</template>
