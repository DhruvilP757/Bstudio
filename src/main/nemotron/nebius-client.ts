import OpenAI from 'openai';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { SecureStorage } from '../secure-storage';
import { DiagnosticTelemetry } from '../../shared/telemetry-types';
import { FilePatch } from '../../shared/patch-types';

export type AIProvider = 'nebius' | 'gemini';
export type GeminiModel = 'gemini-1.5-flash' | 'gemini-1.5-pro' | 'gemini-2.0-flash';
export type NemotronModel = 'nano' | 'ultra';

export interface ChatMessagePayload {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are Bstudio AI Assistant, a full-stack engineer and browser diagnostic agent embedded inside the Bstudio browser IDE.
You diagnose issues detected by the Chromium DevTools Protocol (CDP), review code, and generate atomic file patches.
When the user asks you to fix code or when an issue is reported, analyze the telemetry, explain the root cause concisely, and if a fix is possible, output a code patch strictly inside a JSON patch code block formatted like:
\`\`\`json-patch
{
  "filePath": "src/components/Header.vue",
  "searchBlock": "exact text from the original file to replace",
  "replaceBlock": "new replacement code",
  "rationale": "one sentence explanation of fix",
  "targetDomain": "element" | "cdn-xml" | "console" | "network" | "load" | "memory" | "security"
}
\`\`\`
Ensure "searchBlock" matches the target file uniquely and accurately. Be concise and developer-friendly.`;

export class NebiusClient {
  // ── Nebius / Nemotron ──────────────────────────────
  private openai: OpenAI | null = null;
  private nebiusBaseUrl: string = 'https://api.tokenfactory.nebius.com/v1/';
  public static readonly MODEL_NANO  = 'nvidia/nemotron-3-nano-30b';
  public static readonly MODEL_ULTRA = 'nvidia/nemotron-3-ultra-550b';

  // ── Google Gemini ──────────────────────────────────
  private gemini: GoogleGenerativeAI | null = null;

  // ── Active provider ────────────────────────────────
  public activeProvider: AIProvider = 'nebius';

  constructor(private secureStorage: SecureStorage) {}

  // ─────────────────────────────────────────────────────
  // Initialisation — loads any stored keys
  // ─────────────────────────────────────────────────────
  public async initialize(): Promise<void> {
    // Nebius
    const nebiusKey = await this.secureStorage.getSecret('NEBIUS_API_KEY')
      || process.env.NEBIUS_API_KEY || '';
    const customBase = await this.secureStorage.getSecret('NEBIUS_BASE_URL');
    if (customBase) this.nebiusBaseUrl = customBase;
    else if (process.env.NEBIUS_BASE_URL) this.nebiusBaseUrl = process.env.NEBIUS_BASE_URL;

    if (nebiusKey) {
      this.openai = new OpenAI({ apiKey: nebiusKey, baseURL: this.nebiusBaseUrl });
    }

    // Gemini
    const geminiKey = await this.secureStorage.getSecret('GEMINI_API_KEY')
      || process.env.GEMINI_API_KEY || '';
    if (geminiKey) {
      this.gemini = new GoogleGenerativeAI(geminiKey);
    }

    // Auto-select provider based on what's available
    if (this.gemini && !this.openai) this.activeProvider = 'gemini';
    else if (this.openai) this.activeProvider = 'nebius';

    console.log(`[AIClient] Initialized — provider: ${this.activeProvider}, nebius: ${!!this.openai}, gemini: ${!!this.gemini}`);
  }

  // ─────────────────────────────────────────────────────
  // Key setters (called from IPC after user saves in UI)
  // ─────────────────────────────────────────────────────
  public async setNebiusKey(apiKey: string): Promise<void> {
    await this.secureStorage.setSecret('NEBIUS_API_KEY', apiKey);
    this.openai = new OpenAI({ apiKey, baseURL: this.nebiusBaseUrl });
    if (this.activeProvider === 'nebius' || !this.gemini) this.activeProvider = 'nebius';
  }

  public async setGeminiKey(apiKey: string): Promise<void> {
    await this.secureStorage.setSecret('GEMINI_API_KEY', apiKey);
    this.gemini = new GoogleGenerativeAI(apiKey);
    this.activeProvider = 'gemini';
  }

  // ─────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────
  // Main chat entry point
  // ─────────────────────────────────────────────────────
  public async completeChat(params: {
    prompt: string;
    history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    telemetryContext?: DiagnosticTelemetry[];
    devtoolsContext?: any;
    modelPreference?: NemotronModel | GeminiModel | 'gemini-flash' | 'gemini-pro' | string;
    provider?: AIProvider;
  }): Promise<{ reply: string; patch?: FilePatch; tokensUsed?: any; provider?: string }> {
    // Lazy-init if neither provider is active
    if (!this.openai && !this.gemini) {
      await this.initialize();
    }

    // Determine which provider to use
    const requestedProvider = params.provider || this.activeProvider;

    if (requestedProvider === 'gemini') {
      if (!this.gemini) {
        // Try to retrieve Gemini key if not loaded yet
        const geminiKey = await this.secureStorage.getSecret('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '';
        if (geminiKey) {
          this.gemini = new GoogleGenerativeAI(geminiKey);
        }
      }

      if (!this.gemini) {
        return {
          reply: `### 🔑 Google Gemini API Key Required\n\nNo Gemini API key is configured.\n\n1. Click **⚙️ Settings** (or the provider button) in the top right.\n2. Paste your Google AI Studio API key into the **Google Gemini** tab.\n3. Click **Save Key**.\n\nYou can get a free API key at [aistudio.google.com](https://aistudio.google.com/app/apikey).`,
          provider: 'gemini'
        };
      }

      const telemetryCtx = this.buildTelemetryContext(params.telemetryContext);
      const devtoolsCtx  = this.buildDevToolsContext(params.devtoolsContext);
      const fullPrompt   = params.prompt + telemetryCtx + devtoolsCtx;
      return this.callGemini(fullPrompt, params.history, params.modelPreference);
    } else {
      // Nebius / Nemotron
      if (!this.openai) {
        const nebiusKey = await this.secureStorage.getSecret('NEBIUS_API_KEY') || process.env.NEBIUS_API_KEY || '';
        if (nebiusKey) {
          this.openai = new OpenAI({ apiKey: nebiusKey, baseURL: this.nebiusBaseUrl });
        }
      }

      if (!this.openai) {
        return {
          reply: `### 🔑 Nebius Nemotron API Key Required\n\nNo Nebius API key is configured.\n\n1. Click **⚙️ Settings** in the top right.\n2. Paste your Token Factory key into the **Nebius Nemotron** tab.\n3. Click **Save Key**.\n\nOr toggle provider to **Google Gemini** to use a free Gemini key!`,
          provider: 'nebius'
        };
      }

      const telemetryCtx = this.buildTelemetryContext(params.telemetryContext);
      const devtoolsCtx  = this.buildDevToolsContext(params.devtoolsContext);
      const fullPrompt   = params.prompt + telemetryCtx + devtoolsCtx;
      return this.callNebius(fullPrompt, params.history, params.modelPreference as NemotronModel);
    }
  }

  // ─────────────────────────────────────────────────────
  // Nebius / Nemotron call
  // ─────────────────────────────────────────────────────
  private async callNebius(
    prompt: string,
    history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    modelPreference?: NemotronModel
  ): Promise<{ reply: string; patch?: FilePatch; tokensUsed?: any; provider: string }> {
    const targetModel = modelPreference === 'nano'
      ? NebiusClient.MODEL_NANO
      : NebiusClient.MODEL_ULTRA;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.filter(h => h.role !== 'system').map(h => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.openai!.chat.completions.create({
        model: targetModel,
        messages,
        temperature: 0.2,
        max_tokens: 2048,
      });
      const reply = response.choices[0]?.message?.content || '';
      return {
        reply,
        patch: this.extractJsonPatch(reply),
        tokensUsed: response.usage
          ? { prompt: response.usage.prompt_tokens, completion: response.usage.completion_tokens, total: response.usage.total_tokens }
          : undefined,
        provider: `Nemotron (${targetModel.split('/')[1]})`,
      };
    } catch (err: any) {
      console.error('[AIClient] Nebius call failed:', err);
      return { reply: `⚠️ Nebius error: ${err.message || err}`, provider: 'nebius' };
    }
  }

  // ─────────────────────────────────────────────────────
  // Gemini call
  // ─────────────────────────────────────────────────────
  private async callGemini(
    prompt: string,
    history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    modelPreference?: string
  ): Promise<{ reply: string; patch?: FilePatch; provider: string }> {
    // Map friendly names → real model IDs
    const modelMap: Record<string, string> = {
      'gemini-flash':      'gemini-2.0-flash',
      'gemini-pro':        'gemini-1.5-pro',
      'gemini-2.0-flash':  'gemini-2.0-flash',
      'gemini-1.5-flash':  'gemini-1.5-flash',
      'gemini-1.5-pro':    'gemini-1.5-pro',
    };
    const modelId = modelPreference && modelMap[modelPreference]
      ? modelMap[modelPreference]
      : (modelPreference || 'gemini-2.0-flash');

    try {
      const model = this.gemini!.getGenerativeModel({
        model: modelId,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT,         threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
        systemInstruction: SYSTEM_PROMPT,
      });

      // Build Gemini chat history (excludes system messages, converts roles)
      const rawHistory = history
        .filter(h => h.role !== 'system' && h.content?.trim())
        .map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        }));

      // Drop leading model turns until first user turn (Gemini requires history to start with user)
      while (rawHistory.length > 0 && rawHistory[0].role === 'model') {
        rawHistory.shift();
      }

      // Merge adjacent identical roles to ensure alternating user/model turns
      const sanitizedHistory: Array<{ role: string; parts: Array<{ text: string }> }> = [];
      for (const turn of rawHistory) {
        if (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === turn.role) {
          sanitizedHistory[sanitizedHistory.length - 1].parts[0].text += `\n\n${turn.parts[0].text}`;
        } else {
          sanitizedHistory.push(turn);
        }
      }

      const chat = model.startChat({ history: sanitizedHistory });
      const result = await chat.sendMessage(prompt);
      const reply = result.response.text();
      return {
        reply,
        patch: this.extractJsonPatch(reply),
        provider: `Gemini (${modelId})`,
      };
    } catch (err: any) {
      console.error('[AIClient] Gemini call failed:', err);
      return { reply: `⚠️ Gemini error: ${err.message || err}`, provider: 'gemini' };
    }
  }

  // ─────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────
  private buildTelemetryContext(events?: DiagnosticTelemetry[]): string {
    if (!events || events.length === 0) return '';
    let ctx = '\n\n[Active Diagnostic Telemetry]:\n';
    events.forEach((t, i) => {
      ctx += `${i + 1}. [${t.domain.toUpperCase()}/${t.severity}] ${t.title}: ${t.summary}\n`;
      if (t.technicalDetails) ctx += `   Details: ${JSON.stringify(t.technicalDetails)}\n`;
    });
    return ctx;
  }

  private buildDevToolsContext(devtools?: any): string {
    if (!devtools) return '';
    let ctx = '\n\n[Live Chrome DevTools Context]:\n';
    if (devtools.url) ctx += `- Active Web Page URL: ${devtools.url}\n`;
    if (devtools.title) ctx += `- Active Page Title: ${devtools.title}\n`;
    if (devtools.activeFile) ctx += `- Open Code File: ${devtools.activeFile}\n`;
    if (devtools.recentConsole && devtools.recentConsole.length > 0) {
      ctx += '- Recent Web Console Output:\n';
      devtools.recentConsole.forEach((c: any) => {
        ctx += `  [${c.type.toUpperCase()}] ${c.message}${c.source ? ` (${c.source})` : ''}\n`;
      });
    }
    if (devtools.recentNetwork && devtools.recentNetwork.length > 0) {
      ctx += '- Recent Network Requests:\n';
      devtools.recentNetwork.forEach((n: any) => {
        ctx += `  ${n.method || 'GET'} ${n.url} -> Status ${n.status || 'pending'} (${n.type || 'fetch'})\n`;
      });
    }
    return ctx;
  }

  private offlineResponse(telemetryContext?: DiagnosticTelemetry[]): string {
    if (telemetryContext && telemetryContext.length > 0) {
      const t = telemetryContext[0];
      let msg = `### 📡 Offline Diagnostic Analysis\n\n**Incident:** ${t.title}\n**Domain:** \`${t.domain}\` | **Severity:** \`${t.severity.toUpperCase()}\`\n\n${t.summary}\n\n`;
      if (t.suggestedAction) msg += `**Recommended Action:**\n> ${t.suggestedAction.label}: ${t.suggestedAction.description}\n\n`;
      msg += `*Configure a Nebius or Gemini API key in ⚙️ Settings to enable automatic patch synthesis.*`;
      return msg;
    }
    return `### 🤖 Bstudio AI Copilot — Offline Mode\n\nNo API key is configured. Add a key in **⚙️ Settings** to enable:\n\n- **Nebius Nemotron 3** (Ultra 550B / Nano 30B) — NVIDIA-optimised code reasoning\n- **Google Gemini** (2.0 Flash / 1.5 Pro) — fast multimodal assistance\n\nThe editor, terminal, browser, and CDP diagnostics all work offline without a key.`;
  }

  private extractJsonPatch(reply: string): FilePatch | undefined {
    const match = reply.match(/```json-patch\s*([\s\S]*?)\s*```/);
    if (!match) return undefined;
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.filePath && parsed.searchBlock && parsed.replaceBlock) {
        return {
          id: `patch_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          filePath: parsed.filePath,
          searchBlock: parsed.searchBlock,
          replaceBlock: parsed.replaceBlock,
          rationale: parsed.rationale || 'Automated code repair',
          targetDomain: parsed.targetDomain || 'console',
        };
      }
    } catch (e) {
      console.warn('[AIClient] Failed parsing json-patch block:', e);
    }
    return undefined;
  }

  // ─────────────────────────────────────────────────────
  // Status helpers used by the UI
  // ─────────────────────────────────────────────────────
  public getStatus(): { nebius: boolean; gemini: boolean; active: AIProvider } {
    return { nebius: !!this.openai, gemini: !!this.gemini, active: this.activeProvider };
  }

  // Legacy compatibility alias
  public async setApiKey(apiKey: string): Promise<void> {
    return this.setNebiusKey(apiKey);
  }
}
