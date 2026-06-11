import React, { useState, useEffect } from 'react';
import { Play, Check, X, SearchX, Loader2, Volume2, VolumeX, Flame, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, getIsMutedGlobal, toggleGlobalMute } from '../../utils/gameAudio';
import { getGameQuestions } from '../../services/gamesDatabaseService';
import { useAuth } from '../../contexts/AuthContext';

const FALLBACK_IMPOSTER = [
  { anime: 'هجوم العمالقة', options: ['إرين', 'ميكاسا', 'غوجو', 'أرمين'], correct: 2 },
  { anime: 'ون بيس', options: ['زورو', 'سانجي', 'لوفي', 'ساسكي'], correct: 3 },
  { anime: 'ناروتو', options: ['كاكاشي', 'غارا', 'هيسوكا', 'ساكورا'], correct: 2 },
  { anime: 'بليتش', options: ['إيتشيغو', 'إيتشيمارو', 'مادارا', 'روكيا'], correct: 2 },
  { anime: 'هنتر x هنتر', options: ['غون', 'كيلوا', 'كورابيكا', 'ليفاي'], correct: 3 },
  { anime: 'جوجوتسو كايسن', options: ['يوجي إيتادوري', 'ميغومي فوشيغورو', 'تانجيرو', 'نوبارا كوجيساكي'], correct: 2 },
  { anime: 'قاتل الشياطين (Demon Slayer)', options: ['تانجيرو', 'نيزوكو', 'إينوسكي', 'كورابيكا'], correct: 3 },
  { anime: 'مفكرة الموت (Death Note)', options: ['لايت', 'إل', 'مادارا', 'ميرا'], correct: 2 },
  { anime: 'دراغون بول Z', options: ['غوكو', 'فيجيتا', 'غوهان', 'سانجي'], correct: 3 },
  { anime: 'أكاديميتي للأبطال', options: ['ميدوريا', 'باكوغو', 'تودوروكي', 'لولوش'], correct: 3 }
];

export default function ImposterGame({ onScoreUpdate }: { onScoreUpdate: (pts: number) => void }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [status, setStatus] = useState<'playing' | 'answered'>('playing');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [muted, setMuted] = useState(getIsMutedGlobal());

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const qList = await getGameQuestions('imposter', user);
      if (qList && qList.length > 0) {
        setQuestions(prev => {
          const existingAnimes = new Set(prev.map(q => q.anime));
          const uniques = qList.filter(q => !existingAnimes.has(q.anime));
          return [...prev, ...uniques];
        });
      } else if (questions.length === 0) {
        setQuestions(FALLBACK_IMPOSTER);
      }
    } catch(e) {
      if (questions.length === 0) setQuestions(FALLBACK_IMPOSTER);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const toggleMuteLocal = () => {
    const isMutedNow = toggleGlobalMute();
    setMuted(isMutedNow);
    playSound('click');
  };

  const handleSelect = (idx: number) => {
    if (status !== 'playing') return;
    setSelectedOpt(idx);
    setStatus('answered');
    
    const isCorrect = idx === questions[currentRound]?.correct;
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

  const nextRound = () => {
    playSound('click');
    setStatus('playing');
    setSelectedOpt(null);
    if (currentRound >= questions.length - 2) {
      fetchQuestions();
    }
    setCurrentRound(c => c + 1);
  };

  if (loading && questions.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto bg-[#121212] rounded-3xl border border-neutral-800 flex items-center justify-center min-h-[500px]">
        <div className="text-center animate-pulse">
          <Loader2 className="w-10 h-10 animate-spin text-red-500 mx-auto mb-4" />
          <p className="text-neutral-400 font-bold">جاري توليد جولات الجاسوس بالذكاء الاصطناعي...</p>
        </div>
      </div>
    );
  }

  const round = questions[currentRound];
  if (!round) return null;

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
           className="absolute top-16 right-4 bg-gradient-to-r from-red-600 to-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full z-20 flex items-center gap-1 shadow-lg shadow-red-500/20"
         >
           <Flame size={12} className="animate-bounce" />
           <span>سلسلة: {streak}</span>
           {streak >= 3 && <span className="text-[8px] bg-black/35 px-1 rounded">x{streak >= 5 ? '2.0' : '1.5'}</span>}
         </motion.div>
       )}

       <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-red-950/25 to-black relative min-h-[180px]">
         <SearchX className="absolute top-8 left-8 text-red-500/10 animate-pulse" size={120} />
         <h2 className="text-red-400 font-bold mb-3 text-sm flex items-center gap-1.5">
           🔍 من هو الدخيل (الجاسوس) في هذه المجموعة؟
         </h2>
         <div className="text-white text-3xl font-black text-center leading-relaxed drop-shadow-[0_0_15px_rgba(239,68,68,0.3)] bg-black/40 px-6 py-4 rounded-2xl border border-red-500/10 backdrop-blur-sm select-none">
           "{round.anime}"
         </div>
       </div>

       <div className="p-4 bg-black rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20 relative">
          <div className="grid grid-cols-2 gap-3">
             {round.options.map((opt: string, idx: number) => {
               const isSelected = selectedOpt === idx;
               const isCorrect = idx === round.correct;
               let bgColor = "bg-neutral-900 border border-neutral-800 hover:border-red-500/40 hover:bg-neutral-800 text-white";
               
               if (status === 'answered') {
                 if (isCorrect) bgColor = "bg-green-600 border-green-500 text-white font-black shadow-[0_0_15px_rgba(34,197,94,0.3)]";
                 else if (isSelected) bgColor = "bg-red-650 border-red-550 text-white";
                 else bgColor = "bg-[#121215] opacity-40 border-neutral-900 text-neutral-500";
               }

               return (
                 <button
                   key={idx}
                   onClick={() => handleSelect(idx)}
                   disabled={status === 'answered'}
                   className={`w-full py-5 rounded-xl border font-black text-xs sm:text-sm transition-all duration-300 flex flex-col justify-center items-center gap-2 cursor-pointer ${bgColor}`}
                 >
                   <span>{opt}</span>
                   {status === 'answered' && isCorrect && <Check size={18} className="stroke-[3]" />}
                   {status === 'answered' && isSelected && !isCorrect && <X size={18} className="stroke-[3]" />}
                 </button>
               );
             })}
          </div>

          {status === 'answered' && (
             <AnimatePresence>
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4 overflow-hidden">
                  <button 
                    onClick={nextRound} 
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition flex justify-center items-center gap-2 text-md shadow-[0_0_20px_rgba(37,99,235,0.3)] cursor-pointer"
                  >
                     <span>الجولة التالية</span> 
                     <Play size={16} fill="currentColor" />
                  </button>
                </motion.div>
             </AnimatePresence>
          )}
       </div>
    </div>
  );
}
