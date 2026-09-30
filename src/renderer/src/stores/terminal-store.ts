import { defineStore } from 'pinia';

export const useTerminalStore = defineStore('terminal', {
  state: () => ({
    sessions: [
      { id: 'term-main', name: 'Terminal 1', isActive: true }
    ],
    activeSessionId: 'term-main'
  }),
  actions: {
    addSession() {
      const id = `term-${Date.now()}`;
      const name = `Terminal ${this.sessions.length + 1}`;
      this.sessions.push({ id, name, isActive: true });
      this.activeSessionId = id;
    },
    removeSession(id: string) {
      if (this.sessions.length <= 1) return; // Keep at least one
      this.sessions = this.sessions.filter((s) => s.id !== id);
      if (this.activeSessionId === id) {
        this.activeSessionId = this.sessions[0].id;
      }
      if (window.electronAPI) {
        window.electronAPI.destroyTerminalSession(id);
      }
    },
    setActiveSession(id: string) {
      this.activeSessionId = id;
    }
  }
});
