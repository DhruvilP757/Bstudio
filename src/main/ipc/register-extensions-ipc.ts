import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IPC_CHANNELS } from '../../shared/ipc-channels';

export interface VscodeExtensionManifest {
  id: string;
  name: string;
  displayName: string;
  publisher: string;
  version: string;
  description: string;
  categories: string[];
  icon?: string | null;
  downloads?: string;
  rating?: number;
  installed: boolean;
  enabled: boolean;
  isLocal: boolean;
  folderPath?: string;
  contributes?: {
    themes?: any[];
    snippets?: any[];
    languages?: any[];
    commands?: any[];
    iconThemes?: any[];
  };
}

function formatDownloads(count?: number): string {
  if (!count) return '10K+';
  if (count >= 1_000_000) return (count / 1_000_000).toFixed(1) + 'M';
  if (count >= 1_000) return (count / 1_000).toFixed(0) + 'K';
  return count.toString();
}

function stripJsonComments(str: string): string {
  return str.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');
}

export function registerExtensionsIpc(): void {
  // 1. Scan Local VS Code Extensions installed on system
  ipcMain.handle(IPC_CHANNELS.EXTENSIONS_GET_LOCAL, async (): Promise<VscodeExtensionManifest[]> => {
    const candidates = [
      path.join(os.homedir(), '.vscode', 'extensions'),
      process.env.USERPROFILE ? path.join(process.env.USERPROFILE, '.vscode', 'extensions') : null
    ].filter(Boolean) as string[];

    const extDir = candidates.find(p => fs.existsSync(p));
    if (!extDir) {
      return [];
    }

    const results: VscodeExtensionManifest[] = [];
    try {
      const dirs = fs.readdirSync(extDir, { withFileTypes: true });

      for (const d of dirs) {
        if (!d.isDirectory()) continue;
        const dirPath = path.join(extDir, d.name);
        const pkgPath = path.join(dirPath, 'package.json');
        if (!fs.existsSync(pkgPath)) continue;

        try {
          const raw = fs.readFileSync(pkgPath, 'utf8');
          const pkg = JSON.parse(raw);

          // Resolve icon to Base64 Data URI if available
          let iconDataUri: string | null = null;
          if (pkg.icon) {
            const iconPath = path.join(dirPath, pkg.icon);
            if (fs.existsSync(iconPath)) {
              try {
                const ext = path.extname(iconPath).toLowerCase().replace('.', '') || 'png';
                const base64 = fs.readFileSync(iconPath).toString('base64');
                iconDataUri = `data:image/${ext === 'svg' ? 'svg+xml' : ext};base64,${base64}`;
              } catch {}
            }
          }

          // Clean display name
          let displayName = pkg.displayName || pkg.name;
          if (displayName.startsWith('%') && displayName.endsWith('%')) {
            displayName = pkg.name;
          }

          results.push({
            id: `${pkg.publisher || 'vscode'}.${pkg.name}`,
            name: pkg.name,
            displayName,
            publisher: pkg.publisher || 'VSCode Community',
            version: pkg.version || '1.0.0',
            description: pkg.description || 'VS Code Extension',
            categories: pkg.categories || ['Other'],
            icon: iconDataUri,
            downloads: 'Installed',
            rating: 4.8,
            installed: true,
            enabled: true,
            isLocal: true,
            folderPath: dirPath,
            contributes: {
              themes: pkg.contributes?.themes || [],
              snippets: pkg.contributes?.snippets || [],
              languages: pkg.contributes?.languages || [],
              commands: pkg.contributes?.commands || [],
              iconThemes: pkg.contributes?.iconThemes || []
            }
          });
        } catch {}
      }
    } catch (err) {
      console.error('[ExtensionsIPC] Failed scanning local extensions:', err);
    }

    return results;
  });

  // 2. Search Remote VS Code Marketplace (Open VSX Registry)
  ipcMain.handle(
    IPC_CHANNELS.EXTENSIONS_SEARCH_MARKETPLACE,
    async (_, payload: { query?: string; category?: string; size?: number } = {}) => {
      const query = payload.query || '';
      const size = payload.size || 35;
      const url = `https://open-vsx.org/api/-/search?query=${encodeURIComponent(query)}&size=${size}`;

      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Bstudio-IDE/1.0.0 (VSCode Extension Marketplace Client)'
          }
        });

        if (!res.ok) {
          throw new Error(`Open VSX search returned status ${res.status}`);
        }

        const data: any = await res.json();
        const extensions = data.extensions || [];

        return extensions.map((item: any) => {
          let category = 'other';
          const cats = (item.categories || []).map((c: string) => c.toLowerCase());
          if (cats.some((c: string) => c.includes('theme'))) category = 'themes';
          else if (cats.some((c: string) => c.includes('language') || c.includes('snippet'))) category = 'languages';
          else if (cats.some((c: string) => c.includes('format'))) category = 'formatters';
          else if (cats.some((c: string) => c.includes('linter'))) category = 'linters';
          else category = 'tools';

          return {
            id: `${item.namespace}.${item.name}`,
            name: item.name,
            displayName: item.displayName || item.name,
            publisher: item.namespace,
            version: item.version,
            description: item.description || '',
            categories: item.categories || [],
            category,
            icon: item.files?.icon || null,
            downloads: formatDownloads(item.downloadCount),
            rating: item.averageRating ? Math.round(item.averageRating * 10) / 10 : 4.5,
            installed: false,
            enabled: false,
            isLocal: false,
            downloadUrl: item.files?.download || null,
            verified: item.verified || false
          };
        });
      } catch (err) {
        console.warn('[ExtensionsIPC] Marketplace query failed or offline, returning curated fallback:', err);
        return [];
      }
    }
  );

  // 3. Read Extension Theme JSON/JSONC
  ipcMain.handle(IPC_CHANNELS.EXTENSIONS_READ_THEME, async (_, themeFilePath: string) => {
    try {
      if (!fs.existsSync(themeFilePath)) {
        return null;
      }
      const raw = fs.readFileSync(themeFilePath, 'utf8');
      const clean = stripJsonComments(raw);
      return JSON.parse(clean);
    } catch (err) {
      console.error('[ExtensionsIPC] Failed reading theme file:', err);
      return null;
    }
  });
}
