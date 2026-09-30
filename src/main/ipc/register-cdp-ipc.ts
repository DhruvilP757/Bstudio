import { ipcMain } from 'electron';
import { ElementInspector } from '../cdp/element-inspector';
import { MemoryProfiler } from '../cdp/memory-profiler';
import { SecurityAuditor } from '../cdp/security-auditor';
import { NetworkThrottler } from '../cdp/network-throttler';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { NetworkProfile } from '../../shared/cdp-types';

export function registerCdpIpc(
  elementInspector: ElementInspector,
  memoryProfiler: MemoryProfiler,
  securityAuditor: SecurityAuditor,
  networkThrottler: NetworkThrottler
): void {
  ipcMain.handle(IPC_CHANNELS.CDP_TOGGLE_INSPECT, async (_, enabled: boolean) => {
    await elementInspector.setInspectMode(enabled);
  });

  ipcMain.handle(IPC_CHANNELS.CDP_TRIGGER_GC, async () => {
    await memoryProfiler.triggerGarbageCollection();
  });

  ipcMain.handle(IPC_CHANNELS.CDP_RUN_MEMORY_AUDIT, async () => {
    await memoryProfiler.runMemoryAudit();
  });

  ipcMain.handle(IPC_CHANNELS.CDP_RUN_SECURITY_AUDIT, async () => {
    await securityAuditor.runFullSecurityAudit();
  });

  ipcMain.handle(IPC_CHANNELS.EMULATION_SET_NETWORK, async (_, profile: NetworkProfile) => {
    await networkThrottler.setNetworkConditions(profile);
  });
}
