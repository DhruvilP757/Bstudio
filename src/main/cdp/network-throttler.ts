import { CdpCore } from './cdp-core';
import { NetworkProfile } from '../../shared/cdp-types';

export class NetworkThrottler {
  constructor(private cdpCore: CdpCore) {
    this.registerEventListeners();
  }

  private registerEventListeners(): void {
    this.cdpCore.subscribe('Network.loadingFinished', (params: any) => {
      const { encodedDataLength } = params;
      // Flag assets larger than 1MB
      if (encodedDataLength && encodedDataLength > 1024 * 1024) {
        const sizeMb = (encodedDataLength / (1024 * 1024)).toFixed(2);
        this.cdpCore.emitTelemetry({
          id: `net_monolithic_${Date.now()}`,
          domain: 'network',
          severity: 'critical',
          timestamp: Date.now(),
          title: 'Monolithic JavaScript/Asset Bundle Detected',
          summary: `Single downloaded asset exceeds threshold: ${sizeMb} MB.`,
          technicalDetails: {
            metrics: { sizeBytes: encodedDataLength, sizeMb }
          },
          suggestedAction: {
            label: 'Code Splitting / Dynamic Import',
            description: 'Split monolithic bundle using dynamic imports or route-based chunks.',
            promptToCopilot: `An asset with size ${sizeMb} MB was loaded in a single request. How should we split this bundle using Vite/Rollup code-splitting?`
          }
        });
      }
    });
  }

  public async setNetworkConditions(profile: NetworkProfile): Promise<void> {
    let offline = false;
    let latency = 0;
    let downloadThroughput = -1;
    let uploadThroughput = -1;

    switch (profile) {
      case 'offline':
        offline = true;
        break;
      case 'slow-3g':
        latency = 400; // 400ms RTT
        downloadThroughput = (400 * 1024) / 8; // 400 kbps
        uploadThroughput = (400 * 1024) / 8;
        break;
      case 'fast-3g':
        latency = 150; // 150ms RTT
        downloadThroughput = (1.6 * 1024 * 1024) / 8; // 1.6 Mbps
        uploadThroughput = (750 * 1024) / 8;
        break;
      case 'online':
      default:
        // No throttling
        break;
    }

    try {
      await this.cdpCore.sendCommand('Network.emulateNetworkConditions', {
        offline,
        latency,
        downloadThroughput,
        uploadThroughput,
        connectionType: profile === 'slow-3g' || profile === 'fast-3g' ? 'cellular3g' : 'none'
      });
    } catch (err) {
      console.warn('[NetworkThrottler] Failed setting network profile:', err);
    }
  }
}
