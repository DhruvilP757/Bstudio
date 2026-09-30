<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from 'vue';
import { useChatStore } from '../../stores/chat-store';
import { useTelemetryStore } from '../../stores/telemetry-store';
import { useBrowserStore } from '../../stores/browser-store';
import ChatMessageItem from './ChatMessageItem.vue';
import { Bot, Send, Sparkles, X, WifiOff, Zap, Key } from 'lucide-vue-next';

const chatStore = useChatStore();
const telemetryStore = useTelemetryStore();
const browserStore = useBrowserStore();
const inputPrompt = ref('');
const hasApiKey = ref(false);
const messagesRef = ref<HTMLElement | null>(null);

const checkApiKey = async () => {
  if (!window.electronAPI) return;
  const keyName = chatStore.selectedProvider === 'gemini' ? 'GEMINI_API_KEY' : 'NEBIUS_API_KEY';
  const key = await window.electronAPI.getEncryptedKey(keyName);
  hasApiKey.value = !!(key && key.trim().length > 0);
};

onMounted(checkApiKey);
watch(() => chatStore.selectedProvider, checkApiKey);
watch(() => browserStore.isApiKeyModalOpen, (isOpen) => {
  if (!isOpen) {
    checkApiKey();
  }
});

const onProviderChange = () => {
  if (chatStore.selectedProvider === 'gemini') {
    chatStore.selectedModel = 'gemini-2.0-flash';
  } else {
    chatStore.selectedModel = 'ultra';
  }
  checkApiKey();
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
      class="relative h-full bg-sidebar border-l border-border flex flex-col shrink-0 z-20 overflow-hidden"
      :style="{
        width: browserStore.copilotWidth + 'px',
        transition: browserStore.isDraggingResizer ? 'none' : 'width 150ms ease'
      }"
    >
      <!-- Left Resizer Handle -->
      <div
        @pointerdown="startCopilotResize"
        class="absolute top-0 left-0 w-1.5 h-full cursor-col-resize z-30 group hover:bg-nvidia/60 active:bg-nvidia transition-colors select-none"
        title="Drag to resize Copilot"
      >
        <div class="absolute inset-y-0 -left-1 -right-1 z-10" />
      </div>

      <!-- Header -->
      <div class="flex items-center justify-between px-3 h-10 border-b border-border shrink-0 bg-canvas/50">
        <div class="flex items-center gap-2">
          <div
            class="w-5 h-5 rounded flex items-center justify-center transition-colors"
            :class="chatStore.selectedProvider === 'gemini' ? 'bg-accent-blue/15 text-accent-blue' : 'bg-nvidia/15 text-nvidia'"
          >
            <Sparkles v-if="chatStore.selectedProvider === 'gemini'" class="w-3.5 h-3.5" />
            <Bot v-else class="w-3.5 h-3.5" />
          </div>
          <span class="text-xs font-semibold text-zinc-200">
            {{ chatStore.selectedProvider === 'gemini' ? 'Gemini Copilot' : 'Nemotron Copilot' }}
          </span>
        </div>

        <div class="flex items-center gap-1.5">
          <!-- Provider selector -->
          <select
            v-model="chatStore.selectedProvider"
            @change="onProviderChange"
            class="h-6 bg-elevated border border-border text-2xs rounded px-1.5 focus:outline-none hover:border-borderHover cursor-pointer font-medium transition-colors"
            :class="chatStore.selectedProvider === 'gemini' ? 'text-accent-blue border-accent-blue/30' : 'text-nvidia border-nvidia/30'"
            title="Switch AI inference provider"
          >
            <option value="gemini">✨ Google Gemini</option>
            <option value="nebius">⚡ Nebius Nemotron</option>
          </select>

          <!-- Model selector -->
          <select
            v-model="chatStore.selectedModel"
            class="h-6 bg-elevated border border-border text-2xs text-zinc-300 rounded px-1.5 focus:outline-none hover:border-borderHover cursor-pointer"
            title="Select model"
          >
            <template v-if="chatStore.selectedProvider === 'gemini'">
              <option value="gemini-2.0-flash">2.0 Flash</option>
              <option value="gemini-1.5-flash">1.5 Flash</option>
              <option value="gemini-1.5-pro">1.5 Pro</option>
            </template>
            <template v-else>
              <option value="ultra">Ultra 550B</option>
              <option value="nano">Nano 30B</option>
            </template>
          </select>

          <!-- Settings Button -->
          <button
            @click="browserStore.isApiKeyModalOpen = true"
            class="w-6 h-6 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
            title="API Key Settings"
          >
            <Key class="w-3.5 h-3.5" />
          </button>

          <!-- Close Button -->
          <button
            @click="browserStore.isCopilotOpen = false"
            class="w-6 h-6 flex items-center justify-center rounded text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors"
            title="Close Copilot"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Offline / No Key banner -->
      <div
        v-if="!hasApiKey"
        class="flex items-center justify-between gap-2 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 shrink-0"
      >
        <div class="flex items-center gap-1.5 text-amber-400 text-2xs">
          <WifiOff class="w-3 h-3 shrink-0" />
          <span>No {{ chatStore.selectedProvider === 'gemini' ? 'Gemini' : 'Nebius' }} key configured</span>
        </div>
        <button
          @click="browserStore.isApiKeyModalOpen = true"
          class="text-2xs text-accent-blue hover:text-accent-blue/80 underline underline-offset-2 transition-colors shrink-0 font-medium"
        >
          Add Key
        </button>
      </div>

      <!-- Incident cards -->
      <div
        v-if="telemetryStore.events.length > 0"
        class="shrink-0 border-b border-border bg-canvas/30"
      >
        <div class="px-3 pt-2 pb-1">
          <p class="text-2xs font-semibold uppercase tracking-wider text-zinc-600">Detected Incidents</p>
        </div>
        <div class="px-2 pb-2 space-y-1.5 max-h-36 overflow-y-auto">
          <div
            v-for="item in telemetryStore.events.slice(0, 3)"
            :key="item.id"
            class="rounded-md p-2.5 border transition-colors"
            :class="item.severity === 'critical'
              ? 'bg-diagnostic-crimson/5 border-diagnostic-crimson/20 hover:border-diagnostic-crimson/40'
              : 'bg-diagnostic-amber/5 border-diagnostic-amber/20 hover:border-diagnostic-amber/40'"
          >
            <div class="flex items-start justify-between gap-2">
              <p
                class="text-2xs font-semibold leading-tight"
                :class="item.severity === 'critical' ? 'text-diagnostic-crimson' : 'text-diagnostic-amber'"
              >{{ item.title }}</p>
              <button
                @click="chatStore.addContextChip(item); chatStore.sendMessage(`Diagnose and fix: ${item.title} — ${item.summary}`)"
                class="shrink-0 flex items-center gap-1 text-2xs bg-nvidia hover:bg-nvidia-bright text-black font-semibold px-2 py-0.5 rounded transition-colors"
              >
                <Zap class="w-2.5 h-2.5" />
                Fix
              </button>
            </div>
            <p class="text-zinc-500 text-2xs mt-0.5 line-clamp-2">{{ item.summary }}</p>
          </div>
        </div>
      </div>

      <!-- Message list -->
      <div ref="messagesRef" class="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        <!-- Welcome message -->
        <div v-if="chatStore.messages.length === 0" class="flex flex-col items-center gap-3 py-8 text-center">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center"
            :class="chatStore.selectedProvider === 'gemini' ? 'bg-accent-blue/15 text-accent-blue' : 'bg-nvidia/15 text-nvidia'"
          >
            <Sparkles v-if="chatStore.selectedProvider === 'gemini'" class="w-5 h-5" />
            <Bot v-else class="w-5 h-5" />
          </div>
          <div>
            <p class="text-zinc-200 text-xs font-semibold">
              {{ chatStore.selectedProvider === 'gemini' ? 'Google Gemini Copilot' : 'NVIDIA Nemotron Copilot' }}
            </p>
            <p class="text-zinc-500 text-2xs mt-1 leading-relaxed">
              Ask me to diagnose errors, review code, or generate patches.
            </p>
          </div>
        </div>

        <ChatMessageItem
          v-for="(msg, index) in chatStore.messages"
          :key="index"
          :message="msg"
        />

        <div
          v-if="chatStore.isGenerating"
          class="flex items-center gap-2 text-2xs py-1"
          :class="chatStore.selectedProvider === 'gemini' ? 'text-accent-blue' : 'text-nvidia'"
        >
          <Sparkles class="w-3 h-3 animate-spin" />
          <span>Generating response via {{ chatStore.selectedProvider === 'gemini' ? 'Gemini' : 'Nemotron' }}…</span>
        </div>
      </div>

      <!-- Input -->
      <div class="px-3 py-2.5 border-t border-border shrink-0 bg-canvas/50">
        <div class="relative">
          <textarea
            v-model="inputPrompt"
            @keydown="handleKeyDown"
            rows="2"
            class="w-full bg-elevated border border-border rounded-lg px-3 py-2 pr-10 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none resize-none font-sans leading-relaxed transition-colors"
            :class="chatStore.selectedProvider === 'gemini' ? 'focus:border-accent-blue/60' : 'focus:border-nvidia/60'"
            :placeholder="`Ask ${chatStore.selectedProvider === 'gemini' ? 'Gemini' : 'Nemotron'} about errors, write code, run terminal...`"
            :disabled="chatStore.isGenerating"
          />
          <button
            @click="handleSend"
            :disabled="!inputPrompt.trim() || chatStore.isGenerating"
            class="absolute right-2 bottom-2 w-6 h-6 flex items-center justify-center rounded-md transition-colors disabled:opacity-30"
            :class="chatStore.selectedProvider === 'gemini' ? 'bg-accent-blue hover:bg-accent-blue/80 text-white' : 'bg-nvidia hover:bg-nvidia-bright text-black'"
          >
            <Send class="w-3 h-3" />
          </button>
        </div>
        <p class="text-2xs text-zinc-600 mt-1.5 flex items-center justify-between">
          <span>
            <kbd class="font-mono bg-elevated border border-border rounded px-1">Enter</kbd> send
            · <kbd class="font-mono bg-elevated border border-border rounded px-1">Shift+Enter</kbd> newline
          </span>
          <span class="text-[10px] text-zinc-500">
            Model: {{ chatStore.selectedModel }}
          </span>
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
