import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signInWithCredential,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, onSnapshot } from 'firebase/firestore';
import { updateDailyStreak } from '../services/gamificationService';
import { moderationService, RoleLevel } from '../services/moderationService';
import { Mail, Lock, UserPlus, LogIn, AlertCircle, X, Sparkles, CheckCircle, RefreshCw, KeyRound, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

  // Auth Modal States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authModalLoading, setAuthModalLoading] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [showOAuthTroubleshoot, setShowOAuthTroubleshoot] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  // Native/System-level Google Sign In and One Tap helper (Google Identity Services)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initGsi = () => {
      // Prioritize the user-configured or project-level Google Client ID
      const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
      
      if (!clientId) {
        console.log("GSI skipped: VITE_GOOGLE_CLIENT_ID is not configured in environment variables. Using standard Firebase Auth flow.");
        return;
      }

      // Skip GSI completely inside iframes (such as the Google AI Studio preview sandbox)
      // because browsers block the 'identity-credentials-get' API inside sandboxed documents,
      // which triggers GSI NotAllowedError exceptions. Standard Firebase popup works perfectly since it breaks out in a popup.
      const isReallyInIframe = typeof window !== 'undefined' && (window.self !== window.top || isInIframe);
      if (isReallyInIframe) {
        console.log("GSI skipped: Running in an iframe. Using standard Firebase Popup/Redirect flow to prevent FedCM iframe NotAllowedError.");
        return;
      }
      
      if (!(window as any).google?.accounts?.id) {
        return;
      }

      console.log("Initializing Google Identity Services with Client ID:", clientId);
      
      try {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            setAuthModalLoading(true);
            setAuthError('');
            setAuthSuccess('');
            try {
              console.log("Google system account credential received.");
              const credential = GoogleAuthProvider.credential(response.credential);
              const userCredential = await signInWithCredential(auth, credential);
              if (userCredential.user) {
                setAuthSuccess(`✓ تم تسجيل دخولك بنجاح عبر حساب Google بالنظام: ${userCredential.user.displayName || 'أوتاكو'}!`);
                setTimeout(() => {
                  setIsAuthModalOpen(false);
                  resetAuthForm();
                }, 1200);
              }
            } catch (err: any) {
              console.error("Firebase GSI signin failed:", err);
              setAuthError(`فشل الاتصال بالنظام: ${err.message || 'يرجى التحقق من إعدادات حساب جوجل للمشروع'}`);
            } finally {
              setAuthModalLoading(false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm: false
        });

        // Trigger One Tap floating prompt if auth modal is opened
        if (isAuthModalOpen && authMode === 'login') {
          (window as any).google.accounts.id.prompt((notification: any) => {
            if (notification.isNotDisplayed()) {
              console.log("One Tap not displayed:", notification.getNotDisplayedReason());
            } else if (notification.isSkippedMoment()) {
              console.log("One Tap skipped:", notification.getSkippedReason());
            } else if (notification.isDismissedMoment()) {
              console.log("One Tap dismissed:", notification.getDismissedReason());
            }
          });
        }
      } catch (err) {
        console.warn("Error setting up Google Identity Services:", err);
      }
    };

    let checkAttempts = 0;
    const interval = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        initGsi();
        clearInterval(interval);
      } else {
        checkAttempts++;
        if (checkAttempts > 20) {
          clearInterval(interval);
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isAuthModalOpen, authMode]);

  const resetAuthForm = () => {
    setAuthEmail('');
    setAuthPassword('');
    setAuthConfirmPassword('');
    setAuthDisplayName('');
    setAuthError('');
    setAuthSuccess('');
    setShowPassword(false);
    setShowOAuthTroubleshoot(false);
  };

  // Listen for Google Redirect authentication and deep-linking URLs
  useEffect(() => {
    // 1. Handle Firebase Auth Redirect results
    setAuthModalLoading(true);
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          console.log("Logged in successfully via Redirect callback:", result.user.displayName);
          setAuthSuccess(`أهلاً بك مجدداً ${result.user.displayName || 'يا صديقي'}! تم تسجيل الدخول بنجاح عبر حساب Google.`);
          setIsAuthModalOpen(false);
        }
      })
      .catch((error: any) => {
        console.warn("Getting redirect result failed:", error);
        if (error.code && error.code !== 'auth/redirect-cancelled-by-user') {
          setAuthError('تعذر تكوين جلسة المصادقة عبر Google. يرجى استخدام البريد الإلكتروني وكلمة المرور إن تكرر الخطأ: ' + (error.message || error));
        }
      })
      .finally(() => {
        setAuthModalLoading(false);
      });

    // 2. Custom deep linking intent parsing (e.g., scheme and intent listeners)
    const handleDeepLink = (url: string) => {
      try {
        const parsedUrl = new URL(url);
        // If there's an action or custom callback in the deep link parameters
        const token = parsedUrl.searchParams.get('token');
        const mode = parsedUrl.searchParams.get('mode');
        if (token && mode === 'auth') {
          console.log("Deep link auth parameters captured:", token);
          // Can handle manual auth or tokens if needed
        }
      } catch (err) {
        console.warn("Parsing deep link failed:", err);
      }
    };

    // If initial window state contains custom launch patterns
    if (typeof window !== 'undefined' && window.location.href) {
      handleDeepLink(window.location.href);
    }

    // Capture standard popstate
    const onPopState = () => {
      handleDeepLink(window.location.href);
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

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
        }, (error) => {
          console.warn("Banned checking snapshot error:", error);
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
               const fullData = { id: docSnap.id, ...docSnap.data() };
               try {
                 if (typeof localStorage !== 'undefined') {
                   localStorage.setItem('mod_user_data_' + u.uid, JSON.stringify(fullData));
                 }
               } catch (e) {}
               setUserData(fullData);
             }
          }, (error) => {
             console.warn("User data snapshot error (offline or permissions):", error);
          });
          
          const roleData = await moderationService.getCurrentUserRole();
          setUserRole(roleData);
          
          setLoading(false);
        } catch (error) {
           console.warn("Failed to setup user, initiating offline fallback:", error);
           try {
             const localDataStr = typeof localStorage !== 'undefined' ? localStorage.getItem('mod_user_data_' + u.uid) : null;
             let fallbackData = null;
             if (localDataStr) {
               try {
                 fallbackData = JSON.parse(localDataStr);
               } catch (e) {}
             }
             if (!fallbackData) {
               const emailPrefix = u.email?.split('@')[0] || '';
               const cleanEmailPrefix = emailPrefix.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
               const baseUsername = cleanEmailPrefix || 'otaku_' + u.uid.substring(0, 5);
               fallbackData = {
                 id: u.uid,
                 username: baseUsername,
                 displayName: u.displayName || u.email?.split('@')[0] || 'أوتاكو الرائع',
                 email: u.email || '',
                 photoURL: u.photoURL || '',
                 role: 'user',
                 createdAt: new Date().toISOString(),
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
             }
             setUserData(fallbackData);
             setUserRole(fallbackData.role || 'user');
           } catch (fallbackErr) {
             console.warn("Offline user fallback failed:", fallbackErr);
           }
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
    setIsAuthModalOpen(true);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const logout = async () => {
    await firebaseSignOut(auth);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    if (!authEmail.trim() || !authPassword) {
      setAuthError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }
    setAuthModalLoading(true);
    try {
      await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
      setIsAuthModalOpen(false);
      resetAuthForm();
    } catch (err: any) {
      console.warn("Login Error Details:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setAuthError('عذراً، خيار تسجيل الدخول بالبريد الإلكتروني (Email/Password) مغلق في إعدادات مشروعك على Firebase. كمالك للتطبيق: يرجى الانتقال إلى Firebase Console ➔ Authentication ➔ Sign-in method وقم بتفعيل خيار "Email/Password" ثم احفظ الإعدادات لتتمكن من تسجيل الدخول بـ APK.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') {
        setAuthError('البريد الإلكتروني أو كلمة المرور غير صحيحة، يرجى إعادة التحقق.');
      } else {
        setAuthError('فشل تسجيل الدخول: ' + (err.message || err));
      }
    } finally {
      setAuthModalLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    if (!authEmail.trim() || !authPassword || !authConfirmPassword || !authDisplayName.trim()) {
      setAuthError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }
    if (authPassword.length < 6) {
      setAuthError('يجب أن تتكون كلمة المرور من 6 خانات على الأقل.');
      return;
    }
    if (authPassword !== authConfirmPassword) {
      setAuthError('كلمات المرور غير متطابقة.');
      return;
    }
    setAuthModalLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: authDisplayName.trim()
        });
      }
      setIsAuthModalOpen(false);
      resetAuthForm();
    } catch (err: any) {
      console.warn("Register Error Details:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setAuthError('عذراً، خيار تسجيل الدخول بالبريد الإلكتروني (Email/Password) غير مفعّل في منصة Firebase لـ MOD. كمالك للتطبيق: توجه إلى Firebase Console ➔ Authentication ➔ Sign-in Method وفعل خيار "Email/Password" ليتمكن المستخدمون من التسجيل عبر الهواتف.');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('هذا البريد الإلكتروني مسجل بالفعل لصالح حساب آخر.');
      } else if (err.code === 'auth/invalid-email') {
        setAuthError('صيغة البريد الإلكتروني غير صالحة.');
      } else {
        setAuthError(err.message || 'حدث خطأ أثناء إنشاء الحساب.');
      }
    } finally {
      setAuthModalLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    if (!authEmail.trim()) {
      setAuthError('يرجى كتابة البريد الإلكتروني أولاً.');
      return;
    }
    setAuthModalLoading(true);
    try {
      await sendPasswordResetEmail(auth, authEmail.trim());
      setAuthSuccess('تم إرسال رابط استعادة الحساب إلى بريدك الإلكتروني بنجاح!');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setAuthError('لا يوجد حساب مسجل بهذا البريد الإلكتروني.');
      } else {
        setAuthError('فشل إرسال البريد الإلكتروني الخاص بالاستعادة.');
      }
    } finally {
      setAuthModalLoading(false);
    }
  };

  const isLocalFlow = typeof window !== 'undefined' && (
    window.location.protocol === 'file:' || 
    window.location.hostname === 'localhost' ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ||
    navigator.userAgent.includes('wv')
  );

  return (
    <AuthContext.Provider value={{ user, userData, userRole, loading, banInfo, signIn, signOut, logout }}>
      {children}

      {/* Dynamic Native-Sensing Authentication Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 30 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] max-h-[90vh] overflow-y-auto"
            >
              {/* Background ambient decorative aura */}
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#FF1744]/5 rounded-full blur-2xl pointer-events-none" />

              {/* Close button */}
              <button
                onClick={() => {
                  setIsAuthModalOpen(false);
                  resetAuthForm();
                }}
                className="absolute top-4 left-4 w-7 h-7 rounded-lg bg-zinc-900 border border-white/5 text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer hover:border-white/10 transition"
              >
                <X size={14} />
              </button>

              {/* Header */}
              <div className="text-center mb-5 mt-1">
                <div className="inline-flex w-10 h-10 bg-gradient-to-tr from-[#FF1744] to-purple-600 rounded-xl items-center justify-center text-white shadow-lg mb-2.5">
                  <Sparkles size={18} className="animate-pulse" />
                </div>
                <h3 className="text-base font-black text-white">
                  {authMode === 'login' ? 'طلب تسجيل الدخول' : authMode === 'register' ? 'إنشاء حساب أوتاكو جديد' : 'استعادة حسابك'}
                </h3>
                <p className="text-[10px] text-neutral-400 mt-1 px-4 leading-normal">
                  {authMode === 'login' ? 'سجل دخولك لتتمكن من حفظ الأنمي، جمع الكوينز، ومشاركة التعليقات!' : authMode === 'register' ? 'انضم لأسرة أنمي MOD مجاناً بالكامل واحصل على جوائز يومية مذهلة!' : 'أدخل بريدك الإلكتروني وسيصلك رابط إعادة التعيين فوراً'}
                </p>
              </div>

              {/* Success/Error Notices */}
              {authError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-[10px] font-bold flex items-start gap-1.5 text-right">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400 text-[10px] font-bold flex items-start gap-1.5 text-right">
                  <CheckCircle size={13} className="mt-0.5 shrink-0" />
                  <span>{authSuccess}</span>
                </div>
              )}

              {/* Interactive Form */}
              <form onSubmit={authMode === 'login' ? handleLogin : authMode === 'register' ? handleRegister : handleForgotPassword} className="space-y-3.5">
                
                {/* Display name field (Registration mode only) */}
                {authMode === 'register' && (
                  <div className="space-y-1 text-right">
                    <label className="text-[10px] font-bold text-neutral-300">الاسم المستعار (اسم العرض)</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={authDisplayName}
                        onChange={(e) => setAuthDisplayName(e.target.value)}
                        placeholder="لوفي الرائع أو سينباي"
                        className="w-full bg-[#07070b]/90 border border-zinc-800 focus:border-[#FF1744] focus:ring-1 focus:ring-[#FF1744]/20 rounded-xl py-2 px-3 pr-9 text-xs text-white placeholder-neutral-500 outline-none transition text-right"
                      />
                      <UserPlus className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" size={13} />
                    </div>
                  </div>
                )}

                {/* Email address field */}
                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-bold text-neutral-300">البريد الإلكتروني</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="username@domain.com"
                      className="w-full bg-[#07070b]/90 border border-zinc-800 focus:border-[#FF1744] focus:ring-1 focus:ring-[#FF1744]/20 rounded-xl py-2 px-3 pr-9 text-xs text-white placeholder-neutral-500 outline-none transition text-right"
                      dir="ltr"
                    />
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" size={13} />
                  </div>
                </div>

                {/* Password field */}
                {authMode !== 'forgot' && (
                  <div className="space-y-1 text-right">
                    <div className="flex items-center justify-between">
                      {authMode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('forgot');
                            setAuthError('');
                            setAuthSuccess('');
                          }}
                          className="text-[9px] text-neutral-500 hover:text-white transition"
                        >
                          نسيت كلمة السر؟
                        </button>
                      )}
                      <label className="text-[10px] font-bold text-neutral-300">كلمة المرور</label>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#07070b]/90 border border-zinc-800 focus:border-[#FF1744] focus:ring-1 focus:ring-[#FF1744]/20 rounded-xl py-2 px-3 pr-9 pl-9 text-xs text-white placeholder-neutral-500 outline-none transition text-right"
                        dir="ltr"
                      />
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" size={13} />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition"
                      >
                        {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirm password match */}
                {authMode === 'register' && (
                  <div className="space-y-1 text-right">
                    <label className="text-[10px] font-bold text-neutral-300">تأكيد كلمة المرور</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={authConfirmPassword}
                        onChange={(e) => setAuthConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#07070b]/90 border border-zinc-800 focus:border-[#FF1744] focus:ring-1 focus:ring-[#FF1744]/20 rounded-xl py-2 px-3 pr-9 text-xs text-white placeholder-neutral-500 outline-none transition text-right"
                        dir="ltr"
                      />
                      <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" size={13} />
                    </div>
                  </div>
                )}

                {/* Form submit button */}
                <button
                  type="submit"
                  disabled={authModalLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-[#FF1744] disabled:opacity-50 hover:opacity-95 active:scale-[0.98] text-white text-xs font-black py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 mt-2 shadow-lg shadow-purple-900/10"
                >
                  {authModalLoading ? (
                    <RefreshCw size={12} className="animate-spin text-white" />
                  ) : authMode === 'login' ? (
                    <LogIn size={12} />
                  ) : authMode === 'register' ? (
                    <UserPlus size={12} />
                  ) : (
                    <KeyRound size={12} />
                  )}
                  <span>
                    {authModalLoading ? 'جاري التحقق...' : authMode === 'login' ? 'سجل دخول آمن' : authMode === 'register' ? 'تسجيل كـ أوتاكو جديد' : 'أرسل رابط التغيير'}
                  </span>
                </button>
              </form>

              {/* Traditional social link option */}
              {authMode !== 'forgot' && (
                <>
                  <div className="my-4 relative flex items-center justify-center">
                    <div className="absolute inset-x-0 h-px bg-zinc-900" />
                    <span className="relative bg-zinc-950 px-2.5 text-[9px] text-neutral-500 font-bold">أو تسجيل الدخول السريع</span>
                  </div>

                  {/* Sandboxed Environment Warning Box */}
                  <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[10px] text-right leading-relaxed font-medium">
                    <div className="flex gap-1.5 items-start mb-1 font-bold text-[10.5px]">
                      <span>⚠️</span>
                      <span>تنبيه هام ومضمون للتجربة فورا:</span>
                    </div>
                    <p className="text-zinc-300">
                      بسبب خصوصية وسياسة جوجل في بيئات المحاكاة والتطبيقات المعزولة، فإن <strong className="text-amber-400">Google Sign-In</strong> سيواجه خطأ 401 للعملاء غير المدرجين مسبقاً في إعدادات OAuth.
                    </p>
                    <p className="text-emerald-400 font-bold mt-1">
                      👈 البديل المضمون %100: يرجى كتابة بريد إلكتروني وكلمة مرور اختيارية في حقول الاستمارة بالأعلى، ثم اضغط على زر "التسجيل كـ أوتاكو جديد" لتبدأ فوراً!
                    </p>
                  </div>

                  <button
                    onClick={async () => {
                      setAuthError('');
                      setAuthSuccess('');
                      
                      // 1. Try Native/System Google One Tap Prompt first if VITE_GOOGLE_CLIENT_ID is set and NOT in iframe
                      const hasGoogleClientId = !!(import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
                      const isReallyInIframe = typeof window !== 'undefined' && (window.self !== window.top || isInIframe);
                      if (!isReallyInIframe && hasGoogleClientId && (window as any).google?.accounts?.id) {
                        try {
                          console.log("Triggering One Tap via button click...");
                          setAuthSuccess('جاري الاتصال بحسابات Google بالنظام...');
                          (window as any).google.accounts.id.prompt((notification: any) => {
                            if (notification.isNotDisplayed()) {
                              console.info("One Tap not displayed, falling back to traditional popup/redirect:", notification.getNotDisplayedReason());
                              runTraditionalGoogleAuth();
                            }
                          });
                          return;
                        } catch (err) {
                          console.warn("One Tap failed, using traditional flow.", err);
                        }
                      }

                      await runTraditionalGoogleAuth();

                      async function runTraditionalGoogleAuth() {
                        setAuthModalLoading(true);
                        try {
                          const provider = new GoogleAuthProvider();
                          const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
                          const isMobile = /android|iphone|ipad|ipod/i.test(userAgent.toLowerCase());
                          const isWebView = /wv|webview|xwalk|chromium|messenger|fb_iab|instagram/i.test(userAgent.toLowerCase()) || 
                                            (isMobile && !/chrome|safari/i.test(userAgent.toLowerCase()));
                          
                          if (isMobile || isWebView) {
                            console.log("Mobile/WebView environment - Initiating signInWithRedirect...");
                            await signInWithRedirect(auth, provider);
                          } else {
                            console.log("Standard browser - Initiating signInWithPopup...");
                            try {
                              await signInWithPopup(auth, provider);
                              setIsAuthModalOpen(false);
                              resetAuthForm();
                            } catch (popupErr: any) {
                              console.warn("Popup blocked/failed, falling back to Redirect:", popupErr);
                              await signInWithRedirect(auth, provider);
                            }
                          }
                        } catch (error: any) {
                          console.warn("Google authentication failed:", error);
                          setAuthError('تنبيه: محرك تسجيل جوجل واجه صعوبة. يرجى استخدام البريد الإلكتروني وكلمة المرور.');
                        } finally {
                          setAuthModalLoading(false);
                        }
                      }
                    }}
                    className="w-full bg-zinc-900/50 hover:bg-zinc-900 hover:border-white/10 border border-zinc-800 text-white font-bold text-[10px] py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                      <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C18.155 2.185 15.424 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.34 0 10.55-4.46 10.55-10.74 0-.724-.077-1.277-.173-1.63L12.24 10.285z" />
                    </svg>
                    <span>تسجيل عبر حساب Google</span>
                  </button>

                  {/* Troubleshoot Panel for Google Client ID / invalid_client 401 */}
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => setShowOAuthTroubleshoot(!showOAuthTroubleshoot)}
                      className="w-full text-center text-[9px] text-[#FF1744] hover:underline font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>{showOAuthTroubleshoot ? '▲ إخفاء دليل حل تفعيل الدخول' : '▼ هل تواجه مشكلة "خطأ 401 / معرّف غير موجود"؟'}</span>
                    </button>

                    <AnimatePresence>
                      {showOAuthTroubleshoot && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden text-right leading-relaxed text-[10px]"
                        >
                          <p className="font-bold text-neutral-200 mb-1.5 text-[10.5px] text-red-400">
                            🔍 سبب ظهور خطأ (invalid_client: 401):
                          </p>
                          <p className="text-neutral-400 mb-2">
                            حدث هذا لأن حساب Google المطلوب للدخول (OAuth Client) غير معرّف أو غير مفعّل في منصة Firebase الخاصة بالتطبيق في حسابك. لحل هذه المشكلة كمالك، يرجى اتباع الخطوات:
                          </p>
                          
                          <ol className="list-decimal list-inside space-y-2 text-neutral-300">
                            <li>
                              <strong className="text-white">تفعيل تسجيل Google في Firebase:</strong>
                              <p className="text-neutral-400 mr-3.5 mt-0.5">
                                اذهب لـ <a href="https://console.firebase.google.com/project/gen-lang-client-0027450047/authentication/providers" target="_blank" rel="noopener noreferrer" className="text-[#FF1744] hover:underline inline-flex items-center gap-0.5">Firebase Console <ExternalLink size={8} /></a> ➔ <strong className="text-zinc-300 font-normal">Authentication</strong> ➔ <strong className="text-zinc-300 font-normal">Sign-in method</strong>.
                              </p>
                              <p className="text-neutral-400 mr-3.5 mt-0.5">
                                انقر على "إضافة موفر جديد" واختر <strong className="text-zinc-200">Google</strong>، ثم قم بتفعيله وحفظه.
                              </p>
                            </li>
                            
                            <li>
                              <strong className="text-white">نسخ معرّف الويب (Web Client ID):</strong>
                              <p className="text-neutral-400 mr-3.5 mt-0.5">
                                ستجد في نفس صفحة تفعيل Google جزءاً باسم <strong className="text-zinc-300 font-normal">Web SDK Configuration</strong>، انسخ المعرّف الموجود هناك.
                              </p>
                            </li>

                            <li>
                              <strong className="text-white">إعداد معرّف العميل في AI Studio:</strong>
                              <p className="text-neutral-400 mr-3.5 mt-0.5">
                                اذهب إلى إعدادات التطبيق في <strong className="text-zinc-200">AI Studio</strong> ➔ <strong className="text-zinc-200">Settings</strong> ➔ <strong className="text-zinc-200">Environment Variables</strong>.
                              </p>
                              <p className="text-neutral-300 mr-3.5 font-mono bg-zinc-950 p-1 rounded border border-zinc-800 mt-1 select-all text-[9.5px]">
                                VITE_GOOGLE_CLIENT_ID = [معرّف_الويب_الذي_نسخته]
                              </p>
                            </li>

                            <li>
                              <strong className="text-white">اعتماد نطاق التطبيق (OAuth Whitelist):</strong>
                              <p className="text-neutral-400 mr-3.5 mt-0.5">
                                اذهب إلى <a href="https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0027450047" target="_blank" rel="noopener noreferrer" className="text-[#FF1744] hover:underline inline-flex items-center gap-0.5">Google Cloud Credentials <ExternalLink size={8} /></a>.
                              </p>
                              <p className="text-neutral-400 mr-3.5 mt-0.5">
                                اختر معرّف عميل الويب الخاص بك وتأكد من إدراج نطاقات التطبيق الحالية (URLs) بداخل خانة <strong className="text-zinc-300 font-normal">Authorized JavaScript Origins</strong> لتقبل المصادقة بنجاح.
                              </p>
                            </li>
                          </ol>
                          <p className="text-emerald-400 mt-2 font-bold text-[9.5px] border-t border-zinc-800 pt-1.5">
                            💡 نصيحة: يمكنك أيضاً تسجيل مستخدم جديد بالبريد وكلمة السر لتجاوز ذلك فوراً وبدء التصفح!
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {/* Mode switch */}
              <div className="mt-4.5 text-center text-[10px] leading-relaxed">
                {authMode === 'login' ? (
                  <p className="text-neutral-400">
                    أنت جديد هنا؟{' '}
                    <button
                      onClick={() => {
                        setAuthMode('register');
                        setAuthError('');
                        setAuthSuccess('');
                      }}
                      className="text-[#FF1744] hover:underline font-bold"
                    >
                      إنشاء حساب أوتاكو مجاني
                    </button>
                  </p>
                ) : (
                  <p className="text-neutral-400">
                    تمتلك حساباً مسبقاً؟{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setAuthError('');
                        setAuthSuccess('');
                      }}
                      className="text-[#FF1744] hover:underline font-bold"
                    >
                      تسجيل دخول فوري
                    </button>
                  </p>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
};
