import React, { useState, useMemo } from 'react';
import { Play, Check, X, User, Sparkles, Volume2, VolumeX, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, getIsMutedGlobal, toggleGlobalMute } from '../../utils/gameAudio';

const CHARACTERS = [
  { id: 1, name: 'لوفي', img: 'https://cdn.myanimelist.net/images/characters/9/310307.jpg', options: ['إرين', 'لوفي', 'غون', 'ناروتو'], correct: 1 },
  { id: 2, name: 'إرين ييغر', img: 'https://cdn.myanimelist.net/images/characters/3/218013.jpg', options: ['لوش', 'ساسكي', 'إرين ييغر', 'ليفاي'], correct: 2 },
  { id: 3, name: 'غوجو ساتورو', img: 'https://cdn.myanimelist.net/images/characters/2/439744.jpg', options: ['كاكاشي', 'غوجو ساتورو', 'كيلوا', 'جينتوكي'], correct: 1 },
  { id: 4, name: 'سايتاما', img: 'https://cdn.myanimelist.net/images/characters/11/286916.jpg', options: ['سايتاما', 'كوريلين', 'ايككاكو', 'تيان'], correct: 0 },
  { id: 5, name: 'إدوارد إلريك', img: 'https://cdn.myanimelist.net/images/characters/9/72533.jpg', options: ['ألفونس', 'روي موستانغ', 'إدوارد إلريك', 'لين ياو'], correct: 2 },
  { id: 6, name: 'ساسكي أوتشيها', img: 'https://cdn.myanimelist.net/images/characters/9/131317.jpg', options: ['كيبا', 'ميناتو', 'ساسكي أوتشيها', 'إيتاتشي'], correct: 2 },
  { id: 7, name: 'إيتاتشي أوتشيها', img: 'https://cdn.myanimelist.net/images/characters/16/205629.jpg', options: ['إيتاتشي أوتشيها', 'نيجي', 'مادارا', 'أوبيتو'], correct: 0 },
  { id: 8, name: 'كيلوا زولديك', img: 'https://cdn.myanimelist.net/images/characters/13/214451.jpg', options: ['غون', 'كيلوا زولديك', 'كورابيكا', 'ليوريو'], correct: 1 },
  { id: 9, name: 'رورونوا زورو', img: 'https://cdn.myanimelist.net/images/characters/15/271383.jpg', options: ['سانجي', 'لوفي', 'رورونوا زورو', 'ميهوك'], correct: 2 },
  { id: 10, name: 'ليفاي أكرمان', img: 'https://cdn.myanimelist.net/images/characters/2/241031.jpg', options: ['إروين', 'آرمين', 'ليفاي أكرمان', 'إرين'], correct: 2 },
  { id: 11, name: 'كين كينيكي', img: 'https://cdn.myanimelist.net/images/characters/2/324102.jpg', options: ['توكا', 'كين كينيكي', 'أوتو', 'نيشيكي'], correct: 1 },
  { id: 12, name: 'سون غوكو', img: 'https://cdn.myanimelist.net/images/characters/15/263399.jpg', options: ['فيجيتا', 'سون غوكو', 'غوهان', 'ترانكس'], correct: 1 },
  { id: 13, name: 'لايت ياغامي', img: 'https://cdn.myanimelist.net/images/characters/6/275115.jpg', options: ['إل', 'لايت ياغامي', 'ريوك', 'ماتسو'], correct: 1 },
  { id: 14, name: 'تانجيرو كامادو', img: 'https://cdn.myanimelist.net/images/characters/11/384795.jpg', options: ['زينيتسو', 'إينوسكي', 'تانجيرو كامادو', 'توميوكا'], correct: 2 },
  { id: 15, name: 'ميكاسا أكرمان', img: 'https://cdn.myanimelist.net/images/characters/9/215513.jpg', options: ['آني', 'ساشا', 'ميكاسا أكرمان', 'كريستا'], correct: 2 }
];

export default function SilhouetteGame({ onScoreUpdate }: { onScoreUpdate: (pts: number) => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'playing' | 'answered'>('playing');
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [muted, setMuted] = useState(getIsMutedGlobal());

  const char = useMemo(() => {
    return CHARACTERS[currentIdx % CHARACTERS.length];
  }, [currentIdx]);

  const toggleMuteLocal = () => {
    const isMutedNow = toggleGlobalMute();
    setMuted(isMutedNow);
    playSound('click');
  };

  const handleGuess = (idx: number) => {
    if (status !== 'playing') return;
    setSelectedOpt(idx);
    setStatus('answered');
    
    const isCorrect = idx === char.correct;
    if (isCorrect) {
      playSound('win');
      const multiplier = streak >= 5 ? 2.0 : streak >= 3 ? 1.5 : 1.0;
      const finalPoints = Math.ceil(20 * multiplier);
      
      setStreak(s => s + 1);
      setScore(s => s + finalPoints);
      onScoreUpdate(finalPoints);
    } else {
      playSound('lose');
      setStreak(0);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-[#121212] rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl relative flex flex-col h-full md:h-[600px] font-sans">
       {/* Top Header Row Controls */}
       <div className="absolute top-4 right-4 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl text-yellow-500 font-black z-30 border border-yellow-500/20 shadow-lg text-xs flex items-center gap-1.5 select-none">
         <Sparkles size={12} className="text-yellow-400" />
         <span>النتيجة: {score}</span>
       </div>

       <div className="absolute top-4 left-4 flex gap-2 z-35 bg-transparent">
         {/* Mute Button */}
         <button 
           onClick={toggleMuteLocal}
           className="bg-black/80 backdrop-blur-md p-2 rounded-xl text-white border border-white/10 hover:bg-neutral-800 transition cursor-pointer z-40"
           title={muted ? "تشغيل الصوت" : "كتم الصوت"}
         >
           {muted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} className="text-green-400" />}
         </button>
       </div>

       {/* Streak Badge */}
       {streak > 0 && (
         <motion.div 
           initial={{ scale: 0.5, y: -10, opacity: 0 }}
           animate={{ scale: 1, y: 0, opacity: 1 }}
           className="absolute top-16 right-4 bg-gradient-to-r from-yellow-600 to-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full z-20 flex items-center gap-1 shadow-lg shadow-yellow-500/20"
         >
           <Flame size={12} className="animate-pulse" />
           <span>سلسلة: {streak}</span>
           {streak >= 3 && <span className="text-[8px] bg-black/35 px-1 rounded">x{streak >= 5 ? '2.0' : '1.5'}</span>}
         </motion.div>
       )}

       <div className="flex-1 relative flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#18181b] to-black">
         <User className="absolute top-8 left-8 text-neutral-800/20 animate-pulse" size={120} />
         <h2 className="text-white text-md font-black mb-6 z-10 text-center flex items-center gap-1.5">
           👤 خمن الشخصية من ظلها الأسود الغامض!
         </h2>
         
         <div className="w-48 h-48 sm:w-64 sm:h-64 relative z-10 bg-black/40 rounded-3xl p-4 border border-white/5 flex items-center justify-center overflow-hidden mb-4 shadow-inner">
           {/* If playing, we use brightness-0 to make it stark black. If answered, reveal it */}
           <img 
             src={char.img} 
             alt="Silhouette" 
             className={`w-full h-full object-contain transition-all duration-1000 ${status === 'playing' ? 'brightness-0 contrast-200 grayscale drop-shadow-[0_0_15px_rgba(255,255,255,0.25)]' : 'brightness-100'}`} 
             crossOrigin="anonymous"
           />
         </div>
       </div>

       <div className="p-4 bg-black border-t border-neutral-800 rounded-t-3xl relative z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
            <div className="grid grid-cols-2 gap-3">
               {char.options.map((opt, idx) => {
                 const isSelected = selectedOpt === idx;
                 const isCorrect = idx === char.correct;
                 let bgColor = "bg-neutral-900 border-neutral-800 text-neutral-200 hover:bg-neutral-800 hover:border-blue-500/50";
                 
                 if (status === 'answered') {
                   if (isCorrect) bgColor = "bg-green-600 border-green-500 text-white font-black shadow-[0_0_15px_rgba(34,197,94,0.3)]";
                   else if (isSelected) bgColor = "bg-red-650 border-red-550 text-white";
                   else bgColor = "bg-neutral-900 border-neutral-800 text-neutral-500 opacity-40";
                 }

                 return (
                   <button
                     key={idx}
                     type="button"
                     onClick={() => handleGuess(idx)}
                     disabled={status === 'answered'}
                     className={`p-4 rounded-xl border text-xs sm:text-sm transition-all duration-300 font-black flex items-center justify-center gap-2 cursor-pointer ${bgColor}`}
                   >
                     <span>{opt}</span>
                     {status === 'answered' && isCorrect && <Check size={14} className="stroke-[3]" />}
                     {status === 'answered' && isSelected && !isCorrect && <X size={14} className="stroke-[3]" />}
                   </button>
                 )
               })}
            </div>
            
            {status === 'answered' && (
              <AnimatePresence>
                 <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4 overflow-hidden">
                   <button 
                     onClick={() => { playSound('click'); setStatus('playing'); setSelectedOpt(null); setCurrentIdx(c => c + 1); }} 
                     className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition flex justify-center items-center gap-2 text-md shadow-[0_0_20px_rgba(37,99,235,0.3)] cursor-pointer"
                   >
                      <span>البطل التالي</span> 
                      <Play size={16} fill="currentColor" />
                   </button>
                 </motion.div>
              </AnimatePresence>
            )}
       </div>
    </div>
  );
}
