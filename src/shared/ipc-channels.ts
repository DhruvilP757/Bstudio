export const IPC_CHANNELS = {
  // Navigation & Viewport
  BROWSER_NAVIGATE: 'browser:navigate',
  BROWSER_GO_BACK: 'browser:go-back',
  BROWSER_GO_FORWARD: 'browser:go-forward',
  BROWSER_RELOAD: 'browser:reload',
  BROWSER_STOP: 'browser:stop',
  BROWSER_SYNC_BOUNDS: 'browser:sync-bounds',
  BROWSER_SET_VISIBILITY: 'browser:set-visibility',
  BROWSER_NAV_STATE_CHANGED: 'browser:nav-state-changed',

  // Emulation & Conditions
  EMULATION_SET_DEVICE: 'emulation:set-device',
  EMULATION_SET_NETWORK: 'emulation:set-network',

  // Diagnostics & CDP
  CDP_TOGGLE_INSPECT: 'cdp:toggle-inspect',
  CDP_TRIGGER_GC: 'cdp:trigger-gc',
  CDP_RUN_MEMORY_AUDIT: 'cdp:run-memory-audit',
  CDP_RUN_SECURITY_AUDIT: 'cdp:run-security-audit',
  CDP_TELEMETRY_EMITTED: 'cdp:telemetry-emitted',
  CDP_NODE_INSPECTED: 'cdp:node-inspected',

  // Terminal PTY
  PTY_CREATE: 'pty:create',
  PTY_WRITE: 'pty:write',
  PTY_RESIZE: 'pty:resize',
  PTY_DESTROY: 'pty:destroy',
  PTY_DATA_STREAM: 'pty:data-stream',

  // API Tester
  API_EXECUTE_REQUEST: 'api:execute-request',
  API_AGENT_PROPOSE_REQUEST: 'api:agent-propose-request',

  // Load Engine
  LOAD_START_TEST: 'load:start-test',
  LOAD_STOP_TEST: 'load:stop-test',
  LOAD_PROGRESS_STREAM: 'load:progress-stream',
  LOAD_COMPLETE: 'load:complete',

  // AI & Patching
  AI_SEND_MESSAGE: 'ai:send-message',
  AI_APPLY_PATCH: 'ai:apply-patch',
  AI_ROLLBACK_PATCH: 'ai:rollback-patch',

  // Secure Storage
  STORAGE_SAVE_KEY: 'storage:save-key',
  STORAGE_GET_KEY: 'storage:get-key',

  // In-App File Explorer & DevTools
  FS_GET_TREE: 'fs:get-tree',
  FS_READ_FILE: 'fs:read-file',
  FS_WRITE_FILE: 'fs:write-file',
  FS_OPEN_FOLDER: 'fs:open-folder',
  FS_OPEN_FILE: 'fs:open-file',
  FS_CREATE_ITEM: 'fs:create-item',
  FS_DELETE_ITEM: 'fs:delete-item',
  FS_RENAME_ITEM: 'fs:rename-item',
  FS_REVEAL_ITEM: 'fs:reveal-item',
  DEVTOOLS_TOGGLE: 'devtools:toggle',

  // Git & Version Control
  GIT_STATUS: 'git:status',
  GIT_INIT: 'git:init',
  GIT_STAGE: 'git:stage',
  GIT_UNSTAGE: 'git:unstage',
  GIT_COMMIT: 'git:commit',
  GIT_PUSH: 'git:push',
  GIT_PULL: 'git:pull',
  GIT_DIFF: 'git:diff',

  // Chrome DevTools Output Streams
  CDP_CONSOLE_OUTPUT: 'cdp:console-output',
  CDP_NETWORK_ENTRY: 'cdp:network-entry',

  // Window Controls
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',
  WINDOW_MAXIMIZED_CHANGE: 'window:maximized-change',

  // VS Code Extensions & Marketplace
  EXTENSIONS_GET_LOCAL: 'extensions:get-local',
  EXTENSIONS_SEARCH_MARKETPLACE: 'extensions:search-marketplace',
  EXTENSIONS_READ_THEME: 'extensions:read-theme',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
