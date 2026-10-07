import { ipcMain, BrowserWindow, dialog, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { FileNode } from '../../shared/fs-types';
import { ViewManager } from '../view-manager';

export function registerFsIpc(
  projectRoot: string,
  mainWindow: BrowserWindow,
  viewManager: ViewManager
): { getProjectRoot: () => string } {
  let currentProjectRoot = projectRoot;

  let isFolderDialogOpen = false;
  let isFileDialogOpen = false;

  ipcMain.handle(IPC_CHANNELS.FS_OPEN_FOLDER, async () => {
    if (isFolderDialogOpen) return { canceled: true };
    isFolderDialogOpen = true;
    try {
      const result = await dialog.showOpenDialog({
        title: 'Open Folder in Bstudio',
        properties: ['openDirectory', 'createDirectory'],
        defaultPath: fs.existsSync(currentProjectRoot) ? currentProjectRoot : undefined
      });
      if (result.canceled || !result.filePaths.length) {
        return { canceled: true };
      }
      const selectedFolder = result.filePaths[0];
      currentProjectRoot = selectedFolder;
      return {
        canceled: false,
        folderPath: selectedFolder,
        folderName: path.basename(selectedFolder)
      };
    } catch (err: any) {
      console.error('[FS IPC] Open folder dialog error:', err);
      return { canceled: true, error: err.message };
    } finally {
      isFolderDialogOpen = false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_OPEN_FILE, async () => {
    if (isFileDialogOpen) return { canceled: true };
    isFileDialogOpen = true;
    try {
      const result = await dialog.showOpenDialog({
        title: 'Open File in Bstudio',
        properties: ['openFile'],
        defaultPath: fs.existsSync(currentProjectRoot) ? currentProjectRoot : undefined
      });
      if (result.canceled || !result.filePaths.length) {
        return { canceled: true };
      }
      const selectedFile = result.filePaths[0];
      const content = fs.readFileSync(selectedFile, 'utf8');
      const rel = path.relative(currentProjectRoot, selectedFile).replace(/\\/g, '/');
      return {
        canceled: false,
        filePath: selectedFile,
        relativePath: rel.startsWith('..') ? selectedFile : rel,
        name: path.basename(selectedFile),
        content
      };
    } catch (err: any) {
      console.error('[FS IPC] Open file dialog error:', err);
      return { canceled: true, error: err.message };
    } finally {
      isFileDialogOpen = false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_GET_TREE, async (_, relativeSubdir: string = '') => {
    const targetDir = path.resolve(currentProjectRoot, relativeSubdir);

    function scanDirectory(currentPath: string, depth = 0): FileNode[] {
      if (depth > 5) return [];
      try {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        const nodes: FileNode[] = [];

        for (const entry of entries) {
          if (
            entry.name.startsWith('.') ||
            entry.name === 'node_modules' ||
            entry.name === 'dist' ||
            entry.name === 'release' ||
            entry.name === 'build'
          ) {
            continue;
          }

          const fullPath = path.join(currentPath, entry.name);
          const relativeFilePath = path.relative(currentProjectRoot, fullPath).replace(/\\/g, '/');

          if (entry.isDirectory()) {
            nodes.push({
              name: entry.name,
              path: relativeFilePath,
              isDirectory: true,
              children: scanDirectory(fullPath, depth + 1)
            });
          } else {
            const ext = path.extname(entry.name).toLowerCase();
            const stats = fs.statSync(fullPath);
            nodes.push({
              name: entry.name,
              path: relativeFilePath,
              isDirectory: false,
              size: stats.size,
              extension: ext
            });
          }
        }

        return nodes.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
      } catch (err) {
        return [];
      }
    }

    return scanDirectory(targetDir);
  });

  ipcMain.handle(IPC_CHANNELS.FS_READ_FILE, async (_, relativePath: string) => {
    const resolvedPath = path.isAbsolute(relativePath)
      ? relativePath
      : path.resolve(currentProjectRoot, relativePath);
    const content = fs.readFileSync(resolvedPath, 'utf8');
    return {
      filePath: relativePath,
      content
    };
  });

  ipcMain.handle(IPC_CHANNELS.FS_WRITE_FILE, async (_, { filePath, content }) => {
    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(currentProjectRoot, filePath);

    // Auto backup before saving
    const backupsDir = path.join(currentProjectRoot, '.devshell', 'backups');
    try {
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }
      if (fs.existsSync(resolvedPath)) {
        const orig = fs.readFileSync(resolvedPath, 'utf8');
        const backupFile = path.join(backupsDir, `${Date.now()}_save_${path.basename(filePath)}.bak`);
        fs.writeFileSync(backupFile, orig, 'utf8');
      }
    } catch {}

    fs.writeFileSync(resolvedPath, content, 'utf8');
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.FS_CREATE_ITEM, async (_, { targetPath, isDirectory }) => {
    try {
      const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(currentProjectRoot, targetPath);
      if (isDirectory) {
        fs.mkdirSync(resolved, { recursive: true });
      } else {
        fs.mkdirSync(path.dirname(resolved), { recursive: true });
        if (!fs.existsSync(resolved)) {
          fs.writeFileSync(resolved, '', 'utf8');
        }
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_DELETE_ITEM, async (_, targetPath: string) => {
    try {
      const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(currentProjectRoot, targetPath);
      if (fs.existsSync(resolved)) {
        fs.rmSync(resolved, { recursive: true, force: true });
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_RENAME_ITEM, async (_, { oldPath, newPath }) => {
    try {
      const oldResolved = path.isAbsolute(oldPath) ? oldPath : path.resolve(currentProjectRoot, oldPath);
      const newResolved = path.isAbsolute(newPath) ? newPath : path.resolve(currentProjectRoot, newPath);
      fs.renameSync(oldResolved, newResolved);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FS_REVEAL_ITEM, async (_, targetPath: string) => {
    try {
      const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(currentProjectRoot, targetPath);
      shell.showItemInFolder(resolved);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DEVTOOLS_TOGGLE, async () => {
    viewManager.toggleDevTools();
  });

  return {
    getProjectRoot: () => currentProjectRoot
  };
}
