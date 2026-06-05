import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, onSnapshot } from 'firebase/firestore';
import { updateDailyStreak } from '../services/gamificationService';
import { moderationService, RoleLevel } from '../services/moderationService';

interface AuthContextType {
  user: User | null;
  userData: any | null;
  userRole: RoleLevel;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  userRole: 'user',
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<RoleLevel>('user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (unsubSnapshot) {
        unsubSnapshot();
        unsubSnapshot = null;
      }
      
      if (u) {
        // Ensure user profile exists
        const userRef = doc(db, 'users', u.uid);
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
             const newData = {
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
             if (data.coins < 0) {
               updateDoc(userRef, { coins: 0 }).catch(console.error);
             }
             // We can trigger streak update in background
             updateDailyStreak(u.uid).then(() => {});
          }
          
          unsubSnapshot = onSnapshot(userRef, (docSnap) => {
             if (docSnap.exists()) {
               setUserData(docSnap.data());
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
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const logout = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userData, userRole, loading, signIn, signOut, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
