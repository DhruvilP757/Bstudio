import { defineStore } from 'pinia';
import { LoadTestConfig, LoadTestProgress, LoadTestSummary } from '../../../shared/telemetry-types';

export const useLoadTesterStore = defineStore('loadTester', {
  state: () => ({
    config: {
      targetUrl: 'http://localhost:3000/api/data',
      method: 'GET',
      virtualUsers: 25,
      durationSeconds: 10,
      timeoutMs: 5000
    } as LoadTestConfig,
    isRunning: false,
    progress: null as LoadTestProgress | null,
    summary: null as LoadTestSummary | null,
    rpsHistory: [] as number[],
    p95History: [] as number[]
  }),
  actions: {
    startTest() {
      if (this.isRunning || !window.electronAPI) return;
      this.isRunning = true;
      this.summary = null;
      this.rpsHistory = [];
      this.p95History = [];
      window.electronAPI.startLoadTest(this.config);
    },
    stopTest() {
      if (!this.isRunning || !window.electronAPI) return;
      window.electronAPI.stopLoadTest();
      this.isRunning = false;
    },
    updateProgress(progress: LoadTestProgress) {
      this.progress = progress;
      this.rpsHistory.push(progress.currentRps);
      this.p95History.push(progress.currentP95Ms);
      if (this.rpsHistory.length > 30) this.rpsHistory.shift();
      if (this.p95History.length > 30) this.p95History.shift();
    },
    setSummary(summary: LoadTestSummary) {
      this.summary = summary;
      this.isRunning = false;
    }
  }
});
