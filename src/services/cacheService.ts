import fs from 'fs';
import path from 'path';

export interface CacheEntry<T> {
  data: T;
  expireAt: number;
}

class CacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private cacheDir: string;
  private isFsAvailable = false;

  constructor() {
    this.cacheDir = path.join(process.cwd(), '.cache');
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      this.isFsAvailable = true;
      console.log(`[CacheService] File-based persistent cache initialized at: ${this.cacheDir}`);
    } catch (error: any) {
      console.warn('[CacheService] File-system caching unavailable, falling back to memory-only:', error.message);
    }
  }

  private sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_\-]/g, '_');
  }

  private getFilePath(key: string): string {
    return path.join(this.cacheDir, `${this.sanitizeKey(key)}.json`);
  }

  public async get<T>(key: string): Promise<T | null> {
    const now = Date.now();

    // 1. Check in-memory first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      if (now < memoryEntry.expireAt) {
        return memoryEntry.data as T;
      } else {
        // Expired, remove from memory
        this.memoryCache.delete(key);
      }
    }

    // 2. Check disk if available
    if (this.isFsAvailable) {
      const filePath = this.getFilePath(key);
      try {
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const entry: CacheEntry<T> = JSON.parse(raw);
          
          if (now < entry.expireAt) {
            // Repopulate memory cache for successive ultra-fast lookups
            this.memoryCache.set(key, entry);
            return entry.data;
          } else {
            // Deleted expired file in background
            fs.unlinkSync(filePath);
          }
        }
      } catch (e: any) {
        console.warn(`[CacheService] Failed to read cached key: ${key}`, e.message);
      }
    }

    return null;
  }

  public async set<T>(key: string, data: T, ttlMs: number): Promise<void> {
    const expireAt = Date.now() + ttlMs;
    const entry: CacheEntry<T> = { data, expireAt };

    // 1. Save in memory
    this.memoryCache.set(key, entry);

    // 2. Save on disk
    if (this.isFsAvailable) {
      const filePath = this.getFilePath(key);
      try {
        fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
      } catch (e: any) {
        console.warn(`[CacheService] Failed to write cached key: ${key}`, e.message);
      }
    }
  }

  public async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);

    if (this.isFsAvailable) {
      const filePath = this.getFilePath(key);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e: any) {
        console.warn(`[CacheService] Failed to delete cached file for: ${key}`, e.message);
      }
    }
  }

  public async clear(): Promise<void> {
    this.memoryCache.clear();

    if (this.isFsAvailable) {
      try {
        const files = fs.readdirSync(this.cacheDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            fs.unlinkSync(path.join(this.cacheDir, file));
          }
        }
        console.log('[CacheService] Persistent cache cleared successfully.');
      } catch (e: any) {
        console.warn('[CacheService] Failed to clear persistent cache files:', e.message);
      }
    }
  }

  /**
   * Helper utility to perform automatic caching on any async operation.
   * If cache hit, returns it. If cache miss, executes the runner, caches, and returns.
   */
  public async wrap<T>(key: string, ttlMs: number, runner: () => Promise<T>): Promise<T> {
    try {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }
    } catch (err: any) {
      console.warn(`[CacheService] Wrap fetch checking failed for ${key}, proceeding with execution:`, err.message);
    }

    // Execute heavy operation
    const result = await runner();

    try {
      if (result !== undefined && result !== null) {
        await this.set<T>(key, result, ttlMs);
      }
    } catch (err: any) {
      console.warn(`[CacheService] Wrap set failed for ${key}:`, err.message);
    }

    return result;
  }
}

export const serverCache = new CacheService();
