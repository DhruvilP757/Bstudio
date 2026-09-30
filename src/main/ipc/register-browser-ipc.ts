import { ipcMain } from 'electron';
import { ViewManager } from '../view-manager';
import { IPC_CHANNELS } from '../../shared/ipc-channels';

export function registerBrowserIpc(viewManager: ViewManager): void {
  ipcMain.handle(IPC_CHANNELS.BROWSER_NAVIGATE, async (_, url: string) => {
    await viewManager.navigate(url);
  });

  ipcMain.handle(IPC_CHANNELS.BROWSER_GO_BACK, async () => {
    viewManager.goBack();
  });

  ipcMain.handle(IPC_CHANNELS.BROWSER_GO_FORWARD, async () => {
    viewManager.goForward();
  });

  ipcMain.handle(IPC_CHANNELS.BROWSER_RELOAD, async () => {
    viewManager.reload();
  });

  ipcMain.handle(IPC_CHANNELS.BROWSER_STOP, async () => {
    viewManager.stop();
  });

  ipcMain.handle(IPC_CHANNELS.BROWSER_SYNC_BOUNDS, async (_, bounds) => {
    viewManager.syncBounds(bounds);
  });

  ipcMain.handle(IPC_CHANNELS.BROWSER_SET_VISIBILITY, async (_, visible: boolean) => {
    viewManager.setVisibility(visible);
  });

  ipcMain.handle(IPC_CHANNELS.EMULATION_SET_DEVICE, async (_, { device, customBounds }) => {
    viewManager.setDeviceEmulation(device, customBounds);
  });

  ipcMain.handle('browser:capture-screenshot', async () => {
    return viewManager.captureScreenshot();
  });

  ipcMain.handle('browser:execute-js', async (_, code: string) => {
    try {
      const res = await viewManager.executeJavaScript(code);
      return { success: true, result: res };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  });
}
