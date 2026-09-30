# DOCUMENT 5 OF 6: VUE 3 RENDERER WORKSPACE, DEV CHAT SIDEBAR, AND UI COMPONENTS

**File Target:** `docs/05_VUE_3_RENDERER_WORKSPACE_DEV_CHAT_SIDEBAR_AND_UI_COMPONENTS.md`

**Series Roadmap:**

* **Doc 1: Master Architecture, System Topology, and IPC Contracts** *(Completed)*
* **Doc 2: Electron Main Process, WebContentsView Engine, and CDP Core** *(Completed)*
* **Doc 3: The 7 Autonomous Diagnostic & Load Engines** *(Completed)*
* **Doc 4: Nebius Token Factory, Nemotron Dual-Tier Routing, and Atomic File Patcher** *(Completed)*
* **Doc 5: Vue 3 Renderer Workspace, Dev Chat Sidebar, and UI Components** *(Current)*
* **Doc 6: Build Tooling, Native Rebuild, Packaging, and Hackathon Execution Guide**

---

## 1. UI Topology & Pinia Reactive Stores

The renderer process is a Vue 3 Single Page Application built with Vite and Tailwind CSS. It communicates exclusively with the Electron Main Process through the typed `window.electronAPI` context bridge.

The UI architecture isolates browser controls, low-level diagnostics, native terminal streams, visual API testing, and the Nemotron Dev Copilot into decoupled Pinia stores.

```
+----------------------------------------------------------------------------------------------------+
|                                    RENDERER STATE MANAGEMENT (Pinia)                               |
|                                                                                                    |
|  +--------------------+  +----------------------+  +---------------------+  +-------------------+  |
|  |   useBrowserStore  |  |  useTelemetryStore   |  |     useChatStore    |  |  useTerminalStore |  |
|  | - Tab states       |  | - 7 Domain Telemetry |  | - Message feed      |  | - Active sessions |  |
|  | - Active URL       |  | - Critical counters  |  | - Streaming status  |  | - Buffer states   |  |
|  | - Navigation flags |  | - Selected anomalies |  | - Pending patches   |  | - Cursor focus    |  |
|  | - Native bounds    |  | - Filter predicates  |  | - Token accounting  |  | - Fit dimensions  |  |
|  +--------------------+  +----------------------+  +---------------------+  +-------------------+  |
+----------------------------------------------------------------------------------------------------+

```

### Telemetry Store (`src/renderer/src/stores/telemetry-store.ts`)

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { DiagnosticTelemetry, DiagnosticDomain, DiagnosticSeverity } from '../../../shared/telemetry-types';

export const useTelemetryStore = defineStore('telemetry', () => {
  const items = ref<DiagnosticTelemetry[]>([]);
  const selectedDomain = ref<DiagnosticDomain | 'all'>('all');
  const activeInspectionNode = ref<any | null>(null);

  // Aggregated severity counters
  const criticalCount = computed(() => items.value.filter(i => i.severity === 'critical').length);
  const warningCount = computed(() => items.value.filter(i => i.severity === 'warning').length);

  // Per-domain fault distribution counters
  const domainCounts = computed(() => {
    const counts: Record<DiagnosticDomain, number> = {
      'element': 0,
      'cdn-xml': 0,
      'console': 0,
      'network': 0,
      'load': 0,
      'memory': 0,
      'security': 0
    };
    for (const item of items.value) {
      counts[item.domain] = (counts[item.domain] || 0) + 1;
    }
    return counts;
  });

  const filteredItems = computed(() => {
    if (selectedDomain.value === 'all') return items.value;
    return items.value.filter(i => i.domain === selectedDomain.value);
  });

  function addTelemetry(telemetry: DiagnosticTelemetry) {
    // Avoid unbounded memory growth: retain last 500 telemetry records
    if (items.value.length >= 500) {
      items.value.shift();
    }
    // Check for exact duplicate IDs before pushing
    const exists = items.value.some(i => i.id === telemetry.id);
    if (!exists) {
      items.value.push(telemetry);
    }
  }

  function clearAll() {
    items.value = [];
  }

  function clearDomain(domain: DiagnosticDomain) {
    items.value = items.value.filter(i => i.domain !== domain);
  }

  function setInspectionNode(nodeData: any) {
    activeInspectionNode.value = nodeData;
  }

  return {
    items,
    selectedDomain,
    activeInspectionNode,
    criticalCount,
    warningCount,
    domainCounts,
    filteredItems,
    addTelemetry,
    clearAll,
    clearDomain,
    setInspectionNode
  };
});

```

### Browser & Navigation Store (`src/renderer/src/stores/browser-store.ts`)

```typescript
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { NavigationState, ViewportBounds } from '../../../shared/telemetry-types';

export const useBrowserStore = defineStore('browser', () => {
  const currentUrl = ref('https://github.com');
  const inputUrl = ref('https://github.com');
  const pageTitle = ref('Dev-Shell');
  const isLoading = ref(false);
  const canGoBack = ref(false);
  const canGoForward = ref(false);
  const isSslSecure = ref(false);
  const activeDevice = ref<'desktop' | 'tablet' | 'mobile' | 'responsive'>('desktop');
  const isViewVisible = ref(true);
  const activeDrawer = ref<'none' | 'terminal' | 'api-tester' | 'memory' | 'load-tester'>('none');

  function updateNavigationState(state: NavigationState) {
    currentUrl.value = state.url;
    inputUrl.value = state.url;
    pageTitle.value = state.title;
    isLoading.value = state.isLoading;
    canGoBack.value = state.canGoBack;
    canGoForward.value = state.canGoForward;
    isSslSecure.value = state.sslSecure;
  }

  function setDrawer(drawer: 'none' | 'terminal' | 'api-tester' | 'memory' | 'load-tester') {
    activeDrawer.value = activeDrawer.value === drawer ? 'none' : drawer;
  }

  return {
    currentUrl,
    inputUrl,
    pageTitle,
    isLoading,
    canGoBack,
    canGoForward,
    isSslSecure,
    activeDevice,
    isViewVisible,
    activeDrawer,
    updateNavigationState,
    setDrawer
  };
});

```

### Chat & AI Copilot Store (`src/renderer/src/stores/chat-store.ts`)

```typescript
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ChatMessage, FilePatch } from '../../../shared/patch-types';
import { DiagnosticTelemetry } from '../../../shared/telemetry-types';

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Dev-Shell Copilot online. Connected to NVIDIA Nemotron on Nebius Token Factory. Monitoring CDP runtime telemetry, memory allocations, network bottlenecks, and security headers."
    }
  ]);
  const isGenerating = ref(false);
  const activeTelemetryContext = ref<DiagnosticTelemetry[]>([]);

  function addMessage(msg: ChatMessage) {
    messages.value.push(msg);
  }

  function attachTelemetryContext(telemetry: DiagnosticTelemetry) {
    const exists = activeTelemetryContext.value.some(t => t.id === telemetry.id);
    if (!exists) {
      activeTelemetryContext.value.push(telemetry);
    }
  }

  function removeTelemetryContext(id: string) {
    activeTelemetryContext.value = activeTelemetryContext.value.filter(t => t.id !== id);
  }

  function clearTelemetryContext() {
    activeTelemetryContext.value = [];
  }

  return {
    messages,
    isGenerating,
    activeTelemetryContext,
    addMessage,
    attachTelemetryContext,
    removeTelemetryContext,
    clearTelemetryContext
  };
});

```

---

## 2. Root Workspace Layout (`src/renderer/src/App.vue`)

`App.vue` defines the master screen grid. It mounts the Omnibar at the top, positions the `ViewportAnchor` to designate the native `WebContentsView` coordinate plane, hosts collapsible drawers along the bottom, and pins the `DevChatSidebar` to the right.

```vue
<template>
  <div class="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 select-none">
    <!-- Top Browser Chrome: Tabs, Omnibar, Responsive Controls, Status Badges -->
    <header class="flex-none z-30 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md">
      <Omnibar />
      <DiagnosticsBadgeBar />
    </header>

    <!-- Main Workspace Container -->
    <main class="flex-1 flex overflow-hidden relative">
      <!-- Left/Center Canvas Area: Native WebContentsView + Bottom Drawer -->
      <section class="flex-1 flex flex-col min-w-0 relative">
        <!-- Native Viewport Anchor Element tracked by ResizeObserver -->
        <div class="flex-1 relative w-full h-full min-h-0 bg-zinc-950">
          <ViewportAnchor />
        </div>

        <!-- Collapsible Bottom Drawer Workspace -->
        <transition name="drawer-slide">
          <div 
            v-if="browserStore.activeDrawer !== 'none'"
            class="flex-none h-80 border-t border-zinc-800 bg-zinc-950 flex flex-col z-20 shadow-2xl"
          >
            <!-- Drawer Navigation Header -->
            <div class="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
              <div class="flex items-center gap-2">
                <button 
                  @click="browserStore.setDrawer('terminal')"
                  :class="['px-2.5 py-1 text-xs font-mono font-medium rounded transition', browserStore.activeDrawer === 'terminal' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200']"
                >
                  $_ Terminal
                </button>
                <button 
                  @click="browserStore.setDrawer('api-tester')"
                  :class="['px-2.5 py-1 text-xs font-medium rounded transition', browserStore.activeDrawer === 'api-tester' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200']"
                >
                  ⚡ Smart cURL
                </button>
                <button 
                  @click="browserStore.setDrawer('memory')"
                  :class="['px-2.5 py-1 text-xs font-medium rounded transition', browserStore.activeDrawer === 'memory' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200']"
                >
                  🧠 Heap & Leaks
                </button>
                <button 
                  @click="browserStore.setDrawer('load-tester')"
                  :class="['px-2.5 py-1 text-xs font-medium rounded transition', browserStore.activeDrawer === 'load-tester' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200']"
                >
                  🔥 Concurrency Load
                </button>
              </div>
              <button 
                @click="browserStore.setDrawer('none')"
                class="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded"
                title="Close Drawer"
              >
                ✕
              </button>
            </div>

            <!-- Drawer View Body -->
            <div class="flex-1 min-h-0 relative overflow-hidden">
              <TerminalPanel v-show="browserStore.activeDrawer === 'terminal'" />
              <SmartCurlPanel v-show="browserStore.activeDrawer === 'api-tester'" />
              <div v-show="browserStore.activeDrawer === 'memory'" class="p-4 text-xs font-mono text-zinc-400">
                Memory Profiler Dashboard (Trigger GC & Audit via Badges)
              </div>
              <div v-show="browserStore.activeDrawer === 'load-tester'" class="p-4 text-xs font-mono text-zinc-400">
                Concurrency Stress Studio (Trigger via Domain Badge)
              </div>
            </div>
          </div>
        </transition>
      </section>

      <!-- Right AI Assistant: DevChatSidebar -->
      <DevChatSidebar />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useBrowserStore } from './stores/browser-store';
import { useTelemetryStore } from './stores/telemetry-store';
import Omnibar from './components/chrome/Omnibar.vue';
import DiagnosticsBadgeBar from './components/chrome/DiagnosticsBadgeBar.vue';
import ViewportAnchor from './components/viewport/ViewportAnchor.vue';
import DevChatSidebar from './components/chat/DevChatSidebar.vue';
import TerminalPanel from './components/drawers/TerminalPanel.vue';
import SmartCurlPanel from './components/drawers/SmartCurlPanel.vue';

const browserStore = useBrowserStore();
const telemetryStore = useTelemetryStore();

onMounted(() => {
  // Listen for navigation state updates emitted from Electron Main Process
  window.electronAPI.onNavigationStateChanged((state) => {
    browserStore.updateNavigationState(state);
  });

  // Listen for continuous CDP diagnostic telemetry events
  window.electronAPI.onTelemetryReceived((telemetry) => {
    telemetryStore.addTelemetry(telemetry);
  });

  // Listen for inspected node queries
  window.electronAPI.onNodeInspected((nodeData) => {
    telemetryStore.setInspectionNode(nodeData);
  });
});
</script>

<style scoped>
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>

```

---

## 3. Viewport Anchor & Coordinate Synchronization (`src/renderer/src/components/viewport/ViewportAnchor.vue`)

This component maps the HTML DOM layout to native Chromium pixels. It measures physical coordinates via a `ResizeObserver`, scales the bounding box using `window.devicePixelRatio`, and dispatches coordinates to the Main Process to resize the underlying native `WebContentsView`.

```vue
<template>
  <div 
    ref="anchorRef" 
    id="viewport-anchor" 
    class="w-full h-full min-h-0 min-w-0 overflow-hidden relative pointer-events-none"
  >
    <!-- Fallback indicator rendered when native view is temporarily hidden -->
    <div 
      v-if="!browserStore.isViewVisible" 
      class="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm pointer-events-auto"
    >
      <span class="text-xs font-mono text-zinc-400">View hidden for modal occlusion</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useBrowserStore } from '../../stores/browser-store';

const anchorRef = ref<HTMLElement | null>(null);
const browserStore = useBrowserStore();
let resizeObserver: ResizeObserver | null = null;
let animationFrameId: number | null = null;

function synchronizeNativeBounds() {
  if (!anchorRef.value) return;

  const rect = anchorRef.value.getBoundingClientRect();
  
  // Clamping to positive integers to satisfy native Win32/Cocoa rect dimensions
  const bounds = {
    x: Math.max(0, Math.floor(rect.x)),
    y: Math.max(0, Math.floor(rect.y)),
    width: Math.max(10, Math.floor(rect.width)),
    height: Math.max(10, Math.floor(rect.height))
  };

  window.electronAPI.syncViewportBounds(bounds);
}

function handleResize() {
  // Coalesce high-frequency resize events with requestAnimationFrame
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  animationFrameId = requestAnimationFrame(() => {
    synchronizeNativeBounds();
    animationFrameId = null;
  });
}

onMounted(() => {
  if (anchorRef.value) {
    resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(anchorRef.value);
  }

  // Also bind to window resize to catch multi-monitor DPI transitions
  window.addEventListener('resize', handleResize);
  // Perform initial bound dispatch
  handleResize();
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  window.removeEventListener('resize', handleResize);
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>

```

---

## 4. Browser Chrome Navigation & Diagnostics Bar

### Omnibar Component (`src/renderer/src/components/chrome/Omnibar.vue`)

```vue
<template>
  <div class="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-800">
    <!-- Navigation Buttons -->
    <div class="flex items-center gap-1">
      <button 
        @click="window.electronAPI.goBack()" 
        :disabled="!browserStore.canGoBack"
        class="p-1.5 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition text-zinc-300"
        title="Back"
      >
        ◀
      </button>
      <button 
        @click="window.electronAPI.goForward()" 
        :disabled="!browserStore.canGoForward"
        class="p-1.5 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition text-zinc-300"
        title="Forward"
      >
        ▶
      </button>
      <button 
        @click="handleReloadOrStop" 
        class="p-1.5 rounded hover:bg-zinc-800 transition text-zinc-300 font-mono text-sm"
        :title="browserStore.isLoading ? 'Stop' : 'Reload'"
      >
        {{ browserStore.isLoading ? '✕' : '⟳' }}
      </button>
    </div>

    <!-- URL Input Omnibar -->
    <form @submit.prevent="handleNavigate" class="flex-1 flex items-center relative">
      <div class="absolute left-2.5 flex items-center pointer-events-none">
        <span v-if="browserStore.isSslSecure" class="text-emerald-400 text-xs" title="HTTPS Secure Connection">🔒</span>
        <span v-else class="text-zinc-500 text-xs" title="Insecure HTTP">🔓</span>
      </div>
      <input 
        v-model="browserStore.inputUrl"
        type="text" 
        placeholder="Enter URL or localhost:3000..." 
        class="w-full bg-zinc-950 border border-zinc-700/80 rounded-md pl-8 pr-20 py-1 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
      />
      <div class="absolute right-2 flex items-center gap-1.5">
        <span v-if="browserStore.isLoading" class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
        <span class="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{{ browserStore.activeDevice }}</span>
      </div>
    </form>

    <!-- Responsive Device Emulation Selectors -->
    <div class="flex items-center gap-1 border-l border-zinc-800 pl-2">
      <button 
        @click="setDevice('desktop')"
        :class="['px-2 py-1 text-xs rounded transition', browserStore.activeDevice === 'desktop' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200']"
        title="Desktop Mode (1920x1080)"
      >
        🖥️
      </button>
      <button 
        @click="setDevice('tablet')"
        :class="['px-2 py-1 text-xs rounded transition', browserStore.activeDevice === 'tablet' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200']"
        title="Tablet Mode (820x1180)"
      >
        📱
      </button>
      <button 
        @click="setDevice('mobile')"
        :class="['px-2 py-1 text-xs rounded transition', browserStore.activeDevice === 'mobile' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200']"
        title="Mobile Mode (390x844)"
      >
        📲
      </button>
    </div>

    <!-- Network Throttling Selector -->
    <div class="flex items-center border-l border-zinc-800 pl-2">
      <select 
        @change="handleThrottlingChange"
        class="bg-zinc-950 border border-zinc-700 text-zinc-300 text-xs rounded px-2 py-1 font-mono focus:outline-none focus:border-emerald-500"
      >
        <option value="online">No Throttling</option>
        <option value="fast-3g">Fast 3G (1.6 Mbps)</option>
        <option value="slow-3g">Slow 3G (400 kbps)</option>
        <option value="offline">Offline</option>
      </select>
    </div>

    <!-- Inspector & Drawer Toggles -->
    <div class="flex items-center gap-1 border-l border-zinc-800 pl-2">
      <button 
        @click="toggleElementInspect"
        :class="['p-1.5 rounded transition', isInspectActive ? 'bg-emerald-600 text-white' : 'hover:bg-zinc-800 text-zinc-300']"
        title="Click-to-Inspect Element"
      >
        🎯
      </button>
      <button 
        @click="browserStore.setDrawer('terminal')"
        class="p-1.5 rounded hover:bg-zinc-800 transition text-zinc-300"
        title="Toggle Integrated Terminal"
      >
        💻
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useBrowserStore } from '../../stores/browser-store';

const browserStore = useBrowserStore();
const isInspectActive = ref(false);

function handleNavigate() {
  if (!browserStore.inputUrl.trim()) return;
  window.electronAPI.navigate(browserStore.inputUrl);
}

function handleReloadOrStop() {
  if (browserStore.isLoading) {
    window.electronAPI.stopLoading();
  } else {
    window.electronAPI.reload();
  }
}

function setDevice(device: 'desktop' | 'tablet' | 'mobile') {
  browserStore.activeDevice = device;
  window.electronAPI.setDeviceEmulation(device);
}

function handleThrottlingChange(event: Event) {
  const profile = (event.target as HTMLSelectElement).value as any;
  window.electronAPI.setNetworkThrottling(profile);
}

function toggleElementInspect() {
  isInspectActive.value = !isInspectActive.value;
  window.electronAPI.toggleElementInspectMode(isInspectActive.value);
}
</script>

```

### Diagnostics Badge Bar (`src/renderer/src/components/chrome/DiagnosticsBadgeBar.vue`)

```vue
<template>
  <div class="flex items-center justify-between px-3 py-1 bg-zinc-950/80 border-b border-zinc-800/80 text-[11px] font-mono">
    <!-- 7 Domain Counters -->
    <div class="flex items-center gap-3 overflow-x-auto">
      <span class="text-zinc-500 font-semibold tracking-wider uppercase text-[10px]">Active Monitors:</span>

      <button 
        v-for="(count, domain) in telemetryStore.domainCounts" 
        :key="domain"
        @click="filterDomain(domain)"
        :class="['flex items-center gap-1.5 px-2 py-0.5 rounded transition', 
                 telemetryStore.selectedDomain === domain ? 'bg-zinc-800 ring-1 ring-zinc-600' : 'hover:bg-zinc-900',
                 count > 0 ? getDomainColor(domain) : 'text-zinc-600']"
      >
        <span>{{ getDomainIcon(domain) }}</span>
        <span class="capitalize">{{ domain }}:</span>
        <span class="font-bold">{{ count }}</span>
      </button>
    </div>

    <!-- Quick Action Audits -->
    <div class="flex items-center gap-2">
      <button 
        @click="window.electronAPI.triggerGarbageCollection()"
        class="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-zinc-300 transition"
        title="Force V8 Garbage Collection"
      >
        🧹 Force GC
      </button>
      <button 
        @click="window.electronAPI.runMemoryAudit()"
        class="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-zinc-300 transition"
        title="Run Heap Leak Scan"
      >
        🧠 Audit Heap
      </button>
      <button 
        @click="window.electronAPI.runFullSecurityAudit()"
        class="px-2 py-0.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 rounded transition font-semibold"
        title="Trigger Security & Headers Audit"
      >
        ⚡ Audit Security
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTelemetryStore } from '../../stores/telemetry-store';
import { DiagnosticDomain } from '../../../../shared/telemetry-types';

const telemetryStore = useTelemetryStore();

function filterDomain(domain: DiagnosticDomain) {
  telemetryStore.selectedDomain = telemetryStore.selectedDomain === domain ? 'all' : domain;
}

function getDomainIcon(domain: DiagnosticDomain): string {
  switch (domain) {
    case 'element': return '🎯';
    case 'cdn-xml': return '📦';
    case 'console': return '🚨';
    case 'network': return '🌐';
    case 'load': return '🔥';
    case 'memory': return '🧠';
    case 'security': return '🛡️';
  }
}

function getDomainColor(domain: DiagnosticDomain): string {
  switch (domain) {
    case 'security':
    case 'console': return 'text-red-400';
    case 'load':
    case 'memory': return 'text-amber-400';
    case 'network':
    case 'cdn-xml':
    case 'element': return 'text-emerald-400';
  }
}
</script>

```

---

## 5. Dev Copilot Chat Sidebar & Interactive Patch Card

### DevChatSidebar Component (`src/renderer/src/components/chat/DevChatSidebar.vue`)

```vue
<template>
  <aside class="w-96 flex flex-col h-full border-l border-zinc-800 bg-zinc-950 z-20">
    <!-- Header -->
    <div class="p-3 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-200">Nemotron 3 Copilot</h2>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">Nebius Cloud</span>
        <button @click="chatStore.messages = []" class="text-xs text-zinc-500 hover:text-zinc-300">Clear</button>
      </div>
    </div>

    <!-- Active Attached Telemetry Tray -->
    <div 
      v-if="chatStore.activeTelemetryContext.length > 0" 
      class="p-2 bg-zinc-900/80 border-b border-zinc-800 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto"
    >
      <div 
        v-for="t in chatStore.activeTelemetryContext" 
        :key="t.id"
        class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-mono text-emerald-300"
      >
        <span>{{ t.title }}</span>
        <button @click="chatStore.removeTelemetryContext(t.id)" class="hover:text-red-400">✕</button>
      </div>
      <button 
        @click="chatStore.clearTelemetryContext" 
        class="text-[10px] text-zinc-500 hover:text-zinc-300 underline ml-1"
      >
        Clear all
      </button>
    </div>

    <!-- Chat Stream Feed -->
    <div ref="scrollContainer" class="flex-1 overflow-y-auto p-3 space-y-3.5">
      <div 
        v-for="(msg, idx) in chatStore.messages" 
        :key="idx" 
        :class="['p-3 rounded-lg text-xs leading-relaxed transition', 
                 msg.role === 'user' ? 'bg-zinc-800/90 ml-6 text-zinc-100' : 'bg-zinc-900 border border-zinc-800 mr-2 text-zinc-200']"
      >
        <div class="flex items-center justify-between mb-1.5">
          <span class="font-bold text-[10px] uppercase tracking-wider text-zinc-400">
            {{ msg.role === 'user' ? 'Developer' : 'Nemotron 3 Ultra' }}
          </span>
          <span v-if="msg.role === 'assistant'" class="text-[9px] font-mono text-emerald-400/80">Nebius Token Factory</span>
        </div>

        <!-- Render Message Body -->
        <div class="whitespace-pre-wrap font-sans text-xs select-text">{{ msg.content }}</div>

        <!-- If message contains an atomic patch, render interactive PatchCard -->
        <PatchCard v-if="msg.patch" :patch="msg.patch" class="mt-3" />
      </div>

      <!-- Generating Spinner -->
      <div v-if="chatStore.isGenerating" class="flex items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg mr-2 text-xs text-zinc-400 font-mono">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        <span>Nemotron 3 Ultra is analyzing runtime telemetry & synthesizing patch...</span>
      </div>
    </div>

    <!-- Chat Input Box -->
    <div class="p-3 border-t border-zinc-800 bg-zinc-900/50">
      <form @submit.prevent="handleSendMessage" class="flex flex-col gap-2">
        <textarea 
          v-model="inputQuery"
          rows="3"
          placeholder="Ask Copilot, attach diagnostic errors, or request patch..."
          class="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none font-sans"
          @keydown.enter.exact.prevent="handleSendMessage"
        ></textarea>
        <div class="flex items-center justify-between">
          <span class="text-[10px] text-zinc-500 font-mono">Enter ↵ to send</span>
          <button 
            type="submit" 
            :disabled="!inputQuery.trim() || chatStore.isGenerating"
            class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded text-xs font-medium transition"
          >
            Send Prompt
          </button>
        </div>
      </form>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { useChatStore } from '../../stores/chat-store';
import PatchCard from './PatchCard.vue';

const chatStore = useChatStore();
const inputQuery = ref('');
const scrollContainer = ref<HTMLElement | null>(null);

async function handleSendMessage() {
  if (!inputQuery.value.trim() || chatStore.isGenerating) return;

  const prompt = inputQuery.value;
  chatStore.addMessage({ role: 'user', content: prompt });
  inputQuery.value = '';
  chatStore.isGenerating = true;
  scrollToBottom();

  try {
    const response = await window.electronAPI.sendCopilotMessage({
      prompt,
      history: chatStore.messages.map(m => ({ role: m.role, content: m.content })),
      telemetryContext: chatStore.activeTelemetryContext
    });

    chatStore.addMessage({
      role: 'assistant',
      content: response.reply,
      patch: response.patch
    });

    // Clear telemetry context after invocation
    chatStore.clearTelemetryContext();
  } catch (err: any) {
    chatStore.addMessage({
      role: 'assistant',
      content: `Inference failed: ${err.message}`
    });
  } finally {
    chatStore.isGenerating = false;
    scrollToBottom();
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  });
}
</script>

```

### Interactive Patch Card (`src/renderer/src/components/chat/PatchCard.vue`)

```vue
<template>
  <div class="p-3 bg-black/70 rounded border border-emerald-500/50 font-mono text-[11px] shadow-lg select-text">
    <!-- Header: File Path and Domain -->
    <div class="flex items-center justify-between mb-2 pb-1.5 border-b border-zinc-800">
      <div class="flex items-center gap-1.5 text-emerald-400 font-bold">
        <span>📄</span>
        <span class="truncate max-w-[200px]" :title="patch.filePath">{{ patch.filePath }}</span>
      </div>
      <span class="text-[9px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
        {{ patch.targetDomain }}
      </span>
    </div>

    <!-- Rationale -->
    <p class="font-sans text-[11px] text-zinc-300 mb-2 leading-relaxed">
      {{ patch.rationale }}
    </p>

    <!-- Side-by-Side / Unified Diff Preview -->
    <div class="rounded bg-zinc-950 border border-zinc-800 p-2 overflow-x-auto space-y-1 text-[10px]">
      <div class="text-red-400/90 whitespace-pre font-mono bg-red-950/20 px-1 py-0.5 rounded">
        - {{ patch.searchBlock }}
      </div>
      <div class="text-emerald-300 whitespace-pre font-mono bg-emerald-950/20 px-1 py-0.5 rounded">
        + {{ patch.replaceBlock }}
      </div>
    </div>

    <!-- Error Banner if execution failed -->
    <div v-if="executionError" class="mt-2 text-red-400 text-[10px] font-sans">
      ⚠️ {{ executionError }}
    </div>

    <!-- Action Trigger: 1-Click Codebase Apply & Rollback -->
    <div class="mt-3 flex items-center gap-2">
      <button 
        v-if="!isApplied"
        @click="applyPatchToDisk"
        :disabled="isApplying"
        class="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded font-sans font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow"
      >
        <span v-if="isApplying" class="animate-spin">🌀</span>
        <span>{{ isApplying ? 'Writing Disk...' : '⚡ Apply to Codebase' }}</span>
      </button>

      <div v-else class="flex-1 flex items-center gap-2">
        <div class="flex-1 py-1 px-2 rounded bg-zinc-800 border border-emerald-500/40 text-emerald-400 text-center font-sans font-medium text-xs">
          ✓ Patch Committed
        </div>
        <button 
          v-if="backupId"
          @click="rollbackPatch" 
          class="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-sans text-xs border border-zinc-700 transition"
          title="Revert to pre-patch snapshot"
        >
          Rollback
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { FilePatch } from '../../../../shared/patch-types';

const props = defineProps<{
  patch: FilePatch;
}>();

const isApplying = ref(false);
const isApplied = ref(false);
const backupId = ref<string | null>(null);
const executionError = ref<string | null>(null);

async function applyPatchToDisk() {
  isApplying.value = true;
  executionError.value = null;

  try {
    const result = await window.electronAPI.applyFilePatch(props.patch);
    if (result.success) {
      isApplied.value = true;
      backupId.value = result.backupId || null;
    } else {
      executionError.value = result.error || 'Failed to match search block on disk.';
    }
  } catch (err: any) {
    executionError.value = err.message;
  } finally {
    isApplying.value = false;
  }
}

async function rollbackPatch() {
  if (!backupId.value) return;
  const success = await window.electronAPI.rollbackLastPatch(backupId.value);
  if (success) {
    isApplied.value = false;
    backupId.value = null;
  }
}
</script>

```

---

## 6. Integrated Workspace Drawers

### Terminal Panel (`src/renderer/src/components/drawers/TerminalPanel.vue`)

```vue
<template>
  <div class="w-full h-full bg-[#0c0c0e] relative overflow-hidden flex flex-col">
    <div ref="terminalContainer" class="flex-1 w-full h-full p-2"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

const terminalContainer = ref<HTMLElement | null>(null);
const sessionId = 'default_dev_session';
let term: Terminal | null = null;
let fitAddon: FitAddon | null = null;
let unsubscribeData: (() => void) | null = null;
let resizeObserver: ResizeObserver | null = null;

onMounted(async () => {
  if (!terminalContainer.value) return;

  term = new Terminal({
    cursorBlink: true,
    fontFamily: 'Fira Code, Menlo, Consolas, Monaco, monospace',
    fontSize: 12,
    lineHeight: 1.2,
    theme: {
      background: '#0c0c0e',
      foreground: '#d4d4d8',
      cursor: '#10b981',
      selectionBackground: '#10b98144'
    }
  });

  fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.loadAddon(new WebLinksAddon());

  term.open(terminalContainer.value);
  fitAddon.fit();

  // Create native PTY session over IPC
  await window.electronAPI.createTerminalSession(sessionId, term.cols, term.rows);

  // Pipe user keyboard keystrokes to node-pty
  term.onData((data) => {
    window.electronAPI.writeTerminalData(sessionId, data);
  });

  // Pipe incoming shell bytes from node-pty to xterm.js
  unsubscribeData = window.electronAPI.onTerminalData((incomingSessionId, data) => {
    if (incomingSessionId === sessionId && term) {
      term.write(data);
    }
  });

  // Observe drawer resize events and notify PTY
  resizeObserver = new ResizeObserver(() => {
    if (fitAddon && term) {
      fitAddon.fit();
      window.electronAPI.resizeTerminalSession(sessionId, term.cols, term.rows);
    }
  });
  resizeObserver.observe(terminalContainer.value);
});

onBeforeUnmount(() => {
  if (unsubscribeData) unsubscribeData();
  if (resizeObserver) resizeObserver.disconnect();
  if (term) term.dispose();
  window.electronAPI.destroyTerminalSession(sessionId);
});
</script>

```

### Smart cURL / API Testing Client (`src/renderer/src/components/drawers/SmartCurlPanel.vue`)

```vue
<template>
  <div class="w-full h-full flex flex-col bg-zinc-950 font-mono text-xs overflow-hidden select-text">
    <!-- Proposed Action Notification Banner (HITL) -->
    <div 
      v-if="agentProposed" 
      class="bg-emerald-950/80 border-b border-emerald-500/40 p-2 flex items-center justify-between text-emerald-300 font-sans"
    >
      <div class="flex items-center gap-2">
        <span class="animate-pulse">⚡</span>
        <span class="font-semibold text-xs">Nemotron proposed an API verification request:</span>
      </div>
      <div class="flex items-center gap-2">
        <button 
          @click="executeRequest"
          class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
        >
          Approve & Run
        </button>
        <button 
          @click="agentProposed = false"
          class="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs"
        >
          Dismiss
        </button>
      </div>
    </div>

    <!-- Request Builder Header -->
    <div class="flex items-center gap-2 p-2 border-b border-zinc-800 bg-zinc-900/50">
      <select 
        v-model="method" 
        class="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 font-bold text-emerald-400 focus:outline-none"
      >
        <option>GET</option>
        <option>POST</option>
        <option>PUT</option>
        <option>DELETE</option>
        <option>PATCH</option>
      </select>
      <input 
        v-model="targetUrl" 
        type="text" 
        placeholder="http://localhost:3000/api/endpoint" 
        class="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
      />
      <button 
        @click="executeRequest" 
        :disabled="isRunning"
        class="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded font-bold transition"
      >
        {{ isRunning ? 'Sending...' : 'Send' }}
      </button>
    </div>

    <!-- Dual Workspace: Body Editor and Response Inspector -->
    <div class="flex-1 flex min-h-0 divide-x divide-zinc-800">
      <!-- Request Body / Headers -->
      <div class="w-1/2 flex flex-col p-2 space-y-2 overflow-y-auto">
        <span class="text-[10px] text-zinc-500 uppercase font-bold">Request JSON Body:</span>
        <textarea 
          v-model="requestBody" 
          placeholder="{}" 
          class="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 resize-none font-mono"
        ></textarea>
      </div>

      <!-- Response Inspector -->
      <div class="w-1/2 flex flex-col p-2 overflow-hidden bg-zinc-950">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] text-zinc-500 uppercase font-bold">Response:</span>
          <div v-if="lastResponse" class="flex items-center gap-2 text-[10px]">
            <span :class="['px-1.5 py-0.5 rounded font-bold', lastResponse.status < 400 ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300']">
              HTTP {{ lastResponse.status }}
            </span>
            <span class="text-zinc-500">{{ lastResponse.latencyMs }}ms</span>
          </div>
        </div>

        <pre 
          class="flex-1 overflow-y-auto p-2 bg-zinc-900/60 border border-zinc-800/80 rounded text-[11px] text-zinc-300 font-mono"
        >{{ lastResponse ? JSON.stringify(lastResponse.data, null, 2) : '// No response generated yet' }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const method = ref('GET');
const targetUrl = ref('http://localhost:3000/api/health');
const requestBody = ref('');
const isRunning = ref(false);
const agentProposed = ref(false);
const lastResponse = ref<{ status: number; latencyMs: number; data: any } | null>(null);

async function executeRequest() {
  isRunning.value = true;
  agentProposed.value = false;

  try {
    const res = await window.electronAPI.executeApiRequest({
      url: targetUrl.value,
      method: method.value,
      headers: { 'Content-Type': 'application/json' },
      body: requestBody.value
    });
    lastResponse.value = res;
  } catch (err: any) {
    lastResponse.value = {
      status: 0,
      latencyMs: 0,
      data: { error: err.message }
    };
  } finally {
    isRunning.value = false;
  }
}

onMounted(() => {
  window.electronAPI.onAgentProposedApiRequest((req) => {
    method.value = req.method;
    targetUrl.value = req.url;
    requestBody.value = req.body || '';
    agentProposed.value = true;
  });
});
</script>

```

---

*This concludes Document 5. Document 6 covers native module rebuilding (`electron-rebuild`), Vite production bundling, installer packaging with `electron-builder`, and the complete hackathon execution checklist.*