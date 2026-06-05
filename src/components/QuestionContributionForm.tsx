import React, { useState, useEffect } from 'react';
import { 
  Sparkles, CheckCircle2, ChevronDown, AlertCircle, 
  ThumbsUp, ThumbsDown, RefreshCw, HelpCircle, User, Eye, EyeOff, Tag, Search
} from 'lucide-react';
import { submitCustomQuestion, getLatestSubmittedQuestions, voteOnQuestion } from '../services/gamesDatabaseService';

interface Props {
  userId?: string;
  username: string;
}

export default function QuestionContributionForm({ userId, username }: Props) {
  // Tabs: 'create' or 'browse'
  const [activeTab, setActiveTab2] = useState<'create' | 'browse'>('create');

  // Creation State
  const [gameType, setGameType] = useState<string>('quotes');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fields
  const [text, setText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correct, setCorrect] = useState<number>(0);
  const [anime, setAnime] = useState('');
  const [explanation, setExplanation] = useState('');
  const [isTrue, setIsTrue] = useState<boolean>(true);

  // Pool Browser State
  const [poolQuestions, setPoolQuestions] = useState<any[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [votedIds, setVotedIds] = useState<Record<string, 'like' | 'dislike'>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const loadPoolQuestions = async () => {
    setPoolLoading(true);
    try {
      const qList = await getLatestSubmittedQuestions(35);
      setPoolQuestions(qList);
    } catch (err) {
      console.error(err);
    } finally {
      setPoolLoading(false);
    }
  };

  useEffect(() => {
    loadPoolQuestions();
  }, []);

  const handleOptionChange = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setErrorMsg('يجب تسجيل الدخول للمساهمة في بنك الأسئلة.');
      return;
    }

    // Validation
    if (gameType === 'quotes' && (!text || !anime || options.some(o => !o))) {
      setErrorMsg('تأكد من كتابة الاقتباس، واسم الأنمي، وجميع الخيارات الأربعة.');
      return;
    }
    if (gameType === 'imposter' && (!anime || options.some(o => !o))) {
      setErrorMsg('تأكد من كتابة اسم الأنمي، وجميع الخيارات الأربعة (حيث أحدها هو الدخيل).');
      return;
    }
    if (gameType === 'emoji' && (!text || options.some(o => !o))) {
      setErrorMsg('تأكد من كتابة رموز الإيموجي وتعبئة الخيارات الأربعة.');
      return;
    }
    if (gameType === 'trivia' && !text) {
      setErrorMsg('تأكد من صياغة عبارة التريفيا بشكل صحيح.');
      return;
    }
    if (gameType === 'math' && (!text || options.some(o => !o))) {
      setErrorMsg('تأكد من ملء المعادلة وكتابة الخيارات الأربعة بالأرقام.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    let questionData: any = {};
    if (gameType === 'quotes') {
      questionData = { text, options, correct, anime };
    } else if (gameType === 'imposter') {
      questionData = { anime, options, correct };
    } else if (gameType === 'emoji') {
       questionData = { emojis: text, options, correct };
    } else if (gameType === 'trivia') {
       questionData = { text, isTrue, explanation };
    } else if (gameType === 'math') {
       questionData = { text, options: options.map(o => parseInt(o) || 0), correct, answer: parseInt(options[correct]) || 0 };
    }

    const ok = await submitCustomQuestion(gameType, questionData, userId, username);
    setIsSubmitting(false);

    if (ok) {
      setSuccess(true);
      // Reset
      setText('');
      setOptions(['', '', '', '']);
      setAnime('');
      setExplanation('');
      loadPoolQuestions(); // Automatically update pool
    } else {
      setErrorMsg('فشل إرسال السؤال. الرجاء التحقق من المدخلات وسلامة الاتصال بـ Firestore.');
    }
  };

  const handleVote = async (questionId: string, isLike: boolean) => {
    if (votedIds[questionId]) return; // already voted
    setVotedIds(prev => ({ ...prev, [questionId]: isLike ? 'like' : 'dislike' }));
    
    // Optimistic Update
    setPoolQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          likes: isLike ? (q.likes + 1) : q.likes,
          dislikes: !isLike ? (q.dislikes + 1) : q.dislikes
        };
      }
      return q;
    }));

    await voteOnQuestion(questionId, isLike);
  };

  const getGameTypeName = (type: string) => {
    switch (type) {
      case 'quotes': return 'من القائل؟';
      case 'imposter': return 'الجاسوس الدخيل';
      case 'emoji': return 'تخمين إيموجي';
      case 'trivia': return 'صح أم خطأ';
      case 'math': return 'رياضيات الأنمي';
      default: return type;
    }
  };

  const getGameTypeColor = (type: string) => {
    switch (type) {
      case 'quotes': return 'bg-indigo-600/20 text-indigo-400 border-indigo-500/20';
      case 'imposter': return 'bg-red-600/20 text-red-400 border-red-500/20';
      case 'emoji': return 'bg-purple-600/20 text-purple-400 border-purple-500/20';
      case 'trivia': return 'bg-yellow-600/20 text-yellow-400 border-yellow-500/20';
      case 'math': return 'bg-emerald-600/20 text-emerald-400 border-emerald-500/20';
      default: return 'bg-neutral-600/20 text-neutral-400 border-neutral-500/20';
    }
  };

  const gameTypesList = [
    { id: 'quotes', name: 'اقتباسات من القائل؟ (Quotes)' },
    { id: 'imposter', name: 'الجاسوس الدخيل (Imposter)' },
    { id: 'emoji', name: 'تخمين إيموجي (Emoji Charades)' },
    { id: 'trivia', name: 'صح أم خطأ (Speed Trivia)' },
    { id: 'math', name: 'رياضيات الأنمي (Anime Math)' }
  ];

  // Filters
  const filteredQuestions = poolQuestions.filter(q => {
    const matchesCategory = selectedCategory === 'all' || q.type === selectedCategory;
    const bodyStr = `${q.text || ''} ${q.anime || ''} ${q.author || ''}`.toLowerCase();
    const matchesSearch = bodyStr.includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-[#121215] border border-white/5 rounded-3xl p-6 shadow-2xl text-right max-w-4xl mx-auto space-y-6">
      
      {/* Header Info */}
      <div className="border-b border-white/5 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-white font-black text-xl flex items-center gap-2 justify-end md:justify-start">
            <Sparkles className="text-yellow-500 fill-current animate-pulse" size={22} />
            <span>قاعدة البيانات الضخمة للمساهمات والأسئلة الذكية</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            شارك واطلع على ذخيرة الأسئلة الكبرى للعبة وتكافأ بـ <span className="text-yellow-500 font-bold">15 كوينز 🪙</span> و <span className="text-blue-400 font-bold">30 XP ⚡</span> فوراً!
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-black/40 border border-white/5 p-1 rounded-xl self-center md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab2('create')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            إضافة سؤال جديد ⚔️
          </button>
          <button
            type="button"
            onClick={() => setActiveTab2('browse')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer relative ${
              activeTab === 'browse'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            تصفح بنك الأسئلة والمساهمات המון 💎
            {poolQuestions.length > 0 && (
              <span className="absolute -top-1 -left-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        success ? (
          <div className="p-8 text-center space-y-4 bg-green-500/10 border border-green-550/30 rounded-2xl animate-fade-in max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto text-green-400">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-white font-black text-lg">تم إرسال مساهمتك بنجاح لقاعدة البيانات!</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              تمت إضافة سؤالك الذكي للذخيرة الكبرى بنجاح. نال حسابك <span className="text-yellow-500 font-bold">+15 كوينز 🪙</span> و <span className="text-blue-400 font-bold">+30 XP ⚡</span> كتقدير منا لمساهمتك العظيمة!
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setSuccess(false)}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-550 text-white text-xs font-black rounded-xl transition cursor-pointer"
              >
                إرسال سؤال آخر ⚔
              </button>
              <button
                onClick={() => {
                  setSuccess(false);
                  setActiveTab2('browse');
                }}
                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-black rounded-xl transition cursor-pointer"
              >
                رؤية الأسئلة المستلمة 👁️
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs sm:text-sm max-w-2xl mx-auto">
            {errorMsg && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Type Selector */}
            <div className="space-y-1.5 text-right">
              <label className="text-neutral-400 font-bold text-xs">اختر نوع اللعبة المصغرة لتعزيزها بقاعدتنا الذكية:</label>
              <div className="relative" dir="rtl">
                <select
                  value={gameType}
                  onChange={(e) => {
                    setGameType(e.target.value);
                    setText('');
                    setOptions(['', '', '', '']);
                    setAnime('');
                  }}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-neutral-200 focus:outline-none focus:border-green-500 appearance-none font-bold cursor-pointer text-right"
                >
                  {gameTypesList.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#121215] text-white">
                      {t.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute left-4 top-3.5 text-neutral-400 pointer-events-none w-4 h-4" />
              </div>
            </div>

            {/* Text input Depends on Type */}
            <div className="space-y-1.5 text-right">
              <label className="text-neutral-400 font-bold text-xs text-right block">
                {gameType === 'quotes' ? 'نص الاقتباس المأثور ومقولة الأوتوكو:' :
                 gameType === 'imposter' ? 'عنوان المجموعة كبطل أو فئة (مثل: فرسان أنمي السحر):' :
                 gameType === 'emoji' ? 'رموز الإيموجي المعبرة (مثال: 👒🏴‍☠️🍖):' :
                 gameType === 'trivia' ? 'نص عبارة التريفيا الذكية للتحكيم (صح/خطأ):' :
                 'صياغة المسألة الرياضية للأنمي (القيم المستهدفة بالجمع أو الطرح):'}
              </label>
              <input
                type="text"
                required
                placeholder={
                  gameType === 'quotes' ? 'مثال: لن أستسلم للقدر أبداً!' :
                  gameType === 'imposter' ? 'مثال: ون بيس' :
                  gameType === 'emoji' ? '🖤🍜📓' :
                  gameType === 'trivia' ? 'مثال: لوفي أكل فاكهة المطاط الملقبة بـ غومو غومو نو مي.' :
                  'مثال: رقم الكيوبي + عدد سيوف زورو'
                }
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-medium text-right shadow-inner"
              />
            </div>

            {/* Anime Input for Quotes and Imposter */}
            {(gameType === 'quotes' || gameType === 'imposter') && (
              <div className="space-y-1.5 text-right">
                <label className="text-neutral-400 font-bold text-xs text-right block">
                  {gameType === 'quotes' ? 'اسم الأنمي المقترن بالاقتباس:' : 'اسم الأنمي الموجه للمجموعة:'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ناروتو / ون بيس"
                  value={anime}
                  onChange={(e) => setAnime(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-medium text-right"
                />
              </div>
            )}

            {/* True / False input for Speed Trivia */}
            {gameType === 'trivia' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-right">
                  <label className="text-neutral-400 font-bold text-xs text-block text-right select-none block">الإجابة الصحيحة للعبارة:</label>
                  <div className="relative">
                    <select
                      value={isTrue ? 'true' : 'false'}
                      onChange={(e) => setIsTrue(e.target.value === 'true')}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 appearance-none cursor-pointer font-bold text-right"
                    >
                      <option value="true" className="bg-[#121215] text-white">صحيحة (True)</option>
                      <option value="false" className="bg-[#121215] text-white">خاطئة (False)</option>
                    </select>
                    <ChevronDown className="absolute left-4 top-3.5 text-neutral-400 pointer-events-none w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-1.5 text-right">
                  <label className="text-neutral-400 font-bold text-xs text-right block">التعليق/شرح سبب صحة أو خطأ العبارة للتعليم:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: بطل القصة هو لوفي وليس روجر."
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-medium text-right"
                  />
                </div>
              </div>
            )}

            {/* Regular Options section for multi choices */}
            {gameType !== 'trivia' && (
              <div className="space-y-3 pt-2">
                <label className="text-neutral-400 font-black text-xs block text-right">تعبئة البدائل الأربعة للعبة الأوتوكو:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="rtl">
                  {options.map((opt, idx) => (
                    <div key={idx} className="space-y-1 text-right">
                      <span className="text-[10px] text-neutral-500 font-bold">الخيار {idx + 1} {idx === correct ? ' (الصائب حالياً) ' : ''}:</span>
                      <input
                        type={gameType === 'math' ? 'number' : 'text'}
                        required
                        placeholder={`البديل ${idx + 1}`}
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 font-medium text-xs sm:text-sm text-right"
                      />
                    </div>
                  ))}
                </div>

                {/* Correct option dropdown selector */}
                <div className="space-y-1.5 pt-2 text-right">
                  <label className="text-neutral-400 font-bold text-xs text-right block">تحديد الخيار الصحيح الصائب من البدائل المضافة:</label>
                  <div className="relative">
                    <select
                      value={correct}
                      onChange={(e) => setCorrect(parseInt(e.target.value))}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 appearance-none cursor-pointer font-bold text-right"
                    >
                      {options.map((opt, idx) => (
                        <option key={idx} value={idx} className="bg-[#121215] text-white">
                          الخيار {idx + 1} {opt ? `: (${opt})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-4 top-3.5 text-neutral-400 pointer-events-none w-4 h-4" />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white font-black py-4 rounded-2xl tracking-wide font-sans shadow-lg hover:shadow-indigo-500/25 transform hover:-translate-y-0.5 transition cursor-pointer flex justify-center items-center gap-2 text-sm sm:text-base disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>جاري إرسال مساهمتك الملحمية إلى قاعدة البيانات الذكية... ⏳</span>
                ) : (
                  <>
                    <span>إرسال وتبرع لبنك الأسئلة ⚔️</span>
                    <span className="text-yellow-405">(+15 كوينز 🪙)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )
      ) : (
        /* Browse Tab Content */
        <div className="space-y-6">
          
          {/* Controls & Search panel */}
          <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-black/40 p-4 border border-white/5 rounded-2xl">
            {/* Search Input */}
            <div className="relative w-full md:w-80" dir="rtl">
              <input
                type="text"
                placeholder="ابحث بالنص، الأنمي، أو الكاتب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <Search className="absolute right-3.5 top-3 text-neutral-500 w-4 h-4" />
            </div>

            {/* Category selection */}
            <div className="flex flex-wrap gap-1.5 justify-center md:justify-end" dir="rtl">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-neutral-200 text-black border-white'
                    : 'bg-black text-neutral-400 border-white/5 hover:text-white'
                }`}
              >
                الجميع
              </button>
              {gameTypesList.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedCategory(t.id)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    selectedCategory === t.id
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-black text-neutral-400 border-white/5 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {getGameTypeName(t.id)}
                </button>
              ))}

              <button
                type="button"
                onClick={loadPoolQuestions}
                disabled={poolLoading}
                className="p-2 bg-[#121215] border border-white/10 rounded-xl text-neutral-300 hover:text-white hover:border-white/20 transition disabled:opacity-50 flex items-center justify-center cursor-pointer"
                title="تحديث القائمة"
              >
                <RefreshCw size={13} className={poolLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Loading state */}
          {poolLoading && poolQuestions.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-10 h-10 border-t-2 border-indigo-500 border-r-2 border-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-neutral-400">جاري الإرسال الاتصال بالخادم وجلب الأسئلة العشوائية والمساهمات الكبرى للأوتاكو...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-16 bg-black/20 rounded-2xl border border-dashed border-white/5 space-y-2">
              <HelpCircle className="mx-auto text-neutral-600" size={32} />
              <p className="text-sm text-neutral-400 font-bold">لا توجد أسئلة أو مساهمات مطابقة لهذا الاختيار.</p>
              <p className="text-xs text-neutral-500">كن أول من يضيف سؤالاً ذكياً ويكسب الجوائز والمكافآت الكبرى!</p>
            </div>
          ) : (
            /* Questions Grid list */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
              {filteredQuestions.map((q) => {
                const hasVoted = !!votedIds[q.id];
                const myVote = votedIds[q.id];
                return (
                  <div 
                    key={q.id} 
                    className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-all shadow-lg hover:shadow-black/40 group relative overflow-hidden"
                  >
                    {/* Top strip */}
                    <div className="flex justify-between items-center gap-2 mb-3">
                      {/* Game class indicator */}
                      <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg border tracking-wide uppercase ${getGameTypeColor(q.type)}`}>
                        {getGameTypeName(q.type)}
                      </span>
                      
                      {/* Source/Author */}
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 bg-white/5 px-2.5 py-1 rounded-lg">
                        <User size={11} className="text-neutral-500" />
                        <span>بواسطة:</span>
                        <span className="font-bold text-neutral-200 max-w-[120px] truncate" title={q.author}>
                          {q.author}
                        </span>
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="space-y-2 flex-grow">
                      <p className="text-white text-xs sm:text-sm font-black leading-relaxed">
                        {q.type === 'quotes' ? `"${q.text}"` : (q.emojis ? q.emojis : q.text)}
                      </p>
                      {q.anime && (
                        <p className="text-[11px] text-neutral-400">
                          الأنمي المقترن: <span className="text-yellow-500/80 font-bold">{q.anime}</span>
                        </p>
                      )}
                    </div>

                    {/* Interactive Reveal Area */}
                    <div className="mt-4">
                      {/* Reveal solve logic */}
                      <div className="mt-2 text-xs space-y-2 border-t border-white/5 pt-3">
                        <div className="flex justify-between items-center bg-black/35 p-1.5 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setRevealedAnswers(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-neutral-300 font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                          >
                            {revealedAnswers[q.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                            <span>{revealedAnswers[q.id] ? 'إخفاء الإجابة' : 'عرض الإجابة الصحيحة'}</span>
                          </button>
                          
                          {/* Social Vote triggers backed by firebase rule */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleVote(q.id, true)}
                              disabled={hasVoted}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                myVote === 'like' 
                                  ? 'bg-green-600/30 text-green-300 border border-green-505/45' 
                                  : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800'
                              }`}
                              title="مفيد وجيد"
                            >
                              <ThumbsUp size={10} />
                              <span>{q.likes}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVote(q.id, false)}
                              disabled={hasVoted}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                myVote === 'dislike' 
                                  ? 'bg-red-600/30 text-red-300 border border-red-505/45' 
                                  : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800'
                              }`}
                              title="سيئ أو خاطئ"
                            >
                              <ThumbsDown size={10} />
                              <span>{q.dislikes}</span>
                            </button>
                          </div>
                        </div>
                        
                        {revealedAnswers[q.id] && (
                          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 space-y-2 text-right animate-fade-in">
                            {q.type === 'trivia' ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-green-400 font-black">
                                  <CheckCircle2 size={13} />
                                  <span>الحل: {q.isTrue ? "صح" : "خطأ"}</span>
                                </div>
                                {q.explanation && (
                                  <p className="text-neutral-400 text-[11px] leading-relaxed">
                                    <span className="text-neutral-500">التوضيح:</span> {q.explanation}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="text-green-400 font-bold flex items-center gap-1 text-[11px]">
                                  <CheckCircle2 size={12} className="text-green-500 animate-pulse" />
                                  <span>قائمة البدائل الأربعة:</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                  {q.options?.map((opt: any, oIdx: number) => {
                                    const isCorrect = oIdx === q.correct;
                                    return (
                                      <div 
                                        key={oIdx} 
                                        className={`p-1.5 rounded-lg border text-center transition-all ${
                                          isCorrect 
                                            ? 'bg-green-600/20 border-green-550/40 text-green-300 font-black shadow-md' 
                                            : 'bg-neutral-900 border-white/5 text-neutral-400'
                                        }`}
                                      >
                                        <span>{opt}</span> {isCorrect && ' ✨'}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
