<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useBrowserStore } from './stores/browser-store';
import { useTelemetryStore } from './stores/telemetry-store';
import Omnibar from './components/chrome/Omnibar.vue';
import TopNavbar from './components/chrome/TopNavbar.vue';
import ViewportAnchor from './components/viewport/ViewportAnchor.vue';
import ActivityBar from './components/sidebar/ActivityBar.vue';
import FileExplorer from './components/sidebar/FileExplorer.vue';
import ExtensionsPanel from './components/sidebar/ExtensionsPanel.vue';
import SourceControlPanel from './components/sidebar/SourceControlPanel.vue';
import MonacoEditor from './components/editor/MonacoEditor.vue';
import DrawerContainer from './components/drawers/DrawerContainer.vue';
import DevChatSidebar from './components/chat/DevChatSidebar.vue';
import StatusBar from './components/statusbar/StatusBar.vue';
import ApiKeySettingsModal from './components/modals/ApiKeySettingsModal.vue';
import { useFsStore } from './stores/fs-store';

const browserStore = useBrowserStore();
(window as any).__browserStore = browserStore;
const telemetryStore = useTelemetryStore();
const fsStore = useFsStore();
const isSidebarOpen = ref(true);
const activeSidebarTab = ref<'explorer' | 'extensions' | 'git'>('explorer');
const splitPaneRef = ref<HTMLElement | null>(null);

const handleSidebarTabSelect = (tab: 'explorer' | 'extensions' | 'git') => {
  if (isSidebarOpen.value && activeSidebarTab.value === tab) {
    isSidebarOpen.value = false;
  } else {
    activeSidebarTab.value = tab;
    isSidebarOpen.value = true;
  }
};

const startSplitResize = (e: PointerEvent) => {
  e.preventDefault();
  const target = e.currentTarget as HTMLElement;
  try {
    target.setPointerCapture(e.pointerId);
  } catch {}
  browserStore.setDraggingResizer(true, 'col-resize');

  const container = splitPaneRef.value;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const containerWidth = rect.width;
  const startX = e.clientX;
  const startRatio = browserStore.splitRatio;

  const onPointerMove = (ev: PointerEvent) => {
    const deltaX = ev.clientX - startX;
    const deltaRatio = (deltaX / containerWidth) * 100;
    browserStore.setSplitRatio(startRatio + deltaRatio);
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

onMounted(() => {
  if (window.electronAPI) {
    window.electronAPI.onNavigationStateChanged((state) => {
      browserStore.updateNavState(state);
    });
    window.electronAPI.onTelemetryReceived((telemetry) => {
      telemetryStore.addTelemetry(telemetry);
    });
    window.electronAPI.onNodeInspected((nodeInfo) => {
      telemetryStore.setInspectedNode(nodeInfo);
    });

    // Show browser view immediately on mount
    window.electronAPI.setBrowserVisibility(
      browserStore.activeViewMode !== 'editor'
    );
  }

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'X' || e.key === 'x')) {
      e.preventDefault();
      handleSidebarTabSelect('extensions');
    } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'G' || e.key === 'g')) {
      e.preventDefault();
      handleSidebarTabSelect('git');
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      handleSidebarTabSelect('explorer');
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) {
      e.preventDefault();
      if (e.shiftKey) {
        fsStore.openFolderDialog();
      } else {
        fsStore.openFileDialog();
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '`') {
      e.preventDefault();
      browserStore.toggleDrawer();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      browserStore.isCopilotOpen = !browserStore.isCopilotOpen;
    }
    if (e.key === 'F12') {
      e.preventDefault();
      window.electronAPI?.toggleDevTools();
    }
  });

  window.addEventListener('bstudio:open-extensions', () => {
    handleSidebarTabSelect('extensions');
  });

  window.addEventListener('bstudio:open-sidebar', (e: any) => {
    if (e.detail) {
      handleSidebarTabSelect(e.detail);
    }
  });

  window.addEventListener('bstudio:ensure-editor-visible', () => {
    if (browserStore.activeViewMode === 'browser') {
      browserStore.activeViewMode = 'split';
    }
  });
});

// Keep browser view visibility in sync with view mode
watch(() => browserStore.activeViewMode, (mode) => {
  if (window.electronAPI) {
    window.electronAPI.setBrowserVisibility(mode !== 'editor');
  }
});

// Trigger resize when sidebar toggles
watch(isSidebarOpen, () => {
  setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
  setTimeout(() => window.dispatchEvent(new Event('resize')), 250);
});
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-canvas text-zinc-300 overflow-hidden font-sans select-none relative">
    <!-- Global Fullscreen Drag Mask when Resizing -->
    <div
      v-if="browserStore.isDraggingResizer"
      class="fixed inset-0 z-50 select-none bg-transparent"
      :class="browserStore.resizerCursor === 'col-resize' ? 'cursor-col-resize' : 'cursor-row-resize'"
    />

    <!-- VS Code Upper Titlebar & Navbar (File, Edit, Selection, View, Go, Terminal, Window Controls) -->
    <TopNavbar />

    <!-- Top Omnibar / Browser Chrome -->
    <Omnibar />

    <!-- Main Workspace -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Activity Bar -->
      <ActivityBar
        :active-sidebar-tab="activeSidebarTab"
        :is-sidebar-open="isSidebarOpen"
        @select-tab="handleSidebarTabSelect"
      />

      <!-- Collapsible Sidebar (File Explorer, Extensions, or Source Control) -->
      <Transition name="explorer">
        <div v-if="isSidebarOpen" class="h-full flex overflow-hidden shrink-0">
          <FileExplorer v-if="activeSidebarTab === 'explorer'" />
          <ExtensionsPanel v-else-if="activeSidebarTab === 'extensions'" />
          <SourceControlPanel v-else-if="activeSidebarTab === 'git'" />
        </div>
      </Transition>

      <!-- Center workspace (editor + browser) -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div ref="splitPaneRef" class="flex-1 flex overflow-hidden relative">
          <!-- Monaco Editor pane -->
          <div
            v-show="browserStore.activeViewMode === 'split' || browserStore.activeViewMode === 'editor'"
            class="h-full flex flex-col overflow-hidden"
            :style="{
              width: browserStore.activeViewMode === 'split' ? browserStore.splitRatio + '%' : '100%',
              flexShrink: browserStore.activeViewMode === 'split' ? 0 : 1,
              transition: browserStore.isDraggingResizer ? 'none' : 'width 150ms ease'
            }"
          >
            <MonacoEditor />
          </div>

          <!-- Vertical Split Resizer Divider (split mode only) -->
          <div
            v-if="browserStore.activeViewMode === 'split'"
            @pointerdown="startSplitResize"
            class="w-1.5 h-full cursor-col-resize z-30 group hover:bg-nvidia active:bg-nvidia bg-border/60 transition-colors select-none relative shrink-0"
            title="Drag to resize Editor / Browser"
          >
            <div class="absolute inset-y-0 -left-1 -right-1 z-10" />
          </div>

          <!-- WebContentsView anchor -->
          <div
            v-show="browserStore.activeViewMode === 'split' || browserStore.activeViewMode === 'browser'"
            class="h-full relative overflow-hidden"
            :class="browserStore.activeViewMode === 'split' ? 'flex-1 min-w-0' : 'w-full'"
            :style="{
              transition: browserStore.isDraggingResizer ? 'none' : 'width 150ms ease'
            }"
          >
            <ViewportAnchor />
          </div>
        </div>

        <!-- Bottom Drawer (Terminal / API / Load / Memory) -->
        <DrawerContainer />
      </div>

      <!-- AI Copilot Sidebar -->
      <DevChatSidebar />
    </div>

    <!-- VS Code-style Status Bar -->
    <StatusBar />

    <!-- Modals -->
    <ApiKeySettingsModal />
  </div>
</template>

<style scoped>
.explorer-enter-active,
.explorer-leave-active {
  transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms ease;
  overflow: hidden;
}
.explorer-enter-from,
.explorer-leave-to {
  width: 0;
  opacity: 0;
}
.explorer-enter-to,
.explorer-leave-from {
  width: v-bind('browserStore.sidebarWidth + "px"');
  opacity: 1;
}
</style>
