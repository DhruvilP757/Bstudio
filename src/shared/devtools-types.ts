export interface DevToolsConsoleEntry {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info' | 'debug' | 'table' | string;
  message: string;
  timestamp: number;
  sourceUrl?: string;
  lineNumber?: number;
  stack?: string;
}

export interface DevToolsNetworkEntry {
  id: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  mimeType?: string;
  type: string;
  duration: number;
  size?: number;
  error?: string;
  timestamp: number;
}
