<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import { useDevToolsStore } from '../../stores/devtools-store';
import { useChatStore } from '../../stores/chat-store';
import { useBrowserStore } from '../../stores/browser-store';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  Trash2,
  ExternalLink,
  Search,
  Copy,
  Check,
  ChevronDown,
  CornerDownLeft,
  Sparkles,
  Bot
} from 'lucide-vue-next';

const devToolsStore = useDevToolsStore();
const chatStore = useChatStore();
const browserStore = useBrowserStore();

const logContainerRef = ref<HTMLElement | null>(null);
const autoScroll = ref(true);
const copiedId = ref<string | null>(null);
const expandedLogId = ref<string | null>(null);

// Interactive Console REPL state
const consoleInput = ref('');
const commandHistory = ref<string[]>([]);
const historyIndex = ref(-1);
const isEvaluating = ref(false);

onMounted(() => {
  devToolsStore.initListeners();
  scrollToBottom();
});

const scrollToBottom = () => {
  if (!autoScroll.value) return;
  nextTick(() => {
    if (logContainerRef.value) {
      logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
    }
  });
};

watch(() => devToolsStore.consoleLogs.length, () => {
  scrollToBottom();
});

const formatTime = (ts: number) => {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const ms = d.getMilliseconds().toString().padStart(3, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms}`;
};

const copyMessage = (entry: any) => {
  const text = entry.stack ? `${entry.message}\n${entry.stack}` : entry.message;
  navigator.clipboard.writeText(text);
  copiedId.value = entry.id;
  setTimeout(() => {
    if (copiedId.value === entry.id) copiedId.value = null;
  }, 1500);
};

const toggleExpand = (id: string) => {
  expandedLogId.value = expandedLogId.value === id ? null : id;
};

// Send error log directly to AI Copilot (Gemini / Nemotron)
const sendToAi = (log: any) => {
  browserStore.isCopilotOpen = true;
  const prompt = `Please inspect and diagnose this runtime console error:\n\nMessage: ${log.message}\n${log.sourceUrl ? `Source: ${log.sourceUrl}:${log.lineNumber || ''}` : ''}\n${log.stack ? `Stack Trace:\n${log.stack}` : ''}\n\nWhat caused this and how should I fix it?`;
  chatStore.sendMessage(prompt);
};

// Interactive REPL Evaluation
const evaluateConsoleCommand = async () => {
  const code = consoleInput.value.trim();
  if (!code || isEvaluating.value) return;

  // Add to history
  commandHistory.value.push(code);
  historyIndex.value = -1;
  consoleInput.value = '';

  // 1. Log input command
  devToolsStore.consoleLogs.push({
    id: `repl_in_${Date.now()}`,
    type: 'log',
    message: `> ${code}`,
    timestamp: Date.now()
  });

  isEvaluating.value = true;
  try {
    if (window.electronAPI?.executeWebJavaScript) {
      const res = await window.electronAPI.executeWebJavaScript(code);
      if (res.success) {
        let formatted = '';
        if (res.result === undefined) formatted = 'undefined';
        else if (res.result === null) formatted = 'null';
        else if (typeof res.result === 'object') formatted = JSON.stringify(res.result, null, 2);
        else formatted = String(res.result);

        devToolsStore.consoleLogs.push({
          id: `repl_out_${Date.now()}`,
          type: 'info',
          message: `< ${formatted}`,
          timestamp: Date.now()
        });
      } else {
        devToolsStore.consoleLogs.push({
          id: `repl_err_${Date.now()}`,
          type: 'error',
          message: `< Uncaught: ${res.error || 'Evaluation error'}`,
          timestamp: Date.now(),
          stack: res.error
        });
      }
    } else {
      // Local fallback eval
      try {
        const result = eval(code);
        devToolsStore.consoleLogs.push({
          id: `repl_out_${Date.now()}`,
          type: 'info',
          message: `< ${result !== undefined ? String(result) : 'undefined'}`,
          timestamp: Date.now()
        });
      } catch (err: any) {
        devToolsStore.consoleLogs.push({
          id: `repl_err_${Date.now()}`,
          type: 'error',
          message: `< Uncaught: ${err.message || err}`,
          timestamp: Date.now()
        });
      }
    }
  } catch (err: any) {
    devToolsStore.consoleLogs.push({
      id: `repl_err_${Date.now()}`,
      type: 'error',
      message: `< Error: ${err.message || err}`,
      timestamp: Date.now()
    });
  } finally {
    isEvaluating.value = false;
    scrollToBottom();
  }
};

const handleHistoryNav = (e: KeyboardEvent) => {
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (commandHistory.value.length === 0) return;
    if (historyIndex.value === -1) {
      historyIndex.value = commandHistory.value.length - 1;
    } else if (historyIndex.value > 0) {
      historyIndex.value--;
    }
    consoleInput.value = commandHistory.value[historyIndex.value] || '';
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (historyIndex.value !== -1) {
      if (historyIndex.value < commandHistory.value.length - 1) {
        historyIndex.value++;
        consoleInput.value = commandHistory.value[historyIndex.value];
      } else {
        historyIndex.value = -1;
        consoleInput.value = '';
      }
    }
  }
};
</script>

<template>
  <div class="h-full flex flex-col bg-zinc-950 font-mono text-xs select-text overflow-hidden">
    <!-- Toolbar -->
    <div class="h-8 px-2 bg-sidebar border-b border-border flex items-center justify-between shrink-0 select-none">
      <!-- Filter Buttons -->
      <div class="flex items-center gap-1">
        <button
          @click="devToolsStore.activeConsoleFilter = 'all'"
          class="px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors"
          :class="devToolsStore.activeConsoleFilter === 'all'
            ? 'bg-nvidia/20 text-nvidia border border-nvidia/40'
            : 'text-zinc-400 hover:text-zinc-200'"
        >
          All ({{ devToolsStore.consoleLogs.length }})
        </button>

        <button
          @click="devToolsStore.activeConsoleFilter = 'error'"
          class="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors"
          :class="devToolsStore.activeConsoleFilter === 'error'
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            : 'text-zinc-400 hover:text-rose-400'"
        >
          <AlertCircle class="w-3 h-3 text-rose-500" />
          <span>Errors</span>
          <span v-if="devToolsStore.errorCount > 0" class="px-1 py-0.2 text-[9px] rounded-full bg-rose-500/30 text-rose-300">
            {{ devToolsStore.errorCount }}
          </span>
        </button>

        <button
          @click="devToolsStore.activeConsoleFilter = 'warn'"
          class="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors"
          :class="devToolsStore.activeConsoleFilter === 'warn'
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            : 'text-zinc-400 hover:text-amber-400'"
        >
          <AlertTriangle class="w-3 h-3 text-amber-400" />
          <span>Warnings</span>
          <span v-if="devToolsStore.warnCount > 0" class="px-1 py-0.2 text-[9px] rounded-full bg-amber-500/30 text-amber-300">
            {{ devToolsStore.warnCount }}
          </span>
        </button>

        <button
          @click="devToolsStore.activeConsoleFilter = 'info'"
          class="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors"
          :class="devToolsStore.activeConsoleFilter === 'info'
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
            : 'text-zinc-400 hover:text-blue-400'"
        >
          <Info class="w-3 h-3 text-blue-400" />
          <span>Info</span>
        </button>
      </div>

      <!-- Search & Controls -->
      <div class="flex items-center gap-2">
        <div class="relative flex items-center">
          <Search class="w-3 h-3 text-zinc-500 absolute left-2 pointer-events-none" />
          <input
            v-model="devToolsStore.consoleSearch"
            type="text"
            placeholder="Filter logs..."
            class="bg-elevated border border-border/80 focus:border-nvidia/60 rounded px-6 py-0.5 text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none w-36 font-sans"
          />
        </div>

        <button
          @click="devToolsStore.clearConsole()"
          class="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-white/5 transition-colors"
          title="Clear console (Ctrl+L)"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>

        <button
          @click="devToolsStore.openNativeDevTools()"
          class="flex items-center gap-1 px-2 py-0.5 rounded border border-border/80 text-[11px] text-zinc-300 hover:text-white hover:bg-white/5 transition-colors font-sans"
          title="Open Native Chrome DevTools in detached window"
        >
          <ExternalLink class="w-3 h-3 text-nvidia" />
          <span>Native DevTools</span>
        </button>
      </div>
    </div>

    <!-- Console Output List -->
    <div
      ref="logContainerRef"
      class="flex-1 overflow-y-auto divide-y divide-zinc-900/60 p-1"
    >
      <div
        v-if="devToolsStore.filteredLogs.length === 0"
        class="h-full flex flex-col items-center justify-center text-zinc-500 select-none text-[11px] gap-1 p-6"
      >
        <span>Console is ready. Logs from the active web page and REPL will appear here.</span>
        <span class="text-zinc-600 text-2xs">Type JavaScript expressions below to evaluate live against the page.</span>
      </div>

      <div
        v-for="log in devToolsStore.filteredLogs"
        :key="log.id"
        class="py-1 px-2 flex flex-col group hover:bg-white/[0.03] transition-colors"
        :class="{
          'bg-rose-950/20 text-rose-200 border-l-2 border-l-rose-500': log.type === 'error',
          'bg-amber-950/20 text-amber-200 border-l-2 border-l-amber-500': log.type === 'warn' || log.type === 'warning',
          'text-sky-300': log.type === 'info',
          'text-zinc-300': log.type === 'log' || !['error', 'warn', 'warning', 'info'].includes(log.type)
        }"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-start gap-1.5 min-w-0 flex-1">
            <!-- Icon -->
            <AlertCircle v-if="log.type === 'error'" class="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
            <AlertTriangle v-else-if="log.type === 'warn' || log.type === 'warning'" class="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <Info v-else-if="log.type === 'info'" class="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <ChevronRight v-else class="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5" />

            <!-- Timestamp -->
            <span class="text-[10px] text-zinc-500 shrink-0 select-none">{{ formatTime(log.timestamp) }}</span>

            <!-- Message -->
            <span class="break-all whitespace-pre-wrap flex-1 leading-relaxed">{{ log.message }}</span>
          </div>

          <!-- Source & Actions -->
          <div class="flex items-center gap-1.5 shrink-0 select-none">
            <!-- 1-click Diagnose with Gemini/Nemotron button on errors -->
            <button
              v-if="log.type === 'error'"
              @click="sendToAi(log)"
              class="flex items-center gap-1 text-[10px] bg-nvidia/15 text-nvidia border border-nvidia/30 hover:bg-nvidia/25 px-1.5 py-0.5 rounded transition-colors font-sans font-medium"
              title="Send error to Gemini & Nemotron Copilot for diagnosis"
            >
              <Bot class="w-2.5 h-2.5" />
              <span>Ask AI</span>
            </button>

            <span
              v-if="log.sourceUrl"
              class="text-[10px] text-zinc-500 hover:text-zinc-300 truncate max-w-[180px]"
              :title="`${log.sourceUrl}${log.lineNumber ? ':' + log.lineNumber : ''}`"
            >
              {{ log.sourceUrl.split('/').pop() }}{{ log.lineNumber ? `:${log.lineNumber}` : '' }}
            </span>

            <button
              v-if="log.stack"
              @click="toggleExpand(log.id)"
              class="text-zinc-500 hover:text-zinc-300 p-0.5 rounded"
              title="Toggle stack trace"
            >
              <component :is="expandedLogId === log.id ? ChevronDown : ChevronRight" class="w-3 h-3" />
            </button>

            <button
              @click="copyMessage(log)"
              class="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-500 hover:text-zinc-200 transition-opacity"
              title="Copy log text"
            >
              <Check v-if="copiedId === log.id" class="w-3 h-3 text-emerald-400" />
              <Copy v-else class="w-3 h-3" />
            </button>
          </div>
        </div>

        <!-- Stack trace when expanded -->
        <div
          v-if="log.stack && expandedLogId === log.id"
          class="mt-1.5 pl-6 text-[10px] text-rose-300/80 font-mono whitespace-pre-wrap bg-black/40 p-2 rounded border border-rose-500/20 select-text"
        >
          {{ log.stack }}
        </div>
      </div>
    </div>

    <!-- Interactive Console REPL Input Bar (Chrome DevTools style) -->
    <div class="border-t border-border bg-[#101014] px-2 py-1.5 flex items-center gap-2 shrink-0">
      <span class="text-nvidia font-bold text-xs select-none">&gt;</span>
      <input
        v-model="consoleInput"
        @keydown.enter="evaluateConsoleCommand"
        @keydown.up="handleHistoryNav"
        @keydown.down="handleHistoryNav"
        type="text"
        placeholder="Evaluate JavaScript in page (e.g. document.title, location.href, fetch())..."
        class="flex-1 bg-transparent border-none outline-none text-xs text-zinc-100 placeholder-zinc-600 font-mono"
      />
      <button
        @click="evaluateConsoleCommand"
        :disabled="!consoleInput.trim() || isEvaluating"
        class="p-1 rounded text-zinc-500 hover:text-nvidia disabled:opacity-40 transition-colors"
        title="Execute (Enter)"
      >
        <CornerDownLeft class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
