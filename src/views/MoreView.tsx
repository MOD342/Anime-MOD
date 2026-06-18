import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserCircle, 
  Gamepad2, 
  CalendarDays, 
  Trophy, 
  ShoppingCart, 
  Shield, 
  LogOut, 
  ChevronLeft, 
  Heart, 
  Lock, 
  Bell,
  Sparkles,
  Coins,
  Star,
  Gift,
  Crown,
  Zap,
  ChevronRight,
  Flame,
  LayoutGrid,
  Tv,
  HelpCircle,
  MessageSquare,
  CreditCard,
  Users,
  Newspaper
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { moderationService } from '../services/moderationService';
import { STORE_ITEMS_SORTED, getAvatarShapeClass } from '../data/storeItems';

interface MoreViewProps {
  onNavigate: (view: string, props?: any) => void;
}

export default function MoreView({ onNavigate }: MoreViewProps) {
  const { user, signIn, logout, userData } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const userLevel = userData?.level || 1;

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        try {
          const role = await moderationService.getCurrentUserRole();
          setIsAdmin(role === 'admin' || role === 'owner' || role === 'moderator');
        } catch (e) {
          console.error("Error fetching role on More screen:", e);
        }
      }
    };
    checkAdmin();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      onNavigate('home');
    } catch(e) {
      console.error(e);
    }
  };

  // Safe equipped items calculations
  const equipped = useMemo(() => {
    const avatarId = userData?.equippedAvatar || null;
    const frameId = userData?.equippedFrame || null;
    const titleId = userData?.equippedTitle || null;
    const badgeId = userData?.equippedBadge || null;

    return {
      avatar: STORE_ITEMS_SORTED.find(i => i.id === avatarId),
      frame: STORE_ITEMS_SORTED.find(i => i.id === frameId),
      title: STORE_ITEMS_SORTED.find(i => i.id === titleId),
      badge: STORE_ITEMS_SORTED.find(i => i.id === badgeId),
    };
  }, [userData]);

  const currentLevel = userData?.level || 1;
  const xpNeededForNext = Math.floor(Math.pow(currentLevel, 1.5) * 500) + 500;
  const currentXp = userData?.xp || 0;
  const levelProgress = Math.min(100, Math.max(0, (currentXp / xpNeededForNext) * 100));

  const avatarImg = equipped.avatar?.img || user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'Felix'}`;

  // Organization of items into stylish themed categories
  const categories = [
    {
      title: '👤 الحساب والمزايا الشخصية',
      items: [
        { id: 'profile', label: 'ملف حسابي الخاص', desc: 'تعديل بيانات الحساب، تفعيل الألقاب الأسطورية ومعاينة الإنجازات', icon: UserCircle, color: 'text-sky-400', bg: 'bg-sky-500/10' },
        { id: 'favorites', label: 'المفضلة للمسلسلات', desc: 'قائمة أعمال الأنمي التي قمت بتفضيلها وحفظها لمشاهدتها لاحقاً', icon: Heart, color: 'text-rose-400', bg: 'bg-rose-500/10' },
        { id: 'rewards', label: 'صندوق المهام والمكافآت', desc: 'العجلة الدوارة الحظية، والمهام اليومية السريعة لكسب الكوينز والذهب', icon: Gift, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
        { id: 'level_perks', label: 'امتيازات المستويات والرتب', desc: 'جدول المزايا الحصرية والصلاحيات المحصودة لمستواك الحالي', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        { id: 'notifications', label: 'الإشعارات والتنبيهات العامة', desc: 'قائمة التنبيهات المباشرة والحصرية المرسلة من الإدارة والأصدقاء', icon: Bell, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
      ]
    },
    {
      title: '⛩️ الساحات المفتوحة والألعاب',
      items: [
        { id: 'games', label: 'ألعاب وفعاليات الأنمي التفاعلية', desc: 'تحدا ذكاء الأصدقاء في: القاتل الصامت، من القائل، تشاريديس والرياضيات', icon: Gamepad2, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        { id: 'tournaments', label: 'تحديات البطولات الكبرى', desc: 'شارك بمسابقات الأوتوكو وتأهل للمراحل النهائية لكسب الشارات النادرة', icon: Trophy, color: 'text-red-400', bg: 'bg-red-500/10' },
        { id: 'leaderboard', label: 'قاعة مشاهير الأوتوكو والعالم', desc: 'الترتيب العام والمنافسة المفتوحة لأقوى الأعضاء في المستويات والعملات', icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
      ]
    },
    {
      title: '🎌 مواعيد الحلقات والزخرفة الخارجية',
      items: [
        { id: 'schedule', label: 'جدول بث الحلقات اليومي', desc: 'مواقيت وأيام صدور وإطلاق الحلقات للأعمال المستمرة أولاً بأول', icon: CalendarDays, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { id: 'store', label: 'متجر تزيين الحساب الحصري', desc: 'شراء الأطارات النادرة والرايات الخلفية اللامعة والألقاب المضيئة', icon: ShoppingCart, color: 'text-orange-400', bg: 'bg-orange-500/10' },
      ]
    },
    {
      title: '💰 الدعم والتواصل',
      items: [
        { id: 'support_help', label: 'الدعم والتواصل', desc: 'بوابة الدعم المالي والإعلاني، وتواصل مباشر مع الإدارة والقروب والشكاوى مجمعة في مكان واحد', icon: HelpCircle, color: 'text-red-400', bg: 'bg-[#FF1744]/15' },
      ]
    }
  ];

  if (isAdmin) {
    categories.push({
      title: '👑 السلطة الرقابية والتحكم العام',
      items: [
        { id: 'admin', label: 'لوحة القيادة والإدارة الشاملة', desc: 'إشراف وبث البرودكاست التفاعلي، وإدارة البلاغات والتحليلات للأعضاء', icon: Shield, color: 'text-red-500', bg: 'bg-red-500/10' }
      ]
    });
  }

  return (
    <div className="pb-24 pt-8 px-4 md:px-8 space-y-8 max-w-4xl mx-auto font-sans text-right" dir="rtl" id="container_more_view">
      
      {/* Header and subtitle with high visual styling */}
      <div className="flex flex-col gap-2 border-b border-neutral-900 pb-5">
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-l from-white via-neutral-100 to-neutral-400 flex items-center gap-3">
          <LayoutGrid className="text-[#FF1744]" size={28} />
          <span>المزيد من المزايا</span>
        </h1>
        <p className="text-xs text-neutral-400 leading-relaxed font-sans max-w-xl">
          أهلاً بك في البوابة الشاملة لأوتوكو الأنمي العربي. تحكّم في ملف شخصيتك المجهزة بزخارف، وتابع جدول الحلقات الأسبوعي أو خض غمار الألعاب والبطولات التفاعلية في الساحات.
        </p>
      </div>
      
      {/* Dynamic Profile/Authentication Segment */}
      <AnimatePresence mode="wait">
        {user ? (
          <motion.div 
            key="logged_in_card"
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -15 }}
            className="relative overflow-hidden bg-gradient-to-br from-neutral-950 via-[#0a0a0f] to-neutral-950 border border-neutral-850 shadow-2xl rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-center md:items-start justify-between"
            id="user_authenticated_profile"
          >
            {/* Background glowing particles pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row gap-5 items-center md:items-start text-center md:text-right w-full md:w-auto relative z-10">
              
              {/* Equipped Avatar frame visuals */}
              <div className="relative shrink-0 flex items-center justify-center">
                {equipped.frame ? (
                  <div className={`p-1.5 ${equipped.frame.frameStyle} ${getAvatarShapeClass(equipped.frame.avatarShape)} relative flex items-center justify-center overflow-hidden w-20 h-20 bg-black`}>
                    <img 
                      src={avatarImg} 
                      className={`w-full h-full object-cover ${getAvatarShapeClass(equipped.frame.avatarShape)}`} 
                      referrerPolicy="no-referrer"
                      alt="" 
                    />
                  </div>
                ) : (
                  <div className="w-18 h-18 rounded-full ring-2 ring-neutral-800 bg-black overflow-hidden flex items-center justify-center p-0.5">
                    <img 
                      src={avatarImg} 
                      className="w-full h-full object-cover rounded-full" 
                      referrerPolicy="no-referrer"
                      alt="" 
                    />
                  </div>
                )}
                
                {/* Embedded level badge on avatar */}
                <div className="absolute -bottom-1.5 -left-1 bg-[#FF1744] text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-black shadow shadow-black flex items-center gap-0.5">
                  <Star size={8} className="fill-white" />
                  <span>{currentLevel}</span>
                </div>
              </div>

              {/* Identity labels and details */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
                  <h3 className="text-white font-black text-lg">{user.displayName || 'أوتاكو مميز'}</h3>
                  
                  {/* Equipped Active customized user badge */}
                  {equipped.badge && (
                    <span className="text-[10px] font-black bg-yellow-500/10 border border-yellow-500/25 text-yellow-500 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles size={10} className="text-yellow-400 animate-spin-slow" />
                      {equipped.badge.name}
                    </span>
                  )}
                </div>

                {/* Equipped user custom glowing title */}
                {equipped.title ? (
                  <p className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-l from-yellow-400 via-amber-300 to-yellow-500 tracking-wider filter drop-shadow inline-block">
                     ★ {equipped.title.name} ★
                  </p>
                ) : (
                  <p className="text-xs text-neutral-400">{user.email}</p>
                )}

                {/* Mini Coins counter in header */}
                <div className="pt-2 flex items-center justify-center md:justify-start gap-1.5">
                  <div className="bg-yellow-500/10 border border-yellow-500/15 px-3 py-1 rounded-xl flex items-center gap-1.5 text-yellow-400">
                    <Coins size={14} className="animate-pulse" />
                    <span className="text-xs font-black">{userData?.coins || 0} كوينز</span>
                  </div>
                  
                  {isAdmin && (
                    <div className="bg-red-500/10 border border-red-500/15 px-3 py-1 rounded-xl flex items-center gap-1 text-red-400 text-xs font-black select-none">
                      <Shield size={12} />
                      <span>طاقم الإدارة</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Comprehensive Level/XP Progress component */}
            <div className="w-full md:w-64 space-y-2 relative z-10 self-center md:self-start mt-2 md:mt-0 pt-3 md:pt-1 border-t md:border-t-0 md:border-r border-neutral-900 md:pr-6">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-bold">مستوى الخبرة الحالية</span>
                <span className="text-white font-mono font-bold">{currentXp} / {xpNeededForNext} <span className="text-neutral-500 text-[10px]">XP</span></span>
              </div>
              
              {/* Styled progress bar */}
              <div className="w-full h-3 bg-neutral-950 rounded-full overflow-hidden p-0.5 border border-neutral-900/40">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[#FF1744] via-rose-500 to-red-600 shadow-[0_0_8px_rgba(255,23,68,0.4)] transition-all duration-500"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>

              <p className="text-[10px] text-neutral-500 text-center md:text-left">
                المتبقي لفل {currentLevel + 1}: <span className="text-neutral-300 font-bold">{Math.max(0, xpNeededForNext - currentXp)} XP</span>
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="logged_out_card"
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -15 }}
            className="relative overflow-hidden bg-gradient-to-br from-[#FF1744]/15 via-red-950/10 to-neutral-950 rounded-3xl p-6 border border-red-950/30 text-center flex flex-col items-center justify-center gap-4 mb-6 shadow-xl"
            id="user_anonymous_welcome"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#FF1744]/10 border border-[#FF1744]/20 flex items-center justify-center text-[#FF1744] animate-bounce">
              <UserCircle size={32} />
            </div>
            
            <div className="max-w-md space-y-1">
              <h3 className="text-white font-black text-lg">بوابة الأصدقاء والزوار</h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                سجل دخولك بنقرة سريعة وحفظ مسلسلاتك في المفضلة، وخض مسابقات ألعاب الأنمي وشراء الإطارات والخلفيات النادرة لمستواك في سوق كوينز المتجر.
              </p>
            </div>

            <button 
              id="btn_sign_in_more"
              onClick={signIn} 
              className="mt-2 bg-gradient-to-r from-[#FF1744] to-red-600 hover:scale-103 text-white font-black py-2.5 px-8 rounded-xl transition shadow-[0_0_20px_rgba(255,23,68,0.4)] cursor-pointer text-xs"
            >
              تسجيل الدخول / إنشاء حساب 🦊
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Structured Category Clusters - Bento list style */}
      <div className="space-y-8">
        {categories.map((cat, catIdx) => (
          <div key={catIdx} className="space-y-4">
            
            {/* Category title label */}
            <h4 className="text-xs font-black text-neutral-400 tracking-wider flex items-center gap-2 pr-1 select-none">
              <span className="w-1.5 h-3 bg-[#FF1744] rounded-full" />
              {cat.title}
            </h4>

            {/* Category Option components grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {cat.items.map((item, itemIdx) => {
                const requiresLogin = ['profile', 'games', 'leaderboard', 'store', 'admin', 'tournaments', 'notifications', 'rewards', 'level_perks'].includes(item.id);
                if (!user && requiresLogin) return null;

                return (
                  <motion.button
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: itemIdx * 0.04 + catIdx * 0.1 }}
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className="group relative overflow-hidden bg-gradient-to-b from-[#09090c] to-[#050507] border border-neutral-900 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-3 transition-all hover:bg-neutral-900 hover:border-neutral-800 hover:-translate-y-0.5 active:translate-y-0 shadow-lg active:shadow-sm min-h-[120px]"
                    id={`btn_more_menu_${item.id}`}
                  >
                    {/* Hover light indicator decoration */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/3 to-transparent rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${item.bg} group-hover:scale-110 transition-transform duration-300`}>
                      <item.icon className={item.color} size={22} />
                    </div>
                    
                    <span className="text-white font-black text-xs md:text-sm group-hover:text-[#FF1744] transition-colors leading-tight">
                      {item.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Beautiful logout control */}
      {user && (
        <motion.button 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.35 }}
          onClick={handleLogout}
          className="w-full mt-4 bg-gradient-to-r from-red-950/10 to-red-950/5 hover:from-red-950/20 hover:to-red-950/15 text-[#FF1744] border border-red-900/15 hover:border-red-500/20 p-4 rounded-2xl flex items-center justify-center gap-2 font-black transition-all text-xs group cursor-pointer shadow-md"
          id="btn_logout_more"
        >
          <LogOut size={16} className="group-hover:translate-x-1 transition-transform" /> 
          <span>تسجيل خروج الحساب المتصل الحالي</span>
        </motion.button>
      )}

      {/* Elegant minimalist credits footer */}
      <div className="text-center text-[10px] text-neutral-600 font-sans pt-6 border-t border-neutral-900 flex flex-col items-center justify-center gap-1 select-none" id="footer_signature_more">
         <span>منصة عالم الأوتوكو العربي الحصرية والذكية • إصدار 2026.6.6</span>
         <span className="font-mono text-[9px] text-[#FF1744]/70 font-black tracking-widest uppercase">بواسطة المطور الإشرافي: MOD-342 🛡️</span>
      </div>
    </div>
  );
}
