<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from 'vue';
import { useChatStore } from '../../stores/chat-store';
import { useTelemetryStore } from '../../stores/telemetry-store';
import { useBrowserStore } from '../../stores/browser-store';
import ChatMessageItem from './ChatMessageItem.vue';
import {
  Bot,
  Send,
  Sparkles,
  X,
  ChevronDown,
  Check,
  Plus,
  Code2,
  Globe,
  MoreHorizontal,
  Key,
  WifiOff,
  Zap
} from 'lucide-vue-next';

const chatStore = useChatStore();
const telemetryStore = useTelemetryStore();
const browserStore = useBrowserStore();
const inputPrompt = ref('');
const hasApiKey = ref(false);
const messagesRef = ref<HTMLElement | null>(null);
const isModelMenuOpen = ref(false);

const models = [
  { id: 'ultra', label: 'Nemotron 4 (Latest)' },
  { id: 'nano', label: 'Nemotron 4 70B Instruct' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' }
];

const checkApiKey = async () => {
  if (!window.electronAPI) return;
  const keyName = chatStore.selectedProvider === 'gemini' ? 'GEMINI_API_KEY' : 'NEBIUS_API_KEY';
  const key = await window.electronAPI.getEncryptedKey(keyName);
  hasApiKey.value = !!(key && key.trim().length > 0);
};

onMounted(checkApiKey);
watch(() => chatStore.selectedProvider, checkApiKey);
watch(() => browserStore.isApiKeyModalOpen, (isOpen) => {
  if (!isOpen) checkApiKey();
});

const selectModel = (modelId: string) => {
  chatStore.selectedModel = modelId;
  if (modelId.startsWith('gemini')) {
    chatStore.selectedProvider = 'gemini';
  } else {
    chatStore.selectedProvider = 'nebius';
  }
  isModelMenuOpen.value = false;
  checkApiKey();
};

const activeModelLabel = () => {
  if (chatStore.selectedModel === 'ultra') return 'Nemotron 4 (Latest)';
  if (chatStore.selectedModel === 'nano') return 'Nemotron 4 70B Instruct';
  if (chatStore.selectedModel === 'gemini-2.0-flash') return 'Gemini 2.0 Flash';
  return 'Nemotron 4 (Latest)';
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
    }
  });
};

watch(() => chatStore.messages.length, scrollToBottom);

const handleSend = () => {
  if (!inputPrompt.value.trim() || chatStore.isGenerating) return;
  chatStore.sendMessage(inputPrompt.value);
  inputPrompt.value = '';
  scrollToBottom();
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

const startCopilotResize = (e: PointerEvent) => {
  e.preventDefault();
  const target = e.currentTarget as HTMLElement;
  try {
    target.setPointerCapture(e.pointerId);
  } catch {}
  browserStore.setDraggingResizer(true, 'col-resize');

  const startX = e.clientX;
  const startWidth = browserStore.copilotWidth;

  const onPointerMove = (ev: PointerEvent) => {
    const deltaX = startX - ev.clientX;
    browserStore.setCopilotWidth(startWidth + deltaX);
    window.dispatchEvent(new Event('resize'));
  };

  const onPointerUp = (ev: PointerEvent) => {
    try {
      target.releasePointerCapture(ev.pointerId);
    } catch {}
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    browserStore.setDraggingResizer(false);
    window.dispatchEvent(new Event('resize'));
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
};
</script>

<template>
  <Transition name="sidebar">
    <div
      v-if="browserStore.isCopilotOpen"
      class="relative h-full bg-[#141418] border-l border-[#222226] flex flex-col shrink-0 z-20 overflow-hidden select-none"
      :style="{
        width: browserStore.copilotWidth + 'px',
        transition: browserStore.isDraggingResizer ? 'none' : 'width 150ms ease'
      }"
    >
      <!-- Left Resizer Handle -->
      <div
        @pointerdown="startCopilotResize"
        class="absolute top-0 left-0 w-1.5 h-full cursor-col-resize z-30 group hover:bg-[#76b900]/60 active:bg-[#76b900] transition-colors select-none"
        title="Drag to resize Assistant"
      >
        <div class="absolute inset-y-0 -left-1 -right-1 z-10" />
      </div>

      <!-- Header (Matched to Reference Screenshot) -->
      <div class="flex items-center justify-between px-3 h-10 border-b border-[#222226] shrink-0 bg-[#141418]">
        <!-- Title with Nemotron Badge -->
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-md bg-[#76b900]/20 border border-[#76b900]/50 flex items-center justify-center text-[#7ee712]">
            <Bot class="w-4 h-4" />
          </div>
          <span class="text-xs font-semibold text-zinc-100 tracking-tight">Nemotron Assistant</span>
        </div>

        <!-- Right Header Controls -->
        <div class="flex items-center gap-1 text-zinc-400">
          <button
            @click="browserStore.isApiKeyModalOpen = true"
            class="w-6 h-6 flex items-center justify-center rounded hover:text-white hover:bg-white/5 transition-colors"
            title="API Keys"
          >
            <Key class="w-3.5 h-3.5" />
          </button>
          <button
            class="w-6 h-6 flex items-center justify-center rounded hover:text-white hover:bg-white/5 transition-colors"
            title="More Options"
          >
            <MoreHorizontal class="w-3.5 h-3.5" />
          </button>
          <button
            @click="browserStore.isCopilotOpen = false"
            class="w-6 h-6 flex items-center justify-center rounded hover:text-white hover:bg-white/5 transition-colors"
            title="Close Assistant"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Model Selector (Exact Match to Screenshot) -->
      <div class="px-3 pt-2 pb-1.5 shrink-0 relative">
        <button
          @click="isModelMenuOpen = !isModelMenuOpen"
          class="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#1c1c22] border border-[#2c2c34] hover:border-zinc-500 text-xs text-zinc-200 transition-colors"
        >
          <span class="font-sans">{{ activeModelLabel() }}</span>
          <ChevronDown class="w-3.5 h-3.5 text-zinc-400 transition-transform" :class="{ 'rotate-180': isModelMenuOpen }" />
        </button>

        <!-- Model Dropdown -->
        <div
          v-if="isModelMenuOpen"
          class="absolute left-3 right-3 top-10 mt-1 bg-[#1c1c22] border border-[#2c2c34] rounded-lg shadow-2xl py-1 z-50 text-xs text-zinc-200"
        >
          <button
            v-for="m in models"
            :key="m.id"
            @click="selectModel(m.id)"
            class="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#76b900]/15 hover:text-white transition-colors text-left"
          >
            <span>{{ m.label }}</span>
            <Check v-if="chatStore.selectedModel === m.id" class="w-3.5 h-3.5 text-[#76b900]" />
          </button>
        </div>
      </div>

      <!-- Key Notice Banner (if missing) -->
      <div
        v-if="!hasApiKey"
        class="mx-3 my-1 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-between text-2xs text-amber-300 shrink-0"
      >
        <span class="flex items-center gap-1.5">
          <WifiOff class="w-3 h-3" />
          No key configured
        </span>
        <button
          @click="browserStore.isApiKeyModalOpen = true"
          class="underline hover:text-white font-medium"
        >
          Add Key
        </button>
      </div>

      <!-- Messages Area -->
      <div ref="messagesRef" class="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        <!-- Welcome Card (Matching Reference Screenshot 1) -->
        <div
          v-if="chatStore.messages.length === 0"
          class="bg-[#18181f] border border-[#2c2c34] rounded-xl p-4 my-2 text-xs"
        >
          <h3 class="font-semibold text-zinc-100 text-sm mb-1">Welcome to Nemotron Assistant</h3>
          <p class="text-zinc-400 text-xs mb-4 leading-relaxed">
            Your AI partner for a faster, more productive development experience in Bstudio.
          </p>

          <div class="space-y-2.5">
            <div class="flex items-center gap-2 text-zinc-300">
              <div class="w-4 h-4 rounded-full bg-[#76b900]/20 flex items-center justify-center text-[#7ee712]">
                <Check class="w-2.5 h-2.5" />
              </div>
              <span>Understand your codebase</span>
            </div>
            <div class="flex items-center gap-2 text-zinc-300">
              <div class="w-4 h-4 rounded-full bg-[#76b900]/20 flex items-center justify-center text-[#7ee712]">
                <Check class="w-2.5 h-2.5" />
              </div>
              <span>Help you build, debug, and refactor</span>
            </div>
            <div class="flex items-center gap-2 text-zinc-300">
              <div class="w-4 h-4 rounded-full bg-[#76b900]/20 flex items-center justify-center text-[#7ee712]">
                <Check class="w-2.5 h-2.5" />
              </div>
              <span>Answer questions about web technologies</span>
            </div>
          </div>
        </div>

        <!-- Rendered Chat Messages -->
        <ChatMessageItem
          v-for="(msg, index) in chatStore.messages"
          :key="index"
          :message="msg"
        />

        <!-- Generation Spinner -->
        <div
          v-if="chatStore.isGenerating"
          class="flex items-center gap-2 text-2xs py-1 text-[#7ee712]"
        >
          <Sparkles class="w-3.5 h-3.5 animate-spin" />
          <span>Nemotron is formulating response…</span>
        </div>
      </div>

      <!-- Composer Card (Matched to Reference Screenshot) -->
      <div class="p-3 border-t border-[#222226] shrink-0 bg-[#141418]">
        <div class="bg-[#1a1a20] border border-[#2c2c34] rounded-xl p-2.5 transition-colors focus-within:border-zinc-500">
          <textarea
            v-model="inputPrompt"
            @keydown="handleKeyDown"
            rows="2"
            class="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none resize-none font-sans leading-relaxed"
            placeholder="Ask Nemotron anything..."
            :disabled="chatStore.isGenerating"
          />

          <!-- Composer Toolbar Row -->
          <div class="flex items-center justify-between pt-1.5 mt-1 border-t border-[#24242c] text-zinc-400">
            <!-- Left contextual pills / actions -->
            <div class="flex items-center gap-1.5">
              <button
                class="w-6 h-6 flex items-center justify-center rounded hover:text-white hover:bg-white/5 transition-colors"
                title="Add Attachment"
              >
                <Plus class="w-3.5 h-3.5" />
              </button>
              <button
                class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] hover:text-white hover:bg-white/5 transition-colors text-zinc-400"
                title="Add Context"
              >
                <Code2 class="w-3 h-3 text-zinc-400" />
                <span>Context</span>
              </button>
              <button
                class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] hover:text-white hover:bg-white/5 transition-colors text-zinc-400"
                title="Search Web"
              >
                <Globe class="w-3 h-3 text-zinc-400" />
                <span>Web</span>
              </button>
            </div>

            <!-- Send Button -->
            <button
              @click="handleSend"
              :disabled="!inputPrompt.trim() || chatStore.isGenerating"
              class="w-7 h-7 flex items-center justify-center rounded-lg bg-[#76b900] hover:bg-[#8bd000] text-black transition-all disabled:opacity-30 disabled:bg-zinc-700 disabled:text-zinc-500"
              title="Send (Enter)"
            >
              <Send class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p class="text-[10px] text-zinc-500 text-center mt-1.5">
          Nemotron can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.sidebar-enter-active,
.sidebar-leave-active {
  transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms ease;
  overflow: hidden;
}
.sidebar-enter-from,
.sidebar-leave-to {
  width: 0;
  opacity: 0;
}
.sidebar-enter-to,
.sidebar-leave-from {
  width: v-bind('browserStore.copilotWidth + "px"');
  opacity: 1;
}
</style>
