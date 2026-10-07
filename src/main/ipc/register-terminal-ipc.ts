import { ipcMain } from 'electron';
import { PtyManager } from '../terminal/pty-manager';
import { IPC_CHANNELS } from '../../shared/ipc-channels';

export function registerTerminalIpc(ptyManager: PtyManager, getProjectRoot: string | (() => string)): void {
  ipcMain.handle(IPC_CHANNELS.PTY_CREATE, async (_, { sessionId, cols, rows }) => {
    const cwd = typeof getProjectRoot === 'function' ? getProjectRoot() : getProjectRoot;
    ptyManager.createSession(sessionId, cols, rows, cwd);
  });

  ipcMain.handle(IPC_CHANNELS.PTY_WRITE, async (_, { sessionId, data }) => {
    ptyManager.write(sessionId, data);
  });

  ipcMain.handle(IPC_CHANNELS.PTY_RESIZE, async (_, { sessionId, cols, rows }) => {
    ptyManager.resize(sessionId, cols, rows);
  });

  ipcMain.handle(IPC_CHANNELS.PTY_DESTROY, async (_, sessionId: string) => {
    ptyManager.destroySession(sessionId);
  });
}
