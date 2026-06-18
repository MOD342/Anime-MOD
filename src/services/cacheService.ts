import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import IORedis from 'ioredis';
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
  private enableCloud = false; // Disable Cloud Firestore cache writes to prevent PERMISSION_DENIED and preserve quota
  
  // Redis Caching Engine variables
  private isRedisAvailable = false;
  private redisClient: IORedis | null = null;

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

    this.initRedisCache();
  }

  private initRedisCache() {
    const redisHost = process.env.REDIS_HOST || '127.0.0.1';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379');

    try {
      this.redisClient = new IORedis({
        host: redisHost,
        port: redisPort,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          // Retry reconnection with progressive backoff, max out at 15 seconds
          return Math.min(times * 2000, 15000);
        }
      });

      this.redisClient.on('connect', () => {
        this.isRedisAvailable = true;
        console.log(`[CacheService] Redis Cache connected successfully at redis://${redisHost}:${redisPort} ✔`);
      });

      this.redisClient.on('error', (err) => {
        if (this.isRedisAvailable) {
          this.isRedisAvailable = false;
          console.log('[CacheService] Redis Cache offline/disconnected. Smoothly falling back to file/memory cache levels.');
        }
      });
    } catch (err: any) {
      this.isRedisAvailable = false;
      console.warn('[CacheService] Failed to establish Redis client connection:', err.message);
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

  public async get<T>(key: string, allowStale = false): Promise<T | null> {
    const now = Date.now();
    const keyDocId = this.getCacheDocId(key);

    // 1. Check in-memory first (Layer 1 - <1ms)
    const memoryEntry = this.memoryCache.get(keyDocId);
    if (memoryEntry) {
      if (allowStale || now < memoryEntry.expireAt) {
        return memoryEntry.data as T;
      } else {
        this.memoryCache.delete(keyDocId);
      }
    }

    // 2. Check Redis if available (Layer 2 - ~1-2ms)
    if (this.isRedisAvailable && this.redisClient) {
      try {
        const redisKey = `cache:${keyDocId}`;
        const raw = await this.redisClient.get(redisKey);
        if (raw) {
          const entry: CacheEntry<T> = JSON.parse(raw);
          if (allowStale || now < entry.expireAt) {
            // Repopulate memory cache for successive ultra-fast lookups
            this.memoryCache.set(keyDocId, entry);
            return entry.data;
          } else {
            // Delete expired key in background
            this.redisClient.del(redisKey).catch(() => {});
          }
        }
      } catch (e: any) {
        console.warn(`[CacheService] Failed to read cached Redis key: ${keyDocId}`, e.message);
      }
    }

    // 3. Check disk if available (Layer 3 - ~5ms)
    if (this.isFsAvailable) {
      const filePath = this.getFilePath(keyDocId);
      try {
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const entry: CacheEntry<T> = JSON.parse(raw);
          
          if (allowStale || now < entry.expireAt) {
            // Repopulate memory cache for successive ultra-fast lookups
            this.memoryCache.set(keyDocId, entry);
            // Save to Redis if available
            if (this.isRedisAvailable && this.redisClient) {
              const redisKey = `cache:${keyDocId}`;
              const expireInSec = Math.ceil((entry.expireAt - Date.now()) / 1000);
              if (expireInSec > 0) {
                await this.redisClient.set(redisKey, JSON.stringify(entry), 'EX', expireInSec + 86400); // Add 24 hours padding for stale fallback
              }
            }
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

    // 4. Check Cloud Firestore if configured and available (Layer 4 - ~50-150ms)
    if (this.enableCloud) {
      try {
        if (db) {
          const docRef = doc(db, 'server_cache', keyDocId);
          const snapshot = await getDoc(docRef);
          if (snapshot.exists()) {
            const entry = snapshot.data() as CacheEntry<T>;
            if (allowStale || now < entry.expireAt) {
              // Save to Layer 1 (Memory)
              this.memoryCache.set(keyDocId, entry);
              // Save to Redis (Layer 2)
              if (this.isRedisAvailable && this.redisClient) {
                const redisKey = `cache:${keyDocId}`;
                const expireInSec = Math.ceil((entry.expireAt - Date.now()) / 1000);
                if (expireInSec > 0) {
                  await this.redisClient.set(redisKey, JSON.stringify(entry), 'EX', expireInSec + 86400);
                }
              }
              // Save to Layer 3 (Disk)
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
    }

    return null;
  }

  public async set<T>(key: string, data: T, ttlMs: number): Promise<void> {
    const expireAt = Date.now() + ttlMs;
    const entry: CacheEntry<T> = { data, expireAt };
    const keyDocId = this.getCacheDocId(key);

    // 1. Save in memory (Layer 1)
    this.memoryCache.set(keyDocId, entry);

    // 2. Save in Redis (Layer 2 - Shared Cache)
    if (this.isRedisAvailable && this.redisClient) {
      const redisKey = `cache:${keyDocId}`;
      try {
        // Give Redis cache 2x the normal TTL to accommodate the system's stale fallback/background refresh strategy
        const expireInSec = Math.max(Math.ceil((ttlMs * 2) / 1000), 120);
        await this.redisClient.set(redisKey, JSON.stringify(entry), 'EX', expireInSec);
      } catch (e: any) {
        console.warn(`[CacheService] Failed to write cached key to Redis: ${keyDocId}`, e.message);
      }
    }

    // 3. Save on disk (Layer 3)
    if (this.isFsAvailable) {
      const filePath = this.getFilePath(keyDocId);
      try {
        fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
      } catch (e: any) {
        console.warn(`[CacheService] Failed to write cached file on disk: ${keyDocId}`, e.message);
      }
    }

    // 4. Save in Cloud Firestore (Layer 4)
    if (this.enableCloud) {
      try {
        if (db) {
          const docRef = doc(db, 'server_cache', keyDocId);
          await setDoc(docRef, entry);
        }
      } catch (e: any) {
        console.warn(`[CacheService] Cloud Cache set failed for key "${key}" (offline or quota exceeded):`, e.message);
      }
    }
  }

  public async delete(key: string): Promise<void> {
    const keyDocId = this.getCacheDocId(key);
    this.memoryCache.delete(keyDocId);

    if (this.isRedisAvailable && this.redisClient) {
      const redisKey = `cache:${keyDocId}`;
      try {
        await this.redisClient.del(redisKey);
      } catch (e: any) {
        console.warn(`[CacheService] Failed to delete cache key from Redis: ${keyDocId}`, e.message);
      }
    }

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

    if (this.enableCloud) {
      try {
        if (db) {
          const docRef = doc(db, 'server_cache', keyDocId);
          await deleteDoc(docRef);
        }
      } catch (e: any) {
        console.warn(`[CacheService] Cloud Cache delete failed for: ${key}`, e.message);
      }
    }
  }

  public async clear(): Promise<void> {
    this.memoryCache.clear();

    if (this.isRedisAvailable && this.redisClient) {
      try {
        let cursor = '0';
        do {
          const reply = await this.redisClient.scan(cursor, 'MATCH', 'cache:*', 'COUNT', 100);
          cursor = reply[0];
          const keys = reply[1];
          if (keys && keys.length > 0) {
            await this.redisClient.del(...keys);
          }
        } while (cursor !== '0');
        console.log('[CacheService] Redis cache keys cleared successfully.');
      } catch (e: any) {
        console.warn('[CacheService] Failed to clear Redis cache keys:', e.message);
      }
    }

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

    if (this.enableCloud) {
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
