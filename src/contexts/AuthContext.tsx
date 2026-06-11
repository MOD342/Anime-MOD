import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, onSnapshot } from 'firebase/firestore';
import { updateDailyStreak } from '../services/gamificationService';
import { moderationService, RoleLevel } from '../services/moderationService';

export interface AppUser {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  userData: any | null;
  userRole: RoleLevel;
  loading: boolean;
  banInfo: { isBanned: boolean; reason?: string } | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  userRole: 'user',
  loading: true,
  banInfo: null,
  signIn: async () => {},
  signOut: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<RoleLevel>('user');
  const [banInfo, setBanInfo] = useState<{ isBanned: boolean; reason?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;
    let unsubBan: (() => void) | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser({
          id: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
          emailVerified: u.emailVerified
        });
      } else {
        setUser(null);
      }
      
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }
      if (unsubBan) {
        unsubBan();
        unsubBan = null;
      }
      
      if (u) {
        // Enforce real-time ban checking
        const banRef = doc(db, 'bannedUsers', u.uid);
        unsubBan = onSnapshot(banRef, (banSnap) => {
          if (banSnap.exists()) {
            setBanInfo({ isBanned: true, reason: banSnap.data()?.reason || 'مخالفة قوانين المنصة ودليله السلوكي.' });
          } else {
            setBanInfo(null);
          }
        });

        // Ensure user profile exists
        const userRef = doc(db, 'users', u.uid);
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
              // Auto-generate unique username based on email or name
              const emailPrefix = u.email?.split('@')[0] || '';
              const cleanEmailPrefix = emailPrefix.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
              const cleanDisplayName = (u.displayName || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
              let baseUsername = cleanEmailPrefix || cleanDisplayName || 'otaku';
              if (baseUsername.length < 3) {
                baseUsername = 'otaku_' + Math.random().toString(36).substring(2, 7);
              }
              
              let finalUsername = baseUsername;
              let attempts = 0;
              let nameExists = true;
              while (nameExists && attempts < 10) {
                const checkRef = doc(db, 'usernames', finalUsername);
                const checkSnap = await getDoc(checkRef);
                if (checkSnap.exists()) {
                  // Username taken, append random sequence or logic
                  finalUsername = baseUsername + Math.floor(Math.random() * 900 + 100);
                  attempts++;
                } else {
                  nameExists = false;
                }
              }
              
              // Map the username in database
              await setDoc(doc(db, 'usernames', finalUsername), { id: u.uid }).catch(console.error);

              const newData = {
                id: u.uid,
                username: finalUsername,
                displayName: u.displayName || u.email?.split('@')[0] || 'أوتاكو الرائع',
                email: u.email || '',
                photoURL: u.photoURL || '',
                role: 'user',
                createdAt: serverTimestamp(),
                xp: 0,
                level: 1,
                modPoints: 0,
                streakDays: 0,
                likesReceived: 0,
                commentsCount: 0,
                recommendationsAccepted: 0,
                aiGamesPoints: 0,
                ratingsCount: 0,
                chatMessagesCount: 0,
                coins: 0,
                purchasedItems: [],
                lastActiveDate: new Date().toISOString().split('T')[0]
              };
              await setDoc(userRef, newData);
          } else {
              let data = snap.data() || {};
              const updates: any = {};
              if (!data.displayName && u.displayName) updates.displayName = u.displayName;
              if (!data.email && u.email) updates.email = u.email;
              if (!data.photoURL && u.photoURL) updates.photoURL = u.photoURL;
              if (!data.id) updates.id = u.uid;
              if (data.coins < 0) updates.coins = 0;
              
              // Ensure legacy users have a username
              if (!data.username) {
                const emailPrefix = u.email?.split('@')[0] || '';
                const cleanEmailPrefix = emailPrefix.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
                let finalUsername = cleanEmailPrefix || 'otaku_' + u.uid.substring(0, 5);
                if (finalUsername.length < 3) finalUsername = 'otaku_' + u.uid.substring(0, 5);
                const checkRef = doc(db, 'usernames', finalUsername);
                const checkSnap = await getDoc(checkRef);
                if (!checkSnap.exists()) {
                  await setDoc(checkRef, { id: u.uid }).catch(console.error);
                  updates.username = finalUsername;
                }
              }
              
              if (Object.keys(updates).length > 0) {
                 await updateDoc(userRef, updates).catch(console.error);
              }
              // We can trigger streak update in background
              updateDailyStreak(u.uid).then(() => {});
          }
          
          unsubSnapshot = onSnapshot(userRef, (docSnap) => {
             if (docSnap.exists()) {
               setUserData({ id: docSnap.id, ...docSnap.data() });
             }
          });
          
          const roleData = await moderationService.getCurrentUserRole();
          setUserRole(roleData);
          
          setLoading(false);
        } catch (error) {
           console.error("Failed to setup user:", error);
           setLoading(false);
        }
      } else {
        setUserData(null);
        setUserRole('user');
        setBanInfo(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubSnapshot) unsubSnapshot();
      if (unsubBan) unsubBan();
    };
  }, []);

  const signIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.warn("Firebase Auth Error:", error);
      
      // Gracefully handle known harmless popup cancellation or closure errors
      if (
        error?.code === 'auth/cancelled-popup-request' ||
        error?.code === 'auth/popup-closed-by-user' ||
        error?.message?.includes('cancelled-popup-request') ||
        error?.message?.includes('popup-closed-by-user')
      ) {
        console.log("Popup was closed or cancelled by user, ignoring to avoid uncaught promise rejection.");
        return;
      }
      
      if (error?.code === 'auth/popup-blocked') {
        alert('تم حظر النافذة المنبثقة من قبل المتصفح. يرجى تفعيل النوافذ المنبثقة لتتمكن من تسجيل الدخول. 🔓');
        return;
      }

      // If it's a dynamic iframe-auth-html-error or third-party cookie issue
      if (error?.code === 'auth/iframe-auth-html-error') {
        alert('حدث خطأ في بيئة المعاينة (إطار الحماية). يرجى فتح التطبيق في علامة تبويب جديدة لتسجيل الدخول بنجاح! 🌐');
        return;
      }

      // Tell the user about other unexpected errors without crashing the app
      alert(`حدث خطأ أثناء تسجيل الدخول: ${error?.message || error}`);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const logout = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userData, userRole, loading, banInfo, signIn, signOut, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
