import { defineStore } from 'pinia';
import { ChatMessage } from '../../../preload/types';
import { FilePatch, PatchResult } from '../../../shared/patch-types';
import { DiagnosticTelemetry } from '../../../shared/telemetry-types';
import { useDevToolsStore } from './devtools-store';
import { useBrowserStore } from './browser-store';
import { useFsStore } from './fs-store';

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages: [
      {
        role: 'assistant',
        content: '👋 Welcome to **Bstudio**! I am your AI Copilot.\n\nI can use **Google Gemini** or **NVIDIA Nemotron 3** to diagnose runtime errors, review code, and synthesize atomic patches.\n\nConfigure an API key in ⚙️ **Settings** to get started, or ask me anything — I\'ll do my best offline too!'
      }
    ] as ChatMessage[],
    isGenerating: false,
    selectedModel: 'gemini-2.0-flash' as string,
    selectedProvider: 'gemini' as 'nebius' | 'gemini',
    activeContextChips: [] as DiagnosticTelemetry[],
    appliedPatches: [] as Array<{ patch: FilePatch; result: PatchResult }>,
    lastRollbackStatus: null as string | null
  }),
  actions: {
    addContextChip(telemetry: DiagnosticTelemetry) {
      if (!this.activeContextChips.find((c) => c.id === telemetry.id)) {
        this.activeContextChips.push(telemetry);
      }
    },
    removeContextChip(id: string) {
      this.activeContextChips = this.activeContextChips.filter((c) => c.id !== id);
    },
    clearContextChips() {
      this.activeContextChips = [];
    },
    async sendMessage(prompt: string) {
      if (!prompt.trim() || this.isGenerating) return;

      const userMsg: ChatMessage = {
        role: 'user',
        content: prompt,
        telemetryContext: [...this.activeContextChips]
      };
      this.messages.push(userMsg);
      this.isGenerating = true;

      const telemetryToSend = [...this.activeContextChips];
      this.clearContextChips();

      // Collect live Chrome DevTools context so Gemini & Nemotron see all web runtime logs & network entries
      const devToolsStore = useDevToolsStore();
      const browserStore = useBrowserStore();
      const fsStore = useFsStore();

      const devtoolsContext = {
        url: browserStore.navigationState.url,
        title: browserStore.navigationState.title,
        activeFile: fsStore.activeFilePath,
        recentConsole: devToolsStore.consoleLogs.slice(-12).map((l) => ({
          type: l.type,
          message: l.message,
          source: l.sourceUrl
        })),
        recentNetwork: devToolsStore.networkEntries.slice(-10).map((n) => ({
          url: n.url,
          method: n.method,
          status: n.status,
          type: n.type,
          duration: n.duration
        }))
      };

      try {
        if (window.electronAPI) {
          const res = await window.electronAPI.sendCopilotMessage({
            prompt,
            history: this.messages.slice(-6),
            telemetryContext: telemetryToSend,
            devtoolsContext,
            model: this.selectedModel,
            provider: this.selectedProvider,
          });

          this.messages.push({
            role: 'assistant',
            content: res.reply,
            patch: res.patch
          });
        }
      } catch (err: any) {
        this.messages.push({
          role: 'assistant',
          content: `⚠️ Failed to receive inference response: ${err.message || err}`
        });
      } finally {
        this.isGenerating = false;
      }
    },
    async applyPatch(patch: FilePatch) {
      if (!window.electronAPI) return;
      const res = await window.electronAPI.applyFilePatch(patch);
      if (res.success) {
        this.appliedPatches.push({ patch, result: res });
      }
      return res;
    },
    async rollbackPatch(backupId: string) {
      if (!window.electronAPI) return;
      const success = await window.electronAPI.rollbackLastPatch(backupId);
      if (success) {
        this.appliedPatches = this.appliedPatches.filter((p) => p.result.backupId !== backupId);
      }
      return success;
    }
  }
});
