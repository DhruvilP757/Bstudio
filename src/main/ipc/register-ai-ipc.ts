import { ipcMain } from 'electron';
import { NebiusClient } from '../nemotron/nebius-client';
import { PatchEngine } from '../patch-engine';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { FilePatch } from '../../shared/patch-types';

export function registerAiIpc(nebiusClient: NebiusClient, patchEngine: PatchEngine): void {
  ipcMain.handle(IPC_CHANNELS.AI_SEND_MESSAGE, async (_, payload) => {
    return nebiusClient.completeChat({
      prompt:           payload.prompt,
      history:          payload.history,
      telemetryContext: payload.telemetryContext,
      devtoolsContext:  payload.devtoolsContext,
      modelPreference:  payload.model,
      provider:         payload.provider,
    });
  });

  ipcMain.handle(IPC_CHANNELS.AI_APPLY_PATCH, async (_, patch: FilePatch) => {
    return patchEngine.applyPatch(patch);
  });

  ipcMain.handle(IPC_CHANNELS.AI_ROLLBACK_PATCH, async (_, backupId: string) => {
    return patchEngine.rollback(backupId);
  });

  // Provider key setters
  ipcMain.handle('ai:set-gemini-key', async (_, key: string) => {
    await nebiusClient.setGeminiKey(key);
    return true;
  });

  ipcMain.handle('ai:set-nebius-key', async (_, key: string) => {
    await nebiusClient.setNebiusKey(key);
    return true;
  });

  ipcMain.handle('ai:get-status', async () => {
    return nebiusClient.getStatus();
  });
}
