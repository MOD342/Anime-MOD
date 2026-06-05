import React, { useState } from 'react';
import { Play, Check, X, Calculator, Sparkles, Volume2, VolumeX, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, getIsMutedGlobal, toggleGlobalMute } from '../../utils/gameAudio';
import { getGameQuestions } from '../../services/gamesDatabaseService';
import { useAuth } from '../../contexts/AuthContext';

const FALLBACK_QUESTIONS = [
  { id: 1, text: 'عدد كرات التنين + عدد ذيول الكيوبي', answer: 16, options: [14, 15, 16, 17], correct: 2 },
  { id: 2, text: 'رقم الهوكاجي لتسونادي × عدد سيوف زورو', answer: 15, options: [12, 15, 18, 20], correct: 1 },
  { id: 3, text: 'رقم الأسبادا لأولكيورا + عدد أعضاء الأكاتسوكي الأساسيين', answer: 14, options: [12, 14, 16, 18], correct: 1 },
  { id: 4, text: 'عمر غون في بداية الأنمي + عمر كيلوا', answer: 24, options: [20, 22, 24, 26], correct: 2 },
  { id: 5, text: 'إصدارات القير للوفي (Gear) الحالية', answer: 5, options: [3, 4, 5, 6], correct: 2 },
];

export default function AnimeMathGame({ onScoreUpdate }: { onScoreUpdate: (pts: number) => void }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'playing' | 'answered'>('playing');
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [muted, setMuted] = useState(getIsMutedGlobal());

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const qList = await getGameQuestions('math', user);
      if (qList && qList.length > 0) {
        setQuestions(prev => {
          const existingTexts = new Set(prev.map(q => q.text));
          const uniques = qList.filter(q => !existingTexts.has(q.text));
          return [...prev, ...uniques];
        });
      } else if (questions.length === 0) {
        setQuestions(FALLBACK_QUESTIONS);
      }
    } catch(e) {
      if (questions.length === 0) setQuestions(FALLBACK_QUESTIONS);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchQuestions();
  }, []);

  const toggleMuteLocal = () => {
    const isMutedNow = toggleGlobalMute();
    setMuted(isMutedNow);
    playSound('click');
  };

  const q = questions[currentIdx];

  const handleGuess = (idx: number) => {
    if (status !== 'playing' || !q) return;
    setSelectedOpt(idx);
    setStatus('answered');
    
    const isCorrect = idx === q.correct;
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

  const nextQuestion = () => {
    playSound('click');
    setStatus('playing');
    setSelectedOpt(null);
    if (currentIdx >= questions.length - 2) {
      fetchQuestions();
    }
    setCurrentIdx(c => c + 1);
  };

  if (loading && questions.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto bg-[#121212] rounded-3xl border border-neutral-800 flex items-center justify-center min-h-[500px]">
        <div className="text-center animate-pulse">
          <Calculator className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-neutral-400 font-bold">جاري توليد تحديات الرياضيات بالذكاء الاصطناعي...</p>
        </div>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div className="w-full max-w-md mx-auto bg-[#121212] rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl relative flex flex-col h-full md:h-[500px] font-sans">
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
           className="absolute top-16 right-4 bg-gradient-to-r from-indigo-600 to-purple-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full z-20 flex items-center gap-1 shadow-lg shadow-indigo-500/20"
         >
           <Flame size={12} className="animate-pulse" />
           <span>سلسلة: {streak}</span>
           {streak >= 3 && <span className="text-[8px] bg-black/35 px-1 rounded">x{streak >= 5 ? '2.0' : '1.5'}</span>}
         </motion.div>
       )}

       <div className="flex-1 relative flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-950/25 to-black">
         <Calculator className="absolute opacity-5 text-indigo-300 w-full h-full p-20 pointer-events-none animate-pulse" />
         
         <div className="bg-black/40 p-6 rounded-2xl border border-indigo-500/20 backdrop-blur-md w-full relative z-10 shadow-[0_0_30px_rgba(79,70,229,0.1)]">
            <h2 className="text-indigo-400 font-bold mb-4 flex items-center justify-center gap-2 text-sm">
              <Calculator size={16} /> معضلة الأوتاكو في الحساب
            </h2>
            <p className="text-white text-xl text-center font-black leading-relaxed mt-2 select-none" dir="rtl">
              {q.text} = ؟
            </p>
         </div>
       </div>

       <div className="p-4 bg-black border-t border-neutral-800 rounded-t-3xl relative z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
          <div className="grid grid-cols-2 gap-3">
             {q.options.map((opt, idx) => {
                const isSelected = selectedOpt === idx;
                const isCorrect = idx === q.correct;
                let bgColor = "bg-neutral-900 border-neutral-800 text-white hover:bg-neutral-800 hover:border-indigo-500/50";
                
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
                    className={`p-5 rounded-2xl border-2 text-xl font-black transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${bgColor}`}
                  >
                    <span>{opt}</span>
                    {status === 'answered' && isCorrect && <Check size={18} className="stroke-[3]" />}
                    {status === 'answered' && isSelected && !isCorrect && <X size={18} className="stroke-[3]" />}
                  </button>
                )
             })}
          </div>
          
          {status === 'answered' && (
            <AnimatePresence>
               <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4 overflow-hidden">
                 <button 
                   onClick={nextQuestion} 
                   className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition flex justify-center items-center gap-2 text-md shadow-[0_0_20px_rgba(37,99,235,0.3)] cursor-pointer"
                 >
                    <span>معضلة جديدة</span> 
                    <Play size={16} fill="currentColor" />
                 </button>
               </motion.div>
            </AnimatePresence>
          )}
       </div>
    </div>
  );
}
