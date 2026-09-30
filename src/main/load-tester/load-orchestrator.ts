import { Worker } from 'worker_threads';
import * as path from 'path';
import { BrowserWindow } from 'electron';
import { LoadTestConfig, LoadTestProgress, LoadTestSummary } from '../../shared/telemetry-types';
import { IPC_CHANNELS } from '../../shared/ipc-channels';

export class LoadOrchestrator {
  private activeWorkers: Worker[] = [];
  private isRunning: boolean = false;
  private progressInterval: NodeJS.Timeout | null = null;

  constructor(private mainWindow: BrowserWindow) {}

  public startTest(config: LoadTestConfig): void {
    if (this.isRunning) {
      this.stopTest();
    }

    this.isRunning = true;
    const workerScript = path.join(__dirname, 'load-worker.js');
    const virtualUsers = Math.max(1, Math.min(config.virtualUsers || 10, 200));
    const durationSeconds = Math.max(1, Math.min(config.durationSeconds || 10, 60));
    const durationMs = durationSeconds * 1000;

    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    const latencies: number[] = [];
    const statusCodes: Record<number, number> = {};
    const failureReasons: Record<string, number> = {};

    let completedWorkers = 0;
    const startTime = Date.now();
    let lastRequestCount = 0;
    let lastProgressTime = startTime;

    // Stream progress every 500ms
    this.progressInterval = setInterval(() => {
      if (!this.isRunning) return;
      const now = Date.now();
      const elapsedSeconds = Math.max(0.5, (now - startTime) / 1000);
      const deltaRequests = totalRequests - lastRequestCount;
      const deltaTime = (now - lastProgressTime) / 1000;
      const currentRps = deltaTime > 0 ? Math.round(deltaRequests / deltaTime) : 0;
      lastRequestCount = totalRequests;
      lastProgressTime = now;

      // Compute current p95
      let currentP95Ms = 0;
      if (latencies.length > 0) {
        const sorted = [...latencies].sort((a, b) => a - b);
        const p95Idx = Math.floor(sorted.length * 0.95);
        currentP95Ms = sorted[p95Idx] || sorted[sorted.length - 1];
      }

      const progress: LoadTestProgress = {
        elapsedSeconds: Math.round(elapsedSeconds),
        currentRps,
        totalRequests,
        successfulRequests,
        failedRequests,
        currentP95Ms
      };

      if (!this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(IPC_CHANNELS.LOAD_PROGRESS_STREAM, progress);
      }
    }, 500);

    const checkCompletion = () => {
      if (completedWorkers >= virtualUsers && this.isRunning) {
        this.isRunning = false;
        if (this.progressInterval) clearInterval(this.progressInterval);

        const totalTimeSeconds = Math.max(1, (Date.now() - startTime) / 1000);
        latencies.sort((a, b) => a - b);

        const p50Idx = Math.floor(latencies.length * 0.5);
        const p90Idx = Math.floor(latencies.length * 0.9);
        const p95Idx = Math.floor(latencies.length * 0.95);
        const p99Idx = Math.floor(latencies.length * 0.99);

        const sum = latencies.reduce((acc, v) => acc + v, 0);
        const avgMs = latencies.length > 0 ? Math.round(sum / latencies.length) : 0;

        const summary: LoadTestSummary = {
          totalRequests,
          successRatePercentage: totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 0,
          requestsPerSecond: Math.round(totalRequests / totalTimeSeconds),
          latencies: {
            minMs: latencies[0] || 0,
            maxMs: latencies[latencies.length - 1] || 0,
            avgMs,
            p50Ms: latencies[p50Idx] || 0,
            p90Ms: latencies[p90Idx] || 0,
            p95Ms: latencies[p95Idx] || 0,
            p99Ms: latencies[p99Idx] || 0
          },
          statusCodeDistribution: statusCodes,
          failureReasons
        };

        if (!this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send(IPC_CHANNELS.LOAD_COMPLETE, summary);
        }
      }
    };

    // Spawn workers
    for (let i = 0; i < virtualUsers; i++) {
      try {
        const worker = new Worker(workerScript, {
          workerData: { config, durationMs }
        });

        worker.on('message', (msg: any) => {
          if (msg.type === 'RESULT') {
            const res = msg.data;
            totalRequests++;
            if (res.success) {
              successfulRequests++;
            } else {
              failedRequests++;
              if (res.error) {
                failureReasons[res.error] = (failureReasons[res.error] || 0) + 1;
              }
            }
            latencies.push(res.latencyMs);
            statusCodes[res.statusCode] = (statusCodes[res.statusCode] || 0) + 1;
          } else if (msg.type === 'DONE') {
            completedWorkers++;
            checkCompletion();
          }
        });

        worker.on('error', (err) => {
          console.error(`[LoadWorker ${i}] error:`, err);
          completedWorkers++;
          checkCompletion();
        });

        this.activeWorkers.push(worker);
      } catch (err) {
        console.error('[LoadOrchestrator] Worker creation error:', err);
        completedWorkers++;
        checkCompletion();
      }
    }
  }

  public stopTest(): void {
    this.isRunning = false;
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    for (const w of this.activeWorkers) {
      try {
        w.postMessage('STOP');
        w.terminate();
      } catch (e) {}
    }
    this.activeWorkers = [];
  }
}
