import React, { useState, useEffect } from 'react';
import { Play, Check, X, Zap, Clock, Volume2, VolumeX, Flame, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, getIsMutedGlobal, toggleGlobalMute } from '../../utils/gameAudio';
import { getGameQuestions } from '../../services/gamesDatabaseService';
import { useAuth } from '../../contexts/AuthContext';

const FALLBACK_QUESTIONS = [
  { text: 'ناروتو أصبح الهوكاجي السادس لقرية الورق.', isTrue: false, explanation: 'أصبح الهوكاجي السابع، بينما كان كاكاشي هو السادس.' },
  { text: 'غوكو من دراغون بول هو كائن فضائي من عرق السايان.', isTrue: true, explanation: 'نعم، هو سايان واسمه الحقيقي كاكاروت.' },
  { text: 'لولوش حصل على قوة الجياس من C.C.', isTrue: true, explanation: 'صحيح، عقد معها صفقة للحصول على القوة.' },
  { text: 'زورو يستخدم سيفين في القتال.', isTrue: false, explanation: 'يستخدم أسلوب الثلاثة سيوف (سانتوري).' },
  { text: 'ليفاي هو بطل قصة هجوم العمالقة.', isTrue: false, explanation: 'إرين ييغر هو البطل الرئيسي.' },
  { text: 'نامي هي القبطان الفعلي لطاقم قبعة القش في أنمي ون بيس.', isTrue: false, explanation: 'القبطان هو مونكي دي لوفي.' },
  { text: 'العملاق المؤسس في هجوم العمالقة كان يحمله غريشا ييغر قبل نقله لإيرين.', isTrue: true, explanation: 'نعم، انتزعه غريشا من عائلة ريس ثم ورثه لإيرين.' },
  { text: 'عين الشارينغان الأسطورية في ناروتو تنتمي لعشيرة الهيوجا.', isTrue: false, explanation: 'تنتمي لعشيرة الأوتشيها، وعشيرة الهيوجا تمتلك البياكوغان.' },
  { text: 'المرتبة صفر في منظمة الإسبادا في بليتش تنتمي ليامي رياجو.', isTrue: true, explanation: 'أجل، يامي هو الإسبادا رقم 10 ولكن عندما يطلق سيفه يصبح الرقم 0.' },
  { text: 'اسم سيف ميهوك الأسطوري في ون بيس هو الشوشوي.', isTrue: false, explanation: 'اسم سيف ميهوك هو يورو (Yoru)، بينما الشوشوي هو أحد سيوف زورو السابقة.' },
  { text: 'رقم الأسبادا لكويوت ستارك في بليتش هو الرقم 1.', isTrue: true, explanation: 'صحيح، ستارك هو الإسبادا الأول ويمثل الموت بالوحدة.' },
  { text: 'صياد العمالقة الباسل في بليتش هو إيتشيغو كوروساكي.', isTrue: false, explanation: 'إيتشيغو هو بطل بليتش وهو شينيغامي بديلاً وليس صياد عمالقة.' },
  { text: 'عمر غون وفيل أول حلقة من هنتر x هنتر هو 12 سنة.', isTrue: true, explanation: 'صحيح، وكان غون في الثانية عشرة من عمره عندما غادر جزيرة الحوت.' },
  { text: 'اسم تقنية توسيع المجال الخاصة بسوكونا في جوجوتسو كايسن هي ضريح السوء (Malevolent Shrine).', isTrue: true, explanation: 'صحيح، هي واحدة من أقوى تقنيات السحر الإقليمي.' },
  { text: 'كاشي هاتاكي يغطي عينه اليسرى بالكامل لأنها لا تحتوي على الشارينغان.', isTrue: false, explanation: 'بالعكس، يغطي عينه اليسرى تحديداً لأنها تحتوي على الشارينغان المزروعة لكي لا تستهلك تشاكرته باستمرار.' }
];

export default function SpeedTriviaGame({ onScoreUpdate }: { onScoreUpdate: (pts: number) => void }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [status, setStatus] = useState<'playing' | 'answered' | 'timeout'>('playing');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [userAnswer, setUserAnswer] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [muted, setMuted] = useState(getIsMutedGlobal());

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const qList = await getGameQuestions('trivia', user);
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

  useEffect(() => {
    fetchQuestions();
  }, []);

  const toggleMuteLocal = () => {
    const isMutedNow = toggleGlobalMute();
    setMuted(isMutedNow);
    playSound('click');
  };

  const question = questions[currentQIndex];

  useEffect(() => {
    if (status !== 'playing' || !question) return;
    
    if (timeLeft === 0) {
      playSound('lose');
      setStatus('timeout');
      setStreak(0);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, status, question]);

  const handleAnswer = (answer: boolean) => {
    if (status !== 'playing' || !question) return;
    setUserAnswer(answer);
    setStatus('answered');
    
    const isCorrect = answer === question.isTrue;
    if (isCorrect) {
      playSound('win');
      const timeBonus = Math.floor(timeLeft / 2);
      const multiplier = streak >= 5 ? 2.0 : streak >= 3 ? 1.5 : 1.0;
      const basePoints = 10 + timeBonus;
      const finalPoints = Math.ceil(basePoints * multiplier);
      
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
    setUserAnswer(null);
    setTimeLeft(10);
    if (currentQIndex >= questions.length - 2) {
      fetchQuestions();
    }
    setCurrentQIndex(c => c + 1);
  };

  if (loading && questions.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto bg-[#121212] rounded-3xl border border-neutral-800 flex items-center justify-center min-h-[500px]">
        <div className="text-center animate-pulse">
          <Zap className="w-10 h-10 animate-spin text-yellow-500 mx-auto mb-4" />
          <p className="text-neutral-400 font-bold">جاري توليد تحديات التريفيا بالذكاء الاصطناعي...</p>
        </div>
      </div>
    );
  }

  if (!question) return null;

  const isCorrect = userAnswer === question.isTrue;

  return (
    <div className="w-full max-w-md mx-auto bg-[#121212] rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl relative flex flex-col h-full md:h-auto min-h-[500px]">
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
           className="absolute top-16 right-4 bg-gradient-to-r from-yellow-600 to-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full z-20 flex items-center gap-1 shadow-lg shadow-yellow-500/20"
         >
           <Flame size={12} className="animate-bounce" />
           <span>سلسلة: {streak}</span>
           {streak >= 3 && <span className="text-[8px] bg-black/35 px-1 rounded">x{streak >= 5 ? '2.0' : '1.5'}</span>}
         </motion.div>
       )}

       <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-yellow-950/25 to-black relative mt-12 flex-1 min-h-[180px]">
         <Zap className="absolute top-8 left-8 text-yellow-500/10 animate-pulse" size={120} />
         
         <div className={`mt-2 mb-4 backdrop-blur-md px-4 py-2 rounded-xl font-black z-20 border flex items-center gap-2 select-none ${timeLeft <= 3 ? 'bg-red-500/90 text-white border-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-black/60 text-yellow-500 border-white/10'}`}>
           <Clock size={16} className={timeLeft <= 3 ? 'animate-bounce' : ''} />
           <span>{timeLeft} ث</span>
         </div>

         <h3 className="text-white text-lg md:text-xl font-black text-center leading-relaxed drop-shadow-md z-10 select-none px-4">
           {question.text}
         </h3>
       </div>

       <div className="p-4 space-y-3 bg-black rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20 relative">
          {(status === 'answered' || status === 'timeout') ? (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-4 text-center">
                 {status === 'timeout' ? (
                   <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-orange-500/30">
                     <Clock size={32} />
                   </div>
                 ) : isCorrect ? (
                   <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-green-500/30">
                     <Check size={32} strokeWidth={3} />
                   </div>
                 ) : (
                   <div className="w-16 h-16 bg-red-650 rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-red-500/30">
                     <X size={32} strokeWidth={3} />
                   </div>
                 )}
                 <h4 className={`text-xl font-black mb-2 select-none ${status === 'timeout' ? 'text-orange-500' : isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                   {status === 'timeout' ? 'انتهى الوقت!' : isCorrect ? 'إجابة صحيحة!' : 'إجابة خاطئة!'}
                 </h4>
                 <p className="text-neutral-400 text-xs leading-relaxed max-w-[250px] select-none px-1">{question.explanation}</p>
                 
                 <button onClick={nextQuestion} className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition flex justify-center items-center gap-2 text-md shadow-[0_0_20px_rgba(37,99,235,0.3)] cursor-pointer">
                     <span>السؤال التالي</span> 
                     <Play size={16} fill="currentColor" />
                 </button>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-2 pt-4">
              <button
                onClick={() => handleAnswer(true)}
                className="bg-green-600 hover:bg-green-500 text-white font-black py-5 rounded-2xl transition-all shadow-[0_4px_0_rgb(22,163,74)] active:translate-y-1 active:shadow-none text-xl cursor-pointer"
              >
                صح
              </button>
              <button
                onClick={() => handleAnswer(false)}
                className="bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-2xl transition-all shadow-[0_4px_0_rgb(220,38,38)] active:translate-y-1 active:shadow-none text-xl cursor-pointer"
              >
                خطأ
              </button>
            </div>
          )}
       </div>
    </div>
  );
}
