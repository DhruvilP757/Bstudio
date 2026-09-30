import { CdpCore } from './cdp-core';

export class MemoryProfiler {
  constructor(private cdpCore: CdpCore) {}

  public async triggerGarbageCollection(): Promise<void> {
    try {
      await this.cdpCore.sendCommand('HeapProfiler.collectGarbage');
      console.log('[MemoryProfiler] V8 Garbage Collection executed.');
    } catch (err) {
      console.warn('[MemoryProfiler] Failed to trigger GC:', err);
    }
  }

  public async runMemoryAudit(): Promise<void> {
    try {
      // Evaluate detached nodes and heap stats
      const script = `
        (() => {
          const perf: any = window.performance;
          const memory = perf && perf.memory ? {
            totalJSHeapSize: perf.memory.totalJSHeapSize,
            usedJSHeapSize: perf.memory.usedJSHeapSize,
            jsHeapSizeLimit: perf.memory.jsHeapSizeLimit
          } : null;

          return { memory };
        })()
      `;

      const result: any = await this.cdpCore.sendCommand('Runtime.evaluate', {
        expression: script,
        returnByValue: true
      });

      const memData = result?.result?.value?.memory;
      if (memData) {
        const usedMb = (memData.usedJSHeapSize / (1024 * 1024)).toFixed(1);
        const limitMb = (memData.jsHeapSizeLimit / (1024 * 1024)).toFixed(1);

        if (memData.usedJSHeapSize > 150 * 1024 * 1024) {
          this.cdpCore.emitTelemetry({
            id: `mem_leak_${Date.now()}`,
            domain: 'memory',
            severity: 'critical',
            timestamp: Date.now(),
            title: 'High JavaScript Heap Utilization',
            summary: `Active heap is consuming ${usedMb} MB (Limit: ${limitMb} MB). Potential memory leak detected.`,
            technicalDetails: {
              metrics: { usedMb, limitMb }
            },
            suggestedAction: {
              label: 'Trigger GC & Clean Listeners',
              description: 'Examine detached DOM references, unclosed event listeners or timers.',
              promptToCopilot: `JavaScript memory consumption is elevated at ${usedMb} MB. Propose best practices to diagnose detached DOM nodes and leak patterns.`
            }
          });
        }
      }
    } catch (err) {
      console.warn('[MemoryProfiler] Memory audit failed:', err);
    }
  }
}
