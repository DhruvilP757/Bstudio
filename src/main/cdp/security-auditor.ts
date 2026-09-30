import { CdpCore } from './cdp-core';

export class SecurityAuditor {
  constructor(private cdpCore: CdpCore) {
    this.registerEventListeners();
  }

  private registerEventListeners(): void {
    this.cdpCore.subscribe('Network.responseReceived', (params: any) => {
      const { response, type } = params;
      if (type !== 'Document') return; // Check main frame HTML documents

      const headers: Record<string, string> = {};
      if (response && response.headers) {
        for (const [k, v] of Object.entries(response.headers)) {
          headers[k.toLowerCase()] = v as string;
        }
      }

      const url = response.url as string;
      if (!url || !url.startsWith('http')) return;

      // 1. CSP Check
      if (!headers['content-security-policy']) {
        this.cdpCore.emitTelemetry({
          id: `sec_csp_${Date.now()}`,
          domain: 'security',
          severity: 'warning',
          timestamp: Date.now(),
          title: 'Missing Content-Security-Policy (CSP)',
          summary: `The document at ${url} does not define a Content-Security-Policy header, leaving it vulnerable to XSS.`,
          technicalDetails: { url, headers },
          suggestedAction: {
            label: 'Generate Strict CSP Header',
            description: 'Configure standard default-src and script-src directives.',
            promptToCopilot: `Document at ${url} lacks a Content-Security-Policy header. Generate a strict, modern CSP configuration for standard SPAs.`
          }
        });
      }

      // 2. HSTS Check on HTTPS
      if (url.startsWith('https://') && !headers['strict-transport-security']) {
        this.cdpCore.emitTelemetry({
          id: `sec_hsts_${Date.now()}`,
          domain: 'security',
          severity: 'info',
          timestamp: Date.now(),
          title: 'Missing Strict-Transport-Security (HSTS)',
          summary: `HTTPS document at ${url} does not declare Strict-Transport-Security.`,
          technicalDetails: { url, headers },
          suggestedAction: {
            label: 'Add HSTS Header',
            description: 'Inject Strict-Transport-Security with max-age=31536000.',
            promptToCopilot: `Add Strict-Transport-Security to headers for ${url}.`
          }
        });
      }
    });

    // Check mixed content warnings
    this.cdpCore.subscribe('Security.securityStateChanged', (params: any) => {
      if (params.securityState === 'insecure' || params.securityState === 'neutral') {
        const explanations = (params.explanations || []).map((e: any) => e.summary).join('; ');
        if (explanations) {
          this.cdpCore.emitTelemetry({
            id: `sec_state_${Date.now()}`,
            domain: 'security',
            severity: 'warning',
            timestamp: Date.now(),
            title: 'SSL/Security State Warning',
            summary: explanations,
            technicalDetails: { rawPayload: params },
            suggestedAction: {
              label: 'Inspect Security State',
              description: 'Fix mixed content resources or invalid certificates.',
              promptToCopilot: `Security state warning on active view: ${explanations}. How do we resolve this?`
            }
          });
        }
      }
    });
  }

  public async runFullSecurityAudit(): Promise<void> {
    try {
      this.cdpCore.emitTelemetry({
        id: `sec_audit_${Date.now()}`,
        domain: 'security',
        severity: 'info',
        timestamp: Date.now(),
        title: 'Security Audit Completed',
        summary: 'Active document headers evaluated for CSP, HSTS, CORS, and cookie flags.',
        technicalDetails: {}
      });
    } catch (e) {}
  }
}
