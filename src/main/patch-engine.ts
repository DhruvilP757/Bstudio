import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { FilePatch, PatchResult, PatchBackupRecord } from '../shared/patch-types';

export class PatchEngine {
  private backupsDir: string;
  private backupHistory: Map<string, PatchBackupRecord> = new Map();

  constructor(private projectRoot: string) {
    this.backupsDir = path.join(this.projectRoot, '.devshell', 'backups');
    if (!fs.existsSync(this.backupsDir)) {
      fs.mkdirSync(this.backupsDir, { recursive: true });
    }
  }

  public setProjectRoot(root: string): void {
    this.projectRoot = root;
    this.backupsDir = path.join(this.projectRoot, '.devshell', 'backups');
    if (!fs.existsSync(this.backupsDir)) {
      fs.mkdirSync(this.backupsDir, { recursive: true });
    }
  }

  public applyPatch(patch: FilePatch): PatchResult {
    try {
      const resolvedPath = path.resolve(this.projectRoot, patch.filePath);

      // 1. Guard against path traversal outside the project root
      if (!resolvedPath.startsWith(this.projectRoot)) {
        return {
          success: false,
          error: `Security Violation: File path '${patch.filePath}' escapes workspace root.`
        };
      }

      // 2. Existence check
      if (!fs.existsSync(resolvedPath)) {
        return {
          success: false,
          error: `Target file not found on disk: ${patch.filePath}`
        };
      }

      const fileContent = fs.readFileSync(resolvedPath, 'utf8');

      // Normalize line endings to avoid CRLF / LF discrepancies
      const normalizedSearch = patch.searchBlock.replace(/\r\n/g, '\n');
      const normalizedFile = fileContent.replace(/\r\n/g, '\n');

      // 3. Unambiguous search verification
      const occurrences = normalizedFile.split(normalizedSearch).length - 1;
      if (occurrences === 0) {
        return {
          success: false,
          error: `Search block was not found in ${patch.filePath}. The file may have changed.`
        };
      }

      if (occurrences > 1) {
        return {
          success: false,
          error: `Search block matched ${occurrences} times in ${patch.filePath}. Search must be unambiguous (exactly 1 match).`
        };
      }

      // 4. Create pristine backup snapshot
      const timestamp = Date.now();
      const hash = crypto.randomBytes(4).toString('hex');
      const sanitizedBase = path.basename(patch.filePath).replace(/[^a-zA-Z0-9._-]/g, '_');
      const backupFileName = `${timestamp}_${hash}_${sanitizedBase}.bak`;
      const backupLocation = path.join(this.backupsDir, backupFileName);

      fs.writeFileSync(backupLocation, fileContent, 'utf8');

      const backupId = `bk_${timestamp}_${hash}`;
      this.backupHistory.set(backupId, {
        backupId,
        originalFilePath: resolvedPath,
        backupLocation,
        timestamp,
        searchBlock: patch.searchBlock,
        replaceBlock: patch.replaceBlock
      });

      // 5. Replace block
      const normalizedReplace = patch.replaceBlock.replace(/\r\n/g, '\n');
      const modifiedContent = normalizedFile.replace(normalizedSearch, normalizedReplace);

      // 6. Atomic write via temporary file swap
      const tmpPath = `${resolvedPath}.${hash}.tmp`;
      fs.writeFileSync(tmpPath, modifiedContent, 'utf8');
      fs.renameSync(tmpPath, resolvedPath);

      return {
        success: true,
        backupId,
        backupFilePath: backupLocation,
        modifiedFilePath: resolvedPath
      };
    } catch (err: any) {
      console.error('[PatchEngine] Patch execution failed:', err);
      return {
        success: false,
        error: err.message || 'Unknown error occurred while applying patch.'
      };
    }
  }

  public rollback(backupId: string): boolean {
    const record = this.backupHistory.get(backupId);
    if (!record) {
      console.error(`[PatchEngine] Rollback failed: Record ${backupId} not found.`);
      return false;
    }

    try {
      if (!fs.existsSync(record.backupLocation)) {
        console.error(`[PatchEngine] Backup snapshot missing from ${record.backupLocation}`);
        return false;
      }

      const backupContent = fs.readFileSync(record.backupLocation, 'utf8');
      fs.writeFileSync(record.originalFilePath, backupContent, 'utf8');
      return true;
    } catch (err) {
      console.error('[PatchEngine] Rollback write failed:', err);
      return false;
    }
  }
}
