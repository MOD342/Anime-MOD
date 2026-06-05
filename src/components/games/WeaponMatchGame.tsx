import React, { useState, useMemo } from 'react';
import { Play, Check, X, Sword, Sparkles, Volume2, VolumeX, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, getIsMutedGlobal, toggleGlobalMute } from '../../utils/gameAudio';

const WEAPONS = [
  { id: 1, weapon: 'سيف إينما (Enma)', options: ['إيتشيغو', 'رورونوا زورو', 'ساسكي', 'ميهوك'], correct: 1 },
  { id: 2, weapon: 'سيف الإكسكاليبر (Excalibur)', options: ['إيرزا', 'شيرو', 'سابر (Saber)', 'آرثر'], correct: 2 },
  { id: 3, weapon: 'رمح غاي بولغ (Gae Bolg)', options: ['كوهين', 'لانسر (Lancer)', 'ديارمويد', 'غيلغامش'], correct: 1 },
  { id: 4, weapon: 'مقص النصل العملاق (Scissor Blade)', options: ['ريوكو ماتوي', 'إيرزا', 'شينوا', 'ماكا ألبيرن'], correct: 0 },
  { id: 5, weapon: 'سيف الزانباكتو زانغيتسو (Zangetsu)', options: ['بياكويا', 'ياماموتو', 'كوروساكي إيتشيغو', 'أوراهارا كيسكي'], correct: 2 },
  { id: 6, weapon: 'سيف مصلح الليل (Elucidator)', options: ['كيريتو (Kirito)', 'آسونا', 'يوجيو', 'كلاين'], correct: 0 },
  { id: 7, weapon: 'سيف الموراسامي الملعون (Murasame)', options: ['تاتسومي', 'أكامي (Akame)', 'إسديث', 'ليون'], correct: 1 },
  { id: 8, weapon: 'سيف التتسايجا (Tessaiga)', options: ['سيشومارو', 'إينوياشا (Inuyasha)', 'ناراكو', 'كوجا'], correct: 1 },
  { id: 9, weapon: 'مطرقة المسامير الطاقية', options: ['ميجومي', 'نوبارا كوجيساكي', 'ماكي زينين', 'يوجي إيتادوري'], correct: 1 },
  { id: 10, weapon: 'سيف اللوكا الخشبي (Toyako)', options: ['هيجيكاتا', 'جينتوكي ساكاتا', 'أوكيتو', 'شينباتشي'], correct: 1 },
  { id: 11, weapon: 'سلاسل النين الحمراء الملعونة', options: ['كورابيكا (Kurapika)', 'كيلوا', 'غون', 'هيسوكا'], correct: 0 },
  { id: 12, weapon: 'سيف النيشيرين الأسود (Nichirin)', options: ['زينيتسو', 'إينوسكي', 'كامادو تانجيرو', 'غييو توميوكا'], correct: 2 },
];

export default function WeaponMatchGame({ onScoreUpdate }: { onScoreUpdate: (pts: number) => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'playing' | 'answered'>('playing');
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [muted, setMuted] = useState(getIsMutedGlobal());

  const q = useMemo(() => {
    return WEAPONS[currentIdx % WEAPONS.length];
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

  return (
    <div className="w-full max-w-md mx-auto bg-[#121212] rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl relative flex flex-col h-full md:h-[500px] font-sans">
       {/* Top Header Row Controls */}
       <div className="absolute top-4 right-4 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl text-yellow-500 font-black z-30 border border-yellow-500/20 shadow-lg text-xs flex items-center gap-1.5 select-none">
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

       <div className="flex-1 relative flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#270c0c] to-black">
         <Sword className="absolute top-8 left-8 text-red-500/10" size={120} />
         
         <div className="text-center relative z-10 w-full px-2">
            <h2 className="text-red-400 font-black mb-6 flex items-center justify-center gap-2 text-md">
              <Sword size={18} className="animate-pulse" /> 
              <span>من هي الشخصية التي تحمل هذا السلاح المقاتل؟</span>
            </h2>
            <div className="text-white text-2xl font-black leading-relaxed drop-shadow-[0_0_15px_rgba(239,68,68,0.4)] bg-black/40 py-6 px-4 rounded-2xl border border-red-500/10 backdrop-blur-sm shadow-inner transition-transform duration-700 select-none">
              "{q.weapon}"
            </div>
         </div>
       </div>

       <div className="p-4 bg-black border-t border-neutral-800 rounded-t-3xl relative z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
          <div className="space-y-3">
             {q.options.map((opt, idx) => {
                const isSelected = selectedOpt === idx;
                const isCorrect = idx === q.correct;
                let bgColor = "bg-[#18181b] border-neutral-800 text-neutral-200 hover:bg-neutral-800 hover:border-red-500/40";
                
                if (status === 'answered') {
                  if (isCorrect) bgColor = "bg-green-600 border-green-500 text-white font-black shadow-[0_0_15px_rgba(34,197,94,0.3)]";
                  else if (isSelected) bgColor = "bg-red-650 border-red-550 text-white";
                  else bgColor = "bg-[#121215] border-neutral-900 text-neutral-500 opacity-40";
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleGuess(idx)}
                    disabled={status === 'answered'}
                    className={`w-full p-4 rounded-xl border-2 text-[14px] font-black transition-all duration-300 flex items-center justify-between cursor-pointer ${bgColor}`}
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
                   onClick={() => { playSound('click'); setStatus('playing'); setSelectedOpt(null); setCurrentIdx(c => c + 1); }} 
                   className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition flex justify-center items-center gap-2 text-md shadow-[0_0_20px_rgba(37,99,235,0.3)] cursor-pointer"
                 >
                    <span>السلاح التالي</span> 
                    <Sword size={16} fill="currentColor" />
                 </button>
               </motion.div>
            </AnimatePresence>
          )}
       </div>
    </div>
  );
}
