import React, { useState } from 'react';
import { 
  ChevronRight, Award, Trophy, Zap, Gift, CheckCircle2, Lock, Flame, Target, 
  Star, ChevronLeft, Shield, Sparkles, Calendar, Heart, MessageSquare, Compass, 
  Clock, Layers, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { notificationsService } from '../services/notificationsService';

export const ACHIEVEMENTS = [
  { id: 'first_login', title: 'البداية', req: 'تسجيل الدخول لأول مرة', rewardType: 'xp', rewardVal: 50, condition: (u: any) => !!u, progress: (u: any) => !!u ? 1 : 0, max: 1 },
  
  { id: 'watch_1', title: 'البداية بالبث', req: 'شاهد أول حلقة أنمي لك', rewardType: 'xp', rewardVal: 50, condition: (u: any) => (u?.totalEpisodesWatched || 0) >= 1, progress: (u: any) => u?.totalEpisodesWatched || 0, max: 1 },
  { id: 'watch_25', title: 'متابع وفي', req: 'شاهد ۲٥ حلقة أنمي بالكامل', rewardType: 'coins', rewardVal: 30, condition: (u: any) => (u?.totalEpisodesWatched || 0) >= 25, progress: (u: any) => u?.totalEpisodesWatched || 0, max: 25 },
  { id: 'watch_100', title: 'مكتشف العوالم', req: 'شاهد ۱۰۰ حلقة أنمي بالكامل', rewardType: 'coins', rewardVal: 120, condition: (u: any) => (u?.totalEpisodesWatched || 0) >= 100, progress: (u: any) => u?.totalEpisodesWatched || 0, max: 100 },
  { id: 'watch_500', title: 'سيد المشاهدة والخبرة', req: 'شاهد ٥۰۰ حلقة أنمي وتحكم بمصيرك', rewardType: 'xp', rewardVal: 1000, condition: (u: any) => (u?.totalEpisodesWatched || 0) >= 500, progress: (u: any) => u?.totalEpisodesWatched || 0, max: 500 },
  { id: 'watch_1000', title: 'إمبراطور السينما الأوحد', req: 'شاهد ۱۰۰۰ حلقة أنمي على المنصة', rewardType: 'modPoints', rewardVal: 500, condition: (u: any) => (u?.totalEpisodesWatched || 0) >= 1000, progress: (u: any) => u?.totalEpisodesWatched || 0, max: 1000 },

  { id: 'list_1', title: 'أول أنمي', req: 'إضافة أنمي واحد للقائمة', rewardType: 'xp', rewardVal: 100, condition: (u: any) => (u?.listCount || 0) >= 1, progress: (u: any) => u?.listCount || 0, max: 1 },
  { id: 'list_5', title: 'جامع الأنمي', req: 'إضافة 5 أنميات للقائمة', rewardType: 'coins', rewardVal: 30, condition: (u: any) => (u?.listCount || 0) >= 5, progress: (u: any) => u?.listCount || 0, max: 5 },
  { id: 'list_20', title: 'مكتبة كاملة', req: 'إضافة 20 أنمي للقائمة', rewardType: 'modPoints', rewardVal: 50, condition: (u: any) => (u?.listCount || 0) >= 20, progress: (u: any) => u?.listCount || 0, max: 20 },
  { id: 'list_50', title: 'هاوي الأنمي', req: 'إضافة 50 أنمي للقائمة', rewardType: 'coins', rewardVal: 100, condition: (u: any) => (u?.listCount || 0) >= 50, progress: (u: any) => u?.listCount || 0, max: 50 },
  { id: 'list_100', title: 'مكتبة ضخمة', req: 'إضافة 100 أنمي للقائمة', rewardType: 'xp', rewardVal: 1000, condition: (u: any) => (u?.listCount || 0) >= 100, progress: (u: any) => u?.listCount || 0, max: 100 },
  { id: 'list_250', title: 'أمين المكتبة', req: 'إضافة 250 أنمي للقائمة', rewardType: 'coins', rewardVal: 200, condition: (u: any) => (u?.listCount || 0) >= 250, progress: (u: any) => u?.listCount || 0, max: 250 },
  { id: 'list_500', title: 'أرشيف الأنمي', req: 'إضافة 500 أنمي للقائمة', rewardType: 'coins', rewardVal: 300, condition: (u: any) => (u?.listCount || 0) >= 500, progress: (u: any) => u?.listCount || 0, max: 500 },
  { id: 'list_1000', title: 'مجمع الأساطير', req: 'إضافة 1000 أنمي للقائمة', rewardType: 'modPoints', rewardVal: 1000, condition: (u: any) => (u?.listCount || 0) >= 1000, progress: (u: any) => u?.listCount || 0, max: 1000 },

  { id: 'complete_1', title: 'البداية الحقيقية', req: 'إنهاء مشاهدة أنمي واحد', rewardType: 'coins', rewardVal: 20, condition: (u: any) => (u?.completedAnimeCount || 0) >= 1, progress: (u: any) => u?.completedAnimeCount || 0, max: 1 },
  { id: 'complete_5', title: 'متابع جيد', req: 'إنهاء مشاهدة 5 أنميات', rewardType: 'xp', rewardVal: 200, condition: (u: any) => (u?.completedAnimeCount || 0) >= 5, progress: (u: any) => u?.completedAnimeCount || 0, max: 5 },
  { id: 'complete_10', title: 'مخضرم الأنمي', req: 'إنهاء مشاهدة 10 أنميات', rewardType: 'xp', rewardVal: 500, condition: (u: any) => (u?.completedAnimeCount || 0) >= 10, progress: (u: any) => u?.completedAnimeCount || 0, max: 10 },
  { id: 'complete_25', title: 'عاشق الأنمي', req: 'إنهاء مشاهدة 25 أنمي', rewardType: 'coins', rewardVal: 50, condition: (u: any) => (u?.completedAnimeCount || 0) >= 25, progress: (u: any) => u?.completedAnimeCount || 0, max: 25 },
  { id: 'complete_50', title: 'مدمن الأنمي', req: 'إنهاء مشاهدة 50 أنمي', rewardType: 'coins', rewardVal: 100, condition: (u: any) => (u?.completedAnimeCount || 0) >= 50, progress: (u: any) => u?.completedAnimeCount || 0, max: 50 },
  { id: 'complete_100', title: 'موسوعة الأنمي', req: 'إنهاء مشاهدة 100 أنمي', rewardType: 'modPoints', rewardVal: 300, condition: (u: any) => (u?.completedAnimeCount || 0) >= 100, progress: (u: any) => u?.completedAnimeCount || 0, max: 100 },
  { id: 'complete_250', title: 'المختم', req: 'إنهاء مشاهدة 250 أنمي', rewardType: 'coins', rewardVal: 500, condition: (u: any) => (u?.completedAnimeCount || 0) >= 250, progress: (u: any) => u?.completedAnimeCount || 0, max: 250 },
  { id: 'complete_500', title: 'عميد الأوتاكو', req: 'إنهاء مشاهدة 500 أنمي', rewardType: 'xp', rewardVal: 5000, condition: (u: any) => (u?.completedAnimeCount || 0) >= 500, progress: (u: any) => u?.completedAnimeCount || 0, max: 500 },
  { id: 'complete_1000', title: 'حكيم الأنمي (الأسطورة)', req: 'إنهاء مشاهدة 1000 أنمي', rewardType: 'coins', rewardVal: 2000, condition: (u: any) => (u?.completedAnimeCount || 0) >= 1000, progress: (u: any) => u?.completedAnimeCount || 0, max: 1000 },
  { id: 'complete_2000', title: 'كائن فضائي', req: 'إنهاء مشاهدة 2000 أنمي', rewardType: 'modPoints', rewardVal: 5000, condition: (u: any) => (u?.completedAnimeCount || 0) >= 2000, progress: (u: any) => u?.completedAnimeCount || 0, max: 2000 },

  { id: 'level_5', title: 'الارتقاء', req: 'الوصول للمستوى 5', rewardType: 'modPoints', rewardVal: 100, condition: (u: any) => (u?.level || 0) >= 5, progress: (u: any) => u?.level || 1, max: 5 },
  { id: 'level_10', title: 'مبتدئ المعارك', req: 'الوصول للمستوى 10', rewardType: 'coins', rewardVal: 100, condition: (u: any) => (u?.level || 0) >= 10, progress: (u: any) => u?.level || 1, max: 10 },
  { id: 'level_20', title: 'أوتاكو محترف', req: 'الوصول للمستوى 20', rewardType: 'coins', rewardVal: 150, condition: (u: any) => (u?.level || 0) >= 20, progress: (u: any) => u?.level || 1, max: 20 },
  { id: 'level_30', title: 'قائد فرقة', req: 'الوصول للمستوى 30', rewardType: 'xp', rewardVal: 1000, condition: (u: any) => (u?.level || 0) >= 30, progress: (u: any) => u?.level || 1, max: 30 },
  { id: 'level_40', title: 'شينوبي مخضرم', req: 'الوصول للمستوى 40', rewardType: 'coins', rewardVal: 300, condition: (u: any) => (u?.level || 0) >= 40, progress: (u: any) => u?.level || 1, max: 40 },
  { id: 'level_50', title: 'ملك الأنمي', req: 'الوصول للمستوى 50', rewardType: 'modPoints', rewardVal: 500, condition: (u: any) => (u?.level || 0) >= 50, progress: (u: any) => u?.level || 1, max: 50 },
  { id: 'level_60', title: 'أسطورة حية', req: 'الوصول للمستوى 60', rewardType: 'coins', rewardVal: 600, condition: (u: any) => (u?.level || 0) >= 60, progress: (u: any) => u?.level || 1, max: 60 },
  { id: 'level_70', title: 'بطل العوالم', req: 'الوصول للمستوى 70', rewardType: 'xp', rewardVal: 3000, condition: (u: any) => (u?.level || 0) >= 70, progress: (u: any) => u?.level || 1, max: 70 },
  { id: 'level_80', title: 'نصف حاكم', req: 'الوصول للمستوى 80', rewardType: 'coins', rewardVal: 1000, condition: (u: any) => (u?.level || 0) >= 80, progress: (u: any) => u?.level || 1, max: 80 },
  { id: 'level_90', title: 'حاكم الظلال', req: 'الوصول للمستوى 90', rewardType: 'modPoints', rewardVal: 1500, condition: (u: any) => (u?.level || 0) >= 90, progress: (u: any) => u?.level || 1, max: 90 },
  { id: 'level_100', title: 'إمبراطور الأنمي', req: 'الوصول للمستوى 100', rewardType: 'coins', rewardVal: 5000, condition: (u: any) => (u?.level || 0) >= 100, progress: (u: any) => u?.level || 1, max: 100 },

  { id: 'streak_3', title: 'متابع وفي', req: 'تسجيل الدخول 3 أيام متتالية', rewardType: 'coins', rewardVal: 15, condition: (u: any) => (u?.streakDays || 0) >= 3, progress: (u: any) => u?.streakDays || 0, max: 3 },
  { id: 'streak_7', title: 'شغف مستمر', req: 'تسجيل الدخول 7 أيام', rewardType: 'coins', rewardVal: 50, condition: (u: any) => (u?.streakDays || 0) >= 7, progress: (u: any) => u?.streakDays || 0, max: 7 },
  { id: 'streak_14', title: 'دائم الحضور', req: 'تسجيل الدخول 14 يوما', rewardType: 'coins', rewardVal: 100, condition: (u: any) => (u?.streakDays || 0) >= 14, progress: (u: any) => u?.streakDays || 0, max: 14 },
  { id: 'streak_30', title: 'روح الانضباط', req: 'تسجيل الدخول 30 يوما', rewardType: 'modPoints', rewardVal: 200, condition: (u: any) => (u?.streakDays || 0) >= 30, progress: (u: any) => u?.streakDays || 0, max: 30 },
  { id: 'streak_100', title: 'بطل الالتزام', req: 'تسجيل الدخول 100 يوما', rewardType: 'coins', rewardVal: 500, condition: (u: any) => (u?.streakDays || 0) >= 100, progress: (u: any) => u?.streakDays || 0, max: 100 },
  { id: 'streak_365', title: 'عام من الأنمي', req: 'تسجيل الدخول سنة كاملة', rewardType: 'coins', rewardVal: 2000, condition: (u: any) => (u?.streakDays || 0) >= 365, progress: (u: any) => u?.streakDays || 0, max: 365 },
  
  { id: 'smart_100', title: 'بداية المعرفة', req: '100 نقطة خبرة بالألعاب المصغرة', rewardType: 'xp', rewardVal: 100, condition: (u: any) => (u?.aiGamesPoints || 0) >= 100, progress: (u: any) => u?.aiGamesPoints || 0, max: 100 },
  { id: 'smart_500', title: 'ذكي', req: '500 نقطة خبرة بالألعاب المصغرة', rewardType: 'coins', rewardVal: 50, condition: (u: any) => (u?.aiGamesPoints || 0) >= 500, progress: (u: any) => u?.aiGamesPoints || 0, max: 500 },
  { id: 'smart', title: 'خبير الألعاب', req: '1000 نقطة خبرة بالألعاب المصغرة', rewardType: 'coins', rewardVal: 100, condition: (u: any) => (u?.aiGamesPoints || 0) >= 1000, progress: (u: any) => u?.aiGamesPoints || 0, max: 1000 },
  { id: 'smart_5000', title: 'عبقري', req: '5000 نقطة بالألعاب', rewardType: 'modPoints', rewardVal: 500, condition: (u: any) => (u?.aiGamesPoints || 0) >= 5000, progress: (u: any) => u?.aiGamesPoints || 0, max: 5000 },

  { id: 'comment_1', title: 'صوتك مسموع', req: 'إضافة تعليق واحد', rewardType: 'coins', rewardVal: 10, condition: (u: any) => (u?.commentsCount || 0) >= 1, progress: (u: any) => u?.commentsCount || 0, max: 1 },
  { id: 'comment_10', title: 'ناقد فني', req: 'إضافة 10 تعليقات', rewardType: 'xp', rewardVal: 200, condition: (u: any) => (u?.commentsCount || 0) >= 10, progress: (u: any) => u?.commentsCount || 0, max: 10 },
  { id: 'comment_50', title: 'صانع المحتوى', req: 'إضافة 50 تعليق', rewardType: 'modPoints', rewardVal: 200, condition: (u: any) => (u?.commentsCount || 0) >= 50, progress: (u: any) => u?.commentsCount || 0, max: 50 },
  { id: 'comment_200', title: 'صوت المجتمع', req: 'إضافة 200 تعليق', rewardType: 'coins', rewardVal: 1000, condition: (u: any) => (u?.commentsCount || 0) >= 200, progress: (u: any) => u?.commentsCount || 0, max: 200 },

  { id: 'likes_5', title: 'مشهور', req: 'الحصول على 5 إعجابات', rewardType: 'coins', rewardVal: 20, condition: (u: any) => (u?.likesReceived || 0) >= 5, progress: (u: any) => u?.likesReceived || 0, max: 5 },
  { id: 'likes_50', title: 'نجم المجتمع', req: 'الحصول على 50 إعجاب', rewardType: 'xp', rewardVal: 500, condition: (u: any) => (u?.likesReceived || 0) >= 50, progress: (u: any) => u?.likesReceived || 0, max: 50 },
  { id: 'likes_200', title: 'محبوب الجماهير', req: 'الحصول على 200 إعجاب', rewardType: 'modPoints', rewardVal: 500, condition: (u: any) => (u?.likesReceived || 0) >= 200, progress: (u: any) => u?.likesReceived || 0, max: 200 },
  
  { id: 'rec_1', title: 'مرشد', req: 'توصية مقبولة واحدة', rewardType: 'coins', rewardVal: 30, condition: (u: any) => (u?.recommendationsAccepted || 0) >= 1, progress: (u: any) => u?.recommendationsAccepted || 0, max: 1 },
  { id: 'rec_10', title: 'دليل السائلين', req: '10 توصيات مقبولة', rewardType: 'xp', rewardVal: 600, condition: (u: any) => (u?.recommendationsAccepted || 0) >= 10, progress: (u: any) => u?.recommendationsAccepted || 0, max: 10 },
  { id: 'rec_50', title: 'عراب الأنمي', req: '50 توصية مقبولة', rewardType: 'modPoints', rewardVal: 1000, condition: (u: any) => (u?.recommendationsAccepted || 0) >= 50, progress: (u: any) => u?.recommendationsAccepted || 0, max: 50 },
];

export default function RewardsView({ onBack }: { onBack: () => void }) {
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'daily_claim' | 'daily_quests' | 'season_pass' | 'achievements'>('daily_claim');
  const [claimed, setClaimed] = useState<string[]>(userData?.claimedAchievements || []);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Daily Check-In settings
  const todayStr = new Date().toISOString().split('T')[0];
  const hasClaimedCheckInToday = userData?.lastDailyClaim === todayStr;
  const currentStreak = userData?.dailyClaimStreak || 0;
  const claimStreakToShow = hasClaimedCheckInToday ? currentStreak : (currentStreak >= 7 ? 0 : currentStreak);

  const dailyCheckInRewards = [
    { day: 1, coins: 15, xp: 20, label: '١٥ كوينز' },
    { day: 2, coins: 20, xp: 40, label: '٢٠ كوينز' },
    { day: 3, coins: 30, xp: 60, label: '٣٠ كوينز' },
    { day: 4, coins: 40, xp: 100, label: '٤٠ كوينز' },
    { day: 5, coins: 50, xp: 150, label: '٥٠ كوينز' },
    { day: 6, coins: 60, xp: 200, label: '٦٠ كوينز' },
    { day: 7, coins: 120, xp: 500, label: '١٢٠ كوينز', special: true },
  ];

  // Daily Stats representation (safely initialized)
  const todayStats = userData?.dailyStats?.date === new Date().toDateString() 
    ? userData.dailyStats 
    : { xpGained: 0, gamesPlayed: 0, commentsAdded: 0, ratingsAdded: 0, episodesWatched: 0, questWatchClaimed: false, questCommentClaimed: false, questGamesClaimed: false, questRateClaimed: false };

  const dailyQuests = [
    { id: 'episodesWatched', title: 'شاهد حلقة واحدة اليوم', desc: 'شاهد أي حلقة لتطوير مستواك', max: 1, current: todayStats.episodesWatched || 0, isClaimed: todayStats.questWatchClaimed || false, rewardCoins: 15, rewardXp: 50, icon: Clock, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
    { id: 'commentsAdded', title: 'أضف تعليقًا في المجتمع', desc: 'شارك برأيك في نقاشات الحلقات والتوصيات', max: 1, current: todayStats.commentsAdded || 0, isClaimed: todayStats.questCommentClaimed || false, rewardCoins: 10, rewardXp: 30, icon: MessageSquare, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    { id: 'gamesPlayed', title: 'العب ٣ ألعاب مصغرة فريدة', desc: 'أثبت مهاراتك الفنية وتجاوز صعوبة الألعاب الكبرى', max: 3, current: todayStats.gamesPlayed || 0, isClaimed: todayStats.questGamesClaimed || false, rewardCoins: 20, rewardXp: 80, icon: Target, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    { id: 'ratingsAdded', title: 'قيم أنميًا واحدًا اليوم', desc: 'ساهم في ترشيح الأعمال المميزة للآخرين بالمنصة', max: 1, current: todayStats.ratingsAdded || 0, isClaimed: todayStats.questRateClaimed || false, rewardCoins: 10, rewardXp: 20, icon: Heart, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  ];

  // Season Pass settings based on total XP and levels
  const SEASON_MILESTONES = [
    { level: 5, title: 'قلادة الربيع الأسطورية', desc: 'شعار حصري يمكنك تجهيزه في صفحتك الشخصية', type: 'badge', assetId: 'badge_spring_pennant', claimedField: 'season_m1', rewardCoins: 100 },
    { level: 12, title: 'لقب "ملك التقييم"', desc: 'لقب مخصص ساطع يظهر بجانب اسمك للمجتمع', type: 'title', assetId: 'title_rate_king', claimedField: 'season_m2', rewardCoins: 200 },
    { level: 22, title: 'إطار هالة السايان المتوهجة', desc: 'إطار متوهج لصور الملوك يحيط بصورتك الشخصية', type: 'frame', assetId: 'frame_saiyan_aura', claimedField: 'season_m3', rewardCoins: 400 },
    { level: 35, title: 'خلوة الفضاء الكوزميك المظلم', desc: 'مظهر وخلفية مجرة كوزميك فخمة لحسابك الخاص', type: 'theme', assetId: 'theme_cosmic_space', claimedField: 'season_m4', rewardCoins: 650 },
    { level: 50, title: 'شعار أوتاكو المليار الأسطوري', desc: 'أعلى الأوسمة الممنوحة للمشاهد الأسطوري المخضرم', type: 'badge', assetId: 'badge_billion_otaku', claimedField: 'season_m5', rewardCoins: 1200 },
  ];

  const claimedSeason = userData?.claimedSeasonMilestones || [];

  const handleClaimSeasonMilestone = async (milestone: typeof SEASON_MILESTONES[0]) => {
    if (!user || claimingId === milestone.claimedField) return;
    setClaimingId(milestone.claimedField);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updateObj: any = {
        claimedSeasonMilestones: arrayUnion(milestone.claimedField),
        coins: increment(milestone.rewardCoins)
      };

      if (milestone.assetId) {
        updateObj.purchasedItems = arrayUnion(milestone.assetId);
      }

      await updateDoc(userRef, updateObj);
      await notificationsService.createUserNotification(user.uid, {
        title: '🏆 تم استلام جائزة تذكرة الموسم!',
        body: `مبروك! لقد استلمت جائزة المستوى ${milestone.level}: "${milestone.title}" وحصلت على +${milestone.rewardCoins} كوينز وتمت إضافة العنصر لممتلكاتك!`,
        type: 'tournament',
        linkTo: 'rewards'
      });
      alert(`مبروك! تم استلام الجائزة الموسمية "${milestone.title}" وحصلت على +${milestone.rewardCoins} كوينز وتمت إضافة العنصر لممتلكاتك!`);
    } catch(e) {
      console.error(e);
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaimDailyCheckIn = async () => {
    if (!user || hasClaimedCheckInToday || claimingId === 'check_in') return;
    setClaimingId('check_in');
    
    let newStreak = 1;
    const lastClaim = userData?.lastDailyClaim;
    
    if (lastClaim) {
      const lastClaimDate = new Date(lastClaim);
      const todayDate = new Date(todayStr);
      const diffTime = Math.abs(todayDate.getTime() - lastClaimDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newStreak = (currentStreak % 7) + 1;
      } else {
        newStreak = 1; // reset streak if missed a day
      }
    } else {
      newStreak = 1;
    }
    
    const reward = dailyCheckInRewards[newStreak - 1] || dailyCheckInRewards[0];
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const updateData: any = {
        lastDailyClaim: todayStr,
        dailyClaimStreak: newStreak,
        coins: increment(reward.coins)
      };

      // Add samurai title if day 7
      if (newStreak === 7) {
        updateData.purchasedItems = arrayUnion('title_daily_samurai');
      }
      
      await updateDoc(userRef, updateData);
      
      const { awardXP } = await import('../services/gamificationService');
      await awardXP(user.uid, reward.xp);
      
      await notificationsService.createUserNotification(user.uid, {
        title: '📆 تسجيل حضور يومي ناجح!',
        body: `تم استلام مكافأة اليوم ${newStreak} من حضورك المتتالي! ربحت +${reward.coins} كوينز و +${reward.xp} خبرة.`,
        type: 'system',
        linkTo: 'rewards'
      });

      alert(`تم استلام الهدية اليومية للأوتوكو بنجاح! كسبت +${reward.coins} كوينز و +${reward.xp} ونقطة خبرة.`);
    } catch(e) {
      console.error(e);
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaimDailyQuest = async (questId: string, rewardCoins: number, rewardXp: number, questKey: string) => {
    if (!user || claimingId === questId) return;
    setClaimingId(questId);
    try {
      const userRef = doc(db, 'users', user.uid);
      let claimField = '';
      if (questKey === 'episodesWatched') claimField = 'dailyStats.questWatchClaimed';
      else if (questKey === 'commentsAdded') claimField = 'dailyStats.questCommentClaimed';
      else if (questKey === 'gamesPlayed') claimField = 'dailyStats.questGamesClaimed';
      else if (questKey === 'ratingsAdded') claimField = 'dailyStats.questRateClaimed';

      const updateObj: any = {
        coins: increment(rewardCoins),
        [claimField]: true
      };
      
      await updateDoc(userRef, updateObj);
      
      const { awardXP } = await import('../services/gamificationService');
      await awardXP(user.uid, rewardXp);

      await notificationsService.createUserNotification(user.uid, {
        title: '🎯 تم إكمال المهمة اليومية!',
        body: `رائع! لقد أنجزت المهمة واستلمت مكافأتها اليومية: +${rewardCoins} كوينز و +${rewardXp} نقطة خبرة.`,
        type: 'system',
        linkTo: 'rewards'
      });

      alert(`رائع! لقد أنجزت المهمة اليومية واستلمت +${rewardCoins} كوينز و +${rewardXp} نقطة خبرة.`);
    } catch(e) {
      console.error(e);
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaim = async (ach: typeof ACHIEVEMENTS[0]) => {
    if (!user || claimingId) return;
    setClaimingId(ach.id);
    
    try {
      const p: any = {
        claimedAchievements: arrayUnion(ach.id)
      };
      if (ach.rewardType === 'coins') p.coins = increment(ach.rewardVal);
      if (ach.rewardType === 'xp') p.xp = increment(ach.rewardVal);
      if (ach.rewardType === 'modPoints') p.modPoints = increment(ach.rewardVal);

      await updateDoc(doc(db, 'users', user.uid), p);
      await notificationsService.createUserNotification(user.uid, {
        title: '🎖️ إنجاز مميز مكتمل!',
        body: `تهانينا! لقد حققت إنجاز "${ach.title}" لكسب +${ach.rewardVal} من ${ach.rewardType === 'coins' ? 'الكوينز' : ach.rewardType === 'xp' ? 'نقاط الخبرة' : 'نقاط الإشراف'}!`,
        type: 'tournament',
        linkTo: 'rewards'
      });
      setClaimed(prev => [...prev, ach.id]);
    } catch (e) {
      console.error(e);
    } finally {
      setClaimingId(null);
    }
  };

  if (!user) {
    return (
      <div className="bg-[#09090b] min-h-screen text-white flex items-center justify-center font-sans tracking-wide">
        <div className="text-center p-8 bg-[#121215] border border-white/5 rounded-3xl shadow-2xl">
           <Lock size={48} className="mx-auto mb-4 text-neutral-600" />
           <p className="text-lg font-bold text-neutral-400">يجب تسجيل الدخول لاستعراض المهام والجوائز اليومية والموسمية</p>
        </div>
      </div>
    );
  }

  const userLevel = userData?.level || 1;
  const xpNeeded = Math.floor(Math.pow(userLevel, 1.5) * 500) + 500;
  const levelProgress = Math.min(100, Math.max(0, ((userData?.xp || 0) / xpNeeded) * 100));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-[#09090b] text-white pb-24 font-sans selection:bg-yellow-500/30 font-medium"
    >
      {/* Dynamic Header */}
      <div className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-2xl border-b border-white/5 px-4 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/5 shadow-sm text-neutral-300">
            <ChevronRight size={22} />
          </button>
          <h1 className="font-black text-xl md:text-2xl flex items-center gap-2 tracking-tight">
             مكافآت الأوتوكو <span className="text-yellow-500 line-clamp-1">&amp;</span> العوالم
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-6 mt-2">
        {/* Luxury Stats Hero Card */}
        <div className="bg-gradient-to-br from-[#1a1a1e] to-[#0f0f13] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
           <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
           <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
           
           <div className="relative z-10 flex flex-col items-center justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-tr from-yellow-500 to-amber-600 rounded-full flex items-center justify-center p-0.5 shadow-[0_0_40px_rgba(234,179,8,0.3)] mb-4 shrink-0">
                  <div className="w-full h-full bg-[#0a0a0c] rounded-full flex items-center justify-center">
                    <Trophy className="text-yellow-500 -ml-1 drop-shadow-md" size={36} />
                  </div>
              </div>
              <h2 className="text-3xl font-black tracking-tight text-white">{userData?.coins || 0}</h2>
              <span className="text-xs text-yellow-500/80 font-bold tracking-wider uppercase">رصيد الكوينز الأوتاكو</span>
           </div>

           <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Zap className="text-blue-400" size={24} />
                 </div>
                 <div>
                    <span className="block text-2xl font-black text-white leading-none mb-1">{userData?.xp || 0}</span>
                    <span className="text-[10px] text-blue-400/80 font-bold uppercase tracking-wider">نقطة خبرة (XP)</span>
                 </div>
              </div>
              
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/5 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Star className="text-purple-400" size={24} />
                 </div>
                 <div>
                    <span className="block text-2xl font-black text-white leading-none mb-1">{userData?.modPoints || 0}</span>
                    <span className="text-[10px] text-purple-400/80 font-bold uppercase tracking-wider">نقاط الأنمي (Mod)</span>
                 </div>
              </div>
           </div>
           
           /* Total Episodes Watched & Completed Anime Stats */
            {/* Total Episodes Watched & Completed Anime Stats */}
            <div className="mb-4 grid grid-cols-2 gap-3 relative z-10">
               <div className="bg-black/30 rounded-2xl p-3 border border-white/5 flex items-center gap-3 font-medium">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                     <Clock size={18} />
                  </div>
                  <div>
                     <span className="block text-lg font-black text-white leading-none">{userData?.totalEpisodesWatched || 0}</span>
                     <span className="text-[10px] text-neutral-400 font-bold leading-none">حلقات شاهدتها بالكامل</span>
                  </div>
               </div>
               <div className="bg-black/30 rounded-2xl p-3 border border-white/5 flex items-center gap-3 font-medium">
                  <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                     <CheckCircle2 size={18} />
                  </div>
                  <div>
                     <span className="block text-lg font-black text-white leading-none">{userData?.completedAnimeCount || 0}</span>
                     <span className="text-[10px] text-neutral-400 font-bold leading-none">أنميات مكتملة بقائمتك</span>
                  </div>
               </div>
            </div>

            {/* Level Progress */}

            {/* Level Progress */}
           <div className="mt-6 relative z-10 bg-black/30 rounded-2xl p-4 border border-white/5">
              <div className="flex justify-between items-end mb-2">
                  <span className="text-xs text-neutral-400 font-bold">المستوى <span className="text-white text-sm">{userData?.level || 1}</span></span>
                  <span className="text-xs text-neutral-400 font-bold"><span className="text-white">{levelProgress.toFixed(0)}%</span> للمستوى التالي</span>
              </div>
              <div className="h-2.5 bg-black rounded-full overflow-hidden border border-white/5 shadow-inner relative">
                  <div className="h-full bg-gradient-to-r from-yellow-500 via-amber-400 to-orange-500 rounded-full transition-all duration-1000 w-0" style={{ width: `${levelProgress}%` }}>
                      <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-l from-white/40 to-transparent"></div>
                  </div>
              </div>
           </div>
        </div>

        {/* Tab Switcher Interface */}
        <div className="flex gap-1 overflow-x-auto hide-scrollbar bg-neutral-900/60 p-1 rounded-2xl border border-white/5">
          <button 
            onClick={() => setActiveTab('daily_claim')}
            className={`flex-1 min-w-[120px] py-3 text-xs md:text-sm font-black rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'daily_claim' ? 'bg-yellow-500 text-black shadow-md' : 'text-neutral-400 hover:text-white'}`}
          >
            <Calendar size={16} /> الهدية اليومية
          </button>
          <button 
            onClick={() => setActiveTab('daily_quests')}
            className={`flex-1 min-w-[120px] py-3 text-xs md:text-sm font-black rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'daily_quests' ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
          >
            <Target size={16} /> المهام اليومية
          </button>
          <button 
            onClick={() => setActiveTab('season_pass')}
            className={`flex-1 min-w-[120px] py-3 text-xs md:text-sm font-black rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'season_pass' ? 'bg-purple-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
          >
            <Sparkles size={16} /> الموسم الذهبي
          </button>
          <button 
            onClick={() => setActiveTab('achievements')}
            className={`flex-1 min-w-[120px] py-3 text-xs md:text-sm font-black rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'achievements' ? 'bg-amber-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
          >
            <Trophy size={16} /> الإنجازات الكبرى
          </button>
        </div>

        {/* Dynamic Display Area */}
        <div className="mt-4">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: Daily Checkin */}
            {activeTab === 'daily_claim' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
                key="daily_claim"
              >
                <div className="bg-[#121215] border border-white/5 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
                    <div>
                      <h2 className="text-lg font-black text-white flex items-center gap-2"><Gift className="text-yellow-500" /> الحضور الأسبوعي واليومي</h2>
                      <p className="text-xs text-neutral-400 mt-1">سجل دخولك يومياً دون مقاطعة لجمع كوينز مضاعفة ولقب المحارب الأخير الأسطوري!</p>
                    </div>
                    <div className="bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 text-xs text-yellow-500 font-bold">
                      <Flame size={14} className="text-orange-500 animate-pulse" /> سلسلة الحضور: {claimStreakToShow} أيام متتالية
                    </div>
                  </div>

                  {/* 7 Days Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mb-6">
                    {dailyCheckInRewards.map((rew) => {
                      const isPast = rew.day < claimStreakToShow || (rew.day === claimStreakToShow && hasClaimedCheckInToday);
                      const isCurrent = rew.day === (claimStreakToShow + 1) && !hasClaimedCheckInToday;
                      const isFuture = rew.day > (claimStreakToShow + 1) || (rew.day === (claimStreakToShow + 1) && hasClaimedCheckInToday);

                      return (
                        <div 
                          key={rew.day}
                          className={`rounded-2xl border p-4 flex flex-col items-center justify-center text-center transition-all ${
                            isPast 
                              ? 'bg-green-500/5 border-green-500/20 text-green-500 opacity-60' 
                              : isCurrent 
                                ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.1)] scale-105' 
                                : 'bg-neutral-900 border-white/5 text-neutral-400'
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase tracking-wider mb-2">اليوم {rew.day}</span>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${isPast ? 'bg-green-500/10' : isCurrent ? 'bg-yellow-500/20' : 'bg-neutral-800'}`}>
                            {isPast ? <CheckCircle2 size={20} /> : rew.special ? <Sparkles size={20} className="animate-pulse" /> : <Trophy size={18} />}
                          </div>
                          <span className="text-xs font-black block text-white">{rew.label}</span>
                          <span className="text-[9px] text-neutral-500 font-bold mt-1">+{rew.xp} XP</span>
                          
                          {rew.special && (
                            <span className="text-[8px] bg-red-500/20 text-red-400 px-1 py-0.5 rounded-sm font-bold block mt-1">
                              +لقب ساموراي
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {hasClaimedCheckInToday ? (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-500 font-bold text-center p-4 rounded-2xl flex items-center justify-center gap-2">
                      <CheckCircle2 size={18} /> لقد استلمت هدية اليوم بنجاح! عد غداً للاستمرار في السلسلة.
                    </div>
                  ) : (
                    <button
                      onClick={handleClaimDailyCheckIn}
                      disabled={claimingId === 'check_in'}
                      className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-black text-center py-4 rounded-2xl hover:from-yellow-400 hover:to-amber-500 transition-all font-bold text-sm shadow-[0_0_20px_rgba(234,179,8,0.3)] select-none cursor-pointer"
                    >
                      {claimingId === 'check_in' ? 'جاري الاستلام...' : `استلم هدية اليوم ${claimStreakToShow + 1} الأوتاكو`}
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 2: Daily Quests */}
            {activeTab === 'daily_quests' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-4"
                key="daily_quests"
              >
                <div className="bg-neutral-950 p-1 flex items-center justify-between mb-2">
                  <div className="flex flex-col">
                    <h3 className="text-lg font-black text-white">المهام اليومية السريعة</h3>
                    <p className="text-xs text-neutral-400">تتجدد المهام يومياً بالكامل لضمان تفاعل مستمر وممتع مع الأنيميات والألعاب</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {dailyQuests.map((quest) => {
                    const isCompleted = quest.current >= quest.max;
                    const canClaim = isCompleted && !quest.isClaimed;
                    const QuestIcon = quest.icon;

                    return (
                      <div 
                        key={quest.id} 
                        className={`p-5 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between transition-all relative overflow-hidden ${
                          quest.isClaimed 
                            ? 'bg-[#121215]/60 border-white/5 opacity-50' 
                            : canClaim 
                              ? 'bg-gradient-to-br from-[#121215] to-[#121c12] border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' 
                              : 'bg-[#121215] border-white/5'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${quest.color}`}>
                            {quest.isClaimed ? <CheckCircle2 size={24} className="text-green-500" /> : <QuestIcon size={24} />}
                          </div>
                          <div>
                            <h3 className={`font-black text-base ${quest.isClaimed ? 'text-neutral-500 line-through' : 'text-white'}`}>{quest.title}</h3>
                            <p className="text-xs text-neutral-400 mt-0.5">{quest.desc}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded font-black">+{quest.rewardCoins} كوينز</span>
                              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-black">+{quest.rewardXp} XP</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 md:mt-0 w-full md:w-auto flex items-center justify-between md:justify-end gap-4 shrink-0 p-3 md:p-0 bg-black/10 md:bg-transparent rounded-xl">
                          {!quest.isClaimed && (
                            <div className="flex flex-col items-start md:items-end md:mr-8">
                              <span className="text-xs font-black text-neutral-400 mb-1.5">{quest.current} / {quest.max}</span>
                              <div className="w-24 h-2 bg-black rounded-full overflow-hidden border border-white/5">
                                <div className="bg-yellow-500 h-full transition-all duration-700" style={{ width: `${Math.min(100, (quest.current / quest.max) * 100)}%` }}></div>
                              </div>
                            </div>
                          )}

                          {quest.isClaimed ? (
                            <span className="text-xs font-bold text-green-500 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl flex items-center gap-1">تمت مطالبة الجائزة <CheckCircle2 size={14}/></span>
                          ) : canClaim ? (
                            <button 
                              onClick={() => handleClaimDailyQuest(quest.id, quest.rewardCoins, quest.rewardXp, quest.id)}
                              disabled={claimingId === quest.id}
                              className="bg-gradient-to-r from-green-600 to-emerald-500 text-white text-sm font-black px-6 py-2.5 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:shadow-[0_0_20px_rgba(34,197,94,0.6)] transform hover:-translate-y-0.5 transition-all select-none cursor-pointer"
                            >
                              {claimingId === quest.id ? 'استلام...' : 'استلام المكافأة'}
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 text-neutral-600 font-bold text-sm bg-neutral-900 border border-white/5 px-4 py-2.5 rounded-xl select-none">
                              <Lock size={12} /> لم تكتمل
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* TAB 3: Season Pass */}
            {activeTab === 'season_pass' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
                key="season_pass"
              >
                <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/10 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
                  <div className="absolute -right-24 -top-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
                  <h3 className="text-white font-black text-xl mb-1 tracking-tight flex items-center gap-2"><Sparkles className="text-purple-400" /> تذكرة الموسم الذهبي (Season Pass)</h3>
                  <p className="text-xs text-neutral-300 leading-relaxed max-w-lg mt-1">تطور طوال موسم الأنمي لفتح جوائز مجانية، ألقاب حية، شعارات حساب، إطارات صور متوهجة وأكثر!</p>
                  
                  {/* Global Season Level Stats */}
                  <div className="mt-5 flex items-center justify-between bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30">
                        <Award size={20} />
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block font-bold">مستواك الموسمي الحالي</span>
                        <span className="text-sm font-black text-white">المستوى {userLevel}</span>
                      </div>
                    </div>
                    <div className="text-left font-black text-purple-400 text-sm">مستوى مجاني بالكامل</div>
                  </div>
                </div>

                <div className="space-y-4">
                  {SEASON_MILESTONES.map((ms, idx) => {
                    const isUnlocked = userLevel >= ms.level;
                    const isClaimed = claimedSeason.includes(ms.claimedField);
                    const canClaim = isUnlocked && !isClaimed;

                    return (
                      <div 
                        key={ms.claimedField}
                        className={`p-5 rounded-3xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between relative overflow-hidden ${
                          isClaimed 
                            ? 'bg-[#121215]/60 border-white/5 opacity-50' 
                            : canClaim 
                              ? 'bg-gradient-to-br from-[#121215] to-[#1a121f] border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)] scale-[1.01]' 
                              : 'bg-[#121215] border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-4 relative z-10">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                            isClaimed 
                              ? 'bg-green-500/10 text-green-500 border-green-500/10' 
                              : isUnlocked 
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                                : 'bg-[#1a1a1e] text-neutral-600 border-white/5'
                          }`}>
                            {isClaimed ? <CheckCircle2 size={24} /> : ms.type === 'badge' ? <Award size={24} /> : ms.type === 'frame' ? <Layers size={24} /> : <Compass size={24} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${isUnlocked ? 'bg-purple-500/20 text-purple-300' : 'bg-neutral-800 text-neutral-500'}`}>المستوى {ms.level}</span>
                              <h3 className={`font-black text-base ${isClaimed ? 'text-neutral-500 line-through' : 'text-white'}`}>{ms.title}</h3>
                            </div>
                            <p className="text-xs text-neutral-400 mt-0.5">{ms.desc}</p>
                            <span className="text-[10px] text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 rounded-md block mt-2 w-fit font-black">+{ms.rewardCoins} كوينز</span>
                          </div>
                        </div>

                        <div className="mt-4 md:mt-0 w-full md:w-auto shrink-0 relative z-10 flex">
                          {isClaimed ? (
                            <span className="text-xs font-bold text-green-500 bg-green-500/10 border border-green-500/20 px-4 py-2.5 rounded-xl flex items-center gap-1">تم إضافتها لممتلكاتك <CheckCircle2 size={14}/></span>
                          ) : canClaim ? (
                            <button
                              onClick={() => handleClaimSeasonMilestone(ms)}
                              disabled={claimingId === ms.claimedField}
                              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-black px-6 py-2.5 rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] select-none cursor-pointer"
                            >
                              {claimingId === ms.claimedField ? 'استلام...' : 'مطالبة وتملّك الآن'}
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 text-neutral-600 font-bold text-sm bg-[#1a1a1e] px-4 py-2.5 rounded-xl border border-white/5 select-none md:ml-4">
                              <Lock size={12} /> الوصول للمستوى {ms.level} للفتح
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* TAB 4: Epic Achievements */}
            {activeTab === 'achievements' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-4"
                key="achievements"
              >
                <div className="flex items-center justify-between mb-5">
                   <div className="flex flex-col">
                     <h2 className="text-lg font-black text-white flex items-center gap-2">الإنجازات الكبرى وعوالم التحدي</h2>
                     <p className="text-xs text-neutral-400">إنجازات لا تنتهي تكافئك طوال رحلة متابعتك للأنمي ونشاطك العام بالمنصة</p>
                   </div>
                   <div className="px-3 py-1.5 bg-white/5 rounded-full border border-white/10 text-xs font-bold text-neutral-400 shrink-0">
                     {claimed.length} / {ACHIEVEMENTS.length} مكتمل
                   </div>
                </div>

                <div className="space-y-4">
                  {ACHIEVEMENTS.map((ach, idx) => {
                    const isClaimed = claimed.includes(ach.id);
                    const isUnlocked = ach.condition(userData);
                    const RewardIcon = ach.rewardType === 'coins' ? Trophy : ach.rewardType === 'xp' ? Zap : Star;
                    const rewardColor = ach.rewardType === 'coins' ? 'text-yellow-500 bg-yellow-500/10' : ach.rewardType === 'xp' ? 'text-blue-400 bg-blue-500/10' : 'text-purple-400 bg-purple-500/10';
                    const currentProgress = Math.min(ach.max, ach.progress(userData));
                    const progressPct = (currentProgress / ach.max) * 100;

                    return (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(10, idx) * 0.05 }}
                        key={ach.id} 
                        className={`relative overflow-hidden bg-[#121215] border ${isClaimed ? 'border-green-500/20' : isUnlocked ? 'border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'border-white/5'} rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between transition-all duration-300 gap-4 group`}
                      >
                        {isClaimed && <div className="absolute inset-0 bg-green-500/5 pointer-events-none"></div>}
                        
                        <div className="flex items-start md:items-center gap-4 relative z-10 w-full md:w-auto">
                          <div className={`shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${isClaimed ? 'bg-green-500/10 text-green-500 border border-green-500/20' : isUnlocked ? 'bg-gradient-to-br from-yellow-500/20 to-amber-600/20 text-yellow-500 border border-yellow-500/30' : 'bg-[#1a1a1e] text-neutral-600 border border-white/5'}`}>
                            {isClaimed ? <CheckCircle2 size={32} /> : ach.rewardType === 'coins' ? <Trophy size={32} /> : ach.rewardType === 'xp' ? <Zap size={32} /> : <Target size={32} />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                               <h3 className={`font-black text-base md:text-lg tracking-tight ${isClaimed ? 'text-green-400' : isUnlocked ? 'text-white' : 'text-neutral-300'}`}>{ach.title}</h3>
                               {isClaimed && <span className="text-[9px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider hidden sm:block">مكتمل</span>}
                            </div>
                            <p className="text-xs text-neutral-500 font-medium">{ach.req}</p>
                            
                            {!isClaimed && (
                              <div className="mt-3">
                                 <div className="flex items-center justify-between mb-1.5 opacity-80">
                                   <span className="text-[10px] text-neutral-400 font-bold">{currentProgress} / {ach.max}</span>
                                   <span className="text-[10px] text-neutral-400 font-bold">{progressPct.toFixed(0)}%</span>
                                 </div>
                                 <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                                    <div className={`h-full rounded-full transition-all duration-700 ${isUnlocked ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ width: `${progressPct}%` }}></div>
                                 </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 relative z-10 shrink-0 w-full md:w-auto p-3 md:p-0 bg-black/20 md:bg-transparent rounded-xl border border-white/5 md:border-none">
                          <div className={`flex items-center gap-1.5 font-bold text-sm px-3 py-1.5 rounded-lg ${rewardColor} border border-current/10 shadow-sm`}>
                            +{ach.rewardVal} <RewardIcon size={16} />
                          </div>
                          {isClaimed ? (
                            <div className="flex items-center gap-1.5 text-green-500 font-bold text-sm">
                               تم الاستلام <CheckCircle2 size={16} />
                            </div>
                          ) : isUnlocked ? (
                            <button 
                              disabled={claimingId === ach.id}
                              onClick={() => handleClaim(ach)}
                              className="bg-gradient-to-r from-yellow-500 to-amber-600 text-black text-sm font-black px-6 py-2 rounded-xl hover:from-yellow-400 hover:to-amber-500 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_25px_rgba(234,179,8,0.5)] transform hover:-translate-y-0.5 border border-yellow-400/50 cursor-pointer select-none"
                            >
                              {claimingId === ach.id ? 'استلام...' : 'استلام المكافأة'}
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 text-neutral-600 font-bold text-sm bg-[#1a1a1e] px-4 py-2 rounded-xl border border-white/5 select-none">
                              <Lock size={14} /> مقفلة
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
