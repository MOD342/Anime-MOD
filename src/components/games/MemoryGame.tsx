import React, { useState, useEffect } from 'react';
import { Play, Check, X, Brain, Volume2, VolumeX, Flame, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, getIsMutedGlobal, toggleGlobalMute } from '../../utils/gameAudio';

const ANIME_ROSTER = [
  { id: '1', name: 'لوفي', img: 'https://cdn.myanimelist.net/images/characters/9/310307.jpg' },
  { id: '2', name: 'زورو', img: 'https://cdn.myanimelist.net/images/characters/15/271383.jpg' },
  { id: '3', name: 'ناروتو', img: 'https://cdn.myanimelist.net/images/characters/9/131317.jpg' },
  { id: '4', name: 'ساسكي', img: 'https://cdn.myanimelist.net/images/characters/15/304543.jpg' },
  { id: '5', name: 'غوكو', img: 'https://cdn.myanimelist.net/images/characters/15/263399.jpg' },
  { id: '6', name: 'فيجيتا', img: 'https://cdn.myanimelist.net/images/characters/3/302403.jpg' },
  { id: '7', name: 'ليفاي', img: 'https://cdn.myanimelist.net/images/characters/2/241031.jpg' },
  { id: '8', name: 'إرين', img: 'https://cdn.myanimelist.net/images/characters/3/218013.jpg' },
  { id: '9', name: 'غوجو', img: 'https://cdn.myanimelist.net/images/characters/2/439744.jpg' },
  { id: '10', name: 'سايتاما', img: 'https://cdn.myanimelist.net/images/characters/11/286916.jpg' },
  { id: '11', name: 'غون', img: 'https://cdn.myanimelist.net/images/characters/11/242253.jpg' },
  { id: '12', name: 'كيلوا', img: 'https://cdn.myanimelist.net/images/characters/13/214451.jpg' },
  { id: '13', name: 'لايت', img: 'https://cdn.myanimelist.net/images/characters/6/275115.jpg' },
  { id: '14', name: 'إل (L)', img: 'https://cdn.myanimelist.net/images/characters/10/63813.jpg' },
  { id: '15', name: 'تانجيرو', img: 'https://cdn.myanimelist.net/images/characters/11/384795.jpg' },
  { id: '16', name: 'نيزوكو', img: 'https://cdn.myanimelist.net/images/characters/3/384797.jpg' },
  { id: '17', name: 'إدوارد', img: 'https://cdn.myanimelist.net/images/characters/9/72533.jpg' },
  { id: '18', name: 'كانيكي', img: 'https://cdn.myanimelist.net/images/characters/2/324102.jpg' },
  { id: '19', name: 'لولوش', img: 'https://cdn.myanimelist.net/images/characters/12/37996.jpg' },
  { id: '20', name: 'جينتوكي', img: 'https://cdn.myanimelist.net/images/characters/3/53077.jpg' }
];

function shuffleArray(array: any[]) {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export default function MemoryGame({ onScoreUpdate }: { onScoreUpdate: (pts: number) => void }) {
  const [grid, setGrid] = useState<any[]>([]);
  const [target, setTarget] = useState<any>(null);
  const [status, setStatus] = useState<'memorize' | 'guessing' | 'answered'>('memorize');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [muted, setMuted] = useState(getIsMutedGlobal());

  useEffect(() => {
    startRound();
  }, []);

  useEffect(() => {
    if (status !== 'memorize') return;
    
    if (timeLeft <= 0) {
      playSound('powerup');
      setStatus('guessing');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, status]);

  const toggleMuteLocal = () => {
    const isMutedNow = toggleGlobalMute();
    setMuted(isMutedNow);
    playSound('click');
  };

  const startRound = () => {
    playSound('click');
    const shuffled = shuffleArray(ANIME_ROSTER).slice(0, 9); // always 3x3
    setGrid(shuffled);
    setTarget(shuffled[Math.floor(Math.random() * shuffled.length)]);
    setStatus('memorize');
    setTimeLeft(3); // 3 seconds to memorize
    setSelectedIndex(null);
  };

  const handleGuess = (idx: number) => {
    if (status !== 'guessing') return;
    setSelectedIndex(idx);
    setStatus('answered');
    
    const isCorrect = grid[idx].id === target.id;
    if (isCorrect) {
      playSound('win');
      const multiplier = streak >= 5 ? 2.0 : streak >= 3 ? 1.5 : 1.0;
      const finalPoints = Math.ceil(30 * multiplier);
      
      setStreak(s => s + 1);
      setScore(s => s + finalPoints);
      onScoreUpdate(finalPoints);
    } else {
      playSound('lose');
      setStreak(0);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-[#121212] rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl relative flex flex-col h-full md:h-auto min-h-[500px] font-sans">
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
           className="absolute top-16 right-4 bg-gradient-to-r from-teal-600 to-indigo-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full z-20 flex items-center gap-1 shadow-lg shadow-teal-500/20"
         >
           <Flame size={12} className="animate-pulse" />
           <span>سلسلة: {streak}</span>
           {streak >= 3 && <span className="text-[8px] bg-black/35 px-1 rounded">x{streak >= 5 ? '2.0' : '1.5'}</span>}
         </motion.div>
       )}

       <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-indigo-950/25 to-black relative">
         <Brain className="absolute top-8 left-8 text-indigo-500/10 animate-pulse" size={120} />
         
         <div className="z-10 text-center mb-6 mt-8">
            {status === 'memorize' ? (
              <>
                <h2 className="text-indigo-400 font-black text-sm mb-2">🧠 تذكر أماكن الأبطال فوراً!</h2>
                <div className="text-4xl font-black text-white bg-black/50 w-16 h-16 rounded-2xl flex items-center justify-center border border-indigo-500/20 mx-auto shadow-lg select-none">
                  {timeLeft}
                </div>
              </>
            ) : status === 'guessing' ? (
              <>
                <h2 className="text-white text-md font-black mb-2">أين يختبئ هذا الكاشف؟</h2>
                <div className="text-2xl font-black text-white px-5 py-3 bg-indigo-600 rounded-2xl inline-block shadow-[0_0_20px_rgba(79,70,229,0.35)] select-none">
                  "{target?.name}"
                </div>
              </>
            ) : (
              <h2 className={`text-2xl font-black ${selectedIndex !== null && grid[selectedIndex].id === target.id ? 'text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'text-red-500'}`}>
                 {selectedIndex !== null && grid[selectedIndex].id === target.id ? 'إجازة نينجا صحيحة! 🎉' : 'فشل مأساوي! 💀'}
              </h2>
            )}
         </div>

         <div className="grid grid-cols-3 gap-2 w-full max-w-[300px] z-10 mx-auto bg-black p-3 rounded-2xl border border-neutral-800 shadow-inner select-none">
            {grid.map((item, idx) => {
              const isHidden = status === 'guessing';
              const isSelected = selectedIndex === idx;
              const isTarget = item.id === target?.id;
              const showReveal = status === 'answered';

              let borderColor = 'border-transparent';
              if (showReveal) {
                 if (isTarget) borderColor = 'border-4 border-green-500 shadow-green-500/40 shadow-inner';
                 else if (isSelected && !isTarget) borderColor = 'border-4 border-red-500';
              }

              return (
                <div 
                  key={idx} 
                  onClick={() => handleGuess(idx)}
                  className={`aspect-square rounded-xl bg-neutral-900 overflow-hidden relative cursor-pointer ${borderColor} transition-all duration-300 w-full hover:scale-105 active:scale-95`}
                >
                  <div className={`w-full h-full transition-transform duration-500 ease-in-out ${isHidden ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}>
                    <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  {isHidden && (
                    <div className="absolute inset-0 flex items-center justify-center bg-indigo-900/30 text-indigo-400">
                      <Brain size={24} className="animate-pulse" />
                    </div>
                  )}
                </div>
              );
            })}
         </div>
         
         {status === 'answered' && (
           <AnimatePresence>
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 w-full max-w-[250px]">
                <button onClick={startRound} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition flex justify-center items-center gap-2 text-md shadow-[0_0_20px_rgba(37,99,235,0.3)] cursor-pointer">
                   <span>تحدي آخر</span> 
                   <Play size={16} fill="currentColor" />
                </button>
              </motion.div>
           </AnimatePresence>
         )}
       </div>
    </div>
  );
}
