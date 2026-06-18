import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ChevronRight, Gamepad2, Trophy, Brain, Zap, Search, Eye, Users, 
  SearchX, Quote, Clock, Dices, ShoppingCart, Target, CheckCircle2, 
  User, Calculator, Sword, Lock, Sparkles, Flame, Shield, HelpCircle, 
  Coins, Star, Award, ChevronDown, Play, AlertCircle, RefreshCw, X,
  Database, Bell, Info
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { awardXP } from '../services/gamificationService';
import PixelGuessGame from '../components/games/PixelGuessGame';
import WhoSaidGame from '../components/games/WhoSaidGame';
import EmojiCharadesGame from '../components/games/EmojiCharadesGame';
import SpeedTriviaGame from '../components/games/SpeedTriviaGame';
import ImposterGame from '../components/games/ImposterGame';
import TierBattleGame from '../components/games/TierBattleGame';
import MemoryGame from '../components/games/MemoryGame';
import PowerLevelGame from '../components/games/PowerLevelGame';
import OpeningLyricsGame from '../components/games/OpeningLyricsGame';
import TimelineGame from '../components/games/TimelineGame';
import SilhouetteGame from '../components/games/SilhouetteGame';
import AnimeMathGame from '../components/games/AnimeMathGame';
import WeaponMatchGame from '../components/games/WeaponMatchGame';
import AnimeTriviaGame from '../components/games/AnimeTriviaGame';
import DailySpin from '../components/DailySpin';
import QuestionContributionForm from '../components/QuestionContributionForm';
import { doc, updateDoc, increment, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { submitCustomQuestion } from '../services/gamesDatabaseService';

interface AIGamesViewProps {
  onBack: () => void;
  onNavigateToLeaderboard?: () => void;
  onNavigateToStore?: () => void;
  onNavigateToRewards?: () => void;
}

// 6 Ranks based on aiGamesPoints
const getGameRankInfo = (points: number) => {
  if (points >= 5000) return { title: 'الهوكاجي الأعظم 👑', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30', desc: 'أعلى رتبة في عالم الألعاب وأشد الأوتوكو فطانة.' };
  if (points >= 2500) return { title: 'ملك القراصنة الفكري ⚓', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', desc: 'عثر على كنز المعرفة الكامل، ويهابه جميع المنافسين.' };
  if (points >= 1000) return { title: 'سياف الغسق الأسطوري ⚔️', color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/30', desc: 'سياف يقسم التحديات بضربة ذكاء واحدة من غلاف ليله.' };
  if (points >= 500) return { title: 'صياد العمالقة الباسل 🏹', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', desc: 'يصطاد الألغاز الشاهقة بيقظة شديدة وسرعة خارقة.' };
  if (points >= 200) return { title: 'رتبة النينجا الجونين 🍃', color: 'text-emerald-550', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', desc: 'أتقن عناصر المعرفة ونال اعتراف حكماء القرية.' };
  return { title: 'مبتدئ أكاديمية النينجا 🔰', color: 'text-neutral-400', bg: 'bg-neutral-500/10', border: 'border-neutral-500/20', desc: 'في بداية العهد والمسار الفتي لاكتساب ألقاب المعمورة.' };
};

// Boss list for Daily RPG Raid
const BOSSES = [
  { id: 'madara', name: 'مادارا أوتشيها (الطور الإلهي) 🔥', hp: 500, avatar: '👺', desc: 'كيف ستواجه السوسانو المطلق وتساقط النيازك؟', rewardCoins: 35, rewardXp: 120, color: 'text-red-500', bg: 'from-red-950/40 via-black to-black', border: 'border-red-500/30' },
  { id: 'kaido', name: 'كايدو ملك الوحوش 🐉', hp: 600, avatar: '👹', desc: 'أقوى كائن حي على وجه الأرض بنيران تنينه المدمرة!', rewardCoins: 45, rewardXp: 150, color: 'text-amber-500', bg: 'from-amber-950/40 via-black to-black', border: 'border-amber-500/30' },
  { id: 'sukuna', name: 'ريومن سوكونا (ملك اللعنات) 💀', hp: 550, avatar: '🧬', desc: 'توسع مجالك الإقليمي أو اسحق تحت طيات لعناته وغليانه!', rewardCoins: 40, rewardXp: 135, color: 'text-purple-500', bg: 'from-purple-950/40 via-black to-black', border: 'border-purple-500/30' },
];

const BOSS_QUESTIONS = [
  { q: 'من هو مبتكر تقنية الراسينغان في أنمي ناروتو؟', options: ['كاشي', 'ميناتو', 'جيرايا', 'ناروتو'], correct: 1 },
  { q: 'ما هو اسم جزيرة رافتيل الحقيقي كما تم كشفه في ون بيس؟', options: ['لافتيل', 'ماريجوا', 'لوج تاون', 'إلباف'], correct: 0 },
  { q: 'في أنمي هجوم العمالقة، من هو حامل العملاق المطرقة الحربية قبل موته؟', options: ['إيرين', 'يارا تيبور', 'ويلي تيبور', 'لارا تيبور'], correct: 3 },
  { q: 'أي فريق يقوده ليفاي بالكامل في فيلق الاستطلاع؟', options: ['فريق الدعم', 'فريق النخبة والعمليات الخاصة', 'فرقة الخط الهجومي الأول', 'فرقة التدريب والدعم'], correct: 1 },
  { q: 'ما هو اسم السيف الخاص بالبطل رورونوا زورو والمصنف كـ أوه-وازامونو غمد أسود؟', options: ['وادو إيتشيمونجي', 'شوشوي', 'ساندائي كيتيتسو', 'إنما'], correct: 1 },
  { q: 'من هو الأقوى المرتبة صفر في منظمة الإيسبادا بأنمي بليتش؟', options: ['أولكيورا', 'يامى رياجو', 'ستارك', 'باراغان'], correct: 1 },
  { q: 'في جوجوتسو كايسن، ما هو اسم المجال الخاص بجوجو ساتورو؟', options: ['الفراغ اللانهائي', 'ضريح السوء', 'حديقة الظل', 'نعش جبل الحديد'], correct: 0 },
  { q: 'ما هو الاسم الحقيقي للبطل إل (L) في أنمي ديث نوت؟', options: ['إل ريوزاكي', 'إل لولايت', 'إل لوليت', 'نات ريفر'], correct: 2 },
  { q: 'كم عدد النجوم الموجودة في كرة التنين الأساسية التي يحملها غوكو؟', options: ['نجمتان', 'أربع نجوم', 'سبعة نجوم', 'نجمة واحدة'], correct: 1 },
  { q: 'في هنتر x هنتر، ما هو نوع نين الشخصية كورابيكا عندما تصبح عيناه قرمزية؟', options: ['تجسيد', 'تحويل', 'متخصص', 'تلاعب'], correct: 2 }
];

interface GameNotification {
  id: string;
  title: string;
  body: string;
  category: 'weekly_challenge' | 'level_renewal' | 'achievement' | 'rewards';
  isRead: boolean;
  time: string;
  actionLabel?: string;
  rewardCoins?: number;
  rewardXp?: number;
  isClaimed?: boolean;
}

export default function AIGamesView({ onBack, onNavigateToLeaderboard, onNavigateToStore, onNavigateToRewards }: AIGamesViewProps) {
  const { userData, user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'lobby' | 'game'>('lobby');
  const [lobbySubTab, setLobbySubTab] = useState<'games' | 'perks' | 'profiles' | 'bank'>('games');
  
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [showSpin, setShowSpin] = useState(false);
  
  // Local Notifications Engine States
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [activeToast, setActiveToast] = useState<{title: string, body: string} | null>(null);

  // Initialize notifications
  useEffect(() => {
    const saved = localStorage.getItem('games_local_notifications');
    if (saved) {
      setNotifications(JSON.parse(saved));
    } else {
      const defaults: GameNotification[] = [
        {
          id: 'notif_weekly_challenge',
          title: '🔥 فعاليات التحدي الأسبوعي: ذكاء قادة الفيلق',
          body: 'انطلق الآن تحدي المعرفة الأسبوعي الكبير! أجب عن أسئلة قاطعي العمالقة وقادة الاستطلاع اليوم لمضاعفة نقاط كسب الكوينز x2 بالكامل والارتقاء السريع.',
          category: 'weekly_challenge',
          isRead: false,
          time: 'منذ دقيقة واحدة',
          actionLabel: 'تنشيط التحدي 🗡️'
        },
        {
          id: 'notif_level_renewal',
          title: '🆙 تجديد وصيانة مستويات وألغاز الألعاب',
          body: 'بشرى سارة! تمت تصفية وتحديث صومعة الأسئلة وتنزيل 50 لغزاً جديداً ممتداً عبر سائر الألعاب المصغرة لتخطي الروتين واكتساب هيبة معرفية مضاعفة.',
          category: 'level_renewal',
          isRead: false,
          time: 'منذ ساعة',
          actionLabel: 'تصفح قائمة الألعاب'
        },
        {
          id: 'notif_weekly_box',
          title: '🎁 هدية تجديد وصيانة المحتوى المعرفي',
          body: 'تقديراً لمثابرتك في اللعب وبسط نفوذك بالأكاديمية؛ استلم صندوق الهدايا الأسبوعي المجاني الذي يشتمل على كوينز وتطوير الخبرة الفورية!',
          category: 'rewards',
          isRead: false,
          time: 'منذ ساعتين',
          actionLabel: 'مطالبة بالهدية الكبرى 🪙',
          rewardCoins: 50,
          rewardXp: 150,
          isClaimed: false
        }
      ];
      setNotifications(defaults);
      localStorage.setItem('games_local_notifications', JSON.stringify(defaults));
    }
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    setNotifications(updated);
    localStorage.setItem('games_local_notifications', JSON.stringify(updated));
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    setNotifications(updated);
    localStorage.setItem('games_local_notifications', JSON.stringify(updated));
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    localStorage.setItem('games_local_notifications', JSON.stringify(updated));
  };

  // Helper trigger dynamically to inject simulated alert for testing
  const handleSimulateNotification = (type: 'weekly' | 'renewal' | 'boss') => {
    let newNotif: GameNotification;
    if (type === 'weekly') {
      newNotif = {
        id: `notif_sim_${Date.now()}`,
        title: '🔥 تحدي الأسبوع الجديد: نينجا كونوها الغامض',
        body: 'تم تجديد تحدي الأسبوع الآن! اختبر جودتك وخططك السرية لمعلومات قرية الأوراق المخفية واحصل على مكافأة مضاعفة x2 للخبرة والكوينز.',
        category: 'weekly_challenge',
        isRead: false,
        time: 'الآن',
        actionLabel: 'تنشيط التحدي 🗡️'
      };
    } else if (type === 'renewal') {
      newNotif = {
        id: `notif_sim_${Date.now()}`,
        title: '🆙 تجديد فوري لـ مستويات المعركة وغرف اللعب',
        body: 'قام الحكماء والمنسقون بتجديد كامل لجميع الألغاز ومسائل الرياضيات المعقدة وأغاني البداية في بنك الألعاب!',
        category: 'level_renewal',
        isRead: false,
        time: 'الآن',
        actionLabel: 'عرض صالة الألعاب 🎮'
      };
    } else {
      newNotif = {
        id: `notif_sim_${Date.now()}`,
        title: '☠️ غارة غضب من الزعيم الأسطوري مادارا أوتشيها',
        body: 'انبثقت للتو غارة زعيم جديدة ومرعبة بالساحة المعرفية الكبرى! كابد نيران السوسانو واصطحب فريقك للقتال الآن.',
        category: 'weekly_challenge',
        isRead: false,
        time: 'الآن',
        actionLabel: 'مواجهة الزعيم ⚔️'
      };
    }

    const updated = [newNotif, ...notifications];
    setNotifications(updated);
    localStorage.setItem('games_local_notifications', JSON.stringify(updated));
    
    // Set active toast to pop up immediately!
    setActiveToast({ title: newNotif.title, body: newNotif.body });
    setTimeout(() => {
      setActiveToast(null);
    }, 4500);
  };

  const handleClaimNotifReward = async (id: string, coins?: number, xp?: number) => {
    if (!user) {
      alert('الرجاء تسجيل الدخول أولاً للحصول على المكافأة وحفظها بسجل حسابك!');
      return;
    }
    try {
      const targetNotif = notifications.find(n => n.id === id);
      if (!targetNotif || targetNotif.isClaimed) return;

      const updates: any = {};
      if (coins) updates.coins = increment(coins);
      
      await updateDoc(doc(db, 'users', user.id), updates);
      if (xp) {
        await awardXP(user.id, xp);
      }

      const updated = notifications.map(n => n.id === id ? { ...n, isRead: true, isClaimed: true } : n);
      setNotifications(updated);
      localStorage.setItem('games_local_notifications', JSON.stringify(updated));
      alert(`🎉 تهانينا! لقد حصلت على +${coins || 0} كوينز و +${xp || 0} XP بنجاح.`);
    } catch (error: any) {
      console.error(error);
      alert(`حدث خطأ أثناء استبيان المطلب: ${error.message}`);
    }
  };
  
  // High score leaderboard state
  const [gameLeaders, setGameLeaders] = useState<any[]>([]);
  const [leadersLoading, setLeadersLoading] = useState(false);
  
  // Boss Fight RPG State
  const [showBossBattle, setShowBossBattle] = useState(false);
  const [bossHp, setBossHp] = useState(100);
  const [playerHp, setPlayerHp] = useState(100);
  const [bossRoundIndex, setBossRoundIndex] = useState(0);
  const [battleMessage, setBattleMessage] = useState('');
  const [showBattleEnd, setShowBattleEnd] = useState<'win' | 'lost' | null>(null);
  
  const userLevel = userData?.level || 1;
  const userCoins = userData?.coins || 0;
  const userGamePoints = userData?.aiGamesPoints || 0;
  const userBoosters = userData?.boosters || { skip: 0, reveal: 0, double: 0 };
  
  // Automatic scaling of difficulty
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>(() => {
    if (userLevel <= 10) return 'easy';
    if (userLevel <= 30) return 'normal';
    return 'hard';
  });

  // Contribution Form State
  const [contribType, setContribType] = useState<'quotes' | 'trivia' | 'math'>('quotes');
  const [contribText, setContribText] = useState('');
  const [contribAnime, setContribAnime] = useState('');
  const [contribOptions, setContribOptions] = useState<string[]>(['', '', '', '']);
  const [contribCorrect, setContribCorrect] = useState<number>(0);
  const [contribIsTrue, setContribIsTrue] = useState<boolean>(true);
  const [contribExplanation, setContribExplanation] = useState('');
  const [contribLoading, setContribLoading] = useState(false);

  const handleSubmitContribution = async () => {
    if (!user || !userData) {
      alert('الرجاء تسجيل الدخول أولاً للإسهام وسحب المكافآت!');
      return;
    }
    
    // Validate
    if (contribType === 'quotes') {
      if (!contribText.trim()) {
        alert('الرجاء إدخال نص الاقتباس!');
        return;
      }
      if (contribOptions.some((o) => !o.trim())) {
        alert('الرجاء تعبئة جميع الخيارات الأربعة!');
        return;
      }
    } else if (contribType === 'trivia') {
      if (!contribText.trim() || !contribExplanation.trim()) {
        alert('الرجاء تعبئة نص المعلومة والتعليل التوضيحي!');
        return;
      }
    } else if (contribType === 'math') {
      if (!contribText.trim()) {
        alert('الرجاء إدخال المسألة الحسابية!');
        return;
      }
      if (contribOptions.some((o) => !o.trim() || isNaN(Number(o)))) {
        alert('الرجاء إدخال خيارات رقمية صالحة لمسألة الحساب!');
        return;
      }
    }

    setContribLoading(true);
    try {
      let qData: any = {};
      if (contribType === 'quotes') {
        qData = {
          text: contribText,
          anime: contribAnime || 'غير معروف',
          options: contribOptions,
          correct: Number(contribCorrect)
        };
      } else if (contribType === 'trivia') {
        qData = {
          text: contribText,
          isTrue: contribIsTrue,
          explanation: contribExplanation
        };
      } else if (contribType === 'math') {
        qData = {
          text: contribText,
          options: contribOptions.map(Number),
          correct: Number(contribCorrect)
        };
      }

      const success = await submitCustomQuestion(
        contribType,
        qData,
        user.id,
        userData.displayName || 'أوتاكو مساهم'
      );

      if (success) {
        alert('تم إرسال سؤالك كإسهام ذكي للذخيرة الكبرى! حصلت على ١٥ كوينز، ٣٠ XP، و٥ نقاط إشراف!');
        // Reset form
        setContribText('');
        setContribAnime('');
        setContribOptions(['', '', '', '']);
        setContribCorrect(0);
        setContribIsTrue(true);
        setContribExplanation('');
      } else {
        alert('حدث خطأ أثناء حفظ السؤال. المرجو المحاولة ثانية.');
      }
    } catch(err) {
      console.error(err);
      alert('خطأ غير متوقع.');
    } finally {
      setContribLoading(false);
    }
  };

  useEffect(() => {
    if (userLevel <= 10) {
      setDifficulty('easy');
    } else if (userLevel <= 30) {
      setDifficulty('normal');
    } else {
      setDifficulty('hard');
    }
  }, [userLevel]);

  // Fetch games leaders dynamically
  const fetchGameLeaders = async () => {
    setLeadersLoading(true);
    try {
      const q = query(
        collection(db, 'users'), 
        orderBy('aiGamesPoints', 'desc'), 
        limit(6)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGameLeaders(list.filter((u: any) => (u.aiGamesPoints || 0) > 0));
    } catch (e) {
      console.error(e);
    } finally {
      setLeadersLoading(false);
    }
  };

  useEffect(() => {
    if (lobbySubTab === 'perks' || lobbySubTab === 'profiles') {
      fetchGameLeaders();
    }
  }, [lobbySubTab]);

  const gamesList = [
    { id: 'trivia', title: 'الألغاز الثقافية للأنمي', desc: 'اختبر ثقافتك في عالم الأنمي الشاسع واكسب كوينز ونقاط خبرة كاملة', icon: HelpCircle, color: 'text-pink-500', bg: 'bg-pink-500/20', minLevel: 1 },
    { id: 'pixel_guess', title: 'تخمين من صورة مموهة', desc: 'خمن الأنمي من صورة مغبشة ومموهة ذكائياً', icon: Eye, color: 'text-blue-500', bg: 'bg-blue-500/20', minLevel: 1 },
    { id: 'who_said', title: 'من القائل الخارق؟', desc: 'تخمين بطل وعالم الشخصية من الاقتباس المأثور', icon: Quote, color: 'text-purple-500', bg: 'bg-purple-500/20', minLevel: 3 },
    { id: 'silhouette', title: 'خمن من الظل المغلق', desc: 'خمن الشخصية الشهيرة من ظلها الأسود الغامض والذكي', icon: User, color: 'text-amber-500', bg: 'bg-amber-500/20', minLevel: 5 },
    { id: 'emoji_charades', title: 'ترميز وتخمين الإيموجي', desc: 'اكتشف الأنمي السري من شفرات الإيموجي المحيرة', icon: Search, color: 'text-green-500', bg: 'bg-green-500/20', minLevel: 8 },
    { id: 'speed_trivia', title: 'غارة سرعة البديهة الخارقة', desc: 'أجب بصح أم خطأ تحت تأثير عد عكسي سريع وخاطف', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/20', minLevel: 12 },
    { id: 'imposter', title: 'اكتشف الدخيل المشبوه', desc: 'أي من الشخصيات المذكورة لا ينتمي مطلقاً لهذا الأنمي؟', icon: SearchX, color: 'text-red-500', bg: 'bg-red-500/20', minLevel: 15 },
    { id: 'anime_math', title: 'رياضيات الأنمي المعقدة', desc: 'حل المسائل والمعدلات والجمع المشتق من شؤون الأنمي', icon: Calculator, color: 'text-emerald-500', bg: 'bg-emerald-500/20', minLevel: 20 },
    { id: 'tier_battle', title: 'معركة التقييمات والأبعاد', desc: 'أيهما يحمل ثقلاً وتقييماً عالمياً أعلى بين المتابعين؟', icon: Trophy, color: 'text-orange-500', bg: 'bg-orange-500/20', minLevel: 25 },
    { id: 'weapon_match', title: 'مبارزة الأسلحة وطاقتها', desc: 'طابق السيف الأسطوري الملحمي أو الإمساك بقدرة صاحبه', icon: Sword, color: 'text-red-600', bg: 'bg-red-600/20', minLevel: 30 },
    { id: 'memory', title: 'ملاحظة عين الشارينغان', desc: 'اختبر قوة تخزين الذاكرة البصرية والملاحظة لألوان الهالة', icon: Brain, color: 'text-indigo-500', bg: 'bg-indigo-500/20', minLevel: 35 },
    { id: 'power_level', title: 'من الحاسم الأقوى بطلاً؟', desc: 'صوت وقارن مستويات القوى الحقيقية في قتالات الأوتوكو', icon: Users, color: 'text-rose-500', bg: 'bg-rose-500/20', minLevel: 40 },
    { id: 'opening_lyrics', title: 'أشعار موسيقية ونغمية', desc: 'تخمين الأوست الشجي وأغاني البداية من نصوص ترجمتها', icon: Dices, color: 'text-cyan-500', bg: 'bg-cyan-500/20', minLevel: 45 },
    { id: 'timeline', title: 'ترتيب حقبة الأحداث زمنيًا', desc: 'رتب معارك وأحداث المانغا والأنمي تتابعياً للقصة', icon: Clock, color: 'text-teal-500', bg: 'bg-teal-500/20', minLevel: 50 },
  ];

  // System points handler
  const handleScoreUpdate = async (pointsAdded: number) => {
    if (!user) return;
    try {
      const multiplier = difficulty === 'hard' ? 2 : difficulty === 'easy' ? 0.5 : 1;
      let finalPoints = Math.ceil(pointsAdded * multiplier);
      
      // Double XP Powerup boost logic
      let wasMultiplierCardConsumed = false;
      if (userBoosters.double > 0) {
        finalPoints *= 2;
        wasMultiplierCardConsumed = true;
      }

      const coinsAdded = Math.max(1, Math.floor(finalPoints / 5));
      const today = new Date().toDateString();
      const currentStats = userData?.dailyStats?.date === today 
        ? { ...userData.dailyStats } 
        : { date: today, xpGained: 0, gamesPlayed: 0, quest1Claimed: false, quest2Claimed: false };
      
      currentStats.gamesPlayed += 1;

      const updateObj: any = {
        aiGamesPoints: increment(finalPoints),
        coins: increment(coinsAdded),
        dailyStats: currentStats
      };

      if (wasMultiplierCardConsumed) {
        updateObj.boosters = {
          ...userBoosters,
          double: Math.max(0, userBoosters.double - 1)
        };
      }

      await updateDoc(doc(db, 'users', user.id), updateObj);
      await awardXP(user.id, finalPoints);
    } catch (e) {
      console.error(e);
    }
  };

  // Booster Shop actions
  const handleBuyBooster = async (type: 'skip' | 'reveal' | 'double', price: number) => {
    if (!user || !userData) return;
    if (userCoins < price) {
      alert("الكوينز المتوفرة لديك غير كافية لإتمام الشراء! خض ساحات الألعاب واكسب المزيد.");
      return;
    }
    try {
      const current = userData.boosters || { skip: 0, reveal: 0, double: 0 };
      const updatedBoosters = {
        ...current,
        [type]: (current[type] || 0) + 1
      };

      await updateDoc(doc(db, 'users', user.id), {
        coins: increment(-price),
        boosters: updatedBoosters
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleClaimQuest = async (questNum: number, rewardCoins: number) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.id), {
        coins: increment(rewardCoins),
        [`dailyStats.quest${questNum}Claimed`]: true
      });
    } catch(e) { console.error(e); }
  };

  // Active Daily RPG Boss Fight setup
  const activeBoss = useMemo(() => {
    const day = new Date().getDate();
    return BOSSES[day % BOSSES.length];
  }, []);

  const hasFoughtBossToday = userData?.lastBossDefeatDate === new Date().toDateString();

  const startRaidFight = () => {
    if (userData?.isGamesRestricted) {
      alert('عذراً! تم حظر وصولك إلى ألعاب وفعاليات الأكاديمية بواسطة إدارة المنصة! 🎮🛑');
      return;
    }
    if (hasFoughtBossToday) {
      alert("قد نلت مأربك وقهرت زعيم اليوم! عد مجدداً في الغد لمواجهة رعب آخر.");
      return;
    }
    setBossHp(activeBoss.hp);
    setPlayerHp(150);
    setBossRoundIndex(0);
    setBattleMessage('تتقدم لساحة المعركة الكبرى.. زعيم اليوم يتحداك بوطأته!');
    setShowBattleEnd(null);
    setShowBossBattle(true);
  };

  const handleBossAnswer = (selectedOptionIndex: number) => {
    const currentQuestion = BOSS_QUESTIONS[bossRoundIndex % BOSS_QUESTIONS.length];
    const isCorrect = selectedOptionIndex === currentQuestion.correct;

    if (isCorrect) {
      const dmg = 150;
      const nextHp = Math.max(0, bossHp - dmg);
      setBossHp(nextHp);
      setBattleMessage(`إجابة ساحقة! وجهت ضربة طاقة نيران بقيمة ${dmg} نقطة ضرر للزعيم!`);
      
      if (nextHp <= 0) {
        handleWinRaid();
      } else {
        setBossRoundIndex(p => p + 1);
      }
    } else {
      const bossDmg = 40;
      const nextPlayerHp = Math.max(0, playerHp - bossDmg);
      setPlayerHp(nextPlayerHp);
      setBattleMessage(`أخطأت! صد الزعيم ضربتك وعاد بهجوم عكسي مروع سلب منك ${bossDmg} نقطة حياة!`);

      if (nextPlayerHp <= 0) {
        setShowBattleEnd('lost');
      } else {
        setBossRoundIndex(p => p + 1);
      }
    }
  };

  const useRaidBooster = async (boosterType: 'skip' | 'reveal') => {
    if (!user || !userData) return;
    const count = userBoosters[boosterType] || 0;
    if (count <= 0) {
      alert("ليس لديك شحنات من هذا المعزز في حقيبتك! يمكنك شراؤه من متجر التعزيزات.");
      return;
    }

    try {
      const updatedBoosters = {
        ...userBoosters,
        [boosterType]: count - 1
      };

      await updateDoc(doc(db, 'users', user.id), {
        boosters: updatedBoosters
      });

      if (boosterType === 'skip') {
        const dmg = 100;
        const nextHp = Math.max(0, bossHp - dmg);
        setBossHp(nextHp);
        setBattleMessage('تم استخدام بطاقة تخطي السؤال! تفاديت الخطر ولحقت 100 ضرر بالزعيم تلقائياً!');
        
        if (nextHp <= 0) {
          handleWinRaid();
        } else {
          setBossRoundIndex(p => p + 1);
        }
      } else if (boosterType === 'reveal') {
        // Find indices that are WRONG to help the user
        const currentQuestion = BOSS_QUESTIONS[bossRoundIndex % BOSS_QUESTIONS.length];
        const correctIdx = currentQuestion.correct;
        const wrongIdxs = [0, 1, 2, 3].filter(i => i !== correctIdx);
        const randomWrongToKeep = wrongIdxs[Math.floor(Math.random() * wrongIdxs.length)];
        
        setBattleMessage(`تم استخدام حكمة النينجا! الإجابة الصحيحة هي إما: [${currentQuestion.options[correctIdx]}] أو [${currentQuestion.options[randomWrongToKeep]}]`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleWinRaid = async () => {
    if (!user) return;
    setShowBattleEnd('win');
    try {
      await updateDoc(doc(db, 'users', user.id), {
        coins: increment(activeBoss.rewardCoins),
        lastBossDefeatDate: new Date().toDateString()
      });
      await awardXP(user.id, activeBoss.rewardXp);
    } catch (e) {
      console.error(e);
    }
  };

  const currentLevel = userData?.level || 1;
  const xpNeeded = Math.floor(Math.pow(currentLevel, 1.5) * 500) + 500;
  const currentLevelProgress = Math.min(100, Math.max(0, ((userData?.xp || 0) / xpNeeded) * 100));
  
  const purchasedItems = userData?.purchasedItems || [];
  const hasSharinganTheme = purchasedItems.includes('theme_sharingan');
  const hasGoldFrame = purchasedItems.includes('frame_gold');

  const todayStats = userData?.dailyStats?.date === new Date().toDateString() 
    ? userData.dailyStats 
    : { xpGained: 0, gamesPlayed: 0, quest1Claimed: false, quest2Claimed: false };
  const q1Progress = Math.min((todayStats.gamesPlayed || 0), 3);
  const q2Progress = Math.min((todayStats.xpGained || 0), 50);

  const activeRank = getGameRankInfo(userGamePoints);

  if (activeTab === 'game' && selectedGame) {
    const gameInfo = gamesList.find(g => g.id === selectedGame);
    return (
      <div className={`min-h-screen flex flex-col pt-12 md:pt-4 ${hasSharinganTheme ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/40 via-black to-black' : 'bg-[#09090b]'} font-sans text-right`} dir="rtl">
         <div className="flex items-center gap-3 p-4 sticky top-0 bg-[#09090b]/80 backdrop-blur-2xl z-10 border-b border-white/5 shadow-lg">
           <button onClick={() => { setActiveTab('lobby'); setSelectedGame(null); }} className="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/5 text-white shadow-sm">
             <ChevronRight size={22} className="rotate-180" />
           </button>
           <div className="flex flex-col flex-1 text-right">
             <h1 className="text-white font-black text-lg sm:text-l flex items-center gap-2 tracking-tight">
               {gameInfo?.icon && <gameInfo.icon size={20} className={gameInfo?.color} />} 
               <span>{gameInfo?.title}</span>
             </h1>
             <div className="flex bg-neutral-900 rounded-lg p-0.5 mt-1 border border-neutral-800 w-fit">
                <button onClick={() => setDifficulty('easy')} className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md transition ${difficulty === 'easy' ? 'bg-green-500 text-white' : 'text-neutral-500'}`}>سهل (x0.5)</button>
                <button onClick={() => setDifficulty('normal')} className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md transition ${difficulty === 'normal' ? 'bg-blue-500 text-white' : 'text-neutral-500'}`}>عادي (x1)</button>
                <button onClick={() => setDifficulty('hard')} className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md transition ${difficulty === 'hard' ? 'bg-red-500 text-white' : 'text-neutral-500'}`}>صعب (x2)</button>
             </div>
           </div>
           
           <div className="flex items-center gap-2">
             {userBoosters.double > 0 && (
               <div className="bg-rose-500/10 border border-rose-500/30 text-rose-450 px-2 py-1 rounded-xl flex items-center gap-1 animate-pulse">
                 <Zap size={11} className="fill-current" />
                 <span className="text-[9px] font-mono font-black">2x مضاعف</span>
               </div>
             )}
             <div className="bg-gradient-to-r from-yellow-500/20 to-amber-600/20 px-3 py-1.5 rounded-xl border border-yellow-500/30 flex items-center gap-2 shadow-inner">
               <span className="text-yellow-500 font-black text-sm select-none">{userData?.coins || 0}</span>
               <span className="text-yellow-500 text-xs">🪙</span>
             </div>
           </div>
         </div>

         <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
            {selectedGame === 'trivia' ? (
              <AnimeTriviaGame onScoreUpdate={handleScoreUpdate} />
            ) : selectedGame === 'pixel_guess' ? (
              <PixelGuessGame onScoreUpdate={handleScoreUpdate} />
            ) : selectedGame === 'who_said' ? (
              <WhoSaidGame onScoreUpdate={handleScoreUpdate} />
            ) : selectedGame === 'emoji_charades' ? (
              <EmojiCharadesGame onScoreUpdate={handleScoreUpdate} />
            ) : selectedGame === 'speed_trivia' ? (
              <SpeedTriviaGame onScoreUpdate={handleScoreUpdate} />
            ) : selectedGame === 'imposter' ? (
              <ImposterGame onScoreUpdate={handleScoreUpdate} />
            ) : selectedGame === 'tier_battle' ? (
              <TierBattleGame onScoreUpdate={handleScoreUpdate} />
            ) : selectedGame === 'memory' ? (
              <MemoryGame onScoreUpdate={handleScoreUpdate} />
            ) : selectedGame === 'power_level' ? (
              <PowerLevelGame onScoreUpdate={handleScoreUpdate} />
            ) : selectedGame === 'opening_lyrics' ? (
              <OpeningLyricsGame onScoreUpdate={handleScoreUpdate} />
            ) : selectedGame === 'timeline' ? (
              <TimelineGame onScoreUpdate={handleScoreUpdate} />
            ) : selectedGame === 'silhouette' ? (
              <SilhouetteGame onScoreUpdate={handleScoreUpdate} />
            ) : selectedGame === 'anime_math' ? (
              <AnimeMathGame onScoreUpdate={handleScoreUpdate} />
            ) : selectedGame === 'weapon_match' ? (
              <WeaponMatchGame onScoreUpdate={handleScoreUpdate} />
            ) : (
              <div className="flex-1 flex items-center justify-center flex-col text-center mt-20">
                <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
                   <Clock size={48} className="text-blue-500/50" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2 tracking-tight">جاري العمل على هذه اللعبة...</h2>
                <p className="text-neutral-500 font-medium">ستتوفر "{gameInfo?.title}" قريباً بشكل كامل!</p>
                <button onClick={() => { setActiveTab('lobby'); setSelectedGame(null); }} className="mt-8 bg-white/5 hover:bg-white/10 px-8 py-3 rounded-2xl text-white font-black transition-colors border border-white/5 shadow-lg">
                  العودة للوبي
                </button>
              </div>
            )}
         </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 pt-12 md:pt-0 font-sans selection:bg-yellow-500/30 ${hasSharinganTheme ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/20 via-[#09090b] to-[#09090b]' : 'bg-[#09090b]'} text-right`} dir="rtl">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 sticky top-0 bg-[#09090b]/80 backdrop-blur-2xl z-20 border-b border-white/5 shadow-2xl">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 border border-white/5 transition-colors text-white shadow-sm">
            <ChevronRight size={22} />
          </button>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600/20 to-purple-600/20 flex items-center justify-center border border-blue-500/20">
               <Gamepad2 className="text-blue-400" size={20} />
             </div>
             <h1 className="text-white font-black text-xl md:text-2xl tracking-tight">نظام الألعاب والذكاء <span className="text-blue-500 font-mono">MOD</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Bell Icon for Local Notifications */}
          <button 
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 border border-white/5 hover:border-blue-500/20 transition-all text-white relative shadow-sm cursor-pointer"
            title="التنبيهات المحلية والأحداث"
          >
            <Bell size={18} className={unreadCount > 0 ? 'text-amber-400 animate-bounce' : 'text-neutral-300'} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse border border-neutral-950">
                {unreadCount}
              </span>
            )}
          </button>

          <div className="bg-gradient-to-r from-yellow-500/20 to-amber-600/20 px-3 py-1.5 rounded-xl border border-yellow-500/30 flex items-center gap-2 shadow-inner">
             <span className="text-yellow-500 font-black text-sm">{userData?.coins || 0}</span>
             <span className="text-yellow-500 text-xs shadow-none">🪙</span>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 mt-2">
        {/* Dynamic Player Status Card */}
        <div className={`p-6 rounded-3xl border relative overflow-hidden shadow-2xl group ${hasSharinganTheme ? 'bg-gradient-to-r from-red-900/40 to-[#121215] border-red-900/50' : 'bg-gradient-to-br from-[#121215] to-[#0e0e11] border-white/5'}`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
             <div className="flex flex-col items-center">
               <div className={`shrink-0 w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl transform group-hover:scale-105 transition-transform relative ${hasGoldFrame ? 'border-4 border-yellow-500 bg-black shadow-[0_0_30px_rgba(234,179,8,0.3)]' : 'bg-gradient-to-tr from-blue-600 to-cyan-500 border border-white/20'}`}>
                 <span className="text-white font-black text-4xl">{currentLevel}</span>
               </div>
               <span className="text-[9px] font-black text-neutral-400 mt-2 bg-white/5 py-1 px-2.5 rounded-full border border-white/5 tracking-wider">مستوى الحساب</span>
             </div>

             <div className="flex-1 w-full text-right space-y-3">
                <div className="flex justify-between items-end flex-wrap gap-2">
                  <div>
                    <span className={`text-[10px] uppercase font-black tracking-widest ${activeRank.color} border px-2 py-0.5 rounded-lg border-white/10 ${activeRank.bg}`}>{activeRank.title}</span>
                    <h2 className="text-white font-black text-lg sm:text-xl tracking-tight mt-1">بطاقة الأداء المعرفي</h2>
                    <p className="text-[10px] text-neutral-450 mt-0.5">{activeRank.desc}</p>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-start md:justify-end gap-1 font-black text-white text-lg leading-none">
                       {userData?.xp || 0} <Zap size={15} className="text-blue-400" />
                    </div>
                    <span className="text-[10.5px] text-amber-500 font-bold block mt-1.5 font-mono">{userGamePoints} نقاك الألعاب الكلية</span>
                  </div>
                </div>

                <div className="w-full bg-black/60 h-2.5 rounded-full overflow-hidden border border-white/5 shadow-inner relative">
                  <div className={`absolute inset-y-0 right-0 bg-gradient-to-l rounded-full transition-all duration-1000 ${hasSharinganTheme ? 'from-red-600 to-red-400' : 'from-blue-600 to-cyan-400'}`} style={{ width: `${currentLevelProgress}%` }}>
                     <div className="absolute top-0 left-0 bottom-0 w-10 bg-gradient-to-r from-white/30 to-transparent"></div>
                  </div>
                </div>
                
                <p className={`text-[10px] font-bold ${hasSharinganTheme ? 'text-red-400' : 'text-blue-450'}`}>{((Math.floor(Math.pow((userData?.level || 1), 1.5) * 500) + 500) - (userData?.xp || 0))} نقطة خبرة متبقية للمستوى القادم</p>
             </div>
          </div>
        </div>

        {/* 4 Tabs: Games, Perks, Leaderboards, Contribute */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-1.5 bg-[#121215]/80 border border-white/5 rounded-2xl shadow-xl">
          <button
            onClick={() => setLobbySubTab('games')}
            className={`py-3 px-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              lobbySubTab === 'games'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Gamepad2 size={15} />
            <span>صالة الألعاب ({gamesList.length})</span>
          </button>
          
          <button
            onClick={() => setLobbySubTab('perks')}
            className={`py-3 px-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              lobbySubTab === 'perks'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/25'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShoppingCart size={15} />
            <span>متجر التعزيزات</span>
          </button>

          <button
            onClick={() => setLobbySubTab('profiles')}
            className={`py-3 px-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              lobbySubTab === 'profiles'
                ? 'bg-[#1e1e24] text-white border border-white/10 shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy size={15} />
            <span>أوسمة ومتصدرين</span>
          </button>

          <button
            onClick={() => setLobbySubTab('bank')}
            className={`py-3 px-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              lobbySubTab === 'bank'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Database size={15} />
            <span>بنك ومستودع الألعاب 💎</span>
          </button>
        </div>

        {/* Dynamic Display of Subtabs */}
        {lobbySubTab === 'games' && (
          <div className="space-y-6">
            {/* Quick Action Hub */}
            <div className="bg-[#121215] p-5 rounded-3xl border border-white/5 flex flex-col xl:flex-row gap-5 items-start xl:items-center justify-between shadow-xl">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 text-purple-400">
                   <Target size={28} />
                 </div>
                 <div>
                   <h2 className="text-white font-black text-lg mb-1 tracking-tight">نضوج اللعب الفكري والتميز اليومي</h2>
                   <p className="text-[11.5px] text-neutral-400 font-medium leading-relaxed max-w-sm">
                     حقائب التعزيزات متصلة بالساحة الكبرى. اشترِ بطاقات المساعدة لتتجاوز التحديات الصعبة بالذكاء الفائق!
                   </p>
                 </div>
              </div>
              <div className="flex w-full xl:w-auto gap-3 flex-wrap xl:flex-nowrap">
                <button onClick={() => setShowSpin(true)} className="flex-1 min-w-[140px] bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 border border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.3)] transform hover:-translate-y-0.5">
                   🌀 عجلة الحظ
                </button>
                <button onClick={onNavigateToLeaderboard} className="flex-1 min-w-[140px] bg-[#1a1a1e] hover:bg-white/5 border border-white/5 text-white px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 shadow-lg">
                  <Trophy size={16} className="text-yellow-500" /> المتصدرين
                </button>
              </div>
            </div>

            {/* Daily Quests Section */}
            <div className="bg-black/20 border border-white/5 rounded-3xl p-5 space-y-4 shadow-lg">
               <h2 className="text-white font-black text-lg flex items-center gap-2 tracking-tight">
                 <Target size={20} className="text-red-500"/> 
                 <span>المهام والالتزامات اليومية</span>
               </h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className={`p-5 rounded-2xl border flex items-center justify-between group transition-all relative overflow-hidden ${todayStats.quest1Claimed ? 'bg-[#121215] border-white/5 opacity-50' : q1Progress >= 3 ? 'bg-gradient-to-br from-[#121215] to-[#0a0f0a] border-green-500/30' : 'bg-[#121215] border-white/5'}`}>
                   <div className="flex items-center gap-4 relative z-10">
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${todayStats.quest1Claimed || q1Progress >= 3 ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500'}`}>
                       {todayStats.quest1Claimed ? <CheckCircle2 size={24} /> : <Zap size={24} />}
                     </div>
                     <div>
                       <h3 className={`font-black text-xs sm:text-sm ${todayStats.quest1Claimed ? 'text-white/50 line-through' : 'text-white'}`}>العب ٣ ألعاب تريفيا مصغرة</h3>
                       <div className="flex items-center gap-2 mt-1">
                         <span className="text-[10px] px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-bold">{todayStats.quest1Claimed ? 'تم الاستلام' : 'الجائزة: ١٥ كوينز'}</span>
                       </div>
                     </div>
                   </div>
                   <div className="relative z-10 shrink-0">
                     {todayStats.quest1Claimed ? (
                       <span className="text-[10px] font-bold text-green-500 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1">مكتمل <CheckCircle2 size={12}/></span>
                     ) : q1Progress >= 3 ? (
                       <button onClick={() => handleClaimQuest(1, 15)} className="bg-gradient-to-r from-green-600 to-emerald-500 text-white text-xs font-black px-6 py-2 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.4)]">استلام</button>
                     ) : (
                       <div className="flex flex-col items-end">
                         <span className="text-[10px] font-black text-neutral-400 mb-1">{q1Progress} / 3</span>
                         <div className="w-20 h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                           <div className="bg-red-500 h-full transition-all duration-700" style={{ width: `${(q1Progress/3)*100}%` }}></div>
                         </div>
                       </div>
                     )}
                   </div>
                 </div>

                 <div className={`p-5 rounded-2xl border flex items-center justify-between group transition-all relative overflow-hidden ${todayStats.quest2Claimed ? 'bg-[#121215] border-white/5 opacity-50' : q2Progress >= 50 ? 'bg-gradient-to-br from-[#121215] to-[#0a0f0a] border-green-500/30' : 'bg-[#121215] border-white/5'}`}>
                   <div className="flex items-center gap-4 relative z-10">
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${todayStats.quest2Claimed || q2Progress >= 50 ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-blue-500/10 text-blue-500'}`}>
                       {todayStats.quest2Claimed ? <CheckCircle2 size={24} /> : <Trophy size={24} />}
                     </div>
                     <div>
                       <h3 className={`font-black text-xs sm:text-sm ${todayStats.quest2Claimed ? 'text-white/50 line-through' : 'text-white'}`}>اجمع ٥٠ نقطة خبرة (XP)</h3>
                       <div className="flex items-center gap-2 mt-1">
                         <span className="text-[10px] px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-bold">{todayStats.quest2Claimed ? 'تم الاستلام' : 'الجائزة: ١٠ كوينز'}</span>
                       </div>
                     </div>
                   </div>
                   <div className="relative z-10 shrink-0">
                     {todayStats.quest2Claimed ? (
                       <span className="text-[10px] font-bold text-green-500 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1">مكتمل <CheckCircle2 size={12}/></span>
                     ) : q2Progress >= 50 ? (
                       <button onClick={() => handleClaimQuest(2, 10)} className="bg-gradient-to-r from-green-600 to-emerald-500 text-white text-xs font-black px-6 py-2 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.4)]">استلام</button>
                     ) : (
                       <div className="flex flex-col items-end">
                         <span className="text-[10px] font-black text-neutral-400 mb-1">{q2Progress} / 50</span>
                         <div className="w-20 h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                           <div className="bg-blue-500 h-full transition-all duration-700" style={{ width: `${(q2Progress/50)*100}%` }}></div>
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
            </div>

            {/* RPG Boss Raid Section ! */}
            <div className={`border rounded-3xl p-5 relative overflow-hidden bg-gradient-to-br ${activeBoss.bg} ${activeBoss.border}`}>
              <div className="absolute top-0 left-0 bg-red-600 text-white text-[9px] uppercase font-black px-4 py-1.5 rounded-br-2xl tracking-wider select-none">
                غارة التحدي اليومية الكبرى
              </div>
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4 text-right">
                   <div className="w-16 h-16 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center text-3xl shrink-0">
                     {activeBoss.avatar}
                   </div>
                   <div>
                     <span className="text-[9.5px] font-mono font-black text-red-500 uppercase tracking-widest block">طاقة الخصم: {activeBoss.hp} HP</span>
                     <h3 className="text-white text-lg font-black mt-1 leading-none">{activeBoss.name}</h3>
                     <p className="text-[11.2px] text-neutral-450 mt-1">{activeBoss.desc}</p>
                   </div>
                </div>

                <div className="shrink-0 w-full md:w-auto">
                  {hasFoughtBossToday ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl p-3 flex items-center gap-2">
                       <CheckCircle2 size={18} className="animate-pulse" />
                       <div className="text-right">
                         <div className="text-xs font-black">تم سحق الزعيم اليوم!</div>
                         <div className="text-[9.5px] text-neutral-400 font-bold">الحصاد: +{activeBoss.rewardCoins} كوينز و +{activeBoss.rewardXp} XP</div>
                       </div>
                    </div>
                  ) : (
                    <button 
                      onClick={startRaidFight}
                      className="w-full md:w-auto bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm px-6 py-3.5 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.3)] transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                    >
                      <Sword size={16} />
                      <span>بدء مواجهة الغارة</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Active Boss Battle UI Screen Overlay/Collapse */}
            {showBossBattle && (
              <div className="p-6 bg-black border border-red-500/20 rounded-3xl space-y-5 shadow-[0_0_40px_rgba(239,68,68,0.06)] relative text-right">
                 <button onClick={() => setShowBossBattle(false)} className="absolute top-4 left-4 p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition">
                   <X size={18} />
                 </button>

                 <div className="flex justify-between items-center border-b border-white/5 pb-3">
                   <div className="text-right">
                     <h4 className="text-white font-black text-sm flex items-center gap-1.5">
                       <Sword size={14} className="text-red-500" />
                       <span>ميدان التحدي الكوني: {activeBoss.name}</span>
                     </h4>
                     <p className="text-[10px] text-neutral-500 mt-0.5 font-bold">كل إجابة صحيحة توجع الخصم، وكل خطأ يكلفك حياتك</p>
                   </div>
                 </div>

                 {/* Dual Health Bars */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="bg-black/60 p-3 rounded-2xl border border-white/5 space-y-1">
                     <div className="flex justify-between text-[11px] font-bold">
                       <span className="text-red-400">الزعيم: {activeBoss.name}</span>
                       <span className="text-red-400 font-mono">{bossHp} / {activeBoss.hp} HP</span>
                     </div>
                     <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-white/5">
                       <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${(bossHp / activeBoss.hp) * 100}%` }}></div>
                     </div>
                   </div>

                   <div className="bg-black/60 p-3 rounded-2xl border border-white/5 space-y-1">
                     <div className="flex justify-between text-[11px] font-bold">
                       <span className="text-blue-400">حياتك الفكرية</span>
                       <span className="text-blue-500 font-mono">{playerHp} / 150 HP</span>
                     </div>
                     <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-white/5">
                       <div className="h-full bg-blue-600 transition-all duration-350" style={{ width: `${(playerHp / 150) * 100}%` }}></div>
                     </div>
                   </div>
                 </div>

                 {battleMessage && (
                   <p className="bg-[#121215] border border-white/5 p-3 rounded-2xl text-[11.5px] font-black text-amber-450 text-center animate-pulse leading-relaxed">
                     {battleMessage}
                   </p>
                 )}

                 {/* Questions Arena */}
                 {!showBattleEnd ? (
                   <div className="bg-neutral-950 p-4 rounded-3xl border border-white/5 space-y-4">
                     <div className="text-white font-black text-sm text-center py-2">
                       جولة {bossRoundIndex + 1}: {BOSS_QUESTIONS[bossRoundIndex % BOSS_QUESTIONS.length].q}
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                       {BOSS_QUESTIONS[bossRoundIndex % BOSS_QUESTIONS.length].options.map((opt, idx) => (
                         <button
                           key={idx}
                           onClick={() => handleBossAnswer(idx)}
                           className="w-full py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white border border-white/5 hover:border-white/10 text-xs font-black transition cursor-pointer text-center"
                         >
                           {opt}
                         </button>
                       ))}
                     </div>

                     {/* Booster Helper in Raid Battle */}
                     <div className="border-t border-white/5 pt-3.5 flex flex-wrap justify-between items-center gap-3">
                       <span className="text-[10px] text-neutral-500 font-black">استعن بمعززات حقيبتك:</span>
                       <div className="flex gap-2">
                         <button
                           onClick={() => useRaidBooster('skip')}
                           disabled={(userBoosters.skip || 0) <= 0}
                           className="px-4 py-2 bg-neutral-900 border border-white/10 hover:border-white/20 text-white rounded-xl text-[10.5px] font-black transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                         >
                           <span>تخطي السؤال تلقائيّاً</span>
                           <span className="bg-purple-600 text-white text-[9px] px-1.5 py-0.5 rounded-md">({userBoosters.skip || 0})</span>
                         </button>
                         <button
                           onClick={() => useRaidBooster('reveal')}
                           disabled={(userBoosters.reveal || 0) <= 0}
                           className="px-4 py-2 bg-neutral-900 border border-white/10 hover:border-white/20 text-white rounded-xl text-[10.5px] font-black transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                         >
                           <span>كشف حكمة الأوتوكو</span>
                           <span className="bg-pink-600 text-white text-[9px] px-1.5 py-0.5 rounded-md">({userBoosters.reveal || 0})</span>
                         </button>
                       </div>
                     </div>
                   </div>
                 ) : (
                   <div className="p-6 text-center space-y-4 bg-neutral-950 rounded-3xl border border-white/5">
                      {showBattleEnd === 'win' ? (
                        <>
                          <div className="text-4xl">🏆🥇</div>
                          <h4 className="text-emerald-400 font-black text-lg">نصر مئوي مؤزر!</h4>
                          <p className="text-xs text-neutral-400">لقد أخضعت {activeBoss.name} بفطانتك الكبيرة وحيازتك للمعرفة الحقيقية.</p>
                          <div className="flex justify-center gap-3 text-sm font-mono font-black">
                            <span className="text-yellow-400">+{activeBoss.rewardCoins} كوينز 🪙</span>
                            <span className="text-purple-400">+{activeBoss.rewardXp} XP ⚡</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-4xl text-neutral-500">💀🔥</div>
                          <h4 className="text-red-500 font-black text-lg">سقوط وهزيمة في الميدان!</h4>
                          <p className="text-xs text-neutral-400">تفوقت هجمات الزعيم على دفاعك وسلبت نقاط حياتك كاملة. عزز رصيدك بالمثابرة والعب مجدداً للتعلم!</p>
                        </>
                      )}
                      
                      <button 
                        onClick={() => setShowBossBattle(false)}
                        className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-xs font-black text-white cursor-pointer"
                      >
                        إغلاق ساحة المعركة
                      </button>
                   </div>
                 )}
              </div>
            )}

            {/* Games Minilist grid - Grid Layout ("عرض شبكة") requested */}
            <div className="space-y-4">
              <h2 className="text-white font-black text-lg flex items-center gap-2 tracking-tight">
                <Gamepad2 size={20} className="text-blue-500" />
                <span>قائمة الألعاب المصغرة</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gamesList.map((game) => {
                  const isLocked = userLevel < game.minLevel;
                  return (
                    <div 
                      key={game.id} 
                      onClick={() => { 
                        if (userData?.isGamesRestricted) {
                          alert('عذراً! تم حظر دخولك إلى ألعاب وفعاليات الأكاديمية بواسطة إدارة المنصة! 🎮🛑');
                          return;
                        }
                        if (!isLocked) { setSelectedGame(game.id); setActiveTab('game'); } 
                      }}
                      className={`p-5 rounded-3xl border transition-all flex flex-col items-start gap-4 shadow-xl relative overflow-hidden text-right ${
                        isLocked 
                          ? 'bg-black/50 border-white/5 opacity-60 cursor-not-allowed' 
                          : 'bg-[#121215] hover:border-blue-500/30 border-white/5 hover:bg-[#1a1a1e] cursor-pointer group'
                      }`}
                    >
                      <div className="flex w-full items-start justify-between">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br ${game.bg} ${!isLocked && 'group-hover:scale-110'} transition-transform shadow-md border border-white/5`}>
                          <game.icon className={game.color} size={28} />
                        </div>
                        {isLocked ? (
                          <div className="flex gap-1 items-center bg-black/40 px-3 py-1 rounded-full border border-white/10 text-neutral-500 font-bold text-xs mt-1">
                            <Lock size={12} />
                            <span>مستوى {game.minLevel}</span>
                          </div>
                        ) : (
                          <span className="text-[9.5px] text-neutral-500 font-bold uppercase tracking-wider font-mono bg-white/5 border border-white/5 px-2.5 py-1 rounded-full group-hover:text-blue-400 group-hover:border-blue-500/10">متاح</span>
                        )}
                      </div>
                      <div>
                        <h3 className={`font-black text-sm sm:text-base mb-1.5 tracking-tight transition-colors ${isLocked ? 'text-neutral-450' : 'text-white group-hover:text-blue-400'}`}>{game.title}</h3>
                        <p className="text-[11px] text-neutral-550 font-medium leading-relaxed">{game.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {lobbySubTab === 'perks' && (
          <div className="space-y-6">
            <div className="bg-[#121215] border border-white/5 rounded-3xl p-5 text-right space-y-1">
               <h2 className="text-white font-black text-base">متجر تعزيزات وأدوات الـ MOD 🛒</h2>
               <p className="text-[11px] text-neutral-450 leading-relaxed">استبدل الكوينز التي حصدتها ببطاقات ومساعدات ذكائية تمكنك من بسط نفوذك وقهر صعوبات الألعاب والتفوق في المعارك وزيادة نقاط الـ XP!</p>
            </div>

            {/* Booster count inventory list */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Skip Card */}
              <div className="bg-black/40 border border-white/5 p-5 rounded-2xl flex flex-col justify-between text-right space-y-4">
                <div className="space-y-1.5">
                  <div className="w-11 h-11 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
                    <Star size={20} className="fill-current" />
                  </div>
                  <h3 className="text-white font-black text-sm">بطاقة تخطي الأسئلة (Skip Card)</h3>
                  <p className="text-[10.5px] text-neutral-400 leading-relaxed">تسمح لك بتجاوز أي سؤال صعب أو معضلة بنيل نقاط الخبرة الكاملة دون خسارة حياتك الفكرية.</p>
                  <div className="text-[11px] text-amber-500 font-bold">حيازتك الحالية: {userBoosters.skip || 0} شحنات</div>
                </div>
                <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                  <span className="text-xs font-mono font-black text-neutral-450">السعر: 50 🪙</span>
                  <button 
                    onClick={() => handleBuyBooster('skip', 50)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl cursor-pointer"
                  >
                    شراء حزمة
                  </button>
                </div>
              </div>

              {/* Reveal Clue Card */}
              <div className="bg-black/40 border border-white/5 p-5 rounded-2xl flex flex-col justify-between text-right space-y-4">
                <div className="space-y-1.5">
                  <div className="w-11 h-11 bg-pink-500/10 rounded-xl flex items-center justify-center text-pink-400">
                    <Eye size={20} />
                  </div>
                  <h3 className="text-white font-black text-sm">حكمة النينجا (Reveal Card)</h3>
                  <p className="text-[10.5px] text-neutral-400 leading-relaxed">تكشف لك الإجابة المحتملة أو تبدد خيارين خاطئين لتمكينك من حسم الإجابة الصائبة.</p>
                  <div className="text-[11px] text-amber-500 font-bold">حيازتك الحالية: {userBoosters.reveal || 0} شحنات</div>
                </div>
                <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                  <span className="text-xs font-mono font-black text-neutral-450">السعر: 75 🪙</span>
                  <button 
                    onClick={() => handleBuyBooster('reveal', 75)}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white font-black text-xs rounded-xl cursor-pointer"
                  >
                    شراء حزمة
                  </button>
                </div>
              </div>

              {/* Double XP Card */}
              <div className="bg-black/40 border border-white/5 p-5 rounded-2xl flex flex-col justify-between text-right space-y-4">
                <div className="space-y-1.5">
                  <div className="w-11 h-11 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-450">
                    <Zap size={20} className="fill-current animate-pulse" />
                  </div>
                  <h3 className="text-white font-black text-sm">مضاعف الطاقة الثنائي (Double XP)</h3>
                  <p className="text-[10.5px] text-neutral-400 leading-relaxed">تلقائياً تضاعف XP والكوينز التي تجمعها من إجابتك وجولتك التريفية التالية بالكامل!</p>
                  <div className="text-[11px] text-amber-500 font-bold">حيازتك الحالية: {userBoosters.double || 0} مضاعفات</div>
                </div>
                <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                  <span className="text-xs font-mono font-black text-neutral-450">السعر: 100 🪙</span>
                  <button 
                    onClick={() => handleBuyBooster('double', 100)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl cursor-pointer"
                  >
                    شراء حزمة
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {lobbySubTab === 'profiles' && (
          <div className="space-y-6">
            {/* Gamified Levels & Ranks Definition list */}
            <div className="bg-black/20 border border-white/5 rounded-3xl p-5 space-y-4 text-right">
              <h2 className="text-white font-black text-lg flex items-center gap-2">
                 <Award size={20} className="text-yellow-500" />
                 <span>شرح رتب ومقاييس الأوتوكو للذكاء</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-black/50 p-4 rounded-xl border border-white/5 text-right">
                  <span className="text-xs font-black text-rose-400 bg-rose-550/10 px-2.5 py-1 rounded-md">الهوكاجي الأعظم 👑 (٥٠٠٠+ نقطة)</span>
                  <p className="text-[10.5px] text-neutral-400 mt-2">مرتبة العباقرة المطلقة في السيرفر لمن يمتلكون بصيرة الأعين الشابة والمعرفة الأكمل.</p>
                </div>
                <div className="bg-black/50 p-4 rounded-xl border border-white/5 text-right">
                  <span className="text-xs font-black text-yellow-500 bg-yellow-500/10 px-2.5 py-1 rounded-md">ملك القراصنة الفكري ⚓ (٢٥٠٠-٤٩٩٩ نقطة)</span>
                  <p className="text-[10.5px] text-neutral-400 mt-2">من حطم المحيطات بالمعلومات وحقق السيادة الكاملة على شؤون المانجا والألعاب.</p>
                </div>
                <div className="bg-black/50 p-4 rounded-xl border border-white/5 text-right">
                  <span className="text-xs font-black text-indigo-400 bg-indigo-400/10 px-2.5 py-1 rounded-md">سياف الغسق الأسطوري ⚔️ (١٠٠٠-٢٤٩٩ نقطة)</span>
                  <p className="text-[10.5px] text-neutral-400 mt-2">مستوى النخبة من المبارزين القادرين على فك الألغاز بضربة خاطفة وعين يقظة.</p>
                </div>
                <div className="bg-black/55 p-4 rounded-xl border border-white/5 text-right">
                  <span className="text-xs font-black text-purple-400 bg-purple-400/10 px-2.5 py-1 rounded-md">صياد العمالقة الباسل 🏹 (٥٠٠-٩٩٩ نقطة)</span>
                  <p className="text-[10.5px] text-neutral-400 mt-2">من تخطى النطاق التدريبي والمسائل الحسابية وبدأ في قهر اللالغاز المعقدة.</p>
                </div>
              </div>
            </div>

            {/* Glowing Live Games Mini Leaderboard */}
            <div className="bg-[#121215] border border-white/5 rounded-3xl p-5 space-y-4 shadow-xl">
               <div className="flex justify-between items-center text-right border-b border-white/5 pb-3">
                 <div>
                   <h3 className="text-white font-black text-base flex items-center gap-1.5 leading-none">
                     <Trophy size={16} className="text-yellow-500 animate-bounce" />
                     <span>لوحة شرف فرسان الألعاب الذكائية</span>
                   </h3>
                   <span className="text-[9.5px] text-neutral-500 block mt-1.5 font-bold">قائمة الأوتوكو الستة الأكثر بريقاً ونقاطاً بالمنصة</span>
                 </div>
               </div>

               {leadersLoading ? (
                 <div className="flex justify-center py-8"><div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div></div>
               ) : gameLeaders.length === 0 ? (
                 <p className="text-center text-neutral-500 text-xs py-6">لا يوجد فرسان مرصعين لغاية اللحظة. بادر باللعب وتحطيم الأرقام الآن!</p>
               ) : (
                 <div className="space-y-2.5">
                   {gameLeaders.map((u, idx) => {
                     const isCurrUser = user?.uid === u.id;
                     const rankDetails = getGameRankInfo(u.aiGamesPoints || 0);
                     return (
                       <div 
                         key={u.id}
                         className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                           isCurrUser 
                             ? 'bg-indigo-600/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                             : 'bg-black/40 border-white/5 hover:bg-neutral-900/40 hover:border-white/10'
                         }`}
                       >
                         <div className="flex items-center gap-3">
                           <div className="text-sm font-mono font-black text-neutral-500 w-6 text-center">
                             #{idx + 1}
                           </div>
                           <div className="text-right">
                             <span className="text-xs font-black text-white block leading-none">{u.displayName || 'متابع مبهم'}</span>
                             <span className={`text-[8.5px] font-bold mt-1 block ${rankDetails.color}`}>{rankDetails.title}</span>
                           </div>
                         </div>
                         <div className="text-left shrink-0">
                           <span className="text-xs font-mono font-black text-amber-500">{u.aiGamesPoints || 0} نقطة</span>
                           <span className="text-[7.5px] text-neutral-500 font-bold block mt-0.5 font-sans">مستوى {u.level || 1}</span>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               )}
            </div>
          </div>
        )}

        {lobbySubTab === 'bank' && (
          <QuestionContributionForm userId={user?.uid} username={userData?.displayName || userData?.username || user?.displayName || 'الأوتوكو المساهم ⚔️'} />
        )}
      </div>

      {showSpin && <DailySpin onClose={() => setShowSpin(false)} />}

      {/* Local Notifications Center Modal */}
      {showNotifMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#121215] border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative text-right flex flex-col max-h-[85vh] animate-in fade-in-50 zoom-in-95 duration-200">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                  <Bell size={18} />
                </div>
                <div>
                  <h3 className="text-white font-black text-xs sm:text-sm">مركز التنبيهات والأحداث المحلية 🔔</h3>
                  <p className="text-[10px] text-neutral-450 mt-0.5">تابع تحديات الأسبوع وصيانة مستويات اللعب أولاً بأول</p>
                </div>
              </div>
              <button 
                onClick={() => setShowNotifMenu(false)}
                className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* List and Actions */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="flex justify-between items-center text-[11px] font-bold text-neutral-400 border-b border-white/5 pb-2">
                <span>تنبيهات ({notifications.length})</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-blue-400 hover:underline cursor-pointer"
                  >
                    تحديد الكل كمقروء ✓
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Bell className="mx-auto text-neutral-600 animate-pulse" size={32} />
                  <p className="text-xs text-neutral-400">لا توجد تنبيهات حالية</p>
                  <p className="text-[10px] text-neutral-500">استخدم المحاكاة الذكية بالأسفل لتجربة التنبيهات!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      className={`p-4 rounded-2xl border transition-all text-right relative overflow-hidden ${
                        notif.isRead 
                          ? 'bg-[#18181c]/45 border-white/5 opacity-75' 
                          : 'bg-[#18181c] border-amber-500/20 shadow-md shadow-amber-500/5'
                      }`}
                    >
                      {/* Unread Indicator */}
                      {!notif.isRead && (
                        <span className="absolute top-4 left-4 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      )}

                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5 select-none">
                          {notif.category === 'weekly_challenge' ? '⚔️' : 
                           notif.category === 'level_renewal' ? '🆙' : 
                           notif.category === 'rewards' ? '🎁' : '🔔'}
                        </span>
                        <div className="space-y-1.5 flex-1">
                          <h4 className="text-white font-black text-xs leading-snug">{notif.title}</h4>
                          <p className="text-[11px] text-neutral-450 leading-relaxed font-semibold">{notif.body}</p>
                          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5 mt-2">
                            <span className="text-neutral-550 font-bold">{notif.time}</span>
                            <div className="flex gap-2">
                              {!notif.isRead && (
                                <button 
                                  onClick={() => markAsRead(notif.id)}
                                  className="text-amber-500 hover:underline font-bold"
                                >
                                  تعليم كمقروء
                                </button>
                              )}
                              <button 
                                onClick={() => deleteNotification(notif.id)}
                                className="text-neutral-550 hover:text-red-400 font-bold"
                              >
                                حذف
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Call-to-action rewards button or challenge triggers */}
                      {notif.actionLabel && (
                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-end">
                          {notif.rewardCoins || notif.rewardXp ? (
                            <button
                              disabled={notif.isClaimed}
                              onClick={() => {
                                handleClaimNotifReward(notif.id, notif.rewardCoins, notif.rewardXp);
                              }}
                              className={`px-4 py-1.5 rounded-xl text-[10.5px] font-black transition cursor-pointer ${
                                notif.isClaimed
                                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5'
                                  : 'bg-gradient-to-r from-yellow-500 to-amber-500 text-neutral-950 font-extrabold hover:shadow-lg shadow-yellow-500/20'
                              }`}
                            >
                              {notif.isClaimed ? 'تمت المطالبة وإيداع المكافأة ✓' : notif.actionLabel}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                markAsRead(notif.id);
                                setShowNotifMenu(false);
                                if (notif.category === 'weekly_challenge') {
                                  setSelectedGame('who_said');
                                  setActiveTab('game');
                                } else {
                                  setLobbySubTab('games');
                                }
                              }}
                              className="px-4 py-1.5 rounded-xl text-[10.5px] font-black bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                            >
                              {notif.actionLabel}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* SIMULATOR TOOLBAR FOR GAMING NOTIFICATIONS */}
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-black border-b border-white/5 pb-2">
                  <Info size={14} className="text-blue-400 font-black" />
                  <span>محاكاة نظام التنبيهات والأحداث (Simulator)</span>
                </div>
                <p className="text-[10px] text-neutral-500 leading-relaxed font-bold">انقر على أحد الأزرار لتوليد وبث تنبيه فوري بالخلفية للتحقق من التنبيهات المحلية:</p>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => handleSimulateNotification('weekly')}
                    className="py-2.5 px-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-450 border border-blue-500/20 hover:border-blue-500/30 text-[9.5px] font-black tracking-tight transition cursor-pointer text-center"
                  >
                    تنبيه التحدي الأسبوعي ⚔️
                  </button>
                  <button 
                    onClick={() => handleSimulateNotification('renewal')}
                    className="py-2.5 px-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-450 border border-purple-500/20 hover:border-purple-500/30 text-[9.5px] font-black tracking-tight transition cursor-pointer text-center"
                  >
                    تجديد مستويات الأوتوكو 🆙
                  </button>
                  <button 
                    onClick={() => handleSimulateNotification('boss')}
                    className="py-2.5 px-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-450 border border-red-500/20 hover:border-red-500/30 text-[9.5px] font-black tracking-tight transition cursor-pointer text-center"
                  >
                    غارة تحدي جديدة ☠️
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/5 bg-neutral-950/50 flex justify-between items-center text-[10px] text-neutral-500">
              <span>تعتمد التنبيهات على البيانات المحلية الصامدة</span>
              <span>تنبيهات في النطاق</span>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up Live Toast Message Alert */}
      {activeToast && (
        <div className="fixed bottom-6 left-6 z-50 max-w-sm bg-gradient-to-r from-neutral-900 to-[#121215] border-2 border-amber-500/30 p-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-slide-up hover:scale-[1.02] transition-transform text-right" dir="rtl">
          <div className="w-9 h-9 shrink-0 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 animate-bounce">
            <Bell size={18} />
          </div>
          <div className="space-y-1 pr-1">
            <h4 className="text-white font-black text-xs">{activeToast.title}</h4>
            <p className="text-[10.5px] text-neutral-450 leading-normal">{activeToast.body}</p>
          </div>
          <button 
            onClick={() => setActiveToast(null)}
            className="text-neutral-550 hover:text-white shrink-0 p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
