import React, { useState, useEffect, useMemo } from 'react';
import { Play, Check, X, HelpCircle, Eye, EyeOff, Sparkles, Volume2, VolumeX, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound, getIsMutedGlobal, toggleGlobalMute } from '../../utils/gameAudio';

const ANIME_LIST = [
  { id: '1', title: 'Attack on Titan', altTitles: ['هجوم العمالقة', 'shingeki no kyojin', 'شينجيكي نو كيوجين', 'ايرين ييغر'], img: 'https://cdn.myanimelist.net/images/anime/10/47347.jpg' },
  { id: '2', title: 'Naruto', altTitles: ['ناروتو', 'ناروتو شيبودن', 'naruto shippuden', 'اوزوماكي ناروتو'], img: 'https://cdn.myanimelist.net/images/anime/13/17405.jpg' },
  { id: '3', title: 'Death Note', altTitles: ['مذكرة الموت', 'ديث نوت', 'لايت'], img: 'https://cdn.myanimelist.net/images/anime/9/864.jpg' },
  { id: '4', title: 'One Piece', altTitles: ['ون بيس', 'لوفي', 'طاقم قبعة القش'], img: 'https://cdn.myanimelist.net/images/anime/6/73245.jpg' },
  { id: '5', title: 'Demon Slayer', altTitles: ['قاتل الشياطين', 'kimetsu no yaiba', 'ديمون سلاير', 'تانجيرو'], img: 'https://cdn.myanimelist.net/images/anime/1286/99889.jpg' },
  { id: '6', title: 'Jujutsu Kaisen', altTitles: ['جوجوتسو كايسن', 'جيجيتسو كايسن', 'جوجوتسو', 'غوجو ساتورو'], img: 'https://cdn.myanimelist.net/images/anime/1171/109222.jpg' },
  { id: '7', title: 'Hunter x Hunter', altTitles: ['هنتر', 'هنتر اكس هنتر', 'القناص', 'كيلوا', 'غون'], img: 'https://cdn.myanimelist.net/images/anime/1337/99013.jpg' },
  { id: '8', title: 'Fullmetal Alchemist', altTitles: ['الكيميائي المعدني الكامل', 'فولميتال الكيميائي', 'فول ميتال', 'ادوارد الريك'], img: 'https://cdn.myanimelist.net/images/anime/1208/94745.jpg' },
  { id: '9', title: 'One Punch Man', altTitles: ['ون بنش مان', 'رجل اللكمة الواحدة', 'سايتاما', 'ون بانش'], img: 'https://cdn.myanimelist.net/images/anime/12/76049.jpg' },
  { id: '10', title: 'My Hero Academia', altTitles: ['اكاديمية بطلي', 'ماي هيرو اكاديميا', 'بوكو نو هيرو', 'ميدوريا'], img: 'https://cdn.myanimelist.net/images/anime/10/78745.jpg' },
  { id: '11', title: 'Bleach', altTitles: ['بليتش', 'ايتشيغو'], img: 'https://cdn.myanimelist.net/images/anime/3/40451.jpg' },
  { id: '12', title: 'Dragon Ball Z', altTitles: ['دراغون بول', 'دراغون بول زد', 'غوكو'], img: 'https://cdn.myanimelist.net/images/anime/6/20958.jpg' },
  { id: '13', title: 'Sword Art Online', altTitles: ['فن السيف عبر الانترنت', 'سورد ارت اونلاين', 'كيريتو'], img: 'https://cdn.myanimelist.net/images/anime/11/39717.jpg' },
  { id: '14', title: 'Black Clover', altTitles: ['بلاك كلوفر', 'البرسيم الاسود', 'استا'], img: 'https://cdn.myanimelist.net/images/anime/2/88334.jpg' },
  { id: '15', title: 'Tokyo Ghoul', altTitles: ['غول طوكيو', 'توكيو غول', 'كينيكي'], img: 'https://cdn.myanimelist.net/images/anime/5/64449.jpg' },
  { id: '16', title: 'Steins;Gate', altTitles: ['بوابة شتاينز', 'شتاينز غيت', 'steins gate'], img: 'https://cdn.myanimelist.net/images/anime/15/35471.jpg' },
  { id: '17', title: 'Code Geass', altTitles: ['كود غياس', 'كود جياس', 'لولوش'], img: 'https://cdn.myanimelist.net/images/anime/4/9313.jpg' },
  { id: '18', title: 'Haikyuu', altTitles: ['هايكيو', 'هايكيوو', 'كرة الطائرة'], img: 'https://cdn.myanimelist.net/images/anime/7/76014.jpg' },
  { id: '19', title: 'Neon Genesis Evangelion', altTitles: ['ايفانجيليون', 'ايفر جاردن'], img: 'https://cdn.myanimelist.net/images/anime/12/2143.jpg' },
  { id: '20', title: 'Mob Psycho 100', altTitles: ['موب سايكو', 'موب سايكو 100'], img: 'https://cdn.myanimelist.net/images/anime/8/80356.jpg' },
  { id: '21', title: 'Vinland Saga', altTitles: ['فينلاند ساغا', 'فينلاند', 'ثورفين'], img: 'https://cdn.myanimelist.net/images/anime/1500/101311.jpg' },
  { id: '22', title: 'Chainsaw Man', altTitles: ['رجل المنشار', 'شينسو مان', 'دينجي'], img: 'https://cdn.myanimelist.net/images/anime/1806/126216.jpg' },
  { id: '23', title: 'Monster', altTitles: ['مونستر', 'الوحش', 'دكتور تينما'], img: 'https://cdn.myanimelist.net/images/anime/10/11671.jpg' },
  { id: '24', title: 'Violet Evergarden', altTitles: ['فايوليت ايفرغاردن', 'فايوليت'], img: 'https://cdn.myanimelist.net/images/anime/1795/95088.jpg' },
  { id: '25', title: 'Your Name', altTitles: ['اسمك', 'كيمي نو نا وا', 'kimi no na wa'], img: 'https://cdn.myanimelist.net/images/anime/5/87048.jpg' },
  { id: '26', title: 'Spy x Family', altTitles: ['عائلة الجاسوس', 'سباي اكس فاميلي', 'انيا', 'لويد', 'ير'], img: 'https://cdn.myanimelist.net/images/anime/1441/122795.jpg' },
  { id: '27', title: 'Gintama', altTitles: ['جينتاما', 'جينتوكي', 'جنتاما'], img: 'https://cdn.myanimelist.net/images/anime/3/72078.jpg' },
  { id: '28', title: 'Blue Lock', altTitles: ['القفل الأزرق', 'بلو لوك', 'ايساجي'], img: 'https://cdn.myanimelist.net/images/anime/1258/126926.jpg' },
  { id: '29', title: 'Dr. Stone', altTitles: ['دكتور ستون', 'دكتور الصخر', 'سينكو'], img: 'https://cdn.myanimelist.net/images/anime/1619/103820.jpg' },
  { id: '30', title: 'Fairy Tail', altTitles: ['ذيل الجنية', 'فيري تيل', 'ناتسو'], img: 'https://cdn.myanimelist.net/images/anime/1813/141707.jpg' },
  { id: '31', title: 'JoJo\'s Bizarre Adventure', altTitles: ['مغامرات جوجو العجيبة', 'جوجو', 'jojo'], img: 'https://cdn.myanimelist.net/images/anime/3/40407.jpg' },
  { id: '32', title: 'Re:Zero', altTitles: ['ري زيرو', 'سوبارو', 'ري:زيرو'], img: 'https://cdn.myanimelist.net/images/anime/1522/117645.jpg' },
  { id: '33', title: 'Assassination Classroom', altTitles: ['فصل الاغتيال', 'كوروسينسي', 'كورو سينسي'], img: 'https://cdn.myanimelist.net/images/anime/10/73273.jpg' },
  { id: '34', title: 'No Game No Life', altTitles: ['لا لعبة لا حياة', 'نو غيم نو لايف', 'سورا وشيرو'], img: 'https://cdn.myanimelist.net/images/anime/5/65135.jpg' },
  { id: '35', title: 'Parasyte', altTitles: ['الطفيلي', 'باراسايت', 'شينيتشي'], img: 'https://cdn.myanimelist.net/images/anime/1105/119934.jpg' },
  { id: '36', title: 'Dororo', altTitles: ['دورورو', 'هياكيمارو'], img: 'https://cdn.myanimelist.net/images/anime/1879/100465.jpg' },
  { id: '37', title: 'Fate/Zero', altTitles: ['فيت زيرو', 'فيت/زيرو', 'كيريتسوغو'], img: 'https://cdn.myanimelist.net/images/anime/1522/114250.jpg' },
  { id: '38', title: 'Cyberpunk: Edgerunners', altTitles: ['سايبربانك', 'سايبر بانك', 'ديفيد'], img: 'https://cdn.myanimelist.net/images/anime/1191/125011.jpg' },
  { id: '39', title: 'Overlord', altTitles: ['أوفرلورد', 'اوفرلورد', 'أينز'], img: 'https://cdn.myanimelist.net/images/anime/7/74053.jpg' },
];

interface PixelGuessGameProps {
  onScoreUpdate: (pointsAdded: number) => void;
}

const normalizeString = (str: string) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\s\-_]/g, '');
};

export default function PixelGuessGame({ onScoreUpdate }: PixelGuessGameProps) {
  const [currentRound, setCurrentRound] = useState(0);
  const [blurAmount, setBlurAmount] = useState(40);
  const [guess, setGuess] = useState('');
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [score, setScore] = useState(0);
  const [mode, setMode] = useState<'text' | 'choice'>('text');
  const [streak, setStreak] = useState(0);
  const [muted, setMuted] = useState(getIsMutedGlobal());

  const anime = useMemo(() => {
    return ANIME_LIST[currentRound % ANIME_LIST.length];
  }, [currentRound]);

  // Generate 4 randomized multiple-choice options (the correct one + 3 random distractors)
  const choices = useMemo(() => {
    if (!anime) return [];
    const incorrectChoices = ANIME_LIST.filter(item => item.id !== anime.id);
    const shuffledIncorrect = [...incorrectChoices].sort(() => 0.5 - Math.random());
    const distractors = shuffledIncorrect.slice(0, 3);
    return [anime, ...distractors].sort(() => 0.5 - Math.random());
  }, [anime, currentRound]);

  const toggleMuteLocal = () => {
    const isMutedNow = toggleGlobalMute();
    setMuted(isMutedNow);
    playSound('click');
  };

  // Handle Text/Manual typing guess
  const handleGuess = (textInput?: string) => {
    const activeGuess = textInput !== undefined ? textInput : guess;
    if (!activeGuess.trim()) return;
    
    // Play button tap audio
    playSound('click');

    const normGuess = normalizeString(activeGuess);
    const isCorrect = 
      normalizeString(anime.title) === normGuess || 
      anime.altTitles.some(alt => normalizeString(alt) === normGuess);
      
    if (isCorrect) {
      setGameState('won');
      playSound('win');
      
      const multiplier = streak >= 5 ? 2.0 : streak >= 3 ? 1.5 : 1.0;
      const basePoints = mode === 'choice' ? 12 : Math.max(10, blurAmount);
      const finalPoints = Math.ceil(basePoints * multiplier);
      
      setStreak(s => s + 1);
      setScore(s => s + finalPoints);
      onScoreUpdate(finalPoints);
    } else {
      if (blurAmount > 10) {
        setBlurAmount(prev => Math.max(10, prev - 10));
      } else {
        setGameState('lost');
        playSound('lose');
        setStreak(0);
      }
    }
  };

  const handleChoiceSelect = (selectedTitle: string) => {
    playSound('click');
    if (selectedTitle === anime.title) {
      setGameState('won');
      playSound('win');
      
      const multiplier = streak >= 5 ? 2.0 : streak >= 3 ? 1.5 : 1.0;
      const basePoints = 12; // Flat choice mode score
      const finalPoints = Math.ceil(basePoints * multiplier);
      
      setStreak(s => s + 1);
      setScore(s => s + finalPoints);
      onScoreUpdate(finalPoints);
    } else {
      setGameState('lost');
      playSound('lose');
      setStreak(0);
    }
  };

  const nextRound = () => {
    playSound('click');
    setCurrentRound(c => c + 1);
    setBlurAmount(40);
    setGuess('');
    setGameState('playing');
  };

  // Search autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!guess.trim() || gameState !== 'playing') return [];
    const normUser = normalizeString(guess);
    return ANIME_LIST.filter(item => {
      return normalizeString(item.title).includes(normUser) || 
             item.altTitles.some(alt => normalizeString(alt).includes(normUser));
    }).slice(0, 4);
  }, [guess, gameState]);

  return (
    <div className="w-full max-w-md mx-auto bg-[#121212] rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl relative">
       {/* Top Controls Header */}
       <div className="absolute top-4 right-4 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl text-yellow-500 font-black z-20 border border-yellow-500/20 shadow-lg text-xs flex items-center gap-1.5">
         <Sparkles size={12} className="text-yellow-400" />
         <span>النتيجة: {score}</span>
       </div>

       <div className="absolute top-4 left-4 flex gap-2 z-20">
         {/* Mute Button */}
         <button 
           onClick={toggleMuteLocal}
           className="bg-black/80 backdrop-blur-md p-2 rounded-xl text-white border border-white/10 hover:bg-neutral-800 transition cursor-pointer"
           title={muted ? "تشغيل الصوت" : "كتم الصوت"}
         >
           {muted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} className="text-green-400" />}
         </button>

         {/* Mode Toggle Button */}
         {gameState === 'playing' && (
           <button 
             onClick={() => { setMode(m => m === 'text' ? 'choice' : 'text'); playSound('click'); }}
             className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl text-white font-bold border border-white/10 text-[10px] hover:bg-white/15 transition flex items-center gap-1 cursor-pointer"
           >
             {mode === 'text' ? <Eye size={12} className="text-blue-400" /> : <EyeOff size={12} className="text-neutral-400" />}
             <span>{mode === 'text' ? 'الخيارات' : 'يدوي'}</span>
           </button>
         )}
       </div>

       {/* Streak Indicator float */}
       {streak > 0 && (
         <motion.div 
           initial={{ scale: 0.5, y: -10, opacity: 0 }}
           animate={{ scale: 1, y: 0, opacity: 1 }}
           className="absolute top-16 right-4 bg-gradient-to-r from-orange-600 to-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full z-20 flex items-center gap-1 shadow-lg shadow-orange-500/20"
         >
           <Flame size={12} className="animate-bounce" />
           <span>سلسلة: {streak}</span>
           {streak >= 3 && <span className="text-[8px] bg-black/35 px-1 rounded">مضاعف x{streak >= 5 ? '2.0' : '1.5'}</span>}
         </motion.div>
       )}
       
       <div className="relative aspect-square overflow-hidden bg-neutral-900 flex items-center justify-center">
         <img 
           src={anime.img} 
           alt="guess-anime" 
           className="w-full h-full object-cover transition-all duration-700" 
           style={{ filter: `blur(${gameState === 'playing' ? blurAmount : 0}px)` }}
         />
         <AnimatePresence>
           {gameState === 'won' && (
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }} 
               animate={{ opacity: 1, scale: 1 }} 
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-green-950/90 backdrop-blur-md flex items-center justify-center z-10 flex-col gap-4 text-center p-4"
             >
               {/* Sparkle Confetti Simulation */}
               <div className="absolute inset-0 pointer-events-none overflow-hidden">
                 {[...Array(12)].map((_, i) => (
                   <motion.div
                     key={i}
                     initial={{ y: "100%", x: "50%", scale: 0 }}
                     animate={{ y: `${Math.random() * 80}%`, x: `${Math.random() * 100}%`, scale: [0, 1.2, 0] }}
                     transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                     className="absolute w-2.5 h-2.5 bg-yellow-400 rounded-full"
                   />
                 ))}
               </div>

               <div className="w-16 h-16 bg-green-550 border-2 border-white/20 rounded-full flex items-center justify-center text-white shadow-2xl shadow-green-500/40 relative z-20">
                 <Check size={32} strokeWidth={3} />
               </div>
               <h3 className="text-white text-2xl font-black drop-shadow-md relative z-20">إجابة نينجا مذهلة! 🎉</h3>
               <p className="text-white font-black text-xl border-t border-white/20 pt-2 w-full max-w-[200px] relative z-20">{anime.title}</p>
             </motion.div>
           )}
           {gameState === 'lost' && (
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }} 
               animate={{ opacity: 1, scale: 1 }} 
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex items-center justify-center z-10 flex-col gap-4 text-center p-4 border border-red-500/30"
             >
               <div className="w-16 h-16 bg-red-650 rounded-full flex items-center justify-center text-white shadow-2xl shadow-red-500/40">
                 <X size={32} strokeWidth={3} />
               </div>
               <h3 className="text-white text-xl font-black drop-shadow-md">نفدت شحنات التوضيح! 💀</h3>
               <p className="text-neutral-300 text-xs text-center pr-2">اسم الأنمي هو:</p>
               <p className="text-red-400 font-black text-xl leading-none">{anime.title}</p>
             </motion.div>
           )}
         </AnimatePresence>
       </div>

       <div className="p-6">
          {gameState === 'playing' ? (
            <div className="space-y-4 relative">
              {mode === 'text' ? (
                <>
                  <p className="text-neutral-400 text-xs text-center font-bold">خمن اسم الأنمي (عربي أو انجليزي):</p>
                  <div className="relative">
                    <input 
                      type="text"
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGuess()}
                      placeholder="اكتب اسم الأنمي... (مثال: ون بيس)"
                      className="w-full bg-black border border-neutral-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none transition text-center"
                    />

                    {/* Autocomplete Suggestion Dropdown */}
                    {suggestions.length > 0 && (
                      <div className="absolute top-12 left-0 right-0 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden z-30 shadow-2xl">
                        {suggestions.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setGuess(item.title);
                              handleGuess(item.title);
                            }}
                            className="w-full px-4 py-2.5 text-right font-medium text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition flex items-center justify-between border-b border-neutral-800/50 last:border-none cursor-pointer"
                          >
                            <span>{item.title}</span>
                            <span className="text-[10px] text-neutral-500 italic">انقر للاختيار</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => handleGuess()} 
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-xl transition shadow-[0_0_15px_rgba(37,99,235,0.3)] text-xs cursor-pointer"
                  >
                    تأكيد الإجابة والتحقق
                  </button>
                  <button 
                    onClick={() => { playSound('click'); setBlurAmount(prev => Math.max(10, prev - 10)); }} 
                    disabled={blurAmount <= 10}
                    type="button"
                    className="w-full bg-neutral-900 hover:bg-neutral-800 text-neutral-350 text-[11px] font-bold py-3 rounded-xl border border-white/5 transition flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <HelpCircle size={14} className="text-yellow-500" /> 
                    <span>تخفيف الضبابية (-10 نقطة وضوح)</span>
                  </button>
                </>
              ) : (
                <>
                  <p className="text-neutral-400 text-xs text-center font-bold">بين بدائل الخيرات.. أي هذه الأنميات هو الصحيح؟</p>
                  <div className="grid grid-cols-2 gap-2">
                    {choices.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleChoiceSelect(item.title)}
                        className="py-3 px-2 bg-neutral-900 border border-neutral-800 hover:border-blue-500/50 hover:bg-neutral-800/80 rounded-xl font-black text-xs text-center text-white transition-all cursor-pointer"
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <button 
              onClick={nextRound} 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition flex justify-center items-center gap-2 text-md shadow-[0_0_20px_rgba(37,99,235,0.3)] cursor-pointer"
            >
              الجولة التالية <Play size={18} fill="currentColor" />
            </button>
          )}
       </div>
    </div>
  );
}
