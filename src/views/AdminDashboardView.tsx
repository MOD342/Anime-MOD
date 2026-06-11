import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  UserX, 
  UserCheck, 
  Trash2, 
  ChevronRight, 
  BellRing, 
  Settings, 
  Lock, 
  Activity, 
  Users, 
  MessageSquare, 
  Sparkles, 
  MoreVertical, 
  ExternalLink, 
  Search, 
  Coins,
  ArrowUpDown,
  Filter,
  Check,
  AlertTriangle,
  Flame,
  Star,
  ChevronLeft,
  X,
  VolumeX,
  UserCheck2,
  LockKeyhole,
  Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { moderationService, RoleLevel, GlobalRole, ModPermissions } from '../services/moderationService';
import { notificationsService } from '../services/notificationsService';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, onSnapshot, collection, query, orderBy, limit, increment } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../firebaseUtils';

interface AdminDashboardViewProps {
  onBack?: () => void;
  onNavigate?: (view: string, props?: any) => void;
  initialTab?: string;
}

export default function AdminDashboardView({ onBack, onNavigate, initialTab }: AdminDashboardViewProps) {
  // Tabs config
  const [activeTab, setActiveTab ] = useState<any>(initialTab || 'reports');
  const [role, setRole] = useState<RoleLevel | null>(null);
  
  const [usersInfo, setUsersInfo] = useState<GlobalRole[]>([]);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [modPerms, setModPerms] = useState<ModPermissions | null>(null);
  const [appStats, setAppStats] = useState<any>(null);

  // Recommendations states
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [searchRecQuery, setSearchRecQuery] = useState('');
  const [recStatusFilter, setRecStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [recIdBeingRejected, setRecIdBeingRejected] = useState<string | null>(null);
  const [recRejectionReasonInput, setRecRejectionReasonInput] = useState('');
  const [recIdBeingDeleted, setRecIdBeingDeleted] = useState<string | null>(null);

  // Members management states
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [userSortBy, setUserSortBy] = useState<'default' | 'coins' | 'level' | 'xp'>('default');
  const [userFilterBy, setUserFilterBy] = useState<'all' | 'muted' | 'gamesRestricted' | 'coinsRestricted'>('all');

  // Suggestions states
  const [suggestionsList, setSuggestionsList] = useState<any[]>([]);
  const [suggestionsFilter, setSuggestionsFilter] = useState<'all' | 'suggestion' | 'complaint'>('all');
  
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingCoins, setEditingCoins] = useState(0);
  const [editingXP, setEditingXP] = useState(0);
  const [editingLevel, setEditingLevel] = useState(1);
  const [editingIsMuted, setEditingIsMuted] = useState(false);
  const [editingIsGamesRestricted, setEditingIsGamesRestricted] = useState(false);
  const [editingIsCoinsRestricted, setEditingIsCoinsRestricted] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser ] = useState(false);

  // Notifications states
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifType, setNotifType] = useState<string>('system');
  const [notifImageUrl, setNotifImageUrl] = useState('');
  const [notifLinkTo, setNotifLinkTo] = useState('');
  const [notifTargetUid, setNotifTargetUid] = useState(''); 
  const [notifTargetChoice, setNotifTargetChoice] = useState<'all' | 'specific'>('all');
  
  // Advanced notification links
  const [interactiveLinkChoice, setInteractiveLinkChoice] = useState<'none' | 'rewards' | 'games' | 'leaderboard' | 'community' | 'anime'>('none');
  const [animeSearchQuery, setAnimeSearchQuery] = useState('');
  const [animeSuggestions, setAnimeSuggestions] = useState<any[]>([]);
  const [selectedNotifAnime, setSelectedNotifAnime] = useState<any | null>(null);
  const [isSearchingAnime, setIsSearchingAnime] = useState(false);
  const [notifSentBanner, setNotifSentBanner] = useState(false);

  // User select roles list
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [selectedSearchUser, setSelectedSearchUser] = useState<any | null>(null);
  const [userIdInput, setUserIdInput] = useState('');
  const [roleInput, setRoleInput] = useState<RoleLevel>('user');

  // Custom permissions for selected moderator
  const [editingPermissionsMod, setEditingPermissionsMod] = useState<any | null>(null);
  const [modCustomPerms, setModCustomPerms] = useState<{ canBan: boolean; canNotify: boolean; canManageSettings: boolean; canViewRoles: boolean }>({
    canBan: false,
    canNotify: false,
    canManageSettings: false,
    canViewRoles: false
  });

  // UI Settings / Sliders
  const [sliderLimit, setSliderLimit] = useState(5);
  const [sliderSeason, setSliderSeason] = useState('auto');
  const [sliderSpeed, setSliderSpeed] = useState(3);
  const [globalAnnouncement, setGlobalAnnouncement] = useState('');
  const [helpTelegramUrl, setHelpTelegramUrl] = useState('https://t.me/otaku_help_support');
  const [groupTelegramUrl, setGroupTelegramUrl] = useState('https://t.me/otaku_group_chat');
  const [donateTelegramUrl, setDonateTelegramUrl] = useState('https://t.me/otaku_owner');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Monetization Settings
  const [monetizationMode, setMonetizationMode] = useState<'simulation' | 'direct_link' | 'script'>('direct_link');
  const [directLinkUrl, setDirectLinkUrl] = useState('https://www.effectivecpmnetwork.com/pt97wb2w?key=f76147a23264a74437b153780898337a');
  const [scriptCode, setScriptCode] = useState('');
  const [stayTime, setStayTime] = useState(10);
  const [adRewardCoins, setAdRewardCoins] = useState(25);

  const [isResettingAll, setIsResettingAll] = useState(false);
  const [resetAllSuccess, setResetAllSuccess] = useState(false);

  // Helper User Lookup Functions - Exposes Names and Custom IDs instead of Cryptic UIDs
  const getUserNameByUid = (uid: string) => {
    if (!uid) return 'غير معروف 👤';
    const found = allUsers.find(u => u.uid === uid);
    if (found) {
      const handle = found.username ? `@${found.username}` : `(${uid.slice(0, 6)})`;
      return `${found.displayName || found.email?.split('@')[0]} [ID: ${handle}]`;
    }
    return `مستخدم [ID: ${uid.slice(0, 6)}]`;
  };

  // Helper to resolve an input user ID (either username like 'mod342' or raw UID) to its corresponding Firebase UID
  const resolveUserByUsernameOrUid = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    // Normalize by stripping leading '@' if they entered e.g. '@mod342'
    const normalizedInput = trimmed.startsWith('@') ? trimmed.slice(1).toLowerCase() : trimmed.toLowerCase();
    const found = allUsers.find(u => (u.username || '').toLowerCase() === normalizedInput);
    if (found) {
      return found.uid;
    }
    return trimmed; // fallback to the raw input as UID
  };

  const getUserEmailByUid = (uid: string) => {
    if (!uid) return '';
    const found = allUsers.find(u => u.uid === uid);
    if (found) {
      return found.email || 'لا يوجد بريد';
    }
    return '';
  };

  // Real-time Subscriptions & Active Observers
  useEffect(() => {
    // 1. Real-time Users List observer
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const items: any[] = [];
      snap.forEach(docSnap => {
        items.push({ uid: docSnap.id, ...docSnap.data() });
      });
      setAllUsers(items);
    }, (err) => console.error("Realtime users error:", err));

    // 2. Real-time Banned Users observer
    const unsubBans = onSnapshot(collection(db, 'bannedUsers'), (snap) => {
      const items: any[] = [];
      snap.forEach(docSnap => {
        items.push({ uid: docSnap.id, ...docSnap.data() });
      });
      setBannedUsers(items);
    }, (err) => console.error("Realtime bans error:", err));

    // 3. Real-time Roles observer
    const unsubRoles = onSnapshot(collection(db, 'globalRoles'), (snap) => {
      const items: any[] = [];
      snap.forEach(docSnap => {
        items.push({ uid: docSnap.id, ...docSnap.data() });
      });
      setUsersInfo(items);
    }, (err) => console.error("Realtime roles error:", err));

    // 4. Real-time Moderation Reports observer (with rich text async resolution)
    const unsubReports = onSnapshot(collection(db, 'reports'), async (snap) => {
      const list: any[] = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });

      const enriched = await Promise.all(list.map(async (r: any) => {
        try {
          if (!r.contentId) return { ...r, contentText: null };
          let contentSnap;
          if (r.contentType === 'comment') {
            contentSnap = await getDoc(doc(db, 'comments', r.contentId));
          } else {
            contentSnap = await getDoc(doc(db, 'recommendations', r.contentId));
          }
          
          if (contentSnap && contentSnap.exists()) {
            const d = contentSnap.data();
            return {
              ...r,
              contentText: d.text || d.reason || '',
              authorId: d.userId || '',
              userDisplayName: d.userDisplayName || 'مفهوم مجهول',
              animeId: d.animeId || 'community'
            };
          }
        } catch (e) {
          console.error("Error enriching report in real-time snapshot:", r.id, e);
        }
        return { ...r, contentText: null };
      }));
      setReports(enriched);
    }, (err) => console.error("Realtime reports error:", err));

    // 5. Real-time Recommendations observer
    const unsubRecommendations = onSnapshot(collection(db, 'recommendations'), (snap) => {
      const items: any[] = [];
      snap.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      setRecommendations(items);
    }, (err) => console.error("Realtime recommendations error:", err));

    // 6. Real-time Suggestions/Complaints observer
    const unsubSuggestions = onSnapshot(collection(db, 'suggestions'), (snap) => {
      const items: any[] = [];
      snap.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      setSuggestionsList(items);
    }, (err) => {
      console.error("Realtime suggestions error:", err);
      handleFirestoreError(err, OperationType.GET, 'suggestions');
    });

    // Load static user role level & specific settings
    const loadInitials = async () => {
      const curRole = await moderationService.getCurrentUserRole();
      setRole(curRole);

      const stats = await moderationService.getAppStats();
      setAppStats(stats);

      let perms = await moderationService.getModPermissions();
      if (auth.currentUser) {
        try {
          const myRoleSnap = await getDoc(doc(db, 'globalRoles', auth.currentUser.uid));
          if (myRoleSnap.exists()) {
            const mData = myRoleSnap.data();
            perms = {
              canBan: mData.canBan ?? perms.canBan,
              canNotify: mData.canNotify ?? perms.canNotify,
              canManageSettings: mData.canManageSettings ?? perms.canManageSettings,
              canViewRoles: mData.canViewRoles ?? perms.canViewRoles,
            };
          }
        } catch (e) {
          console.error("Error reading custom permissions on mount:", e);
        }
      }
      setModPerms(perms);
    };
    loadInitials();

    // Load sliders settings
    try {
      const saved = JSON.parse(localStorage.getItem('adminSliderSettings') || '{"limit": 5, "season": "auto", "speed": 3, "globalAnnouncement": ""}');
      setSliderLimit(saved.limit ?? 5);
      setSliderSeason(saved.season ?? 'auto');
      setSliderSpeed(saved.speed ?? 3);
      setGlobalAnnouncement(saved.globalAnnouncement ?? '');
    } catch (e) {}

    const loadFirestoreSettings = async () => {
      try {
        const fireConfigs = await moderationService.getGlobalSettings('slider');
        if (fireConfigs) {
          setSliderLimit(fireConfigs.limit ?? 5);
          setSliderSeason(fireConfigs.season ?? 'auto');
          setSliderSpeed(fireConfigs.speed ?? 3);
          setGlobalAnnouncement(fireConfigs.globalAnnouncement ?? '');
          localStorage.setItem('adminSliderSettings', JSON.stringify(fireConfigs));
        }
        
        // Load custom telegram links
        const telegramRes = await moderationService.getGlobalSettings('telegramLinks');
        if (telegramRes) {
          setHelpTelegramUrl(telegramRes.helpTelegramUrl ?? 'https://t.me/otaku_help_support');
          setGroupTelegramUrl(telegramRes.groupTelegramUrl ?? 'https://t.me/otaku_group_chat');
          setDonateTelegramUrl(telegramRes.donateTelegramUrl ?? 'https://t.me/otaku_owner');
        }

        // Load monetization settings
        const monetizationRes = await moderationService.getGlobalSettings('monetization');
        if (monetizationRes) {
          setMonetizationMode(monetizationRes.mode ?? 'direct_link');
          setDirectLinkUrl(monetizationRes.directLinkUrl ?? 'https://www.effectivecpmnetwork.com/pt97wb2w?key=f76147a23264a74437b153780898337a');
          setScriptCode(monetizationRes.scriptCode ?? '');
          setStayTime(monetizationRes.stayTime ?? 10);
          setAdRewardCoins(monetizationRes.rewardCoins ?? 25);
        }
      } catch (err) {
        console.error("Failed to fetch settings from DB in admin view:", err);
      }
    };
    loadFirestoreSettings();

    return () => {
      unsubUsers();
      unsubBans();
      unsubRoles();
      unsubReports();
      unsubRecommendations();
      unsubSuggestions();
    };
  }, []);

  // Backwards trigger fallback for manual syncs
  const loadData = async () => {
    const curRole = await moderationService.getCurrentUserRole();
    setRole(curRole);
    const stats = await moderationService.getAppStats();
    setAppStats(stats);
  };

  const loadAllUsers = async () => {
    // Already synchronized by the real-time observer!
  };

  // حساب الـ XP التراكمية الإجمالية
  const calculateTotalCumulativeXp = (lvl: number, currentXp: number): number => {
    let total = 0;
    for (let i = 1; i < lvl; i++) {
      total += Math.floor(Math.pow(i, 1.5) * 500) + 500;
    }
    return total + currentXp;
  };

  // حساب المستوى والـ XP الحالية من الـ XP التراكمية الإجمالية
  const calculateLevelAndXpFromTotal = (totalXp: number): { level: number; xp: number } => {
    let lvl = 1;
    let remainingXp = Math.max(0, totalXp);
    let req = Math.floor(Math.pow(lvl, 1.5) * 500) + 500;
    
    while (remainingXp >= req && lvl < 100) {
      remainingXp -= req;
      lvl++;
      req = Math.floor(Math.pow(lvl, 1.5) * 500) + 500;
    }
    
    if (lvl >= 100) {
      lvl = 100;
      if (remainingXp > req) {
        remainingXp = req;
      }
    }
    
    return { level: lvl, xp: remainingXp };
  };

  const handleDeleteRec = async (recId: string) => {
    try {
      const rec = recommendations.find(r => r.id === recId);
      await moderationService.deleteRecommendation(recId);
      // Update local state immediately
      setRecommendations(prev => prev.filter(item => item.id !== recId));
      
      if (rec && rec.status === 'approved' && rec.userId) {
        const userRef = doc(db, 'users', rec.userId);
        const { increment } = await import('firebase/firestore');
        await updateDoc(userRef, {
          approvedRecommendationsCount: increment(-1),
          recommendationsAccepted: increment(-1)
        });
      }
      setRecIdBeingDeleted(null);
      alert('تم حذف التوصية بنجاح.');
    } catch (e) {
      console.error(e);
      alert('فشل في حذف التوصية.');
    }
  };

  const handleApproveRec = async (rec: any) => {
    try {
      const recRef = doc(db, 'recommendations', rec.id);
      const { deleteField } = await import('firebase/firestore');
      await updateDoc(recRef, {
        status: 'approved',
        rejectionReason: deleteField()
      });

      // Update local state immediately
      setRecommendations(prev => prev.map(item => item.id === rec.id ? { ...item, status: 'approved', rejectionReason: undefined } : item));

      if (rec.status !== 'approved' && rec.userId) {
        const userRef = doc(db, 'users', rec.userId);
        const { increment } = await import('firebase/firestore');
        await updateDoc(userRef, {
          approvedRecommendationsCount: increment(1),
          recommendationsAccepted: increment(1)
        });
      }

      if (rec.userId) {
        await notificationsService.createUserNotification(rec.userId, {
          title: '✅ تم اعتماد وقبول توصيتك!',
          body: `تمت مراجعة وقبول توصيتك المميزة لـ "${rec.targetAnimeTitle}". شكراً لمساهمتك معنا! 🌟`,
          type: 'social',
          imageUrl: rec.targetAnimePosterUrl || rec.animePosterUrl || '',
          linkTo: `anime_details:${rec.animeId}`
        });
      }

      alert('تم قبول واعتماد التوصية بنجاح، وإرسال إشعار للموصي! ✓');
    } catch (e) {
      console.error(e);
      alert('فشل في قبول التوصية.');
    }
  };

  const handleRejectRec = async (rec: any, reason: string) => {
    if (!reason || !reason.trim()) {
      alert('يجب كتابة سبب الرفض لتوضيح الأمر للموصي!');
      return;
    }

    try {
      const recRef = doc(db, 'recommendations', rec.id);
      await updateDoc(recRef, {
        status: 'rejected',
        rejectionReason: reason.trim()
      });

      // Update local state immediately
      setRecommendations(prev => prev.map(item => item.id === rec.id ? { ...item, status: 'rejected', rejectionReason: reason.trim() } : item));

      if (rec.status === 'approved' && rec.userId) {
        const userRef = doc(db, 'users', rec.userId);
        const { increment } = await import('firebase/firestore');
        await updateDoc(userRef, {
          approvedRecommendationsCount: increment(-1),
          recommendationsAccepted: increment(-1)
        });
      }

      if (rec.userId) {
        await notificationsService.createUserNotification(rec.userId, {
          title: '❌ لم يتم قبول توصيتك الأخيرة',
          body: `نعتذر منك، لم تتم الموافقة على توصيتك لـ "${rec.targetAnimeTitle}". السبب: ${reason.trim()}`,
          type: 'system',
          imageUrl: rec.targetAnimePosterUrl || rec.animePosterUrl || '',
          linkTo: 'rewards'
        });
      }

      setRecIdBeingRejected(null);
      setRecRejectionReasonInput('');
      alert('تم رفض التوصية بنجاح وإرسال إشعار للموصي بالسبب. ✓');
    } catch (e) {
      console.error(e);
      alert('فشل في رفض التوصية.');
    }
  };

  const handleUpdateUserStats = async () => {
    if (!editingUser) return;
    try {
      setIsUpdatingUser(true);
      const { level: finalLevel, xp: finalXp } = calculateLevelAndXpFromTotal(editingXP);
      await moderationService.updateUserCoinsAndXP(editingUser.uid, editingCoins, finalXp, finalLevel);
      await moderationService.restrictMember(editingUser.uid, {
        isMuted: editingIsMuted,
        isGamesRestricted: editingIsGamesRestricted,
        isCoinsRestricted: editingIsCoinsRestricted
      });
      setEditingUser(null);
      alert('تم حفظ بيانات وصلاحيات العضو وتطبيقها بنجاح.');
      loadAllUsers();
    } catch (e) {
      console.error(e);
      alert('عذراً، فشل في حفظ البيانات.');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleAssignRole = async () => {
    if (!userIdInput) {
      alert('الرجاء اختيار أو إدخال معرّف ID للمستخدم (اسم المستخدم أو UID).');
      return;
    }
    try {
      const resolvedUid = resolveUserByUsernameOrUid(userIdInput);
      await moderationService.assignRole(resolvedUid, roleInput);
      setUserIdInput('');
      setSelectedSearchUser(null);
      setRoleSearchQuery('');
      alert('تم تحديث الرتبة وحفظ الصلاحيات بنجاح.');
      loadData();
    } catch (e) {
      console.error(e);
      alert('فشل تعيين الرتبة.');
    }
  };

  const handleBan = async () => {
    if (!userIdInput) return;
    try {
      const resolvedUid = resolveUserByUsernameOrUid(userIdInput);
      await moderationService.banUser(resolvedUid, 'مخالفة الشروط العامة والآداب');
      setUserIdInput('');
      setSelectedSearchUser(null);
      alert('تم حظر المستخدم وإضافته لسجلات الحظر بنجاح.');
      loadData();
    } catch (e) {
      console.error(e);
      alert('عذراً، تعذر حظر هذا المستخدم.');
    }
  };

  const handleUnban = async (uid: string) => {
    try {
      await moderationService.unbanUser(uid);
      alert('تم إلغاء حظر العضو بنجاح.');
      loadData();
    } catch (e) {
      console.error(e);
      alert('فشل إلغاء الحظر.');
    }
  };

  const handleAnimeSearch = async (query: string) => {
    setAnimeSearchQuery(query);
    if (!query.trim()) {
      setAnimeSuggestions([]);
      return;
    }
    setIsSearchingAnime(true);
    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      if (data && data.data) {
        setAnimeSuggestions(data.data);
      }
    } catch (e) {
      console.error("Failed to search anime for notifications:", e);
    } finally {
      setIsSearchingAnime(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) return;
    
    try {
      let finalLink = notifLinkTo;
      if (interactiveLinkChoice === 'rewards') finalLink = 'rewards';
      else if (interactiveLinkChoice === 'games') finalLink = 'games';
      else if (interactiveLinkChoice === 'leaderboard') finalLink = 'leaderboard';
      else if (interactiveLinkChoice === 'community') finalLink = 'community';
      else if (interactiveLinkChoice === 'anime' && selectedNotifAnime) {
        finalLink = `anime_details:${selectedNotifAnime.mal_id}`;
      }

      if (notifTargetChoice === 'specific') {
        if (!notifTargetUid.trim()) {
          alert('الرجاء توفير معرف ID/UID للمستلم المحدد.');
          return;
        }
        const resolvedUid = resolveUserByUsernameOrUid(notifTargetUid);
        await notificationsService.createUserNotification(resolvedUid, {
          title: notifTitle,
          body: notifBody,
          type: notifType as any,
          imageUrl: notifImageUrl || undefined,
          linkTo: finalLink || undefined
        });
      } else {
        await notificationsService.createGlobalNotification({
           title: notifTitle,
           body: notifBody,
           type: notifType as any,
           imageUrl: notifImageUrl || undefined,
           linkTo: finalLink || undefined
        });
      }
      
      setNotifTitle('');
      setNotifBody('');
      setNotifImageUrl('');
      setNotifLinkTo('');
      setSelectedNotifAnime(null);
      setAnimeSearchQuery('');
      setAnimeSuggestions([]);
      setInteractiveLinkChoice('none');
      
      setNotifSentBanner(true);
      setTimeout(() => setNotifSentBanner(false), 5000);
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء رغبة إرسال التنبيه.');
    }
  };

  const handleSaveModCustomPermissions = async () => {
    if (!editingPermissionsMod) return;
    try {
      const userRoleRef = doc(db, 'globalRoles', editingPermissionsMod.uid);
      await updateDoc(userRoleRef, {
        canBan: modCustomPerms.canBan,
        canNotify: modCustomPerms.canNotify,
        canManageSettings: modCustomPerms.canManageSettings,
        canViewRoles: modCustomPerms.canViewRoles
      });
      alert('تم حفظ التراخيص الإضافية للمراقب بنجاح.');
      setEditingPermissionsMod(null);
      loadData();
    } catch (e) {
      console.error(e);
      alert('فشل حفظ الصلاحيات المخصصة.');
    }
  };

  const saveSliderSettings = async () => {
    try {
      setIsSavingSettings(true);
      const payload = {
        limit: sliderLimit,
        season: sliderSeason,
        speed: sliderSpeed,
        globalAnnouncement: globalAnnouncement,
        updatedAt: new Date().toISOString()
      };
      await moderationService.updateGlobalSettings('slider', payload);
      localStorage.setItem('adminSliderSettings', JSON.stringify(payload));
      
      // Save telegram links
      await moderationService.updateGlobalSettings('telegramLinks', {
        helpTelegramUrl,
        groupTelegramUrl,
        donateTelegramUrl,
        updatedAt: new Date().toISOString()
      });

      // Save monetization settings
      await moderationService.updateGlobalSettings('monetization', {
        mode: monetizationMode,
        directLinkUrl,
        scriptCode,
        stayTime,
        rewardCoins: adRewardCoins,
        updatedAt: new Date().toISOString()
      });
      
      alert('تم حفظ وتحديث إعدادات السلايدر، البرودكاست، وروابط تليجرام، وإعدادات الربح الإعلاني بنجاح.');
    } catch (error) {
      console.error("Error saving global configs:", error);
      alert('فشل في حفظ الإعدادات المتزامنة.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleResetAllAccounts = async () => {
    const confirmation = window.confirm("🚨 تحذير هام وإجراء حرج:\nهل أنت متأكد من رغبتك في إعادة تهيئة حسابات كافة الأعضاء وتصفير جميع الكوينز والمستويات ونقاط الـ XP بالمنصة؟\n\nلا يمكن التراجع عن هذا الإجراء الإداري!");
    if (!confirmation) return;
    
    try {
      setIsResettingAll(true);
      await moderationService.resetAllAccounts();
      setResetAllSuccess(true);
      setTimeout(() => setResetAllSuccess(false), 5000);
      alert('تم إعادة تهيئة وتصفير الحسابات بكافة قاعدة البيانات بنجاح.');
      loadData();
    } catch (err) {
      console.error(err);
      alert('فشلت عملية إعادة تهيئة الحسابات.');
    } finally {
      setIsResettingAll(false);
    }
  };

  const suggestedRoleUsers = roleSearchQuery.trim().length > 0
    ? allUsers.filter(u => {
        const nameAndEmail = `${u.displayName || ''} ${u.email || ''} ${u.uid || ''} ${u.username || ''}`.toLowerCase();
        return nameAndEmail.includes(roleSearchQuery.toLowerCase());
      }).slice(0, 8)
    : [];

  const pendingReportsCount = useMemo(() => reports.filter(r => r.status === 'pending').length, [reports]);

  // Comprehensive Live Stats Metric Engine
  const statsMetrics = useMemo(() => {
    const totalUsersCount = allUsers.length || 1;
    let totalCoinsCirculation = 0;
    let totalXPAccumulated = 0;
    let maxUserLevel = 1;
    let sumOfAllLevels = 0;

    allUsers.forEach(u => {
      totalCoinsCirculation += Number(u.coins || 0);
      totalXPAccumulated += Number(u.xp || 0);
      sumOfAllLevels += Number(u.level || 1);
      if (Number(u.level || 1) > maxUserLevel) {
        maxUserLevel = Number(u.level);
      }
    });

    const averageCoinsHeld = Math.round(totalCoinsCirculation / totalUsersCount);
    const averageUserLevel = Math.round((sumOfAllLevels / totalUsersCount) * 10) / 10;

    // Categorized level segments for distribution representation
    const segments = {
      starter: allUsers.filter(u => (u.level || 1) <= 5).length,
      regular: allUsers.filter(u => (u.level || 1) > 5 && (u.level || 1) <= 15).length,
      veteran: allUsers.filter(u => (u.level || 1) > 15 && (u.level || 1) <= 30).length,
      elite: allUsers.filter(u => (u.level || 1) > 30).length
    };

    return {
      totalUsers: allUsers.length,
      totalBans: bannedUsers.length,
      totalReports: reports.length,
      pendingReports: reports.filter(r => r.status === 'pending').length,
      dismissedReports: reports.filter(r => r.status === 'dismissed').length,
      deletedContentReports: reports.filter(r => r.status === 'deleted_content').length,
      mutedCount: allUsers.filter(u => u.isMuted).length,
      restrictedGamesCount: allUsers.filter(u => u.isGamesRestricted).length,
      restrictedCoinsCount: allUsers.filter(u => u.isCoinsRestricted).length,
      totalCoins: totalCoinsCirculation,
      totalXP: totalXPAccumulated,
      maxLevel: maxUserLevel,
      avgCoins: averageCoinsHeld,
      avgLevel: averageUserLevel,
      segments
    };
  }, [allUsers, bannedUsers, reports]);

  // Modernized, calm, quiet tabs layout config
  const tabsList = [
    { id: 'reports', label: 'المخالفات والبلاغات', icon: ShieldAlert, badge: pendingReportsCount, color: 'text-rose-400', desc: 'إجراءات تصفية التعليقات المبلّغ عنها لحفظ النظام' },
    { id: 'users_management', label: 'دليل الأعضاء', icon: Users, color: 'text-emerald-400', desc: 'البحث، تعديل رصيد الكوينز والمستويات، وكتم الأعضاء' },
    { id: 'roles', label: 'الرتب والإشراف', icon: Lock, color: 'text-violet-400', desc: 'صلاحيات طاقم المراقبة والتحكم في تعيين الأدوار' },
    { id: 'bans', label: 'إدارة الحظر والأمان', icon: UserX, color: 'text-red-400', desc: 'مراجعة قوائم المبعدين وفك قيود الحظر الإستثنائية' },
    { id: 'recommendations', label: 'إدارة التوصيات والمحتوى', icon: Lightbulb, color: 'text-amber-300', desc: 'البحث عن توصيات الأنمي المقدمة من الأعضاء وحذفها أو مراجعتها' },
    { id: 'suggestions_moderation', label: 'الاقتراحات والشكاوى', icon: MessageSquare, badge: suggestionsList.length, color: 'text-sky-400', desc: 'استعراض مقترحات وشكاوى الأعضاء المباشرة' },
    { id: 'notifications', label: 'بث تنبيه تفاعلي', icon: BellRing, color: 'text-indigo-400', desc: 'صياغة وإرسال رسائل توجيهية وحدثية عامة أو خاصة' },
    { id: 'settings', label: 'إعدادات المنصة', icon: Settings, color: 'text-amber-400', desc: 'تخصيص حدود السلايدر وبث شريط الإعلانات الصاعد' },
    { id: 'stats', label: 'التحليلات والإحصائيات', icon: Activity, color: 'text-sky-400', desc: 'معاينة متكاملة للنشاط والاستقرار البرمجي العام' },
    { id: 'database_reset', label: 'مزامنة وتصفير الحسابات', icon: AlertTriangle, color: 'text-rose-500', desc: 'إجراء صيانة تصفيري لحسابات المشتركين ومستويات اللعب' }
  ];

  if (role === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 selection:bg-rose-600/50 selection:text-white" dir="rtl" id="admin_loading_container">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-t-rose-500 border-zinc-800 rounded-full animate-spin mx-auto" />
          <p className="text-zinc-400 text-xs font-semibold">جاري التحقق من صلاحيات المشرف...</p>
        </div>
      </div>
    );
  }

  if (role === 'user') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 selection:bg-rose-600/50 selection:text-white" dir="rtl" id="unauthorized_container">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl text-center max-w-sm w-full shadow-xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[3px] bg-rose-500" />
          <ShieldAlert size={40} className="text-rose-500 mx-auto mb-4" />
          <h2 className="text-zinc-100 text-lg font-bold mb-2">القسم مغلق للعامة 🛡️</h2>
          <p className="text-zinc-400 text-xs leading-relaxed">
            هذه الزاوية الإشرافية والتحليلية مخصصة فقط لأصحاب الرتب الإدارية وأعضاء طاقم الدعم المعتمدين لمنصة الأوتوكو.
          </p>
          <button 
            id="btn_unauthorized_back"
            onClick={onBack} 
            className="mt-6 w-full bg-zinc-800 hover:bg-zinc-750 text-zinc-100 font-semibold py-2 rounded-xl text-xs transition cursor-pointer border border-zinc-700/60"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 min-h-screen text-zinc-100 font-sans text-right selection:bg-rose-600/50 selection:text-white pb-16" dir="rtl" id="container_admin_dashboard">
      
      {/* Sleek, eye-soothing top header */}
      <header className="bg-zinc-900/30 border-b border-zinc-900 sticky top-0 z-40 backdrop-blur-md px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              id="btn_admin_back"
              onClick={onBack} 
              className="w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition cursor-pointer"
              title="تراجع"
            >
              <ChevronRight size={18} />
            </button>
            <div>
              <h1 className="text-base font-bold flex items-center gap-2 text-zinc-100">
                <Shield className="text-rose-500" size={16} /> 
                <span>لوحة التحكم والإرشاد العام</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-zinc-500">الرتبة الحالية:</span>
                <span className={`text-[9px] font-semibold px-2 py-0.2 rounded ${
                  role === 'owner' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                  role === 'admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}>
                  {role === 'owner' ? 'مؤسس المنصة 👑' : role === 'admin' ? 'مدير الأوتوكو 🍁' : 'مراقب عام 🛡️'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] bg-zinc-900/80 border border-zinc-800/60 px-3 py-1.5 rounded-lg text-zinc-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>النظام متصل وآمن</span>
          </div>
        </div>
      </header>

      {/* Modern Top Tabs Ribbon + Content Area */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
        
        {/* Banner Success */}
        {notifSentBanner && (
          <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium flex items-center gap-2.5 animate-fadeIn">
            <Check size={14} className="text-emerald-400 shrink-0" />
            <span>تم إعداد وإرسال التنبيه وبثه بنجاح تام لجميع الحسابات المستهدفة! ✨</span>
          </div>
        )}

        {/* Dynamic Bento Ribbon (Real-time live metrics) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 bg-zinc-900/10 border border-zinc-900/80 p-3 rounded-2xl">
          <div className="bg-zinc-950/40 border border-zinc-900/60 p-3 rounded-xl text-right">
            <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">الأعضاء واللاعبين</span>
            <span className="text-base font-extrabold text-zinc-100 mt-0.5 block">{allUsers.length || 0} 👤</span>
          </div>
          <div className="bg-zinc-950/40 border border-zinc-900/60 p-3 rounded-xl text-right">
            <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">سجل المحظورين</span>
            <span className="text-base font-extrabold text-rose-400 mt-0.5 block">{bannedUsers.length || 0} 🚫</span>
          </div>
          <div className="bg-zinc-950/40 border border-zinc-900/60 p-3 rounded-xl text-right">
            <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">البلاغات المعلّقة</span>
            <span className={`text-base font-extrabold mt-0.5 block ${pendingReportsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {pendingReportsCount} 🚩
            </span>
          </div>
          <div className="bg-zinc-950/40 border border-zinc-900/60 p-3 rounded-xl text-right">
            <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">طاقم الرقابة والإدارة</span>
            <span className="text-base font-extrabold text-violet-400 mt-0.5 block">{usersInfo.length || 1} 🛡️</span>
          </div>
        </div>

        {/* 🌟 Upper Tabs Toolbar (التبويبات في الأعلى مع دعم تمرير أفقي على الجوال) 🌟 */}
        <div className="bg-zinc-900/40 border border-zinc-900/80 p-2 rounded-2xl mb-6">
          <div className="overflow-x-auto scrollbar-none flex items-center gap-1.5 pb-0.5 select-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {tabsList.map(item => {
              const isSelected = activeTab === item.id;
              
              // Permissions Check
              if (item.id === 'database_reset' && role !== 'owner' && role !== 'admin') return null;
              if (item.id === 'roles' && role !== 'owner' && role !== 'admin' && !modPerms?.canViewRoles) return null;
              if (item.id === 'bans' && role !== 'owner' && role !== 'admin' && !modPerms?.canBan) return null;
              if (item.id === 'notifications' && role !== 'owner' && role !== 'admin' && !modPerms?.canNotify) return null;
              if (item.id === 'settings' && role !== 'owner' && role !== 'admin' && !modPerms?.canManageSettings) return null;

              const TabIcon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition text-right shrink-0 cursor-pointer text-xs font-semibold ${
                    isSelected 
                      ? 'bg-zinc-800 text-zinc-100 font-bold shadow-md border border-zinc-750' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  }`}
                  id={`btn_admin_tab_${item.id}`}
                >
                  <span className={`transition-colors shrink-0 ${isSelected ? 'text-rose-400' : 'text-zinc-500'}`}>
                    <TabIcon size={14} />
                  </span>
                  <span>{item.label}</span>
                  
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full select-none ml-1 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Workspace View (Full Width) */}
        <div className="w-full">
          <main className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-5 md:p-6" id="active_admin_pane">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
              >
                
                {/* 1. REPORTS TAB */}
                {activeTab === 'reports' && (
                  <div className="space-y-6">
                    <div className="border-b border-zinc-800 pb-4">
                      <div className="flex items-center gap-2">
                        <ShieldAlert size={18} className="text-zinc-400" />
                        <h2 className="text-sm font-bold text-zinc-100">سجل المخالفات والبلاغات المعلقة</h2>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">مراجعة المحتويات والتعليقات المبلّغ عنها لحذف المحتوى المخالف أو حفظ البلاغ.</p>
                    </div>

                    <div className="space-y-3">
                      {reports.length === 0 ? (
                        <div className="text-center py-12 bg-zinc-900/10 border border-zinc-905 rounded-xl">
                          <ShieldCheck size={28} className="mx-auto text-zinc-600 mb-2" />
                          <h3 className="text-xs font-semibold text-zinc-400">لوحة البلاغات فارغة ونظيفة!</h3>
                          <p className="text-[11px] text-zinc-500 mt-1">ممتاز، لا توجد شكاوى أو بلاغات معلّقة بانتظار المراجعة.</p>
                        </div>
                      ) : (
                        reports.map(report => {
                          const reporterName = getUserNameByUid(report.reporterId);
                          const authorName = getUserNameByUid(report.authorId);
                          
                          return (
                            <div key={report.id} className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between text-[10px] text-zinc-400 border-b border-zinc-800 pb-2">
                                <span className={`px-2 py-0.5 rounded font-medium ${report.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                  {report.status === 'pending' ? 'بانتظار الإجراء' : 'معالج'}
                                </span>
                                <span className="font-mono text-zinc-500">بلاغ ID: {report.id}</span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900">
                                  <span className="text-[9px] text-zinc-500 block">المشتكي 🚩:</span>
                                  <span className="font-semibold text-zinc-300 block mt-0.5">{reporterName}</span>
                                </div>
                                <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900">
                                  <span className="text-[9px] text-rose-400 block font-medium">المبلّغ ضده 👤:</span>
                                  <span className="font-semibold text-zinc-200 block mt-0.5">{authorName}</span>
                                </div>
                              </div>

                              <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-850">
                                <span className="text-[9px] text-zinc-500 block mb-0.5">المحتوى المستهدف:</span>
                                <p className="text-xs text-rose-100 font-medium whitespace-pre-wrap leading-relaxed">
                                  {report.contentText ? report.contentText : <span className="text-zinc-600 block italic">- لم يعد المحتوى متوفرًا أو تم حذفه مسبقًا -</span>}
                                </p>
                              </div>

                              <div className="bg-zinc-900/10 p-2.5 rounded-lg text-xs border border-zinc-850">
                                <span className="text-[9px] text-zinc-500 block">السبب المرفق بالبلاغ:</span>
                                <span className="text-zinc-300 font-medium mt-0.5 block">{report.reason}</span>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1">
                                {onNavigate && report.contentText && (
                                  <button
                                    onClick={() => {
                                      if (report.contentType === 'comment') {
                                        if (report.animeId === 'community') {
                                          onNavigate('community', { focusCommentId: report.contentId });
                                        } else {
                                          onNavigate('anime_comments', { animeId: report.animeId, focusCommentId: report.contentId });
                                        }
                                      } else {
                                        if (report.animeId === 'community') {
                                          onNavigate('community');
                                        } else {
                                          onNavigate('anime_details', { id: report.animeId });
                                        }
                                      }
                                    }}
                                    className="text-[10px] text-zinc-400 hover:text-zinc-200 px-2.5 py-1 rounded-lg transition border border-zinc-800 hover:bg-zinc-900/80 cursor-pointer flex items-center gap-1 font-semibold"
                                  >
                                    {report.contentType === 'comment' ? (
                                      <>
                                        <MessageSquare size={11} className="text-rose-400" />
                                        <span className="text-rose-400 font-bold">معاينة التعليق مباشرة 💬</span>
                                      </>
                                    ) : (
                                      <>
                                        <ExternalLink size={11} />
                                        <span>معاينة مساحة التوصية 🔍</span>
                                      </>
                                    )}
                                  </button>
                                )}

                                {report.status === 'pending' && (
                                  <div className="flex items-center gap-2 mr-auto">
                                    <button
                                      onClick={() => moderationService.resolveReport(report.id, 'dismissed', report.contentType, report.contentId).then(loadData)}
                                      className="px-3 py-1.5 hover:bg-zinc-800 text-[10px] font-semibold text-zinc-300 rounded-lg transition border border-zinc-800 cursor-pointer"
                                    >
                                      حفظ التجاهل
                                    </button>
                                    <button
                                      onClick={() => moderationService.resolveReport(report.id, 'deleted_content', report.contentType, report.contentId).then(loadData)}
                                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-[10px] font-bold text-white rounded-lg transition cursor-pointer"
                                    >
                                      حذف المحتوى والمنشور 🗑️
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* 2. NOTIFICATIONS TAB */}
                {activeTab === 'notifications' && (role === 'owner' || role === 'admin' || (role === 'moderator' && modPerms?.canNotify)) && (
                  <div className="space-y-6">
                    <div className="border-b border-zinc-800 pb-4">
                      <div className="flex items-center gap-2">
                        <BellRing size={18} className="text-zinc-400" />
                        <h2 className="text-sm font-bold text-zinc-100">بث تنبيه تفاعلي جديد بالمنصة</h2>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">إنشاء وإرسال تنبيهات ديناميكية فورية لـجميع الأعضاء أو لعضو مخصص.</p>
                    </div>

                    <div className="space-y-4">
                      {/* Target Select */}
                      <div className="bg-zinc-950/40 p-3 border border-zinc-900 rounded-xl flex items-center gap-4 text-xs">
                        <span className="text-zinc-400 font-medium shrink-0">المستفيد:</span>
                        <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                          <input 
                            type="radio" 
                            name="targetChoice" 
                            checked={notifTargetChoice === 'all'} 
                            onChange={() => setNotifTargetChoice('all')}
                            className="accent-rose-500 cursor-pointer"
                          />
                          <span>بث عام للجميع 📢</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                          <input 
                            type="radio" 
                            name="targetChoice" 
                            checked={notifTargetChoice === 'specific'} 
                            onChange={() => setNotifTargetChoice('specific')}
                            className="accent-rose-500 cursor-pointer"
                          />
                          <span>موقع باسم المستخدم أو الـ ID السريع 🎯</span>
                        </label>
                      </div>

                      {notifTargetChoice === 'specific' && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-400 block font-semibold">اسم المعرّف (ID) للمستلم المخصص:</label>
                          <input 
                            type="text" 
                            placeholder="أدخل الـ ID بدقة (أو اسم المستخدم)..." 
                            value={notifTargetUid}
                            onChange={e => setNotifTargetUid(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 font-mono text-right focus:outline-none focus:border-zinc-700"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-400 block font-semibold">عنوان التنبيه:</label>
                          <input 
                            type="text" 
                            placeholder="مثال: حلقة حاسمة متوفرة الآن..." 
                            value={notifTitle}
                            onChange={e => setNotifTitle(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 text-right focus:outline-none focus:border-zinc-700"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-400 block font-semibold">رابط الأيقونة أو الصورة (اختياري):</label>
                          <input 
                            type="text" 
                            placeholder="رابط مباشر للصورة إن وجد..." 
                            value={notifImageUrl}
                            onChange={e => setNotifImageUrl(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 text-right focus:outline-none focus:border-zinc-700"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400 block font-semibold">نص ومضمون التنبيه الإعلاني:</label>
                        <textarea 
                          placeholder="اكتب مضمون الرسالة التنبيهية بوضوح..." 
                          value={notifBody}
                          onChange={e => setNotifBody(e.target.value)}
                          rows={2}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs text-zinc-100 text-right focus:outline-none focus:border-zinc-700 resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-400 block font-semibold">تسمية وتصنيف التنبيه:</label>
                          <select 
                            value={notifType} 
                            onChange={e => setNotifType(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-200 text-right focus:outline-none"
                          >
                            <option value="system">🔔 نظام عام</option>
                            <option value="episode">🎬 حلقة جديدة</option>
                            <option value="anime">✨ أنمي جديد متوفر</option>
                            <option value="season_end">🏁 انتهاء الموسم</option>
                            <option value="anime_status">💥 مستجدات الأنمي</option>
                            <option value="tournament">🏆 بطولة فعاليات الأوتاكو</option>
                            <option value="reward">🎁 مكافآت ومهمات</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-400 block font-semibold">وجهة زر النقر التفاعلي (رابط داخلي):</label>
                          <select 
                            value={interactiveLinkChoice} 
                            onChange={e => {
                              setInteractiveLinkChoice(e.target.value as any);
                              setSelectedNotifAnime(null);
                              setAnimeSearchQuery('');
                              setAnimeSuggestions([]);
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-200 text-right focus:outline-none"
                          >
                            <option value="none">❌ بدون رابط تفاعلي داخلي</option>
                            <option value="rewards">🎁 العرض المخصص لجوائز ومكافآت المشتركين</option>
                            <option value="games">🎮 ساحة الألعاب والمسابقات</option>
                            <option value="leaderboard">🏆 قائمة الصدارة للتحاديات الكبرى</option>
                            <option value="community">💬 كافيه ومنتدى الأوتوكو العام</option>
                            <option value="anime">🎬 الانتقال المباشر لصفحة الأنمي</option>
                          </select>
                        </div>
                      </div>

                      {/* Anime Jikan search linkage */}
                      {interactiveLinkChoice === 'anime' && (
                        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-3.5">
                          <span className="block text-[10px] text-zinc-400 font-bold">ابحث باللغة الإنجليزية لربط الإشعار بالأنمي:</span>
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder="اكتب لتأكيد البحث..." 
                              value={animeSearchQuery}
                              onChange={e => handleAnimeSearch(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 text-right"
                            />
                            <Search size={12} className="absolute right-3 top-2.5 text-zinc-500" />
                          </div>

                          {isSearchingAnime && <p className="text-[10px] text-zinc-500">جاري فحص وقوة قواعد البيانات Jikan APIs...</p>}

                          {animeSuggestions.length > 0 && !selectedNotifAnime && (
                            <div className="border border-zinc-800 rounded-xl divide-y divide-zinc-800 bg-zinc-900 max-h-40 overflow-y-auto">
                              {animeSuggestions.map((anime: any) => (
                                <div 
                                  key={anime.mal_id} 
                                  onClick={() => {
                                    setSelectedNotifAnime(anime);
                                    setAnimeSearchQuery(anime.title);
                                    setAnimeSuggestions([]);
                                  }}
                                  className="p-2.5 hover:bg-zinc-800 flex items-center justify-between text-right cursor-pointer text-xs"
                                >
                                  <span className="font-semibold text-zinc-200">{anime.title}</span>
                                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 py-1 px-2 rounded-md font-semibold">اختر</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {selectedNotifAnime && (
                            <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl text-xs">
                              <span className="font-semibold text-emerald-400">تم الربط بنجاح: {selectedNotifAnime.title}</span>
                              <button 
                                onClick={() => { setSelectedNotifAnime(null); setAnimeSearchQuery(''); }}
                                className="text-[9px] bg-red-500/10 text-red-400 px-2.5 py-1 rounded-md border border-red-500/10"
                              >
                                حذف الارتباط ×
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <button 
                        onClick={handleSendNotification} 
                        disabled={!notifTitle.trim() || !notifBody.trim() || (interactiveLinkChoice === 'anime' && !selectedNotifAnime)}
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl transition text-xs cursor-pointer shadow-md disabled:opacity-40 disabled:hover:scale-100"
                      >
                        بث وإرسال التنبيه التفاعلي الآن للجميع 🚀
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. USERS MANAGEMENT TAB */}
                {activeTab === 'users_management' && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Users size={18} className="text-zinc-400" />
                          <h2 className="text-sm font-bold text-zinc-100">فهرس وسجلات حسابات الأعضاء</h2>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1">البحث والتحقق من حسابات الأعضاء وتحديث الكوينز الخاصة بهم وكتمهم عند الحاجة.</p>
                      </div>
                      <button 
                        onClick={loadAllUsers} 
                        className="bg-zinc-900 border border-zinc-800 text-zinc-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-zinc-800 transition cursor-pointer"
                      >
                        🔄 تحديث قاعدة البيانات
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="relative">
                        <label className="block text-[10px] text-zinc-400 mb-1 font-semibold">البحث بالاسم أو اسم المعرّف (ID):</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="اكتب لتسريع البحث..." 
                            value={searchUserQuery} 
                            onChange={e => setSearchUserQuery(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 text-right pr-8 focus:outline-none"
                          />
                          <Search size={12} className="absolute right-2.5 top-2.5 text-zinc-505 shrink-0" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1 font-semibold">تصفية حسب الحالة الصحية:</label>
                        <select 
                          value={userFilterBy} 
                          onChange={e => setUserFilterBy(e.target.value as any)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 text-right focus:outline-none"
                        >
                          <option value="all">كل المستخدمين النشطين</option>
                          <option value="muted">مكتومي الصوت بالمنظومة 🔇</option>
                          <option value="gamesRestricted">مقيدي صلاحيات الألعاب 🎮</option>
                          <option value="coinsRestricted">مجمّدي رصيد الكوينز والتسوق 💰</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1 font-semibold font-sans">معيار ترتيب الفرز:</label>
                        <select 
                          value={userSortBy} 
                          onChange={e => setUserSortBy(e.target.value as any)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 text-right focus:outline-none"
                        >
                          <option value="default">حسب تاريخ الانضمام</option>
                          <option value="coins">الأكثر كوينز 🪙</option>
                          <option value="level">الأعلى رتبة ومستوى ⭐</option>
                          <option value="xp">الأكثر نقاط خبرة XP 🚀</option>
                        </select>
                      </div>
                    </div>

                    {/* Member Editing Overlay Modal */}
                    {editingUser && (
                      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-4 text-right animate-fadeIn">
                        <div className="flex justify-between items-center bg-zinc-950/40 p-2 rounded-lg">
                          <h3 className="text-xs font-bold text-zinc-300">حقن وتعديل تراخيص العضو: {editingUser.displayName || 'أوتاكو'}</h3>
                          <button 
                            onClick={() => setEditingUser(null)} 
                            className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] text-zinc-400 mb-1 font-medium">الكوينز (Coins):</label>
                            <input 
                              type="number" 
                              value={editingCoins} 
                              onChange={e => setEditingCoins(Number(e.target.value))} 
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 text-center text-xs text-zinc-200 font-bold" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-zinc-400 mb-1 font-medium text-right">
                              إجمالي الخبرة (XP):
                            </label>
                            <input 
                              type="number" 
                              value={editingXP} 
                              onChange={e => {
                                const val = Math.max(0, Number(e.target.value));
                                setEditingXP(val);
                                // احتساب المستوى تلقائياً من إجمالي الـ XP وتحديثه لحظياً
                                const { level: calculatedLvl } = calculateLevelAndXpFromTotal(val);
                                setEditingLevel(calculatedLvl);
                              }} 
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 text-center text-xs text-zinc-200 font-bold" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-zinc-400 mb-1 font-medium font-sans text-right">المستوى (Lvl):</label>
                            <input 
                              type="number" 
                              value={editingLevel} 
                              onChange={e => {
                                const lvl = Math.max(1, Math.min(100, Number(e.target.value)));
                                setEditingLevel(lvl);
                                // عند تغيير المستوى، تتغير نقاط الخبرة لأقل عدد تراكمي ممكن للوصول لهذا المستوى
                                const minXpForLvl = calculateTotalCumulativeXp(lvl, 0);
                                setEditingXP(minXpForLvl);
                              }} 
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 text-center text-xs text-zinc-200 font-bold" 
                            />
                          </div>
                        </div>

                        {/* Toggles Custom Control with comfy layout */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-zinc-800">
                          <button 
                            onClick={() => setEditingIsMuted(!editingIsMuted)}
                            className={`p-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-between transition cursor-pointer ${
                              editingIsMuted ? 'bg-rose-500/10 border-rose-500/20 text-rose-400':'bg-zinc-950/40 border-zinc-850 text-zinc-500'
                            }`}
                          >
                            <span>كتم الصلاحية 🔇</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${editingIsMuted?'bg-rose-500':'bg-zinc-800'}`} />
                          </button>
                          <button 
                            onClick={() => setEditingIsGamesRestricted(!editingIsGamesRestricted)}
                            className={`p-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-between transition cursor-pointer ${
                              editingIsGamesRestricted ? 'bg-rose-500/10 border-rose-500/20 text-rose-400':'bg-zinc-950/40 border-zinc-850 text-zinc-500'
                            }`}
                          >
                            <span>تقييد الألعاب 🎮</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${editingIsGamesRestricted?'bg-rose-500':'bg-zinc-800'}`} />
                          </button>
                          <button 
                            onClick={() => setEditingIsCoinsRestricted(!editingIsCoinsRestricted)}
                            className={`p-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-between transition cursor-pointer ${
                              editingIsCoinsRestricted ? 'bg-rose-500/10 border-rose-500/20 text-rose-400':'bg-zinc-950/40 border-zinc-850 text-zinc-500'
                            }`}
                          >
                            <span>تجميد الكوينز 💰</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${editingIsCoinsRestricted?'bg-rose-500':'bg-zinc-800'}`} />
                          </button>
                        </div>

                        <button 
                          onClick={handleUpdateUserStats} 
                          disabled={isUpdatingUser}
                          className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer"
                        >
                          تأكيد وحقن الإحصائيات الفورية ✓
                        </button>
                      </div>
                    )}

                    {/* Member Directory List */}
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {allUsers
                        .filter(u => {
                          const match = `${u.displayName || ''} ${u.email || ''} ${u.uid || ''} ${u.username || ''}`.toLowerCase().includes(searchUserQuery.toLowerCase());
                          if (!match) return false;
                          if (userFilterBy === 'muted') return u.isMuted === true;
                          if (userFilterBy === 'gamesRestricted') return u.isGamesRestricted === true;
                          if (userFilterBy === 'coinsRestricted') return u.isCoinsRestricted === true;
                          return true;
                        })
                        .sort((a, b) => {
                          if (userSortBy === 'coins') return (b.coins || 0) - (a.coins || 0);
                          if (userSortBy === 'level') return (b.level || 1) - (a.level || 1);
                          if (userSortBy === 'xp') return (b.xp || 0) - (a.xp || 0);
                          return 0;
                        })
                        .slice(0, 30) // Fast pagination
                        .map(u => (
                          <div key={u.uid} className="bg-zinc-900/10 border border-zinc-900 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-right">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-300 overflow-hidden shrink-0">
                                {u.photoURL ? <img src={u.photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : (u.displayName || 'U')[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-zinc-100 font-bold text-xs">{u.displayName || 'أوتاكو مجهول'}</span>
                                  <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-semibold">Lvl {u.level || 1}</span>
                                  <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.2 rounded font-semibold border border-amber-500/10">{u.coins || 0}🪙</span>
                                </div>
                                <p className="text-[10px] text-zinc-400 font-bold font-mono mt-0.5 select-all">ID: {u.username || u.uid}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                              <button 
                                onClick={() => {
                                  setEditingUser(u);
                                  setEditingCoins(u.coins || 0);
                                  const totalXp = calculateTotalCumulativeXp(u.level || 1, u.xp || 0);
                                  setEditingXP(totalXp);
                                  setEditingLevel(u.level || 1);
                                  setEditingIsMuted(u.isMuted || false);
                                  setEditingIsGamesRestricted(u.isGamesRestricted || false);
                                  setEditingIsCoinsRestricted(u.isCoinsRestricted || false);
                                }}
                                className="bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/10 py-1 px-2.5 text-[10px] rounded-lg transition font-semibold cursor-pointer"
                              >
                                إدارة البيانات
                              </button>
                              <button 
                                onClick={() => {
                                  const identifier = u.username || u.uid;
                                  navigator.clipboard.writeText(identifier);
                                  alert(`تم نسخ الـ ID للعضو: ${identifier}`);
                                }}
                                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 py-1 px-2 text-[10px] rounded-lg transition font-semibold border border-zinc-800 cursor-pointer"
                              >
                                نسخ ID
                              </button>
                              {u.uid !== auth.currentUser?.uid && (
                                <button 
                                  onClick={() => {
                                    setUserIdInput(u.uid);
                                    handleBan();
                                  }}
                                  className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/15 py-1 px-2 text-[10px] rounded-lg transition font-bold cursor-pointer"
                                >
                                  حظر
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}

                {/* 4. SETTINGS TAB */}
                {activeTab === 'settings' && (role === 'owner' || role === 'admin' || (role === 'moderator' && modPerms?.canManageSettings)) && (
                  <div className="space-y-6">
                    <div className="border-b border-zinc-800 pb-4">
                      <div className="flex items-center gap-2">
                        <Settings size={18} className="text-zinc-400" />
                        <h2 className="text-sm font-bold text-zinc-100">إعدادات السلايدر والبرودكاست الموّحد</h2>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">التحكم في أنمي الموسم والبرودكاست العلوي وشاشات العرض المتزامنة للأعضاء.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-400 block font-semibold">سقف عدد شرائح السلايدر:</label>
                          <input 
                            type="number" 
                            min={1} 
                            max={15} 
                            value={sliderLimit} 
                            onChange={e => setSliderLimit(Number(e.target.value))} 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 text-right focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-400 block font-semibold">مدة تدوير الشرائح تلقائياً (ثواني):</label>
                          <input 
                            type="number" 
                            min={2} 
                            max={15} 
                            value={sliderSpeed} 
                            onChange={e => setSliderSpeed(Number(e.target.value))} 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 text-right focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400 block font-semibold">تصفية حسب الأنمي الموسمي بالواجهة:</label>
                        <select 
                          value={sliderSeason} 
                          onChange={e => setSliderSeason(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-200 text-right focus:outline-none font-bold"
                        >
                          <option value="auto">تلقائي (حلقات ومستجدات الموسم الجاري)</option>
                          <option value="winter">🌨️ فصل الشتاء (Winter)</option>
                          <option value="spring">🌸 فصل الربيع (Spring)</option>
                          <option value="summer">☀️ فصل الصيف (Summer)</option>
                          <option value="fall">🍂 فصل الخريف (Fall)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400 block font-semibold">شريط برودكاست الإعلانات الصاعد بالرئيسية:</label>
                        <textarea 
                          value={globalAnnouncement} 
                          onChange={e => setGlobalAnnouncement(e.target.value)} 
                          placeholder="اكتب رسالة البرودكاست أو التنويه العام ليظهر مباشرة لجميع المستخدمين في الشريط العلوي..." 
                          rows={3} 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs text-zinc-100 text-right focus:outline-none resize-none font-sans"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-400 block font-semibold">رابط تليجرام لـ "المساعدة والشكاوى":</label>
                          <input 
                            type="text" 
                            value={helpTelegramUrl} 
                            onChange={e => setHelpTelegramUrl(e.target.value)} 
                            placeholder="https://t.me/..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 text-left focus:outline-none"
                            dir="ltr"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-400 block font-semibold">رابط تليجرام لـ "شات أوتاكو الجماعي":</label>
                          <input 
                            type="text" 
                            value={groupTelegramUrl} 
                            onChange={e => setGroupTelegramUrl(e.target.value)} 
                            placeholder="https://t.me/..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 text-left focus:outline-none"
                            dir="ltr"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-[10px] text-zinc-400 block font-semibold">رابط تليجرام للمالك لـ "الدعم المادي والدعم المباشر":</label>
                          <input 
                            type="text" 
                            value={donateTelegramUrl} 
                            onChange={e => setDonateTelegramUrl(e.target.value)} 
                            placeholder="https://t.me/..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 text-left focus:outline-none"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      {/* Real Monetization Settings Section */}
                      <div className="border-t border-zinc-800 pt-6 mt-6 space-y-4 text-right" dir="rtl">
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">💰</span>
                            <div>
                              <h3 className="text-xs font-black text-white">نظام تحقيق الربح الفعلي من الإعلانات</h3>
                              <p className="text-[10px] text-zinc-450 mt-0.5 text-zinc-400">تحكم بآلية عرض الإعلانات الحقيقية واربط حساباتك في شبكات الدفع العالمية لكسب المال الحقيقي من زيارات المشاهدين.</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-zinc-400 block font-semibold">نمط تشغيل الإعلانات بالبوابة:</label>
                            <select
                              value={monetizationMode}
                              onChange={e => setMonetizationMode(e.target.value as any)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-200 text-right focus:outline-none font-bold"
                            >
                              <option value="simulation">📱 محاكاة حملات ترويجية داخلية (وضع الاختبار والتجربة)</option>
                              <option value="direct_link">🔗 رابط أرباح مباشر (Smartlink / Direct Link) - ينصح به بشدة لأقصى عائد مادي</option>
                              <option value="script">💻 كود نصي برمجياتي مخصص (AdSense / Adsterra Iframe & Script)</option>
                            </select>
                          </div>

                          {monetizationMode === 'direct_link' && (
                            <div className="space-y-3 bg-zinc-950/45 p-4 border border-zinc-900 rounded-2xl">
                              <div className="space-y-1">
                                <label className="text-[10px] text-yellow-500 block font-black">🔗 رابط الأرباح الذكي الخاص بك (Smartlink URL):</label>
                                <input 
                                  type="text" 
                                  value={directLinkUrl} 
                                  onChange={e => setDirectLinkUrl(e.target.value)} 
                                  placeholder="https://www.highrevenuegate.com/..."
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 text-left focus:outline-none font-mono"
                                  dir="ltr"
                                />
                                <p className="text-[9px] text-zinc-500 leading-relaxed mt-1">
                                  💡 بمجرد تفعيل هذا النمط، عند قيام المستخدم بالضغط على زر "مشاهدة إعلان وتجميع الكوينز"، ستقوم المنصة تلقائياً بفتح هذا الرابط الربحي (التابع لشبكة مثل Adsterra أو Monetag) في نافذة جديدة لكسب الربح التلقائي، وسيبدأ عداد زمني يمنع المستخدم من حصد الكوينز حتى انتهاء الوقت المطلوب.
                                </p>
                              </div>
                            </div>
                          )}

                          {monetizationMode === 'script' && (
                            <div className="space-y-3 bg-zinc-950/45 p-4 border border-zinc-900 rounded-2xl">
                              <div className="space-y-1">
                                <label className="text-[10px] text-yellow-500 block font-black">💻 كود إعلان HTML أو Javascript أو Iframe:</label>
                                <textarea 
                                  value={scriptCode} 
                                  onChange={e => setScriptCode(e.target.value)} 
                                  placeholder="الصق كود الإعلان النصي <script> أو <ins> أو <iframe> الممنوح لك من شبكتك الإعلانية..." 
                                  rows={5} 
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 text-left focus:outline-none font-mono resize-none leading-relaxed"
                                  dir="ltr"
                                />
                                <p className="text-[9px] text-zinc-500 leading-relaxed mt-1">
                                  ⚠️ يجب تدوين الأكواد البرمجية بدقة وصحة تامة لتفادي أي خلل في التصميم. سيتم تضمين هذا الكود وتشغيله داخل حاوية العرض للإعلان.
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-400 block font-semibold">⏱️ وقت البقاء الإجباري أمام الإعلان (ثواني):</label>
                              <input 
                                type="number" 
                                min={5} 
                                max={60} 
                                value={stayTime} 
                                onChange={e => setStayTime(Number(e.target.value))} 
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 text-right focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-zinc-400 block font-semibold">🪙 الجوائز (عدد الكوينز الممنوحة بالمرة):</label>
                              <input 
                                type="number" 
                                min={5} 
                                max={200} 
                                value={adRewardCoins} 
                                onChange={e => setAdRewardCoins(Number(e.target.value))} 
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-100 text-right focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-850 mt-2">
                          <h4 className="text-white text-[11px] font-black">كيف تسجل وتربح ماديًا بالدولار كصاحب موقع؟</h4>
                          <p className="text-[10px] text-zinc-400 leading-relaxed mt-1">
                            1. توجه للتسجيل في منصة إعلانية مثل <a href="https://adsterra.com/" target="_blank" rel="noreferrer" className="text-blue-400 underline font-bold">Adsterra</a> أو <a href="https://monetag.com/" target="_blank" rel="noreferrer" className="text-blue-400 underline font-bold">Monetag</a> كـ Publisher.<br />
                            2. اضغط على خيار <strong>Direct Link / Smartlink</strong> لإنشاء رابط إعلاني مباشر وجديد.<br />
                            3. انسخ الرابط الناتج والصقه في حقل "رابط الأرباح الذكي" أعلاه واجعل نمط التشغيل "رابط أرباح مباشر". مبروك! ستبدأ في جني أرباح حقيقية عن كل مشاهدة وتجاوز يقوم به أعضاؤك لتمويل خوادمك!
                          </p>
                        </div>
                      </div>

                      <button 
                        onClick={saveSliderSettings} 
                        disabled={isSavingSettings}
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl transition text-xs cursor-pointer font-sans"
                      >
                        {isSavingSettings ? 'جاري الحفظ...' : 'حفظ ونشر التعديلات الفورية ✓'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. BANS TAB */}
                {activeTab === 'bans' && (role === 'owner' || role === 'admin' || (role === 'moderator' && modPerms?.canBan)) && (
                  <div className="space-y-6">
                    <div className="border-b border-zinc-800 pb-4">
                      <div className="flex items-center gap-2">
                        <UserX size={18} className="text-zinc-400" />
                        <h2 className="text-sm font-bold text-zinc-100 font-sans">سجل قوائم الحظر وإلغاء الاستبعاد</h2>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1 font-sans">تتبع وعرض حسابات المستخدمين المبعدين من المنصة مع إمكانية فك حظرهم.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-zinc-950/40 p-3.5 border border-zinc-900 rounded-xl space-y-3 text-right">
                        <span className="text-[10px] text-zinc-400 font-bold block font-sans">حظر مستخدم يدوي مباشر باسم المعرّف (ID):</span>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="أدخل الـ ID بدقة (اسم المستخدم) لاستبعاده..." 
                            value={userIdInput}
                            onChange={e => setUserIdInput(e.target.value)}
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 text-xs text-zinc-100 font-mono text-right focus:outline-none"
                          />
                          <button 
                            onClick={handleBan}
                            className="bg-red-650 hover:bg-red-600 text-white font-bold py-1.5 px-4 rounded-lg text-xs transition cursor-pointer font-sans"
                          >
                            حظر حساب
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-right">
                        <span className="text-[10px] text-zinc-500 font-bold block font-sans">المحظورين حالياً:</span>
                        <div className="space-y-1 max-h-[300px] overflow-y-auto">
                          {bannedUsers.map(b => (
                            <div key={b.uid} className="bg-zinc-900/10 border border-zinc-900 p-2.5 rounded-lg flex items-center justify-between text-xs">
                              <span className="font-semibold text-zinc-300 text-[11px] font-sans">{getUserNameByUid(b.uid)}</span>
                              <button 
                                onClick={() => handleUnban(b.uid)}
                                className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/10 py-1 px-2.5 rounded-lg text-[10px] font-bold cursor-pointer font-sans"
                              >
                                فك الحظر الأمني
                              </button>
                            </div>
                          ))}
                          {bannedUsers.length === 0 && (
                            <p className="text-xs text-zinc-500 text-center py-6 font-sans">سجلات خالية من أي عمليات حظر نشطة.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. RECOMMENDATIONS TAB */}
                {activeTab === 'recommendations' && (
                  <div className="space-y-6">
                    <div className="border-b border-zinc-800 pb-4">
                      <div className="flex items-center gap-2">
                        <Lightbulb size={18} className="text-amber-400" />
                        <h2 className="text-sm font-bold text-zinc-100 font-sans">إدارة التوصيات والمحتوى التفاعلي</h2>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1 font-sans">البحث والمراجعة السريعة وحذف التوصيات التي ينشرها الأعضاء واللاعبين داخل تفاصيل الأنمي.</p>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="flex flex-col gap-4 bg-zinc-950/30 p-4 rounded-xl border border-zinc-900">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="relative flex-1">
                          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                          <input
                            type="text"
                            placeholder="ابحث عن نص التوصية، اسم العضو، أو عنوان الأنمي المستهدف..."
                            value={searchRecQuery}
                            onChange={e => setSearchRecQuery(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-900 rounded-lg pr-9 pl-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-850 text-right font-sans"
                          />
                        </div>
                        <div className="flex items-center gap-2 shrink-0 bg-zinc-900/40 border border-zinc-900 px-3 py-1.5 rounded-lg text-[10px] text-zinc-400">
                          <span className="font-bold text-zinc-300 font-sans">إجمالي التوصيات في المنصة:</span>
                          <span className="font-mono text-amber-400 font-extrabold">{recommendations.length}</span>
                        </div>
                      </div>

                      {/* Filter Status Selector Buttons */}
                      <div className="flex flex-wrap items-center gap-2 p-1 bg-zinc-950/60 border border-zinc-900 rounded-xl max-w-lg">
                        <button
                          onClick={() => setRecStatusFilter('pending')}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            recStatusFilter === 'pending'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'text-zinc-500 hover:text-zinc-350 border border-transparent'
                          }`}
                        >
                          ⏳ قيد المراجعة
                          <span className="bg-zinc-900 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black text-amber-400">
                            {recommendations.filter(r => (r.status || 'approved') === 'pending').length}
                          </span>
                        </button>

                        <button
                          onClick={() => setRecStatusFilter('approved')}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            recStatusFilter === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'text-zinc-500 hover:text-zinc-350 border border-transparent'
                          }`}
                        >
                          ✅ معتمدة ونشطة
                          <span className="bg-zinc-900 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black text-emerald-400">
                            {recommendations.filter(r => (r.status || 'approved') === 'approved').length}
                          </span>
                        </button>

                        <button
                          onClick={() => setRecStatusFilter('rejected')}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            recStatusFilter === 'rejected'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'text-zinc-500 hover:text-zinc-350 border border-transparent'
                          }`}
                        >
                          ❌ مرفوضة
                          <span className="bg-zinc-900 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black text-rose-400">
                            {recommendations.filter(r => (r.status || 'approved') === 'rejected').length}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {recommendations
                        .filter(rec => {
                          const currentStatus = rec.status || 'approved';
                          if (currentStatus !== recStatusFilter) return false;

                          const queryNorm = searchRecQuery.toLowerCase();
                          if (!queryNorm) return true;
                          
                          const targetTitle = (rec.targetAnimeTitle || '').toLowerCase();
                          const originalTitle = (rec.animeTitle || '').toLowerCase();
                          const reason = (rec.reason || '').toLowerCase();
                          const creatorName = getUserNameByUid(rec.userId).toLowerCase();
                          
                          return targetTitle.includes(queryNorm) || originalTitle.includes(queryNorm) || reason.includes(queryNorm) || creatorName.includes(queryNorm);
                        })
                        .length === 0 ? (
                        <div className="text-center py-12 bg-zinc-900/10 border border-zinc-900 rounded-xl">
                          <Lightbulb size={28} className="mx-auto text-zinc-650 mb-2 animate-pulse" />
                          <h3 className="text-xs font-semibold text-zinc-400">لا توجد توصيات مطابقة للبحث</h3>
                          <p className="text-[11px] text-zinc-500 mt-1 font-sans">جرب كلمات مفتاحية أخرى أو تحقق من حالة الفئات في الأعلى.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {recommendations
                            .filter(rec => {
                              const currentStatus = rec.status || 'approved';
                              if (currentStatus !== recStatusFilter) return false;

                              const queryNorm = searchRecQuery.toLowerCase();
                              if (!queryNorm) return true;
                              
                              const targetTitle = (rec.targetAnimeTitle || '').toLowerCase();
                              const originalTitle = (rec.animeTitle || '').toLowerCase();
                              const reason = (rec.reason || '').toLowerCase();
                              const creatorName = getUserNameByUid(rec.userId).toLowerCase();
                              
                              return targetTitle.includes(queryNorm) || originalTitle.includes(queryNorm) || reason.includes(queryNorm) || creatorName.includes(queryNorm);
                            })
                            .map(rec => {
                              const userName = getUserNameByUid(rec.userId);
                              const currentStatus = rec.status || 'approved';

                              return (
                                <div 
                                  key={rec.id} 
                                  className="bg-zinc-950/60 border border-zinc-900 hover:border-zinc-800 rounded-xl p-3 flex flex-col justify-between space-y-3 transition-all animate-fadeIn"
                                >
                                  {/* Compact Anime Cards Comparison: RTL layout (Flow Original (Right) -> Arrow -> Target (Left)) */}
                                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 p-2 bg-zinc-900/30 border border-zinc-900/50 rounded-xl select-none">
                                    
                                    {/* Original Anime Info Card */}
                                    <div className="flex items-center gap-2 min-w-0">
                                      {rec.animePosterUrl ? (
                                        <img 
                                          src={rec.animePosterUrl} 
                                          alt={rec.animeTitle || 'الأصلي'} 
                                          referrerPolicy="no-referrer"
                                          className="w-10 h-14 rounded-md object-cover bg-zinc-900 border border-zinc-800 shrink-0"
                                        />
                                      ) : (
                                        <div className="w-10 h-14 rounded-md bg-zinc-950 border border-zinc-900 flex items-center justify-center shrink-0">
                                          <span className="text-[9px] text-zinc-650">الأنمي</span>
                                        </div>
                                      )}
                                      <div className="text-right min-w-0 flex-1">
                                        <span className="text-[8px] text-zinc-500 block font-medium mb-0.5 leading-none font-sans">الأنمي الأصلي</span>
                                        <span className="text-[10px] font-black text-zinc-200 block truncate font-sans" title={rec.animeTitle}>
                                          {rec.animeTitle || 'عنوان مفقود'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Middle Arrow Connector pointing from Original (right) to Recommend (left) */}
                                    <div className="flex flex-col items-center justify-center shrink-0 px-1 font-sans">
                                      <span className="text-[8px] text-amber-500/75 font-extrabold mb-0.5 whitespace-nowrap">توصية بـ</span>
                                      <div className="flex items-center gap-0.5 text-amber-400">
                                        <span className="w-3.5 h-[1.5px] bg-gradient-to-l from-amber-500 to-amber-350 rounded" />
                                        <span className="text-[9px] leading-none">◀</span>
                                      </div>
                                    </div>

                                    {/* Target Recommended Anime Info Card */}
                                    <div className="flex items-center gap-2 min-w-0 flex-row-reverse text-right">
                                      {rec.targetAnimePosterUrl ? (
                                        <img 
                                          src={rec.targetAnimePosterUrl} 
                                          alt={rec.targetAnimeTitle} 
                                          referrerPolicy="no-referrer"
                                          className="w-10 h-14 rounded-md object-cover bg-zinc-900 border border-zinc-800 shrink-0"
                                        />
                                      ) : (
                                        <div className="w-10 h-14 rounded-md bg-zinc-950 border border-zinc-900 flex items-center justify-center shrink-0">
                                          <span className="text-[9px] text-zinc-650">المقترح</span>
                                        </div>
                                      )}
                                      <div className="text-right min-w-0 pr-1 flex-1">
                                        <span className="text-[8px] text-zinc-500 block font-medium mb-0.5 leading-none font-sans">الأنمي الموصى به</span>
                                        <span className="text-[10px] font-extrabold text-amber-400 block truncate font-sans" title={rec.targetAnimeTitle}>
                                          {rec.targetAnimeTitle}
                                        </span>
                                      </div>
                                    </div>

                                  </div>

                                  {/* Recommendation Reason */}
                                  <div className="space-y-1 bg-zinc-900/10 border border-zinc-900/40 p-2 rounded-lg">
                                    <span className="text-[9px] text-zinc-500 block font-sans font-bold leading-none">سبب التوصية:</span>
                                    <p className="text-[11px] text-zinc-350 leading-relaxed font-sans mt-1 line-clamp-3 overflow-y-auto pr-0.5 text-right whitespace-pre-line" style={{ maxHeight: '60px' }}>
                                      {rec.reason}
                                    </p>
                                  </div>

                                  {/* Rejection / Status reason feedback block */}
                                  {currentStatus === 'rejected' && rec.rejectionReason && (
                                    <div className="space-y-1 bg-rose-950/10 border border-rose-950/20 p-2 rounded-lg">
                                      <span className="text-[9px] text-rose-400 block font-bold leading-none font-sans">سبب رفض الإشراف:</span>
                                      <p className="text-[10px] text-rose-350 leading-relaxed font-sans italic mt-1 text-right font-sans">
                                        {rec.rejectionReason}
                                      </p>
                                    </div>
                                  )}

                                  {/* Stats Badge */}
                                  {(rec.likes > 0 || rec.dislikes > 0) && (
                                    <div className="flex justify-end">
                                      <span className="text-[8px] text-zinc-500 bg-zinc-900/50 px-2 py-0.5 rounded border border-zinc-900 font-mono">
                                        {rec.likes || 0} إعجاب / {rec.dislikes || 0} استياء
                                      </span>
                                    </div>
                                  )}

                                  {/* Inline Forms for Rejection and Deletion */}
                                  {recIdBeingRejected === rec.id && (
                                    <div className="bg-rose-950/20 border border-rose-500/20 p-2 text-right rounded-lg space-y-2 mt-1 animate-fadeIn">
                                      <span className="text-[10px] text-rose-400 font-bold block font-sans">توضيح سبب الرفض:</span>
                                      <input
                                        type="text"
                                        placeholder="اكتب سبب الرفض هنا..."
                                        value={recRejectionReasonInput}
                                        onChange={e => setRecRejectionReasonInput(e.target.value)}
                                        className="w-full bg-zinc-950 border border-rose-900 text-xs text-zinc-100 rounded px-2.5 py-1.5 focus:outline-none focus:border-rose-500 text-right font-sans"
                                      />
                                      <div className="flex items-center justify-end gap-1.5 font-sans">
                                        <button
                                          onClick={() => {
                                            setRecIdBeingRejected(null);
                                            setRecRejectionReasonInput('');
                                          }}
                                          className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-850 text-zinc-400 text-[9px] font-bold cursor-pointer font-sans"
                                        >
                                          إلغاء
                                        </button>
                                        <button
                                          onClick={() => handleRejectRec(rec, recRejectionReasonInput)}
                                          className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] cursor-pointer font-sans"
                                        >
                                          إرسال الرفض
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {recIdBeingDeleted === rec.id && (
                                    <div className="bg-zinc-900 border border-red-500/20 p-2 text-right rounded-lg space-y-2 mt-1 animate-fadeIn font-sans">
                                      <span className="text-[10px] text-zinc-300 font-bold block font-sans">هل أنت متأكد من الحذف النهائي لهذه التوصية؟</span>
                                      <div className="flex items-center justify-end gap-1.5 font-sans">
                                        <button
                                          onClick={() => setRecIdBeingDeleted(null)}
                                          className="px-2 py-1 rounded bg-zinc-950 hover:bg-zinc-900 text-zinc-400 text-[9px] font-bold cursor-pointer font-sans"
                                        >
                                          تراجع
                                        </button>
                                        <button
                                          onClick={() => handleDeleteRec(rec.id)}
                                          className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-bold text-[9px] cursor-pointer font-sans"
                                        >
                                          نعم، احذف
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Owner/Creator and Action Buttons */}
                                  {!(recIdBeingRejected === rec.id || recIdBeingDeleted === rec.id) && (
                                    <div className="flex items-center justify-between pt-2 border-t border-zinc-900/60 text-[10px]">
                                      <div className="space-y-0.5 text-right">
                                        <span className="text-zinc-500 text-[9px] block font-sans">صاحب التوصية:</span>
                                        <span className="text-zinc-200 font-bold block bg-zinc-900/40 px-2 py-0.5 rounded max-w-[120px] truncate font-sans">{userName}</span>
                                      </div>

                                      <div className="flex items-center gap-1.5 font-sans">
                                        {currentStatus === 'pending' && (
                                          <>
                                            <button
                                              onClick={() => {
                                                setRecIdBeingRejected(rec.id);
                                                setRecRejectionReasonInput('');
                                              }}
                                              className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer text-[10px] font-bold font-sans"
                                            >
                                              <X size={10} />
                                              <span>الرفض مع كتابة سبب</span>
                                            </button>
                                            <button
                                              onClick={() => handleApproveRec(rec)}
                                              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 transition cursor-pointer text-[10px] font-bold font-sans"
                                            >
                                              <ShieldCheck size={11} />
                                              <span>القبول والنشر</span>
                                            </button>
                                          </>
                                        )}

                                        {currentStatus === 'approved' && (
                                          <>
                                            <button
                                              onClick={() => {
                                                setRecIdBeingRejected(rec.id);
                                                setRecRejectionReasonInput('');
                                              }}
                                              className="flex items-center gap-1 px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer text-[9px] font-bold font-sans"
                                            >
                                              <X size={10} />
                                              <span>تغيير لرفض ❌</span>
                                            </button>
                                            <button
                                              onClick={() => setRecIdBeingDeleted(rec.id)}
                                              className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 hover:bg-rose-500/10 hover:text-rose-400 text-zinc-500 transition cursor-pointer text-[9px] font-bold border border-zinc-800/60 font-sans"
                                            >
                                              <Trash2 size={10} />
                                              <span>حذف نهائي</span>
                                            </button>
                                          </>
                                        )}

                                        {currentStatus === 'rejected' && (
                                          <>
                                            <button
                                              onClick={() => handleApproveRec(rec)}
                                              className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 transition cursor-pointer text-[9px] font-bold font-sans"
                                            >
                                              <ShieldCheck size={11} />
                                              <span>تغيير لقبول ✓</span>
                                            </button>
                                            <button
                                              onClick={() => setRecIdBeingDeleted(rec.id)}
                                              className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 hover:bg-rose-500/10 hover:text-rose-400 text-zinc-500 transition cursor-pointer text-[9px] font-bold border border-zinc-800/60 font-sans"
                                            >
                                              <Trash2 size={10} />
                                              <span>حذف نهائي</span>
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 6. ROLES TAB */}
                {activeTab === 'roles' && (role === 'owner' || role === 'admin') && (
                  <div className="space-y-6">
                    <div className="border-b border-zinc-800 pb-4">
                      <div className="flex items-center gap-2">
                        <Lock size={18} className="text-zinc-400" />
                        <h2 className="text-sm font-bold text-zinc-100">تعيين الرتب وصلاحيات الإشراف</h2>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">تنسيق الرتب وتعديل حدود الصلاحيات والصيانة الفنية لطاقم العمل والرقابة.</p>
                    </div>

                    <div className="space-y-5">
                      <div className="bg-zinc-950/40 p-4 border border-zinc-900 rounded-xl space-y-3.5">
                        <h3 className="text-xs font-bold text-zinc-200">ترقية عضو إلى طاقم الإرشاد والرقابة:</h3>
                        
                        <div className="space-y-3">
                          {/* Search */}
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder="مستلم الرتبة: ابحث باسم العضو لتحديد حسابه برفق..." 
                              value={roleSearchQuery}
                              onChange={e => {
                                 setRoleSearchQuery(e.target.value);
                                 setSelectedSearchUser(null);
                              }}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-100 text-right focus:outline-none"
                            />
                            
                            {suggestedRoleUsers.length > 0 && !selectedSearchUser && (
                               <div className="absolute inset-x-0 mt-1 bg-zinc-950 border border-zinc-800 divide-y divide-zinc-800 rounded-lg max-h-40 overflow-y-auto z-20">
                                  {suggestedRoleUsers.map(u => (
                                     <div 
                                       key={u.uid}
                                       onClick={() => {
                                          setSelectedSearchUser(u);
                                          setUserIdInput(u.username || u.uid);
                                          setRoleSearchQuery(u.displayName + " [ID: " + (u.username || u.uid) + "]");
                                       }}
                                       className="p-2 hover:bg-zinc-800 flex items-center justify-between text-xs cursor-pointer text-right"
                                     >
                                        <span className="text-zinc-200 font-semibold">{u.displayName}</span>
                                        <span className="text-[9px] text-zinc-500">تحديد</span>
                                     </div>
                                  ))}
                               </div>
                            )}
                          </div>

                          {selectedSearchUser && (
                            <div className="flex items-center justify-between bg-indigo-500/5 border border-indigo-500/10 p-2.5 rounded-lg text-xs">
                              <span className="text-indigo-400 font-semibold">المستخدم المختار: {selectedSearchUser.displayName} </span>
                              <button onClick={() => { setSelectedSearchUser(null); setUserIdInput(''); setRoleSearchQuery(''); }} className="text-[9px] bg-red-500/10 text-red-400 px-2.5 py-0.5 rounded">إلغاء ×</button>
                            </div>
                          )}

                          {!selectedSearchUser && (
                            <input 
                              type="text" 
                              placeholder="أو اكتب اسم المعرّف (ID) يدوياً وبحذر..." 
                              value={userIdInput}
                              onChange={e => setUserIdInput(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-100 text-right focus:outline-none"
                            />
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1.5">
                            <select 
                              value={roleInput} 
                              onChange={e => setRoleInput(e.target.value as any)}
                              className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 text-right focus:outline-none font-bold"
                            >
                              <option value="user">تجريد الرتبة وعضو عادي 👤</option>
                              <option value="moderator">مراقب المنصة (Moderator) 🛡️</option>
                              {role === 'owner' && <option value="admin">مدير الأوتوكو (Admin) 🍁</option>}
                            </select>
                            
                            <button 
                              onClick={handleAssignRole}
                              className="bg-rose-500 hover:bg-rose-500 text-white py-2 px-4 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              تعديل وحفظ رتبة العضو
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Current Staff List */}
                      <div className="space-y-2">
                        <span className="text-[10px] text-zinc-500 font-bold block">هيئة المراقبة والتحقق المعتمدة:</span>
                        <div className="space-y-2">
                          {usersInfo.map(u => {
                            const profile = allUsers.find(member => member.uid === u.uid) || { displayName: 'مراقب معتمد', email: '' };
                            return (
                              <div key={u.uid} className="bg-zinc-900/10 border border-zinc-900 p-3 rounded-xl flex items-center justify-between text-xs gap-3">
                                <div>
                                  <span className="font-semibold text-zinc-200 block">{profile.displayName}</span>
                                  <span className="text-[9px] font-mono text-zinc-400 block select-all">ID: {profile.username || u.uid}</span>
                                  <span className="text-[8.5px] bg-indigo-500/1s text-rose-400 font-bold inline-block mt-0.5 px-2 py-0.2 rounded bg-rose-500/10 border border-rose-500/10">
                                    ROLE: {u.role}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button 
                                    onClick={async () => {
                                      const docS = await getDoc(doc(db, 'globalRoles', u.uid));
                                      let canB = false, canN = false, canS = false, canV = false;
                                      if (docS.exists()) {
                                        const uD = docS.data();
                                        canB = uD.canBan ?? false;
                                        canN = uD.canNotify ?? false;
                                        canS = uD.canManageSettings ?? false;
                                        canV = uD.canViewRoles ?? false;
                                      }
                                      setEditingPermissionsMod(u);
                                      setModCustomPerms({ canBan: canB, canNotify: canN, canManageSettings: canS, canViewRoles: canV });
                                    }}
                                    className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition animate-none"
                                  >
                                    تراخيص إضافية
                                  </button>
                                  {role === 'owner' && (
                                    <div className="flex flex-col items-end gap-1 select-none">
                                      {/* Interactive tactile Slide-to-Banish Widget */}
                                      <div className="relative w-44 h-8 bg-zinc-950 border border-zinc-800 rounded-full overflow-hidden flex items-center justify-end px-3 text-[9px] text-zinc-500 font-bold select-none">
                                        <span className="absolute left-6 select-none pointer-events-none text-[8.5px]">اسحب لليمين للنفي ◀</span>
                                        <motion.div
                                          drag="x"
                                          dragConstraints={{ left: 0, right: 115 }}
                                          dragElastic={0}
                                          dragMomentum={false}
                                          onDragEnd={(event, info) => {
                                            if (info.offset.x >= 95) {
                                              moderationService.assignRole(u.uid, 'user').then(() => {
                                                 alert(`تم عزل ونفي ${profile.displayName} بنجاح إلى مستخدم عادي!`);
                                                 loadData();
                                              }).catch(err => {
                                                 console.error(err);
                                                 alert('فشل في عزل المشرف.');
                                              });
                                            }
                                          }}
                                          className="absolute left-0.5 top-0.5 w-7 h-7 bg-rose-600 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center font-bold text-white text-[10px] shadow-lg shadow-rose-600/30"
                                        >
                                          ☠
                                        </motion.div>
                                      </div>
                                      <button 
                                        onClick={() => {
                                          if (window.confirm(`هل أنت متأكد من سحب صلاحية ونفي لـ ${profile.displayName}؟`)) {
                                            moderationService.assignRole(u.uid, 'user').then(() => {
                                               alert('تم عزل المشرف بنجاح.');
                                               loadData();
                                            });
                                          }
                                        }}
                                        className="text-[9px] text-rose-500/80 hover:text-rose-400 underline font-semibold transition cursor-pointer"
                                      >
                                        أو سحب سريع مباشر 🗑️
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Modal for sub perms */}
                      {editingPermissionsMod && (
                        <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl space-y-4 animate-fadeIn">
                          <div className="flex justify-between items-center bg-zinc-900/60 p-2 rounded-lg">
                            <h4 className="text-xs font-bold text-zinc-200">إدارة البنود الفرعية للمراقب الاستثنائي</h4>
                            <button onClick={() => setEditingPermissionsMod(null)} className="p-1 text-zinc-500 hover:text-zinc-300 transition text-xs">إغلاق ×</button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <button 
                              onClick={() => setModCustomPerms({ ...modCustomPerms, canBan: !modCustomPerms.canBan })}
                              className={`p-3 border rounded-xl flex items-center justify-between transition cursor-pointer ${
                                modCustomPerms.canBan ? 'bg-rose-500/10 border-rose-500/20 text-rose-400':'bg-zinc-900/40 border-zinc-900 text-zinc-500'
                              }`}
                            >
                              <span>ترخيص حظر المستخدمين 🚫</span>
                              <span className={`w-1.5 h-1.5 rounded-full ${modCustomPerms.canBan?'bg-rose-400':'bg-zinc-800'}`} />
                            </button>
                            <button 
                              onClick={() => setModCustomPerms({ ...modCustomPerms, canNotify: !modCustomPerms.canNotify })}
                              className={`p-3 border rounded-xl flex items-center justify-between transition cursor-pointer ${
                                modCustomPerms.canNotify ? 'bg-rose-500/10 border-rose-500/20 text-rose-400':'bg-zinc-900/40 border-zinc-900 text-zinc-500'
                              }`}
                            >
                              <span>ترخيص إرسال التنبيهات 🔔</span>
                              <span className={`w-1.5 h-1.5 rounded-full ${modCustomPerms.canNotify?'bg-rose-400':'bg-zinc-800'}`} />
                            </button>
                            <button 
                              onClick={() => setModCustomPerms({ ...modCustomPerms, canManageSettings: !modCustomPerms.canManageSettings })}
                              className={`p-3 border rounded-xl flex items-center justify-between transition cursor-pointer ${
                                modCustomPerms.canManageSettings ? 'bg-rose-500/10 border-rose-500/20 text-rose-400':'bg-zinc-900/40 border-zinc-900 text-zinc-500'
                              }`}
                            >
                              <span>ترخيص إعدادات السلايدر والبرودكاست ⚙️</span>
                              <span className={`w-1.5 h-1.5 rounded-full ${modCustomPerms.canManageSettings?'bg-rose-400':'bg-zinc-800'}`} />
                            </button>
                            <button 
                              onClick={() => setModCustomPerms({ ...modCustomPerms, canViewRoles: !modCustomPerms.canViewRoles })}
                              className={`p-3 border rounded-xl flex items-center justify-between transition cursor-pointer ${
                                modCustomPerms.canViewRoles ? 'bg-rose-500/10 border-rose-500/20 text-rose-400':'bg-zinc-900/40 border-zinc-900 text-zinc-500'
                              }`}
                            >
                              <span>ترخيص معاينة السجلات 📋</span>
                              <span className={`w-1.5 h-1.5 rounded-full ${modCustomPerms.canViewRoles?'bg-rose-400':'bg-zinc-800'}`} />
                            </button>
                          </div>

                          <button 
                            onClick={handleSaveModCustomPermissions}
                            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer"
                          >
                            تثبيت وحفظ تراخيص المشرف المخصصة
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 7. STATS TAB */}
                {activeTab === 'stats' && (
                  <div className="space-y-8 animate-fadeIn">
                    <div className="border-b border-zinc-800 pb-4">
                      <div className="flex items-center gap-2">
                        <Activity size={18} className="text-rose-500" />
                        <h2 className="text-sm font-bold text-zinc-100">لوحة تحليلات وإحصائيات المنصة المتقدمة 🌐</h2>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">عرض حالة استقرار خوادم المنصة وحجم نشاط طاقم المشتركين والمؤشرات الاقتصادية الدقيقة للكوينز والمستويات.</p>
                    </div>

                    {/* Rich Stat Bento Grid Grid Section */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-zinc-950/40 border border-zinc-900 p-3.5 rounded-xl">
                        <span className="text-[10px] text-zinc-500 block mb-1">الكتلة النقدية المتداولة 💰</span>
                        <span className="text-base font-extrabold text-zinc-100 block">{statsMetrics.totalCoins.toLocaleString()} كوينز</span>
                        <span className="text-[9px] text-zinc-500 mt-1 block">متوسط العضو: {statsMetrics.avgCoins} k</span>
                      </div>
                      
                      <div className="bg-zinc-950/40 border border-zinc-900 p-3.5 rounded-xl">
                        <span className="text-[10px] text-zinc-500 block mb-1">طاقة نقاط الـ XP الكلية ⭐</span>
                        <span className="text-base font-extrabold text-indigo-400 block">{statsMetrics.totalXP.toLocaleString()} XP</span>
                        <span className="text-[9px] text-zinc-500 mt-1 block">إجمالي تراكمي للمنظومة</span>
                      </div>

                      <div className="bg-zinc-950/40 border border-zinc-900 p-3.5 rounded-xl">
                        <span className="text-[10px] text-zinc-500 block mb-1">متوسط مستوى اللعب 📈</span>
                        <span className="text-base font-extrabold text-amber-500 block">Lvl {statsMetrics.avgLevel}</span>
                        <span className="text-[9px] text-zinc-500 mt-1 block">أعلى رتبة مسجلة: Lvl {statsMetrics.maxLevel}</span>
                      </div>

                      <div className="bg-zinc-950/40 border border-zinc-900 p-3.5 rounded-xl">
                        <span className="text-[10px] text-zinc-500 block mb-1">إجمالي التفاعلات والبلاغات 🚩</span>
                        <span className="text-base font-extrabold text-zinc-100 block">{statsMetrics.totalReports} بلاغًا</span>
                        <span className="text-[9px] text-rose-400 mt-1 block">بانتظار الإجراء: {statsMetrics.pendingReports}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Block - Gamification Levels Tier Distribution */}
                      <div className="bg-zinc-900/10 border border-zinc-900 p-4 rounded-2xl space-y-4">
                        <div className="border-b border-zinc-800/80 pb-2 flex justify-between items-center">
                          <span className="text-[11px] font-bold text-zinc-300">مؤشر توزيع مستويات الأوتاكو 📊</span>
                          <span className="text-[9px] text-zinc-500">تم التحديث تفاعليًا</span>
                        </div>

                        <div className="space-y-3 text-xs">
                          {/* Segment 1 */}
                          <div>
                            <div className="flex justify-between items-center text-[10px] mb-1">
                              <span className="text-zinc-400">مبتدئين (مستويات 1-5):</span>
                              <span className="font-semibold text-zinc-200">{statsMetrics.segments.starter} عضو ({Math.round((statsMetrics.segments.starter / statsMetrics.totalUsers) * 100)}%)</span>
                            </div>
                            <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${(statsMetrics.segments.starter / statsMetrics.totalUsers) * 100}%` }} />
                            </div>
                          </div>

                          {/* Segment 2 */}
                          <div>
                            <div className="flex justify-between items-center text-[10px] mb-1">
                              <span className="text-zinc-400">مستكشفين نشطين (مستويات 6-15):</span>
                              <span className="font-semibold text-zinc-200">{statsMetrics.segments.regular} عضو ({Math.round((statsMetrics.segments.regular / statsMetrics.totalUsers) * 100)}%)</span>
                            </div>
                            <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${(statsMetrics.segments.regular / statsMetrics.totalUsers) * 100}%` }} />
                            </div>
                          </div>

                          {/* Segment 3 */}
                          <div>
                            <div className="flex justify-between items-center text-[10px] mb-1">
                              <span className="text-zinc-400">خبراء المانجا والأنمي (مستويات 16-30):</span>
                              <span className="font-semibold text-zinc-200">{statsMetrics.segments.veteran} عضو ({Math.round((statsMetrics.segments.veteran / statsMetrics.totalUsers) * 100)}%)</span>
                            </div>
                            <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                              <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: `${(statsMetrics.segments.veteran / statsMetrics.totalUsers) * 100}%` }} />
                            </div>
                          </div>

                          {/* Segment 4 */}
                          <div>
                            <div className="flex justify-between items-center text-[10px] mb-1">
                              <span className="text-zinc-400">حكماء وأساطير (مستويات 30+):</span>
                              <span className="font-semibold text-zinc-200">{statsMetrics.segments.elite} عضو ({Math.round((statsMetrics.segments.elite / statsMetrics.totalUsers) * 100)}%)</span>
                            </div>
                            <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(statsMetrics.segments.elite / statsMetrics.totalUsers) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Block - Security & Reporting metrics */}
                      <div className="bg-zinc-900/10 border border-zinc-900 p-4 rounded-2xl space-y-4">
                        <div className="border-b border-zinc-800/80 pb-2">
                          <span className="text-[11px] font-bold text-zinc-300">معدلات الاستجابة والسلامة والأمان 🛡️</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5 text-xs">
                          <div className="bg-zinc-950/30 p-2.5 rounded-xl border border-zinc-900">
                            <span className="text-[10px] text-zinc-500 block">البلاغات المعالجة والمحذوفة:</span>
                            <span className="text-xs font-bold text-emerald-400 block mt-1">{statsMetrics.deletedContentReports} مخالفة مثبتة 🗑️</span>
                          </div>
                          <div className="bg-zinc-950/30 p-2.5 rounded-xl border border-zinc-900">
                            <span className="text-[10px] text-zinc-500 block">البلاغات المستبعدة والمحفوظة:</span>
                            <span className="text-xs font-bold text-zinc-400 block mt-1">{statsMetrics.dismissedReports} تجاهل 📥</span>
                          </div>
                          <div className="bg-zinc-950/30 p-2.5 rounded-xl border border-zinc-900">
                            <span className="text-[10px] text-zinc-500 block">المشتركين المكتومين:</span>
                            <span className="text-xs font-bold text-amber-500 block mt-1">{statsMetrics.mutedCount} حساب مكتوم 🔇</span>
                          </div>
                          <div className="bg-zinc-950/30 p-2.5 rounded-xl border border-zinc-900">
                            <span className="text-[10px] text-zinc-500 block">المقيدين من الألعاب والكوينز:</span>
                            <span className="text-xs font-bold text-rose-400 block mt-1">{statsMetrics.restrictedGamesCount + statsMetrics.restrictedCoinsCount} حساب مقيد 🚫</span>
                          </div>
                        </div>

                        {/* Stability assurance footer */}
                        <div className="p-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10 text-emerald-400 text-[10px] text-center font-medium">
                          قواعد البيانات متزامنة ولحظية عبر Snapshot Firebase Listeners!
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUGGESTIONS & COMPLAINTS MODERATION VIEW */}
                {activeTab === 'suggestions_moderation' && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <MessageSquare size={18} className="text-sky-400" />
                          <h2 className="text-sm font-bold text-zinc-100">صندوق تلقي الشكاوى والمقترحات المباشرة</h2>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1">متابعة الأفكار والمطبوعات الفنية المرسلة من قبل المستخدمين وتصنيفها وتحسين تجربة المنصة.</p>
                      </div>
                      
                      <div className="flex gap-2.5">
                        <button
                          onClick={() => setSuggestionsFilter('all')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${suggestionsFilter === 'all' ? 'bg-zinc-800/80 border-zinc-700 text-zinc-100' : 'bg-transparent border-zinc-800 text-zinc-400 hover:text-white'}`}
                        >
                          الكل ({suggestionsList.length})
                        </button>
                        <button
                          onClick={() => setSuggestionsFilter('suggestion')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${suggestionsFilter === 'suggestion' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' : 'bg-transparent border-zinc-800 text-zinc-400 hover:text-white'}`}
                        >
                          💡 المقترحات ({suggestionsList.filter(s => s.type === 'suggestion').length})
                        </button>
                        <button
                          onClick={() => setSuggestionsFilter('complaint')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${suggestionsFilter === 'complaint' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-transparent border-zinc-800 text-zinc-400 hover:text-white'}`}
                        >
                          🚨 الشكاوى ({suggestionsList.filter(s => s.type === 'complaint').length})
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                      {suggestionsList.length === 0 ? (
                        <div className="text-center py-12 bg-zinc-900/15 border border-zinc-800 rounded-2xl text-zinc-500 text-xs">
                          صندوق الاقتراحات فارغ حالياً! لا توجد شكاوى أو اقتراحات نشطة بالخادم.
                        </div>
                      ) : (
                        suggestionsList
                          .filter(s => suggestionsFilter === 'all' ? true : s.type === suggestionsFilter)
                          .map((s: any) => (
                            <div key={s.id} className="bg-zinc-900/30 border border-zinc-900 hover:border-zinc-800 p-4 rounded-2xl space-y-3 transition-all relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-1.5 h-full bg-zinc-800" style={{ backgroundColor: s.type === 'complaint' ? '#E11D48' : '#0284C7' }} />
                              
                              <div className="flex flex-wrap items-center justify-between gap-3 text-right">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-400">
                                    {s.displayName ? s.displayName[0].toUpperCase() : 'U'}
                                  </div>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-xs font-black text-zinc-100">{s.displayName || 'أوتاكو مجهول'}</span>
                                      <span className={`text-[9px] py-0.5 px-2 rounded-md font-bold tracking-tight ${s.type === 'complaint' ? 'bg-red-500/10 text-red-400 border border-red-500/10' : 'bg-sky-500/10 text-sky-400 border border-sky-500/10'}`}>
                                        {s.type === 'complaint' ? '🚨 شكوى / خلل فني' : '💡 فكرة واقتراح'}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-zinc-500 font-mono block select-all mt-0.5">الملف الشخصي: {s.email || 'غير متوفر'} • UID: {s.userId}</span>
                                  </div>
                                </div>
                                <div className="text-left">
                                  <span className="text-[9px] text-zinc-500 font-bold block">{s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000).toLocaleString('ar-EG') : 'قيد التسجيل'}</span>
                                </div>
                              </div>

                              <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/25 p-3 rounded-xl border border-zinc-900/40 select-text font-sans whitespace-pre-wrap">
                                {s.message}
                              </p>

                              <div className="pt-2 border-t border-zinc-900/40 flex justify-end gap-2 text-right">
                                <button
                                  onClick={async () => {
                                    if (!window.confirm("هل أنت متأكد من رغبتك في حذف وقبول أرشفة هذا الافتراح؟")) return;
                                    try {
                                      const { deleteDoc, doc } = await import('firebase/firestore');
                                      await deleteDoc(doc(db, 'suggestions', s.id));
                                      setSuggestionsList(prev => prev.filter(item => item.id !== s.id));
                                      alert("تم حذف المقترح وتحديث الأرشيف.");
                                    } catch (err) {
                                      console.error(err);
                                      alert("فشل في حذف المقترح.");
                                    }
                                  }}
                                  className="bg-zinc-900 hover:bg-zinc-800 hover:text-rose-450 text-zinc-450 py-1 px-3 rounded-lg text-[10px] transition border border-zinc-855 cursor-pointer font-bold"
                                >
                                  أرشفة وحذف المقترح ×
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}

                {/* 8. DATABASE RESET TAB */}
                {activeTab === 'database_reset' && (role === 'owner' || role === 'admin') && (
                  <div className="space-y-6">
                    <div className="border-b border-zinc-800 pb-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={18} className="text-rose-500" />
                        <h2 className="text-sm font-bold text-zinc-100">إعادة تهيئة السيرفر ومزامنة الحسابات</h2>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">تصفير وإعادة تعيين نقاط الكوينز والمستويات لكافة المنظومة لبداية اللعب العادل.</p>
                    </div>

                    <div className="bg-red-500/5 border border-red-500/10 p-5 rounded-xl space-y-4">
                      <p className="text-xs text-red-400 leading-relaxed font-semibold">
                        تحذير بالغ الأهمية: هذا الإجراء يحذف كلياً رصيد الكوينز والخبرة من كافة حسابات مستخدمي المنصة ويعيد تهيئتها للمستوى الأول بـرصيد صفري. لا يمكن التراجع عن هذه العملية!
                      </p>
                      
                      <button 
                        onClick={handleResetAllAccounts}
                        disabled={isResettingAll || resetAllSuccess}
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                      >
                        {isResettingAll ? 'جاري إعادة تهيئة الحسابات...' : 'تأكيد تصفير حسابات الأوتوكو بالكامل 🌀'}
                      </button>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </main>

        </div>

      </div>
    </div>
  );
}
