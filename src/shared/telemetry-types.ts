export type DiagnosticDomain = 
  | 'element' 
  | 'cdn-xml' 
  | 'console' 
  | 'network' 
  | 'load' 
  | 'memory' 
  | 'security';

export type DiagnosticSeverity = 'info' | 'warning' | 'critical';

export interface DiagnosticTelemetry {
  id: string;
  domain: DiagnosticDomain;
  severity: DiagnosticSeverity;
  timestamp: number;
  title: string;
  summary: string;
  technicalDetails: {
    url?: string;
    nodeId?: number;
    selector?: string;
    outerHtml?: string;
    stackTrace?: string;
    unresolvedSourceLine?: string;
    resolvedSourceFile?: string;
    resolvedSourceLine?: number;
    metrics?: Record<string, number | string>;
    headers?: Record<string, string>;
    rawPayload?: any;
  };
  suggestedAction?: {
    label: string;
    description: string;
    promptToCopilot: string;
  };
}

export interface LoadTestConfig {
  targetUrl: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  virtualUsers: number;    // Range: 1 to 200
  durationSeconds: number; // Range: 5 to 60
  timeoutMs: number;       // Default: 5000ms
}

export interface LoadTestProgress {
  elapsedSeconds: number;
  currentRps: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  currentP95Ms: number;
}

export interface LoadTestSummary {
  totalRequests: number;
  successRatePercentage: number;
  requestsPerSecond: number;
  latencies: {
    minMs: number;
    maxMs: number;
    avgMs: number;
    p50Ms: number;
    p90Ms: number;
    p95Ms: number;
    p99Ms: number;
  };
  statusCodeDistribution: Record<number, number>;
  failureReasons: Record<string, number>;
}
