import { db } from '../firebase';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, serverTimestamp, increment } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../firebaseUtils';

export interface CustomList {
  id: string;
  name: string;
  createdAt: any;
}

export type MainListStatus = 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped' | 'none';

export interface AnimeEntry {
  id: string; // Document ID is animeId
  title: string;
  posterUrl: string;
  releaseYear: string;
  status: MainListStatus;
  customLists: Record<string, boolean>;
  score?: number;
  isFavorite?: boolean;
  watchedEpisodes?: number[];
  addedAt: any;
  updatedAt: any;
  episodesCount?: number;
  progress?: number;
}

export function getAnimeRewards(episodesCount: number) {
  const eps = episodesCount > 0 ? episodesCount : 12;
  let xp = 250;
  let coins = 50;

  if (eps <= 1) {
    xp = 80;
    coins = 15;
  } else if (eps <= 5) {
    xp = 130;
    coins = 25;
  } else if (eps <= 13) {
    xp = 250;
    coins = 50;
  } else if (eps <= 26) {
    xp = 450;
    coins = 90;
  } else {
    const extraEps = eps - 26;
    xp = 450 + extraEps * 10;
    coins = 90 + Math.floor(extraEps * 1.5);
    
    if (xp > 5000) xp = 5000;
    if (coins > 1000) coins = 1000;
  }

  return { xp, coins };
}

// Memory caches for scaling and high-performance deduplication (9999+ users ready)
const customListsCache = new Map<string, { data: CustomList[]; expireAt: number }>();
const animeEntriesCache = new Map<string, { data: AnimeEntry[]; expireAt: number }>();
const appRatingCache = new Map<string, { data: { score: number; count: number }; expireAt: number }>();

// In-flight promise caches to completely deduplicate parallel reads
const customListsPromises = new Map<string, Promise<CustomList[]>>();
const animeEntriesPromises = new Map<string, Promise<AnimeEntry[]>>();
const appRatingPromises = new Map<string, Promise<{ score: number; count: number }>>();

export const listService = {
  getCustomLists: async (uid: string): Promise<CustomList[]> => {
    const now = Date.now();
    const cached = customListsCache.get(uid);
    if (cached && now < cached.expireAt) {
      return cached.data;
    }

    let activePromise = customListsPromises.get(uid);
    if (!activePromise) {
      activePromise = (async () => {
        try {
          const q = collection(db, 'users', uid, 'customLists');
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomList));
          customListsCache.set(uid, { data, expireAt: Date.now() + 15 * 1000 }); // 15 seconds cache
          return data;
        } catch (e) {
          handleFirestoreError(e, OperationType.LIST, `users/${uid}/customLists`);
          return [];
        } finally {
          customListsPromises.delete(uid);
        }
      })();
      customListsPromises.set(uid, activePromise);
    }
    return activePromise;
  },

  createCustomList: async (uid: string, name: string): Promise<string> => {
    try {
      const listId = 'list_' + Date.now();
      const ref = doc(db, 'users', uid, 'customLists', listId);
      await setDoc(ref, {
        name,
        createdAt: serverTimestamp(),
      });
      // Invalidate cache
      customListsCache.delete(uid);
      return listId;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${uid}/customLists`);
      throw e;
    }
  },

  deleteCustomList: async (uid: string, listId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'users', uid, 'customLists', listId));
      // Invalidate cache
      customListsCache.delete(uid);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${uid}/customLists/${listId}`);
      throw e;
    }
  },

  getAnimeEntries: async (uid: string): Promise<AnimeEntry[]> => {
    const now = Date.now();
    const cached = animeEntriesCache.get(uid);
    if (cached && now < cached.expireAt) {
      return cached.data;
    }

    let activePromise = animeEntriesPromises.get(uid);
    if (!activePromise) {
      activePromise = (async () => {
        try {
          const q = collection(db, 'users', uid, 'animeEntries');
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnimeEntry));
          animeEntriesCache.set(uid, { data, expireAt: Date.now() + 10 * 1000 }); // 10 seconds cache
          return data;
        } catch (e) {
          handleFirestoreError(e, OperationType.LIST, `users/${uid}/animeEntries`);
          return [];
        } finally {
          animeEntriesPromises.delete(uid);
        }
      })();
      animeEntriesPromises.set(uid, activePromise);
    }
    return activePromise;
  },

  getAnimeAppRating: async (animeId: string): Promise<{score: number, count: number}> => {
    const now = Date.now();
    const cached = appRatingCache.get(animeId);
    if (cached && now < cached.expireAt) {
      return cached.data;
    }

    let activePromise = appRatingPromises.get(animeId);
    if (!activePromise) {
      activePromise = (async () => {
        try {
          const { collectionGroup, query, where, getDocs } = await import('firebase/firestore');
          const q = query(collectionGroup(db, 'animeEntries'), where('animeId', '==', animeId));
          const snap = await getDocs(q);
          let total = 0;
          let count = 0;
          snap.forEach(doc => {
            const d = doc.data();
            if (typeof d.score === 'number' && d.score > 0) {
              total += d.score;
              count++;
            }
          });
          const data = {
            score: count > 0 ? Number((total / count).toFixed(2)) : 0,
            count
          };
          appRatingCache.set(animeId, { data, expireAt: Date.now() + 5 * 60 * 1000 }); // 5 minutes cache
          return data;
        } catch (error) {
           console.error("Error getting app rating:", error);
           return { score: 0, count: 0 };
        } finally {
          appRatingPromises.delete(animeId);
        }
      })();
      appRatingPromises.set(animeId, activePromise);
    }
    return activePromise;
  },

  saveAnimeEntry: async (
    uid: string, 
    animeId: string, 
    data: { 
      title: string, 
      posterUrl: string, 
      releaseYear: string, 
      status?: MainListStatus, 
      customLists?: Record<string, boolean>, 
      score?: number, 
      isFavorite?: boolean, 
      watchedEpisodes?: number[],
      episodesCount?: number,
      progress?: number,
      extraXp?: number,
      extraCoins?: number
    }
  ): Promise<void> => {
    try {
      const ref = doc(db, 'users', uid, 'animeEntries', animeId);
      const snap = await getDoc(ref);
      
      let awardAmount = data.extraXp || 0;
      const userProfileUpdates: Record<string, any> = {};
      
      const payload: any = {
        animeId: animeId,
        title: data.title || 'Unknown Title',
        posterUrl: data.posterUrl || '',
        updatedAt: serverTimestamp(),
      };
      if (data.releaseYear) payload.releaseYear = data.releaseYear;
      if (data.status) payload.status = data.status;
      if (data.customLists) payload.customLists = data.customLists;
      if (data.score !== undefined) payload.score = data.score;
      if (data.isFavorite !== undefined) payload.isFavorite = data.isFavorite;
      if (data.watchedEpisodes !== undefined) payload.watchedEpisodes = data.watchedEpisodes;
      
      // Save or update episodesCount and progress if available
      const existingData = snap.exists() ? snap.data() : null;
      const rawEpisodesCount = data.episodesCount !== undefined 
        ? data.episodesCount 
        : (existingData?.episodesCount || 0);
        
      let finalEpisodesCount = 0;
      if (typeof rawEpisodesCount === 'number') {
        finalEpisodesCount = rawEpisodesCount;
      } else if (typeof rawEpisodesCount === 'string') {
        finalEpisodesCount = parseInt(rawEpisodesCount, 10) || 0;
      }
        
      if (finalEpisodesCount > 0) {
        payload.episodesCount = finalEpisodesCount;
      }
      
      if (data.progress !== undefined) {
        payload.progress = typeof data.progress === 'number' 
          ? data.progress 
          : (parseInt(String(data.progress), 10) || 0);
      } else if (data.status === 'completed') {
        // If status is completed and progress isn't set, progress is the total episodes of that anime
        payload.progress = finalEpisodesCount > 0 ? finalEpisodesCount : 12;
      } else if (data.watchedEpisodes !== undefined) {
        payload.progress = data.watchedEpisodes.length;
      } else if (existingData?.watchedEpisodes !== undefined) {
        payload.progress = Array.isArray(existingData.watchedEpisodes) ? existingData.watchedEpisodes.length : 0;
      }

      const prevStatus = existingData ? existingData.status : null;
      let newlyCompleted = false;

      if (!snap.exists()) {
        payload.addedAt = serverTimestamp();
        payload.status = payload.status || 'none';
        awardAmount += 20; // 20 XP for adding anime
        
        if (payload.status === 'completed') {
           newlyCompleted = true;
           payload.completedXpClaimed = true;
        }
        await setDoc(ref, payload);
        userProfileUpdates.listCount = increment(1);
      } else {
        const alreadyClaimed = snap.data().completedXpClaimed;
        if (data.status === 'completed' && prevStatus !== 'completed' && !alreadyClaimed) {
           newlyCompleted = true;
           payload.completedXpClaimed = true;
        }
        await updateDoc(ref, payload);
      }

      // Invalidate caches to guarantee data consistency
      animeEntriesCache.delete(uid);
      if (data.score !== undefined) {
        appRatingCache.delete(animeId);
      }

      let customXpGranted = 0;
      let customCoinsGranted = 0;

      if (newlyCompleted) {
         userProfileUpdates.completedAnimeCount = increment(1);
         const rewards = getAnimeRewards(finalEpisodesCount);
         customXpGranted = rewards.xp;
         customCoinsGranted = rewards.coins;
      }

      const finalAwardAmount = (data.extraXp || 0) + customXpGranted + (snap.exists() ? 0 : 20);
      const finalCoinsAmount = (data.extraCoins || 0) + customCoinsGranted;

      if (finalAwardAmount > 0) {
         const { awardXP } = await import('./gamificationService');
         const coinsParam = finalCoinsAmount > 0 ? finalCoinsAmount : true;
         await awardXP(uid, finalAwardAmount, coinsParam, userProfileUpdates);
      } else if (Object.keys(userProfileUpdates).length > 0) {
         try {
           const userRef = doc(db, 'users', uid);
           await updateDoc(userRef, userProfileUpdates);
         } catch (_) {}
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${uid}/animeEntries/${animeId}`);
      throw e;
    }
  },

  removeAnimeEntry: async (uid: string, animeId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'users', uid, 'animeEntries', animeId));
      try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { listCount: increment(-1) });
      } catch (_) {}
      // Invalidate caches to avoid stale reads
      animeEntriesCache.delete(uid);
      appRatingCache.delete(animeId);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${uid}/animeEntries/${animeId}`);
      throw e;
    }
  },

  invalidateUserCache: (uid: string, animeId?: string) => {
    animeEntriesCache.delete(uid);
    customListsCache.delete(uid);
    if (animeId) {
      appRatingCache.delete(animeId);
    }
  },

  boostUserToMaxLevel: async (uid: string): Promise<void> => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        xp: 500000,
        level: 100,
        coins: 150000,
        modPoints: 9999
      });
    } catch (e) {
      console.error("Error boosting user account:", e);
      throw e;
    }
  }
};
