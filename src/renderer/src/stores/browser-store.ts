import { defineStore } from 'pinia';
import { NavigationState } from '../../../preload/types';
import { NetworkProfile, DevicePreset } from '../../../shared/cdp-types';

export const useBrowserStore = defineStore('browser', {
  state: () => ({
    url: 'https://nvidia.com',
    inputUrl: 'https://nvidia.com',
    title: 'NVIDIA Official Site',
    canGoBack: false,
    canGoForward: false,
    isLoading: false,
    sslSecure: true,
    currentDevice: 'desktop' as DevicePreset,
    networkProfile: 'online' as NetworkProfile,
    isInspectMode: false,
    activeViewMode: 'editor' as 'split' | 'editor' | 'browser',
    isCopilotOpen: true,
    isDrawerOpen: true,
    activeDrawerTab: 'terminal' as 'terminal' | 'api' | 'load' | 'memory' | 'console' | 'network',
    isApiKeyModalOpen: false,
    isDiffModalOpen: false,

    // Resizable Layout Dimensions & Dragging State
    sidebarWidth: Number(localStorage.getItem('bstudio_sidebar_width')) || 240,
    copilotWidth: Number(localStorage.getItem('bstudio_copilot_width')) || 340,
    drawerHeight: Number(localStorage.getItem('bstudio_drawer_height')) || 260,
    splitRatio: Number(localStorage.getItem('bstudio_split_ratio')) || 50,
    isDraggingResizer: false,
    resizerCursor: 'col-resize' as 'col-resize' | 'row-resize',
  }),
  actions: {
    updateNavState(state: NavigationState) {
      if (state.url && state.url !== 'about:blank') {
        this.url = state.url;
        this.inputUrl = state.url;
      }
      this.title = state.title || state.url;
      this.canGoBack = state.canGoBack;
      this.canGoForward = state.canGoForward;
      this.isLoading = state.isLoading;
      this.sslSecure = state.sslSecure;
    },
    async navigate(target?: string) {
      const dest = (target || this.inputUrl || '').trim();
      if (!dest) return;
      this.url = dest;
      this.inputUrl = dest;
      if (window.electronAPI) {
        await window.electronAPI.navigate(dest);
      }
    },
    async goBack() {
      if (window.electronAPI) await window.electronAPI.goBack();
    },
    async goForward() {
      if (window.electronAPI) await window.electronAPI.goForward();
    },
    async reload() {
      if (window.electronAPI) await window.electronAPI.reload();
    },
    async stopLoading() {
      if (window.electronAPI) await window.electronAPI.stopLoading();
    },
    async setDevice(device: DevicePreset) {
      this.currentDevice = device;
      if (window.electronAPI) {
        await window.electronAPI.setDeviceEmulation(device);
      }
    },
    async setNetwork(profile: NetworkProfile) {
      this.networkProfile = profile;
      if (window.electronAPI) {
        await window.electronAPI.setNetworkThrottling(profile);
      }
    },
    async toggleInspectMode() {
      this.isInspectMode = !this.isInspectMode;
      if (window.electronAPI) {
        await window.electronAPI.toggleElementInspectMode(this.isInspectMode);
      }
    },
    toggleDrawer(tab?: 'terminal' | 'api' | 'load' | 'memory' | 'console' | 'network') {
      if (tab) {
        if (this.isDrawerOpen && this.activeDrawerTab === tab) {
          this.isDrawerOpen = false;
        } else {
          this.activeDrawerTab = tab;
          this.isDrawerOpen = true;
        }
      } else {
        this.isDrawerOpen = !this.isDrawerOpen;
      }
    },
    openDrawer(tab: 'terminal' | 'api' | 'load' | 'memory' | 'console' | 'network' = 'terminal') {
      this.activeDrawerTab = tab;
      this.isDrawerOpen = true;
    },
    setSidebarWidth(width: number) {
      const clamped = Math.max(160, Math.min(500, Math.round(width)));
      this.sidebarWidth = clamped;
      try {
        localStorage.setItem('bstudio_sidebar_width', String(clamped));
      } catch {}
    },
    setCopilotWidth(width: number) {
      const clamped = Math.max(240, Math.min(650, Math.round(width)));
      this.copilotWidth = clamped;
      try {
        localStorage.setItem('bstudio_copilot_width', String(clamped));
      } catch {}
    },
    setDrawerHeight(height: number) {
      const clamped = Math.max(120, Math.min(650, Math.round(height)));
      this.drawerHeight = clamped;
      try {
        localStorage.setItem('bstudio_drawer_height', String(clamped));
      } catch {}
    },
    setSplitRatio(ratio: number) {
      const clamped = Math.max(15, Math.min(85, Math.round(ratio)));
      this.splitRatio = clamped;
      try {
        localStorage.setItem('bstudio_split_ratio', String(clamped));
      } catch {}
    },
    setDraggingResizer(isDragging: boolean, cursor: 'col-resize' | 'row-resize' = 'col-resize') {
      this.isDraggingResizer = isDragging;
      this.resizerCursor = cursor;
    },
    resetLayout() {
      this.sidebarWidth = 240;
      this.copilotWidth = 340;
      this.drawerHeight = 260;
      this.splitRatio = 50;
      try {
        localStorage.removeItem('bstudio_sidebar_width');
        localStorage.removeItem('bstudio_copilot_width');
        localStorage.removeItem('bstudio_drawer_height');
        localStorage.removeItem('bstudio_split_ratio');
      } catch {}
    }
  }
});
