export interface TerminalSessionState {
  id: string;
  name: string;
  cols: number;
  rows: number;
  isActive: boolean;
}

export interface TerminalResizePayload {
  sessionId: string;
  cols: number;
  rows: number;
}
