<script setup lang="ts">
import { ref, computed } from 'vue';
import { ChatMessage } from '../../../preload/types';
import PatchCard from './PatchCard.vue';
import { Bot, Copy, Check } from 'lucide-vue-next';

const props = defineProps<{
  message: ChatMessage;
}>();

const copiedIdx = ref<number | null>(null);

const handleCopy = (text: string, idx: number) => {
  navigator.clipboard.writeText(text);
  copiedIdx.value = idx;
  setTimeout(() => {
    copiedIdx.value = null;
  }, 2000);
};

interface Section {
  type: 'text' | 'code';
  content: string;
  lang?: string;
}

const parsedSections = computed<Section[]>(() => {
  const text = props.message.content || '';
  if (!text.includes('```')) {
    return [{ type: 'text', content: text }];
  }

  const sections: Section[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_\-\.]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      sections.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }
    sections.push({
      type: 'code',
      lang: match[1] || 'code',
      content: match[2].trimEnd()
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    sections.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }

  return sections;
});
</script>

<template>
  <div class="flex gap-3 my-4 text-xs leading-relaxed select-text">
    <!-- Avatar (Matched to Reference Screenshot) -->
    <div
      class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs select-none"
      :class="message.role === 'assistant'
        ? 'bg-[#76b900] text-black font-bold shadow-glow-green'
        : 'bg-[#1d252a] text-zinc-200 font-semibold'"
    >
      <Bot v-if="message.role === 'assistant'" class="w-4 h-4" />
      <span v-else class="text-[11px] font-sans">You</span>
    </div>

    <!-- Message Body -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Header Row with Name and Timestamp -->
      <div class="flex items-center gap-2 mb-1.5 select-none">
        <span class="font-semibold text-zinc-200 text-xs">
          {{ message.role === 'assistant' ? 'Nemotron Assistant' : 'You' }}
        </span>
        <span class="text-[11px] text-zinc-500 font-sans">
          {{ message.role === 'assistant' ? '10:24 AM' : 'Just now' }}
        </span>
      </div>

      <!-- Sections: Text & Code Blocks -->
      <div class="space-y-2 text-zinc-300">
        <template v-for="(sec, idx) in parsedSections" :key="idx">
          <!-- Text Segment -->
          <div
            v-if="sec.type === 'text' && sec.content.trim()"
            class="whitespace-pre-wrap leading-relaxed text-zinc-300"
          >
            {{ sec.content.trim() }}
          </div>

          <!-- Code Block Card (Exact match to screenshot) -->
          <div
            v-else-if="sec.type === 'code'"
            class="my-2 bg-[#0d1113] border border-[#1e262c] rounded-lg overflow-hidden text-xs"
          >
            <!-- Code Block Header -->
            <div class="flex items-center justify-between px-3 py-1.5 bg-[#13181a] border-b border-[#1e262c] text-zinc-400 select-none">
              <span class="font-mono text-2xs text-zinc-300">{{ sec.lang || 'code' }}</span>
              <button
                @click="handleCopy(sec.content, idx)"
                class="flex items-center gap-1 text-2xs hover:text-white transition-colors"
                title="Copy code to clipboard"
              >
                <Check v-if="copiedIdx === idx" class="w-3 h-3 text-[#76b900]" />
                <Copy v-else class="w-3 h-3" />
                <span>{{ copiedIdx === idx ? 'Copied' : 'Copy' }}</span>
              </button>
            </div>

            <!-- Code Content -->
            <pre class="p-3 font-mono text-[11px] text-zinc-200 overflow-x-auto leading-relaxed select-text">{{ sec.content }}</pre>
          </div>
        </template>
      </div>

      <!-- Proposed Code Patch -->
      <PatchCard v-if="message.patch" :patch="message.patch" />
    </div>
  </div>
</template>
