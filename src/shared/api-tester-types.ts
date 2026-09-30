export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface ApiHeader {
  key: string;
  value: string;
  enabled: boolean;
}

export interface ApiRequest {
  id?: string;
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body?: string;
  bodyType?: 'none' | 'json' | 'text' | 'form-data';
  timeoutMs?: number;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: string;
  timeMs: number;
  sizeBytes: number;
  timestamp: number;
}
