import { parentPort, workerData } from 'worker_threads';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

if (parentPort && workerData) {
  const { config, durationMs } = workerData;
  const targetUrl = new URL(config.targetUrl);
  const isHttps = targetUrl.protocol === 'https:';
  const client = isHttps ? https : http;

  const agent = new (isHttps ? https.Agent : http.Agent)({
    keepAlive: true,
    maxSockets: 50
  });

  const startTime = Date.now();
  let isRunning = true;

  parentPort.on('message', (msg) => {
    if (msg === 'STOP') {
      isRunning = false;
    }
  });

  const executeRequest = (): Promise<{ success: boolean; statusCode: number; latencyMs: number; error?: string }> => {
    return new Promise((resolve) => {
      const reqStart = Date.now();
      const options = {
        method: config.method || 'GET',
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        headers: config.headers || {},
        agent,
        timeout: config.timeoutMs || 5000
      };

      const req = client.request(options, (res) => {
        res.on('data', () => {}); // Consume stream
        res.on('end', () => {
          resolve({
            success: (res.statusCode || 0) < 400,
            statusCode: res.statusCode || 0,
            latencyMs: Date.now() - reqStart
          });
        });
      });

      req.on('error', (err) => {
        resolve({
          success: false,
          statusCode: 0,
          latencyMs: Date.now() - reqStart,
          error: err.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          statusCode: 408,
          latencyMs: Date.now() - reqStart,
          error: 'Request Timeout'
        });
      });

      if (config.body && (config.method === 'POST' || config.method === 'PUT')) {
        req.write(config.body);
      }
      req.end();
    });
  };

  const loop = async () => {
    while (isRunning && Date.now() - startTime < durationMs) {
      const result = await executeRequest();
      if (parentPort) {
        parentPort.postMessage({ type: 'RESULT', data: result });
      }
      // Minimal yield to keep event loop responsive
      await new Promise((r) => setImmediate(r));
    }
    if (parentPort) {
      parentPort.postMessage({ type: 'DONE' });
    }
  };

  loop();
}
