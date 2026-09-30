import { ipcMain } from 'electron';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { LoadOrchestrator } from '../load-tester/load-orchestrator';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { ApiRequest, ApiResponse } from '../../shared/api-tester-types';

export function registerLoadIpc(loadOrchestrator: LoadOrchestrator): void {
  ipcMain.handle(IPC_CHANNELS.LOAD_START_TEST, async (_, config) => {
    loadOrchestrator.startTest(config);
  });

  ipcMain.handle(IPC_CHANNELS.LOAD_STOP_TEST, async () => {
    loadOrchestrator.stopTest();
  });

  ipcMain.handle(IPC_CHANNELS.API_EXECUTE_REQUEST, async (_, req: ApiRequest): Promise<ApiResponse> => {
    const startTime = Date.now();
    return new Promise((resolve) => {
      try {
        const parsedUrl = new URL(req.url);
        const isHttps = parsedUrl.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
          method: req.method || 'GET',
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          headers: req.headers || {},
          timeout: req.timeoutMs || 10000
        };

        const httpRequest = client.request(options, (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(Buffer.from(c)));
          res.on('end', () => {
            const bodyBuf = Buffer.concat(chunks);
            const headersMap: Record<string, string> = {};
            for (const [k, v] of Object.entries(res.headers)) {
              headersMap[k] = Array.isArray(v) ? v.join(', ') : (v || '');
            }

            resolve({
              status: res.statusCode || 0,
              statusText: res.statusMessage || '',
              headers: headersMap,
              data: bodyBuf.toString('utf8'),
              timeMs: Date.now() - startTime,
              sizeBytes: bodyBuf.length,
              timestamp: Date.now()
            });
          });
        });

        httpRequest.on('error', (err) => {
          resolve({
            status: 0,
            statusText: err.message,
            headers: {},
            data: err.stack || err.message,
            timeMs: Date.now() - startTime,
            sizeBytes: 0,
            timestamp: Date.now()
          });
        });

        httpRequest.on('timeout', () => {
          httpRequest.destroy();
          resolve({
            status: 408,
            statusText: 'Request Timeout',
            headers: {},
            data: 'Request timed out after ' + (req.timeoutMs || 10000) + 'ms',
            timeMs: Date.now() - startTime,
            sizeBytes: 0,
            timestamp: Date.now()
          });
        });

        if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
          httpRequest.write(req.body);
        }
        httpRequest.end();
      } catch (err: any) {
        resolve({
          status: 0,
          statusText: err.message || 'Malformed Request',
          headers: {},
          data: err.message,
          timeMs: Date.now() - startTime,
          sizeBytes: 0,
          timestamp: Date.now()
        });
      }
    });
  });
}
