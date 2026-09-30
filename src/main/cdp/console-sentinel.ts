import * as fs from 'fs';
import * as path from 'path';
import { CdpCore } from './cdp-core';

let sourceMap: any = null;
try {
  sourceMap = require('source-map-js');
} catch (e) {}

export class ConsoleSentinel {
  constructor(private cdpCore: CdpCore, private projectRoot: string) {
    this.registerEventListeners();
  }

  public setProjectRoot(root: string): void {
    this.projectRoot = root;
  }

  private registerEventListeners(): void {
    // Intercept uncaught runtime exceptions
    this.cdpCore.subscribe('Runtime.exceptionThrown', async (params: any) => {
      const details = params?.exceptionDetails;
      if (!details) return;

      const text = details.text || '';
      const exceptionDesc = details.exception?.description || text;
      const stack = exceptionDesc || details.stackTrace?.callFrames?.[0]?.url || '';

      const isHydrationMismatch = exceptionDesc.toLowerCase().includes('hydration') ||
        exceptionDesc.toLowerCase().includes('mismatch') ||
        exceptionDesc.toLowerCase().includes('did not match');

      const resolved = await this.resolveSourceLocation(details.stackTrace);

      // Emit to DevTools Console output stream
      this.cdpCore.emitConsoleOutput({
        id: `exc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type: 'error',
        message: exceptionDesc,
        timestamp: Date.now(),
        sourceUrl: details.url || resolved?.file,
        lineNumber: details.lineNumber !== undefined ? details.lineNumber + 1 : resolved?.line,
        stack
      });

      this.cdpCore.emitTelemetry({
        id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        domain: 'console',
        severity: 'critical',
        timestamp: Date.now(),
        title: isHydrationMismatch ? 'Framework SSR Hydration Mismatch' : 'Uncaught Runtime Exception',
        summary: exceptionDesc.split('\n')[0].substring(0, 300),
        technicalDetails: {
          stackTrace: stack,
          unresolvedSourceLine: details.url ? `${details.url}:${details.lineNumber}:${details.columnNumber}` : undefined,
          resolvedSourceFile: resolved?.file,
          resolvedSourceLine: resolved?.line
        },
        suggestedAction: {
          label: isHydrationMismatch ? 'Fix Hydration Boundary' : 'Fix Runtime Bug with Nemotron',
          description: resolved?.file
            ? `Remediate line ${resolved.line} in ${resolved.file}`
            : 'Analyze exception stack trace and synthesize fix',
          promptToCopilot: `Runtime error encountered: "${exceptionDesc}". Located at ${resolved?.file || details.url}:${resolved?.line || details.lineNumber}. Please suggest an atomic patch to resolve this.`
        }
      });
    });

    // Intercept all console calls (log, warn, error, info, debug, table, etc.)
    this.cdpCore.subscribe('Runtime.consoleAPICalled', async (params: any) => {
      const type = params.type || 'log';
      const messageArgs = (params.args || [])
        .map((a: any) => {
          if (a.value !== undefined) {
            return typeof a.value === 'object' ? JSON.stringify(a.value) : String(a.value);
          }
          return a.description || '';
        })
        .join(' ');

      const frame = params.stackTrace?.callFrames?.[0];
      const sourceUrl = frame?.url || '';
      const lineNumber = frame?.lineNumber !== undefined ? frame.lineNumber + 1 : undefined;

      // Broadcast console message to DevTools console panel
      this.cdpCore.emitConsoleOutput({
        id: `con_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type,
        message: messageArgs || `(${type})`,
        timestamp: Date.now(),
        sourceUrl,
        lineNumber
      });

      if (type === 'error' && messageArgs) {
        this.cdpCore.emitTelemetry({
          id: `console_err_${Date.now()}`,
          domain: 'console',
          severity: 'warning',
          timestamp: Date.now(),
          title: 'Console Error Emitted',
          summary: messageArgs.substring(0, 300),
          technicalDetails: {
            rawPayload: params.args
          },
          suggestedAction: {
            label: 'Inspect Console Warning',
            description: 'Evaluate error call and prevent unwanted logging or failure.',
            promptToCopilot: `The application emitted a console.error: "${messageArgs}". How can this be resolved?`
          }
        });
      }
    });
  }

  private async resolveSourceLocation(stackTrace: any): Promise<{ file: string; line: number } | null> {
    if (!stackTrace || !stackTrace.callFrames || stackTrace.callFrames.length === 0) {
      return null;
    }

    const frame = stackTrace.callFrames[0];
    const scriptUrl = frame.url as string;
    const lineNumber = (frame.lineNumber || 0) + 1;
    const columnNumber = frame.columnNumber || 0;

    if (!scriptUrl || scriptUrl.startsWith('chrome-extension:') || scriptUrl.includes('node_modules')) {
      return null;
    }

    // Try finding local map file
    try {
      const parsedUrl = new URL(scriptUrl);
      const relativePath = parsedUrl.pathname.replace(/^\//, '');
      const potentialMapPath = path.join(this.projectRoot, 'dist', relativePath + '.map');

      if (fs.existsSync(potentialMapPath) && sourceMap) {
        const rawMap = JSON.parse(fs.readFileSync(potentialMapPath, 'utf8'));
        const consumer = new sourceMap.SourceMapConsumer(rawMap);
        const original = consumer.originalPositionFor({
          line: lineNumber,
          column: columnNumber
        });

        if (original && original.source) {
          return {
            file: original.source,
            line: original.line || lineNumber
          };
        }
      }
    } catch (e) {}

    return {
      file: scriptUrl,
      line: lineNumber
    };
  }
}
