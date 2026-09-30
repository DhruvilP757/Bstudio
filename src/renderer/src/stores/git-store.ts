import { defineStore } from 'pinia';
import { GitFileStatus, GitCommitItem, GitRepoStatus, GitDiffResult } from '../../../shared/git-types';

export const useGitStore = defineStore('git', {
  state: () => ({
    isRepo: false,
    branch: '',
    staged: [] as GitFileStatus[],
    unstaged: [] as GitFileStatus[],
    untracked: [] as GitFileStatus[],
    recentCommits: [] as GitCommitItem[],
    remoteUrl: '',
    isClean: true,
    isLoading: false,
    isOperating: false,
    commitMessage: '',
    selectedDiffFile: '' as string,
    diffContent: { unstaged: '', staged: '' } as GitDiffResult,
    lastError: '' as string | null,
    lastSuccess: '' as string | null,
  }),

  getters: {
    totalChangesCount: (state): number =>
      state.staged.length + state.unstaged.length + state.untracked.length,
    hasStaged: (state): boolean => state.staged.length > 0,
    hasChanges: (state): boolean =>
      state.staged.length > 0 || state.unstaged.length > 0 || state.untracked.length > 0,
  },

  actions: {
    async fetchStatus() {
      if (!window.electronAPI?.gitStatus) return;
      this.isLoading = true;
      try {
        const res: GitRepoStatus = await window.electronAPI.gitStatus();
        this.isRepo = res.isRepo;
        this.branch = res.branch;
        this.staged = res.staged || [];
        this.unstaged = res.unstaged || [];
        this.untracked = res.untracked || [];
        this.recentCommits = res.recentCommits || [];
        this.remoteUrl = res.remoteUrl || '';
        this.isClean = res.isClean;
      } catch (err: any) {
        console.error('[GitStore] Failed to fetch git status:', err);
      } finally {
        this.isLoading = false;
      }
    },

    async initRepo() {
      if (!window.electronAPI?.gitInit) return;
      this.isOperating = true;
      this.lastError = null;
      try {
        const res = await window.electronAPI.gitInit();
        if (res.success) {
          this.lastSuccess = 'Git repository initialized successfully!';
          await this.fetchStatus();
        } else {
          this.lastError = res.error || 'Failed to initialize Git repository.';
        }
      } catch (err: any) {
        this.lastError = err.message || 'Error initializing Git';
      } finally {
        this.isOperating = false;
      }
    },

    async stageFile(filePath?: string) {
      if (!window.electronAPI?.gitStage) return;
      this.isOperating = true;
      this.lastError = null;
      try {
        const res = await window.electronAPI.gitStage(filePath);
        if (res.success) {
          await this.fetchStatus();
          if (this.selectedDiffFile === filePath) {
            await this.loadDiff(filePath);
          }
        } else {
          this.lastError = res.error || 'Failed to stage file';
        }
      } catch (err: any) {
        this.lastError = err.message || 'Error staging file';
      } finally {
        this.isOperating = false;
      }
    },

    async unstageFile(filePath?: string) {
      if (!window.electronAPI?.gitUnstage) return;
      this.isOperating = true;
      this.lastError = null;
      try {
        const res = await window.electronAPI.gitUnstage(filePath);
        if (res.success) {
          await this.fetchStatus();
          if (this.selectedDiffFile === filePath) {
            await this.loadDiff(filePath);
          }
        } else {
          this.lastError = res.error || 'Failed to unstage file';
        }
      } catch (err: any) {
        this.lastError = err.message || 'Error unstaging file';
      } finally {
        this.isOperating = false;
      }
    },

    async commitCurrent() {
      if (!window.electronAPI?.gitCommit) return;
      if (!this.commitMessage.trim()) {
        this.lastError = 'Please enter a commit message.';
        return;
      }
      this.isOperating = true;
      this.lastError = null;
      this.lastSuccess = null;
      try {
        // If nothing staged but unstaged/untracked exists, automatically stage all
        if (this.staged.length === 0 && (this.unstaged.length > 0 || this.untracked.length > 0)) {
          await window.electronAPI.gitStage();
        }
        const res = await window.electronAPI.gitCommit(this.commitMessage.trim());
        if (res.success) {
          this.commitMessage = '';
          this.lastSuccess = 'Committed changes successfully!';
          this.selectedDiffFile = '';
          this.diffContent = { unstaged: '', staged: '' };
          await this.fetchStatus();
        } else {
          this.lastError = res.error || 'Commit failed';
        }
      } catch (err: any) {
        this.lastError = err.message || 'Error creating commit';
      } finally {
        this.isOperating = false;
      }
    },

    async pushRemote() {
      if (!window.electronAPI?.gitPush) return;
      this.isOperating = true;
      this.lastError = null;
      this.lastSuccess = null;
      try {
        const res = await window.electronAPI.gitPush();
        if (res.success) {
          this.lastSuccess = 'Pushed commits to remote repository!';
          await this.fetchStatus();
        } else {
          this.lastError = res.error || 'Git push failed. Ensure origin remote is configured.';
        }
      } catch (err: any) {
        this.lastError = err.message || 'Push error';
      } finally {
        this.isOperating = false;
      }
    },

    async pullRemote() {
      if (!window.electronAPI?.gitPull) return;
      this.isOperating = true;
      this.lastError = null;
      this.lastSuccess = null;
      try {
        const res = await window.electronAPI.gitPull();
        if (res.success) {
          this.lastSuccess = 'Pulled latest changes from remote!';
          await this.fetchStatus();
        } else {
          this.lastError = res.error || 'Git pull failed.';
        }
      } catch (err: any) {
        this.lastError = err.message || 'Pull error';
      } finally {
        this.isOperating = false;
      }
    },

    async loadDiff(filePath?: string) {
      if (!window.electronAPI?.gitDiff) return;
      try {
        this.selectedDiffFile = filePath || '';
        const res = await window.electronAPI.gitDiff(filePath);
        this.diffContent = res;
      } catch (err) {
        console.error('[GitStore] Failed to load diff:', err);
      }
    },

    clearAlerts() {
      this.lastError = null;
      this.lastSuccess = null;
    }
  }
});
