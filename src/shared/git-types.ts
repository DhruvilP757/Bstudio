export interface GitFileStatus {
  path: string;
  name: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed';
  staged: boolean;
}

export interface GitCommitItem {
  hash: string;
  message: string;
  author: string;
  time: string;
}

export interface GitRepoStatus {
  isRepo: boolean;
  branch: string;
  staged: GitFileStatus[];
  unstaged: GitFileStatus[];
  untracked: GitFileStatus[];
  recentCommits: GitCommitItem[];
  remoteUrl: string;
  isClean: boolean;
}

export interface GitActionResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface GitDiffResult {
  unstaged: string;
  staged: string;
}
