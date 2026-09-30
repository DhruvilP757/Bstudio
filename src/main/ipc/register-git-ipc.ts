import { ipcMain, BrowserWindow } from 'electron';
import { exec } from 'child_process';
import * as path from 'path';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { GitFileStatus, GitRepoStatus, GitActionResult, GitDiffResult } from '../../shared/git-types';

export function registerGitIpc(getProjectRoot: () => string, mainWindow: BrowserWindow): void {
  const runGit = (command: string): Promise<{ stdout: string; stderr: string }> => {
    const cwd = getProjectRoot();
    return new Promise((resolve, reject) => {
      exec(command, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          // If git command fails, reject with details
          reject({ err, stderr: stderr.trim(), stdout: stdout.trim() });
        } else {
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        }
      });
    });
  };

  // 1. Git Status
  ipcMain.handle(IPC_CHANNELS.GIT_STATUS, async (): Promise<GitRepoStatus> => {
    try {
      // Check if git repo
      await runGit('git rev-parse --is-inside-work-tree');
    } catch {
      return {
        isRepo: false,
        branch: '',
        staged: [],
        unstaged: [],
        untracked: [],
        recentCommits: [],
        remoteUrl: '',
        isClean: true
      };
    }

    let branch = 'main';
    try {
      const bRes = await runGit('git branch --show-current');
      branch = bRes.stdout || 'HEAD (detached)';
    } catch {}

    let remoteUrl = '';
    try {
      const rRes = await runGit('git remote get-url origin');
      remoteUrl = rRes.stdout;
    } catch {}

    const staged: GitFileStatus[] = [];
    const unstaged: GitFileStatus[] = [];
    const untracked: GitFileStatus[] = [];

    try {
      const statusRes = await runGit('git status --porcelain=v1 -uall');
      const lines = statusRes.stdout.split('\n').filter(Boolean);

      for (const line of lines) {
        if (line.length < 4) continue;
        const x = line[0];
        const y = line[1];
        const filePath = line.substring(3).trim().replace(/^"|"$/g, '');
        const name = path.basename(filePath);

        if (x === '?' && y === '?') {
          untracked.push({ path: filePath, name, status: 'untracked', staged: false });
        } else {
          // Index status (X)
          if (x !== ' ' && x !== '?') {
            const st: GitFileStatus['status'] = x === 'M' ? 'modified' : x === 'A' ? 'added' : x === 'D' ? 'deleted' : 'renamed';
            staged.push({ path: filePath, name, status: st, staged: true });
          }
          // Working tree status (Y)
          if (y !== ' ' && y !== '?') {
            const st: GitFileStatus['status'] = y === 'M' ? 'modified' : y === 'D' ? 'deleted' : 'renamed';
            unstaged.push({ path: filePath, name, status: st, staged: false });
          }
        }
      }
    } catch {}

    const recentCommits: Array<{ hash: string; message: string; author: string; time: string }> = [];
    try {
      const logRes = await runGit('git log -n 8 --pretty=format:"%h|%s|%an|%ar"');
      const logLines = logRes.stdout.split('\n').filter(Boolean);
      for (const l of logLines) {
        const [hash, message, author, time] = l.split('|');
        if (hash && message) {
          recentCommits.push({ hash, message, author: author || '', time: time || '' });
        }
      }
    } catch {}

    return {
      isRepo: true,
      branch,
      staged,
      unstaged,
      untracked,
      recentCommits,
      remoteUrl,
      isClean: staged.length === 0 && unstaged.length === 0 && untracked.length === 0
    };
  });

  // 2. Git Init
  ipcMain.handle(IPC_CHANNELS.GIT_INIT, async () => {
    try {
      const res = await runGit('git init');
      return { success: true, output: res.stdout };
    } catch (err: any) {
      return { success: false, error: err.stderr || err.err?.message || 'Failed git init' };
    }
  });

  // 3. Git Stage
  ipcMain.handle(IPC_CHANNELS.GIT_STAGE, async (_, filePath?: string) => {
    try {
      if (filePath) {
        await runGit(`git add "${filePath}"`);
      } else {
        await runGit('git add -A');
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.stderr || 'Failed to stage file' };
    }
  });

  // 4. Git Unstage
  ipcMain.handle(IPC_CHANNELS.GIT_UNSTAGE, async (_, filePath?: string) => {
    try {
      if (filePath) {
        await runGit(`git restore --staged "${filePath}"`);
      } else {
        await runGit('git restore --staged .');
      }
      return { success: true };
    } catch {
      // Fallback for older Git versions
      try {
        if (filePath) {
          await runGit(`git reset HEAD "${filePath}"`);
        } else {
          await runGit('git reset HEAD');
        }
        return { success: true };
      } catch (err2: any) {
        return { success: false, error: err2.stderr || 'Failed to unstage' };
      }
    }
  });

  // 5. Git Commit
  ipcMain.handle(IPC_CHANNELS.GIT_COMMIT, async (_, message: string) => {
    if (!message || !message.trim()) {
      return { success: false, error: 'Commit message cannot be empty' };
    }
    try {
      // Escape double quotes for shell
      const escapedMsg = message.replace(/"/g, '\\"');
      const res = await runGit(`git commit -m "${escapedMsg}"`);
      return { success: true, output: res.stdout };
    } catch (err: any) {
      return { success: false, error: err.stderr || err.stdout || 'Commit failed' };
    }
  });

  // 6. Git Push
  ipcMain.handle(IPC_CHANNELS.GIT_PUSH, async () => {
    try {
      const res = await runGit('git push');
      return { success: true, output: res.stdout || res.stderr };
    } catch (err: any) {
      return { success: false, error: err.stderr || err.stdout || 'Push failed' };
    }
  });

  // 7. Git Pull
  ipcMain.handle(IPC_CHANNELS.GIT_PULL, async () => {
    try {
      const res = await runGit('git pull');
      return { success: true, output: res.stdout || res.stderr };
    } catch (err: any) {
      return { success: false, error: err.stderr || err.stdout || 'Pull failed' };
    }
  });

  // 8. Git Diff
  ipcMain.handle(IPC_CHANNELS.GIT_DIFF, async (_, filePath?: string) => {
    try {
      const target = filePath ? `"${filePath}"` : '';
      const unstagedDiff = await runGit(`git diff ${target}`);
      const stagedDiff = await runGit(`git diff --cached ${target}`);
      return {
        unstaged: unstagedDiff.stdout,
        staged: stagedDiff.stdout
      };
    } catch {
      return { unstaged: '', staged: '' };
    }
  });
}
