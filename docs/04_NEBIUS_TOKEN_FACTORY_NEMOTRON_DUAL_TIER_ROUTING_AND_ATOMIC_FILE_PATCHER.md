# DOCUMENT 4 OF 6: NEBIUS TOKEN FACTORY, NEMOTRON DUAL-TIER ROUTING, AND ATOMIC FILE PATCHER

**File Target:** `docs/04_NEBIUS_TOKEN_FACTORY_NEMOTRON_DUAL_TIER_ROUTING_AND_ATOMIC_FILE_PATCHER.md`

**Series Roadmap:**

* **Doc 1: Master Architecture, System Topology, and IPC Contracts** *(Completed)*
* **Doc 2: Electron Main Process, WebContentsView Engine, and CDP Core** *(Completed)*
* **Doc 3: The 7 Autonomous Diagnostic & Load Engines** *(Completed)*
* **Doc 4: Nebius Token Factory, Nemotron Dual-Tier Routing, and Atomic File Patcher** *(Current)*
* **Doc 5: Vue 3 Renderer Workspace, Dev Chat Sidebar, and UI Components**
* **Doc 6: Build Tooling, Native Rebuild, Packaging, and Hackathon Execution Guide**

---

## 1. Architectural Overview & Design Rationale

Dev-Shell replaces generic, untiered LLM wrappers with a production-grade inference and code modification engine. Running continuous telemetry monitoring on a single frontier model rapidly causes rate-limit exhaustion, high latency, and excessive token expenditure.

To solve this, Dev-Shell deploys **Nebius Token Factory** to power a dual-tier model hierarchy combined with a native Node.js **Atomic Search-and-Replace File Patcher** that operates without the overhead of external protocols like MCP.

```
+----------------------------------------------------------------------------------------------------+
|                                    DIAGNOSTIC TELEMETRY PIPELINE                                   |
|                                                                                                    |
|  [CDP Core Event Stream] ──► [Buffer Queue] ──► [Nemotron 3 Nano (Triage)]                         |
|                                                          │                                         |
|                                                          ▼                                         |
|                                            Filtered Diagnostic Context                             |
|                                            (Severity: Critical / User Ask)                         |
|                                                          │                                         |
|                                                          ▼                                         |
|                                            [Nemotron 3 Ultra (Reasoning)]                          |
|                                                          │                                         |
|                                                          ▼                                         |
|                                            Structured Patch (json-patch)                           |
+----------------------------------------------------------|-----------------------------------------+
                                                           |
                                                           v
+----------------------------------------------------------------------------------------------------+
|                                      ATOMIC FILE PATCH ENGINE (fs)                                 |
|                                                                                                    |
|  1. Path Traversal & Existence Check (resolve against projectRoot)                                 |
|  2. Unambiguous Search Verification (assert count(searchBlock) === 1)                              |
|  3. Create Pristine Backup (.devshell/backups/[timestamp]_[hash].bak)                              |
|  4. Write Atomic Swap (.tmp -> fs.renameSync)                                                      |
|  5. Return Verification Metadata & Backup ID for 1-Click Rollback                                  |
+----------------------------------------------------------------------------------------------------+

```

### Key Technical Decisions

1. **Nebius Token Factory OpenAI Compatibility:** Nebius provides an OpenAI-compatible REST API at `[https://api.tokenfactory.nebius.com/v1/](https://api.tokenfactory.nebius.com/v1/)`. This eliminates the need for proprietary SDKs and allows the use of official, battle-tested `openai` libraries with custom `baseURL` configurations.
2. **Tier 1 — High-Frequency Triage (`nvidia/nemotron-3-nano-30b`):** Ingests streaming CDP logs, DOM mutations, and network traces at low latency. It discards operational noise, maps raw data to the 7 diagnostic domains, and flags severe bottlenecks for deep reasoning.
3. **Tier 2 — Deep Reasoning & Patch Synthesis (`nvidia/nemotron-3-ultra-550b`):** Invoked for critical issues or interactive developer prompts. It analyzes source code read directly from disk via Node.js `fs`, understands complex multi-file architectural constraints, and outputs strict `json-patch` blocks.
4. **Zero-MCP Native Disk Modification:** Instead of communicating through external JSON-RPC stdio pipes, Electron's Main Process leverages native Node.js filesystem APIs. This allows safe, atomic, verifiable modifications with automatic backup snapshots and rollback guarantees.

---

## 2. Nebius Token Factory Client (`src/main/nemotron/nebius-client.ts`)

This module manages the direct connection to Nebius Token Factory, handling authentication, exponential backoff retries, and token usage accounting.

```typescript
import OpenAI from 'openai';
import { SecureStorage } from '../secure-storage';

export interface TokenUsageStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface NemotronCompletionOptions {
  model: 'nano' | 'ultra';
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  responseFormatJson?: boolean;
}

export class NebiusClient {
  private openai: OpenAI | null = null;
  private currentApiKey: string | null = null;
  private baseUrl: string = 'https://api.tokenfactory.nebius.com/v1/';

  // Concrete Nebius Token Factory model identifiers
  public static readonly MODEL_NANO = 'nvidia/nemotron-3-nano-30b';
  public static readonly MODEL_ULTRA = 'nvidia/nemotron-3-ultra-550b';

  constructor(private secureStorage: SecureStorage) {}

  public async initialize(): Promise<void> {
    // 1. Attempt to load encrypted key from OS keychain via safeStorage
    const storedKey = await this.secureStorage.getSecret('NEBIUS_API_KEY');
    
    // 2. Fall back to environment variable if available
    const apiKey = storedKey || process.env.NEBIUS_API_KEY || '';

    if (apiKey) {
      this.updateApiKey(apiKey);
    } else {
      console.warn('[NebiusClient] No API Key found in secure storage or environment.');
    }
  }

  public updateApiKey(apiKey: string): void {
    this.currentApiKey = apiKey;
    this.openai = new OpenAI({
      baseURL: this.baseUrl,
      apiKey: this.currentApiKey,
      maxRetries: 3,
      timeout: 45000 // 45s execution limit for complex Ultra reasoning runs
    });
    console.log('[NebiusClient] OpenAI client re-initialized with Nebius Token Factory base URL.');
  }

  public isReady(): boolean {
    return this.openai !== null && !!this.currentApiKey;
  }

  public async executeCompletion(options: NemotronCompletionOptions): Promise<{ content: string; usage?: TokenUsageStats }> {
    if (!this.isReady()) {
      throw new Error('[NebiusClient] Cannot execute completion. Nebius Token Factory API Key is not configured.');
    }

    const selectedModel = options.model === 'ultra' 
      ? NebiusClient.MODEL_ULTRA 
      : NebiusClient.MODEL_NANO;

    const requestPayload: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model: selectedModel,
      messages: options.messages,
      temperature: options.temperature ?? (options.model === 'ultra' ? 0.2 : 0.0), // Deterministic for triage/patching
      max_tokens: options.maxTokens ?? (options.model === 'ultra' ? 4096 : 1024),
      ...(options.responseFormatJson ? { response_format: { type: 'json_object' } } : {})
    };

    try {
      const response = await this.openai!.chat.completions.create(requestPayload);
      const choice = response.choices[0];

      if (!choice || !choice.message || !choice.message.content) {
        throw new Error('[NebiusClient] Received empty completion choice from Nebius API.');
      }

      return {
        content: choice.message.content,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        } : undefined
      };
    } catch (err: any) {
      console.error(`[NebiusClient Critical Error] Execution failed on model ${selectedModel}:`, err);
      if (err.status === 401) {
        throw new Error('Nebius Token Factory Authentication Failed: Invalid API Key.');
      } else if (err.status === 429) {
        throw new Error('Nebius Rate Limit Exceeded: Tier throughput capacity reached.');
      }
      throw err;
    }
  }
}

```

---

## 3. Dual-Tier Model Router & Prompt Engineering (`src/main/nemotron/router.ts`)

The `NemotronRouter` coordinates model selection. It routes raw, streaming CDP telemetry through Nemotron 3 Nano for fast triage. When high-severity anomalies are detected or when the user enters a request, it invokes Nemotron 3 Ultra to reason over local source code and synthesize verified patches.

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { NebiusClient } from './nebius-client';
import { DiagnosticTelemetry } from '../../shared/telemetry-types';
import { FilePatch } from '../../shared/patch-types';

export interface CopilotChatQuery {
  prompt: string;
  history: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  telemetryContext?: DiagnosticTelemetry[];
  activeFilePath?: string;
}

export interface CopilotChatResult {
  reply: string;
  patch?: FilePatch;
  rawJsonPatch?: string;
  tokensUsed?: number;
}

export class NemotronRouter {
  constructor(
    private client: NebiusClient,
    private projectRoot: string
  ) {}

  /**
   * TIER 1: Nemotron 3 Nano Triage
   * Rapidly assesses telemetry batches and classifies whether deep intervention is needed.
   */
  public async triageTelemetryBatch(rawEvents: any[]): Promise<{ requiresUltra: boolean; summary: string }> {
    const systemPrompt = `
You are the Low-Latency Diagnostic Triage Engine for Dev-Shell, an AI developer browser.
Analyze the following stream of raw Chrome DevTools Protocol (CDP) events.
Filter out normal network responses (200 OK), benign assets, and low-priority logs.
Determine if any event represents a CRITICAL or HIGH issue across these domains:
1. Element & DOM Stacking/Accessibility
2. Missing CDN Subresource Integrity (SRI) or Broken XML/SVG
3. Console Hydration Mismatch or Uncaught Exceptions
4. Network Throttling Degradation (Oversized bundles > 500KB, Uncompressed text)
5. High Concurrency Latency Spikes
6. Detached DOM Node Memory Leaks
7. Security Violations (Missing CSP/HSTS, Leaked Secrets)

Respond with a valid JSON object matching this schema:
{
  "requiresUltra": boolean,
  "criticalDomain": string | null,
  "summary": "One sentence technical synopsis"
}
`;

    try {
      const response = await this.client.executeCompletion({
        model: 'nano',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(rawEvents.slice(0, 30)) }
        ],
        temperature: 0.0,
        responseFormatJson: true
      });

      const parsed = JSON.parse(response.content);
      return {
        requiresUltra: !!parsed.requiresUltra,
        summary: parsed.summary || 'Telemetry evaluated.'
      };
    } catch (err) {
      console.warn('[NemotronRouter] Nano triage failed, defaulting to passive:', err);
      return { requiresUltra: false, summary: 'Triage bypass on error.' };
    }
  }

  /**
   * TIER 2: Nemotron 3 Ultra Reasoning & Patch Synthesis
   * Performs root-cause analysis and synthesizes atomic, reproducible patches.
   */
  public async handleCopilotConversation(query: CopilotChatQuery): Promise<CopilotChatResult> {
    // 1. Gather relevant local source code context if an active file or telemetry pointer exists
    let codeContextBlock = '';
    const targetFile = query.activeFilePath || query.telemetryContext?.[0]?.technicalDetails?.resolvedSourceFile;

    if (targetFile) {
      const fullPath = path.isAbsolute(targetFile) 
        ? targetFile 
        : path.resolve(this.projectRoot, targetFile);

      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          codeContextBlock = `
=== SOURCE FILE CONTEXT: ${path.relative(this.projectRoot, fullPath)} ===
\`\`\`
${content.substring(0, 12000)} // Bound context to 12K characters
\`\`\`
`;
        } catch (e) {
          console.warn('[NemotronRouter] Could not read contextual file:', fullPath);
        }
      }
    }

    // 2. Format Telemetry Diagnostics Context
    const telemetryString = query.telemetryContext && query.telemetryContext.length > 0
      ? `=== ACTIVE RUNTIME CDP DIAGNOSTICS ===\n${JSON.stringify(query.telemetryContext, null, 2)}`
      : '=== NO ACTIVE CDP FAULTS DETECTED ===';

    // 3. Assemble Ultra Reasoning System Prompt
    const systemPrompt = `
You are the Lead Systems Architect and Diagnostic Copilot inside Dev-Shell.
You have direct visibility into runtime Chrome DevTools Protocol diagnostics and local source files.

${telemetryString}

${codeContextBlock}

INSTRUCTIONS:
1. Provide a direct, technical, and concrete answer to the developer's request.
2. If fixing an issue requires modifying a local project file, you MUST generate an atomic patch.
3. The patch MUST be provided at the end of your response inside a \`\`\`json-patch fenced block.
4. Schema for json-patch:
\`\`\`json-patch
{
  "filePath": "relative/path/to/target/file.vue",
  "searchBlock": "EXACT string of code currently in the file to be replaced",
  "replaceBlock": "The new replacement string of code",
  "rationale": "Clear technical reason for this change",
  "targetDomain": "element" | "cdn-xml" | "console" | "network" | "load" | "memory" | "security"
}
\`\`\`

CRITICAL RULES FOR PATCH GENERATION:
- "filePath" must be relative to the project root.
- "searchBlock" must match EXACTLY, character-for-character, including indentation and newlines.
- "searchBlock" must be unique in the file to avoid ambiguous replacements.
- Do NOT output comments or markdown inside the \`\`\`json-patch block.
`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...query.history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: query.prompt }
    ];

    const completion = await this.client.executeCompletion({
      model: 'ultra',
      messages: messages as any,
      temperature: 0.1,
      maxTokens: 4096
    });

    const rawContent = completion.content;

    // 4. Extract and validate JSON patch
    const patchMatch = rawContent.match(/```json-patch\s*([\s\S]*?)\s*```/);
    let extractedPatch: FilePatch | undefined;
    let cleanReply = rawContent;

    if (patchMatch && patchMatch[1]) {
      try {
        const parsed = JSON.parse(patchMatch[1].trim());
        if (parsed.filePath && parsed.searchBlock && parsed.replaceBlock) {
          extractedPatch = {
            id: `patch_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            filePath: parsed.filePath,
            searchBlock: parsed.searchBlock,
            replaceBlock: parsed.replaceBlock,
            rationale: parsed.rationale || 'Optimization suggested by Nemotron 3 Ultra',
            targetDomain: parsed.targetDomain || 'console'
          };
          // Strip the patch block from the displayed chat response
          cleanReply = rawContent.replace(/```json-patch[\s\S]*?```/, '').trim();
        }
      } catch (err) {
        console.error('[NemotronRouter] Failed to parse synthesized json-patch:', err);
      }
    }

    return {
      reply: cleanReply,
      patch: extractedPatch,
      tokensUsed: completion.usage?.totalTokens
    };
  }
}

```

---

## 4. Atomic Search-and-Replace File Patcher (`src/main/patch-engine.ts`)

The `PatchEngine` directly applies code modifications to local project files using Node.js `fs`. It enforces strict path traversal guards, validates that the target replacement string is unique, creates timestamped backup snapshots in `.devshell/backups/`, and performs an atomic write using temporary files.

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { FilePatch, PatchResult, PatchBackupRecord } from '../shared/patch-types';

export class PatchEngine {
  private backupDir: string;
  private backupLedger: Map<string, PatchBackupRecord> = new Map();

  constructor(private projectRoot: string) {
    this.backupDir = path.join(this.projectRoot, '.devshell', 'backups');
    this.ensureBackupDirectoryExists();
  }

  private ensureBackupDirectoryExists(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Applies an atomic search-and-replace modification to disk.
   */
  public applyPatch(patch: FilePatch): PatchResult {
    try {
      // 1. Path Traversal & Security Validation
      const resolvedPath = path.resolve(this.projectRoot, patch.filePath);
      if (!resolvedPath.startsWith(this.projectRoot)) {
        return {
          success: false,
          error: `Security Violation: Target path '${patch.filePath}' escapes project root.`
        };
      }

      if (!fs.existsSync(resolvedPath)) {
        return {
          success: false,
          error: `File not found: '${patch.filePath}' does not exist on disk.`
        };
      }

      // 2. Read Target File Content
      const originalContent = fs.readFileSync(resolvedPath, 'utf8');

      // 3. String Search & Uniqueness Verification
      const occurrences = this.countOccurrences(originalContent, patch.searchBlock);
      if (occurrences === 0) {
        return {
          success: false,
          error: `Search block not found. The target file content has drifted from Nemotron's snapshot.`
        };
      }

      if (occurrences > 1) {
        return {
          success: false,
          error: `Ambiguous replacement target: searchBlock appears ${occurrences} times in file. Patch aborted.`
        };
      }

      // 4. Create Pristine Backup Record
      const backupId = `bk_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const backupFileName = `${backupId}_${path.basename(patch.filePath)}.bak`;
      const backupFilePath = path.join(this.backupDir, backupFileName);

      fs.writeFileSync(backupFilePath, originalContent, 'utf8');

      const backupRecord: PatchBackupRecord = {
        backupId,
        originalFilePath: resolvedPath,
        backupLocation: backupFilePath,
        timestamp: Date.now(),
        searchBlock: patch.searchBlock,
        replaceBlock: patch.replaceBlock
      };

      this.backupLedger.set(backupId, backupRecord);

      // 5. Execute Atomic Write via Temp File Swap
      const modifiedContent = originalContent.replace(patch.searchBlock, patch.replaceBlock);
      const tempFilePath = `${resolvedPath}.tmp.${Date.now()}`;

      fs.writeFileSync(tempFilePath, modifiedContent, 'utf8');
      
      // Atomic rename overwrites original file safely
      fs.renameSync(tempFilePath, resolvedPath);

      console.log(`[PatchEngine] Successfully patched ${patch.filePath}. Backup ID: ${backupId}`);

      return {
        success: true,
        backupId,
        backupFilePath,
        modifiedFilePath: resolvedPath
      };

    } catch (err: any) {
      console.error('[PatchEngine Critical] Failed to apply file patch:', err);
      return {
        success: false,
        error: `I/O Failure while applying patch: ${err.message}`
      };
    }
  }

  /**
   * Reverts a previously applied patch using its unique backup snapshot.
   */
  public rollback(backupId: string): boolean {
    const record = this.backupLedger.get(backupId);
    if (!record) {
      console.error(`[PatchEngine] Rollback failed: Backup ID '${backupId}' not found in ledger.`);
      return false;
    }

    try {
      if (!fs.existsSync(record.backupLocation)) {
        console.error(`[PatchEngine] Rollback failed: Snapshot file missing at ${record.backupLocation}`);
        return false;
      }

      const backupContent = fs.readFileSync(record.backupLocation, 'utf8');
      const tempFilePath = `${record.originalFilePath}.tmp.rollback`;

      fs.writeFileSync(tempFilePath, backupContent, 'utf8');
      fs.renameSync(tempFilePath, record.originalFilePath);

      // Clean up backup file from disk
      fs.unlinkSync(record.backupLocation);
      this.backupLedger.delete(backupId);

      console.log(`[PatchEngine] Successfully rolled back patch. Restored: ${record.originalFilePath}`);
      return true;
    } catch (err) {
      console.error(`[PatchEngine Critical] Failed to execute rollback for ${backupId}:`, err);
      return false;
    }
  }

  private countOccurrences(haystack: string, needle: string): number {
    if (!needle) return 0;
    let count = 0;
    let pos = 0;
    while ((pos = haystack.indexOf(needle, pos)) !== -1) {
      count++;
      pos += needle.length;
    }
    return count;
  }
}

```

---

## 5. Native Safe Storage Manager (`src/main/secure-storage.ts`)

This module provides hardware-backed encryption using Chromium's `safeStorage` API (DPAPI on Windows, Keychain on macOS, Secret Service/Libsecret on Linux) to store user credentials.

```typescript
import { safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export class SecureStorage {
  private storageFilePath: string;
  private memoryCache: Map<string, string> = new Map();

  constructor(appDataPath: string) {
    this.storageFilePath = path.join(appDataPath, 'devshell_secure_store.enc');
    this.loadStore();
  }

  private loadStore(): void {
    if (!fs.existsSync(this.storageFilePath)) return;

    try {
      const encryptedBuffer = fs.readFileSync(this.storageFilePath);
      if (safeStorage.isEncryptionAvailable()) {
        const decryptedJson = safeStorage.decryptString(encryptedBuffer);
        const data = JSON.parse(decryptedJson);
        for (const [k, v] of Object.entries(data)) {
          this.memoryCache.set(k, v as string);
        }
      } else {
        console.warn('[SecureStorage] OS-level encryption is unavailable. Using plaintext fallback.');
      }
    } catch (err) {
      console.error('[SecureStorage] Failed to decrypt secure credential store:', err);
    }
  }

  public async setSecret(key: string, secretValue: string): Promise<boolean> {
    this.memoryCache.set(key, secretValue);
    return this.persistStore();
  }

  public async getSecret(key: string): Promise<string | null> {
    return this.memoryCache.get(key) || null;
  }

  private persistStore(): boolean {
    try {
      const plainObject: Record<string, string> = {};
      for (const [k, v] of this.memoryCache.entries()) {
        plainObject[k] = v;
      }
      const rawString = JSON.stringify(plainObject);

      if (safeStorage.isEncryptionAvailable()) {
        const encryptedBuffer = safeStorage.encryptString(rawString);
        fs.writeFileSync(this.storageFilePath, encryptedBuffer);
      } else {
        fs.writeFileSync(this.storageFilePath, Buffer.from(rawString, 'utf8'));
      }
      return true;
    } catch (err) {
      console.error('[SecureStorage] Failed to persist encrypted secrets to disk:', err);
      return false;
    }
  }
}

```

---

## 6. AI & Patch IPC Wiring (`src/main/ipc/register-ai-ipc.ts`)

This module registers the IPC handlers that allow the Vue 3 renderer to communicate with the `NemotronRouter`, execute patch modifications via the `PatchEngine`, and manage credentials via `SecureStorage`.

```typescript
import { BrowserWindow, ipcMain } from 'electron';
import { NemotronRouter } from '../nemotron/router';
import { PatchEngine } from '../patch-engine';
import { NebiusClient } from '../nemotron/nebius-client';
import { SecureStorage } from '../secure-storage';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { FilePatch } from '../../shared/patch-types';

export function registerAiIpc(
  mainWindow: BrowserWindow,
  patchEngine: PatchEngine,
  nebiusClient: NebiusClient,
  router: NemotronRouter,
  secureStorage: SecureStorage
): void {
  // Handle Chat and Deep Reasoning Queries
  ipcMain.handle(IPC_CHANNELS.AI_SEND_MESSAGE, async (_, payload) => {
    try {
      const result = await router.handleCopilotConversation({
        prompt: payload.prompt,
        history: payload.history || [],
        telemetryContext: payload.telemetryContext,
        activeFilePath: payload.activeFilePath
      });

      return {
        reply: result.reply,
        patch: result.patch,
        tokensUsed: result.tokensUsed
      };
    } catch (err: any) {
      console.error('[IPC Handler Error: AI_SEND_MESSAGE]', err);
      return {
        reply: `Error communicating with NVIDIA Nemotron on Nebius Token Factory: ${err.message}`,
        patch: undefined
      };
    }
  });

  // Handle 1-Click Codebase Patch Application
  ipcMain.handle(IPC_CHANNELS.AI_APPLY_PATCH, async (_, patch: FilePatch) => {
    return patchEngine.applyPatch(patch);
  });

  // Handle Rollback Requests
  ipcMain.handle(IPC_CHANNELS.AI_ROLLBACK_PATCH, async (_, backupId: string) => {
    return patchEngine.rollback(backupId);
  });

  // Handle Secure Key Retrieval & Storage
  ipcMain.handle(IPC_CHANNELS.STORAGE_SAVE_KEY, async (_, { keyName, keyValue }) => {
    const success = await secureStorage.setSecret(keyName, keyValue);
    if (success && keyName === 'NEBIUS_API_KEY') {
      nebiusClient.updateApiKey(keyValue);
    }
    return success;
  });

  ipcMain.handle(IPC_CHANNELS.STORAGE_GET_KEY, async (_, keyName: string) => {
    return secureStorage.getSecret(keyName);
  });
}

```

---

## 7. Verification Lifecycle & End-to-End Execution Sequence

```
1. Diagnostic Event Fired
   CDP detects a hydration mismatch in `src/components/Navbar.vue`.
   
2. Nano Model Triage
   Nemotron 3 Nano evaluates the trace and returns `requiresUltra: true` with a critical domain flag.

3. Diagnostic Card Surfaced
   Vue displays a "Hydration Mismatch" alert with a button: "⚡ Fix with Nemotron".

4. Developer Prompt / Click
   The user clicks the button or asks: "Fix the SSR hydration bug in the navbar".

5. Ultra Model Reasoning
   - Router reads `src/components/Navbar.vue` directly from disk.
   - Nemotron 3 Ultra synthesizes a fix that defers client-only code into `onMounted()`.
   - The response includes a structured ```json-patch``` block.

6. Interactive Diff Review
   The Vue sidebar renders a side-by-side search/replace card.

7. Patch Application
   - User clicks "⚡ Apply to Codebase".
   - `PatchEngine` verifies string uniqueness, saves a pristine backup to `.devshell/backups/`, and replaces the code on disk.

8. Automatic Live Reload
   Chromium reloads the tab, verifying that the console hydration mismatch is resolved.

```

---

*This concludes Document 4. Document 5 covers the complete Vue 3 frontend implementation, Pinia reactive stores, the Dev Chat sidebar with patch cards, and the interactive UI drawers.*