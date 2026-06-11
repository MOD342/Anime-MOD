import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Award, 
  Timer, 
  Users, 
  Crown, 
  ChevronLeft, 
  Zap, 
  Gift, 
  PlayCircle, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight, 
  Star, 
  Sparkles, 
  TrendingUp,
  Info,
  ShieldAlert,
  Flame
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface TournamentsViewProps {
  onBack: () => void;
  onNavigate?: (route: string) => void;
}

interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string;
  points: number;
  badge: string;
  isMe?: boolean;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  type: 'watch' | 'trivia' | 'review' | 'recommend';
}

export default function TournamentsView({ onBack, onNavigate }: TournamentsViewProps) {
  const { user, userData } = useAuth();
  const userName = user?.displayName || userData?.username || 'المتابع الأسطوري';

  // State Tabs
  const [activeTab, setActiveTab] = useState<'seasonal' | 'weekly'>('seasonal');
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);

  // Load persistence state for Seasonal Tournament
  const [seasonalJoined, setSeasonalJoined] = useState<boolean>(() => {
    return localStorage.getItem('otaku_seasonal_joined') === 'true';
  });
  const [seasonalPoints, setSeasonalPoints] = useState<number>(() => {
    const saved = localStorage.getItem('otaku_seasonal_points');
    return saved ? parseInt(saved) : 450; // default starting points if joined
  });
  const [seasonalQuests, setSeasonalQuests] = useState<Quest[]>(() => {
    const saved = localStorage.getItem('otaku_seasonal_quests');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'seq-1', title: 'متابعة نهمة للأنمي المستمر', description: 'مشاهدة 5 حلقات من أنميات موسم صيف 2026', points: 150, completed: false, type: 'watch' },
      { id: 'seq-2', title: 'خبير التقييم والمراجعات', description: 'كتابة مراجعة متكاملة لأحد أنميات الصيف ونشرها بالمنصة', points: 120, completed: false, type: 'review' },
      { id: 'seq-3', title: 'سيد ألعاب الأسئلة', description: 'تحقيق المركز الأول في لعبة تخمين الأنمي لـ 3 مرات متتالية', points: 200, completed: false, type: 'trivia' },
      { id: 'seq-4', title: 'ناصح الأوتاكو الموثوق', description: 'اكتب وعلق بتوصية مميزة نالت إعجاب 5 مستخدمين على الأقل', points: 100, completed: false, type: 'recommend' },
    ];
  });

  // Load persistence state for Weekly Tournament
  const [weeklyJoined, setWeeklyJoined] = useState<boolean>(() => {
    return localStorage.getItem('otaku_weekly_joined') === 'true';
  });
  const [weeklyPoints, setWeeklyPoints] = useState<number>(() => {
    const saved = localStorage.getItem('otaku_weekly_points');
    return saved ? parseInt(saved) : 0;
  });
  const [weeklyQuests, setWeeklyQuests] = useState<Quest[]>(() => {
    const saved = localStorage.getItem('otaku_weekly_quests');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'weq-1', title: 'المصوت الذهبي', description: 'المشاركة بالتصويت في قتال حلقة الأسبوع المشتعل', points: 80, completed: false, type: 'recommend' },
      { id: 'weq-2', title: 'تحدي المعرفة الصعب', description: 'اجتياز اختبار معلومات "سلسلة بليتش" الأسبوعي بنسبة 100%', points: 180, completed: false, type: 'trivia' },
      { id: 'weq-3', title: 'صاحب الأذن الموسيقية', description: 'تخمين 5 أوبينينغز بطريقة صحيحة في غضون دقيقتين', points: 150, completed: false, type: 'trivia' },
    ];
  });

  // Dynamic countdown timer for Weekly Tournament (simulates the intermittent weekend tournament)
  const [weeklyTimeLeft, setWeeklyTimeLeft] = useState({ hours: 14, minutes: 32, seconds: 45 });

  useEffect(() => {
    const interval = setInterval(() => {
      setWeeklyTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 23, minutes: 59, seconds: 59 }; // loop back
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Save states to localstorage on change
  useEffect(() => {
    localStorage.setItem('otaku_seasonal_joined', String(seasonalJoined));
    localStorage.setItem('otaku_seasonal_points', String(seasonalPoints));
    localStorage.setItem('otaku_seasonal_quests', JSON.stringify(seasonalQuests));
  }, [seasonalJoined, seasonalPoints, seasonalQuests]);

  useEffect(() => {
    localStorage.setItem('otaku_weekly_joined', String(weeklyJoined));
    localStorage.setItem('otaku_weekly_points', String(weeklyPoints));
    localStorage.setItem('otaku_weekly_quests', JSON.stringify(weeklyQuests));
  }, [weeklyJoined, weeklyPoints, weeklyQuests]);

  const handleJoinSeasonal = () => {
    if (userData?.isGamesRestricted) {
      alert('عذراً! تم تقييد حسابك من المشاركة في الفعاليات والمسابقات مؤقتاً لقوانين السلوك! 🎮🛑');
      return;
    }
    setSeasonalJoined(true);
    setSeasonalPoints(450); // initial start points
    triggerToast('✓ تم تسجيلك بنجاح في معركة موسم الصيف المستمرة! حان وقت اعتلاء الصدارة!');
  };

  const handleJoinWeekly = () => {
    if (userData?.isGamesRestricted) {
      alert('عذراً! تم تقييد حسابك من المشاركة في الفعاليات والمسابقات مؤقتاً لقوانين السلوك! 🎮🛑');
      return;
    }
    setWeeklyJoined(true);
    setWeeklyPoints(100);
    triggerToast('⚡ أهلاً بك في التحدي الأسبوعي الخاطف! مهام بليتش وأسئلة الأغاني مفتوحة الآن!');
  };

  const triggerToast = (msg: string) => {
    setShowSuccessToast(msg);
    setTimeout(() => setShowSuccessToast(null), 4000);
  };

  const completeQuest = (questId: string, pointsToAdd: number, tab: 'seasonal' | 'weekly') => {
    if (tab === 'seasonal') {
      if (!seasonalJoined) {
        alert('يرجى الانضمام للبطولة أولاً لتتمكن من احتساب النقاط وتوثيق المهمة! 🏆');
        return;
      }
      setSeasonalQuests(prev => prev.map(q => q.id === questId ? { ...q, completed: true } : q));
      setSeasonalPoints(prev => prev + pointsToAdd);
      triggerToast(`🎉 عمل رائع! حصلت على +${pointsToAdd} نقطة صيفية وتلقيت ترقية في الترتيب!`);
    } else {
      if (!weeklyJoined) {
        alert('يرجى تسجيل الدخول والانضمام للتحدي الأسبوعي لحصد نقاط المبارزة الخاطفة! ⚡');
        return;
      }
      setWeeklyQuests(prev => prev.map(q => q.id === questId ? { ...q, completed: true } : q));
      setWeeklyPoints(prev => prev + pointsToAdd);
      triggerToast(`🎉 فخر الأوتاكو! أتممت التحدي الأسبوعي الحماسي وحصدت +${pointsToAdd} نقطة صاعقة!`);
    }
  };

  const resetTournamentProgress = () => {
    if (window.confirm('هل تريد فعلاً تصفير نقاطك وتحدياتك للبدء في المنافسة من جديد؟')) {
      if (activeTab === 'seasonal') {
        setSeasonalPoints(450);
        setSeasonalQuests(prev => prev.map(q => ({ ...q, completed: false })));
        triggerToast('🔄 تم تصفير نقاط بطولة الصيف وإعادة تهيئة المهام بنجاح.');
      } else {
        setWeeklyPoints(100);
        setWeeklyQuests(prev => prev.map(q => ({ ...q, completed: false })));
        triggerToast('🔄 تم تصفير نقاط وتحديات هذا الأسبوع.');
      }
    }
  };

  // Mock Leaders for Seasonal Leaderboard
  const getSeasonalLeaders = (): LeaderboardUser[] => {
    const list: LeaderboardUser[] = [
      { id: '1', name: 'كيرا الأسطوري', avatar: '🔥', points: 1450, badge: 'رائد اللوردات' },
      { id: '2', name: 'لوفي_الشرق', avatar: '👒', points: 1200, badge: 'جنرال الأوتاكو' },
      { id: '3', name: 'زينتسو_الحزين', avatar: '⚡', points: 940, badge: 'خبير العقد' },
      { id: '4', name: 'Mikasa_Love', avatar: '🧣', points: 750, badge: 'جناح الحرية' },
      { id: 'me', name: `${userName} (أنت)`, avatar: '🦊', points: seasonalPoints, badge: 'منافس غيور', isMe: true },
      { id: '5', name: 'سانجي_الرائع', avatar: '🚬', points: 410, badge: 'طاهي البحر' },
    ];
    // Sort descending by points
    return list.sort((a, b) => b.points - a.points);
  };

  // Mock Leaders for Weekly Leaderboard
  const getWeeklyLeaders = (): LeaderboardUser[] => {
    const list: LeaderboardUser[] = [
      { id: 'w1', name: 'سنسي_العظيم', avatar: '🎓', points: 650, badge: 'مستكشف نخبوي' },
      { id: 'w2', name: 'كورابيكا_الرائع', avatar: '⛓️', points: 520, badge: 'منتقم السلسلة' },
      { id: 'me', name: `${userName} (أنت)`, avatar: '⚡', points: weeklyPoints, badge: 'مهاجم البرق', isMe: true },
      { id: 'w3', name: 'سويون_الذكي', avatar: '🐼', points: 310, badge: 'عاشق الباندا' },
      { id: 'w4', name: 'غوكو_بلو', avatar: '🐒', points: 180, badge: 'سوبر سايان' },
    ];
    return list.sort((a, b) => b.points - a.points);
  };

  const currentLeaders = activeTab === 'seasonal' ? getSeasonalLeaders() : getWeeklyLeaders();
  const myRank = currentLeaders.findIndex(lead => lead.isMe) + 1;

  return (
    <div className="bg-black min-h-screen pb-24 overflow-y-auto hide-scrollbar font-sans text-right" dir="rtl">
      {/* Dynamic Success Notification Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-4 right-4 z-[9999] max-w-md mx-auto bg-gradient-to-r from-purple-950 to-indigo-950 border border-purple-500/30 p-4 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 animate-bounce">
              <Sparkles size={20} />
            </div>
            <div className="text-right">
              <h5 className="text-xs font-black text-purple-300">تحديث الدوري العام 🏆</h5>
              <p className="text-xs text-white/95 mt-0.5 leading-relaxed font-bold">{showSuccessToast}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Premium Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-neutral-900/60 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={onBack} 
            className="w-10 h-10 bg-neutral-900 hover:bg-neutral-800 rounded-full flex items-center justify-center text-white border border-neutral-800/80 transition-all active:scale-95 cursor-pointer"
          >
            <ChevronLeft size={22} className="rotate-180" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="text-yellow-500 animate-pulse" size={24} />
            <h1 className="text-lg sm:text-xl font-black text-white bg-gradient-to-l from-white to-neutral-400 bg-clip-text text-transparent">منظومة بطولات MOD</h1>
          </div>
        </div>

        {/* Action Button: Reset Progress */}
        <button
          type="button"
          onClick={resetTournamentProgress}
          className="text-[10px] font-black text-neutral-500 hover:text-red-400 bg-neutral-950/80 px-2.5 py-1.5 rounded-lg border border-neutral-900 hover:border-red-500/20 transition-all cursor-pointer"
        >
          إعادة تصفير نقاطي 🔄
        </button>
      </div>

      <div className="px-4 mt-6 max-w-4xl mx-auto space-y-6">
        
        {/* Description Banner & Mode info */}
        <div className="bg-gradient-to-r from-purple-950/10 via-neutral-900/50 to-indigo-950/10 rounded-2xl p-4 border border-neutral-900 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Sparkles size={16} className="text-yellow-500" />
              <span>بطولات وجوائز مجتمع الأوتاكو الكبير</span>
            </h3>
            <p className="text-neutral-400 text-xs leading-relaxed max-w-md">
              نقدم لك فئتين من التحديات والمبارزات؛ دورياتنا الموسمية المستمرة لتوثيق فخر الأوتاكو، والمسابقات الأسبوعية المتقطعة التي تنشط نهاية كل أسبوع بمكافآت هائلة لمتابعي الأنمي المشتعلين!
            </p>
          </div>
          <div className="flex items-center gap-2 bg-neutral-900/50 p-2 rounded-xl border border-neutral-800 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500 font-bold">
              +1.5x
            </div>
            <div className="text-right">
              <span className="text-[9px] text-neutral-500 block font-bold">مضاعف نقاط البطولة الحالية:</span>
              <strong className="text-xs text-white">معزز رصيد صيانة صيف 2026</strong>
            </div>
          </div>
        </div>

        {/* Tournament Scope / Category Tabs */}
        <div className="grid grid-cols-2 bg-[#090909] border border-neutral-900 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('seasonal')}
            className={`py-3 px-4 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-2 ${
              activeTab === 'seasonal'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-950/30'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Trophy size={16} className={`${activeTab === 'seasonal' ? 'text-white animate-bounce' : ''}`} />
            <div className="text-center sm:text-right">
              <span className="block text-xs font-black">الدوري الموسمي المستمر</span>
              <span className="block text-[8px] opacity-70 font-bold">موسم مستمر طيلة الصيف 🌸</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('weekly')}
            className={`py-3 px-4 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-2 ${
              activeTab === 'weekly'
                ? 'bg-gradient-to-r from-amber-600 to-red-600 text-white shadow-xl shadow-red-950/30'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Flame size={16} className={`${activeTab === 'weekly' ? 'text-white animate-pulse' : ''}`} />
            <div className="text-center sm:text-right">
              <span className="block text-xs font-black">التحديات الأسبوعية المتقطعة</span>
              <span className="block text-[8px] opacity-70 font-bold">تنشط وتخمل بنهاية الأسبوع ⚡</span>
            </div>
          </button>
        </div>

        {/* Tab Components Wrapper */}
        <AnimatePresence mode="wait">
          {activeTab === 'seasonal' ? (
            <motion.div
              key="seasonal-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Seasonal Tournament Hero Detail */}
              <div className="rounded-3xl p-[1px] bg-gradient-to-br from-purple-500/20 via-neutral-850 to-indigo-500/20 shadow-xl">
                <div className="bg-[#0c0c0c] rounded-[23px] overflow-hidden relative p-6">
                  {/* Glowing background */}
                  <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-36 h-36 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10 border-b border-neutral-900 pb-5">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-purple-500/10 text-purple-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-purple-500/20 flex items-center gap-1">
                          <Crown size={10} /> دورة صيف 2026 المستدامة
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-[10px] font-black text-emerald-400">نشط الآن</span>
                      </div>
                      <h4 className="text-lg sm:text-xl font-black text-white leading-tight">🏆 بطولة صيف الأوتاكو الكبرى (الموسم الأول)</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        أكبر حدث جماهيري بالمنصة يربط تفاعل المجتمع بنظام كسب بطولي مستمر! أثبت وجودك وشاهد الأنميات، شارك بالمراجعات والتقييمات، وحارب لرفع قبيلتك ومراكزك طيلة فصل الصيف للحصول على جوائز أسطورية حقيقية تفخر بها في صفحتك وقناتك الشخصية.
                      </p>
                    </div>

                    <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-1 bg-[#121212] p-3 rounded-2xl border border-neutral-800/80">
                      <span className="text-[9px] font-bold text-neutral-500">جائزة بطل الصيف 👑</span>
                      <strong className="text-sm font-black text-yellow-500 text-left">لقب "وصي العرش الأول" + 10,000 عملة غورد</strong>
                    </div>
                  </div>

                  {/* Operational indicators */}
                  <div className="grid grid-cols-3 gap-3 my-5">
                    <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-3 text-center space-y-1">
                      <Calendar size={16} className="text-purple-400 mx-auto" />
                      <span className="block text-[9px] text-neutral-500 font-bold">تاريخ الانتهاء</span>
                      <strong className="block text-[11px] text-neutral-200 font-bold">31 سبتمبر 2026</strong>
                    </div>
                    <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-3 text-center space-y-1">
                      <Users size={16} className="text-indigo-400 mx-auto" />
                      <span className="block text-[9px] text-neutral-500 font-bold">إجمالي المتنافسين</span>
                      <strong className="block text-[11px] text-neutral-200 font-bold">4,892 أوتاكو</strong>
                    </div>
                    <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-3 text-center space-y-1">
                      <Award size={16} className="text-yellow-500 mx-auto" />
                      <span className="block text-[9px] text-neutral-500 font-bold">رتبتك الحالية</span>
                      <strong className="block text-[11px] text-yellow-500 font-black">
                        {seasonalJoined ? `#${myRank} في صدارة الدوري` : 'غير مسجل'}
                      </strong>
                    </div>
                  </div>

                  {/* Enrollment Call to action */}
                  <div className="mt-4">
                    {seasonalJoined ? (
                      <div className="bg-purple-950/10 border border-purple-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center animate-pulse">
                            <CheckCircle2 size={20} />
                          </div>
                          <div>
                            <span className="text-neutral-400 text-[10px] block font-bold">لقد انضممت للدورة الصيفية بنجاح</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-white text-xs font-black">رصيدك بالموسم الحالي:</span>
                              <strong className="text-purple-400 font-black text-sm">{seasonalPoints} نقطة 🌟</strong>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onNavigate?.('games')}
                          className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-black text-xs px-5 py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-lg shadow-purple-600/10"
                        >
                          <PlayCircle size={14} /> العب الألعاب لرفع رصيدك
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleJoinSeasonal}
                        className="w-full bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-[0.98] shadow-lg shadow-purple-600/20 cursor-pointer text-center"
                      >
                        <Zap fill="currentColor" size={18} /> انضم لدوري الصيف المستمر وابدأ كسب النقاط ! 🚀
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Quests And Challenges Section */}
              <div>
                <div className="flex items-center justify-between mb-4.5">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <CheckCircle2 className="text-purple-400" size={18} />
                    <span>تحديات ومهام دوري الصيف لتجميع النقاط</span>
                  </h3>
                  <span className="text-[10px] font-bold text-neutral-500">أثبت إثباتاتك بنقرة واحدة 📜</span>
                </div>

                <div className="grid gap-3">
                  {seasonalQuests.map((q) => (
                    <div 
                      key={q.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-4 ${
                        q.completed
                          ? 'bg-neutral-950/40 border-neutral-900/80 opacity-60'
                          : 'bg-[#0a0a0a]/90 border-neutral-800 hover:border-neutral-700/80'
                      }`}
                    >
                      <div className="flex items-start gap-3 text-right w-full">
                        <div className={`p-2.5 rounded-xl text-xs shrink-0 font-bold ${
                          q.completed 
                            ? 'bg-neutral-800 text-neutral-500' 
                            : q.type === 'watch' 
                              ? 'bg-red-500/10 text-red-400 border border-red-500/10'
                              : q.type === 'review'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                                : q.type === 'trivia'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10'
                                  : 'bg-green-500/10 text-green-400 border border-green-500/10'
                        }`}>
                          {q.type === 'watch' ? '📺 مشاهدة' : q.type === 'review' ? '✍️ مراجعة' : q.type === 'trivia' ? '🎮 أسئلة' : '💬 توصية'}
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                            {q.title}
                            {q.completed && <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/10">مستلم ✓</span>}
                          </h4>
                          <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">{q.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-900">
                        <span className="bg-purple-500/10 text-purple-400 text-xs sm:text-xs font-black px-2.5 py-1.5 rounded-xl border border-purple-500/10 shrink-0">
                          +{q.points} نقطة
                        </span>

                        {!q.completed ? (
                          <button
                            type="button"
                            onClick={() => completeQuest(q.id, q.points, 'seasonal')}
                            className="bg-neutral-900 border border-neutral-800 hover:bg-purple-600 hover:text-white hover:border-purple-500 text-neutral-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer"
                          >
                            تسليم وفحص 📜
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-neutral-500 flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-emerald-500" /> مكتمل ومضاف
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="weekly-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Weekly Tournament Detail Card (Intermittent status highlighted) */}
              <div className="rounded-3xl p-[1px] bg-gradient-to-br from-amber-500/20 via-neutral-850 to-red-500/20 shadow-xl">
                <div className="bg-[#0c0c0c] rounded-[23px] overflow-hidden relative p-6">
                  {/* Glowing warning tag and background */}
                  <div className="absolute top-0 right-0 w-48 h-48 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-36 h-36 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10 border-b border-neutral-900 pb-5">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-500/10 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                          <Clock size={10} /> البطولة الأسبوعية الخاطفة
                        </span>
                        <span className="bg-red-500/10 text-red-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-500/20">
                          متقطعة (تنشط كل خميس/جمعة)
                        </span>
                      </div>
                      <h4 className="text-lg sm:text-xl font-black text-white leading-tight">⚡ معركة خبراء "بليتش وحرب الألف عام"</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        مسابقتنا الخاطفة تخمل طوال الأسبوع وبمجرد قدوم عطلة نهاية الأسبوع تشتعل المبارزة! تتطلب المعرفة بالأغاني والأوتار وتسميات الشينيغامي. تتغير البطولة أسبوعياً بمواضيع مختلفة تماماً لمزج نكهة الأوتاكو العريق!
                      </p>
                    </div>

                    <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-1 bg-[#121212] p-3 rounded-2xl border border-neutral-800/80">
                      <span className="text-[9px] font-bold text-neutral-500 font-sans">جوائز هذا الأسبوع 📦</span>
                      <strong className="text-sm font-black text-amber-400 text-left">شارة "صاقل السيف الروحي" + 2,000 عملة</strong>
                    </div>
                  </div>

                  {/* Operational indicators \& live clock */}
                  <div className="grid grid-cols-3 gap-3 my-5">
                    <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-3 text-center space-y-1">
                      <Timer size={16} className="text-red-400 mx-auto" />
                      <span className="block text-[9px] text-neutral-500 font-bold">تنتهي المبارزة خلاال</span>
                      <strong className="block text-[11px] text-red-400 font-black tracking-wider">
                        {String(weeklyTimeLeft.hours).padStart(2, '0')}:{String(weeklyTimeLeft.minutes).padStart(2, '0')}:{String(weeklyTimeLeft.seconds).padStart(2, '0')}
                      </strong>
                    </div>
                    <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-3 text-center space-y-1">
                      <Users size={16} className="text-amber-400 mx-auto" />
                      <span className="block text-[9px] text-neutral-500 font-bold">مقاتلو العطلة</span>
                      <strong className="block text-[11px] text-neutral-200 font-bold">1,780 مقاتل وبطل</strong>
                    </div>
                    <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-3 text-center space-y-1">
                      <Award size={16} className="text-red-500 mx-auto" />
                      <span className="block text-[9px] text-neutral-500 font-bold">موقع صدارتك الأسبوعية</span>
                      <strong className="block text-[11px] text-amber-400 font-black">
                        {weeklyJoined ? `#${myRank} على صنف بليتش` : 'لم يتم التسجيل'}
                      </strong>
                    </div>
                  </div>

                  {/* Enrollment action for Weekly */}
                  <div className="mt-4">
                    {weeklyJoined ? (
                      <div className="bg-amber-950/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-right">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center animate-pulse">
                            <CheckCircle2 size={20} />
                          </div>
                          <div>
                            <span className="text-neutral-400 text-[10px] block font-bold">دخولك نشط وموثق لتحدي الأسبوع الأصعب</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-white text-xs font-black">رصيدك الأسبوعي:</span>
                              <strong className="text-amber-400 font-black text-sm">{weeklyPoints} نقطة خاطفة ⚡</strong>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onNavigate?.('games')}
                          className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white font-black text-xs px-5 py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-lg shadow-amber-600/10"
                        >
                          <PlayCircle size={14} /> حل تحديات بليتش الآن
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleJoinWeekly}
                        className="w-full bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-[0.98] shadow-lg shadow-amber-600/20 cursor-pointer text-center"
                      >
                        <Flame fill="currentColor" size={18} className="animate-pulse" /> انضم لمعركة بليتش الأسبوعية الخاطفة الآن ! ⚡
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Weekly Quests Section */}
              <div>
                <div className="flex items-center justify-between mb-4.5">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <CheckCircle2 className="text-amber-400" size={18} />
                    <span>تحديات السيف الروحي الخاطفة (تتوفر الآن)</span>
                  </h3>
                  <span className="text-[10px] font-bold text-neutral-500">حل المهام الأسبوعية وتصدر الترتيب ⛓️</span>
                </div>

                <div className="grid gap-3">
                  {weeklyQuests.map((q) => (
                    <div 
                      key={q.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-4 ${
                        q.completed
                          ? 'bg-neutral-950/40 border-neutral-900/80 opacity-60'
                          : 'bg-[#0a0a0a]/90 border-neutral-800 hover:border-neutral-700/80'
                      }`}
                    >
                      <div className="flex items-start gap-3 text-right w-full">
                        <div className={`p-2.5 rounded-xl text-xs shrink-0 font-bold ${
                          q.completed 
                            ? 'bg-neutral-800 text-neutral-500' 
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/10'
                        }`}>
                          {q.type === 'trivia' ? '⚔️ قتال روحي' : '🎬 مبارزة'}
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                            {q.title}
                            {q.completed && <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/10">مكتمل ✓</span>}
                          </h4>
                          <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">{q.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-900">
                        <span className="bg-amber-500/10 text-amber-400 text-xs sm:text-xs font-black px-2.5 py-1.5 rounded-xl border border-amber-500/10 shrink-0">
                          +{q.points} نقطة
                        </span>

                        {!q.completed ? (
                          <button
                            type="button"
                            onClick={() => completeQuest(q.id, q.points, 'weekly')}
                            className="bg-neutral-900 border border-neutral-800 hover:bg-amber-600 hover:text-white hover:border-amber-500 text-neutral-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer"
                          >
                            إثبات الانتهاء 💫
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-neutral-500 flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-amber-500" /> تمت الإضافة
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Standings / Leaderboard Section */}
        <section className="bg-neutral-950 p-[1px] rounded-3xl border border-neutral-900">
          <div className="bg-[#080808] p-5 rounded-[23px] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Crown className="text-yellow-500" size={18} />
                <span>جدول ترتيب المتنافسين النشط ببطولة {activeTab === 'seasonal' ? 'دور الصيف الكبرى' : 'تحديات الأسبوع الخاطفة'}</span>
              </h3>
              
              <div className="flex items-center gap-1 text-[10px] bg-neutral-900 border border-neutral-800 px-2 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-neutral-400 font-bold font-sans">تحديث حي ومباشر</span>
              </div>
            </div>

            {/* List Table of leaders */}
            <div className="space-y-2.5">
              {currentLeaders.map((lead, index) => {
                const isMe = lead.isMe;
                const scoreUpdatedKey = isMe ? (activeTab === 'seasonal' ? 'animate-[pulse_1s_infinite]' : '') : '';
                
                return (
                  <div 
                    key={lead.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      isMe 
                        ? activeTab === 'seasonal'
                          ? 'bg-purple-950/15 border-purple-500 ring-1 ring-purple-500/30'
                          : 'bg-amber-950/15 border-amber-500 ring-1 ring-amber-500/30'
                        : 'bg-[#0b0b0b] border-neutral-900 hover:border-neutral-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank Indicator */}
                      <div className="w-6 shrink-0 text-center">
                        {index === 0 ? (
                          <span className="text-lg">🥇</span>
                        ) : index === 1 ? (
                          <span className="text-lg">🥈</span>
                        ) : index === 2 ? (
                          <span className="text-lg">🥉</span>
                        ) : (
                          <span className="text-[11px] font-sans font-black text-neutral-500">#{index + 1}</span>
                        )}
                      </div>

                      {/* Avatar represent */}
                      <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-lg shrink-0 shadow-inner">
                        {lead.avatar}
                      </div>

                      {/* User Info */}
                      <div className="text-right">
                        <h5 className={`text-xs font-black flex items-center gap-1.5 ${isMe ? 'text-white' : 'text-neutral-300'}`}>
                          {lead.name}
                          {isMe && (
                            <span className="text-[8px] font-black bg-purple-500/25 px-1.5 py-0.5 rounded border border-purple-500/20 text-purple-300">
                              رقمك الحالي 🎯
                            </span>
                          )}
                        </h5>
                        <p className="text-[9px] text-neutral-500 font-bold block mt-0.5">{lead.badge}</p>
                      </div>
                    </div>

                    <div className="text-left flex items-center gap-3">
                      <div className="text-right">
                        <strong className={`block text-xs font-sans font-black ${isMe ? 'text-purple-400' : 'text-white'}`}>
                          {lead.points}
                        </strong>
                        <span className="text-[8px] text-neutral-500 block">نقطة مسجلة</span>
                      </div>
                      
                      {/* Position Trend */}
                      <div className={`p-1.5 rounded-lg text-[10px] font-bold shrink-0 ${
                        index < 3 
                          ? 'bg-green-500/10 text-green-400' 
                          : 'bg-neutral-900 text-neutral-500'
                      }`}>
                        <TrendingUp size={12} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Informative guidelines footer block */}
        <div className="bg-[#080808] border border-neutral-900 p-4 rounded-3xl space-y-2 text-right">
          <h5 className="text-xs font-black text-white flex items-center gap-1.5">
            <Info size={14} className="text-purple-400" />
            <span>لوائح وقوانين اللعب والدرجات بالمواسم</span>
          </h5>
          <p className="text-[10px] text-neutral-400 leading-relaxed font-medium">
            يتم احتساب النقاط بناءً على فحص نشاط حسابك الفعلي طيلة أيام الصيف للبطولة الموسمية. أما البطولة الأسبوعية فلها طابع "متقطع" ينتهي بحلول مغرب السبت من كل أسبوع. إساءة الاستخدام أو استخدام برمجيات التخمين الآلية ستعرض حسابك للاستبعاد والتحجيم وصفر النقاط المكتسبة مباشرة من الإدارة فلتلعب بنزاهة وشغف!
          </p>
        </div>

      </div>
    </div>
  );
}
