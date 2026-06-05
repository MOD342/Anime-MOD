import React, { useState } from 'react';
import { Play, Check, X, Clock, Volume2, VolumeX, Flame, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, getIsMutedGlobal, toggleGlobalMute } from '../../utils/gameAudio';
import { getGameQuestions } from '../../services/gamesDatabaseService';
import { useAuth } from '../../contexts/AuthContext';

const FALLBACK_EVENTS = [
  { id: 1, e1: 'موت جيرايا (ناروتو)', e2: 'حرب النينجا الرابعة (ناروتو)', first: 1 },
  { id: 2, e1: 'قتال غوكو ضد ماجين بو', e2: 'قتال غوكو ضد سيل', first: 2 },
  { id: 3, e1: 'لوفي يفعل القير سكند (Gear Second)', e2: 'لوفي يهزم كроكودايل', first: 2 },
  { id: 4, e1: 'سقوط جدار ماريا (هجوم العمالقة)', e2: 'اكتشاف قدرة إيرين على التحول لعملاق', first: 1 },
  { id: 5, e1: 'غون يتحول للهيئة البالغة', e2: 'غون يفوز برخصة الصيادين', first: 2 },
];

export default function TimelineGame({ onScoreUpdate }: { onScoreUpdate: (pts: number) => void }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'playing' | 'answered'>('playing');
  const [choice, setChoice] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [muted, setMuted] = useState(getIsMutedGlobal());

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const qList = await getGameQuestions('timeline', user);
      if (qList && qList.length > 0) {
        setQuestions(prev => {
          const existingText = new Set(prev.map(q => q.e1 + '||' + q.e2));
          const uniques = qList.filter(q => !existingText.has(q.e1 + '||' + q.e2));
          return [...prev, ...uniques];
        });
      } else if (questions.length === 0) {
        setQuestions(FALLBACK_EVENTS);
      }
    } catch(e) {
      if (questions.length === 0) setQuestions(FALLBACK_EVENTS);
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

  const round = questions[currentIdx];

  const handleGuess = (guess: 1 | 2) => {
    if (status !== 'playing' || !round) return;
    setChoice(guess);
    setStatus('answered');
    
    const isCorrect = guess === round.first;
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
    setCurrentIdx(c => c + 1);
    setStatus('playing');
    setChoice(null);
    if (currentIdx >= questions.length - 2) {
      fetchQuestions();
    }
  };

  if (loading && questions.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto bg-[#121212] rounded-3xl border border-neutral-800 flex items-center justify-center min-h-[500px]">
        <div className="text-center animate-pulse">
          <Clock className="w-10 h-10 animate-spin text-teal-500 mx-auto mb-4" />
          <p className="text-neutral-400 font-bold">جاري توليد تحديات الخط الزمني بالذكاء الاصطناعي...</p>
        </div>
      </div>
    );
  }

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
           className="absolute top-16 right-4 bg-gradient-to-r from-teal-600 to-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full z-20 flex items-center gap-1 shadow-lg shadow-green-500/20 shadow-inner"
         >
           <Flame size={12} className="animate-pulse" />
           <span>سلسلة: {streak}</span>
           {streak >= 3 && <span className="text-[8px] bg-black/35 px-1 rounded">x{streak >= 5 ? '2.0' : '1.5'}</span>}
         </motion.div>
       )}

       <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-teal-950/25 to-black relative">
         <Clock className="absolute top-12 left-12 text-teal-500/10 animate-pulse" size={120} />
         <h2 className="text-teal-400 font-bold mb-4 drop-shadow-md z-10 flex items-center gap-1.5 text-sm">
           ⏰ أي الفعاليّات والمشاهد حدثت أولاً؟
         </h2>
         
         <div className="w-full space-y-4 z-10 mt-2 select-none">
            {/* Event 1 */}
            <button 
              onClick={() => handleGuess(1)}
              disabled={status === 'answered'}
              className={`w-full p-5 rounded-2xl border-2 text-right transition-all duration-300 relative overflow-hidden cursor-pointer ${
                status === 'answered'
                  ? round.first === 1
                    ? 'bg-green-600 border-green-500 text-white font-black shadow-[0_0_15px_rgba(34,197,94,0.35)] scale-102'
                    : choice === 1
                      ? 'bg-red-650 border-red-550 text-white font-black'
                      : 'bg-neutral-900 border-neutral-950 text-neutral-500 opacity-40 scale-98'
                  : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-white hover:border-teal-500 font-black hover:scale-102'
              }`}
            >
              {status === 'answered' && round.first === 1 && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg font-black text-sm">أولاً</div>
              )}
              {status === 'answered' && round.first !== 1 && choice === 1 && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"><X size={16} className="stroke-[3]" /></div>
              )}
              <span className="text-sm sm:text-base leading-relaxed">{round.e1}</span>
            </button>
            
            {/* Event 2 */}
            <button 
              onClick={() => handleGuess(2)}
              disabled={status === 'answered'}
              className={`w-full p-5 rounded-2xl border-2 text-right transition-all duration-300 relative overflow-hidden cursor-pointer ${
                status === 'answered'
                  ? round.first === 2
                    ? 'bg-green-600 border-green-500 text-white font-black shadow-[0_0_15px_rgba(34,197,94,0.35)] scale-102'
                    : choice === 2
                      ? 'bg-red-650 border-red-550 text-white font-black'
                      : 'bg-neutral-900 border-neutral-950 text-neutral-500 opacity-40 scale-98'
                  : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-white hover:border-teal-500 font-black hover:scale-102'
              }`}
            >
              {status === 'answered' && round.first === 2 && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg font-black text-sm">أولاً</div>
              )}
              {status === 'answered' && round.first !== 2 && choice === 2 && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"><X size={16} className="stroke-[3]" /></div>
              )}
              <span className="text-sm sm:text-base leading-relaxed">{round.e2}</span>
            </button>
         </div>
       </div>

       {status === 'answered' && (
          <div className="p-4 bg-black border-t border-neutral-900">
             <AnimatePresence>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <button onClick={nextRound} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition flex justify-center items-center gap-2 text-md shadow-[0_0_20px_rgba(37,99,235,0.3)] cursor-pointer" dir="rtl">
                     <span>السؤال التالي</span> 
                     <Play size={16} fill="currentColor" />
                  </button>
                </motion.div>
             </AnimatePresence>
          </div>
       )}
    </div>
  );
}
