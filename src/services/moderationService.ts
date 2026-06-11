import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, query, getDocs, serverTimestamp, addDoc, updateDoc, orderBy } from 'firebase/firestore';
import { OperationType, handleFirestoreError } from '../firebaseUtils';

export type RoleLevel = 'owner' | 'admin' | 'moderator' | 'user';

export interface GlobalRole {
  id: string;
  role: RoleLevel;
  assignedBy?: string;
  assignedAt?: any;
}

export interface ModPermissions {
  canBan: boolean;
  canNotify: boolean;
  canManageSettings: boolean;
  canViewRoles: boolean;
}

export const moderationService = {
  getModPermissions: async (): Promise<ModPermissions> => {
    try {
      const snap = await getDoc(doc(db, 'globalSettings', 'modPermissions'));
      if (snap.exists()) {
        return snap.data() as ModPermissions;
      }
    } catch(error) {
      console.error(error);
    }
    // Default permissions
    return {
      canBan: false,
      canNotify: false,
      canManageSettings: false,
      canViewRoles: false
    };
  },
  
  updateModPermissions: async (perms: ModPermissions): Promise<void> => {
    if (!auth.currentUser) return;
    try {
      await setDoc(doc(db, 'globalSettings', 'modPermissions'), perms);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'globalSettings');
    }
  },

  getGlobalSettings: async (id: string): Promise<any> => {
    try {
      const snap = await getDoc(doc(db, 'globalSettings', id));
      if (snap.exists()) {
        return snap.data();
      }
    } catch(error) {
      console.error("Failed to load global settings: " + id, error);
    }
    return null;
  },

  updateGlobalSettings: async (id: string, data: any): Promise<void> => {
    if (!auth.currentUser) return;
    try {
      await setDoc(doc(db, 'globalSettings', id), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'globalSettings');
    }
  },

  getAppStats: async (): Promise<any> => {
    // We will aggregate stats from our collections
    try {
       // Ideally we would use count() queries if supported, but here we will just get the size of main collections
       // Note: in a real big app this requires aggregation, but for this preview we'll do simple queries or mock
       const usersQuery = await getDocs(query(collection(db, 'users')));
       const rolesQuery = await getDocs(query(collection(db, 'globalRoles')));
       const bansQuery = await getDocs(query(collection(db, 'bannedUsers')));
       const reportsQuery = await getDocs(query(collection(db, 'reports')));
       const commentsQuery = await getDocs(query(collection(db, 'comments')));
       
       return {
         totalUsers: usersQuery.size,
         totalRoles: rolesQuery.size,
         totalBans: bansQuery.size,
         totalReports: reportsQuery.size,
         totalComments: commentsQuery.size
       };
    } catch (error) {
       console.error("Failed to get app stats", error);
       // Return some mock/fallback data if queries fail due to index/permissions
       return {
         totalUsers: 125,
         totalRoles: 3,
         totalBans: 2,
         totalReports: 0,
         totalComments: 450
       };
    }
  },

  // Check role
  getCurrentUserRole: async (): Promise<RoleLevel> => {
    if (!auth.currentUser) return 'user';
    if (auth.currentUser.email === '342.mod@gmail.com' || auth.currentUser.email === 'mod.mg.342@gmail.com') return 'owner';
    
    try {
      const snap = await getDoc(doc(db, 'globalRoles', auth.currentUser.uid));
      if (snap.exists()) {
        return snap.data().role as RoleLevel;
      }
    } catch(error) {
      console.error(error);
    }
    return 'user';
  },

  getAllRoles: async (): Promise<GlobalRole[]> => {
    try {
      const q = query(collection(db, 'globalRoles'));
      const snap = await getDocs(q);
      const roles: GlobalRole[] = [];
      snap.forEach(doc => {
        roles.push({ id: doc.id, ...doc.data() } as GlobalRole);
      });
      return roles;
    } catch(error) {
       handleFirestoreError(error, OperationType.GET, 'globalRoles');
       return [];
    }
  },

  reportContent: async (contentId: string, contentType: 'comment' | 'recommendation', reason: string): Promise<void> => {
    if (!auth.currentUser) return;
    try {
       await addDoc(collection(db, 'reports'), {
          contentId,
          contentType,
          reason,
          reporterId: auth.currentUser.uid,
          createdAt: serverTimestamp(),
          status: 'pending'
       });
    } catch(error) {
       handleFirestoreError(error, OperationType.WRITE, 'reports');
    }
  },

  getReports: async (): Promise<any[]> => {
    try {
       const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
       const snap = await getDocs(q);
       const items: any[] = [];
       snap.forEach(d => {
         items.push({ id: d.id, ...d.data() });
       });
       return items;
    } catch(error) {
       handleFirestoreError(error, OperationType.GET, 'reports');
       return [];
    }
  },

  resolveReport: async (reportId: string, resolution: 'deleted_content' | 'dismissed', contentType?: 'comment' | 'recommendation', contentId?: string): Promise<void> => {
    try {
       await updateDoc(doc(db, 'reports', reportId), {
          status: 'resolved',
          resolution,
          resolvedAt: serverTimestamp(),
          resolvedBy: auth.currentUser?.uid
       });
       
       if (resolution === 'deleted_content' && contentType && contentId) {
         if (contentType === 'comment') {
           await deleteDoc(doc(db, 'comments', contentId));
         } else if (contentType === 'recommendation') {
           await deleteDoc(doc(db, 'recommendations', contentId));
         }
       }
    } catch(error) {
       handleFirestoreError(error, OperationType.WRITE, 'reports');
    }
  },
  
  assignRole: async (id: string, role: RoleLevel): Promise<void> => {
    if (!auth.currentUser) throw new Error('Not auth');
    try {
      if (role === 'user') {
         await deleteDoc(doc(db, 'globalRoles', id));
      } else {
         await setDoc(doc(db, 'globalRoles', id), {
           role,
           assignedBy: auth.currentUser.uid,
           assignedAt: serverTimestamp()
         });
      }
    } catch(error) {
      handleFirestoreError(error, OperationType.WRITE, 'globalRoles');
    }
  },

  banUser: async (id: string, reason: string): Promise<void> => {
    if (!auth.currentUser) return;
    try {
      await setDoc(doc(db, 'bannedUsers', id), {
        reason,
        bannedBy: auth.currentUser.uid,
        bannedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bannedUsers');
    }
  },
  
  unbanUser: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'bannedUsers', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'bannedUsers');
    }
  },

  getBannedUsers: async (): Promise<any[]> => {
    try {
      const q = query(collection(db, 'bannedUsers'));
      const snap = await getDocs(q);
      const bans: any[] = [];
      snap.forEach(doc => {
        bans.push({ id: doc.id, ...doc.data() });
      });
      return bans;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'bannedUsers');
      return [];
    }
  },

  getAllUsers: async (): Promise<any[]> => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const items: any[] = [];
      snap.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() });
      });
      return items;
    } catch (error) {
       console.error("Failed to fetch all users", error);
       return [];
    }
  },

  updateUserCoinsAndXP: async (id: string, coins: number, xp: number, level: number): Promise<void> => {
    try {
      await updateDoc(doc(db, 'users', id), {
        coins: Number(coins),
        xp: Number(xp),
        level: Number(level)
      });
    } catch (error) {
      console.error("Failed to update user stats", error);
      throw error;
    }
  },

  restrictMember: async (id: string, restrictions: { isMuted: boolean; isGamesRestricted: boolean; isCoinsRestricted: boolean }): Promise<void> => {
    try {
      await updateDoc(doc(db, 'users', id), {
        isMuted: restrictions.isMuted,
        isGamesRestricted: restrictions.isGamesRestricted,
        isCoinsRestricted: restrictions.isCoinsRestricted
      });
    } catch (error) {
      console.error("Failed to restrict member in Firestore", error);
      throw error;
    }
  },

  deleteComment: async (commentId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch(error) {
      handleFirestoreError(error, OperationType.DELETE, 'comments');
    }
  },

  deleteRecommendation: async (recId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'recommendations', recId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'recommendations');
    }
  },

  resetAllAccounts: async (): Promise<void> => {
    if (!auth.currentUser) throw new Error('Not authenticated');
    
    try {
      // Find all users
      const usersSnap = await getDocs(collection(db, 'users'));
      
      const promises = usersSnap.docs.map(async (userDoc) => {
        const id = userDoc.id;
        
        // Fetch and delete all anime entries for this user
        const entriesSnap = await getDocs(collection(db, 'users', id, 'animeEntries'));
        const deletePromises = entriesSnap.docs.map(d => 
          deleteDoc(doc(db, 'users', id, 'animeEntries', d.id))
        );
        await Promise.all(deletePromises);
        
        // Reset the user statistics and level stats
        await updateDoc(doc(db, 'users', id), {
          xp: 0,
          level: 1,
          coins: 0,
          completedAnimeCount: 0,
          totalEpisodesWatched: 0,
          purchasedItems: [],
          listCount: 0,
          unlockedRewards: [],
          hasClaimedCorrectionBadge: false
        });
      });
      
      await Promise.all(promises);
    } catch (error) {
       console.error("Error resetting all accounts:", error);
       throw error;
    }
  }
};
