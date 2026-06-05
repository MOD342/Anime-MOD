import React, { useState, useEffect } from 'react';
import { Play, Check, X, Music, Volume2, VolumeX, Flame, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, getIsMutedGlobal, toggleGlobalMute } from '../../utils/gameAudio';
import { getGameQuestions } from '../../services/gamesDatabaseService';
import { useAuth } from '../../contexts/AuthContext';

const FALLBACK_SONGS = [
  { text: 'أريد أن أكون الأقوى... سأجد كل شيء في ذلك المكان!', options: ['ون بيس (We Are)', 'ناروتو (Blue Bird)', 'بليتش (Asterisk)', 'دراغون بول (Cha-La)'], correct: 0 },
  { text: 'إذا كان العالم لا معنى له، فقط قم بتدمير ما لا تحب... واعرضه!', options: ['هجوم العمالقة (Guren no Yumiya)', 'طوكيو غول (Unravel)', 'كود جياس (Colors)', 'ديث نوت (The World)'], correct: 1 },
  { text: 'أنت لست وحدك، لأننا معاً دائماً تحت هذه السماء المزرقة الدافئة.', options: ['ناروتو شيبودن', 'فيري تيل', 'هنتر اكس هنتر', 'ون بيس'], correct: 0 },
  { text: 'لا زلت أتذكر صوت ذلك اليوم الذي انكسر فيه كل شيء.', options: ['بليتش', 'طوكيو غول', 'هجوم العمالقة', 'ناروتو شيبودن'], correct: 2 },
];

export default function OpeningLyricsGame({ onScoreUpdate }: { onScoreUpdate: (pts: number) => void }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [status, setStatus] = useState<'playing' | 'answered'>('playing');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [muted, setMuted] = useState(getIsMutedGlobal());

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const qList = await getGameQuestions('lyrics', user);
      if (qList && qList.length > 0) {
        setQuestions(prev => {
          const existingTexts = new Set(prev.map(q => q.text));
          const uniques = qList.filter(q => !existingTexts.has(q.text));
          return [...prev, ...uniques];
        });
      } else if (questions.length === 0) {
        setQuestions(FALLBACK_SONGS);
      }
    } catch(e) {
      if (questions.length === 0) setQuestions(FALLBACK_SONGS);
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
    
    const isCorrect = idx === questions[currentQIndex]?.correct;
    if (isCorrect) {
      playSound('win');
      const multiplier = streak >= 5 ? 2.0 : streak >= 3 ? 1.5 : 1.0;
      const finalPoints = Math.ceil(10 * multiplier);
      
      setStreak(s => s + 1);
      setScore(s => s + finalPoints);
      onScoreUpdate(finalPoints);
    } else {
      playSound('lose');
      setStreak(0);
    }
  };

  const nextQuestion = () => {
    playSound('click');
    setStatus('playing');
    setSelectedOpt(null);
    if (currentQIndex >= questions.length - 2) {
      fetchQuestions();
    }
    setCurrentQIndex(c => c + 1);
  };

  if (loading && questions.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto bg-[#121212] rounded-3xl border border-neutral-800 flex items-center justify-center min-h-[500px]">
        <div className="text-center animate-pulse">
          <Music className="w-10 h-10 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-neutral-400 font-bold">جاري توليد تحديات الأغاني بالذكاء الاصطناعي...</p>
        </div>
      </div>
    );
  }

  const question = questions[currentQIndex];
  if (!question) return null;

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
           className="absolute top-16 right-4 bg-gradient-to-r from-cyan-600 to-teal-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full z-20 flex items-center gap-1 shadow-lg shadow-cyan-500/20 shadow-inner"
         >
           <Flame size={12} className="animate-pulse" />
           <span>سلسلة: {streak}</span>
           {streak >= 3 && <span className="text-[8px] bg-black/35 px-1 rounded">x{streak >= 5 ? '2.0' : '1.5'}</span>}
         </motion.div>
       )}

       <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-cyan-950/25 to-black relative min-h-[180px]">
         <Music className="absolute top-12 left-12 text-cyan-500/10 animate-bounce" size={120} />
         <span className="text-cyan-400 text-xs font-bold mb-4 select-none">🎵 خمن الأستوديو أو شارة البداية من كلماتها:</span>
         <h3 className="text-white text-md sm:text-lg font-black text-center leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] z-10 select-none px-2">
           ♪ "{question.text}" ♪
         </h3>
       </div>

       <div className="p-4 space-y-3 bg-black rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20 relative border-t border-neutral-900">
          <div className="space-y-3">
             {question.options.map((opt, idx) => {
               const isSelected = selectedOpt === idx;
               const isCorrect = idx === question.correct;
               let bgColor = "bg-neutral-900 border-neutral-800 hover:border-cyan-500/40 hover:bg-neutral-800 text-white";
               
               if (status === 'answered') {
                 if (isCorrect) bgColor = "bg-green-600 border-green-500 text-white font-black shadow-[0_0_15px_rgba(34,197,94,0.3)]";
                 else if (isSelected) bgColor = "bg-red-650 border-red-550 text-white";
                 else bgColor = "bg-neutral-950 opacity-40 border-neutral-900 text-neutral-500";
               }

               return (
                 <button
                   key={idx}
                   onClick={() => handleSelect(idx)}
                   disabled={status === 'answered'}
                   className={`w-full p-4 rounded-xl border font-black text-xs sm:text-sm transition-all duration-300 flex justify-between items-center cursor-pointer ${bgColor}`}
                 >
                   <span>{opt}</span>
                   {status === 'answered' && isCorrect && <Check size={16} className="stroke-[3]" />}
                   {status === 'answered' && isSelected && !isCorrect && <X size={16} className="stroke-[3]" />}
                 </button>
               );
             })}
          </div>
          
          {status === 'answered' && (
             <AnimatePresence>
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4 overflow-hidden">
                  <button 
                    onClick={nextQuestion} 
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition flex justify-center items-center gap-2 text-md shadow-[0_0_20px_rgba(37,99,235,0.3)] cursor-pointer"
                  >
                     <span>شارة البداية التالية</span> 
                     <Play size={16} fill="currentColor" />
                  </button>
                </motion.div>
             </AnimatePresence>
          )}
       </div>
    </div>
  );
}
