<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useBrowserStore } from '../../stores/browser-store';
import { useChatStore } from '../../stores/chat-store';
import { Key, X, Check, ExternalLink, Cpu, Sparkles, ChevronRight } from 'lucide-vue-next';

const browserStore = useBrowserStore();
const chatStore = useChatStore();

// Nebius
const nebiusKey  = ref('');
const nebiusSaved = ref(false);

// Gemini
const geminiKey  = ref('');
const geminiSaved = ref(false);

// Active tab
const activeTab = ref<'nebius' | 'gemini'>('gemini');

const loadKeys = async () => {
  if (!window.electronAPI) return;
  const nb = await window.electronAPI.getEncryptedKey('NEBIUS_API_KEY');
  if (nb) nebiusKey.value = nb;
  const gk = await window.electronAPI.getEncryptedKey('GEMINI_API_KEY');
  if (gk) geminiKey.value = gk;
};

onMounted(loadKeys);

watch(() => browserStore.isApiKeyModalOpen, (isOpen) => {
  if (isOpen) {
    activeTab.value = chatStore.selectedProvider;
    loadKeys();
  }
});

const saveNebius = async () => {
  if (!window.electronAPI) return;
  await window.electronAPI.saveEncryptedKey('NEBIUS_API_KEY', nebiusKey.value.trim());
  nebiusSaved.value = true;
  setTimeout(() => { nebiusSaved.value = false; }, 2000);
};

const saveGemini = async () => {
  if (!window.electronAPI) return;
  await window.electronAPI.saveEncryptedKey('GEMINI_API_KEY', geminiKey.value.trim());
  geminiSaved.value = true;
  setTimeout(() => { geminiSaved.value = false; }, 2000);
};

const close = () => { browserStore.isApiKeyModalOpen = false; };
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="browserStore.isApiKeyModalOpen"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
        @click.self="close"
      >
        <div class="w-full max-w-lg bg-elevated border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <div class="flex items-center gap-2">
              <Key class="w-4 h-4 text-nvidia" />
              <span class="font-semibold text-zinc-100 text-sm">AI Provider Settings</span>
            </div>
            <button @click="close" class="w-7 h-7 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors">
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Provider tabs -->
          <div class="flex border-b border-border px-3 pt-1">
            <button
              @click="activeTab = 'gemini'"
              class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors"
              :class="activeTab === 'gemini' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-zinc-500 hover:text-zinc-300'"
            >
              <Sparkles class="w-3.5 h-3.5" />
              Google Gemini
            </button>
            <button
              @click="activeTab = 'nebius'"
              class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors"
              :class="activeTab === 'nebius' ? 'border-nvidia text-nvidia' : 'border-transparent text-zinc-500 hover:text-zinc-300'"
            >
              <Cpu class="w-3.5 h-3.5" />
              Nebius Nemotron
            </button>
          </div>

          <!-- Gemini tab -->
          <div v-if="activeTab === 'gemini'" class="p-5 flex flex-col gap-4">
            <div class="flex items-start gap-3 p-3 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
              <Sparkles class="w-4 h-4 text-accent-blue shrink-0 mt-0.5" />
              <div class="text-xs text-zinc-400 leading-relaxed">
                <strong class="text-zinc-200">Google Gemini</strong> provides fast, multimodal code assistance.
                Available models: <code class="text-accent-blue bg-canvas px-1 rounded">gemini-2.0-flash</code>,
                <code class="text-accent-blue bg-canvas px-1 rounded">gemini-1.5-pro</code>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-2xs font-semibold text-zinc-500 uppercase tracking-wider">Gemini API Key</label>
              <input
                type="password"
                v-model="geminiKey"
                placeholder="AIza..."
                class="bg-canvas border border-border focus:border-accent-blue/50 rounded-md px-3 py-2 text-zinc-200 font-mono text-xs focus:outline-none transition-colors"
              />
            </div>

            <div class="flex items-center justify-between pt-1">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                class="flex items-center gap-1 text-accent-blue hover:underline text-xs"
              >
                Get a free API key
                <ExternalLink class="w-3 h-3" />
              </a>
              <button
                @click="saveGemini"
                class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                :class="geminiSaved ? 'bg-accent-teal text-black' : 'bg-accent-blue hover:bg-accent-blue/80 text-white'"
              >
                <Check v-if="geminiSaved" class="w-3.5 h-3.5" />
                {{ geminiSaved ? 'Saved!' : 'Save Key' }}
              </button>
            </div>
          </div>

          <!-- Nebius tab -->
          <div v-if="activeTab === 'nebius'" class="p-5 flex flex-col gap-4">
            <div class="flex items-start gap-3 p-3 bg-nvidia/5 border border-nvidia/20 rounded-lg">
              <Cpu class="w-4 h-4 text-nvidia shrink-0 mt-0.5" />
              <div class="text-xs text-zinc-400 leading-relaxed">
                <strong class="text-zinc-200">NVIDIA Nemotron 3</strong> via Nebius Token Factory.
                Available models: <code class="text-nvidia bg-canvas px-1 rounded">Nano 30B</code>,
                <code class="text-nvidia bg-canvas px-1 rounded">Ultra 550B</code>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-2xs font-semibold text-zinc-500 uppercase tracking-wider">Nebius API Key</label>
              <input
                type="password"
                v-model="nebiusKey"
                placeholder="nvapi-..."
                class="bg-canvas border border-border focus:border-nvidia/50 rounded-md px-3 py-2 text-zinc-200 font-mono text-xs focus:outline-none transition-colors"
              />
            </div>

            <div class="flex items-center justify-between pt-1">
              <a
                href="https://tokenfactory.nebius.com/"
                target="_blank"
                class="flex items-center gap-1 text-accent-blue hover:underline text-xs"
              >
                Get Token Factory key
                <ExternalLink class="w-3 h-3" />
              </a>
              <button
                @click="saveNebius"
                class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                :class="nebiusSaved ? 'bg-nvidia text-black' : 'bg-nvidia hover:bg-nvidia-bright text-black'"
              >
                <Check v-if="nebiusSaved" class="w-3.5 h-3.5" />
                {{ nebiusSaved ? 'Saved!' : 'Save Key' }}
              </button>
            </div>
          </div>

          <!-- Footer note -->
          <div class="px-5 py-3 border-t border-border bg-canvas/30">
            <p class="text-2xs text-zinc-600">
              Keys are encrypted and stored using your OS keychain (Electron safeStorage). They never leave your machine.
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active {
  transition: opacity 150ms ease;
}
.modal-enter-active .bg-elevated, .modal-leave-active .bg-elevated {
  transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
