import { ipcMain } from 'electron';
import { SecureStorage } from '../secure-storage';
import { NebiusClient } from '../nemotron/nebius-client';
import { IPC_CHANNELS } from '../../shared/ipc-channels';

export function registerStorageIpc(secureStorage: SecureStorage, nebiusClient?: NebiusClient): void {
  ipcMain.handle(IPC_CHANNELS.STORAGE_SAVE_KEY, async (_, { keyName, keyValue }) => {
    const success = await secureStorage.setSecret(keyName, keyValue);
    if (nebiusClient && keyValue) {
      if (keyName === 'GEMINI_API_KEY') {
        await nebiusClient.setGeminiKey(keyValue);
      } else if (keyName === 'NEBIUS_API_KEY') {
        await nebiusClient.setNebiusKey(keyValue);
      }
    }
    return success;
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_GET_KEY, async (_, keyName: string) => {
    return secureStorage.getSecret(keyName);
  });
}
