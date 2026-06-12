import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc, getDocs, collection, writeBatch } from 'firebase/firestore';

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

  /**
   * Generates a safe, fixed-length 32-character MD5 hash for any key.
   * This handles spaces, slashes, Jikan URL strings, special characters, and length limits beautifully.
   */
  private getCacheDocId(key: string): string {
    return crypto.createHash('md5').update(key).digest('hex');
  }

  private getFilePath(keyDocId: string): string {
    return path.join(this.cacheDir, `${keyDocId}.json`);
  }

  public async get<T>(key: string): Promise<T | null> {
    const now = Date.now();
    const keyDocId = this.getCacheDocId(key);

    // 1. Check in-memory first (Layer 1 - <1ms)
    const memoryEntry = this.memoryCache.get(keyDocId);
    if (memoryEntry) {
      if (now < memoryEntry.expireAt) {
        return memoryEntry.data as T;
      } else {
        this.memoryCache.delete(keyDocId);
      }
    }

    // 2. Check disk if available (Layer 2 - ~5ms)
    if (this.isFsAvailable) {
      const filePath = this.getFilePath(keyDocId);
      try {
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const entry: CacheEntry<T> = JSON.parse(raw);
          
          if (now < entry.expireAt) {
            // Repopulate memory cache for successive ultra-fast lookups
            this.memoryCache.set(keyDocId, entry);
            return entry.data;
          } else {
            // Delete expired file in background
            fs.unlinkSync(filePath);
          }
        }
      } catch (e: any) {
        console.warn(`[CacheService] Failed to read cached file: ${keyDocId}`, e.message);
      }
    }

    // 3. Check Cloud Firestore if configured and available (Layer 3 - ~50-150ms)
    try {
      if (db) {
        const docRef = doc(db, 'server_cache', keyDocId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const entry = snapshot.data() as CacheEntry<T>;
          if (now < entry.expireAt) {
            // Save to Layer 1 (Memory)
            this.memoryCache.set(keyDocId, entry);
            // Save to Layer 2 (Disk)
            if (this.isFsAvailable) {
              const filePath = this.getFilePath(keyDocId);
              fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
            }
            return entry.data;
          } else {
            // Delete expired document from Cloud Cache in background
            deleteDoc(docRef).catch(() => {});
          }
        }
      }
    } catch (e: any) {
      // Graceful fallback: warning only, don't crash the server/requests
      console.warn(`[CacheService] Cloud Cache lookup failed for key "${key}" (falling back to local):`, e.message);
    }

    return null;
  }

  public async set<T>(key: string, data: T, ttlMs: number): Promise<void> {
    const expireAt = Date.now() + ttlMs;
    const entry: CacheEntry<T> = { data, expireAt };
    const keyDocId = this.getCacheDocId(key);

    // 1. Save in memory (Layer 1)
    this.memoryCache.set(keyDocId, entry);

    // 2. Save on disk (Layer 2)
    if (this.isFsAvailable) {
      const filePath = this.getFilePath(keyDocId);
      try {
        fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
      } catch (e: any) {
        console.warn(`[CacheService] Failed to write cached file on disk: ${keyDocId}`, e.message);
      }
    }

    // 3. Save in Cloud Firestore (Layer 3)
    try {
      if (db) {
        const docRef = doc(db, 'server_cache', keyDocId);
        await setDoc(docRef, entry);
      }
    } catch (e: any) {
      console.warn(`[CacheService] Cloud Cache set failed for key "${key}" (offline or quota exceeded):`, e.message);
    }
  }

  public async delete(key: string): Promise<void> {
    const keyDocId = this.getCacheDocId(key);
    this.memoryCache.delete(keyDocId);

    if (this.isFsAvailable) {
      const filePath = this.getFilePath(keyDocId);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e: any) {
        console.warn(`[CacheService] Failed to delete cached file for: ${keyDocId}`, e.message);
      }
    }

    try {
      if (db) {
        const docRef = doc(db, 'server_cache', keyDocId);
        await deleteDoc(docRef);
      }
    } catch (e: any) {
      console.warn(`[CacheService] Cloud Cache delete failed for: ${key}`, e.message);
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
        console.log('[CacheService] Persistent local cache cleared successfully.');
      } catch (e: any) {
        console.warn('[CacheService] Failed to clear persistent cache files:', e.message);
      }
    }

    try {
      if (db) {
        // Fetch all cache entries and perform batch delete
        const cacheCollection = collection(db, 'server_cache');
        const snapshot = await getDocs(cacheCollection);
        if (!snapshot.empty) {
          const batch = writeBatch(db);
          snapshot.docs.forEach((docSnap) => {
            batch.delete(docSnap.ref);
          });
          await batch.commit();
          console.log('[CacheService] Cloud cache cleared successfully.');
        }
      }
    } catch (e: any) {
      console.warn('[CacheService] Failed to clear Cloud cache (offline or quota exceeded):', e.message);
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
