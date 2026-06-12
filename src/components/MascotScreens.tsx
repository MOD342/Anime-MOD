import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, RefreshCw, Terminal, Search, Cpu, Wifi } from 'lucide-react';

// ===================================
// IMPORT DEFAULT MASCOT IMAGES
// ===================================
// @ts-ignore
import modLoadingImg from '../assets/images/mod_loading_1781299436711.jpg';
// @ts-ignore
import modOfflineImg from '../assets/images/mod_offline_1781299453921.jpg';

// Animated searching/typing phrases in Arabic
const loadingPhrases = [
  'جاري مزامنة بيانات "MOD" مع خوادم الأوتاكو الذكية... 📡',
  'البحث عن حلقات الأنمي المفقودة وتنسيق مشغلات البث... ⚔️',
  'تحديث الهوية الجديدة لمنصة أوتاكو هاب وتثبيت الأدوات... ✨',
  'شحن طاقة الأوتار لإطلاق ميزات التفاعل والغرف الجماعية... 🛡️',
  'مود تبحث وتجمع الكوينز والجوائز اليومية المفقودة لأجلك... 🎁',
  'تحميل الأسئلة الثقافية وبطاقات التحدي الحماسية... 🎯'
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

  // Show splash for at least 3.2 seconds for a luxurious loading feel
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 3200);
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
    }, 45);

    return () => clearInterval(interval);
  }, [phraseIndex]);

  // Procedural futuristic log emulator
  useEffect(() => {
    const logs = [
      'SYSTEM: Booting MOD Core Engine v3.1_Otaku Hub...',
      'DB: Handshaking securely with modern Firestore database cloud...',
      'USER_ROLE: Verifying premium authorization tokens and security rules...',
      'CACHING: Running ultra-fast cache check [Status: Stable]...',
      'MOD_MEMBER: Welcome! Mod is active, loading interface blocks...'
    ];
    let index = 0;
    const interval = setInterval(() => {
      if (index < logs.length) {
        setTerminalLogs((prev) => [...prev, logs[index]]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#040408] z-[999999] flex flex-col items-center justify-center p-6 select-none overflow-hidden" dir="rtl">
      {/* Dynamic Hexagon Grid Overlay in BG */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.1),transparent_70%)] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(#8b5cf6 1.8px, transparent 1.8px)`,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Floating Animated Emojis in background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        {['🌸', '🍙', '⭐', '🎬', '⚡', '🤖', '🍥', '🔮'].map((item, idx) => (
          <motion.div
            key={idx}
            className="absolute text-xl sm:text-2xl"
            style={{
              top: `${10 + (idx * 14) % 80}%`,
              left: `${5 + (idx * 17) % 90}%`,
            }}
            animate={{
              y: [0, -30, 0],
              rotate: [0, 360],
              scale: [0.9, 1.1, 0.9],
            }}
            transition={{
              duration: 5 + idx * 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {item}
          </motion.div>
        ))}
      </div>

      <div className="relative max-w-sm w-full flex flex-col items-center text-center gap-7 z-10">
        
        {/* Holographic Avatar Stage */}
        <div className="relative w-44 h-44 sm:w-52 sm:h-52">
          {/* Cyber Circular Glow Rings */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#8b5cf6] via-[#ec4899] to-[#3b82f6] animate-spin duration-8000 opacity-40 blur-md" />
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-20 blur-xl animate-pulse" />
          
          {/* Inside Stage container */}
          <div className="absolute inset-1.5 bg-[#0a0a14] rounded-full p-2 overflow-hidden border border-white/15 flex items-center justify-center">
            
            {/* The Stunning High Fidelity AI-Generated Character Image */}
            <motion.img
              src={modLoadingImg}
              alt="MOD Mascot typing"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-full filter brightness-110 contrast-105 pointer-events-none"
              animate={{
                scale: [1, 1.04, 1],
                y: [0, -4, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Neon Glitch / Hologram Scanning Beam Line Overlay */}
            <motion.div 
              className="absolute left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_8px_#a78bfa] opacity-60"
              animate={{
                top: ['10%', '90%', '10%'],
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>

          {/* Fully Interactive Overlay: Vector Hands overlayed in front typing fast */}
          <div className="absolute inset-0 flex flex-col justify-end items-center pointer-events-none pb-1.5">
            
            {/* Chibi Holographic Keypad Vector glowing */}
            <svg viewBox="0 0 100 30" className="w-28 h-8 drop-shadow-[0_0_10px_#ec4899] opacity-90">
              <ellipse cx="50" cy="18" rx="35" ry="6" fill="rgba(15, 10, 32, 0.9)" stroke="#ec4899" strokeWidth="1" />
              {/* Virtual Keyboard Grid dots */}
              <circle cx="28" cy="17" r="1" fill="#a78bfa" className="animate-pulse" />
              <circle cx="38" cy="16" r="1" fill="#ec4899" />
              <circle cx="48" cy="16" r="1.2" fill="#a78bfa" />
              <circle cx="58" cy="16" r="1" fill="#e879f9" />
              <circle cx="68" cy="17" r="1" fill="#818cf8" />
              <line x1="38" y1="21" x2="62" y2="21" stroke="#ec4899" strokeWidth="1" strokeDasharray="2 1" />
            </svg>

            {/* Cute procedural typing hands flying over it! */}
            <div className="absolute inset-x-0 bottom-1 flex justify-between px-7">
              {/* Left hand typing */}
              <motion.div
                animate={{
                  y: [0, -10, 2, -12, 0],
                  x: [0, 4, -2, 3, 0],
                  scale: [1, 1.1, 0.9, 1.15, 1],
                }}
                transition={{
                  duration: 0.32,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="w-4.5 h-4.5 bg-purple-400 rounded-full border border-pink-300 shadow-[0_0_6px_#f472b6]"
              />
              {/* Right hand typing out of phase */}
              <motion.div
                animate={{
                  y: [0, -12, 1, -8, 0],
                  x: [0, -3, 3, -1, 0],
                  scale: [1, 1.15, 0.95, 1.1, 1],
                }}
                transition={{
                  duration: 0.28,
                  repeat: Infinity,
                  ease: "linear",
                  delay: 0.12,
                }}
                className="w-4.5 h-4.5 bg-pink-400 rounded-full border border-purple-300 shadow-[0_0_6px_#a78bfa]"
              />
            </div>
          </div>

          {/* Typing Badge */}
          <span className="absolute -bottom-1 -right-2 bg-purple-600 text-[10px] font-black text-white px-2.5 py-1 rounded-full border border-purple-400 shadow-md flex items-center gap-1.5 animate-bounce">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            تكتب وتبحث...
          </span>
        </div>

        {/* Identity & Headers */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-[10px] font-black tracking-widest text-[#8b5cf6] uppercase bg-purple-500/10 px-2.5 py-0.5 rounded-md border border-purple-500/20">
              OFFICIAL APP MASCOT
            </span>
          </div>
          
          <h1 className="text-xl sm:text-2xl font-black text-white">
            هنا رفيقتكم <span className="text-pink-500">مــود (MOD)</span> ✨
          </h1>
          
          <p className="text-xs text-neutral-400 font-medium max-w-[290px] mx-auto leading-relaxed">
            الوجه الجديد لمنصة أوتاكو هاب، جاهزة دائماً لمساعدتك في جمع المعلومات وتحديث الواجهة بلمح البصر!
          </p>
        </div>

        {/* Real-time Status Card block with typewriting dynamic text */}
        <div className="w-full bg-[#110e1a]/80 backdrop-blur-md border border-purple-500/15 rounded-2xl p-4 space-y-3.5 shadow-2xl relative min-h-[90px] flex flex-col justify-center">
          <div className="absolute top-2 right-3 flex items-center gap-1 text-[8px] font-mono text-purple-400">
            <Search size={8} /> MOD_SEARCH_DATABASE
          </div>

          <div className="text-right">
            <p className="text-xs font-bold text-neutral-200 leading-normal break-keep min-h-[40px]">
              {typedChars}
              <span className="inline-block w-1.5 h-3.5 bg-pink-500 animate-pulse mr-0.5" />
            </p>
          </div>

          {/* Progress / Loading Bar */}
          <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden relative">
            <motion.div 
              className="absolute top-0 bottom-0 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 rounded-full"
              initial={{ left: "-40%", width: "40%" }}
              animate={{ left: "100%" }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </div>

        {/* Emulated Logs output board */}
        <div className="w-full bg-[#030306] border border-neutral-900 rounded-xl p-3 text-right font-mono text-[9px] text-neutral-500 space-y-1 select-none pointer-events-none h-[100px] overflow-hidden shadow-inner">
          <p className="text-neutral-400 font-bold border-b border-white/5 pb-1 mb-1 flex items-center gap-1">
            <Terminal size={9} className="text-[#ec4899]" />
            <span>نظام تشغيل مود وبث الاستجابات</span>
          </p>
          <div className="space-y-1 h-[75px] overflow-y-auto">
            {terminalLogs.map((log, index) => (
              <p key={index} className="flex items-center gap-1">
                <span className="text-[#8b5cf6]">›</span>
                <span>{log}</span>
              </p>
            ))}
            {terminalLogs.length < 5 && (
              <p className="text-neutral-600 animate-pulse">⚡ Loading core platform components...</p>
            )}
          </div>
        </div>

        {/* Slogan footnote */}
        <p className="text-[10px] text-neutral-500 font-bold flex items-center gap-1.5 mt-1 animate-pulse justify-center">
          <Cpu size={10} />
          <span>الاتصال بالخادم الرئيسي مؤمن بـ SSL ومستقر</span>
        </p>

      </div>
    </div>
  );
}

export function MascotOfflineScreen() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [angerLevel, setAngerLevel] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerAngerClick = () => {
    setAngerLevel((prev) => prev + 1);
    setIsOffline(!navigator.onLine);
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#07050a] z-[999999] flex flex-col items-center justify-center p-6 select-none overflow-hidden" 
          dir="rtl"
        >
          {/* Intense red gradient blink during distress */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.1),transparent_70%)] animate-pulse duration-2000 pointer-events-none" />

          <div className="relative max-w-sm w-full flex flex-col items-center text-center gap-6 z-10">

            {/* Offline Frame & Avatar Stage */}
            <motion.div 
              key={angerLevel}
              animate={{
                // Slam and jitter reactions based on click counts
                x: angerLevel > 0 ? [-10, 10, -8, 8, -4, 4, 0] : 0,
                y: angerLevel > 0 ? [-8, 8, -6, 6, -3, 3, 0] : 0,
                rotate: angerLevel > 0 ? [-2, 2, -1, 1, 0] : 0,
              }}
              className="relative w-44 h-44 sm:w-52 sm:h-52"
              onAnimationComplete={() => setAngerLevel(0)}
            >
              {/* Outer Rage Ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-red-600 via-rose-500 to-orange-500 animate-ping opacity-40 blur-md pointer-events-none" />
              <div className="absolute inset-2 rounded-full bg-red-600 opacity-25 blur-xl pointer-events-none" />

              {/* Character container */}
              <div className="absolute inset-1.5 bg-[#0e0708] rounded-full p-2 overflow-hidden border border-red-500/30 flex items-center justify-center">
                
                {/* Genuine High-fidelity Angry Character */}
                <img
                  src={modOfflineImg}
                  alt="MOD Offline angry"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-full pointer-events-none filter brightness-105 contrast-110"
                />

                {/* Shacky Digital Glitch Line */}
                <motion.div 
                  className="absolute left-0 right-0 h-[2.5px] bg-[#f87171] shadow-[0_0_12px_#ef4444] opacity-80"
                  animate={{
                    top: ['20%', '80%', '20%'],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                  }}
                />
              </div>

              {/* Procedural Slamming Hands Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end items-center pointer-events-none pb-1">
                {/* Procedural Desk surface vector */}
                <svg viewBox="0 0 100 20" className="w-28 h-6 drop-shadow-[0_0_8px_#ef4444] opacity-90">
                  <rect x="15" y="8" width="70" height="4" fill="#311015" stroke="#ef4444" strokeWidth="1" rx="1" />
                </svg>

                {/* Alternating angry fist slam overlay animation */}
                <div className="absolute inset-x-0 bottom-2.5 flex justify-between px-8">
                  {/* Left hand fist slamming */}
                  <motion.div
                    animate={{
                      y: [0, -18, 0, -15, 0],
                      scale: [1, 1.2, 0.9, 1.15, 1],
                    }}
                    transition={{
                      duration: 0.38,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="w-4.5 h-4.5 bg-red-500 rounded-full border border-rose-300 shadow-[0_0_7px_#ef4444]"
                  />
                  {/* Right hand fist slamming out of sync */}
                  <motion.div
                    animate={{
                      y: [0, -14, 0, -18, 0],
                      scale: [1, 1.18, 0.95, 1.2, 1],
                    }}
                    transition={{
                      duration: 0.44,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.15,
                    }}
                    className="w-4.5 h-4.5 bg-rose-500 rounded-full border border-red-300 shadow-[0_0_7px_#ef4444]"
                  />
                </div>
              </div>

              {/* Status Reaction Comic Tag */}
              <span className="absolute bottom-1 right-2 bg-red-600 text-[10px] font-black text-white px-2.5 py-1 rounded-full border border-red-400 shadow-lg flex items-center gap-1.5 animate-bounce">
                <span>💢</span> مود مستاءة جداً
              </span>
            </motion.div>

            {/* Error Message Details */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1.5 animate-pulse">
                <span className="text-[10px] font-black tracking-widest text-red-500 uppercase bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20 flex items-center gap-1">
                  <WifiOff size={11} /> INTERNET_FAIL
                </span>
              </div>
              
              <h2 className="text-xl sm:text-2xl font-black text-white">
                توقف البث والاتصالات!
              </h2>
              
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-semibold px-2">
                لقد انقطع سلك الشبكة بالخوادم! تبدو <span className="text-red-400 font-extrabold">"مود" (MOD)</span> في غاية الغضب والعجلة من أمرها وتعبر عن شدة الاستياء!
              </p>

              <div className="bg-[#180a0e]/85 border border-red-900/35 rounded-2xl p-4 max-w-sm mt-1 text-right relative">
                <span className="text-[9px] font-bold text-red-400 block mb-1">رسالة من مود الغاضبة:</span>
                <p className="text-[11px] font-semibold text-neutral-300 leading-relaxed">
                  "يا ميزوهو الموقر! لقد تعبت في جلب وتصنيف أفضل عروض الأنمي اليوم ولهذا انقطع الاتصال فجأة! تحقق من الشبكة والراوتر في منزلك بسرعة وأعد إرسال نبضات الإشارة قبل أن يغلي شاي الماتشا الخاص بي! 🍲💢"
                </p>
              </div>
            </div>

            {/* Buttons for interactive re-checking and slamming */}
            <div className="w-full grid grid-cols-1 gap-2.5 max-w-sm px-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={triggerAngerClick}
                className="w-full bg-gradient-to-r from-red-600 via-rose-500 to-red-600 text-white font-extrabold text-xs py-3.5 rounded-xl border border-rose-400 shadow-md cursor-pointer transition flex items-center justify-center gap-2"
              >
                <RefreshCw size={12} className="animate-spin text-white" />
                <span>إعادة محاولة البث وتوصيل الشبكة</span>
              </motion.button>

              <p className="text-[10px] text-neutral-400 font-medium block mt-1 leading-normal">
                سنعيدك تلقائياً لغرف المنصة وبطاقاتك المميزة فور الكشف عن إشارة الإنترنت مجدداً.
              </p>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
