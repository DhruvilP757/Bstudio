import * as crypto from 'crypto';
import { CdpCore } from './cdp-core';

export class CdnXmlSentinel {
  private knownCdnHosts = new Set([
    'cdnjs.cloudflare.com',
    'unpkg.com',
    'cdn.jsdelivr.net',
    'cdn.skypack.dev',
    'esm.sh',
    'code.jquery.com',
    'stackpath.bootstrapcdn.com'
  ]);

  constructor(private cdpCore: CdpCore) {
    this.registerEventListeners();
  }

  private registerEventListeners(): void {
    this.cdpCore.subscribe('Network.responseReceived', async (params: any) => {
      const { response } = params;
      const url = response?.url as string;
      if (!url || !url.startsWith('http')) return;

      try {
        const parsedUrl = new URL(url);
        if (this.knownCdnHosts.has(parsedUrl.hostname)) {
          await this.auditCdnResource(params.requestId, url, response);
        }

        const mimeType = (response.mimeType || '').toLowerCase();
        if (mimeType.includes('xml') || mimeType.includes('svg')) {
          await this.auditXmlPayload(params.requestId, url, mimeType);
        }
      } catch (err) {}
    });
  }

  private async auditCdnResource(requestId: string, url: string, response: any): Promise<void> {
    if (response.status >= 400) {
      this.cdpCore.emitTelemetry({
        id: `cdn_fail_${Date.now()}`,
        domain: 'cdn-xml',
        severity: 'critical',
        timestamp: Date.now(),
        title: 'CDN Dependency Resolution Failure',
        summary: `External CDN asset returned HTTP ${response.status}: ${url}`,
        technicalDetails: { url, metrics: { status: response.status } },
        suggestedAction: {
          label: 'Switch CDN Mirror',
          description: 'Replace broken CDN link with an active mirror or npm package.',
          promptToCopilot: `CDN asset ${url} failed with HTTP ${response.status}. Suggest an alternative active CDN link or package.`
        }
      });
      return;
    }

    // Verify Subresource Integrity (SRI)
    try {
      const script = `
        (() => {
          const tags = [...document.querySelectorAll('script[src], link[href]')];
          const matched = tags.find(t => (t.src === '${url}' || t.href === '${url}'));
          if (!matched) return null;
          return { tagName: matched.tagName, integrity: matched.getAttribute('integrity') };
        })()
      `;

      const result: any = await this.cdpCore.sendCommand('Runtime.evaluate', {
        expression: script,
        returnByValue: true
      });

      const tagData = result?.result?.value;
      if (tagData && !tagData.integrity) {
        let expectedSriHash = '';
        try {
          const bodyResult: any = await this.cdpCore.sendCommand('Network.getResponseBody', { requestId });
          const rawContent = bodyResult.base64Encoded
            ? Buffer.from(bodyResult.body, 'base64')
            : Buffer.from(bodyResult.body, 'utf8');

          const hash = crypto.createHash('sha384').update(rawContent).digest('base64');
          expectedSriHash = `sha384-${hash}`;
        } catch (e) {}

        this.cdpCore.emitTelemetry({
          id: `cdn_sri_missing_${Date.now()}`,
          domain: 'cdn-xml',
          severity: 'warning',
          timestamp: Date.now(),
          title: 'Missing Subresource Integrity (SRI)',
          summary: `CDN resource loaded without cryptographic checksum: ${url}`,
          technicalDetails: {
            url,
            rawPayload: { tagName: tagData.tagName, computedHash: expectedSriHash }
          },
          suggestedAction: {
            label: 'Inject SRI Hash',
            description: 'Apply the computed SHA-384 hash and crossorigin="anonymous" to the import tag.',
            promptToCopilot: `The asset from ${url} lacks Subresource Integrity. Add integrity="${expectedSriHash}" and crossorigin="anonymous" to the tag.`
          }
        });
      }
    } catch (err) {}
  }

  private async auditXmlPayload(requestId: string, url: string, mimeType: string): Promise<void> {
    try {
      const bodyResult: any = await this.cdpCore.sendCommand('Network.getResponseBody', { requestId });
      const content = bodyResult.base64Encoded
        ? Buffer.from(bodyResult.body, 'base64').toString('utf8')
        : bodyResult.body;

      const validationScript = `
        (() => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(${JSON.stringify(content)}, "${mimeType.includes('svg') ? 'image/svg+xml' : 'application/xml'}");
          const parserError = doc.querySelector('parsererror');
          return parserError ? parserError.innerText : null;
        })()
      `;

      const evalResult: any = await this.cdpCore.sendCommand('Runtime.evaluate', {
        expression: validationScript,
        returnByValue: true
      });

      const parseError = evalResult?.result?.value;
      if (parseError) {
        this.cdpCore.emitTelemetry({
          id: `xml_malformed_${Date.now()}`,
          domain: 'cdn-xml',
          severity: 'critical',
          timestamp: Date.now(),
          title: 'Malformed XML/SVG Resource',
          summary: `XML parser reported syntax errors in ${url}`,
          technicalDetails: { url, rawPayload: { error: parseError } },
          suggestedAction: {
            label: 'Repair XML Syntax',
            description: 'Fix unclosed tags or invalid entities in XML/SVG.',
            promptToCopilot: `The resource ${url} has an XML syntax error: ${parseError}. Propose a corrected version.`
          }
        });
      }
    } catch (err) {}
  }
}
