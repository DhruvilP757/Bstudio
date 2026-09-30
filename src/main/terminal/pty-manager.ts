import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';

let pty: any = null;
try {
  pty = require('node-pty');
} catch (e) {
  // node-pty optional, seamless child_process shell fallback will be used
}

interface TerminalSession {
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  kill: () => void;
}

export class PtyManager {
  private sessions: Map<string, TerminalSession> = new Map();

  constructor(private mainWindow: BrowserWindow) {}

  public createSession(sessionId: string, cols: number = 80, rows: number = 24, cwd?: string): void {
    if (this.sessions.has(sessionId)) {
      this.destroySession(sessionId);
    }

    const workingDir = cwd || process.env.WORKSPACE_ROOT || process.cwd();

    // 1. Try node-pty if native module is present
    if (pty) {
      try {
        const isWin = os.platform() === 'win32';
        const defaultShell = isWin
          ? (process.env.SHELL || 'powershell.exe')
          : (process.env.SHELL || '/bin/bash');

        const spawnOptions: any = {
          name: 'xterm-256color',
          cols: cols || 80,
          rows: rows || 24,
          cwd: workingDir,
          env: process.env as Record<string, string>
        };

        if (isWin) {
          spawnOptions.useConpty = false;
        }

        console.log(`[PtyManager] Spawning ${defaultShell} via node-pty (useConpty: ${!isWin}) in ${workingDir}`);
        const ptyProcess = pty.spawn(defaultShell, [], spawnOptions);

        ptyProcess.onData((data: string) => {
          if (!this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(IPC_CHANNELS.PTY_DATA_STREAM, { sessionId, data });
          }
        });

        ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
          this.sessions.delete(sessionId);
          if (!this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(IPC_CHANNELS.PTY_DATA_STREAM, {
              sessionId,
              data: `\r\n[Process completed with exit code ${exitCode}]\r\n`
            });
          }
        });

        const session: TerminalSession = {
          write: (data: string) => {
            try {
              ptyProcess.write(data);
            } catch (err) {
              console.warn('[PtyManager] node-pty write error:', err);
            }
          },
          resize: (c: number, r: number) => {
            try {
              ptyProcess.resize(Math.max(10, c), Math.max(5, r));
            } catch (err) {}
          },
          kill: () => {
            try {
              ptyProcess.kill();
            } catch (err) {}
          }
        };

        this.sessions.set(sessionId, session);
        return;
      } catch (err) {
        console.warn('[PtyManager] node-pty failed to spawn, falling back to native shell:', err);
      }
    }

    // 2. Real System Child Process Shell Fallback (Zero Native Compilation Required)
    const isWin = os.platform() === 'win32';
    const shellExe = isWin ? (process.env.COMSPEC || 'powershell.exe') : (process.env.SHELL || '/bin/bash');
    const shellArgs = isWin && shellExe.toLowerCase().includes('powershell')
      ? ['-NoLogo', '-NoExit']
      : [];

    try {
      const proc: ChildProcess = spawn(shellExe, shellArgs, {
        cwd: workingDir,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          FORCE_COLOR: '1'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Stream stdout to renderer xterm
      proc.stdout?.on('data', (chunk: Buffer) => {
        if (!this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send(IPC_CHANNELS.PTY_DATA_STREAM, {
            sessionId,
            data: chunk.toString()
          });
        }
      });

      // Stream stderr to renderer xterm
      proc.stderr?.on('data', (chunk: Buffer) => {
        if (!this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send(IPC_CHANNELS.PTY_DATA_STREAM, {
            sessionId,
            data: chunk.toString()
          });
        }
      });

      proc.on('close', (exitCode: number) => {
        this.sessions.delete(sessionId);
        if (!this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send(IPC_CHANNELS.PTY_DATA_STREAM, {
            sessionId,
            data: `\r\n[Process completed with exit code ${exitCode}]\r\n`
          });
        }
      });

      proc.on('error', (err: Error) => {
        if (!this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send(IPC_CHANNELS.PTY_DATA_STREAM, {
            sessionId,
            data: `\r\n\x1b[31m[Terminal Error: ${err.message}]\x1b[0m\r\n`
          });
        }
      });

      const session: TerminalSession = {
        write: (data: string) => {
          if (!proc.stdin || proc.stdin.destroyed) return;
          let toWrite = data;
          if (isWin) {
            // Translate DEL (0x7F) from xterm into Backspace (0x08)
            toWrite = toWrite.replace(/\x7f/g, '\b');
          }
          proc.stdin.write(toWrite);
        },
        resize: () => {
          // Window resize tracking
        },
        kill: () => {
          try {
            if (isWin && proc.pid) {
              spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F']);
            } else {
              proc.kill();
            }
          } catch (e) {}
        }
      };

      this.sessions.set(sessionId, session);
    } catch (err: any) {
      console.error('[PtyManager] Critical error launching system terminal:', err);
    }
  }

  public write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.write(data);
    }
  }

  public resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (session && typeof session.resize === 'function') {
      try {
        session.resize(Math.max(10, cols), Math.max(5, rows));
      } catch (e) {}
    }
  }

  public destroySession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        session.kill();
      } catch (e) {}
      this.sessions.delete(sessionId);
    }
  }

  public destroyAll(): void {
    for (const [id] of this.sessions.entries()) {
      this.destroySession(id);
    }
  }
}
