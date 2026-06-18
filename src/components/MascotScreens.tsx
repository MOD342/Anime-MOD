import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, RefreshCw, Terminal, Search, Cpu, Wifi, Sparkles, X, ShieldAlert } from 'lucide-react';

// Animated searching/typing phrases in Arabic
const loadingPhrases = [
  'جاري مزامنة قاعدة البيانات مع خوادم الأوتاكو الفاخرة... 📡',
  'البحث عن أحدث حلقات ومصادر التشغيل المستقرة... ⚔️',
  'تحديث الهوية الجديدة لمنصة أنمي MOD وتجهيز الواجهة... ✨',
  'تهيئة مساحات التفاعل والألعاب والجوائز اليومية... 🛡️',
  'جاري تحميل الملفات المؤقتة وتسريع الأداء الذكي... 🚀'
];

interface MascotLoadingScreenProps {
  onComplete?: () => void;
  authLoading: boolean;
}

export function MascotLoadingScreen({ authLoading, onComplete }: MascotLoadingScreenProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [typedChars, setTypedChars] = useState('');
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [iconError, setIconError] = useState(false);

  // Show splash for at least 2.5 seconds for a premium, fast loading feel
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!authLoading && minTimeElapsed && onComplete) {
      onComplete();
    }
  }, [authLoading, minTimeElapsed, onComplete]);

  // Rotates through different phrases
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % loadingPhrases.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Soft futuristic typing typewriter speed effect
  useEffect(() => {
    const fullText = loadingPhrases[phraseIndex];
    let i = 0;
    setTypedChars('');
    
    const interval = setInterval(() => {
      if (i < fullText.length) {
        setTypedChars((prev) => prev + fullText.charAt(i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 35);

    return () => clearInterval(interval);
  }, [phraseIndex]);

  // Procedural futuristic log emulator
  useEffect(() => {
    const logs = [
      'SYSTEM: Booting MOD-342 Core Engine v4.0...',
      'SECURE: Establishing SSL handshake with firestore database...',
      'APP_ICON: Verifying /src/assets/images/app_icon.png pathway...',
      'PERFORMANCE: Activating hardware acceleration and rendering canvas...',
      'SIGNATURE: Verified developer signature [MOD-342] authorized.'
    ];
    let index = 0;
    const interval = setInterval(() => {
      if (index < logs.length) {
        setTerminalLogs((prev) => [...prev, logs[index]]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#030305] z-[999999] flex flex-col items-center justify-center p-6 select-none overflow-hidden" dir="rtl">
      {/* Background radial glowing effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.06),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(239,23,68,0.04),transparent_60%)] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(#3b82f6 1.5px, transparent 1.5px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative max-w-sm w-full flex flex-col items-center text-center gap-6 z-10 animate-fadeIn">
        
        {/* Modern Icon Stage (Square-like squircle frame for real application icons) */}
        <div className="relative w-36 h-36">
          {/* Futuristic Circular/Rectangular outer aura */}
          <div className="absolute -inset-2.5 rounded-[2.2rem] bg-gradient-to-tr from-blue-600 via-purple-600 to-[#FF1744] opacity-25 blur-lg animate-pulse" />
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-blue-500/40 via-purple-500/40 to-[#FF1744]/40 animate-spin duration-10000 opacity-30 blur-sm" />
          
          {/* Inside Stage container */}
          <div className="absolute inset-1 bg-[#09090e] rounded-[1.8rem] p-1.5 overflow-hidden border border-white/10 flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
            {iconError ? (
              <div className="w-full h-full bg-gradient-to-br from-[#FF1744] via-purple-700 to-blue-800 rounded-[1.4rem] flex flex-col items-center justify-center text-white border border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] pointer-events-none" />
                <Sparkles className="text-yellow-300 animate-pulse mb-1 relative z-10" size={34} />
                <span className="text-sm font-black tracking-tight relative z-10">أنمي MOD</span>
                <span className="text-[8px] font-mono text-white/50 font-bold uppercase tracking-widest relative z-10 mt-0.5">MOD-342</span>
              </div>
            ) : (
              <img
                src="/src/assets/images/app_icon.png"
                onError={() => setIconError(true)}
                alt="MOD App Icon"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-[1.4rem] filter brightness-105 contrast-105 pointer-events-none"
              />
            )}

            {/* Neon Glitch / Hologram Scanning Beam Line Overlay */}
            <motion.div 
              className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_8px_#3b82f6] opacity-55"
              animate={{
                top: ['15%', '85%', '15%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>

          {/* Core system status badge */}
          <span className="absolute -bottom-1 -right-1.5 bg-gradient-to-r from-[#FF1744] to-purple-600 text-[8px] font-black text-white px-2 py-0.5 rounded-md border border-white/10 shadow-md flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            تجهيز البيانات...
          </span>
        </div>

        {/* Brand identity */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-white px-2 tracking-tight">
            أنمي <span className="text-transparent bg-clip-text bg-gradient-to-l from-[#FF1744] to-blue-400">MOD</span>
          </h1>
          <p className="text-[10px] text-neutral-400 font-sans tracking-wide">
            منصة مجتمع الأوتوكو الحصرية
          </p>
        </div>

        {/* Search Status Card */}
        <div className="w-full bg-[#0a0a0f]/90 border border-white/5 rounded-2xl p-4 space-y-3.5 shadow-2xl relative min-h-[85px] flex flex-col justify-center">
          <div className="absolute top-2 right-3 flex items-center gap-1 text-[8px] font-mono text-blue-400/80">
            <Search size={8} /> SYSTEM_VERIFICATION_PROMPT
          </div>

          <div className="text-right">
            <p className="text-xs font-bold text-neutral-200 leading-normal break-keep min-h-[36px]">
              {typedChars}
              <span className="inline-block w-1.5 h-3 bg-blue-500 animate-pulse mr-0.5" />
            </p>
          </div>

          {/* Progress Loading Track */}
          <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden relative">
            <motion.div 
              className="absolute top-0 bottom-0 bg-gradient-to-r from-[#FF1744] via-purple-500 to-blue-500 rounded-full"
              initial={{ left: "-40%", width: "40%" }}
              animate={{ left: "100%" }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </div>

        {/* Emulated system terminal log board */}
        <div className="w-full bg-[#06060a] border border-white/5 rounded-xl p-3 text-right font-mono text-[9px] text-neutral-500 space-y-1 select-none pointer-events-none h-[95px] overflow-hidden shadow-inner">
          <p className="text-neutral-400 font-bold border-b border-white/5 pb-1 mb-1.5 flex items-center gap-1">
            <Terminal size={9} className="text-[#FF1744]" />
            <span>محاكي إقلاع النظام والبث</span>
          </p>
          <div className="space-y-1 h-[70px] overflow-y-auto">
            {terminalLogs.map((log, index) => (
              <p key={index} className="flex items-center gap-1 text-neutral-500">
                <span className="text-blue-500">›</span>
                <span>{log}</span>
              </p>
            ))}
          </div>
        </div>

        {/* Dedicated Signature footprint requested by user */}
        <div className="mt-2 text-center flex flex-col items-center gap-0.5 bg-white/3 border border-white/5 rounded-full py-1 px-4">
          <span className="text-[10px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-[#FF1744] tracking-widest uppercase font-mono">
            MOD-342
          </span>
          <span className="text-[8px] text-neutral-500 leading-none">توقيع المطور والمسؤول الإشرافي</span>
        </div>

      </div>
    </div>
  );
}

export function MascotOfflineScreen() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setIsDismissed(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setIsDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerManualRetry = () => {
    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      const online = navigator.onLine;
      setIsOffline(!online);
      if (online) {
        setIsDismissed(false);
        window.location.reload();
      }
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOffline && !isDismissed && (
        <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] relative overflow-hidden text-right"
          >
            {/* Top red danger accent line */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#FF1744] via-rose-500 to-[#FF1744] opacity-85" />

            {/* Close Button ("يمكن الخروج منه") */}
            <button
              onClick={() => setIsDismissed(true)}
              className="absolute top-4 left-4 w-7 h-7 bg-zinc-900 border border-white/5 hover:border-white/10 text-neutral-400 hover:text-white rounded-lg flex items-center justify-center cursor-pointer transition"
              title="إغلاق التنبيه والاستمرار"
            >
              <X size={14} />
            </button>

            {/* Circular Alert Icon */}
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-[#FF1744] mb-4">
              <WifiOff size={22} className="animate-pulse" />
            </div>

            {/* Error messaging and guidance */}
            <div className="space-y-2">
              <h3 className="text-white font-black text-base flex items-center gap-2">
                <span>انقطع الاتصال بالإنترنت 📡</span>
              </h3>
              
              <p className="text-xs text-neutral-300 leading-relaxed font-semibold">
                تعذر الوصول إلى الخادم الرئيسي لتحديث البث والمقاطع. يرجى التحقق من جودة إشارة الراوتر أو تفعيل بيانات الهاتف الجوال.
              </p>

              {/* Attempted solutions block */}
              <div className="bg-zinc-900/80 border border-white/5 rounded-xl p-3 space-y-1.5 mt-2">
                <span className="text-[10px] font-bold text-[#FF1744] block">محاولة الحل من النظام:</span>
                <p className="text-[11px] text-neutral-400 leading-normal flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping inline-block" />
                  <span>جاري رصد إشارة الشبكة تلقائياً لإعادة الاتصال ومزامنة القوائم فوراً بدون إزعاجك.</span>
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="mt-5 space-y-2">
              <button
                disabled={isChecking}
                onClick={triggerManualRetry}
                className="w-full bg-[#FF1744] hover:bg-rose-600 disabled:opacity-50 text-white font-black text-xs py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 border border-white/10 shadow-lg shadow-rose-600/10"
              >
                {isChecking ? (
                  <RefreshCw size={12} className="animate-spin text-white" />
                ) : (
                  <RefreshCw size={12} />
                )}
                <span>إعادة محاولة الاتصال وتحديث الصفحة</span>
              </button>

              <button
                onClick={() => setIsDismissed(true)}
                className="w-full bg-zinc-900 hover:bg-zinc-850 hover:border-white/5 text-neutral-400 hover:text-white font-bold text-[11px] py-2 rounded-xl transition cursor-pointer border border-zinc-800"
              >
                إغلاق التنبيه والمتابعة مؤقتاً
              </button>
            </div>

            {/* Footer with developer trademark key signature */}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[8px] text-neutral-500 font-mono">
              <span className="font-sans">بوابة كشف انقطاع الاتصالات الذكية</span>
              <span className="text-[#FF1744] font-bold">MOD-342</span>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

