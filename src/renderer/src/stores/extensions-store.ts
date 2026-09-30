import { defineStore } from 'pinia';

export interface VscodeExtension {
  id: string;
  name: string;
  displayName: string;
  publisher: string;
  version: string;
  description: string;
  category: 'themes' | 'languages' | 'tools' | 'formatters' | 'linters' | 'snippets' | 'other';
  icon?: string | null;
  color?: string;
  downloads?: string;
  rating?: number;
  installed: boolean;
  enabled: boolean;
  isLocal?: boolean;
  downloadUrl?: string | null;
  verified?: boolean;
  contributes?: any;
  folderPath?: string;
}

export const POPULAR_EXTENSIONS: VscodeExtension[] = [
  // 1. THEMES
  {
    id: 'binaryify.one-dark-pro',
    name: 'one-dark-pro',
    displayName: 'One Dark Pro',
    publisher: 'binaryify',
    version: '3.19.0',
    description: "Atom's iconic One Dark theme, and one of the most installed themes for VS Code.",
    category: 'themes',
    icon: '🎨',
    color: '#61afef',
    downloads: '8.4M',
    rating: 4.9,
    installed: true,
    enabled: true
  },
  {
    id: 'enkia.tokyo-night',
    name: 'tokyo-night',
    displayName: 'Tokyo Night',
    publisher: 'enkia',
    version: '1.0.8',
    description: 'A clean, dark Visual Studio Code theme that celebrates the lights of downtown Tokyo at night.',
    category: 'themes',
    icon: '🌃',
    color: '#bb9af7',
    downloads: '3.2M',
    rating: 4.8,
    installed: true,
    enabled: true
  },
  {
    id: 'dracula.dracula-theme',
    name: 'dracula',
    displayName: 'Dracula Official',
    publisher: 'Dracula Theme',
    version: '2.25.1',
    description: 'Official Dracula Theme. A dark theme for vampires, night owls, and code crafters.',
    category: 'themes',
    icon: '🧛',
    color: '#ff79c6',
    downloads: '6.5M',
    rating: 4.9,
    installed: false,
    enabled: false
  },
  {
    id: 'github.github-vscode-theme',
    name: 'github-dark',
    displayName: 'GitHub Dark Theme',
    publisher: 'GitHub',
    version: '6.3.4',
    description: "GitHub's official dark theme for VS Code with crisp syntax contrast.",
    category: 'themes',
    icon: '🐙',
    color: '#58a6ff',
    downloads: '11.2M',
    rating: 4.7,
    installed: false,
    enabled: false
  },
  {
    id: 'monokai.monokai-pro',
    name: 'monokai',
    displayName: 'Monokai Pro',
    publisher: 'monokai',
    version: '2.0.4',
    description: 'Classic Monokai with vibrant colors and perfected typography contrast.',
    category: 'themes',
    icon: '✨',
    color: '#a6e22e',
    downloads: '2.8M',
    rating: 4.9,
    installed: false,
    enabled: false
  },
  {
    id: 'robbowen.synthwave-vscode',
    name: 'synthwave-84',
    displayName: "SynthWave '84",
    publisher: 'Robb Owen',
    version: '0.1.15',
    description: 'A synthwave-inspired color theme to celebrate the radical 80s with neon glow highlights.',
    category: 'themes',
    icon: '🌆',
    color: '#ff7edb',
    downloads: '2.1M',
    rating: 4.9,
    installed: false,
    enabled: false
  },
  {
    id: 'arcticicestudio.nord-visual-studio-code',
    name: 'nord',
    displayName: 'Nord',
    publisher: 'arcticicestudio',
    version: '0.19.0',
    description: 'An arctic, north-bluish clean and elegant color theme for focused coding.',
    category: 'themes',
    icon: '❄️',
    color: '#88c0d0',
    downloads: '2.3M',
    rating: 4.8,
    installed: false,
    enabled: false
  },
  {
    id: 'sdras.night-owl',
    name: 'night-owl',
    displayName: 'Night Owl',
    publisher: 'Sarah Drasner',
    version: '2.2.0',
    description: 'A VS Code theme for the night owls out there. Fine-tuned for meaningful color contrasts.',
    category: 'themes',
    icon: '🦉',
    color: '#82aaff',
    downloads: '2.9M',
    rating: 4.9,
    installed: false,
    enabled: false
  },
  {
    id: 'endormi.2077-theme',
    name: 'cyberpunk',
    displayName: 'Cyberpunk 2077',
    publisher: 'endormi',
    version: '1.4.3',
    description: 'High-contrast neon cyberpunk theme inspired by Night City.',
    category: 'themes',
    icon: '⚡',
    color: '#fcee0a',
    downloads: '1.2M',
    rating: 4.7,
    installed: false,
    enabled: false
  },
  {
    id: 'teabyii.ayu',
    name: 'ayu-dark',
    displayName: 'Ayu Dark',
    publisher: 'teabyii',
    version: '1.0.5',
    description: 'A simple theme with bright colors and comes in dark aesthetic.',
    category: 'themes',
    icon: '🌿',
    color: '#e6b450',
    downloads: '2.6M',
    rating: 4.8,
    installed: false,
    enabled: false
  },

  // 2. FILE ICON THEMES
  {
    id: 'pkief.material-icon-theme',
    name: 'material-icon-theme',
    displayName: 'Material Icon Theme',
    publisher: 'Philipp Kief',
    version: '5.38.1',
    description: 'Material Design Icons for Visual Studio Code with vibrant, distinct file badges.',
    category: 'tools',
    icon: '📂',
    color: '#42a5f5',
    downloads: '24.2M',
    rating: 4.9,
    installed: true,
    enabled: true
  },

  // 3. FORMATTERS & LINTERS
  {
    id: 'esbenp.prettier-vscode',
    name: 'prettier',
    displayName: 'Prettier - Code Formatter',
    publisher: 'Esben Petersen',
    version: '12.4.0',
    description: 'Opinionated code formatter for JavaScript, TypeScript, HTML, CSS, JSON, and Vue.',
    category: 'formatters',
    icon: '🧹',
    color: '#f7b93e',
    downloads: '45.1M',
    rating: 4.7,
    installed: true,
    enabled: true
  },
  {
    id: 'dbaeumer.vscode-eslint',
    name: 'eslint',
    displayName: 'ESLint',
    publisher: 'Microsoft',
    version: '3.0.34',
    description: 'Integrates ESLint into the editor. Checks syntax errors, unused variables, and best practices.',
    category: 'linters',
    icon: '🛡️',
    color: '#4b32c3',
    downloads: '38.4M',
    rating: 4.6,
    installed: true,
    enabled: true
  },

  // 4. RUNNERS & DEV TOOLS
  {
    id: 'formulahendry.code-runner',
    name: 'code-runner',
    displayName: 'Code Runner',
    publisher: 'Jun Han',
    version: '0.12.2',
    description: 'Run code snippet or code file for Python, JavaScript, TypeScript, C, C++, Go, and more in terminal.',
    category: 'tools',
    icon: '▶️',
    color: '#00d26a',
    downloads: '26.8M',
    rating: 4.8,
    installed: true,
    enabled: true
  },
  {
    id: 'ritwickdey.liveserver',
    name: 'live-server',
    displayName: 'Live Server',
    publisher: 'Ritwick Dey',
    version: '5.7.10',
    description: 'Launch a local development server with live reload feature for static & dynamic pages.',
    category: 'tools',
    icon: '⚡',
    color: '#0ea5e9',
    downloads: '49.8M',
    rating: 4.8,
    installed: true,
    enabled: true
  },
  {
    id: 'eamodio.gitlens',
    name: 'gitlens',
    displayName: 'GitLens — Git Supercharged',
    publisher: 'GitKraken',
    version: '19.2.0',
    description: 'Supercharge Git within Bstudio: visualize code authorship, navigate revisions, and file history.',
    category: 'tools',
    icon: '🔍',
    color: '#38bdf8',
    downloads: '36.5M',
    rating: 4.8,
    installed: true,
    enabled: true
  },
  {
    id: 'humao.rest-client',
    name: 'rest-client',
    displayName: 'REST Client',
    publisher: 'Huachao Mao',
    version: '0.25.1',
    description: 'REST Client allows you to send HTTP request and view the response in Bstudio directly.',
    category: 'tools',
    icon: '📡',
    color: '#a855f7',
    downloads: '5.9M',
    rating: 4.9,
    installed: true,
    enabled: true
  },

  // 5. LANGUAGES & INTELLISENSE
  {
    id: 'ms-python.python',
    name: 'python',
    displayName: 'Python Language Support',
    publisher: 'Microsoft',
    version: '2026.4.0',
    description: 'Rich IntelliSense, syntax highlighting, code snippets and typing for Python.',
    category: 'languages',
    icon: '🐍',
    color: '#3776ab',
    downloads: '118M',
    rating: 4.6,
    installed: true,
    enabled: true
  },
  {
    id: 'vue.volar',
    name: 'volar',
    displayName: 'Vue - Official (Volar)',
    publisher: 'Vue',
    version: '3.3.11',
    description: 'Language support for Vue 3 Single File Components, TypeScript IntelliSense, and formatting.',
    category: 'languages',
    icon: '💚',
    color: '#42b883',
    downloads: '10.5M',
    rating: 4.8,
    installed: true,
    enabled: true
  },
  {
    id: 'bradlc.vscode-tailwindcss',
    name: 'tailwindcss',
    displayName: 'Tailwind CSS IntelliSense',
    publisher: 'Tailwind Labs',
    version: '0.9.11',
    description: 'Intelligent Tailwind CSS class autocompletion, hover previews, and linting.',
    category: 'languages',
    icon: '🌊',
    color: '#38bdf8',
    downloads: '16.4M',
    rating: 4.8,
    installed: true,
    enabled: true
  },
  {
    id: 'nvidia.nemotron-copilot',
    name: 'nvidia-copilot',
    displayName: 'Bstudio AI Copilot (Nemotron & Gemini)',
    publisher: 'NVIDIA & Google',
    version: '1.0.0',
    description: 'AI code completion, ghost-text suggestions, and autonomous diagnostics powered by Nemotron & Gemini.',
    category: 'tools',
    icon: '🤖',
    color: '#76b900',
    downloads: '2.4M',
    rating: 5.0,
    installed: true,
    enabled: true
  }
];

export const useExtensionsStore = defineStore('extensions', {
  state: () => {
    let savedInstalled: Record<string, { installed: boolean; enabled: boolean }> = {};
    try {
      const raw = localStorage.getItem('bstudio_extensions_state');
      if (raw) savedInstalled = JSON.parse(raw);
    } catch {}

    const extensions = POPULAR_EXTENSIONS.map(def => {
      const match = savedInstalled[def.id];
      return match ? { ...def, installed: match.installed, enabled: match.enabled } : def;
    });

    const activeTheme = localStorage.getItem('bstudio_active_theme') || 'one-dark-pro';
    const activeIconTheme = localStorage.getItem('bstudio_icon_theme') || 'material';

    return {
      extensions,
      localVscodeExtensions: [] as VscodeExtension[],
      marketplaceResults: [] as VscodeExtension[],
      activeTheme,
      activeIconTheme,
      activeFilter: 'all' as 'all' | 'installed' | 'local' | 'themes' | 'languages' | 'formatters' | 'tools',
      searchQuery: '',
      isSearching: false,
      isLoadingLocal: false,
      selectedExtension: null as VscodeExtension | null,
      isCodeRunnerActive: true,
      isPrettierActive: true,
      isLiveServerActive: true,
      isEslintActive: true,
      appliedMessage: ''
    };
  },

  getters: {
    allExtensions(): VscodeExtension[] {
      // Merge unique extensions by id
      const map = new Map<string, VscodeExtension>();

      // 1. Curated popular
      for (const ext of this.extensions) {
        map.set(ext.id, ext);
      }

      // 2. Local installed from VS Code
      for (const ext of this.localVscodeExtensions) {
        if (!map.has(ext.id)) {
          map.set(ext.id, ext);
        } else {
          // preserve local indicator
          const existing = map.get(ext.id)!;
          existing.isLocal = true;
          existing.folderPath = ext.folderPath;
        }
      }

      // 3. Marketplace results
      for (const ext of this.marketplaceResults) {
        if (!map.has(ext.id)) {
          map.set(ext.id, ext);
        }
      }

      return Array.from(map.values());
    },

    filteredExtensions(): VscodeExtension[] {
      let list = this.allExtensions;

      if (this.activeFilter === 'installed') {
        list = list.filter(e => e.installed);
      } else if (this.activeFilter === 'local') {
        list = list.filter(e => e.isLocal);
      } else if (this.activeFilter === 'themes') {
        list = list.filter(e => e.category === 'themes');
      } else if (this.activeFilter === 'languages') {
        list = list.filter(e => e.category === 'languages' || e.category === 'snippets');
      } else if (this.activeFilter === 'formatters') {
        list = list.filter(e => e.category === 'formatters' || e.category === 'linters');
      } else if (this.activeFilter === 'tools') {
        list = list.filter(e => e.category === 'tools');
      }

      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase().trim();
        list = list.filter(e =>
          e.displayName.toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.publisher.toLowerCase().includes(q)
        );
      }

      return list;
    },

    installedCount(): number {
      return this.allExtensions.filter(e => e.installed).length;
    },

    localCount(): number {
      return this.localVscodeExtensions.length;
    }
  },

  actions: {
    persist() {
      try {
        const stateMap: Record<string, { installed: boolean; enabled: boolean }> = {};
        for (const ext of this.allExtensions) {
          stateMap[ext.id] = { installed: ext.installed, enabled: ext.enabled };
        }
        localStorage.setItem('bstudio_extensions_state', JSON.stringify(stateMap));
        localStorage.setItem('bstudio_active_theme', this.activeTheme);
        localStorage.setItem('bstudio_icon_theme', this.activeIconTheme);
      } catch {}
    },

    async fetchLocalExtensions() {
      if (!window.electronAPI?.getLocalExtensions) return;
      this.isLoadingLocal = true;
      try {
        const locals = await window.electronAPI.getLocalExtensions();
        this.localVscodeExtensions = (locals || []).map((l: any) => {
          let category: VscodeExtension['category'] = 'other';
          const cats = (l.categories || []).map((c: string) => c.toLowerCase());
          if (l.contributes?.themes?.length || cats.some((c: string) => c.includes('theme'))) category = 'themes';
          else if (l.contributes?.languages?.length || l.contributes?.snippets?.length || cats.some((c: string) => c.includes('language') || c.includes('snippet'))) category = 'languages';
          else if (cats.some((c: string) => c.includes('format'))) category = 'formatters';
          else if (cats.some((c: string) => c.includes('linter'))) category = 'linters';
          else category = 'tools';

          // Check if previously disabled
          let enabled = true;
          try {
            const raw = localStorage.getItem('bstudio_extensions_state');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed[l.id] && parsed[l.id].enabled === false) enabled = false;
            }
          } catch {}

          return {
            id: l.id,
            name: l.name,
            displayName: l.displayName,
            publisher: l.publisher,
            version: l.version,
            description: l.description,
            category,
            icon: l.icon || '📦',
            downloads: 'Installed (Local)',
            rating: 4.9,
            installed: true,
            enabled,
            isLocal: true,
            folderPath: l.folderPath,
            contributes: l.contributes
          };
        });
      } catch (err) {
        console.error('Failed fetching local VS Code extensions:', err);
      } finally {
        this.isLoadingLocal = false;
      }
    },

    async searchMarketplace(query: string) {
      this.searchQuery = query;
      if (!query.trim()) {
        this.marketplaceResults = [];
        return;
      }

      if (!window.electronAPI?.searchMarketplaceExtensions) return;
      this.isSearching = true;
      try {
        const results = await window.electronAPI.searchMarketplaceExtensions({ query, size: 40 });
        this.marketplaceResults = (results || []).map((r: any) => ({
          ...r,
          installed: this.allExtensions.some(e => e.id === r.id && e.installed),
          enabled: this.allExtensions.some(e => e.id === r.id && e.enabled)
        }));
      } catch (err) {
        console.warn('Marketplace search failed:', err);
      } finally {
        this.isSearching = false;
      }
    },

    install(ext: VscodeExtension) {
      ext.installed = true;
      ext.enabled = true;
      this.applyExtension(ext);
      this.persist();
      this.showNotification(`Installed & applied: ${ext.displayName}`);
    },

    uninstall(id: string) {
      const ext = this.allExtensions.find(e => e.id === id);
      if (ext) {
        ext.installed = false;
        ext.enabled = false;
        if (ext.category === 'themes' && this.activeTheme === ext.name) {
          this.setTheme('one-dark-pro');
        }
        this.persist();
        this.showNotification(`Uninstalled: ${ext.displayName}`);
      }
    },

    toggleEnable(id: string) {
      const ext = this.allExtensions.find(e => e.id === id);
      if (ext) {
        ext.enabled = !ext.enabled;
        if (ext.enabled) {
          this.applyExtension(ext);
          this.showNotification(`Enabled: ${ext.displayName}`);
        } else {
          if (ext.category === 'themes' && this.activeTheme === ext.name) {
            this.setTheme('vs-dark');
          }
          this.showNotification(`Disabled: ${ext.displayName}`);
        }
        this.persist();
      }
    },

    applyExtension(ext: VscodeExtension) {
      if (ext.category === 'themes' || ext.id.includes('theme')) {
        this.setTheme(ext.name);
      } else if (ext.id.includes('material-icon-theme') || ext.id.includes('icon')) {
        this.activeIconTheme = 'material';
        window.dispatchEvent(new CustomEvent('bstudio:icon-theme-changed', { detail: 'material' }));
      } else if (ext.id.includes('code-runner')) {
        this.isCodeRunnerActive = true;
        window.dispatchEvent(new CustomEvent('bstudio:feature-toggled', { detail: { feature: 'code-runner', enabled: true } }));
      } else if (ext.id.includes('prettier')) {
        this.isPrettierActive = true;
        window.dispatchEvent(new CustomEvent('bstudio:feature-toggled', { detail: { feature: 'prettier', enabled: true } }));
      } else if (ext.id.includes('liveserver') || ext.id.includes('live-server')) {
        this.isLiveServerActive = true;
        window.dispatchEvent(new CustomEvent('bstudio:feature-toggled', { detail: { feature: 'live-server', enabled: true } }));
      } else if (ext.id.includes('eslint')) {
        this.isEslintActive = true;
        window.dispatchEvent(new CustomEvent('bstudio:feature-toggled', { detail: { feature: 'eslint', enabled: true } }));
      }

      this.persist();
    },

    setTheme(themeName: string) {
      this.activeTheme = themeName;
      document.documentElement.setAttribute('data-theme', themeName);
      this.persist();
      window.dispatchEvent(new CustomEvent('bstudio:theme-changed', { detail: themeName }));
      this.showNotification(`Applied Color Theme: ${themeName}`);
    },

    showNotification(msg: string) {
      this.appliedMessage = msg;
      setTimeout(() => {
        if (this.appliedMessage === msg) {
          this.appliedMessage = '';
        }
      }, 3000);
    }
  }
});
