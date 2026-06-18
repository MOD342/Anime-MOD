import React, { useState, useEffect } from 'react';
import { 
  Play, Check, X, Zap, Clock, Volume2, VolumeX, Flame, 
  Sparkles, HelpCircle, PlusCircle, Award, Compass, ThumbsUp, Send, Loader2, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, getIsMutedGlobal, toggleGlobalMute } from '../../utils/gameAudio';
import { getTriviaQuestions, submitTriviaQuestion, voteTriviaQuestion } from '../../services/animeTriviaService';
import { useAuth } from '../../contexts/AuthContext';
import { TriviaQuestion } from '../../models/TriviaQuestion';

export default function AnimeTriviaGame({ onScoreUpdate }: { onScoreUpdate: (pts: number) => void }) {
  const { user, userData } = useAuth();
  
  // States
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [status, setStatus] = useState<'playing' | 'answered' | 'timeout' | 'complete'>('playing');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15); // 15 seconds per multi-choice question
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [muted, setMuted] = useState(getIsMutedGlobal());
  const [gameDifficulty, setGameDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  
  // Custom suggestion mode
  const [showContribute, setShowContribute] = useState(false);
  const [contribQuestion, setContribQuestion] = useState('');
  const [contribAnime, setContribAnime] = useState('');
  const [contribOptions, setContribOptions] = useState(['', '', '', '']);
  const [contribCorrectIndex, setContribCorrectIndex] = useState(0);
  const [contribDifficulty, setContribDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [contribIsSubmitting, setContribIsSubmitting] = useState(false);
  const [contribSuccessMsg, setContribSuccessMsg] = useState('');

  const fetchQuestions = async (diff: 'easy' | 'medium' | 'hard') => {
    setLoading(true);
    try {
      const qList = await getTriviaQuestions(diff, user);
      if (qList && qList.length > 0) {
        setQuestions(qList);
        setCurrentQIndex(0);
        setStatus('playing');
        setSelectedOption(null);
        setTimeLeft(15);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions(gameDifficulty);
  }, [gameDifficulty]);

  const toggleMuteLocal = () => {
    const isMutedNow = toggleGlobalMute();
    setMuted(isMutedNow);
    playSound('click');
  };

  const question = questions[currentQIndex];

  // Timer engine
  useEffect(() => {
    if (status !== 'playing' || !question || showContribute) return;
    
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
  }, [timeLeft, status, question, showContribute]);

  const handleAnswer = (optionIndex: number) => {
    if (status !== 'playing' || !question) return;
    setSelectedOption(optionIndex);
    setStatus('answered');
    
    const isCorrect = optionIndex === question.correctIndex;
    if (isCorrect) {
      playSound('win');
      const timeBonus = Math.floor(timeLeft / 3);
      const multiplier = streak >= 5 ? 2.0 : streak >= 3 ? 1.5 : 1.0;
      const basePoints = 15 + timeBonus; // 15 base points for multi-choice
      const finalPoints = Math.ceil(basePoints * multiplier);
      
      setStreak(s => s + 1);
      setScore(s => s + finalPoints);
      onScoreUpdate(finalPoints);
    } else {
      playSound('lose');
      setStreak(0);
    }
  };

  const handleVote = async (isLike: boolean) => {
    if (!question || !question.id) return;
    playSound('click');
    await voteTriviaQuestion(question.id, isLike);
    if (isLike) {
      question.likes += 1;
    } else {
      question.dislikes += 1;
    }
    // Forces re-render of current question statistics
    setQuestions([...questions]);
  };

  const nextQuestion = () => {
    playSound('click');
    setSelectedOption(null);
    setTimeLeft(15);

    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(c => c + 1);
      setStatus('playing');
    } else {
      setStatus('complete');
    }
  };

  const resetGame = () => {
    playSound('click');
    setScore(0);
    setStreak(0);
    fetchQuestions(gameDifficulty);
  };

  // Contribute / Custom Trivia Submissions
  const handleContribOptionChange = (idx: number, val: string) => {
    const nextArr = [...contribOptions];
    nextArr[idx] = val;
    setContribOptions(nextArr);
  };

  const handleContribSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("سجل دخولك أولاً للإسهام في بنك المعرفة!");
      return;
    }
    if (!contribQuestion.trim() || !contribAnime.trim() || contribOptions.some(o => !o.trim())) {
      alert("يرجى ملء جميع الخانات والخيارات بالكامل!");
      return;
    }

    setContribIsSubmitting(true);
    setContribSuccessMsg('');
    try {
      const qObj = {
        question: contribQuestion,
        options: contribOptions,
        correctIndex: contribCorrectIndex,
        animeName: contribAnime,
        difficulty: contribDifficulty,
        author: userData?.displayName || userData?.username || 'أوتوكو مشارك'
      };

      const success = await submitTriviaQuestion(qObj, user.id, qObj.author);
      if (success) {
        playSound('win');
        setContribSuccessMsg("تم توثيق لغزك في صومعة الألعاب بنجاح! كسبت +20 كوينز 🪙 و +40 خبرة ✨ لإسهامك القيم.");
        // clear inputs
        setContribQuestion('');
        setContribAnime('');
        setContribOptions(['', '', '', '']);
        setContribCorrectIndex(0);
      } else {
        alert("فشل تحديث خادم الألعاب، يرجى محاولة خطوتك مجدداً لاحقاً.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setContribIsSubmitting(false);
    }
  };

  if (showContribute) {
    return (
      <div className="w-full max-w-lg mx-auto bg-[#121215] rounded-3xl border border-neutral-800 shadow-2xl overflow-hidden p-6 text-right font-sans" dir="rtl">
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <PlusCircle className="text-pink-500 w-5 h-5" />
            <h2 className="text-white font-black text-lg">صانع وتحديث ألغاز الأنمي 🛠️</h2>
          </div>
          <button 
            onClick={() => { playSound('click'); setShowContribute(false); setContribSuccessMsg(''); }}
            className="p-1.5 bg-white/5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
        </div>

        {contribSuccessMsg ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/10 border border-green-500/30 p-6 rounded-2xl text-center space-y-4"
          >
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-400">
              <Award size={24} />
            </div>
            <p className="text-neutral-200 text-sm font-bold leading-relaxed">{contribSuccessMsg}</p>
            <button 
              onClick={() => { playSound('click'); setContribSuccessMsg(''); }}
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-xl text-xs transition cursor-pointer"
            >
              تصميم لغز آخر
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleContribSubmit} className="space-y-4">
            <p className="text-xs text-neutral-400 leading-relaxed">
              ساعد مجتمع الأكاديمية على تحديث بنك الألعاب باستمرار ومنع التكرار! اكتب سؤالاً فريداً بـ 4 خيارات حصرية. ستكسب مكافآت قيمة على الفور.
            </p>

            <div>
              <label className="block text-neutral-300 font-bold text-xs mb-1.5">السؤال المعرفي المطروح:</label>
              <textarea 
                value={contribQuestion}
                onChange={(e) => setContribQuestion(e.target.value)}
                placeholder="مثال: من هو بطل قصة هجوم العمالقة الفعلي؟"
                maxLength={400}
                rows={2}
                className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200 placeholder-neutral-650 text-xs focus:border-pink-500 outline-none transition"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-300 font-bold text-xs mb-1.5">الأنمي المستهدف:</label>
                <input 
                  type="text"
                  value={contribAnime}
                  onChange={(e) => setContribAnime(e.target.value)}
                  placeholder="مثال: Attack on Titan"
                  maxLength={100}
                  className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-1.5 text-neutral-200 placeholder-neutral-650 text-xs focus:border-pink-500 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-bold text-xs mb-1.5">درجة الصعوبة:</label>
                <select 
                  value={contribDifficulty}
                  onChange={(e: any) => setContribDifficulty(e.target.value)}
                  className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-1.5 text-neutral-200 text-xs focus:border-pink-500 outline-none transition"
                >
                  <option value="easy">سهل (كاجوال)</option>
                  <option value="medium">متوسط (أوتاكو)</option>
                  <option value="hard">صعب (نخبة)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-neutral-300 font-bold text-xs">خيارات الإجابة والحلول (4):</label>
              {contribOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 font-mono font-bold text-neutral-500 text-xs flex justify-center items-center h-8 bg-black border border-neutral-800 rounded-lg">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <input 
                    type="text"
                    value={opt}
                    onChange={(e) => handleContribOptionChange(idx, e.target.value)}
                    placeholder={`الخيار المعروض ${idx + 1}...`}
                    maxLength={100}
                    className="flex-1 bg-black border border-neutral-800 rounded-xl px-3 py-1.5 text-neutral-200 placeholder-neutral-650 text-xs focus:border-pink-500 outline-none transition"
                    required
                  />
                  <input 
                    type="radio"
                    name="correctContrib"
                    checked={contribCorrectIndex === idx}
                    onChange={() => setContribCorrectIndex(idx)}
                    className="cursor-pointer w-4 h-4 accent-pink-500 border-neutral-850"
                    title="الخيار الصحيح"
                  />
                </div>
              ))}
              <span className="text-[10px] text-pink-400 block mt-1">💡 انقر على الزر الدائري لتحديد الخيار الصحيح من ضمن الأربعة خيارات.</span>
            </div>

            <button 
              type="submit"
              disabled={contribIsSubmitting}
              className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-pink-500/20 disabled:opacity-50 transition cursor-pointer"
            >
              {contribIsSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تسجيل سؤالك الجديد...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>نشر اللغز في بنك المعرفة 🚀</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    );
  }

  if (loading && questions.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto bg-[#121215] rounded-3xl border border-neutral-800 flex items-center justify-center min-h-[500px]">
        <div className="text-center animate-pulse space-y-4">
          <HelpCircle className="w-12 h-12 animate-spin text-pink-500 mx-auto" />
          <p className="text-neutral-400 font-bold text-sm">جاري تنشيط وحساب ألغاز الأوتوكو المعرفية...</p>
        </div>
      </div>
    );
  }

  if (status === 'complete' || questions.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto bg-[#121215] rounded-3xl border border-neutral-800 shadow-2xl p-6 text-center text-right font-sans space-y-6 min-h-[480px] flex flex-col justify-center" dir="rtl">
        <div className="w-16 h-16 bg-gradient-to-tr from-pink-600 to-rose-500 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg shadow-pink-500/20">
          <Award size={36} />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-white font-black text-2xl tracking-tight">انتهى عهد التحدي المعرفي!</h2>
          <p className="text-neutral-400 text-sm">لقد واجهت واجتزت جميع الألغاز المجهزة من بنك الألعاب.</p>
        </div>

        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 grid grid-cols-2 gap-4 text-center">
          <div>
            <span className="text-xs text-neutral-500 block">النقاط الإضافية</span>
            <span className="text-pink-500 font-black text-xl">{score}</span>
          </div>
          <div>
            <span className="text-xs text-neutral-500 block">سلسلة الحلول القصوى</span>
            <span className="text-yellow-500 font-black text-xl">{streak} 🔥</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={resetGame}
            className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black py-3 rounded-2xl text-xs transition shadow-lg hover:shadow-pink-500/20 cursor-pointer"
          >
            إعادة المحاولة مجدداً
          </button>
          
          <button 
            onClick={() => { playSound('click'); setShowContribute(true); }}
            className="bg-white/5 hover:bg-white/10 text-white font-black px-4 py-3 rounded-2xl text-xs border border-white/5 transition flex items-center gap-1 cursor-pointer"
          >
            <PlusCircle size={14} className="text-pink-400" />
            <span>تحديث البنك</span>
          </button>
        </div>
      </div>
    );
  }

  const isCorrect = selectedOption === question.correctIndex;
  const isAnswered = status === 'answered';
  const isTimedOut = status === 'timeout';

  return (
    <div className="w-full max-w-md mx-auto bg-[#121215] rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl relative flex flex-col min-h-[520px] font-sans text-right" dir="rtl">
      
      {/* Top Header Row Controls */}
      <div className="absolute top-4 right-4 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl text-pink-500 font-black z-30 border border-pink-500/20 shadow-lg text-xs flex items-center gap-1.5 select-none">
        <Sparkles size={11} className="text-pink-400" />
        <span>النقاط: {score}</span>
      </div>

      <div className="absolute top-4 left-4 flex gap-2 z-40 bg-transparent">
        {/* Help / Suggest button */}
        <button 
          onClick={() => { playSound('click'); setShowContribute(true); }}
          className="bg-black/80 backdrop-blur-md p-2 rounded-xl text-neutral-300 border border-white/10 hover:bg-neutral-800 hover:text-pink-400 transition cursor-pointer shadow-lg text-[10px] flex items-center gap-1"
          title="أضف لغزاً جديداً لمنع التكرار وتحديث المحتوى"
        >
          <PlusCircle size={14} />
          <span>إضافة سؤال</span>
        </button>

        {/* Mute Button */}
        <button 
          onClick={toggleMuteLocal}
          className="bg-black/80 backdrop-blur-md p-2 rounded-xl text-white border border-white/10 hover:bg-neutral-800 transition cursor-pointer"
          title={muted ? "تشغيل الصوت" : "كتم الصوت"}
        >
          {muted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} className="text-green-400" />}
        </button>
      </div>

      {/* Progress Bar of game queries */}
      <div className="w-full h-1.5 bg-neutral-900 border-b border-neutral-850 relative">
        <div 
          className="bg-gradient-to-l from-pink-500 to-rose-500 h-full transition-all duration-500"
          style={{ width: `${((currentQIndex + (isAnswered ? 1 : 0)) / questions.length) * 100}%` }}
        />
        {/* Remaining timer visual line */}
        {status === 'playing' && (
          <div 
            className="absolute bottom-0 inset-x-0 h-[2px] bg-yellow-500/60 transition-all duration-1000 origin-right"
            style={{ width: `${(timeLeft / 15) * 100}%` }}
          />
        )}
      </div>

      {/* Main Container */}
      <div className="p-5 flex-1 flex flex-col justify-between pt-16">
        
        {/* Stats segment */}
        <div className="flex justify-between items-center text-[10px] text-neutral-400 mb-2">
          <div className="flex items-center gap-1">
            <Compass size={11} className="text-neutral-500" />
            <span>الأنمي: <strong className="text-neutral-200">{question.animeName || 'غير معروف'}</strong></span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded-md font-black text-[9px] border ${
              question.difficulty === 'easy' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
              question.difficulty === 'hard' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
              'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}>
              {question.difficulty === 'easy' ? 'سهل' : question.difficulty === 'hard' ? 'صعب' : 'متوسط'}
            </span>
            <span>لغز: {currentQIndex + 1}/{questions.length}</span>
          </div>
        </div>

        {/* Current question display body */}
        <div className="my-3 flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <h3 className="text-white font-black text-sm sm:text-l md:text-md leading-relaxed select-all">
                {question.question}
              </h3>

              {question.author && (
                <span className="text-[9px] text-neutral-500 block">
                  كتابة وإعداد: <strong className="text-neutral-400">{question.author}</strong>
                </span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Options list selection */}
        <div className="space-y-2 mt-2">
          {question.options.map((option, idx) => {
            let btnStyle = "bg-neutral-900/65 text-neutral-200 hover:bg-neutral-800/80 border-neutral-800";
            
            if (isAnswered) {
              if (idx === question.correctIndex) {
                btnStyle = "bg-green-600/25 text-green-300 border-green-500 shadow-md shadow-green-500/5";
              } else if (idx === selectedOption) {
                btnStyle = "bg-red-600/25 text-red-300 border-red-500 shadow-md shadow-red-500/5";
              } else {
                btnStyle = "bg-neutral-950 text-neutral-600 border-neutral-900 opacity-55";
              }
            } else if (isTimedOut) {
              if (idx === question.correctIndex) {
                btnStyle = "bg-green-600/25 text-green-300 border-green-500";
              } else {
                btnStyle = "bg-neutral-950 text-neutral-600 border-neutral-950 opacity-40";
              }
            }

            return (
              <button
                key={idx}
                disabled={isAnswered || isTimedOut}
                onClick={() => handleAnswer(idx)}
                className={`w-full text-right p-3 rounded-2xl border text-xs font-bold transition duration-200 flex items-center justify-between select-none cursor-pointer ${btnStyle}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-5.5 h-5.5 rounded-lg flex items-center justify-center font-mono text-[10px] font-black border ${
                    isAnswered && idx === question.correctIndex ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                    isAnswered && idx === selectedOption ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                    'bg-black/40 text-neutral-450 border-neutral-800'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{option}</span>
                </div>
                
                {/* Icons indicators */}
                {isAnswered && idx === question.correctIndex && (
                  <Check size={14} className="text-green-400 shrink-0" />
                )}
                {isAnswered && idx === selectedOption && idx !== question.correctIndex && (
                  <X size={14} className="text-red-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom controls or explanation segment */}
        <div className="min-h-[80px] flex flex-col justify-end mt-4">
          {(isAnswered || isTimedOut) ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-3"
            >
              {/* Correctness banner */}
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-black text-xs ${isCorrect ? 'text-green-400' : 'text-rose-400'}`}>
                    {isTimedOut ? "⌛ انتهى وقت الإجابة الحرج!" : isCorrect ? "✨ إجابة صحيحة نموذجية!" : "❌ إجابة خاطئة!"}
                  </p>
                  
                  {/* Rating / Likes on Trivia Question */}
                  {question!.id && (
                    <div className="flex items-center gap-2.5 mt-1.5 text-[9px] text-neutral-500">
                      <span>هل أعجبك هذا اللغز؟</span>
                      <button 
                        onClick={() => handleVote(true)}
                        className="flex items-center gap-0.5 hover:text-green-400 transition"
                      >
                        <ThumbsUp size={10} />
                        <span>({question.likes || 0})</span>
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={nextQuestion}
                  className="bg-neutral-800 hover:bg-neutral-700 text-white font-black text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  {currentQIndex === questions.length - 1 ? 'إنهاء التحدي 🏁' : 'السؤال التالي ➡️'}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex justify-between items-center text-[10.5px]">
              {/* Timeout clock remaining */}
              <div className="flex items-center gap-1.5 text-neutral-450">
                <Clock size={12} className={timeLeft <= 4 ? 'text-rose-500 animate-pulse' : 'text-neutral-500'} />
                <span>المهلة الزمنية: <strong className={timeLeft <= 4 ? 'text-rose-500 underline font-mono' : 'text-neutral-200 font-mono'}>{timeLeft} ثواني</strong></span>
              </div>
              
              {/* Streak info */}
              {streak > 0 && (
                <div className="bg-gradient-to-r from-yellow-600 to-amber-500 text-white text-[9.5px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md shadow-yellow-500/10">
                  <Flame size={10} className="fill-current animate-bounce text-yellow-300" />
                  <span>متتابع: {streak} حلول متتالية</span>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
