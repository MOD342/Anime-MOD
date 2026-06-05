import { db, auth } from '../firebase';
import { collection, doc, query, getDocs, setDoc, deleteDoc, updateDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../firebaseUtils';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'system' | 'episode' | 'tournament' | 'social';
  imageUrl?: string;
  linkTo?: string; // a route or id to navigate to
  createdAt: any;
  read?: boolean;
  metadata?: any;
}

// Optimization caches for highly scalable concurrent reads (+9999 users ready)
let globalNotifsCacheData: AppNotification[] = [];
let globalNotifsCacheExpireAt = 0;
let globalNotifsPromise: Promise<AppNotification[]> | null = null;

const userNotifsCache = new Map<string, { data: AppNotification[]; expireAt: number }>();
const userNotifsPromises = new Map<string, Promise<AppNotification[]>>();

export const notificationsService = {
  getGlobalNotifications: async (): Promise<AppNotification[]> => {
    const now = Date.now();
    if (now < globalNotifsCacheExpireAt && globalNotifsCacheData.length > 0) {
      return globalNotifsCacheData;
    }

    if (!globalNotifsPromise) {
      globalNotifsPromise = (async () => {
        try {
          const q = query(collection(db, 'globalNotifications'), orderBy('createdAt', 'desc'), limit(20));
          const snap = await getDocs(q);
          const notifs: AppNotification[] = [];
          snap.forEach(d => {
            notifs.push({ id: d.id, ...d.data() } as AppNotification);
          });
          globalNotifsCacheData = notifs;
          globalNotifsCacheExpireAt = Date.now() + 60 * 1000; // Cache global notifications for 60 seconds
          return notifs;
        } catch(err) {
          console.error(err);
          return [];
        } finally {
          globalNotifsPromise = null;
        }
      })();
    }
    return globalNotifsPromise;
  },

  getUserNotifications: async (userId: string): Promise<AppNotification[]> => {
    const now = Date.now();
    const cached = userNotifsCache.get(userId);
    if (cached && now < cached.expireAt) {
      return cached.data;
    }

    let activePromise = userNotifsPromises.get(userId);
    if (!activePromise) {
      activePromise = (async () => {
        try {
          const q = query(collection(db, 'users', userId, 'notifications'), orderBy('createdAt', 'desc'), limit(20));
          const snap = await getDocs(q);
          const notifs: AppNotification[] = [];
          snap.forEach(d => {
            notifs.push({ id: d.id, ...d.data() } as AppNotification);
          });
          userNotifsCache.set(userId, { data: notifs, expireAt: Date.now() + 15 * 1000 }); // Cache for 15 seconds
          return notifs;
        } catch (err) {
          console.error(err);
          return [];
        } finally {
          userNotifsPromises.delete(userId);
        }
      })();
      userNotifsPromises.set(userId, activePromise);
    }
    return activePromise;
  },

  markAsRead: async (userId: string, notifId: string): Promise<void> => {
    try {
      await updateDoc(doc(db, 'users', userId, 'notifications', notifId), {
        read: true
      });
      // Invalidate user notifications cache
      userNotifsCache.delete(userId);
    } catch(err) {
      console.error(err);
    }
  },

  deleteUserNotification: async (userId: string, notifId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'users', userId, 'notifications', notifId));
      // Invalidate user notifications cache
      userNotifsCache.delete(userId);
    } catch (err) {
      console.error(err);
    }
  },

  clearAllUserNotifications: async (userId: string): Promise<void> => {
    try {
      const q = query(collection(db, 'users', userId, 'notifications'));
      const snap = await getDocs(q);
      const promises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(promises);
      // Invalidate user notifications cache
      userNotifsCache.delete(userId);
    } catch(err) {
      console.error(err);
    }
  },

  // Admin function to send a global notification
  createGlobalNotification: async (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): Promise<void> => {
    if (!auth.currentUser) return;
    try {
      const dRef = doc(collection(db, 'globalNotifications'));
      await setDoc(dRef, {
        ...notif,
        createdAt: serverTimestamp()
      });
      // Invalidate global notifications cache
      globalNotifsCacheExpireAt = 0;
    } catch(err: any) {
      if (err?.code === 'permission-denied' || String(err).includes('permission')) {
        console.warn("Skipping global notification creation: unauthorized user.");
      } else {
        handleFirestoreError(err, OperationType.WRITE, 'globalNotifications');
      }
    }
  },

  // Create a user-specific notification
  createUserNotification: async (userId: string, notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): Promise<void> => {
    try {
      const dRef = doc(collection(db, 'users', userId, 'notifications'));
      await setDoc(dRef, {
        ...notif,
        read: false,
        createdAt: serverTimestamp()
      });
      // Invalidate user notifications cache
      userNotifsCache.delete(userId);
    } catch(err) {
      console.error("Error creating user notification:", err);
    }
  }
};
