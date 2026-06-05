import React, { useState } from 'react';
import { Play, Zap, Volume2, VolumeX, Flame, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, getIsMutedGlobal, toggleGlobalMute } from '../../utils/gameAudio';

const BATTLES = [
  { id: 1, charA: { name: 'غوكو SSJ1', img: 'https://cdn.myanimelist.net/images/anime/10/7751.jpg', power: 150000000 }, charB: { name: 'فريزا الشكل النهائي', img: 'https://cdn.myanimelist.net/images/anime/11/20427.jpg', power: 120000000 } },
  { id: 2, charA: { name: 'سايتاما', img: 'https://cdn.myanimelist.net/images/anime/12/76049.jpg', power: 999999999 }, charB: { name: 'غاروه', img: 'https://cdn.myanimelist.net/images/anime/11/97610.jpg', power: 8500000 } },
  { id: 3, charA: { name: 'غوجو ساتورو', img: 'https://cdn.myanimelist.net/images/anime/1171/109222.jpg', power: 500000 }, charB: { name: 'سوكونا (15 إصبع)', img: 'https://cdn.myanimelist.net/images/anime/12/108398.jpg', power: 450000 } },
  { id: 4, charA: { name: 'ميريوم', img: 'https://cdn.myanimelist.net/images/anime/1337/99013.jpg', power: 250000 }, charB: { name: 'نيتيرو', img: 'https://cdn.myanimelist.net/images/characters/16/238805.jpg', power: 180000 } },
  { id: 5, charA: { name: 'مادارا أوتشيها', img: 'https://cdn.myanimelist.net/images/anime/13/17405.jpg', power: 800000 }, charB: { name: 'هاشيراما سينجو', img: 'https://cdn.myanimelist.net/images/characters/7/205631.jpg', power: 780000 } },
];

export default function PowerLevelGame({ onScoreUpdate }: { onScoreUpdate: (pts: number) => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'playing' | 'answered'>('playing');
  const [choice, setChoice] = useState<'A' | 'B' | null>(null);
  const [streak, setStreak] = useState(0);
  const [muted, setMuted] = useState(getIsMutedGlobal());

  const battle = BATTLES[currentIdx % BATTLES.length];
  const charA = battle.charA;
  const charB = battle.charB;

  const toggleMuteLocal = () => {
    const isMutedNow = toggleGlobalMute();
    setMuted(isMutedNow);
    playSound('click');
  };

  const handleGuess = (guess: 'A' | 'B') => {
    if (status !== 'playing') return;
    setChoice(guess);
    setStatus('answered');
    
    const aIsStronger = charA.power > charB.power;
    const isCorrect = (guess === 'A' && aIsStronger) || (guess === 'B' && !aIsStronger);
    
    if (isCorrect) {
      playSound('win');
      const multiplier = streak >= 5 ? 2.0 : streak >= 3 ? 1.5 : 1.0;
      const finalPoints = Math.ceil(15 * multiplier);
      
      setStreak(s => s + 1);
      setScore(s => s + finalPoints);
      onScoreUpdate(finalPoints);
    } else {
      playSound('lose');
      setStreak(0);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const nextBattle = () => {
    playSound('click');
    setStatus('playing');
    setChoice(null);
    setCurrentIdx(c => c + 1);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-[#121212] rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl relative flex flex-col h-[550px] md:h-[600px] font-sans">
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
           className="absolute top-16 right-4 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full z-20 flex items-center gap-1 shadow-lg shadow-orange-500/20 shadow-inner"
         >
           <Flame size={12} className="animate-bounce" />
           <span>سلسلة: {streak}</span>
           {streak >= 3 && <span className="text-[8px] bg-black/35 px-1 rounded">x{streak >= 5 ? '2.0' : '1.5'}</span>}
         </motion.div>
       )}

       <div className="flex-1 flex flex-col md:flex-row relative">
         {/* Char A */}
         <div 
           className={`flex-1 relative cursor-pointer transition select-none ${status === 'playing' ? 'hover:opacity-90 active:scale-95' : ''}`}
           onClick={() => handleGuess('A')}
         >
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/90 via-black/40 to-transparent z-10 pointer-events-none"></div>
            <img src={charA.img} alt={charA.name} className="absolute inset-0 w-full h-full object-cover filter brightness-75 contrast-125" />
            <div className="absolute bottom-6 md:bottom-auto md:top-1/2 md:-translate-y-1/2 left-0 right-0 md:left-6 md:right-auto z-20 text-center px-4">
              <span className="text-yellow-400 text-[10px] bg-black/50 px-2 py-0.5 rounded-full font-bold">مقاتل أ</span>
              <h3 className="text-white font-black text-xl drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)] mt-1">{charA.name}</h3>
              {status === 'answered' && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`mt-2 px-3 py-1 rounded-xl inline-block font-black text-xs sm:text-sm border-2 ${charA.power > charB.power ? 'bg-green-600 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-red-600 border-red-400'} text-white shadow-xl`}>
                  {formatNumber(charA.power)} HP
                </motion.div>
              )}
            </div>
            {choice === 'A' && status === 'answered' && (
              <div className={`absolute inset-0 border-4 z-30 animate-pulse ${charA.power > charB.power ? 'border-green-500' : 'border-red-500'}`}></div>
            )}
         </div>

         <div className="w-full h-2 md:w-2 md:h-full bg-neutral-800 z-20 relative">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-black border-4 border-neutral-800 rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(234,179,8,0.5)] z-30 select-none">
              <Zap size={18} className="text-yellow-500 animate-pulse" />
            </div>
         </div>

         {/* Char B */}
         <div 
           className={`flex-1 relative cursor-pointer transition select-none ${status === 'playing' ? 'hover:opacity-90 active:scale-95' : ''}`}
           onClick={() => handleGuess('B')}
         >
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-l from-black/90 via-black/40 to-transparent z-10 pointer-events-none"></div>
            <img src={charB.img} alt={charB.name} className="absolute inset-0 w-full h-full object-cover filter brightness-75 contrast-125" />
            <div className="absolute bottom-6 md:bottom-auto md:top-1/2 md:-translate-y-1/2 left-0 right-0 md:right-6 md:left-auto z-20 text-center px-4">
              <span className="text-yellow-400 text-[10px] bg-black/50 px-2 py-0.5 rounded-full font-bold">مقاتل ب</span>
              <h3 className="text-white font-black text-xl drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)] mt-1">{charB.name}</h3>
              {status === 'answered' && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`mt-2 px-3 py-1 rounded-xl inline-block font-black text-xs sm:text-sm border-2 ${charB.power > charA.power ? 'bg-green-600 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-red-600 border-red-400'} text-white shadow-xl`}>
                  {formatNumber(charB.power)} HP
                </motion.div>
              )}
            </div>
            {choice === 'B' && status === 'answered' && (
              <div className={`absolute inset-0 border-4 z-30 animate-pulse ${charB.power > charA.power ? 'border-green-500' : 'border-red-500'}`}></div>
            )}
         </div>
       </div>

       {status === 'answered' && (
          <div className="p-4 bg-black pb-6 absolute bottom-0 left-0 right-0 z-40 bg-opacity-90 backdrop-blur-md border-t border-neutral-800">
             <AnimatePresence>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <button onClick={nextBattle} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition flex justify-center items-center gap-2 text-md shadow-[0_0_20px_rgba(37,99,235,0.3)] cursor-pointer">
                     <span>القتال التالي</span> 
                     <Play size={16} fill="currentColor" />
                  </button>
                </motion.div>
             </AnimatePresence>
          </div>
       )}
    </div>
  );
}
