import { defineStore } from 'pinia';
import { DevToolsConsoleEntry, DevToolsNetworkEntry } from '../../../shared/devtools-types';

export const useDevToolsStore = defineStore('devtools', {
  state: () => ({
    consoleLogs: [] as DevToolsConsoleEntry[],
    networkEntries: [] as DevToolsNetworkEntry[],
    activeConsoleFilter: 'all' as 'all' | 'error' | 'warn' | 'info' | 'log',
    consoleSearch: '',
    activeNetworkFilter: 'all' as string,
    networkSearch: '',
    isInitialized: false,
    selectedNetworkEntry: null as DevToolsNetworkEntry | null,
    selectedConsoleEntry: null as DevToolsConsoleEntry | null,
  }),

  getters: {
    filteredLogs: (state): DevToolsConsoleEntry[] => {
      let logs = state.consoleLogs;
      if (state.activeConsoleFilter !== 'all') {
        logs = logs.filter((l) => l.type === state.activeConsoleFilter);
      }
      if (state.consoleSearch.trim()) {
        const query = state.consoleSearch.toLowerCase();
        logs = logs.filter(
          (l) =>
            l.message.toLowerCase().includes(query) ||
            (l.sourceUrl && l.sourceUrl.toLowerCase().includes(query))
        );
      }
      return logs;
    },

    filteredNetwork: (state): DevToolsNetworkEntry[] => {
      let entries = state.networkEntries;
      if (state.activeNetworkFilter !== 'all') {
        const filter = state.activeNetworkFilter.toLowerCase();
        if (filter === 'failed') {
          entries = entries.filter((e) => e.status >= 400 || e.status === 0 || !!e.error);
        } else if (filter === 'xhr/fetch') {
          entries = entries.filter((e) =>
            ['xhr', 'fetch', 'websocket'].includes(e.type.toLowerCase())
          );
        } else if (filter === 'js') {
          entries = entries.filter((e) =>
            ['script', 'javascript'].includes(e.type.toLowerCase()) || e.url.endsWith('.js')
          );
        } else if (filter === 'css') {
          entries = entries.filter((e) =>
            ['stylesheet', 'css'].includes(e.type.toLowerCase()) || e.url.endsWith('.css')
          );
        } else if (filter === 'img') {
          entries = entries.filter((e) =>
            ['image', 'img'].includes(e.type.toLowerCase()) || /\.(png|jpe?g|gif|svg|webp)$/i.test(e.url)
          );
        } else if (filter === 'doc') {
          entries = entries.filter((e) =>
            ['document', 'doc'].includes(e.type.toLowerCase())
          );
        }
      }
      if (state.networkSearch.trim()) {
        const query = state.networkSearch.toLowerCase();
        entries = entries.filter((e) => e.url.toLowerCase().includes(query));
      }
      return entries;
    },

    errorCount: (state): number =>
      state.consoleLogs.filter((l) => l.type === 'error').length,

    warnCount: (state): number =>
      state.consoleLogs.filter((l) => l.type === 'warn' || l.type === 'warning').length,

    networkFailedCount: (state): number =>
      state.networkEntries.filter((e) => e.status >= 400 || e.status === 0 || !!e.error).length,
  },

  actions: {
    initListeners() {
      if (this.isInitialized || !window.electronAPI) return;
      this.isInitialized = true;

      // Subscribe to live CDP Console output
      if (window.electronAPI.onConsoleOutput) {
        window.electronAPI.onConsoleOutput((entry: DevToolsConsoleEntry) => {
          this.consoleLogs.push(entry);
          if (this.consoleLogs.length > 1000) {
            this.consoleLogs.shift();
          }
        });
      }

      // Subscribe to live CDP Network entry stream
      if (window.electronAPI.onNetworkEntry) {
        window.electronAPI.onNetworkEntry((entry: DevToolsNetworkEntry) => {
          // Update existing or add new
          const idx = this.networkEntries.findIndex((e) => e.id === entry.id);
          if (idx !== -1) {
            this.networkEntries[idx] = { ...this.networkEntries[idx], ...entry };
          } else {
            this.networkEntries.push(entry);
            if (this.networkEntries.length > 800) {
              this.networkEntries.shift();
            }
          }
        });
      }
    },

    clearConsole() {
      this.consoleLogs = [];
      this.selectedConsoleEntry = null;
    },

    clearNetwork() {
      this.networkEntries = [];
      this.selectedNetworkEntry = null;
    },

    async openNativeDevTools() {
      if (window.electronAPI?.toggleDevTools) {
        await window.electronAPI.toggleDevTools();
      }
    }
  }
});
