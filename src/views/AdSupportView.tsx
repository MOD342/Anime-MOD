import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Tv, 
  Coins, 
  Gift, 
  Clock, 
  AlertTriangle, 
  ChevronRight, 
  CheckCircle2, 
  Sparkles, 
  Heart,
  XCircle,
  HelpCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import AdScriptRunner from '../components/AdScriptRunner';

interface AdSupportViewProps {
  onBack: () => void;
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
    bgGradient: "from-emerald-900 via-teal-950 to-neutral-950",
    bannerUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=60"
  },
  {
    sponsor: "ألعاب طوكيو الأسطورية",
    title: "مجسمات أنمي نادرة وحصرية لوفي ترانسفورميشن، زورو، وناروتو ستاتيو. جودة يابانية أصلية 100%.",
    bgGradient: "from-red-900 via-zinc-950 to-neutral-950",
    bannerUrl: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&auto=format&fit=crop&q=60"
  }
];

export default function AdSupportView({ onBack }: AdSupportViewProps) {
  const { user, userData } = useAuth();
  
  // Storage key for daily tracking
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

  const [isUsingWebView, setIsUsingWebView] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
      const checkWebView = 
        /webview/i.test(ua) ||
        /wv/i.test(ua) ||
        /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua) ||
        /FBAV/i.test(ua) ||
        /FBAN/i.test(ua) ||
        /Instagram/i.test(ua) ||
        /Twitter/i.test(ua) ||
        /Telegram/i.test(ua) ||
        /LinkedInApp/i.test(ua) ||
        /Snapchat/i.test(ua);
      
      setIsUsingWebView(!!checkWebView);
    }
  }, []);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

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

  // Maximum allowed requests daily
  const DAILY_LIMIT = 20;

  // Load monetization settings from Firestore
  useEffect(() => {
    const loadMonetization = async () => {
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const docSnap = await getDoc(doc(db, 'globalSettings', 'monetization'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMonetization({
            mode: data.mode ?? 'direct_link',
            directLinkUrl: data.directLinkUrl ?? 'https://www.effectivecpmnetwork.com/pt97wb2w?key=f76147a23264a74437b153780898337a',
            scriptCode: data.scriptCode ?? '',
            stayTime: data.stayTime ?? 12,
            rewardCoins: data.rewardCoins ?? 25
          });
        }
      } catch (e) {
        console.warn("Could not load monetization config in user view, using default settings:", e);
      }
    };
    loadMonetization();
  }, []);

  // Handle playing ad simulation or opening direct link
  const startAdPlay = () => {
    if (watchedToday >= DAILY_LIMIT) {
      setLimitError(true);
      return;
    }

    setLimitError(false);
    setPopupBlocked(false);

    if (monetization.mode === 'direct_link') {
      // 1. Open the direct smartlink in a new window/tab safely with sandbox fallback check!
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

      // 2. Start counting down in the app regardless, allowing user to manually trigger if blocked
      setIsPlaying(true);
      setCountdown(monetization.stayTime);
      setRewardGranted(null);
    } else if (monetization.mode === 'script') {
      // Start script counting down
      setIsPlaying(true);
      setCountdown(monetization.stayTime);
      setRewardGranted(null);
    } else {
      // Pick random simulation ad
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

  // Finish ad play and grant rewards safely
  const finishAdPlay = async () => {
    setIsPlaying(false);
    
    // Choose reward amount according to setting
    const coinsReward = monetization.rewardCoins;
    const xpReward = Math.floor(Math.random() * 105) + 100;  // 100 to 200 XP
    
    setRewardGranted(coinsReward);
    const newCount = watchedToday + 1;
    setWatchedToday(newCount);
    
    try {
      localStorage.setItem(storageCountKey, newCount.toString());
    } catch (e) {
      console.warn("Storage limits:", e);
    }

    // Write real reward to persistent Firestore database if logged in
    if (user?.id) {
      setIsSyncing(true);
      try {
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

  return (
    <div className="pb-24 pt-6 px-4 md:px-8 space-y-6 max-w-2xl mx-auto font-sans text-right min-h-screen" dir="rtl" id="ad_support_screen">
      
      {/* Header and back control */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-yellow-500/25 to-transparent rounded-xl text-yellow-400">
            <Tv size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">ادعم التطبيق الإعلاني</h1>
            <p className="text-[10px] text-neutral-400">شاهد الإعلانات لدعم خوادمنا واحصد مكافآت ومستويات ذهبية مجاناً!</p>
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

      {/* WebView Warning Banner */}
      {isUsingWebView && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-l from-red-500/10 via-amber-500/5 to-neutral-950 border border-red-500/20 rounded-2xl p-5 text-right space-y-3.5 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-500/10 text-red-400 rounded-xl shrink-0">
              <AlertTriangle size={18} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-white text-xs font-black">⚠️ تنبيه: نظام حظر الغش بالمتصفح الداخلي نشط!</h3>
              <p className="text-[10.5px] text-zinc-300 leading-relaxed font-sans">
                أنت تشاهد حالياً من خلال <strong>متصفح داخلي مبسط (WebView أو In-App Browser)</strong>. بعض شبكات الإعلانات والشركاء (مثل <span className="text-yellow-400 font-bold">Monetag</span>) تمنع وتصنف استخدام الـ WebView كاحتيال وتجمد حساب المشاهد، إضافة إلى عدم تحميل الإعلانات بشكل سليم.
              </p>
            </div>
          </div>

          <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800/50 space-y-2">
            <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
              💡 لتجنب حظر حسابك بالأوتوكو كوينز ولضمان ظهور الإعلان بدون مشاكل، يرجى نسخ الرابط أدناه وفتحه في تطبيق متصفح خارجي ورسمي مستقل بالكامل بموبايلك (مثل <strong>Google Chrome</strong> أو <strong>Safari</strong>).
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1.5 justify-end">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-750 text-white font-black text-[10.5px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer select-none"
              >
                <Copy size={11} className={copiedLink ? "text-emerald-400" : "text-white"} />
                <span>{copiedLink ? "✓ تم نسخ رابط الموقع!" : "نسخ رابط الصفحة الحالية 📋"}</span>
              </button>
              
              <a
                href={typeof window !== 'undefined' ? window.location.href : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-[#FF1744] hover:bg-[#FF1744]/90 text-white font-black text-[10.5px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer select-none"
              >
                <ExternalLink size={11} />
                <span>فتح بالمتصفح الخارجي 🌐</span>
              </a>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Campaign Statistics Dashboard */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-b from-neutral-950 to-neutral-900 border border-neutral-900 rounded-2xl p-3 flex flex-col justify-center items-center text-center">
          <span className="text-neutral-500 text-[9px] font-black">الحدود اليومية</span>
          <span className="text-xs font-black text-white mt-1">
            <strong className="text-yellow-400 font-mono text-sm">{watchedToday}</strong>
            <span className="text-neutral-500 mx-1">/</span>
            <span className="font-mono">{DAILY_LIMIT}</span>
          </span>
          <div className="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden mt-1 px-0.5">
            <div 
              className="bg-yellow-500 h-full rounded-full transition-all duration-300" 
              style={{ width: `${Math.min(100, (watchedToday / DAILY_LIMIT) * 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-gradient-to-b from-neutral-950 to-neutral-900 border border-neutral-900 rounded-2xl p-3 flex flex-col justify-center items-center text-center">
          <span className="text-neutral-500 text-[9px] font-black">رصيد عملاتك الحالي</span>
          <span className="text-xs font-black text-white mt-1 flex items-center gap-1">
            <Coins size={12} className="text-yellow-400 fill-yellow-400 animate-spin-slow" />
            <strong className="font-mono text-sm">{userData?.coins ?? 0}</strong>
          </span>
          <span className="text-[8px] text-neutral-600 font-bold">قابل للاستخدام بالمتجر</span>
        </div>

        <div className="bg-gradient-to-b from-neutral-950 to-neutral-900 border border-neutral-900 rounded-2xl p-3 flex flex-col justify-center items-center text-center">
          <span className="text-neutral-500 text-[9px] font-black">صندوق الهدايا</span>
          <span className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1 justify-center">
            <Gift size={12} />
            <span>ناشط بالكامل</span>
          </span>
          <span className="text-[8px] text-neutral-603 font-bold">15 - 30 كوين لكل إعلان</span>
        </div>
      </div>

      {/* Action Zone / Player */}
      <div className="bg-neutral-950 border border-neutral-900 rounded-3xl p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[220px] text-center" id="ad_action_zone">
        
        {/* Decorative background grid pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />

        <AnimatePresence mode="wait">
          {!isPlaying && !rewardGranted && (
            <motion.div 
              key="start_prompt"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-4 relative z-10"
            >
              <div className="w-16 h-16 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center animate-bounce">
                <Play size={24} className="fill-yellow-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-white font-extrabold text-sm md:text-base">جاهز لتحميل الإعلان الخادم التفاعلي</h3>
                <p className="text-[11px] text-neutral-400 max-w-xs leading-relaxed mx-auto">
                  من خلال الضغط على الزر أدناه، سيتم تفعيل البث وبدء دورة العرض الترويجي القصر لربح مكافأتك الفورية.
                </p>
              </div>

              {limitError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3.5 py-2.5 rounded-2xl text-[10px] font-extrabold flex flex-col items-center gap-1 max-w-sm">
                  <div className="flex items-center gap-1">
                    <AlertTriangle size={13} />
                    <span>⚠️ تجاوزت الحد الأقصى للمشاهدات اليومية اليوم (20 إعلاناً).</span>
                  </div>
                  <span className="text-[9.5px] text-zinc-400 font-sans font-normal leading-relaxed text-center">يرجى العودة غداً للمزيد من الدعم وجني الكوينزات! شكرًا لدعمك! ❤️</span>
                </div>
              )}

              {!user && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-3 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 justify-center">
                  <AlertTriangle size={12} />
                  <span>لم تقم بتسجيل الدخول التام. لن تحفظ الجوائز على نظام السيرفر.</span>
                </div>
              )}

              <button 
                onClick={startAdPlay}
                disabled={watchedToday >= DAILY_LIMIT}
                className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 py-3 px-8 text-black font-black text-xs rounded-2xl shadow-xl transition-all hover:scale-103 active:scale-97 cursor-pointer flex items-center gap-2"
              >
                <Tv size={14} />
                <span>شاهد إعلان الآن واكسب كوينز 📺</span>
              </button>
            </motion.div>
          )}

          {isPlaying && (
            <motion.div 
              key="playing_ad_actual"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-neutral-950 p-6 flex flex-col justify-between z-20 text-right"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                  <span className="text-[10px] text-white/80 font-black uppercase tracking-wider">
                    {monetization.mode === 'simulation' ? 'سيرفر الإعلان مدعوم' : 'زيارة الرابط الممول والتحقق'}
                  </span>
                </div>
                <div className="bg-black/45 border border-white/10 px-3.5 py-1.5 rounded-full text-white font-mono text-[11px] font-black flex items-center gap-1.5">
                  <Clock size={11} className="text-yellow-400 animate-spin-slow" />
                  <span>0:{countdown < 10 ? `0${countdown}` : countdown}</span>
                </div>
              </div>

              <div className="my-auto py-2">
                {monetization.mode === 'direct_link' && (
                  <div className="space-y-4 font-sans">
                    <div className="bg-yellow-500/10 text-yellow-400 text-[10px] font-bold px-3 py-1 rounded inline-block font-sans">
                      🔗 نمط الارتباط المالي المباشر
                    </div>
                    
                    {popupBlocked ? (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-amber-400 text-xs font-bold space-y-2 max-w-sm mx-auto text-right">
                        <p className="flex items-center gap-1.5 justify-end">
                          <span>تنبيه: تم حظر فتح النافذة المنبثقة تلقائياً!</span>
                          <AlertTriangle size={14} className="animate-pulse text-amber-450" />
                        </p>
                        <p className="text-[10px] text-zinc-350 leading-relaxed">
                          يبدو أن متصفحك أو نظام الحماية قد منع فتح الإعلان تلقائياً لمنع النوافذ المزعجة. يرجى الضغط على الزر بالأسفل لفتحه يدوياً ومواصلة العداد.
                        </p>
                      </div>
                    ) : (
                      <>
                        <h4 className="text-white text-sm md:text-base font-extrabold leading-relaxed">
                          جاري انتقالك لصفحة العرض الممول...
                        </h4>
                        <p className="text-[10.5px] text-zinc-300 max-w-sm mx-auto leading-relaxed">
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
                      className="bg-red-600 hover:bg-red-500 text-white font-black py-2.5 px-6 rounded-xl text-[11px] transition inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-600/15"
                    >
                      <span>اضغط لطلب وفتح الإعلان يدوياً 🚀</span>
                    </a>
                  </div>
                )}

                {monetization.mode === 'script' && (
                  <div className="space-y-4 overflow-hidden">
                    <div className="bg-purple-500/10 text-purple-400 text-[10px] font-bold px-3 py-1 rounded inline-block">
                      💻 مساحة إعلانية مضمنة
                    </div>
                    {/* Render the script/iframe HTML using AdScriptRunner */}
                    <AdScriptRunner scriptCode={monetization.scriptCode} />
                    <p className="text-[9px] text-neutral-400 mt-1">تفاعل مع المساحة الإجرائية المباشرة أعلاه لتأكيد المكافأة.</p>
                  </div>
                )}

                {monetization.mode === 'simulation' && activeAd && (
                  <div className="space-y-3">
                    <div className="bg-yellow-500/10 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-500/20 inline-block">
                      {activeAd.sponsor}
                    </div>
                    <h4 className="text-white text-sm md:text-base font-extrabold leading-relaxed">
                      {activeAd.title}
                    </h4>
                    {activeAd.bannerUrl && (
                      <img 
                        src={activeAd.bannerUrl} 
                        alt="Sponsor Media" 
                        className="w-full max-h-[80px] object-cover rounded-xl mt-1 opacity-75 border border-white/5" 
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Progress bar of ad duration */}
              <div className="space-y-2">
                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <div 
                    className="h-full rounded-full bg-gradient-to-l from-yellow-400 to-amber-500 transition-all duration-1000"
                    style={{ width: `${(countdown / monetization.stayTime) * 100}%` }}
                  />
                </div>
                <p className="text-[9px] text-white/50 text-center font-bold">يرجى المتابعة لضمان تجميع العملات الذهبية بنجاح.</p>
              </div>
            </motion.div>
          )}

          {rewardGranted && (
            <motion.div 
              key="reward_grant_screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-4 relative z-10"
            >
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center animate-bounce">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-emerald-400 font-extrabold text-sm md:text-base">✓ تم تأكيد المشاهدة وحصد الهدية!</h3>
                <p className="text-[11px] text-neutral-400 max-w-xs leading-relaxed mx-auto">
                  لقد حصلت على <span className="text-yellow-400 font-black">{rewardGranted} كوينز</span> بالإضافة إلى <span className="text-red-400 font-bold">XP مكافأة</span> لدعمك السيرفر المفتوح.
                </p>
              </div>

              {isSyncing && (
                <span className="text-[10px] text-lime-400 animate-pulse font-bold">جاري مزامنة قواعد البيانات السحابية...</span>
              )}

              <button 
                onClick={() => setRewardGranted(null)}
                className="bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800 py-2.5 px-6 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                مشاهدة إعلان آخر 📺
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Informative Warning Card */}
      <div className="bg-neutral-900/30 border border-neutral-900 rounded-2xl p-4 flex gap-3 text-right">
        <HelpCircle className="text-yellow-400 shrink-0 mt-0.5" size={16} />
        <div>
          <h4 className="text-white text-xs font-bold">لماذا نشاهد الإعلانات؟</h4>
          <p className="text-[10px] text-neutral-400 mt-1 leading-relaxed">
            البطاقة الجديدة تساعد في تغطية نفقات السيرفرات الضخمة وتحديث الأجهزة الخادمة، وبالمقابل نمنحك عملات كوينز نادرة تشتري بها ألقاباً وإطارات مجانية من المتجر التفاعلي. نشكر لك وقوفك بجانبنا! ❤️
          </p>
        </div>
      </div>
    </div>
  );
}
