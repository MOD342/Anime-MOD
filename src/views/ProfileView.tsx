import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, ShieldCheck, ChevronLeft, ChevronRight, Bookmark, Edit2, 
  CheckCircle2, Trophy, Target, Award, Eye, Lock, Bell, LogOut, ChevronDown, 
  ListVideo, X, Image as ImageIcon, Flame, Star, Activity, PlayCircle, BarChart3, 
  Shield, User, ThumbsUp, ThumbsDown, MessageSquare, CheckSquare, Sparkles, LayoutGrid, Paintbrush
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { listService, AnimeEntry } from '../services/listService';
import { STORE_ITEMS_SORTED, getAvatarShapeClass, isBadgeUnlocked, isTitleUnlocked } from '../data/storeItems';
import { doc, updateDoc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DYNAMIC_ACHIEVEMENTS, CATEGORY_LABELS } from '../data/dynamicAchievements';

interface ProfileViewProps {
  onAdminClick?: () => void;
  onRewardsClick?: () => void;
  onLevelPerksClick?: () => void;
  userId?: string;
  onBack?: () => void;
}

export default function ProfileView({ 
  onAdminClick, 
  onRewardsClick, 
  onLevelPerksClick, 
  userId, 
  onBack 
}: ProfileViewProps) {
  const { user, logout, userData: currentUserData } = useAuth();
  
  // High-performance unified states
  const [entries, setEntries] = useState<AnimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetUserData, setTargetUserData] = useState<any>(null);

  // Advanced settings view trigger
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showAchievementsPage, setShowAchievementsPage] = useState(false);

  // Achievements pagination & filtering state
  const [activeAchievementTab, setActiveAchievementTab] = useState<'completed' | 'locked'>('completed');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [achievementsLimit, setAchievementsLimit] = useState<number>(40);

  // Edit fields state
  const [editFields, setEditFields] = useState({
    displayName: '',
    username: '',
    error: '',
    success: false
  });
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Resolved identity
  const targetId = userId || user?.id;
  const isCurrentUser = !userId || userId === user?.id;
  const userData = isCurrentUser ? currentUserData : targetUserData;

  // Optimized fetch profile statistics
  useEffect(() => {
    if (!targetId) return;
    let isMounted = true;
    
    const fetchProfile = async () => {
      try {
        setLoading(true);
        if (!isCurrentUser) {
          const userDoc = await getDoc(doc(db, 'users', targetId));
          if (userDoc.exists() && isMounted) {
            setTargetUserData(userDoc.data());
          }
        }
        
        const uEntries = await listService.getAnimeEntries(targetId);
        if (isMounted) {
          setEntries(uEntries);
        }
      } catch (err) {
        console.error('Failed to load profile logs:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [targetId, isCurrentUser]);

  // Handle Edit appearance initial setups
  useEffect(() => {
    if (showAdvancedSettings && userData) {
      setEditFields({
        displayName: userData.displayName || user?.displayName || '',
        username: userData.username || '',
        error: '',
        success: false
      });
    }
  }, [showAdvancedSettings, userData, user]);

  const handleUpdateIdentifiers = async () => {
    if (!user) return;
    try {
      let finalUpdates: any = {};
      const now = Date.now();
      
      const cleanDisplayName = editFields.displayName.trim();
      if (cleanDisplayName !== (userData.displayName || user.displayName) && cleanDisplayName.length > 0) {
        const lastChange = userData.lastDisplayNameChange || 0;
        const daysSinceChange = (now - lastChange) / (1000 * 60 * 60 * 24);
        if (daysSinceChange < 30 && lastChange !== 0) {
          setEditFields(prev => ({ 
            ...prev, 
            error: `يمكنك تعديل اللقب المستعار عقب مرّور ${Math.ceil(30 - daysSinceChange)} يوم` 
          }));
          return;
        }
        finalUpdates.displayName = cleanDisplayName;
        finalUpdates.lastDisplayNameChange = now;
      }
      
      const cleanUsername = editFields.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (cleanUsername !== userData.username && cleanUsername.length >= 3) {
        const lastChange = userData.lastUsernameChange || 0;
        const daysSinceChange = (now - lastChange) / (1000 * 60 * 60 * 24);
        if (daysSinceChange < 105 && lastChange !== 0) {
          setEditFields(prev => ({ 
            ...prev, 
            error: `تعديل اسم المعرّف متاح بعد مضي ${Math.ceil(105 - daysSinceChange)} يوم` 
          }));
          return;
        }
        
        // Claim unique validation
        const userNameRef = doc(db, 'usernames', cleanUsername);
        const nameSnap = await getDoc(userNameRef);
        if (nameSnap.exists() && nameSnap.data().id !== user.id) {
          setEditFields(prev => ({ ...prev, error: 'اسم المعرّف محجوز مسبقاً، اختر آخر من فضلك.' }));
          return;
        }
        
        await setDoc(userNameRef, { id: user.id });
        if (userData.username) {
          await deleteDoc(doc(db, 'usernames', userData.username)).catch(console.error);
        }
        
        finalUpdates.username = cleanUsername;
        finalUpdates.lastUsernameChange = now;
      }
      
      if (Object.keys(finalUpdates).length > 0) {
        await updateDoc(doc(db, 'users', user.id), finalUpdates);
      }
      setEditFields(prev => ({ ...prev, success: true, error: '' }));
      setTimeout(() => setEditFields(prev => ({ ...prev, success: false })), 3000);
    } catch (e) {
      setEditFields(prev => ({ ...prev, error: 'عذراً! واجهتنا مشكلة أثناء تحديث مظهرك.' }));
    }
  };

  // Ultra-fast memoized stats computations (prevents heavy recalculations)
  const stats = useMemo(() => {
    const listCount = { watching: 0, completed: 0, plan_to_watch: 0, on_hold: 0, dropped: 0 };
    let sumEpisodes = 0;
    const scores: number[] = [];
    const genreCounts: { [key: string]: number } = {};

    entries.forEach(e => {
      if (e.status in listCount) {
        listCount[e.status as keyof typeof listCount] += 1;
      }

      if (e.status === 'completed') {
        sumEpisodes += e.episodesCount || e.progress || e.watchedEpisodes?.length || 12;
      } else {
        sumEpisodes += e.watchedEpisodes && e.watchedEpisodes.length > 0 
          ? e.watchedEpisodes.length 
          : (e.progress || 0);
      }

      if (e.score && e.score > 0) {
        scores.push(e.score);
      }

      let gs: string[] = [];
      if (Array.isArray(e.genres)) gs = e.genres;
      else if (typeof e.genres === 'string') gs = (e.genres as string).split(',').map(s => s.trim());
      else if (e.animeDetails?.genres) {
        gs = Array.isArray(e.animeDetails.genres) ? e.animeDetails.genres : String(e.animeDetails.genres).split(',').map(s => s.trim());
      }
      gs.forEach(g => { if (g) genreCounts[g] = (genreCounts[g] || 0) + 1; });
    });

    const totalListCount = listCount.watching + listCount.completed + listCount.plan_to_watch + listCount.on_hold + listCount.dropped;
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0.0';
    const watchDays = ((sumEpisodes * 24) / 1440).toFixed(1);

    const favoriteGenres = Object.entries(genreCounts)
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / Math.max(1, totalListCount)) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    return {
      listCount,
      totalEpisodesWatched: sumEpisodes > 0 ? sumEpisodes : (userData?.totalEpisodesWatched || 0),
      avgScore,
      watchDays,
      totalListCount,
      favoriteGenres
    };
  }, [entries, userData]);

  const currentLevel = userData?.level || 1;
  const nextLevel = currentLevel + 1;
  const xpNeededForNext = Math.floor(Math.pow(currentLevel, 1.5) * 500) + 500;
  const levelProgress = useMemo(() => {
    return Math.min(100, Math.max(0, ((userData?.xp || 0) / xpNeededForNext) * 100));
  }, [userData?.xp, xpNeededForNext]);

  // Privacy declarations
  const showStats = isCurrentUser || userData?.privacySettings?.showStats !== false;
  const showHistory = isCurrentUser || userData?.privacySettings?.showHistory !== false;
  const showStore = isCurrentUser || userData?.privacySettings?.showStore !== false;

  const equipped = useMemo(() => {
    const bannerId = showStore ? userData?.equippedBanner : null;
    const avatarId = showStore ? userData?.equippedAvatar : null;
    const frameId = showStore ? userData?.equippedFrame : null;
    const titleId = showStore ? userData?.equippedTitle : null;
    const badgeId = showStore ? userData?.equippedBadge : null;

    return {
      banner: STORE_ITEMS_SORTED.find(i => i.id === bannerId),
      avatar: STORE_ITEMS_SORTED.find(i => i.id === avatarId),
      frame: STORE_ITEMS_SORTED.find(i => i.id === frameId),
      title: STORE_ITEMS_SORTED.find(i => i.id === titleId),
      badge: STORE_ITEMS_SORTED.find(i => i.id === badgeId),
    };
  }, [userData, showStore]);

  const bannerImg = equipped.banner?.img || '';
  const avatarImg = equipped.avatar?.img || (isCurrentUser ? user?.photoURL : null) || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix";

  // Cache owned items computation (mainly banners, avatars, and frames purchased with coins)
  const ownedItems = useMemo(() => {
    const purchasedIds = userData?.purchasedItems || [];
    return STORE_ITEMS_SORTED.filter(i => purchasedIds.includes(i.id));
  }, [userData]);

  // Dynamic Level-based unlocked titles
  const unlockedTitles = useMemo(() => {
    return STORE_ITEMS_SORTED.filter(i => i.type === 'title' && isTitleUnlocked(i, userData));
  }, [userData]);

  // Dynamic Achievement-based unlocked badges
  const unlockedBadges = useMemo(() => {
    return STORE_ITEMS_SORTED.filter(i => i.type === 'badge' && isBadgeUnlocked(i.id, userData));
  }, [userData]);

  // Dynamic achievements computation
  const userAchievements = useMemo(() => {
    const completed = DYNAMIC_ACHIEVEMENTS.filter(ach => ach.condition(userData, stats));
    const locked = DYNAMIC_ACHIEVEMENTS.filter(ach => !ach.condition(userData, stats));
    return { completed, locked };
  }, [userData, stats]);

  const latestThreeAchievements = useMemo(() => {
    const list = [...userAchievements.completed].reverse();
    if (list.length < 3) {
      const needed = 3 - list.length;
      list.push(...userAchievements.locked.slice(0, needed));
    }
    return list.slice(0, 3);
  }, [userAchievements]);

  const filteredAchievements = useMemo(() => {
    const list = activeAchievementTab === 'completed' ? userAchievements.completed : userAchievements.locked;
    if (selectedCategory === 'all') return list;
    return list.filter(ach => ach.category === selectedCategory);
  }, [activeAchievementTab, selectedCategory, userAchievements]);

  const handleEquip = useCallback(async (type: string, id: string | null) => {
    if (!user) return;
    const updatePayload: any = {};
    if (type === 'banner') updatePayload.equippedBanner = id;
    if (type === 'avatar') updatePayload.equippedAvatar = id;
    if (type === 'frame') updatePayload.equippedFrame = id;
    if (type === 'title') updatePayload.equippedTitle = id;
    if (type === 'badge') updatePayload.equippedBadge = id;
    
    await updateDoc(doc(db, 'users', user.id), updatePayload);
  }, [user]);

  const handleTogglePrivacy = async (field: 'showStats' | 'showStore' | 'showHistory') => {
    if (!user) return;
    try {
      const currentPrivacy = userData?.privacySettings || { showStats: true, showStore: true, showHistory: true };
      const updatedPrivacy = {
        ...currentPrivacy,
        [field]: currentPrivacy[field] === false ? true : false
      };
      await updateDoc(doc(db, 'users', user.id), {
        privacySettings: updatedPrivacy
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Custom Appearance Layout values
  const avatarAlignment = userData?.avatarAlignment || 'right';
  const avatarShape = equipped.frame?.avatarShape || 'circle';
  const bannerSize = userData?.bannerSize || 'normal';

  const isCentered = avatarAlignment === 'center';
  const isLeft = avatarAlignment === 'left';
  const isRight = avatarAlignment === 'right' || !avatarAlignment;

  // CSS mappings
  const bannerHeightClass = bannerSize === 'compact' ? 'h-36' : bannerSize === 'cinematic' ? 'h-72' : 'h-52';
  const avatarShapeClass = getAvatarShapeClass(avatarShape);

  const handleUpdateLayoutConfig = async (key: string, value: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.id), { [key]: value });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-[#000000] min-h-screen text-xs font-sans text-right select-none max-w-lg mx-auto border-x border-[#1a1a1a] relative shadow-2xl pb-32 overflow-x-hidden" dir="rtl">
      
      {/* Dynamic Ambient Background Aura */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-[#120726]/35 via-transparent to-transparent pointer-events-none z-0" />

      {/* Back Button with absolute spacing overlay */}
      {onBack && (
        <div className="absolute top-6 right-6 z-40">
          <button 
            onClick={onBack} 
            className="p-2.5 bg-[#0a0a0c]/80 backdrop-blur-md rounded-xl hover:bg-[#121214] border border-white/5 active:scale-95 transition-all text-white/90 shadow-md flex items-center justify-center cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Main flow render check for profile or settings panel */}
      <AnimatePresence mode="wait">
        {showAchievementsPage ? (
          <motion.div 
            key="achievements_page"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="p-4 space-y-5 select-none text-right"
          >
            {/* Header section with back button */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowAchievementsPage(false)} 
                  className="p-2 bg-[#09090c] border border-white/5 rounded-xl text-neutral-400 hover:text-white transition cursor-pointer"
                >
                  <ChevronRight size={15} />
                </button>
                <div className="text-right">
                  <h1 className="text-white font-black text-sm flex items-center gap-1.5">
                    <Trophy size={14} className="text-amber-500 animate-pulse" />
                    <span>سجل الإنجازات والأوسمة الكبرى</span>
                  </h1>
                  <p className="text-[8.5px] text-neutral-500 font-bold mt-0.5">تفقد تقدّمك ومسيرتك في حيازة ألقاب وحوافز المنصة الـ 500</p>
                </div>
              </div>

              <div className="text-left font-mono shrink-0">
                <div className="text-amber-500 font-black text-sm text-left leading-none">
                  {userAchievements.completed.length} / {DYNAMIC_ACHIEVEMENTS.length}
                </div>
                <div className="text-[7.5px] text-neutral-500 font-bold font-sans text-left mt-1">مكتمل الكل</div>
              </div>
            </div>

            {/* Exact 2 tabs requested */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#050508]/60 border border-white/5 rounded-xl">
              <button
                onClick={() => {
                  setActiveAchievementTab('completed');
                  setAchievementsLimit(40);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeAchievementTab === 'completed'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <CheckCircle2 size={13} />
                <span>حققتها ({userAchievements.completed.length})</span>
              </button>
              <button
                onClick={() => {
                  setActiveAchievementTab('locked');
                  setAchievementsLimit(40);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeAchievementTab === 'locked'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Lock size={13} />
                <span>لم أحققها ({userAchievements.locked.length})</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedCategory(key);
                    setAchievementsLimit(40);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[9px] font-black transition-all cursor-pointer border ${
                    selectedCategory === key
                      ? 'bg-[#18181b] text-white border-white/10 shadow-sm'
                      : 'bg-black/20 text-neutral-450 border-transparent hover:text-white hover:border-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Grid Layout (عرض شبكة) requested */}
            {filteredAchievements.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredAchievements.slice(0, achievementsLimit).map((ach) => {
                  const isUnlocked = ach.condition(userData, stats);
                  const curProgress = typeof ach.progress === 'function' ? ach.progress(userData, stats) : 0;
                  const percentValue = Math.min(100, Math.round((Number(curProgress) / ach.max) * 100));

                  return (
                    <div 
                      key={ach.id}
                      className={`relative border rounded-2xl p-3 flex flex-col justify-between gap-3 text-right bg-black/40 transition-all hover:scale-[1.03] duration-300 ${
                        isUnlocked 
                          ? 'border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.03)]' 
                          : 'border-white/5 shadow-inner'
                      }`}
                    >
                      {/* Top Action Ribbon / Category Icon */}
                      <div className="flex items-center justify-between">
                        <span className="text-[7.5px] font-medium text-neutral-500 uppercase tracking-widest font-mono">
                          {CATEGORY_LABELS[ach.category as keyof typeof CATEGORY_LABELS]}
                        </span>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                          isUnlocked ? 'bg-amber-500/10 text-amber-500' : 'bg-neutral-800 text-neutral-500'
                        }`}>
                          {isUnlocked ? <Trophy size={11} className="animate-pulse" /> : <Lock size={11} />}
                        </div>
                      </div>

                      {/* Content block */}
                      <div className="space-y-1">
                        <h4 className={`text-[10px] font-black tracking-tight leading-tight ${isUnlocked ? 'text-amber-400' : 'text-neutral-200'}`}>
                          {ach.title}
                        </h4>
                        <p className="text-[8px] text-neutral-400 font-medium leading-relaxed">
                          {ach.req}
                        </p>
                      </div>

                      {/* Progress meter and bar */}
                      <div className="space-y-1 mt-1">
                        <div className="flex justify-between items-center text-[7.5px] font-mono select-none">
                          <span className="text-neutral-500 font-bold">التقدم والنسبة</span>
                          <span className={`${isUnlocked ? 'text-emerald-400' : 'text-purple-400'} font-bold`}>
                            {curProgress} / {ach.max} ({percentValue}%)
                          </span>
                        </div>
                        <div className="h-1 w-full bg-[#0a0a0c] rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              isUnlocked ? 'bg-gradient-to-l from-emerald-500 to-teal-400' : 'bg-gradient-to-l from-purple-500 to-indigo-400'
                            }`}
                            style={{ width: `${percentValue}%` }}
                          />
                        </div>
                      </div>

                      {/* Reward Footer */}
                      <div className="border-t border-white/5 pt-2 flex items-center justify-between">
                        <span className="text-[7.2px] text-neutral-500 font-bold">الجائزة المستلمة:</span>
                        <span className="font-mono text-[8px] font-black">
                          {ach.rewardType === 'coins' ? (
                            <span className="text-yellow-400">+{ach.rewardVal} 🪙</span>
                          ) : ach.rewardType === 'xp' ? (
                            <span className="text-purple-400">+{ach.rewardVal} XP</span>
                          ) : (
                            <span className="text-emerald-400">+{ach.rewardVal} نقطة</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 bg-black/40 border border-white/5 rounded-2xl text-center space-y-1.5">
                <p className="text-[10px] text-neutral-400 font-bold">لا توجد إنجازات تفي بهذا الاختيار لغاية اللحظة.</p>
                <p className="text-[8px] text-neutral-500 font-medium">جرّب تباهياً بتوسعة خيارات وبنود القائمة أو تصفية تصنيف آخر!</p>
              </div>
            )}

            {/* Pagination / Show More */}
            {filteredAchievements.length > achievementsLimit && (
              <div className="flex justify-center pt-4">
                <button 
                  onClick={() => setAchievementsLimit(prev => prev + 30)}
                  className="px-6 py-2.5 bg-[#0a0a0c]/80 hover:bg-[#121214] border border-white/10 rounded-xl text-[10px] font-black text-white/95 transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
                >
                  <span>عرض المزيد من الإنجازات والأهداف ({filteredAchievements.length - achievementsLimit}+)</span>
                  <ChevronDown size={12} className="animate-bounce" />
                </button>
              </div>
            )}
          </motion.div>
        ) : !showAdvancedSettings ? (
          <motion.div 
            key="profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            
            {/* Header Cinematic Cover Plaque (Full-bleed edge-to-edge banner) */}
            <div className={`relative ${bannerHeightClass} w-full overflow-hidden bg-[#050508] border-b border-white/5 select-none z-10 duration-300`}>
              {bannerImg ? (
                <div 
                  className={`absolute inset-0 w-full h-full bg-cover bg-center transition-all ${equipped.banner?.imageStyle || ''}`} 
                  style={{ backgroundImage: `url(${bannerImg})` }} 
                />
              ) : (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-[#05050a] via-[#100b1a]/40 to-[#05050a]">
                  <div className="absolute inset-0 bg-[radial-gradient(#1e1e1e_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
                </div>
              )}
              
              {/* Clear shadows to elevate identity */}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />

              {/* Removed layout customization button */}
            </div>

            {/* Main Stats Overlap & Identity Plaque */}
            <div className={`relative -mt-16 px-4 pb-2 z-20 flex flex-col ${
              isCentered ? 'items-center text-center' : isLeft ? 'items-end text-left' : 'items-start text-right'
            }`}>
              
              <div className={`flex ${
                isCentered ? 'justify-center' : isLeft ? 'justify-end w-full' : 'justify-start w-full'
              } mb-3.5`}>
                
                {/* Main Level Rings & Avatar Frame Assembly */}
                <div 
                  className={`relative cursor-pointer transition-transform duration-200 shrink-0`}
                  onClick={() => isCurrentUser && setShowAdvancedSettings(true)}
                >
                  {/* Outer Aura Ring */}
                  {avatarShape !== 'hexagon' && (
                    <div className={`absolute inset-[-4px] ${avatarShapeClass} blur-[3px] opacity-75 animate-pulse bg-gradient-to-r ${
                      (userData?.level || 1) >= 50 ? 'from-[#ff2e54] to-[#f59e0b]' :
                      (userData?.level || 1) >= 30 ? 'from-[#a855f7] to-[#ec4899]' :
                      (userData?.level || 1) >= 15 ? 'from-[#38bdf8] to-[#10b981]' :
                      'from-[#404040] to-[#525252]'
                    }`} />
                  )}

                  <div className={`w-20 h-20 ${avatarShapeClass} border-4 border-[#000000] bg-[#0c0c0e] overflow-hidden relative z-10 shadow-[0_5px_15px_rgba(0,0,0,0.85)]`}>
                    <img src={avatarImg} alt="Avatar" className={`w-full h-full object-cover transition-transform ${equipped.avatar?.imageStyle || ''}`} />
                  </div>

                  {/* Custom Equipped active frame overlay */}
                  {equipped.frame?.frameStyle && (
                    <div className={`absolute inset-[-5px] pointer-events-none z-20 ${equipped.frame.frameStyle} ${avatarShapeClass}`} />
                  )}

                  {/* Pulsing Levels indicator token badge */}
                  <div className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-[#9333ea] to-[#ec4899] text-white font-black text-[9px] w-7 h-7 rounded-full flex items-center justify-center border-2 border-black shadow-lg font-mono leading-none z-30">
                    {userData?.level || 1}
                  </div>
                </div>
              </div>

              {/* Text Names and Identifiers */}
              <div className={`space-y-1 w-full text-white ${
                isCentered ? 'text-center' : isLeft ? 'text-left' : 'text-right'
              }`}>
                <h2 className={`text-base font-black flex items-center gap-1.5 tracking-tight ${
                  isCentered ? 'justify-center' : isLeft ? 'justify-end' : 'justify-start'
                } ${equipped.title ? equipped.title.color : 'text-neutral-100'}`}>
                  <span>{userData?.displayName || (isCurrentUser ? user?.displayName : 'أوتـاكو غامض')}</span>
                  {equipped.title && equipped.title.icon && <equipped.title.icon size={12} className="shrink-0" />}
                  {equipped.badge && equipped.badge.icon && (
                    <span className="p-0.5 border border-yellow-500/20 bg-yellow-500/5 rounded-full" title={equipped.badge.name}>
                      {React.createElement(equipped.badge.icon, { size: 10, className: equipped.badge.color })}
                    </span>
                  )}
                </h2>

                {userData?.username && (
                  <p className="text-[10px] font-mono text-neutral-500 font-bold tracking-wider">@{userData.username}</p>
                )}

                {/* Social Badges List */}
                <div className={`flex gap-1.5 text-[8px] pt-1 flex-wrap ${
                  isCentered ? 'justify-center' : isLeft ? 'justify-end' : 'justify-start'
                } font-bold`}>
                  {equipped.title && (
                    <span className={`flex items-center gap-1 ${equipped.title.color} bg-white/5 border border-white/5 px-2 py-0.5 rounded-md`}>
                      <Shield size={9} /> {equipped.title.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1 bg-[#101012] border border-white/5 px-2 py-0.5 rounded-md text-red-400">
                    <Flame size={9} className="text-red-500" /> {showHistory ? `${userData?.streakDays || 0} يوم حماس` : '🔐 محفوظ'}
                  </span>
                  <span className="flex items-center gap-1 bg-[#101012] border border-white/5 px-2 py-0.5 rounded-md text-yellow-500">
                    <Trophy size={9} /> {showHistory ? `${userData?.coins || 0} كوينز` : '🔐 محفوظ'}
                  </span>
                </div>

                {/* RPG Combat Progress Tracker Card */}
                <div className="mt-4 bg-[#09090b]/95 border border-white/5 rounded-xl p-3.5 relative overflow-hidden text-right">
                  {!showHistory && (
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-[3px] z-30 flex flex-col items-center justify-center gap-0.5">
                      <Lock size={12} className="text-yellow-500/80 animate-pulse" />
                      <span className="text-neutral-400 font-bold text-[8px]">التقدم مخفـي بناءً على رغبة المستخدم</span>
                    </div>
                  )}
                  
                  {/* Standard Levels detailed labels */}
                  <div className="flex items-center gap-2.5 text-neutral-300 font-mono text-[9.5px] select-none mb-1" dir="ltr">
                    <span className="shrink-0 font-bold text-[#a855f7] bg-[#a855f7]/10 border border-[#a855f7]/20 px-2 py-0.5 rounded-md">
                      LV {currentLevel}
                    </span>
                    <div className="flex-1 h-4 bg-neutral-950 rounded-full relative overflow-hidden border border-white/5 shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-[#9333ea] to-[#ec4899] rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(236,72,153,0.3)]" 
                        style={{ width: `${levelProgress}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white tracking-wider font-mono">
                        {userData?.xp || 0} / {xpNeededForNext} XP
                      </div>
                    </div>
                    <span className="shrink-0 font-bold text-pink-400 bg-pink-950/10 border border-pink-500/20 px-2 py-0.5 rounded-md">
                      LV {nextLevel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento statistics information blocks container */}
            <div className="px-4 space-y-4">
              
              {/* Episodes Observed Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-[#050508]/85 border border-[#1a1a1a] rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden text-center">
                  <PlayCircle size={16} className="text-[#38bdf8] mb-1" />
                  <span className="text-base font-black text-white font-mono">{showHistory ? stats.totalEpisodesWatched : '🔐'}</span>
                  <span className="text-[8px] text-neutral-500 font-bold mt-0.5">حلقة مرصودة</span>
                </div>

                <div className="bg-[#050508]/85 border border-[#1a1a1a] rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden text-center">
                  <ListVideo size={16} className="text-[#10b981] mb-1" />
                  <span className="text-base font-black text-white font-mono">{showStats ? stats.totalListCount : '🔐'}</span>
                  <span className="text-[8px] text-neutral-500 font-bold mt-0.5">أنمي بالقائمة</span>
                </div>
              </div>

              {/* Dynamic Social & Custom stats block */}
              <div className="bg-[#050508]/40 border border-white/5 rounded-2xl p-3.5 space-y-3">
                
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-black/40 border border-white/5 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                    <MessageSquare size={13} className="text-[#a855f7] mb-1" />
                    <span className="text-[11px] font-black text-white font-mono leading-none">{userData?.commentsCount || 0}</span>
                    <span className="text-[7.5px] text-neutral-500 font-bold mt-1.5">التعليقات</span>
                  </div>

                  <div className="bg-black/40 border border-white/5 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                    <CheckSquare size={13} className="text-[#eab308] mb-1" />
                    <span className="text-[11px] font-black text-white font-mono leading-none">{userData?.approvedRecommendationsCount || 0}</span>
                    <span className="text-[7.5px] text-neutral-500 font-bold mt-1.5">المعتمدة</span>
                  </div>

                  <div className="bg-black/40 border border-white/5 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                    <ThumbsUp size={13} className="text-[#10b981] mb-1" />
                    <span className="text-[11px] font-black text-white font-mono leading-none">{userData?.likesReceived || 0}</span>
                    <span className="text-[7.5px] text-neutral-500 font-bold mt-1.5">الإعجابات</span>
                  </div>

                  <div className="bg-black/40 border border-white/5 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                    <ThumbsDown size={13} className="text-red-500 mb-1" />
                    <span className="text-[11px] font-black text-white font-mono leading-none">{userData?.dislikesReceived || 0}</span>
                    <span className="text-[7.5px] text-neutral-500 font-bold mt-1.5">سلبية</span>
                  </div>
                </div>
              </div>

              {/* Daily Quests notebook card trigger */}
              {isCurrentUser && onRewardsClick && (
                <button 
                  onClick={onRewardsClick}
                  className="w-full bg-[#08080a] border border-yellow-500/10 hover:border-yellow-500/25 rounded-xl p-3 flex items-center justify-between group transition-all text-white font-sans relative"
                >
                  <div className="flex items-center gap-2.5 relative z-10">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-yellow-500 to-amber-600 flex items-center justify-center text-black font-black">
                      <Trophy size={14} />
                    </div>
                    <div className="text-right">
                      <h3 className="font-extrabold text-white text-[10px]">دفتر المكافآت والمهام اليومية</h3>
                      <p className="text-[8px] text-yellow-500/80 font-bold mt-0.5">احصد كوينز يومي لتطوير مظهرك واقتناء النوادر 🪙</p>
                    </div>
                  </div>
                  <ChevronLeft className="text-yellow-500/70 group-hover:-translate-x-1 transition-transform" size={14} />
                </button>
              )}

              {/* Statistics analysis graphics panel */}
              {!showStats ? (
                <div className="bg-[#050508] border border-white/5 rounded-2xl p-8 text-center text-white">
                  <Lock className="text-red-500 mx-auto mb-2" size={24} />
                  <h3 className="font-extrabold text-[11px]">الملخص الإحصائي خاص</h3>
                  <p className="text-neutral-500 text-[9px] mt-1">قام المستخدم بحظر وصول الإحصائيات لقائمته.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* Unified Cybernetic Status & Ring Chart Component */}
                  <div className="bg-[#050508]/60 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-4">
                    {/* Interactive Dual-Orbit Glowing Ring chart */}
                    <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                      <div className="absolute inset-[-4px] rounded-full border border-dashed border-white/5 animate-spin-slow pointer-events-none" />
                      <svg className="w-full h-full transform -rotate-90 animate-fade-in" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" className="stroke-[#09090a] fill-none" strokeWidth="8" />
                        {(() => {
                          let currentOffset = 0;
                          const circ = 2 * Math.PI * 40;
                          return [
                            { count: stats.listCount.watching, color: '#319795' }, // custom-styled
                            { count: stats.listCount.completed, color: '#10b981' },
                            { count: stats.listCount.plan_to_watch, color: '#eab308' },
                            { count: stats.listCount.on_hold, color: '#f97316' },
                            { count: stats.listCount.dropped, color: '#6b7280' }
                          ].filter(s => s.count > 0).map((s, i) => {
                            const pct = s.count / Math.max(1, stats.totalListCount);
                            const startOffset = currentOffset * circ;
                            const segmentLength = pct * circ;
                            currentOffset += pct;
                            return (
                              <circle 
                                key={i}
                                cx="50" cy="50" r="40"
                                className="fill-none duration-750 transition-all stroke-current filter drop-shadow-[0_0_4px_rgba(255,255,255,0.1)]"
                                strokeWidth="9"
                                strokeDasharray={`0 ${startOffset} ${segmentLength} ${circ}`}
                                strokeDashoffset={0}
                                style={{ 
                                  color: s.color
                                }}
                                strokeLinecap={pct === 1 ? "butt" : "round"}
                              />
                            );
                          });
                        })()}
                      </svg>
                      
                      <div className="absolute flex flex-col justify-center items-center leading-none text-center">
                        <span className="text-base font-black text-white font-mono">{stats.totalListCount}</span>
                        <span className="text-[7.5px] text-neutral-500 mt-1 font-bold">بالمجموع</span>
                      </div>
                    </div>

                    {/* 5 Cards in 1 row (5 Columns) below chart */}
                    <div className="grid grid-cols-5 gap-1 w-full mt-2">
                      {[
                        { label: 'أشاهد', count: stats.listCount.watching, color: 'text-sky-400', border: 'border-sky-500/10', bg: 'bg-sky-500/5' },
                        { label: 'مكتمل', count: stats.listCount.completed, color: 'text-emerald-400', border: 'border-emerald-500/10', bg: 'bg-emerald-500/5' },
                        { label: 'مخطط', count: stats.listCount.plan_to_watch, color: 'text-yellow-400', border: 'border-yellow-500/10', bg: 'bg-yellow-500/5' },
                        { label: 'متوقف', count: stats.listCount.on_hold, color: 'text-orange-400', border: 'border-orange-500/10', bg: 'bg-orange-500/5' },
                        { label: 'ملغي', count: stats.listCount.dropped, color: 'text-neutral-400', border: 'border-neutral-500/10', bg: 'bg-neutral-500/5' }
                      ].map(item => (
                        <div key={item.label} className={`border ${item.border} ${item.bg} rounded-xl p-1.5 flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02]`}>
                          <span className="text-[8px] font-black text-neutral-400 select-none">{item.label}</span>
                          <span className={`text-[11px] font-black font-mono ${item.color} mt-0.5`}>{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Genres Preferred Panel */}
                  <div className="bg-[#050508]/60 border border-white/5 rounded-2xl p-4">
                    <h4 className="text-[9px] font-black text-white flex items-center gap-1.5 mb-3">
                      <BarChart3 size={11} className="text-[#a855f7]" /> التصنيفات المفضلة بالقائمة:
                    </h4>
                    {stats.favoriteGenres.length > 0 ? (
                      <div className="space-y-3">
                        {stats.favoriteGenres.map((g, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center text-[8px] font-extrabold text-neutral-400">
                              <span>{g.name}</span>
                              <span className="font-mono text-neutral-500">{g.count} عمل ({g.percent}%)</span>
                            </div>
                            <div className="h-1 bg-neutral-950 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-[#9333ea] to-[#ec4899] rounded-full transition-all duration-500" style={{ width: `${g.percent}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[8px] text-neutral-600 text-center py-4">أضف أعمالاً وتصنيفات لتفصيل ذائقتك الفنية الفولاذية.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Latest achievements block */}
              <div className="bg-[#050508]/60 border border-white/5 rounded-2xl p-4 space-y-3">
                <div 
                  onClick={() => setShowAchievementsPage(true)}
                  className="flex items-center justify-between cursor-pointer hover:opacity-85 transition-all text-right select-none"
                >
                  <h4 className="text-[10.5px] font-black text-white flex items-center gap-1.5">
                    <Trophy size={13} className="text-amber-500" /> أحدث الإنجازات والأهداف
                  </h4>
                  <span className="text-[8px] font-bold text-[#a855f7] flex items-center gap-0.5">
                    استعراض الكل {userAchievements.completed.length} / {DYNAMIC_ACHIEVEMENTS.length} <ChevronLeft size={10} />
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {latestThreeAchievements.map((ach) => {
                    const isUnlocked = ach.condition(userData, stats);
                    return (
                      <button
                        key={ach.id}
                        onClick={() => setShowAchievementsPage(true)}
                        className={`w-full text-right p-3 rounded-xl border ${
                          isUnlocked 
                            ? 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20' 
                            : 'bg-black/40 hover:bg-neutral-900/35 border-white/5'
                        } transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 text-white`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`p-2 rounded-lg ${isUnlocked ? 'bg-amber-500/10 text-amber-500' : 'bg-neutral-800 text-neutral-500'} shrink-0`}>
                            {isUnlocked ? <Trophy size={14} className="animate-pulse" /> : <Lock size={14} />}
                          </div>
                          <div>
                            <div className="text-[10px] font-black tracking-tight">{ach.title}</div>
                            <div className="text-[8.5px] text-neutral-450 mt-0.5 leading-snug">{ach.req}</div>
                          </div>
                        </div>

                        <div className="text-left shrink-0 font-mono text-[8.5px]">
                          {ach.rewardType === 'coins' ? (
                            <span className="text-yellow-400 font-bold">+{ach.rewardVal} كوينز</span>
                          ) : ach.rewardType === 'xp' ? (
                            <span className="text-purple-400 font-bold">+{ach.rewardVal} XP</span>
                          ) : (
                            <span className="text-emerald-400 font-bold">+{ach.rewardVal} نقطة</span>
                          )}
                          <div className="text-[7.5px] text-neutral-500 font-bold font-sans mt-0.5">
                            {isUnlocked ? '✓ تم الإنجاز' : 'قيد التقدم'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Link to advanced configuration */}
              {isCurrentUser && (
                <button 
                  onClick={() => setShowAdvancedSettings(true)}
                  className="w-full bg-[#050508] hover:bg-[#0c0c10] border border-white/5 transition-all p-3 rounded-xl text-center text-white/95 font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Settings size={13} className="text-purple-400 animate-spin-slow" />
                  <span>افتح الصفحة المتقدمة لتعديل شاشة المظهر والحساب</span>
                </button>
              )}

            </div>
          </motion.div>
        ) : (
          
          /* ========================================================
             ADVANCED MATURE SETTINGS VIEW (الاعدادات المتطورة للمظهر)
             ======================================================== */
          <motion.div 
            key="advanced_settings"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="p-4 space-y-5"
          >
            {/* Header Settings Page bar */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowAdvancedSettings(false)} 
                  className="p-2 bg-[#09090c] border border-white/5 rounded-xl text-neutral-400 hover:text-white"
                >
                  <ChevronRight size={15} />
                </button>
                <div className="text-right">
                  <h1 className="text-white font-black text-sm flex items-center gap-1.5">
                    <Paintbrush size={14} className="text-[#9333ea]" />
                    <span>تخصيص المظهر وتنسيق الهوية</span>
                  </h1>
                  <p className="text-[8px] text-neutral-500 font-bold mt-0.5">صمم قالب حسابك، وحاذي مكوناته بحرّية تامة</p>
                </div>
              </div>

              <button 
                onClick={() => setShowAdvancedSettings(false)}
                className="px-3 py-1.5 bg-purple-950/20 border border-purple-500/20 text-purple-400 font-black text-[9px] rounded-lg"
              >
                عودة للملف
              </button>
            </div>

            {/* Section 1: Name and Identity editable */}
            <div className="bg-[#050508] border border-white/5 rounded-xl p-3.5 space-y-3">
              <h3 className="text-white font-black text-[10px] flex items-center gap-1.5">
                <User size={13} className="text-purple-400" />
                <span>البيانات والمسمّيات المشخصة</span>
              </h3>

              {editFields.error && (
                <p className="text-[8px] font-bold text-red-400 bg-red-950/25 rounded-lg p-2 border border-red-500/10 leading-snug">{editFields.error}</p>
              )}
              {editFields.success && (
                <p className="text-[8px] font-bold text-emerald-400 bg-emerald-950/25 rounded-lg p-2 border border-emerald-500/10 leading-snug">تم حفظ تعديلات الهوية بنجاح ! ✨</p>
              )}

              <div className="space-y-1.5">
                <label className="text-[8.5px] text-neutral-500 font-bold block">اللقب المستعار (الاسم المعروض)</label>
                <input 
                  type="text" 
                  value={editFields.displayName}
                  onChange={(e) => setEditFields(prev => ({ ...prev, displayName: e.target.value }))}
                  className="w-full bg-[#0d0d11] border border-white/5 rounded-lg p-2.5 text-white text-[10px] outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[8.5px] text-neutral-500 font-bold block">مُعرِّف الأوتـاكو الفريد (اليوز رنيم)</label>
                <div className="flex bg-[#0d0d11] border border-white/5 rounded-lg overflow-hidden focus-within:border-purple-500">
                  <span className="p-2.5 text-neutral-500 text-[10px] bg-neutral-900/60 font-mono">@</span>
                  <input 
                    type="text" 
                    value={editFields.username}
                    onChange={(e) => setEditFields(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full bg-transparent p-2.5 text-[10px] text-white outline-none"
                  />
                </div>
              </div>

              <button 
                onClick={handleUpdateIdentifiers}
                className="w-full bg-[#9333ea] hover:bg-[#a855f7] text-white text-[9px] py-2 rounded-lg font-black transition-all cursor-pointer text-center"
              >
                تطبيق التسمية الجديدة
              </button>
            </div>

            {/* Section 2: Advanced Layout Customizer (محاذاة وحجم وتخطيط) */}
            <div className="bg-[#050508] border border-white/5 rounded-xl p-3.5 space-y-4">
              <h3 className="text-white font-black text-[10px] flex items-center gap-1.5 border-b border-white/5 pb-2">
                <LayoutGrid size={13} className="text-purple-400" />
                <span>إعدادات تنسيق المظهر وهيكلة الشاشة</span>
              </h3>

              {/* Alignment of profile contents */}
              <div className="space-y-2">
                <label className="text-[8.5px] text-neutral-400 font-black block">📍 تحديد محاذاة وموقع صورة العضو بالقائمة:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'right', label: 'اليمين (كلاسيك)' },
                    { id: 'center', label: 'الوسط (متناسق)' },
                    { id: 'left', label: 'اليسار (إستثنائي)' }
                  ].map(a => (
                    <button
                      key={a.id}
                      onClick={() => handleUpdateLayoutConfig('avatarAlignment', a.id)}
                      className={`p-2.5 rounded-lg border text-[8px] font-black transition-all cursor-pointer text-center ${
                        avatarAlignment === a.id 
                          ? 'border-purple-500 bg-purple-950/20 text-purple-400 shadow-md' 
                          : 'border-white/5 bg-[#0a0a0f] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cover size dimensions */}
              <div className="space-y-2">
                <label className="text-[8.5px] text-neutral-400 font-black block">🖼️ حجم وأبعاد صورة الغلاف المفضلة:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'compact', label: 'مدمج (Compact)' },
                    { id: 'normal', label: 'طبيعي (Standard)' },
                    { id: 'cinematic', label: 'سينمائي عريض' }
                  ].map(b => (
                    <button
                      key={b.id}
                      onClick={() => handleUpdateLayoutConfig('bannerSize', b.id)}
                      className={`p-2.5 rounded-lg border text-[8px] font-black transition-all cursor-pointer text-center ${
                        bannerSize === b.id 
                          ? 'border-purple-500 bg-purple-950/20 text-purple-400 shadow-md' 
                          : 'border-white/5 bg-[#0a0a0f] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 3: Equip visual items (العتاد المجهز والمشتريات) */}
            <div className="bg-[#050508] border border-white/5 rounded-xl p-3.5 space-y-4">
              <h3 className="text-white font-black text-[10px] flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Sparkles size={13} className="text-purple-400 animate-pulse" />
                <span>الممتلكات والعتاد المجهّز حالياً</span>
              </h3>

              {/* Avatars Equip slots */}
              <div className="space-y-1.5 text-right font-sans">
                <span className="text-[9px] font-black text-neutral-400 flex items-center gap-1.5"><ImageIcon size={11}/> عتاد صور الأفاتار</span>
                <div className="flex gap-2 overflow-x-auto pb-1.5">
                  <button 
                    onClick={() => handleEquip('avatar', null)}
                    className={`shrink-0 w-11 h-11 rounded-lg flex items-center justify-center border text-[8px] font-black ${!userData?.equippedAvatar ? 'border-[#ff2e54] bg-[#ff2e54]/5 text-[#ff2e54]' : 'border-white/5 bg-[#09090c]'}`}
                  >
                    إلغاء التجهيز
                  </button>
                  {ownedItems.filter(i => i.type === 'avatar').map(item => {
                    const isEquipped = userData?.equippedAvatar === item.id;
                    return (
                      <button 
                        key={item.id}
                        onClick={() => handleEquip('avatar', item.id)}
                        className={`shrink-0 w-11 h-11 rounded-lg overflow-hidden border relative ${isEquipped ? 'border-[#ff2e54]' : 'border-white/5 bg-[#09090c]'}`}
                      >
                         <img src={item.img} className={`w-full h-full object-cover ${item.imageStyle || ''}`} alt="" />
                         {isEquipped && <div className="absolute inset-0 bg-[#ff2e54]/20 flex items-center justify-center"><CheckCircle2 size={12} className="text-white" /></div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Frames Equip slots */}
              <div className="space-y-1.5 text-right font-sans">
                <span className="text-[9px] font-black text-neutral-400 flex items-center gap-1.5"><ShieldCheck size={11}/> الإطارات النشطة والمشعة</span>
                <div className="grid grid-cols-4 gap-2">
                  <button 
                    onClick={() => handleEquip('frame', null)}
                    className={`p-2 rounded-lg border text-[8px] font-black ${!userData?.equippedFrame ? 'border-yellow-500 bg-yellow-500/5 text-yellow-500' : 'border-white/5 bg-[#09090c]'}`}
                  >
                    بدون إطار
                  </button>
                  {ownedItems.filter(i => i.type === 'frame').map(item => {
                    const isEquipped = userData?.equippedFrame === item.id;
                    return (
                      <button 
                        key={item.id}
                        onClick={() => handleEquip('frame', item.id)}
                        className={`p-1.5 rounded-lg border flex flex-col items-center justify-center text-center ${isEquipped ? 'border-yellow-500 bg-yellow-500/5' : 'border-white/5 bg-[#09090c]'}`}
                      >
                        <div className={`w-3 h-3 rounded-full mb-1 ${item.frameStyle}`} />
                        <span className="text-[7.5px] font-bold truncate max-w-full text-neutral-400">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Banners Equip slots */}
              <div className="space-y-1.5 text-right font-sans">
                <span className="text-[9px] font-black text-neutral-400 flex items-center gap-1.5"><ImageIcon size={11}/> أغلفة الخلفيات الشرفية</span>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleEquip('banner', null)}
                    className={`h-11 rounded-lg flex items-center justify-center border text-[8px] font-black ${!userData?.equippedBanner ? 'border-blue-500 bg-blue-500/5 text-blue-500' : 'border-white/5 bg-[#09090c]'}`}
                  >
                    الغلاف الأساسي
                  </button>
                  {ownedItems.filter(i => i.type === 'banner').map(item => {
                    const isEquipped = userData?.equippedBanner === item.id;
                    return (
                      <button 
                        key={item.id}
                        onClick={() => handleEquip('banner', item.id)}
                        className={`h-11 rounded-lg overflow-hidden border relative ${isEquipped ? 'border-blue-500' : 'border-white/5'}`}
                      >
                        <img src={item.img} className={`absolute inset-0 w-full h-full object-cover ${item.imageStyle || ''}`} alt="" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-0.5 truncate text-[7.5px] font-bold text-center text-white">{item.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Titles Equip Slots */}
              <div className="space-y-1.5 text-right font-sans">
                <span className="text-[9px] font-black text-neutral-400 flex items-center gap-1.5"><Trophy size={11}/> الألقاب اللامعة</span>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => handleEquip('title', null)}
                    className={`p-2 rounded-lg border text-[8px] font-black ${!userData?.equippedTitle ? 'border-purple-500 bg-purple-550/5 text-purple-400' : 'border-white/5 bg-[#09090c]'}`}
                  >
                    بدون لقب
                  </button>
                  {unlockedTitles.map(item => {
                    const isEquipped = userData?.equippedTitle === item.id;
                    return (
                      <button 
                        key={item.id}
                        onClick={() => handleEquip('title', item.id)}
                        className={`p-2 rounded-lg border text-center flex items-center justify-center gap-1 text-[8.5px] font-bold ${isEquipped ? 'border-purple-500 bg-purple-500/5 text-purple-400' : 'border-white/5 bg-[#09090c]'}`}
                      >
                        {item.icon && <item.icon size={9} className="shrink-0" />}
                        <span className="truncate">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Badges Equip slots */}
              <div className="space-y-1.5 text-right font-sans">
                <span className="text-[9px] font-black text-neutral-400 flex items-center gap-1.5"><Award size={11}/> أوسمة وشارات الهيبة والقدرة</span>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => handleEquip('badge', null)}
                    className={`p-2 rounded-lg border text-[8px] font-black ${!userData?.equippedBadge ? 'border-yellow-550 bg-yellow-500/5 text-yellow-500' : 'border-white/5 bg-[#09090c]'}`}
                  >
                    تخلٍ عن الأوسمة
                  </button>
                  {unlockedBadges.map(item => {
                    const isEquipped = userData?.equippedBadge === item.id;
                    return (
                      <button 
                        key={item.id}
                        onClick={() => handleEquip('badge', item.id)}
                        className={`p-2 rounded-lg border text-center flex items-center justify-center gap-1 text-[8px] font-bold ${isEquipped ? 'border-yellow-500 bg-yellow-500/5' : 'border-white/5 bg-[#09090c]'}`}
                      >
                         {item.icon && React.createElement(item.icon, { size: 9, className: item.color })}
                         <span className="truncate">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 4: Privacy Settings togglers */}
            <div className="bg-[#050508] border border-white/5 rounded-xl overflow-hidden">
              <button 
                onClick={() => setShowPrivacy(!showPrivacy)}
                className="p-3.5 border-b border-white/5 text-white/90 hover:bg-white/5 transition flex items-center justify-between font-black w-full"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck size={13} className="text-[#38bdf8]" />
                  <span>تعديل خصوصية العرض بالبطاقة</span>
                </span>
                <ChevronDown size={14} className={`text-neutral-500 transition-transform ${showPrivacy ? 'rotate-180' : ''}`} />
              </button>

              {showPrivacy && (
                <div className="p-3 bg-black/50 space-y-2 font-sans text-right">
                  {[
                    { field: 'showStats', name: 'إتاحة إحصاءات القوائم لعامّة الأعضاء بالمنصة' },
                    { field: 'showHistory', name: 'عرض شريط المستوى والخبرة والكوينز للعامّة' },
                    { field: 'showStore', name: 'أظهر المشتريات ومعداتي المجهّزة بصفحتي لغيري' }
                  ].map(p => {
                    const currObj = userData?.privacySettings || { showStats: true, showHistory: true, showStore: true };
                    const isEnabled = currObj[p.field as 'showStats' | 'showHistory' | 'showStore'] !== false;
                    return (
                      <div key={p.field} className="flex justify-between items-center bg-[#101012] p-2.5 rounded-lg border border-white/5">
                        <span className="text-neutral-450 text-[9px] font-bold">{p.name}</span>
                        <button 
                          onClick={() => handleTogglePrivacy(p.field as 'showStats' | 'showHistory' | 'showStore')}
                          className={`w-7 h-4.5 rounded-full transition-colors relative cursor-pointer ${isEnabled ? 'bg-[#10b981]' : 'bg-[#1f1f23]'}`}
                        >
                          <div className={`w-3 h-3 bg-white rounded-full shadow transition-all absolute top-[2.5px] ${isEnabled ? 'left-[2.5px]' : 'right-[2.5px]'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <button className="p-3 w-full border-b border-white/5 text-neutral-350 hover:bg-white/5 transition flex items-center gap-2 font-bold text-right">
                <Bell size={13} className="text-green-400" /> تنبيهات وإشعارات التطبيق
              </button>

              <button onClick={logout} className="p-3.5 w-full text-red-500 hover:bg-red-500/10 transition flex items-center gap-2 font-black text-right">
                <LogOut size={13} /> تسجيل خروج وآمن للحساب
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
