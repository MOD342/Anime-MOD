import React, { useState, useEffect } from 'react';
import { Play, TrendingUp, TrendingDown, Check, X, Trophy, Volume2, VolumeX, Flame, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, getIsMutedGlobal, toggleGlobalMute } from '../../utils/gameAudio';

const ANIME_SCORES = [
  { id: 1, title: 'Fullmetal Alchemist: Brotherhood', score: 9.10, img: 'https://cdn.myanimelist.net/images/anime/1208/94745.jpg' },
  { id: 2, title: 'Steins;Gate', score: 9.07, img: 'https://cdn.myanimelist.net/images/anime/1935/127974.jpg' },
  { id: 3, title: 'Attack on Titan Season 3 Part 2', score: 9.05, img: 'https://cdn.myanimelist.net/images/anime/1517/100633.jpg' },
  { id: 4, title: 'Gintama°', score: 9.06, img: 'https://cdn.myanimelist.net/images/anime/3/72078.jpg' },
  { id: 5, title: 'Hunter x Hunter (2011)', score: 9.04, img: 'https://cdn.myanimelist.net/images/anime/1337/99013.jpg' },
  { id: 6, title: 'Bleach', score: 7.95, img: 'https://cdn.myanimelist.net/images/anime/3/40451.jpg' },
  { id: 7, title: 'Naruto', score: 7.99, img: 'https://cdn.myanimelist.net/images/anime/13/17405.jpg' },
  { id: 8, title: 'Sword Art Online', score: 7.20, img: 'https://cdn.myanimelist.net/images/anime/11/39717.jpg' }
];

export default function TierBattleGame({ onScoreUpdate }: { onScoreUpdate: (pts: number) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'playing' | 'answered'>('playing');
  const [choice, setChoice] = useState<'higher' | 'lower' | null>(null);
  const [streak, setStreak] = useState(0);
  const [muted, setMuted] = useState(getIsMutedGlobal());
  
  const animeA = ANIME_SCORES[currentIndex % ANIME_SCORES.length];
  const animeB = ANIME_SCORES[(currentIndex + 1) % ANIME_SCORES.length];

  const toggleMuteLocal = () => {
    const isMutedNow = toggleGlobalMute();
    setMuted(isMutedNow);
    playSound('click');
  };

  const handleGuess = (guess: 'higher' | 'lower') => {
    if (status !== 'playing') return;
    setChoice(guess);
    setStatus('answered');
    
    const isHigher = animeB.score >= animeA.score;
    const isCorrect = (guess === 'higher' && isHigher) || (guess === 'lower' && !isHigher);
    
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

  const nextRound = () => {
    playSound('click');
    setCurrentIndex(c => c + 1);
    setStatus('playing');
    setChoice(null);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-black rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl relative flex flex-col h-full md:h-[600px] font-sans select-none">
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
           className="absolute top-16 right-4 bg-gradient-to-r from-teal-600 to-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full z-20 flex items-center gap-1 shadow-lg shadow-green-500/20 shadow-inner"
         >
           <Flame size={12} className="animate-pulse" />
           <span>سلسلة: {streak}</span>
           {streak >= 3 && <span className="text-[8px] bg-black/35 px-1 rounded">x{streak >= 5 ? '2.0' : '1.5'}</span>}
         </motion.div>
       )}

       {/* Anime A */}
       <div className="flex-1 relative flex items-center justify-center min-h-[160px]">
         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black z-10 pointer-events-none"></div>
         <img src={animeA.img} alt={animeA.title} className="absolute inset-0 w-full h-full object-cover opacity-50 filter grayscale-[20%]" />
         <div className="relative z-20 text-center px-4 pt-4">
           <h3 className="text-white text-md sm:text-lg font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] mb-1.5">{animeA.title}</h3>
           <div className="bg-yellow-500 text-black px-3.5 py-1 rounded-full inline-flex items-center gap-1.5 font-black text-xs sm:text-sm">
             <Trophy size={14} /> <span>المعدل الحالي: {animeA.score.toFixed(2)}</span>
           </div>
         </div>
       </div>
       
       {/* Divider */}
       <div className="absolute top-[48%] transform -translate-y-1/2 left-1/2 -translate-x-1/2 z-30 w-10 h-10 bg-gradient-to-br from-red-600 to-amber-500 border-2 border-orange-500 rounded-full flex items-center justify-center font-black text-white text-xs shadow-[0_0_15px_rgba(239,68,68,0.5)]">
         أو
       </div>

       {/* Anime B */}
       <div className="flex-1 relative flex items-center justify-center border-t border-neutral-800 min-h-[160px]">
         <div className="absolute inset-0 bg-gradient-to-b from-black via-black/40 to-black z-10 pointer-events-none"></div>
         <img src={animeB.img} alt={animeB.title} className="absolute inset-0 w-full h-full object-cover opacity-50 filter grayscale-[20%]" />
         
         <div className="relative z-20 text-center px-4 w-full h-full flex flex-col items-center justify-center py-4">
           <span className="text-neutral-400 text-[10px] bg-black/60 px-2 py-0.5 rounded-full font-bold mb-1">توقع التقييم للأنمي التالي:</span>
           <h3 className="text-white text-md sm:text-lg font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] mb-3">{animeB.title}</h3>
           
           {status === 'playing' ? (
             <div className="flex flex-row gap-3 w-full max-w-[260px] justify-center items-center">
               <button 
                 onClick={() => handleGuess('higher')}
                 className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-xl text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1 transition-transform active:scale-95 shadow-[0_3px_0_rgb(22,163,74)] active:translate-y-0.5 active:shadow-none cursor-pointer"
               >
                 <span>أعلى</span> <TrendingUp size={14} />
               </button>
               <button 
                 onClick={() => handleGuess('lower')}
                 className="flex-1 bg-red-600 hover:bg-red-500 py-3 rounded-xl text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1 transition-transform active:scale-95 shadow-[0_3px_0_rgb(220,38,38)] active:translate-y-0.5 active:shadow-none cursor-pointer"
               >
                 <span>أقل</span> <TrendingDown size={14} />
               </button>
             </div>
           ) : (
             <div className="flex flex-col items-center">
                <div className={`px-5 py-2 rounded-2xl flex items-center gap-1.5 font-black text-lg sm:text-xl mb-3 ${
                  ((choice === 'higher' && animeB.score >= animeA.score) || (choice === 'lower' && animeB.score < animeA.score)) 
                  ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]' 
                  : 'bg-red-500 text-white'
                }`}>
                  <Trophy size={16} />
                  <span>{animeB.score.toFixed(2)}</span>
                </div>
                
                <AnimatePresence>
                   <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                     <button onClick={nextRound} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-2 rounded-xl transition flex justify-center items-center gap-1 text-sm shadow-[0_0_15px_rgba(37,99,235,0.3)] cursor-pointer">
                        <span>التالي</span> 
                        <Play size={12} fill="currentColor" />
                     </button>
                   </motion.div>
                </AnimatePresence>
             </div>
           )}
         </div>
       </div>
    </div>
  );
}
