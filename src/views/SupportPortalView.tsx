import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  HelpCircle, 
  MessageSquare, 
  Send, 
  FileText, 
  CreditCard, 
  Users, 
  Newspaper, 
  ExternalLink, 
  Info,
  CheckCircle2,
  AlertCircle,
  Play, 
  Tv, 
  Coins, 
  Gift, 
  Clock, 
  AlertTriangle, 
  Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../firebaseUtils';
import AdScriptRunner from '../components/AdScriptRunner';

interface SupportPortalViewProps {
  onBack: () => void;
  initialTab?: 'ad_support' | 'help' | 'suggestions' | 'donate' | 'chat' | 'news';
}

// Custom mock ads to rotate beautifully
const SAMPLE_ADS = [
  {
    sponsor: "أنمي فيرس - منصة الأكواب والملابس الحصرية",
    title: "احصل على كنزك الخاص من أكواب شخصياتك المفضلة! خصم 25% ورمز ترويجي OTAKU25.",
    bgGradient: "from-purple-900 via-indigo-950 to-neutral-950",
    bannerUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=60"
  },
  {
    sponsor: "متجر اليابان المدهش - كاندي بوكس مستورد",
    title: "جرب نكهات سكاكر اليابان التقليدية والرامن اللذيذ مباشرة لباب بيتك بأسعار منافسة.",
    bgGradient: "from-pink-900 via-rose-950 to-neutral-950",
    bannerUrl: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=600&auto=format&fit=crop&q=60"
  },
  {
    sponsor: "مجتمع مانجا تي في الأصلي",
    title: "أطلق العنان لشغفك، وشارك في تقييم الفصول الحديثة ومناقشة نظريات ون بيس في تجمع كبار الأوتاكو.",
    bgGradient: "from-emerald-950 via-teal-950 to-neutral-950",
    bannerUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=60"
  },
  {
    sponsor: "ألعاب طوكيو الأسطورية",
    title: "مجسمات أنمي نادرة وحصرية لوفي ترانسفورميشن، زورو، وناروتو ستاتيو. جودة يابانية أصلية 100%.",
    bgGradient: "from-red-950 via-zinc-950 to-neutral-950",
    bannerUrl: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&auto=format&fit=crop&q=60"
  }
];

// Sample anime news to display beautifully
const INTEGRATED_ANIME_NEWS = [
  {
    id: 'n1',
    title: "رسمياً: الإعلان عن الموسم الجديد والمتمم لأنمي منقذ الأرواح في خريف 2026",
    desc: "أكد استوديو مابا الشهير رسمياً بدء العمل الإنتاجي الفعلي على الجزء النهائي والمتمم للرواية بتمويل ضخم يضمن معارك بصرية وثورية مبهرة.",
    date: "قبل يومين",
    category: "أخبار الموسم",
    imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=60"
  },
  {
    id: 'n2',
    title: "مبيعات مانجا قاتل الشياطين تكسر حاجز الـ 160 مليون نسخة على مستوى العالم",
    desc: "أعلنت دار النشر اليابانية الرسمية عن وصول المانجا لأرقام قياسية وتاريخية جديدة لتتربع على صدارة المبيعات السنوية متفوقة على العمالقة.",
    date: "أمس",
    category: "أخبار المانجا",
    imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=60"
  },
  {
    id: 'n3',
    title: "فيلم الأنمي الجديد للمخرج هاياو ميازاكي يفوز بجائزة أوسكار التاريخية للصناعة",
    desc: "في حفل الأوسكار المقام، حصد الفيلم الأخير جائزة أفضل فيلم رسوم متحركة طويل، مشيداً بالعمق القصصي والرسم اليدوي الدقيق للفنانين.",
    date: "قبل 4 أيام",
    category: "أفلام",
    imageUrl: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=600&auto=format&fit=crop&q=60"
  }
];

export default function SupportPortalView({ onBack, initialTab = 'ad_support' }: SupportPortalViewProps) {
  const { user, userData } = useAuth();

  // Route support_donate and support_chat to 'help'
  const getMappedTab = (tab: string) => {
    if (tab === 'donate' || tab === 'chat' || tab === 'help') return 'help';
    if (tab === 'suggestions') return 'suggestions';
    if (tab === 'news') return 'news';
    return 'ad_support';
  };

  const [activeSubTab, setActiveSubTab] = useState<'ad_support' | 'help' | 'suggestions' | 'news'>(getMappedTab(initialTab));

  // Dynamic Telegram URLs fetched from DB
  const [helpTelegramUrl, setHelpTelegramUrl] = useState('https://t.me/otaku_help_support');
  const [groupTelegramUrl, setGroupTelegramUrl] = useState('https://t.me/otaku_group_chat');
  const [donateTelegramUrl, setDonateTelegramUrl] = useState('https://t.me/otaku_owner');
  const [loadingLinks, setLoadingLinks] = useState(false);

  // Suggestions state
  const [suggestionType, setSuggestionType] = useState<'suggestion' | 'complaint'>('suggestion');
  const [suggestionMessage, setSuggestionMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // AD SUPPORT STATE LOGIC
  const todayDateStr = new Date().toISOString().split('T')[0];
  const storageCountKey = `ad_watches_${user?.id || 'guest'}_${todayDateStr}`;

  const [watchedToday, setWatchedToday] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(storageCountKey);
      return stored ? parseInt(stored) : 0;
    } catch {
      return 0;
    }
  });

  const [activeAd, setActiveAd] = useState<typeof SAMPLE_ADS[0] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState(12);
  const [rewardGranted, setRewardGranted] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [limitError, setLimitError] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);

  // Dynamic monetization configuration
  const [monetization, setMonetization] = useState<{
    mode: 'simulation' | 'direct_link' | 'script';
    directLinkUrl: string;
    scriptCode: string;
    stayTime: number;
    rewardCoins: number;
  }>({
    mode: 'direct_link',
    directLinkUrl: 'https://www.effectivecpmnetwork.com/pt97wb2w?key=f76147a23264a74437b153780898337a',
    scriptCode: '',
    stayTime: 12,
    rewardCoins: 25
  });

  const DAILY_LIMIT = 20;

  // Loading admin-defined telegram links and monetization settings from database
  useEffect(() => {
    const fetchSettings = async () => {
      setLoadingLinks(true);
      try {
        const linkDoc = await getDoc(doc(db, 'globalSettings', 'telegramLinks'));
        if (linkDoc.exists()) {
          const data = linkDoc.data();
          if (data.helpTelegramUrl) setHelpTelegramUrl(data.helpTelegramUrl);
          if (data.groupTelegramUrl) setGroupTelegramUrl(data.groupTelegramUrl);
          if (data.donateTelegramUrl) setDonateTelegramUrl(data.donateTelegramUrl);
        }

        const monetizationDoc = await getDoc(doc(db, 'globalSettings', 'monetization'));
        if (monetizationDoc.exists()) {
          const data = monetizationDoc.data();
          setMonetization({
            mode: data.mode ?? 'direct_link',
            directLinkUrl: data.directLinkUrl ?? 'https://www.effectivecpmnetwork.com/pt97wb2w?key=f76147a23264a74437b153780898337a',
            scriptCode: data.scriptCode ?? '',
            stayTime: data.stayTime ?? 12,
            rewardCoins: data.rewardCoins ?? 25
          });
        }
      } catch (err) {
        console.warn("Could not download system settings, using fallbacks:", err);
      } finally {
        setLoadingLinks(false);
      }
    };
    fetchSettings();
  }, [user]);

  // Ad simulation playing or opening direct links
  const startAdPlay = () => {
    if (watchedToday >= DAILY_LIMIT) {
      setLimitError(true);
      return;
    }

    setLimitError(false);
    setPopupBlocked(false);

    if (monetization.mode === 'direct_link') {
      let popupWin: Window | null = null;
      try {
        popupWin = window.open(monetization.directLinkUrl, '_blank');
      } catch (e) {
        console.warn("Popup blocked automatically due to iframe sandbox or browser block:", e);
      }

      // Check if popup got blocked
      if (!popupWin || popupWin.closed || typeof popupWin.closed === 'undefined') {
        setPopupBlocked(true);
      }

      setIsPlaying(true);
      setCountdown(monetization.stayTime);
      setRewardGranted(null);
    } else if (monetization.mode === 'script') {
      setIsPlaying(true);
      setCountdown(monetization.stayTime);
      setRewardGranted(null);
    } else {
      const randAd = SAMPLE_ADS[Math.floor(Math.random() * SAMPLE_ADS.length)];
      setActiveAd(randAd);
      setIsPlaying(true);
      setCountdown(monetization.stayTime);
      setRewardGranted(null);
    }
  };

  // Timer loop when an ad is playing
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (isPlaying && countdown === 0) {
      finishAdPlay();
    }
    return () => clearTimeout(timer);
  }, [isPlaying, countdown]);

  // Finish ad play logic
  const finishAdPlay = async () => {
    setIsPlaying(false);
    const coinsReward = monetization.rewardCoins;
    const xpReward = Math.floor(Math.random() * 105) + 100;

    setRewardGranted(coinsReward);
    const newCount = watchedToday + 1;
    setWatchedToday(newCount);

    try {
      localStorage.setItem(storageCountKey, newCount.toString());
    } catch (e) {
      console.warn("Storage write error:", e);
    }

    if (user?.id) {
      setIsSyncing(true);
      try {
        const { updateDoc, increment } = await import('firebase/firestore');
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          coins: increment(coinsReward),
          xp: increment(xpReward)
        });
      } catch (err) {
        console.error("Firestore coins reward fail:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Handle suggestions submissions
  const handleSendSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionMessage.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'suggestions'), {
        userId: user?.id || 'guest_user',
        email: user?.email || 'unregistered@user.com',
        displayName: user?.displayName || 'زائر مجهول',
        type: suggestionType,
        message: suggestionMessage.trim(),
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      setSubmitSuccess(true);
      setSuggestionMessage('');
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (err) {
      console.error("Failed to commit feedback suggestion to Firestore:", err);
      alert('⚠️ فشل إرسال رسالتك. تأكد من جودة الاتصال بالخادم ثم حاول مجدداً.');
      handleFirestoreError(err, OperationType.WRITE, 'suggestions');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-24 pt-6 px-4 md:px-8 space-y-6 max-w-3xl mx-auto font-sans text-right min-h-screen" dir="rtl" id="support_portal_screen">
      
      {/* Top navbar section */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-[#FF1744]/25 to-transparent rounded-xl text-red-500">
            <HelpCircle size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">بوابة الخدمات والدعم والتواصل</h1>
            <p className="text-[10px] text-neutral-400">تواصل مباشر، إعلانات الدعم، إرسال شكاوى واقتراحات، وتتبع ساحات وجروبات الأوتاكو العربي مجمعة!</p>
          </div>
        </div>
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold px-3 py-1.5 rounded-xl border border-neutral-800 transition text-xs"
        >
          <span>العودة للمزيد</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Styled tabs header row */}
      <div className="flex overflow-x-auto gap-1 border-b border-neutral-900 pb-1 scrollbar-none" id="support_tabs_bar">
        {[
          { id: 'ad_support', label: 'ادعمنا بمشاهدة إعلان 📺', icon: Tv },
          { id: 'help', label: 'الدعم والتواصل 💬', icon: HelpCircle },
          { id: 'suggestions', label: 'الشكاوى والاقتراحات 💡', icon: MessageSquare },
          { id: 'news', label: 'أخبار الأنمي 📰', icon: Newspaper }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveSubTab(tab.id as any);
              setSubmitSuccess(false);
            }}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${activeSubTab === tab.id ? 'bg-[#FF1744] text-white shadow shadow-red-600/20' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}
          >
            <tab.icon size={13} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Dynamic Tabs Content render */}
      <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-6 shadow-2xl relative">
        <AnimatePresence mode="wait">
          
          {/* TAB 0: AD SUPPORT INTEGRATED EXPERIENCE */}
          {activeSubTab === 'ad_support' && (
            <motion.div
              key="ad_support_tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-white font-extrabold text-sm md:text-base">بوابة الدعم الإعلانية والربحية</h3>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  شاهد الإعلانات لدعم خوادمنا واستمرار البث المجاني، وبالمقابل نمنحك كوينز ذهبية ونقاط خبرة XP مميزة فورياً!
                </p>
              </div>

              {/* Action Stats widgets */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-850 rounded-2xl p-3 flex flex-col justify-center items-center text-center">
                  <span className="text-neutral-500 text-[9px] font-black">الحدود اليومية</span>
                  <span className="text-xs font-black text-white mt-1">
                    <strong className="text-yellow-400 font-mono text-sm">{watchedToday}</strong>
                    <span className="text-neutral-500 mx-1">/</span>
                    <span className="font-mono">{DAILY_LIMIT}</span>
                  </span>
                  <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden mt-1 px-0.5">
                    <div 
                      className="bg-yellow-500 h-full rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(100, (watchedToday / DAILY_LIMIT) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-850 rounded-2xl p-3 flex flex-col justify-center items-center text-center">
                  <span className="text-neutral-500 text-[9px] font-black">رصيد عملاتك الحالي</span>
                  <span className="text-xs font-black text-white mt-1 flex items-center gap-1">
                    <Coins size={12} className="text-yellow-400 fill-yellow-400" />
                    <strong className="font-mono text-sm">{userData?.coins ?? 0}</strong>
                  </span>
                  <span className="text-[8px] text-neutral-600 font-bold">قابل للاستخدام بالمتجر</span>
                </div>

                <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-850 rounded-2xl p-3 flex flex-col justify-center items-center text-center">
                  <span className="text-neutral-500 text-[9px] font-black">جائزة المشاهدة</span>
                  <span className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1 justify-center">
                    <Gift size={12} />
                    <span>{monetization.rewardCoins} كوين</span>
                  </span>
                  <span className="text-[8px] text-neutral-600 font-bold">مضمونة وآمنة</span>
                </div>
              </div>

              {/* Action box trigger */}
              <div className="bg-neutral-900/30 border border-neutral-850 rounded-3xl p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[220px] text-center" id="ad_action_zone_portal">
                <AnimatePresence mode="wait">
                  {!isPlaying && !rewardGranted && (
                    <motion.div 
                      key="portal_start_prompt"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center gap-4 relative z-10"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center animate-bounce">
                        <Play size={20} className="fill-yellow-500" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-white font-extrabold text-xs md:text-sm">جاهز لتحميل البث الممول</h4>
                        <p className="text-[10px] text-neutral-400 max-w-xs leading-relaxed mx-auto">
                          اضغط على الزر لكسب عملات المتجر المجانية للمساهمة في تمويل موقع الأوتوكو.
                        </p>
                      </div>

                      {limitError && (
                        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3.5 py-2 rounded-2xl text-[9.5px] font-extrabold flex flex-col items-center gap-0.5 max-w-sm">
                          <div className="flex items-center gap-1">
                            <AlertTriangle size={12} />
                            <span>⚠️ تجاوزت الحد الأقصى للمشاهدات اليومية اليوم (20 إعلاناً).</span>
                          </div>
                          <span className="text-[9px] text-zinc-400 font-sans font-normal leading-relaxed text-center">يرجى العودة غداً لمواصلة الدعم وجني الكوينزات! ❤️</span>
                        </div>
                      )}

                      {!user && (
                        <div className="bg-rose-500/10 border border-rose-500/20 text-red-500 px-3 py-1 rounded-xl text-[9px] font-bold flex items-center gap-1 justify-center">
                          <AlertTriangle size={11} />
                          <span>يرجى تسجيل الدخول لحساب كوينز الخاص بك لتسجيل العملات بشكل دائم.</span>
                        </div>
                      )}

                      <button 
                        onClick={startAdPlay}
                        disabled={watchedToday >= DAILY_LIMIT}
                        className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 py-2.5 px-6 text-black font-black text-xs rounded-xl shadow-xl transition-all hover:scale-103 active:scale-97 cursor-pointer flex items-center gap-1.5"
                      >
                        <Tv size={13} />
                        <span>شاهد الإعلان وتجميع العملات 📺</span>
                      </button>
                    </motion.div>
                  )}

                  {isPlaying && (
                    <motion.div 
                      key="portal_playing_ad_actual"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-neutral-950 p-6 flex flex-col justify-between z-20 text-right"
                    >
                      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                          <span className="text-[9px] text-white/50 font-black tracking-wider">
                            {monetization.mode === 'simulation' ? 'سيرفر الإعلان مدعوم' : 'زيارة الرابط الممول والتحقق'}
                          </span>
                        </div>
                        <div className="bg-black/45 border border-white/10 px-3 py-1.5 rounded-full text-white font-mono text-[10px] font-black flex items-center gap-1">
                          <Clock size={10} className="text-yellow-400 animate-spin-slow" />
                          <span>0:{countdown < 10 ? `0${countdown}` : countdown}</span>
                        </div>
                      </div>

                      <div className="my-auto py-2">
                        {monetization.mode === 'direct_link' && (
                          <div className="space-y-3 font-sans">
                            <div className="bg-yellow-500/10 text-yellow-400 text-[10px] font-bold px-2.5 py-1 rounded inline-block font-sans">
                              🔗 نمط الارتباط المالي المباشر
                            </div>

                            {popupBlocked ? (
                              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-amber-400 text-[11px] font-bold space-y-2 max-w-sm mx-auto text-right">
                                <p className="flex items-center gap-1.5 justify-end font-sans">
                                  <span>تنبيه: تم حظر فتح النافذة المنبثقة تلقائياً!</span>
                                  <AlertTriangle size={13} className="animate-pulse text-amber-450" />
                                </p>
                                <p className="text-[9.5px] text-zinc-350 leading-relaxed font-normal font-sans">
                                  يبدو أن متصفحك أو نظام الحماية قد منع فتح الإعلان تلقائياً. يرجى الضغط على الزر بالأسفل لفتحه يدوياً ومواصلة العداد.
                                </p>
                              </div>
                            ) : (
                              <>
                                <h4 className="text-white text-xs font-extrabold leading-relaxed font-sans">
                                  جاري انتقالك لصفحة العرض الممول...
                                </h4>
                                <p className="text-[10px] text-zinc-300 max-w-xs mx-auto leading-relaxed font-sans">
                                  إذا لم تفتح الصفحة تلقائياً، يرجى الضغط على الزر أدناه والاحتفاظ بها مفتوحة طيلة مدة العداد لكسب الكوينز.
                                </p>
                              </>
                            )}

                            <a 
                              href={monetization.directLinkUrl}
                              target="_blank"
                              rel="noopener"
                              onClick={() => {
                                setPopupBlocked(false);
                              }}
                              className="bg-red-650 hover:bg-red-600 text-white font-extrabold py-2 px-5 rounded-xl text-[10px] transition inline-flex items-center gap-1 cursor-pointer shadow-md select-none"
                            >
                              <span>اضغط هنا لطلب وفتح الإعلان يدوياً 🚀</span>
                            </a>
                          </div>
                        )}

                        {monetization.mode === 'script' && (
                          <div className="space-y-3 overflow-hidden">
                            <div className="bg-purple-500/10 text-purple-400 text-[10px] font-bold px-2.5 py-1 rounded inline-block font-sans">
                              💻 مساحة إعلانية مضمنة
                            </div>
                            {/* Render the script/iframe HTML using AdScriptRunner */}
                            <AdScriptRunner scriptCode={monetization.scriptCode} />
                            <p className="text-[8px] text-neutral-400 mt-1">تفاعل مع المساحة الإجرائية المباشرة أعلاه لتأكيد المكافأة.</p>
                          </div>
                        )}

                        {monetization.mode === 'simulation' && activeAd && (
                          <div className="space-y-2">
                            <div className="bg-yellow-500/10 text-yellow-400 text-[9px] font-bold px-2 py-0.5 rounded border border-yellow-500/20 inline-block">
                              {activeAd.sponsor}
                            </div>
                            <h4 className="text-white text-xs font-black leading-relaxed">
                              {activeAd.title}
                            </h4>
                            {activeAd.bannerUrl && (
                              <img 
                                src={activeAd.bannerUrl} 
                                alt="" 
                                className="w-full max-h-[70px] object-cover rounded-xl mt-1 opacity-70 border border-white/5" 
                                referrerPolicy="no-referrer"
                              />
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden p-0.5 border border-white/5">
                          <div 
                            className="h-full rounded-full bg-gradient-to-l from-yellow-400 to-amber-500 transition-all duration-1000"
                            style={{ width: `${(countdown / monetization.stayTime) * 100}%` }}
                          />
                        </div>
                        <p className="text-[8px] text-white/40 text-center">يرجى الانتظار حتى اكتمال البث وتجميع العملات بنجاح.</p>
                      </div>
                    </motion.div>
                  )}

                  {rewardGranted && (
                    <motion.div 
                      key="portal_reward_grant"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center gap-3 relative z-10"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 size={28} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-emerald-400 text-xs font-black">شكرًا جزيلًا لدعمك!</h4>
                        <p className="text-[10px] text-zinc-400">
                          تمت إضافة <strong className="text-yellow-400">+{rewardGranted} عملة</strong> إلى حسابك بنجاح.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* TAB 1: INTEGRATED HELP, CHAT, & FINANCIAL DONATION */}
          {activeSubTab === 'help' && (
            <motion.div
              key="help_tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-right"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-white font-extrabold text-sm md:text-base">
                  <HelpCircle size={16} className="text-[#FF1744]" />
                  <h3>مركز الدعم والتواصل المباشر</h3>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  مرحباً بك في قسم الدعم والتواصل الموحد. من هنا يمكنك الحصول على الدعم التقني، الانضمام لمجتمعنا الجماعي، أو تقديم الدعم المادي للمساهمة في استدامة الخوادم.
                </p>
              </div>

              {/* Redirection Cards - بطاقات تحويل بها روابط تليجرام */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                
                {/* 1. Help Card */}
                <div className="bg-gradient-to-b from-neutral-900 to-[#101015] border border-neutral-850 hover:border-neutral-800 p-5 rounded-2xl flex flex-col justify-between transition duration-300">
                  <div className="space-y-2 text-right">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                      <HelpCircle size={20} />
                    </div>
                    <h4 className="text-white text-xs font-black">المساعدة والدعم</h4>
                    <p className="text-[10px] text-neutral-400 leading-relaxed min-h-[40px]">
                      تواصل مع فريق الدعم لحل المشكلات التقنية، استرجاع الحسابات واستفسارات المنصة.
                    </p>
                  </div>
                  <a 
                    href={helpTelegramUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 w-full bg-sky-600 hover:bg-sky-500 text-white font-black text-[10px] py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer select-none"
                  >
                    <ExternalLink size={10} />
                    <span>افتح المساعدة تليجرام</span>
                  </a>
                </div>

                {/* 2. Chat/Group Card */}
                <div className="bg-gradient-to-b from-neutral-900 to-[#101015] border border-neutral-850 hover:border-neutral-800 p-5 rounded-2xl flex flex-col justify-between transition duration-300">
                  <div className="space-y-2 text-right">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Users size={20} />
                    </div>
                    <h4 className="text-white text-xs font-black">شات الأوتاكو الجماعي</h4>
                    <p className="text-[10px] text-neutral-400 leading-relaxed min-h-[40px]">
                      انضم لمجموعتنا الكبرى على تلغرام للدردشة وتداول الآراء والنظريات وتكوين صداقات.
                    </p>
                  </div>
                  <a 
                    href={groupTelegramUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer select-none"
                  >
                    <ExternalLink size={10} />
                    <span>انضم لمجموعة تليجرام</span>
                  </a>
                </div>

                {/* 3. Donate/Financial Card - Dedicated to Owner مخصص للمالك */}
                <div className="bg-gradient-to-b from-neutral-900 to-[#101015] border border-yellow-500/20 hover:border-yellow-500/30 p-5 rounded-2xl flex flex-col justify-between transition duration-300">
                  <div className="space-y-2 text-right">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center">
                      <CreditCard size={20} />
                    </div>
                    <div className="flex items-center gap-1 justify-center md:justify-start">
                      <h4 className="text-yellow-400 text-xs font-black">الدعم المادي ومساعدة المالك</h4>
                      <span className="text-[7.5px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1 py-0.2 rounded font-black shrink-0">مالك المنصة</span>
                    </div>
                    <p className="text-[10px] text-neutral-400 leading-relaxed min-h-[40px]">
                      تواصل مباشر وخاص مع مالك التطبيق لتقديم دعم مالي والمساهمة في استضافة خوادم البث.
                    </p>
                  </div>
                  <a 
                    href={donateTelegramUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black text-[10px] py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer select-none"
                  >
                    <ExternalLink size={10} />
                    <span>تواصل مع المالك للاستفسار</span>
                  </a>
                </div>

              </div>

              {/* FAQ Section */}
              <div className="space-y-3 pt-4 border-t border-neutral-900">
                <h4 className="text-white text-xs font-black border-r-2 border-[#FF1744] pr-2">الأسئلة الأكثر تكراراً بالدعم:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-neutral-900/40 p-3.5 rounded-2xl border border-neutral-950">
                    <h5 className="text-white font-bold text-xs">كيف يتم تسجيل ونزول الكوينز بأمان؟</h5>
                    <p className="text-[10.5px] text-neutral-400 mt-1 leading-relaxed">تتم مزامنة عملاتك تلقائياً مع خوادم السحاب بعد إشعار إفادة إتمام مشاهدة الإعلان الممول، ويُرجى الاحتفاظ بحسابك المنشأ لتجنب الفقد.</p>
                  </div>
                  <div className="bg-neutral-900/40 p-3.5 rounded-2xl border border-neutral-950">
                    <h5 className="text-white font-bold text-xs">ما فائدة الانضمام للقروب ومتابعة المالك؟</h5>
                    <p className="text-[10.5px] text-[#A3A3A3] mt-1 leading-relaxed">تداول شفرات الهدايا والأكواد الحصرية التي يوزعها طاقم الإشراف يومياً للحصول على كوينز وشارات أسطورية بالمجان!</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: SUGGESTIONS AND COMPLAINTS SUBMISSION */}
          {activeSubTab === 'suggestions' && (
            <motion.div
              key="suggestions_tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-right"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-white font-extrabold text-sm md:text-base">
                  <MessageSquare size={16} className="text-yellow-400" />
                  <h3>صندوق الشكاوى والاقتراحات التفاعلي</h3>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  شاركنا رأيك، شكواك، أو فكرتك لتطوير المنصة. نقرأ كل رسالة بعناية شديدة ونعمل على تحسين الموقع باستمرار لخدمة مجتمع الأوتاكو العربي!
                </p>
              </div>

              {/* Toggle suggestion vs complaint */}
              <div className="grid grid-cols-2 gap-2 bg-neutral-900/60 p-1.5 rounded-2xl border border-neutral-850">
                <button
                  type="button"
                  onClick={() => {
                    setSuggestionType('suggestion');
                    setSubmitSuccess(false);
                  }}
                  className={`py-2 text-xs font-black rounded-xl transition-all ${
                    suggestionType === 'suggestion'
                      ? 'bg-gradient-to-l from-yellow-500/20 to-amber-500/10 text-yellow-500 border border-yellow-500/20 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  💡 اقتراح أو فكرة جديدة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSuggestionType('complaint');
                    setSubmitSuccess(false);
                  }}
                  className={`py-2 text-xs font-black rounded-xl transition-all ${
                    suggestionType === 'complaint'
                      ? 'bg-gradient-to-l from-red-500/20 to-rose-500/10 text-red-400 border border-red-500/20 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  🚨 شكوى أو خلل فني
                </button>
              </div>

              <form onSubmit={handleSendSuggestion} className="space-y-4">
                {/* Specific option focusing on advertisements in suggestions/complaints */}
                <div className="bg-neutral-900/30 border border-neutral-850 p-4 rounded-2xl space-y-3">
                  <h4 className="text-white text-xs font-bold flex items-center gap-1.5">
                    <Tv size={13} className="text-red-500 animate-pulse" />
                    <span>القسم الخاص بالإعلانات التجارية:</span>
                  </h4>
                  <p className="text-[10.5px] text-neutral-400 leading-relaxed">
                    لقد قمنا رسمياً بتلبية طلبات الأعضاء و<strong className="text-yellow-400">حظر جميع الإعلانات المنبثقة والتلقائية</strong> أثناء المشاهدة والتصفح. الإعلانات الآن محصورة بالكامل في صفحتها المخصصة لراحتكم.
                  </p>
                  <div className="bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/10 p-3 rounded-xl transition duration-300">
                    <p className="text-[10px] text-zinc-300 leading-relaxed">
                      💡 هل لديك أي استفسار، مشكلة، أو اقتراح بخصوص نظام كسب العملات ومكافآت الإعلانات المخصصة؟ يرجى كتابة رسالتك بالأسفل وسيقوم المالك وفريق الإشراف بالرد العاجل.
                    </p>
                  </div>
                </div>

                {/* Input label & textarea */}
                <div className="space-y-2">
                  <label className="text-white text-xs font-black block">تفاصيل رسالتك أو شكواك المباشرة:</label>
                  <textarea
                    rows={4}
                    value={suggestionMessage}
                    onChange={(e) => setSuggestionMessage(e.target.value)}
                    placeholder={
                      suggestionType === 'suggestion'
                        ? 'اكتب اقتراحك بالتفصيل هنا... كيف يمكننا جعل تجربتك في الموقع أكثر روعة؟'
                        : 'صف الخلل أو المشكلة التي تواجهها بالتفصيل (مثل: سيرفرات البث، مشكلة في حساب الكوينز، إلخ)...'
                    }
                    className="w-full bg-neutral-900 border border-neutral-850 p-3 rounded-2xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition duration-300 font-sans"
                    required
                  />
                </div>

                <div className="flex items-center justify-between gap-4 pt-1">
                  {/* Status notifications inside form */}
                  <AnimatePresence>
                    {submitSuccess && (
                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="text-emerald-400 font-bold text-[10px] flex items-center gap-1"
                      >
                        <CheckCircle2 size={12} />
                        <span>تم إرسال رسالتك بنجاح للأرشيف الإداري! شكرًا لك.</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={isSubmitting || !suggestionMessage.trim()}
                    className="mr-auto px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-red-600/10 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                        <span>جاري الإرسال...</span>
                      </>
                    ) : (
                      <>
                        <Send size={11} className="transform rotate-180" />
                        <span>إرسال الرسالة إلى المشرفين 🚀</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* TAB 5: ANIME NEWS ARTICLES FEED */}
          {activeSubTab === 'news' && (
            <motion.div
              key="news_tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <h3 className="text-white font-extrabold text-sm md:text-base">جريدة وصحيفة الأنمي والمانجا الساخنة</h3>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  مواكبة آخر الأحداث، تسريبات الاستوديوهات، مبيعات مجلة شونين جمب، ومستجدات الصناعة أولاً بأول بتغطية شاملة ومترجمة بدقة تامة.
                </p>
              </div>

              <div className="space-y-3.5 pt-1 max-h-[300px] overflow-y-auto pr-1">
                {INTEGRATED_ANIME_NEWS.map(news => (
                  <div key={news.id} className="bg-neutral-900/40 border border-neutral-900 rounded-2xl p-3 flex flex-col sm:flex-row gap-4 items-center sm:items-start text-right hover:border-[#FF1744]/25 transition duration-300">
                    <img 
                      src={news.imageUrl} 
                      alt="" 
                      className="w-full sm:w-20 h-20 object-cover rounded-xl shrink-0" 
                    />
                    <div className="space-y-1 w-full">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-neutral-500 font-bold">{news.date}</span>
                        <span className="bg-[#FF1744]/10 text-[#FF1744] font-black px-2 py-0.5 rounded-full border border-[#FF1744]/10">{news.category}</span>
                      </div>
                      <h4 className="text-white text-xs font-black leading-snug">{news.title}</h4>
                      <p className="text-[10px] text-neutral-400 leading-relaxed max-w-xl">{news.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
