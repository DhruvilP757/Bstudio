import { safeStorage, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export class SecureStorage {
  private storagePath: string;
  private cache: Map<string, string> = new Map();

  constructor() {
    const userData = app.getPath('userData');
    this.storagePath = path.join(userData, 'bstudio-secure-vault.bin');
    this.loadVault();
  }

  private loadVault(): void {
    if (!fs.existsSync(this.storagePath)) return;
    try {
      const encryptedBuffer = fs.readFileSync(this.storagePath);
      if (safeStorage.isEncryptionAvailable()) {
        const decryptedJson = safeStorage.decryptString(encryptedBuffer);
        const parsed = JSON.parse(decryptedJson);
        for (const [k, v] of Object.entries(parsed)) {
          this.cache.set(k, v as string);
        }
      }
    } catch (err) {
      console.warn('[SecureStorage] Failed to decrypt vault, initializing fresh:', err);
    }
  }

  private saveVault(): void {
    try {
      const obj: Record<string, string> = {};
      for (const [k, v] of this.cache.entries()) {
        obj[k] = v;
      }
      const rawJson = JSON.stringify(obj);
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(rawJson);
        fs.writeFileSync(this.storagePath, encrypted);
      } else {
        // Fallback for dev environments where OS keychain isn't configured
        fs.writeFileSync(this.storagePath + '.fallback', Buffer.from(rawJson).toString('base64'));
      }
    } catch (err) {
      console.error('[SecureStorage] Failed to persist vault:', err);
    }
  }

  public async setSecret(key: string, value: string): Promise<boolean> {
    this.cache.set(key, value);
    this.saveVault();
    return true;
  }

  public async getSecret(key: string): Promise<string | null> {
    return this.cache.get(key) || null;
  }
}
