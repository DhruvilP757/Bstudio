import { DiagnosticDomain } from './telemetry-types';

export interface FilePatch {
  id: string;
  filePath: string;         // Relative to workspace root, e.g. "src/components/Header.vue"
  searchBlock: string;      // The EXACT block of code to match on disk
  replaceBlock: string;     // The new replacement code block
  rationale: string;        // Nemotron explanation for why this edit fixes the bug
  targetDomain: DiagnosticDomain;
}

export interface PatchResult {
  success: boolean;
  backupId?: string;
  backupFilePath?: string;
  error?: string;
  modifiedFilePath?: string;
}

export interface PatchBackupRecord {
  backupId: string;
  originalFilePath: string;
  backupLocation: string;
  timestamp: number;
  searchBlock: string;
  replaceBlock: string;
}
