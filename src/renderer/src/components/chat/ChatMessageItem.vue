<script setup lang="ts">
import { ChatMessage } from '../../../preload/types';
import PatchCard from './PatchCard.vue';
import { Bot, User } from 'lucide-vue-next';

defineProps<{
  message: ChatMessage;
}>();
</script>

<template>
  <div class="flex gap-2.5 my-3 text-xs leading-relaxed">
    <!-- Avatar -->
    <div 
      class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
      :class="message.role === 'assistant' ? 'bg-nvidia text-black' : 'bg-safari-blue text-white'"
    >
      <Bot v-if="message.role === 'assistant'" class="w-3.5 h-3.5" />
      <User v-else class="w-3.5 h-3.5" />
    </div>

    <!-- Content -->
    <div class="flex-1 flex flex-col min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <span class="font-semibold text-gray-300 text-[11px]">
          {{ message.role === 'assistant' ? 'Nemotron Copilot' : 'You' }}
        </span>
      </div>

      <!-- Text -->
      <div class="text-gray-200 whitespace-pre-wrap select-text leading-normal">
        {{ message.content }}
      </div>

      <!-- Proposed Code Patch -->
      <PatchCard v-if="message.patch" :patch="message.patch" />
    </div>
  </div>
</template>
