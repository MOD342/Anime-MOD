interface CacheWrapper<T> {
  data: T;
  expireAt: number;
}

export const clientCache = {
  /**
   * Get a cached item. If expired, returns null.
   */
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const parsed: CacheWrapper<T> = JSON.parse(raw);
      if (Date.now() < parsed.expireAt) {
        return parsed.data;
      } else {
        // Remove expired client item
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[ClientCache] Error reading key "${key}"`, e);
    }
    return null;
  },

  /**
   * Set cache item with a TTL (default to 1 hour).
   */
  set<T>(key: string, data: T, ttlMs: number = 60 * 60 * 1000): void {
    try {
      const wrapper: CacheWrapper<T> = {
        data,
        expireAt: Date.now() + ttlMs,
      };
      localStorage.setItem(key, JSON.stringify(wrapper));
    } catch (e) {
      console.warn(`[ClientCache] Error writing key "${key}"`, e);
      // Clean up oldest items if storage is full
      this.clearExpired();
    }
  },

  /**
   * Remove a specific cached item
   */
  delete(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(e);
    }
  },

  /**
   * Clears all cache items matching a pattern
   */
  clearPrefix(prefix: string): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.error(e);
    }
  },

  /**
   * Clears old, expired items to free up browser storage
   */
  clearExpired(): void {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed.expireAt === 'number' && now >= parsed.expireAt) {
                keysToRemove.push(key);
              }
            }
          } catch {
            // Not our cache format, ignore
          }
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.error(e);
    }
  },

  /**
   * Clear the entire cache
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (e) {
      console.error(e);
    }
  },

  /**
   * Helper to perform a fetch with LocalStale-While-Revalidate caching pattern.
   * Returns old data fast, then fetches fresh data.
   */
  async fetchWithRevalidate<T>(
    key: string,
    url: string,
    onSuccess: (data: T) => void,
    ttlMs: number = 5 * 60 * 1000
  ): Promise<T | null> {
    const cached = this.get(key) as T | null;
    
    // If cached data exists, push it back first for instant visual feed
    if (cached !== null) {
      onSuccess(cached);
    }

    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json && json.success) {
        const freshData = json.data;
        this.set(key, freshData, ttlMs);
        onSuccess(freshData);
        return freshData;
      }
    } catch (err) {
      console.error(`[ClientCache] Background fetch failed for ${url}`, err);
    }

    return cached;
  }
};
