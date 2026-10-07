<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import { useFsStore } from '../../stores/fs-store';
import { useExtensionsStore } from '../../stores/extensions-store';
import { useBrowserStore } from '../../stores/browser-store';
import {
  X,
  Save,
  FileCode,
  Plus,
  Sparkles,
  AlignLeft,
  Palette,
  FolderOpen,
  Play
} from 'lucide-vue-next';

let monaco: any = null;
const editorContainer = ref<HTMLDivElement | null>(null);
let editorInstance: any = null;
let disposables: any[] = [];

const fsStore = useFsStore();
const extensionsStore = useExtensionsStore();
const browserStore = useBrowserStore();


const defineThemes = () => {
  if (!monaco) return;

  // 1. One Dark Pro
  monaco.editor.defineTheme('one-dark-pro', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c678dd' },
      { token: 'string', foreground: '98c379' },
      { token: 'number', foreground: 'd19a66' },
      { token: 'type', foreground: 'e5c07b' },
      { token: 'function', foreground: '61afef' },
      { token: 'variable', foreground: 'e06c75' }
    ],
    colors: {
      'editor.background': '#282c34',
      'editor.foreground': '#abb2bf',
      'editor.lineHighlightBackground': '#2c313c',
      'editorCursor.foreground': '#528bff',
      'editorLineNumber.foreground': '#495162'
    }
  });

  // 2. Tokyo Night
  monaco.editor.defineTheme('tokyo-night', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '565f89', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'bb9af7' },
      { token: 'string', foreground: '9ece6a' },
      { token: 'number', foreground: 'ff9e64' },
      { token: 'type', foreground: '2ac3de' },
      { token: 'function', foreground: '7aa2f7' },
      { token: 'variable', foreground: 'f7768e' }
    ],
    colors: {
      'editor.background': '#1a1b26',
      'editor.foreground': '#a9b1d6',
      'editor.lineHighlightBackground': '#1f2335',
      'editorCursor.foreground': '#c0caf5'
    }
  });

  // 3. Dracula
  monaco.editor.defineTheme('dracula', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff79c6' },
      { token: 'string', foreground: 'f1fa8c' },
      { token: 'number', foreground: 'bd93f9' },
      { token: 'type', foreground: '8be9fd' },
      { token: 'function', foreground: '50fa7b' },
      { token: 'variable', foreground: 'f8f8f2' }
    ],
    colors: {
      'editor.background': '#282a36',
      'editor.foreground': '#f8f8f2',
      'editor.lineHighlightBackground': '#44475a',
      'editorCursor.foreground': '#ff79c6'
    }
  });

  // 4. GitHub Dark
  monaco.editor.defineTheme('github-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff7b72' },
      { token: 'string', foreground: 'a5d6ff' },
      { token: 'number', foreground: '79c0ff' },
      { token: 'type', foreground: 'ffa657' },
      { token: 'function', foreground: 'd2a8ff' }
    ],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#c9d1d9',
      'editor.lineHighlightBackground': '#161b22',
      'editorCursor.foreground': '#58a6ff'
    }
  });

  // 5. Monokai Pro
  monaco.editor.defineTheme('monokai', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '75715e', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'f92672' },
      { token: 'string', foreground: 'e6db74' },
      { token: 'number', foreground: 'ae81ff' },
      { token: 'type', foreground: '66d9ef' },
      { token: 'function', foreground: 'a6e22e' },
      { token: 'variable', foreground: 'fd971f' }
    ],
    colors: {
      'editor.background': '#272822',
      'editor.foreground': '#f8f8f2',
      'editor.lineHighlightBackground': '#3e3d32',
      'editorCursor.foreground': '#f8f8f2'
    }
  });

  // 6. SynthWave '84
  monaco.editor.defineTheme('synthwave-84', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '848bbd', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'fed330' },
      { token: 'string', foreground: 'ff7edb' },
      { token: 'number', foreground: '36f9f6' },
      { token: 'type', foreground: 'fe4164' },
      { token: 'function', foreground: '36f9f6' },
      { token: 'variable', foreground: 'f92aad' }
    ],
    colors: {
      'editor.background': '#262335',
      'editor.foreground': '#f92aad',
      'editor.lineHighlightBackground': '#34294f',
      'editorCursor.foreground': '#ff7edb'
    }
  });

  // 7. Nord
  monaco.editor.defineTheme('nord', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '4c566a', fontStyle: 'italic' },
      { token: 'keyword', foreground: '81a1c1' },
      { token: 'string', foreground: 'a3be8c' },
      { token: 'number', foreground: 'b48ead' },
      { token: 'type', foreground: '8fbcbb' },
      { token: 'function', foreground: '88c0d0' },
      { token: 'variable', foreground: 'd8dee9' }
    ],
    colors: {
      'editor.background': '#2e3440',
      'editor.foreground': '#d8dee9',
      'editor.lineHighlightBackground': '#3b4252',
      'editorCursor.foreground': '#88c0d0'
    }
  });

  // 8. Night Owl
  monaco.editor.defineTheme('night-owl', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '637777', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c792ea' },
      { token: 'string', foreground: 'ecc48d' },
      { token: 'number', foreground: 'f78c6c' },
      { token: 'type', foreground: 'addb67' },
      { token: 'function', foreground: '82aaff' },
      { token: 'variable', foreground: 'd6deeb' }
    ],
    colors: {
      'editor.background': '#011627',
      'editor.foreground': '#d6deeb',
      'editor.lineHighlightBackground': '#0b2942',
      'editorCursor.foreground': '#80cbc4'
    }
  });

  // 9. Cyberpunk 2077
  monaco.editor.defineTheme('cyberpunk', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '584a75', fontStyle: 'italic' },
      { token: 'keyword', foreground: '00f0ff' },
      { token: 'string', foreground: 'ff003c' },
      { token: 'number', foreground: '39ff14' },
      { token: 'type', foreground: 'fcee0a' },
      { token: 'function', foreground: '00f0ff' },
      { token: 'variable', foreground: 'fcee0a' }
    ],
    colors: {
      'editor.background': '#120e24',
      'editor.foreground': '#fcee0a',
      'editor.lineHighlightBackground': '#221942',
      'editorCursor.foreground': '#00f0ff'
    }
  });

  // 10. Ayu Dark
  monaco.editor.defineTheme('ayu-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '565b66', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff8f40' },
      { token: 'string', foreground: 'aad94c' },
      { token: 'number', foreground: 'd2a6ff' },
      { token: 'type', foreground: '59c2ff' },
      { token: 'function', foreground: 'ffb454' },
      { token: 'variable', foreground: 'bfbdb6' }
    ],
    colors: {
      'editor.background': '#0b0e14',
      'editor.foreground': '#bfbdb6',
      'editor.lineHighlightBackground': '#131721',
      'editorCursor.foreground': '#e6b450'
    }
  });

  // 11. GitHub Light
  monaco.editor.defineTheme('github-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'd73a49' },
      { token: 'string', foreground: '032f62' },
      { token: 'number', foreground: '005cc5' },
      { token: 'type', foreground: '6f42c1' },
      { token: 'function', foreground: '6f42c1' },
      { token: 'variable', foreground: '24292e' }
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#24292e',
      'editor.lineHighlightBackground': '#f6f8fa',
      'editorCursor.foreground': '#044289'
    }
  });
};

const registerLanguageFeatures = () => {
  if (!monaco) return;

  // TypeScript / JavaScript Compiler Options & Diagnostics
  if (monaco.languages.typescript) {
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      allowJs: true
    });
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false
    });
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false
    });
  }

  // Register JS/TS Snippets
  const jsSnippets = [
    { label: 'clg', insertText: 'console.log(${1:item});', detail: 'console.log()' },
    { label: 'clw', insertText: 'console.warn(${1:item});', detail: 'console.warn()' },
    { label: 'cle', insertText: 'console.error(${1:err});', detail: 'console.error()' },
    { label: 'afn', insertText: 'const ${1:name} = (${2:params}) => {\n\t${3}\n};', detail: 'Arrow function' },
    { label: 'asyncfn', insertText: 'async function ${1:name}(${2:params}) {\n\t${3}\n}', detail: 'Async function' },
    { label: 'im', insertText: "import { ${1:item} } from '${2:module}';", detail: 'Named Import' },
    { label: 'imd', insertText: "import ${1:item} from '${2:module}';", detail: 'Default Import' },
    { label: 'trycatch', insertText: 'try {\n\t${1}\n} catch (err) {\n\tconsole.error(err);\n}', detail: 'Try / Catch' },
    { label: 'prom', insertText: 'new Promise((resolve, reject) => {\n\t${1}\n});', detail: 'new Promise()' },
    { label: 'fet', insertText: "const res = await fetch('${1:url}');\nconst data = await res.json();", detail: 'Fetch JSON' },
    { label: 'ed', insertText: 'export default ${1:name};', detail: 'Export default' },
    { label: 'edfn', insertText: 'export default function ${1:name}(${2:params}) {\n\t${3}\n}', detail: 'Export default function' }
  ];

  const jsProvider = {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };
      const suggestions = jsSnippets.map((s) => ({
        label: s.label,
        kind: monaco.languages.CompletionItemKind.Snippet,
        documentation: s.detail,
        insertText: s.insertText,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range
      }));
      return { suggestions };
    }
  };

  disposables.push(monaco.languages.registerCompletionItemProvider('typescript', jsProvider));
  disposables.push(monaco.languages.registerCompletionItemProvider('javascript', jsProvider));

  // Register Python Snippets
  const pySnippets = [
    { label: 'def', insertText: 'def ${1:name}(${2:params}):\n\t"""${3:docstring}"""\n\t${4:pass}', detail: 'Function definition' },
    { label: 'class', insertText: 'class ${1:ClassName}:\n\tdef __init__(self, ${2:params}):\n\t\t${3:pass}', detail: 'Class definition' },
    { label: 'ifmain', insertText: "if __name__ == '__main__':\n\t${1:main()}", detail: 'Main guard' },
    { label: 'tryex', insertText: 'try:\n\t${1:pass}\nexcept Exception as e:\n\tprint(f"Error: {e}")', detail: 'Try / Except' },
    { label: 'withopen', insertText: "with open('${1:filename}', '${2:r}') as f:\n\t${3:content = f.read()}", detail: 'With open file' },
    { label: 'listcomp', insertText: '[${1:x} for ${2:x} in ${3:iterable}]', detail: 'List comprehension' }
  ];

  disposables.push(monaco.languages.registerCompletionItemProvider('python', {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };
      return {
        suggestions: pySnippets.map((s) => ({
          label: s.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: s.detail,
          insertText: s.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range
        }))
      };
    }
  }));

  // Register HTML / Vue Snippets
  const htmlSnippets = [
    {
      label: 'vue3',
      insertText: '<script setup lang="ts">\nimport { ref } from \'vue\';\n\nconst count = ref(0);\n<\/script>\n\n<template>\n\t<div class="${1:container}">\n\t\t<h1>Hello Bstudio</h1>\n\t</div>\n</template>\n\n<style scoped>\n\n</style>',
      detail: 'Vue 3 Single File Component'
    },
    { label: 'vif', insertText: 'v-if="${1:condition}"', detail: 'Vue v-if' },
    { label: 'vfor', insertText: 'v-for="${1:item} in ${2:items}" :key="${1:item}.id"', detail: 'Vue v-for' },
    { label: 'vmodel', insertText: 'v-model="${1:value}"', detail: 'Vue v-model' },
    { label: 'btn', insertText: '<button @click="${1:handleClick}" class="${2:btn}">\n\t${3:Click}\n</button>', detail: 'Button tag' },
    { label: 'div', insertText: '<div class="${1:class}">\n\t${2}\n</div>', detail: 'div tag' }
  ];

  disposables.push(monaco.languages.registerCompletionItemProvider('html', {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };
      return {
        suggestions: htmlSnippets.map((s) => ({
          label: s.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: s.detail,
          insertText: s.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range
        }))
      };
    }
  }));

  // Inline Ghost Text AI Completion Provider
  const inlineProvider = {
    provideInlineCompletions: async (model: any, position: any) => {
      const textBefore = model.getValueInRange({
        startLineNumber: Math.max(1, position.lineNumber - 5),
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      });

      const currentLine = model.getLineContent(position.lineNumber);
      const trimmed = currentLine.trim();
      let suggestionText = '';

      if (trimmed.startsWith('function ') && trimmed.endsWith(') {')) {
        suggestionText = '\n  return true;\n}';
      } else if (trimmed.startsWith('const ') && trimmed.includes('= async () => {')) {
        suggestionText = '\n  try {\n    // Bstudio AI Copilot generated\n  } catch (err) {\n    console.error(err);\n  }\n};';
      } else if (trimmed.startsWith('import ') && !trimmed.includes('from')) {
        suggestionText = "{ ref, computed } from 'vue';";
      } else if (trimmed === 'console.') {
        suggestionText = 'log();';
      } else if (trimmed.endsWith('{') && textBefore.includes('def ')) {
        suggestionText = '\n    pass';
      }

      if (!suggestionText) return { items: [] };

      return {
        items: [
          {
            insertText: suggestionText,
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column
            }
          }
        ]
      };
    },
    freeInlineCompletions: () => {}
  };

  disposables.push(monaco.languages.registerInlineCompletionsProvider('*', inlineProvider));
};

const formatDocument = () => {
  if (!editorInstance) return;
  const model = editorInstance.getModel();
  if (!model) return;
  const lang = model.getLanguageId();
  const value = model.getValue();

  try {
    if (lang === 'json') {
      const parsed = JSON.parse(value);
      editorInstance.setValue(JSON.stringify(parsed, null, 2));
    } else {
      // Trigger Monaco built-in format action
      const action = editorInstance.getAction('editor.action.formatDocument');
      if (action) action.run();
    }
  } catch (err) {
    console.warn('Formatting fallback:', err);
  }
};

const runCurrentFile = () => {
  if (!fsStore.activeFilePath) return;
  const filePath = fsStore.activeFilePath;
  const filename = fsStore.activeFile?.name || filePath.split(/[/\\]/).pop() || '';
  const ext = filename.split('.').pop()?.toLowerCase();

  let cmd = '';
  if (ext === 'py') cmd = `python "${filename}"`;
  else if (ext === 'js') cmd = `node "${filename}"`;
  else if (ext === 'ts') cmd = `npx ts-node "${filename}"`;
  else if (ext === 'sh') cmd = `bash "${filename}"`;
  else if (ext === 'ps1') cmd = `& .\\${filename}`;
  else if (ext === 'html') {
    browserStore.navigate(`file://${filePath.replace(/\\/g, '/')}`);
    return;
  } else {
    cmd = `cat "${filename}"`;
  }

  // Open Terminal drawer and execute command
  browserStore.openDrawer('terminal');
  if (window.electronAPI) {
    window.electronAPI.writeTerminalData('term-main', `${cmd}\r\n`);
  }
};

const initMonaco = async () => {
  if (!editorContainer.value) return;
  try {
    monaco = await import('monaco-editor');
    defineThemes();
    registerLanguageFeatures();

    const initialTheme = extensionsStore.activeTheme || 'one-dark-pro';

    editorInstance = monaco.editor.create(editorContainer.value, {
      value: fsStore.activeFile?.content || '// Select a file from the explorer to begin editing',
      language: getLanguage(fsStore.activeFilePath),
      theme: initialTheme,
      automaticLayout: true,
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      tabSize: 2,
      // Rich Auto-completion & IntelliSense
      quickSuggestions: { other: true, comments: true, strings: true },
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      tabCompletion: 'on',
      wordBasedSuggestions: 'allDocuments',
      parameterHints: { enabled: true, cycle: true },
      inlineSuggest: { enabled: true },
      suggest: {
        showKeywords: true,
        showSnippets: true,
        showFunctions: true,
        showVariables: true,
        showConstants: true,
        showClasses: true,
        showModules: true,
        showProperties: true,
        showInterfaces: true,
        showEnums: true,
        snippetsPreventQuickSuggestions: false
      }
    });

    editorInstance.onDidChangeModelContent(() => {
      if (fsStore.activeFilePath) {
        fsStore.updateContent(fsStore.activeFilePath, editorInstance.getValue());
      }
    });

    (window as any).monaco = monaco;
    (window as any).monacoEditor = editorInstance;

    // Load active file content if one is already open
    if (fsStore.activeFile) {
      editorInstance.setValue(fsStore.activeFile.content);
      const model = editorInstance.getModel();
      if (model && monaco) {
        monaco.editor.setModelLanguage(model, getLanguage(fsStore.activeFile.path));
      }
    }
    setTimeout(() => editorInstance?.layout(), 50);

    // Shortcuts: Ctrl+S Save
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      fsStore.saveActiveFile();
    });

    // Shortcuts: Shift+Alt+F Format
    editorInstance.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      formatDocument();
    });
  } catch (err) {
    console.warn('[MonacoEditor] Falling back to text mode:', err);
  }
};

const getLanguage = (filePath: string) => {
  if (!filePath) return 'plaintext';
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'typescript';
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) return 'javascript';
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.vue') || filePath.endsWith('.html')) return 'html';
  if (filePath.endsWith('.css') || filePath.endsWith('.scss')) return 'css';
  if (filePath.endsWith('.py')) return 'python';
  if (filePath.endsWith('.md')) return 'markdown';
  return 'plaintext';
};

watch(() => fsStore.openFiles.length, async (len) => {
  if (len > 0) {
    if (!editorInstance) {
      await initMonaco();
    }
    setTimeout(() => editorInstance?.layout(), 50);
    setTimeout(() => editorInstance?.layout(), 150);
  }
});

watch(() => fsStore.activeFile, async (file) => {
  if (!editorInstance && file) {
    await initMonaco();
  }
  if (editorInstance && file) {
    if (editorInstance.getValue() !== file.content) {
      editorInstance.setValue(file.content);
    }
    setTimeout(() => editorInstance?.layout(), 50);
    if (monaco) {
      const model = editorInstance.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, getLanguage(file.path));
      }
    }
  }
}, { immediate: true, deep: true });


// Watch theme changes
watch(() => extensionsStore.activeTheme, (newTheme) => {
  if (monaco && newTheme) {
    monaco.editor.setTheme(newTheme);
  }
});

onMounted(() => {
  initMonaco();
  window.addEventListener('bstudio:theme-changed', (e: any) => {
    if (monaco && e.detail) {
      monaco.editor.setTheme(e.detail);
    }
  });
});

onBeforeUnmount(() => {
  disposables.forEach((d) => d.dispose?.());
  if (editorInstance) {
    editorInstance.dispose();
  }
});
</script>

<template>
  <div class="w-full h-full flex flex-col bg-[#1e1e24] select-none">
    <!-- Editor Tabs (VS Code style) -->
    <div class="flex items-center bg-canvas border-b border-border/80 overflow-x-auto text-xs shrink-0">
      <div
        v-for="file in fsStore.openFiles"
        :key="file.path"
        @click="fsStore.activeFilePath = file.path"
        class="flex items-center gap-2 px-3 py-1.5 border-r border-border/60 cursor-pointer transition-colors"
        :class="fsStore.activeFilePath === file.path
          ? 'bg-sidebar text-white border-t-2 border-t-nvidia'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'"
      >
        <FileCode class="w-3.5 h-3.5 text-nvidia" />
        <span class="truncate max-w-[120px]">{{ file.name }}</span>
        <span v-if="file.isDirty" class="w-2 h-2 rounded-full bg-diagnostic-amber"></span>
        <button
          @click.stop="fsStore.closeFile(file.path)"
          class="hover:text-white rounded p-0.5 text-zinc-500 hover:bg-white/10"
        >
          <X class="w-3 h-3" />
        </button>
      </div>

      <!-- Quick Actions on Right (Run Code, Format, Theme, Save) -->
      <div v-if="fsStore.activeFile" class="ml-auto pr-2 flex items-center gap-1.5">
        <!-- Code Runner (Run Code in Terminal) -->
        <button
          v-if="extensionsStore.isCodeRunnerActive"
          @click="runCurrentFile"
          class="flex items-center gap-1 text-2xs bg-nvidia/15 text-nvidia border border-nvidia/40 hover:bg-nvidia/25 px-2 py-0.5 rounded transition-all font-semibold shadow-sm"
          title="Run Code in Terminal (Code Runner Extension)"
        >
          <Play class="w-3 h-3 fill-nvidia text-nvidia" />
          <span>Run</span>
        </button>

        <!-- Prettier Format Button -->
        <button
          @click="formatDocument"
          class="flex items-center gap-1 text-2xs text-zinc-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/5 transition-colors"
          title="Format Document (Shift+Alt+F)"
        >
          <AlignLeft class="w-3 h-3 text-nvidia" />
          <span>Format</span>
        </button>

        <!-- Theme Badge -->
        <button
          @click="window.dispatchEvent(new CustomEvent('bstudio:open-extensions'))"
          class="flex items-center gap-1 text-2xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded hover:bg-white/5 transition-colors"
          title="Active Theme (Change in Extensions)"
        >
          <Palette class="w-3 h-3 text-[#ff9f0a]" />
          <span class="capitalize">{{ extensionsStore.activeTheme.replace(/-/g, ' ') }}</span>
        </button>

        <!-- Save Button -->
        <button
          @click="fsStore.saveActiveFile"
          class="flex items-center gap-1 text-2xs text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors"
          title="Save File (Ctrl+S)"
        >
          <Save class="w-3 h-3 text-emerald-400" />
          <span>Save</span>
        </button>
      </div>
    </div>

    <!-- Empty State Welcome Screen (VS Code inspired) -->
    <div
      v-if="fsStore.openFiles.length === 0"
      class="flex-1 w-full h-full flex flex-col items-center justify-center p-6 text-center select-none bg-canvas/40"
    >
      <div class="w-14 h-14 rounded-2xl bg-nvidia/10 border border-nvidia/30 flex items-center justify-center text-nvidia mb-4 shadow-glow-green">
        <FileCode class="w-7 h-7" />
      </div>
      <h2 class="text-lg font-bold text-zinc-100 mb-1">Bstudio In-App Code Editor</h2>
      <p class="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
        Edit files, open workspace folders, and experience VS Code IntelliSense auto-completion and theme extensions.
      </p>

      <div class="flex items-center gap-3 mb-8">
        <button
          @click="fsStore.openFolderDialog()"
          class="flex items-center gap-1.5 bg-nvidia hover:bg-nvidia-bright text-black px-4 py-2 rounded-lg font-semibold text-xs transition-colors shadow-md"
        >
          <FolderOpen class="w-4 h-4" />
          <span>Open Folder</span>
        </button>

        <button
          @click="fsStore.openFileDialog()"
          class="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-zinc-100 border border-border px-4 py-2 rounded-lg font-semibold text-xs transition-colors shadow-sm"
        >
          <FileCode class="w-4 h-4 text-nvidia" />
          <span>Open File</span>
        </button>

        <button
          @click="fsStore.createUntitledFile()"
          class="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-zinc-200 border border-border px-4 py-2 rounded-lg font-semibold text-xs transition-colors"
        >
          <Plus class="w-4 h-4" />
          <span>New File</span>
        </button>
      </div>

      <!-- Shortcuts Cheatsheet -->
      <div class="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs font-mono text-zinc-400 border border-border/80 bg-sidebar/50 p-4 rounded-xl max-w-md w-full">
        <div class="flex justify-between items-center">
          <span>Open Folder</span>
          <kbd class="bg-elevated px-1.5 py-0.5 rounded border border-border text-zinc-300 text-2xs">Ctrl+Shift+O</kbd>
        </div>
        <div class="flex justify-between items-center">
          <span>Extensions</span>
          <kbd class="bg-elevated px-1.5 py-0.5 rounded border border-border text-zinc-300 text-2xs">Ctrl+Shift+X</kbd>
        </div>
        <div class="flex justify-between items-center">
          <span>Toggle Explorer</span>
          <kbd class="bg-elevated px-1.5 py-0.5 rounded border border-border text-zinc-300 text-2xs">Ctrl+B</kbd>
        </div>
        <div class="flex justify-between items-center">
          <span>Format Document</span>
          <kbd class="bg-elevated px-1.5 py-0.5 rounded border border-border text-zinc-300 text-2xs">Shift+Alt+F</kbd>
        </div>
        <div class="flex justify-between items-center">
          <span>Toggle Terminal</span>
          <kbd class="bg-elevated px-1.5 py-0.5 rounded border border-border text-zinc-300 text-2xs">Ctrl+`</kbd>
        </div>
        <div class="flex justify-between items-center">
          <span>AI / Copilot</span>
          <kbd class="bg-elevated px-1.5 py-0.5 rounded border border-border text-zinc-300 text-2xs">Ctrl+I</kbd>
        </div>
      </div>
    </div>

    <!-- Monaco Container & Fallback Textarea -->
    <div v-show="fsStore.openFiles.length > 0" class="flex-1 w-full h-full relative">
      <div ref="editorContainer" class="w-full h-full"></div>
      <textarea
        v-if="!editorInstance && fsStore.activeFile"
        :value="fsStore.activeFile.content"
        @input="(e: any) => fsStore.updateContent(fsStore.activeFilePath, e.target.value)"
        class="w-full h-full bg-sidebar text-zinc-200 font-mono text-xs p-4 focus:outline-none resize-none"
        spellcheck="false"
      ></textarea>
    </div>
  </div>
</template>
