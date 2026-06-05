import React, { useState, useEffect } from 'react';
import { Play, Check, X, Quote, Loader2, Volume2, VolumeX, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, getIsMutedGlobal, toggleGlobalMute } from '../../utils/gameAudio';
import { getGameQuestions } from '../../services/gamesDatabaseService';
import { useAuth } from '../../contexts/AuthContext';

const FALLBACK_QUOTES = [
  { text: 'لن أستسلم للقدر أبداً!', options: ['ناروتو أوزوماكي', 'ساسكي أوتشيها', 'إيتاتشي', 'كيبا'], correct: 0, anime: 'Naruto' },
  { text: 'سأصبح ملك القراصنة!', options: ['لولوش', 'لوفي', 'زورو', 'ياغامي لايت'], correct: 1, anime: 'One Piece' },
  { text: 'هذا العالم متعفن.', options: ['لايت ياغامي', 'إيروين', 'هيسوكا', 'ليفاي'], correct: 0, anime: 'Death Note' },
  { text: 'الناس يعيشون حياتهم مقيدين بما يعتقدون أنه صحيح.', options: ['إيتاتشي أوتشيها', 'جيرايا', 'كاكاشي', 'باين'], correct: 0, anime: 'Naruto' },
  { text: 'إذا لم تكن تحاول الفوز، فلماذا تلعب على الإطلاق؟', options: ['كورو', 'هيناتا شويا', 'كاجياما', 'أويكاوا تورو'], correct: 3, anime: 'Haikyuu' },
  { text: 'البكاء لا يعني الضعف، بل يعني أنك تحملت طويلاً.', options: ['لوفي', 'نامي', 'رورونوا زورو', 'إيرزا سكارليت'], correct: 3, anime: 'Fairy Tail' },
  { text: 'الخوف ليس شراً.. إنه يخبرك ما هي نقطة ضعفك.', options: ['جيلدارتس', 'ناتسو', 'غري', 'لوسي'], correct: 0, anime: 'Fairy Tail' },
  { text: 'في اللحظة التي تفكر فيها بالاستسلام، تذكر السبب الذي جعلك تتمسك بالماضي.', options: ['مادارا', 'ناروتو', 'هيتسوجايا', 'كوروساكي إيتشيغو'], correct: 3, anime: 'Bleach' },
];

export default function WhoSaidGame({ onScoreUpdate }: { onScoreUpdate: (pts: number) => void }) {
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
      const qList = await getGameQuestions('quotes', user);
      if (qList && qList.length > 0) {
        setQuestions(prev => {
          const existingTexts = new Set(prev.map(q => q.text));
          const uniques = qList.filter(q => !existingTexts.has(q.text));
          return [...prev, ...uniques];
        });
      } else if (questions.length === 0) {
        setQuestions(FALLBACK_QUOTES);
      }
    } catch(e) {
      if (questions.length === 0) setQuestions(FALLBACK_QUOTES);
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
    if (currentQIndex >= questions.length - 2) { // fetch more before we run out
      fetchQuestions();
    }
    setCurrentQIndex(c => c + 1);
  };

  if (loading && questions.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto bg-[#121212] rounded-3xl border border-neutral-800 flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-neutral-400 font-bold">جاري توليد أسئلة الأنمي بطاقة الذكاء الاصطناعي...</p>
        </div>
      </div>
    );
  }

  const question = questions[currentQIndex];
  if (!question) return null;

  return (
    <div className="w-full max-w-md mx-auto bg-[#121212] rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl relative flex flex-col h-full md:h-auto min-h-[500px]">
       {/* Top Header Row Controls */}
       <div className="absolute top-4 right-4 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl text-yellow-500 font-black z-30 border border-yellow-500/20 shadow-lg text-xs flex items-center gap-1.5">
         <span>النتيجة: {score}</span>
       </div>

       <div className="absolute top-4 left-4 flex gap-2 z-35">
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
           className="absolute top-16 right-4 bg-gradient-to-r from-purple-600 to-indigo-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full z-20 flex items-center gap-1 shadow-lg shadow-purple-500/20"
         >
           <Flame size={12} className="animate-pulse" />
           <span>سلسلة: {streak}</span>
           {streak >= 3 && <span className="text-[8px] bg-black/35 px-1 rounded">x{streak >= 5 ? '2.0' : '1.5'}</span>}
         </motion.div>
       )}

       <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-purple-900/30 to-black relative">
         <Quote className="absolute top-8 left-8 text-purple-500/20 rotate-180" size={120} />
         <h3 className="text-white text-2xl md:text-3xl font-black text-center leading-relaxed drop-shadow-md z-10">"{question.text}"</h3>
       </div>

       <div className="p-4 space-y-3 bg-black rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20 relative">
          {question.options.map((opt, idx) => {
            const isSelected = selectedOpt === idx;
            const isCorrect = idx === question.correct;
            let bgColor = "bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-white";
            
            if (status === 'answered') {
              if (isCorrect) bgColor = "bg-green-600 border-green-500 text-white font-bold";
              else if (isSelected) bgColor = "bg-red-600 border-red-500 text-white";
              else bgColor = "bg-neutral-900 opacity-50 border-neutral-800 text-neutral-400";
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={status === 'answered'}
                className={`w-full p-4 rounded-xl border text-sm md:text-base transition-all duration-300 flex justify-between items-center ${bgColor}`}
              >
                {opt}
                {status === 'answered' && isCorrect && <Check size={18} />}
                {status === 'answered' && isSelected && !isCorrect && <X size={18} />}
              </button>
            );
          })}
          
          {status === 'answered' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-4">
              <button onClick={nextQuestion} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition flex justify-center items-center gap-2 text-lg shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                السؤال التالي <Play size={20} fill="currentColor" />
              </button>
            </motion.div>
          )}
       </div>
    </div>
  );
}
