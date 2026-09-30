import { defineStore } from 'pinia';
import { FileNode } from '../../../shared/fs-types';

export const useFsStore = defineStore('fs', {
  state: () => ({
    fileTree: [] as FileNode[],
    openFiles: [] as Array<{ path: string; name: string; content: string; isDirty: boolean }>,
    activeFilePath: '' as string,
    isLoading: false,
    currentFolderName: localStorage.getItem('bstudio_folder_name') || 'Project',
    currentFolderPath: localStorage.getItem('bstudio_folder_path') || '',
    searchQuery: '',
    expandedFolders: {} as Record<string, boolean>
  }),
  getters: {
    activeFile: (state) => {
      if (!state.activeFilePath) return undefined;
      const norm = state.activeFilePath.replace(/\\/g, '/');
      return state.openFiles.find((f) => f.path.replace(/\\/g, '/') === norm);
    },
    filteredTree: (state): FileNode[] => {
      if (!state.searchQuery.trim()) return state.fileTree;
      const q = state.searchQuery.toLowerCase().trim();

      const filterNodes = (nodes: FileNode[]): FileNode[] => {
        const result: FileNode[] = [];
        for (const node of nodes) {
          if (node.isDirectory) {
            const matchingChildren = node.children ? filterNodes(node.children) : [];
            if (matchingChildren.length > 0 || node.name.toLowerCase().includes(q)) {
              result.push({
                ...node,
                children: matchingChildren
              });
            }
          } else {
            if (node.name.toLowerCase().includes(q)) {
              result.push(node);
            }
          }
        }
        return result;
      };

      return filterNodes(state.fileTree);
    }
  },
  actions: {
    async openFolderDialog() {
      if (!window.electronAPI) return;
      try {
        const res = await window.electronAPI.openFolderDialog();
        if (!res.canceled && res.folderName) {
          this.currentFolderName = res.folderName;
          this.currentFolderPath = res.folderPath || '';
          try {
            localStorage.setItem('bstudio_folder_name', res.folderName);
            if (res.folderPath) localStorage.setItem('bstudio_folder_path', res.folderPath);
          } catch {}
          await this.fetchTree();
        }
      } catch (err) {
        console.error('Failed to open folder:', err);
      }
    },
    async openFileDialog() {
      if (!window.electronAPI) return;
      try {
        const res = await window.electronAPI.openFileDialog();
        if (!res.canceled && res.content !== undefined) {
          const path = res.relativePath || res.filePath || res.name || 'opened_file';
          const name = res.name || path.split('/').pop() || 'opened_file';
          const existing = this.openFiles.find((f) => f.path === path);
          if (existing) {
            existing.content = res.content;
            this.activeFilePath = path;
          } else {
            this.openFiles.push({
              path,
              name,
              content: res.content,
              isDirty: false
            });
            this.activeFilePath = path;
          }
        }
      } catch (err) {
        console.error('Failed to open file:', err);
      }
    },
    async fetchTree() {
      if (!window.electronAPI) return;
      this.isLoading = true;
      try {
        this.fileTree = await window.electronAPI.getDirectoryTree();
      } catch (err) {
        console.warn('Failed fetching directory tree:', err);
      } finally {
        this.isLoading = false;
      }
    },
    async openFile(rawPath: string) {
      if (!rawPath) return;
      const filePath = rawPath.replace(/\\/g, '/');
      const existing = this.openFiles.find((f) => f.path.replace(/\\/g, '/') === filePath);
      if (existing) {
        this.activeFilePath = existing.path;
        return;
      }

      if (window.electronAPI) {
        try {
          const res = await window.electronAPI.readFile(filePath);
          const name = filePath.split(/[/\\]/).pop() || filePath;
          this.openFiles = [
            ...this.openFiles,
            {
              path: filePath,
              name,
              content: res.content,
              isDirty: false
            }
          ];
          this.activeFilePath = filePath;
        } catch (err) {
          console.error('Failed reading file:', err);
        }
      }
    },
    closeFile(rawPath: string) {
      const filePath = rawPath.replace(/\\/g, '/');
      this.openFiles = this.openFiles.filter((f) => f.path.replace(/\\/g, '/') !== filePath);
      if (this.activeFilePath.replace(/\\/g, '/') === filePath) {
        this.activeFilePath = this.openFiles.length > 0 ? this.openFiles[0].path : '';
      }
    },
    updateContent(rawPath: string, newContent: string) {
      const filePath = rawPath.replace(/\\/g, '/');
      const file = this.openFiles.find((f) => f.path.replace(/\\/g, '/') === filePath);
      if (file) {
        file.content = newContent;
        file.isDirty = true;
      }
    },
    async saveActiveFile() {
      const file = this.activeFile;
      if (!file || !window.electronAPI) return;
      try {
        await window.electronAPI.writeFile(file.path, file.content);
        file.isDirty = false;
      } catch (err) {
        console.error('Failed writing file:', err);
      }
    },
    createUntitledFile() {
      const id = Date.now().toString().slice(-4);
      const name = `Untitled-${id}.ts`;
      const path = `untitled_${id}.ts`;
      this.openFiles = [
        ...this.openFiles,
        {
          path,
          name,
          content: `// Bstudio Offline Editor\n// Start coding here. Press Ctrl+S to save.\n\nconsole.log("Hello from Bstudio!");\n`,
          isDirty: true
        }
      ];
      this.activeFilePath = path;
    },
    collapseAll() {
      const newMap: Record<string, boolean> = {};
      const markClosed = (nodes: FileNode[]) => {
        for (const n of nodes) {
          if (n.isDirectory) {
            newMap[n.path] = false;
            if (n.children) markClosed(n.children);
          }
        }
      };
      markClosed(this.fileTree);
      this.expandedFolders = newMap;
    },
    expandAll() {
      const newMap: Record<string, boolean> = {};
      const markOpen = (nodes: FileNode[]) => {
        for (const n of nodes) {
          if (n.isDirectory) {
            newMap[n.path] = true;
            if (n.children) markOpen(n.children);
          }
        }
      };
      markOpen(this.fileTree);
      this.expandedFolders = newMap;
    },
    isFolderOpen(path: string, defaultOpen: boolean = false): boolean {
      if (this.expandedFolders && this.expandedFolders[path] !== undefined) {
        return this.expandedFolders[path];
      }
      return defaultOpen;
    },
    toggleFolder(path: string, defaultOpen: boolean = false) {
      const current = this.isFolderOpen(path, defaultOpen);
      this.setFolderOpen(path, !current);
    },
    setFolderOpen(path: string, open: boolean) {
      this.expandedFolders = {
        ...this.expandedFolders,
        [path]: open
      };
    },
    async createItem(targetPath: string, isDirectory: boolean): Promise<boolean> {
      if (!window.electronAPI) return false;
      try {
        const res = await window.electronAPI.createItem(targetPath, isDirectory);
        if (res.success) {
          await this.fetchTree();
          if (!isDirectory) {
            await this.openFile(targetPath);
          }
          return true;
        } else {
          console.error('Create item failed:', res.error);
          return false;
        }
      } catch (err) {
        console.error('Create item error:', err);
        return false;
      }
    },
    async deleteItem(targetPath: string): Promise<boolean> {
      if (!window.electronAPI) return false;
      try {
        const res = await window.electronAPI.deleteItem(targetPath);
        if (res.success) {
          this.closeFile(targetPath);
          this.openFiles = this.openFiles.filter(
            (f) => !f.path.startsWith(targetPath + '/') && f.path !== targetPath
          );
          if (
            this.activeFilePath === targetPath ||
            this.activeFilePath.startsWith(targetPath + '/')
          ) {
            this.activeFilePath = this.openFiles.length > 0 ? this.openFiles[0].path : '';
          }
          await this.fetchTree();
          return true;
        }
        return false;
      } catch (err) {
        console.error('Delete item error:', err);
        return false;
      }
    },
    async renameItem(oldPath: string, newPath: string): Promise<boolean> {
      if (!window.electronAPI) return false;
      try {
        const res = await window.electronAPI.renameItem(oldPath, newPath);
        if (res.success) {
          const file = this.openFiles.find((f) => f.path === oldPath);
          if (file) {
            file.path = newPath;
            file.name = newPath.split('/').pop() || newPath;
          }
          if (this.activeFilePath === oldPath) {
            this.activeFilePath = newPath;
          }
          await this.fetchTree();
          return true;
        }
        return false;
      } catch (err) {
        console.error('Rename item error:', err);
        return false;
      }
    },
    async revealInExplorer(targetPath: string): Promise<boolean> {
      if (!window.electronAPI) return false;
      try {
        await window.electronAPI.revealInExplorer(targetPath);
        return true;
      } catch (err) {
        console.error('Reveal in explorer error:', err);
        return false;
      }
    }
  }
});
