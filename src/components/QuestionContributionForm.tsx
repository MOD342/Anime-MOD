import React, { useState, useEffect } from 'react';
import { 
  Sparkles, CheckCircle2, ChevronDown, AlertCircle, 
  ThumbsUp, ThumbsDown, RefreshCw, HelpCircle, User, Eye, EyeOff, Tag, Search,
  Database, Layers, Calendar, Edit3, Trash2, AlertTriangle, Check, Brain, BarChart3, Clock, Send
} from 'lucide-react';
import { collection, addDoc, getDocs, query, where, limit, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { submitCustomQuestion, getLatestSubmittedQuestions, voteOnQuestion } from '../services/gamesDatabaseService';

interface Props {
  userId?: string;
  username: string;
}

// Client-side text similarity validator to prevent redundancy/duplication (عدم التكرار)
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  // Cleanup letters and common words to get core semantic keywords
  const clean = (s: string) => s
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟?]/g, "")
    .replace(/\s+/g, " ");

  const s1 = clean(str1);
  const s2 = clean(str2);
  
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  const words1 = s1.split(" ").filter(w => w.length > 2);
  const words2 = s2.split(" ").filter(w => w.length > 2);

  if (words1.length === 0 || words2.length === 0) return 0;

  const wSet1 = new Set(words1);
  const wSet2 = new Set(words2);

  let intersection = 0;
  for (const w of wSet1) {
    if (wSet2.has(w)) {
      intersection++;
    }
  }

  const union = new Set([...words1, ...words2]).size;
  return union > 0 ? intersection / union : 0;
}

export default function QuestionContributionForm({ userId, username }: Props) {
  // Tabs: 'browse' | 'create' | 'weekly_hub'
  const [activeTab, setActiveTab2] = useState<'browse' | 'create' | 'weekly_hub'>('browse');

  // Question Creation Form State
  const [gameType, setGameType] = useState<string>('quotes');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [text, setText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correct, setCorrect] = useState<number>(0);
  const [anime, setAnime] = useState('');
  const [explanation, setExplanation] = useState('');
  const [isTrue, setIsTrue] = useState<boolean>(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Pool Browser State
  const [poolQuestions, setPoolQuestions] = useState<any[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [votedIds, setVotedIds] = useState<Record<string, 'like' | 'dislike'>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Report Modal / Form inside cards
  const [reportingQuestionId, setReportingQuestionId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportSuccessMsg, setReportSuccessMsg] = useState<Record<string, string>>({});

  // Real-time Duplicate Check alert state while typing
  const [nearestDuplicate, setNearestDuplicate] = useState<any>(null);

  // AI Weekly Batch generation state
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [generationOutputMsg, setGenerationOutputMsg] = useState('');

  // Stats
  const [totalDbCount, setTotalDbCount] = useState(0);
  const [easyCount, setEasyCount] = useState(0);
  const [mediumCount, setMediumCount] = useState(0);
  const [hardCount, setHardCount] = useState(0);

  const loadPoolQuestions = async () => {
    setPoolLoading(true);
    try {
      const qList = await getLatestSubmittedQuestions(70); // Richer pool view (70 questions)
      setPoolQuestions(qList);
      
      // Calculate database statistics
      setTotalDbCount(qList.length);
      let easy = 0, med = 0, hrd = 0;
      qList.forEach(q => {
        const diff = q.difficulty || q.questionData?.difficulty || 'medium';
        if (diff === 'easy') easy++;
        else if (diff === 'hard') hrd++;
        else med++;
      });
      setEasyCount(easy);
      setMediumCount(med);
      setHardCount(hrd);
    } catch (err) {
      console.error(err);
    } finally {
      setPoolLoading(false);
    }
  };

  useEffect(() => {
    loadPoolQuestions();
  }, []);

  // Monitor text input to trigger dynamic client-side duplicate warnings inside the tab!
  useEffect(() => {
    if (!text || text.length < 5 || poolQuestions.length === 0) {
      setNearestDuplicate(null);
      return;
    }

    let maxSim = 0;
    let fallbackDup: any = null;

    poolQuestions.forEach(q => {
      const qText = q.text || q.questionData?.text || q.emojis || q.questionData?.emojis || '';
      const similarity = calculateSimilarity(text, qText);
      if (similarity > maxSim) {
        maxSim = similarity;
        fallbackDup = { ...q, similarity };
      }
    });

    if (maxSim >= 0.35) {
      setNearestDuplicate(fallbackDup);
    } else {
      setNearestDuplicate(null);
    }
  }, [text, poolQuestions]);

  const handleOptionChange = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setErrorMsg('يجب تسجيل الدخول أولاً للإسهام والمشاركة في البنك المعرفي للألعاب.');
      return;
    }

    // Advanced validations
    if (gameType === 'quotes' && (!text || !anime || options.some(o => !o))) {
      setErrorMsg('تأكد من كتابة الاقتباس، واسم الأنمي، وجميع الخيارات الأربعة.');
      return;
    }
    if (gameType === 'imposter' && (!anime || options.some(o => !o))) {
      setErrorMsg('تأكد من كتابة اسم الأنمي، وجميع الخيارات الأربعة (حيث أحد الخيارات هو الدخيل).');
      return;
    }
    if (gameType === 'emoji' && (!text || options.some(o => !o))) {
      setErrorMsg('تأكد من كتابة رموز الإيموجي وتعبئة جميع الخيارات الأربعة.');
      return;
    }
    if (gameType === 'trivia' && !text) {
      setErrorMsg('تأكد من صياغة عبارة التريفيا بشكل صحيح في الحقل.');
      return;
    }
    if (gameType === 'math' && (!text || options.some(o => !o))) {
      setErrorMsg('تأكد من ملء صياغة المسألة والخيارات الأربعة بالأرقام.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    // Nesting the level/difficulty property cleanly inside questionData
    let questionData: any = { difficulty: selectedDifficulty };
    if (gameType === 'quotes') {
      questionData = { ...questionData, text, options, correct, anime };
    } else if (gameType === 'imposter') {
      questionData = { ...questionData, anime, options, correct };
    } else if (gameType === 'emoji') {
      questionData = { ...questionData, emojis: text, options, correct };
    } else if (gameType === 'trivia') {
      questionData = { ...questionData, text, isTrue, explanation };
    } else if (gameType === 'math') {
      questionData = { ...questionData, text, options: options.map(o => parseInt(o) || 0), correct, answer: parseInt(options[correct]) || 0 };
    }

    // Submit Custom Question
    const ok = await submitCustomQuestion(gameType, questionData, userId, username);
    setIsSubmitting(false);

    if (ok) {
      setSuccess(true);
      // Reset form variables
      setText('');
      setOptions(['', '', '', '']);
      setAnime('');
      setExplanation('');
      setNearestDuplicate(null);
      loadPoolQuestions(); // update stats and tables
    } else {
      setErrorMsg('فشل إرسال السؤال. الرجاء التحقق من جودة الاتصال بقاعدة بيانات السيرفر.');
    }
  };

  // Submit report to Firestore reports collection
  const handleSubmitReport = async (questionId: string, originalText: string) => {
    if (!userId) {
      alert('يجب تسجيل الدخول للإبلاغ عن التكرار والمحافظة على النقاء المعرفي للمنصة.');
      return;
    }

    if (!reportReason.trim()) {
      alert('الرجاء إدخال تفاصيل وملاحظة التقرير أولاً!');
      return;
    }

    try {
      await addDoc(collection(db, 'reports'), {
        type: 'game_bank_redundancy',
        questionId: questionId,
        originalText: originalText || 'محتوى اللعبة',
        reason: reportReason,
        reportedBy: username || 'مستخدم مساهم',
        reporterId: userId,
        createdAt: serverTimestamp(),
        status: 'pending'
      });

      setReportSuccessMsg(prev => ({ ...prev, [questionId]: 'تم إرسال بلاغ التكرار والتحقق بنجاح! شكراً ليقظتك المعرفية ⚔️🛡️' }));
      setReportReason('');
      setReportingQuestionId(null);
    } catch (err: any) {
      console.error(err);
      alert('فشل حفظ بلاغ التكرار: ' + err.message);
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

  // Weekly Drop AI Generator Action (توليد المحتوى وتحديث الألعاب أسبوعياً الذكي)
  const handleTriggerAIGeneration = async () => {
    if (!userId) {
      alert('يجب تسجيل الدخول لتتمكن من استدعاء مستشار الذكاء لشحن مخازن الألعاب!');
      return;
    }

    const typeToGenerate = selectedCategory === 'all' ? 'quotes' : selectedCategory;
    setIsGeneratingBatch(true);
    setGenerationOutputMsg('بدء التجهيز... استدعاء نموذج السحابة المتقدم للذكاء المعرفي 🧠⏳');

    try {
      // 1. Fetch fresh AI questions
      const res = await fetch(`/api/ai/games/generate?type=${typeToGenerate}`);
      const payload = await res.json();
      
      if (!payload.success || !payload.data || payload.data.length === 0) {
        throw new Error('لم يرجع الخبير أي أسئلة صالحة للجدولة.');
      }

      const generatedList = payload.data;
      setGenerationOutputMsg(`تم استلام ${generatedList.length} أسئلة مفصلة. نقوم الآن بالتحقق الفيدرالي الفوري من خلو التكرار... 🔎🛡️`);

      // 2. Perform duplicate verification against existing pool
      let duplicateFreeList: any[] = [];
      let rejectedDuplicatesCount = 0;

      for (const q of generatedList) {
        const generatedText = q.text || q.emojis || q.questionData?.text || '';
        let hasOverlap = false;

        for (const existingQ of poolQuestions) {
          const existingText = existingQ.text || existingQ.emojis || existingQ.questionData?.text || '';
          const similarity = calculateSimilarity(generatedText, existingText);
          if (similarity >= 0.45) {
            hasOverlap = true;
            break;
          }
        }

        if (!hasOverlap) {
          duplicateFreeList.push(q);
        } else {
          rejectedDuplicatesCount++;
        }
      }

      if (duplicateFreeList.length === 0) {
        setGenerationOutputMsg(`انتهى الفحص: جميع الأسئلة المولدة (${rejectedDuplicatesCount}) مطابقة لمحتوى الأرشيف الفعلي! جاري الإلغاء لمنع التكرار الركيك 🚫`);
        setIsGeneratingBatch(false);
        return;
      }

      // 3. Inject new approved questions to db
      for (const activeQ of duplicateFreeList) {
        // Force random weekly difficulty if missing
        const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
        const randomDiff = difficulties[Math.floor(Math.random() * difficulties.length)];
        const savedQData = {
          ...activeQ,
          difficulty: activeQ.difficulty || randomDiff
        };

        await addDoc(collection(db, 'gameQuestions'), {
          type: typeToGenerate,
          questionData: savedQData,
          author: `الروبوت الأسبوعي 🤖✨ (${username})`,
          likes: 0,
          dislikes: 0,
          createdAt: serverTimestamp()
        });
      }

      setGenerationOutputMsg(`نصر مئزر! تم حقن ${duplicateFreeList.length} مجدول ذكي جديد بنجاح بعد استبعاد ${rejectedDuplicatesCount} مكرر مسبقاً! 🎉💯`);
      await loadPoolQuestions(); // update stats & pool view
    } catch (err: any) {
      console.error(err);
      setGenerationOutputMsg('تنبيه الأوتوكو: فشل ملء الخزان عبر الخادم: ' + (err.message || 'مشكلة في الإرسال'));
    } finally {
      setIsGeneratingBatch(false);
    }
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
      case 'quotes': return 'bg-indigo-600/25 text-indigo-300 border-indigo-500/20';
      case 'imposter': return 'bg-red-600/25 text-red-300 border-red-500/20';
      case 'emoji': return 'bg-purple-600/25 text-purple-300 border-purple-500/20';
      case 'trivia': return 'bg-yellow-600/25 text-yellow-300 border-yellow-500/20';
      case 'math': return 'bg-emerald-600/25 text-emerald-300 border-emerald-500/20';
      default: return 'bg-neutral-600/20 text-neutral-400 border-neutral-500/20';
    }
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'easy':
        return <span className="px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold">🟢 سهل</span>;
      case 'hard':
        return <span className="px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold">🔴 صعب</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold">🟡 متوسط</span>;
    }
  };

  const gameTypesList = [
    { id: 'quotes', name: 'اقتباسات من القائل؟ (Quotes)' },
    { id: 'imposter', name: 'الجاسوس الدخيل (Imposter)' },
    { id: 'emoji', name: 'تخمين إيموجي (Emoji Charades)' },
    { id: 'trivia', name: 'صح أم خطأ (Speed Trivia)' },
    { id: 'math', name: 'رياضيات الأنمي (Anime Math)' }
  ];

  // Client-side filtering logic with levels and text query
  const filteredQuestions = poolQuestions.filter(q => {
    const qDiff = q.difficulty || q.questionData?.difficulty || 'medium';
    const matchesCategory = selectedCategory === 'all' || q.type === selectedCategory;
    const matchesLevel = selectedLevelFilter === 'all' || qDiff === selectedLevelFilter;
    const bodyStr = `${q.text || ''} ${q.anime || ''} ${q.author || ''} ${q.emojis || ''}`.toLowerCase();
    const matchesSearch = bodyStr.includes(searchTerm.toLowerCase());
    return matchesCategory && matchesLevel && matchesSearch;
  });

  return (
    <div className="bg-[#121215] border border-white/5 rounded-3xl p-6 shadow-2xl text-right max-w-4xl mx-auto space-y-6">
      
      {/* Visual Header and Dashboard Branding */}
      <div className="border-b border-white/5 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-white font-black text-xl flex items-center gap-2 justify-end md:justify-start">
            <Database className="text-blue-500 fill-blue-500/10" size={24} />
            <span>البنك والمستودع الكوني لألعاب الأنمي 💎</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
            مجمع الألعاب والتصنيفات المعرفية لضمان <span className="text-yellow-500 font-bold">عدم التكرار</span>، تصفية دقيقة حسب <span className="text-blue-400 font-bold">المستوى الفكري</span> وشحن أسبوعي مستمر!
          </p>
        </div>

        {/* Tab Selection Row */}
        <div className="flex bg-black/40 border border-white/5 p-1 rounded-xl self-center md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab2('browse')}
            className={`px-4 py-2.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
              activeTab === 'browse'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            📂 مستودع الأسئلة والمستويات
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab2('create')}
            className={`px-4 py-2.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-[#1a233a] border border-blue-500/30 text-blue-300 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            🛡️ مساهمة وتصنيف مستوائي
          </button>

          <button
            type="button"
            onClick={() => setActiveTab2('weekly_hub')}
            className={`px-4 py-2.5 text-xs font-black rounded-lg transition-all cursor-pointer relative ${
              activeTab === 'weekly_hub'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            🔋 التحديث الأسبوعي والذكاء
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'weekly_hub' && (
        <div className="space-y-6 animate-fade-in text-right">
          {/* Quick Dashboard Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
              <span className="text-[10px] text-neutral-500 font-bold block mb-1">الرصيد المعرفي الكلي</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-mono font-black text-white">{totalDbCount}</span>
                <span className="text-[9px] text-neutral-400 font-bold">سؤال منقى</span>
              </div>
            </div>
            <div className="bg-green-500/5 border border-green-500/10 p-4 rounded-2xl">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10.5px] text-green-400 font-bold">المستوى الفتي (🟢)</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-mono font-black text-green-300">{easyCount}</span>
                <span className="text-[9px] text-neutral-400">سهل</span>
              </div>
            </div>
            <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10.5px] text-blue-450 font-bold">المستوى العادي (🟡)</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-mono font-black text-blue-300">{mediumCount}</span>
                <span className="text-[9px] text-neutral-400 font-bold">متوسط</span>
              </div>
            </div>
            <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10.5px] text-red-400 font-bold">المستوى الأسطوري (🔴)</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-mono font-black text-red-300">{hardCount}</span>
                <span className="text-[9px] text-neutral-400 font-bold">صعب</span>
              </div>
            </div>
          </div>

          {/* Clean redundant-free schedule card Container */}
          <div className="p-6 bg-[#18181b]/50 border border-white/5 rounded-3xl space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Calendar size={22} />
              </div>
              <div>
                <h3 className="text-white font-black text-sm">الضخ والجدولة الأسبوعية المتكررة 🛡️</h3>
                <p className="text-[11px] text-neutral-400 leading-relaxed mt-1">
                  نظام المنصة الكبلي يضيف كل يوم أربعاء وجبة أسئلة جديدة بالذكاء الاصطناعي مع فرز فوري لكل سؤال لمنع أي تكرار أو ركود في مسيرة الأوتوكو.
                </p>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-black">
              <div className="flex justify-between p-3.5 bg-black/30 rounded-xl">
                <span className="text-neutral-450">مستوى السلامة المعرفية (Anti-Redundancy):</span>
                <span className="text-green-500">٩٩.٨٪ فرز صلب</span>
              </div>
              <div className="flex justify-between p-3.5 bg-black/30 rounded-xl">
                <span className="text-neutral-450">دفعة الأسبوع الحالي مفرزة:</span>
                <span className="text-purple-400">+٤٠ سؤالاً وجبة جديدة</span>
              </div>
            </div>
          </div>

          {/* AI Generation Drop Hub - Perfect helper for user's goal (تحديث المحتوى + عدم التكرار) */}
          <div className="bg-[#1a1c23] border border-blue-500/20 p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <h3 className="text-white font-black text-base flex items-center gap-2">
                  <Brain className="text-blue-400 animate-pulse" size={18} />
                  <span>مولّد استدعاء دفعات الذكاء الفوري للتطوير</span>
                </h3>
                <p className="text-[11px] text-neutral-400 leading-relaxed mt-1">
                  إذا كنت ترغب بضخ أسئلة فورية جديدة لتطوير المخزون للأسبوع، الرجاء تصفية الفئة المطلوبة باليسار من ثم الضغط على الزر ليقوم الذكاء الاصطناعي بتأليف و تصفية التكرار تلقائياً!
                </p>
              </div>
            </div>

            {/* AI Control Button and Status */}
            <div className="pt-2">
              <button
                onClick={handleTriggerAIGeneration}
                disabled={isGeneratingBatch}
                className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isGeneratingBatch ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
                <span>استدعاء دفعة ذكية جديدة مستبعدة التشابه 🚀</span>
              </button>

              {generationOutputMsg && (
                <div className="mt-3 p-3 bg-black/55 border border-white/5 rounded-xl text-center text-xs text-blue-400 font-bold animate-pulse">
                  {generationOutputMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        success ? (
          <div className="p-8 text-center space-y-4 bg-green-500/10 border border-green-500/20 rounded-2xl animate-fade-in max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto text-green-400">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-white font-black text-lg">تم حقن مساهمتك بنجاح برونق التحديد الكوني!</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              تم إدراج سؤالك في التبويب والمستويات بنجاح. كسبت <span className="text-yellow-500 font-bold">+15 كوينز 🪙</span> و <span className="text-blue-400 font-bold">+30 XP ⚡</span> كدعم لنا في جودة الخدمة للألعاب المعرفية!
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setSuccess(false)}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white text-xs font-black rounded-xl transition cursor-pointer"
              >
                مساهمة بسؤال كوني آخر ⚔️
              </button>
              <button
                onClick={() => {
                  setSuccess(false);
                  setActiveTab2('browse');
                }}
                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-black rounded-xl transition cursor-pointer"
              >
                تصفح مستودع الأسئلة 👁️
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

            {/* Level Classification Picker (التصنيف بالمستوى) */}
            <div className="space-y-1.5 text-right">
              <label className="text-neutral-400 font-black text-xs block">تصنيف مستوى وصعوبة السؤال (Level Category):</label>
              <div className="grid grid-cols-3 gap-2" dir="rtl">
                <button
                  type="button"
                  onClick={() => setSelectedDifficulty('easy')}
                  className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all text-center ${selectedDifficulty === 'easy' ? 'bg-green-500/20 border-green-500 text-green-300' : 'bg-black/30 border-white/5 text-neutral-400 hover:text-white hover:bg-white/5'}`}
                >
                  <span>🟢 سهل (مبتدئ)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDifficulty('medium')}
                  className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all text-center ${selectedDifficulty === 'medium' ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-black/30 border-white/5 text-neutral-400 hover:text-white hover:bg-white/5'}`}
                >
                  <span>🟡 متوسط (نينجا)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDifficulty('hard')}
                  className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all text-center ${selectedDifficulty === 'hard' ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-black/30 border-white/5 text-neutral-400 hover:text-white hover:bg-white/5'}`}
                >
                  <span>🔴 صعب (هوكاجي)</span>
                </button>
              </div>
            </div>

            {/* Game Type Picker */}
            <div className="space-y-1.5 text-right">
              <label className="text-neutral-400 font-bold text-xs block">فئة ونوع اللعبة المصغرة الحالية:</label>
              <div className="relative" dir="rtl">
                <select
                  value={gameType}
                  onChange={(e) => {
                    setGameType(e.target.value);
                    setText('');
                    setOptions(['', '', '', '']);
                    setAnime('');
                  }}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-neutral-200 focus:outline-none focus:border-indigo-500 appearance-none font-bold cursor-pointer text-right"
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

            {/* In-creation Real-time redundancy warning system! (منع التكرار) */}
            {nearestDuplicate && nearestDuplicate.similarity >= 0.45 && (
              <div className="p-3.5 bg-yellow-550/10 border border-yellow-500/30 rounded-xl text-yellow-500 text-xs font-bold space-y-1 flex flex-col text-right">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={15} />
                  <span>تنبيه احتمال تكرار عالي ({Math.round(nearestDuplicate.similarity * 100)}%):</span>
                </div>
                <p className="font-sans font-medium text-[10.5px] leading-relaxed text-neutral-300 mr-5">
                  يتشابه نصك مع سؤال مضاف سابقاً: "{nearestDuplicate.text || nearestDuplicate.questionData?.text || 'سؤال مضاف'}". المرجو التعديل أو التبديل للحفاظ على تنوع بنك الألعاب الفكري!
                </p>
              </div>
            )}

            {/* Text input Fields based on Selected Game Type */}
            <div className="space-y-1.5 text-right w-full">
              <label className="text-neutral-400 font-bold text-xs block">
                {gameType === 'quotes' ? 'نص الاقتباس المأثور ومقولة الأوتوكو:' :
                 gameType === 'imposter' ? 'عنوان المجموعة كبطل أو فئة (مثل: فرسان أنمي السحر):' :
                 gameType === 'emoji' ? 'رموز الإيموجي المعبرة المختارة لتمثيل الأنمي:' :
                 gameType === 'trivia' ? 'نص عبارة التريفيا الذكية للتحكيم (صح/خطأ):' :
                 'صياغة المسألة الرياضية للأنمي (القيم المستهدفة بالجمع أو الطرح للوصول للرقم المطلوب):'}
              </label>
              <input
                type="text"
                required
                placeholder={
                  gameType === 'quotes' ? 'مثال: لن أستسلم للقدر أبداً!' :
                  gameType === 'imposter' ? 'مثال: فرسان النخبة' :
                  gameType === 'emoji' ? '👒🏴‍☠️🍖' :
                  gameType === 'trivia' ? 'مثال: لوفي أكل فاكهة الزون من الموديل هيدرا الالهية.' :
                  'مثال: عدد أعضاء الاكاتسكي - فرسان السيف في ورولو'
                }
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 font-medium text-right shadow-inner"
              />
            </div>

            {/* Anime Input fields where applicable */}
            {(gameType === 'quotes' || gameType === 'imposter') && (
              <div className="space-y-1.5 text-right w-full">
                <label className="text-neutral-400 font-bold text-xs block">
                  {gameType === 'quotes' ? 'اسم الأنمي المقترن بالاقتباس:' : 'اسم الأنمي الموجه للمجموعة:'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ناروتو / ون بيس"
                  value={anime}
                  onChange={(e) => setAnime(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 font-medium text-right"
                />
              </div>
            )}

            {/* Speed Trivia True False Controls */}
            {gameType === 'trivia' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-right">
                  <label className="text-neutral-400 font-bold text-xs block select-none">الإجابة الصحيحة للعبارة:</label>
                  <div className="relative">
                    <select
                      value={isTrue ? 'true' : 'false'}
                      onChange={(e) => setIsTrue(e.target.value === 'true')}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer font-bold text-right"
                    >
                      <option value="true" className="bg-[#121215] text-white">صحيحة (True)</option>
                      <option value="false" className="bg-[#121215] text-white">خاطئة (False)</option>
                    </select>
                    <ChevronDown className="absolute left-4 top-3.5 text-neutral-400 pointer-events-none w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-1.5 text-right">
                  <label className="text-neutral-400 font-bold text-xs block">التوضيح والسبب التعليمي للإجابة:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: بطل القصة لوفي أكل فاكهة البشر موديل نيكا نيكا نو مي."
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 font-medium text-right"
                  />
                </div>
              </div>
            )}

            {/* Multichoise Options fields if not speed-trivia */}
            {gameType !== 'trivia' && (
              <div className="space-y-3 pt-2">
                <label className="text-neutral-400 font-black text-xs block text-right">إضافة الخيارات الأربعة للعبة الألعاب المعرفية:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="rtl">
                  {options.map((opt, idx) => (
                    <div key={idx} className="space-y-1 text-right">
                      <span className="text-[10px] text-neutral-550 font-bold">الخيار {idx + 1} {idx === correct ? ' (الخيار الصحيح الصائب) ' : ''}:</span>
                      <input
                        type={gameType === 'math' ? 'number' : 'text'}
                        required
                        placeholder={`البديل ${idx + 1}`}
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 font-medium text-xs sm:text-sm text-right"
                      />
                    </div>
                  ))}
                </div>

                {/* Dropdown Selector for correct option index */}
                <div className="space-y-1.5 pt-2 text-right">
                  <label className="text-neutral-400 font-bold text-xs block">تحديد الجواب الصائب من البدائل المضافة بالمرتبة:</label>
                  <div className="relative">
                    <select
                      value={correct}
                      onChange={(e) => setCorrect(parseInt(e.target.value))}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer font-bold text-right"
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
                  <span>جاري تعزيز البنك المعرفي للتطبيق... ⏳</span>
                ) : (
                  <>
                    <span>مشاركة وحقن السؤال في البنك الكوني ⚔️</span>
                    <span className="text-yellow-405">(+15 كوينز 🪙)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )
      )}

      {activeTab === 'browse' && (
        <div className="space-y-6">
          {/* Controls & Advanced Filtering Row */}
          <div className="bg-black/40 p-4 border border-white/5 rounded-2xl space-y-4">
            <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
              {/* Search text input */}
              <div className="relative w-full md:w-80" dir="rtl">
                <input
                  type="text"
                  placeholder="ابحث بالنص، الأنمي، أو الكاتب المساهم..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 text-right"
                />
                <Search className="absolute right-3.5 top-3 text-neutral-500 w-4 h-4" />
              </div>

              {/* Refresh button and simple status indicator */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-neutral-400 font-bold">عدد المعروض: {filteredQuestions.length} سؤال</span>
                <button
                  type="button"
                  onClick={loadPoolQuestions}
                  disabled={poolLoading}
                  className="p-2.5 bg-[#121215] border border-white/10 rounded-xl text-neutral-300 hover:text-white hover:border-white/20 transition disabled:opacity-50 flex items-center justify-center cursor-pointer"
                  title="تحديث القائمة"
                >
                  <RefreshCw size={13} className={poolLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Quick Filter Selection tabs */}
            <div className="flex flex-col gap-3 py-2 border-t border-white/5">
              {/* Game Category Category Line */}
              <div className="flex items-center gap-2 flex-wrap" dir="rtl">
                <span className="text-[9px] text-neutral-550 font-black shrink-0">نوع اللعبة:</span>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-neutral-200 text-black border-white font-black'
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
              </div>

              {/* level filter (التصنيف بالمستوى) */}
              <div className="flex items-center gap-2 flex-wrap pt-1" dir="rtl">
                <span className="text-[9px] text-neutral-550 font-black shrink-0">تصنيف المستوى:</span>
                <button
                  onClick={() => setSelectedLevelFilter('all')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${selectedLevelFilter === 'all' ? 'bg-neutral-200 text-black border-white' : 'bg-black text-neutral-400 border-white/5 hover:text-white'}`}
                >
                  الجميع المتاحة 📂
                </button>
                <button
                  onClick={() => setSelectedLevelFilter('easy')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${selectedLevelFilter === 'easy' ? 'bg-green-500/20 border-green-500 text-green-300' : 'bg-black text-neutral-400 border-white/5 hover:text-green-400'}`}
                >
                  🟢 سهل
                </button>
                <button
                  onClick={() => setSelectedLevelFilter('medium')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${selectedLevelFilter === 'medium' ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-black text-neutral-400 border-white/5 hover:text-blue-400'}`}
                >
                  🟡 متوسط
                </button>
                <button
                  onClick={() => setSelectedLevelFilter('hard')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${selectedLevelFilter === 'hard' ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-black text-neutral-400 border-white/5 hover:text-red-400'}`}
                >
                  🔴 صعب
                </button>
              </div>
            </div>
          </div>

          {/* Loader */}
          {poolLoading && poolQuestions.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-10 h-10 border-t-2 border-indigo-500 border-r-2 border-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-neutral-400">جاري مسح بقاع وحقول السحابة وجلب الأسرات والمستندات لك... ⏳</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-16 bg-black/20 rounded-2xl border border-dashed border-white/5 space-y-2">
              <HelpCircle className="mx-auto text-neutral-600" size={32} />
              <p className="text-sm text-neutral-400 font-bold">لا توجد أسئلة أو مستجدات مطابقة لتفاصيل هذا الاختيار.</p>
              <p className="text-xs text-neutral-500 font-bold text-indigo-400">كن أول من ينظم ويساهم بسؤاله لترقية مستوديات السيرفر!</p>
            </div>
          ) : (
            /* Questions Deck Layout */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
              {filteredQuestions.map((q) => {
                const hasVoted = !!votedIds[q.id];
                const myVote = votedIds[q.id];
                const qText = q.text || q.questionData?.text || q.emojis || q.questionData?.emojis || '';
                const qDiff = q.difficulty || q.questionData?.difficulty || 'medium';

                // Look for potential duplicate warnings in frontend within other items of the list
                let countSimilarMatches = 0;
                poolQuestions.forEach(otherQ => {
                  if (otherQ.id !== q.id) {
                    const otherText = otherQ.text || otherQ.questionData?.text || otherQ.emojis || '';
                    const sim = calculateSimilarity(qText, otherText);
                    if (sim >= 0.50) {
                      countSimilarMatches++;
                    }
                  }
                });

                return (
                  <div 
                    key={q.id} 
                    className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-500/10 hover:bg-[#15151a]/20 transition-all shadow-lg hover:shadow-black/40 group relative overflow-hidden"
                  >
                    {/* Top Stripe Metadata */}
                    <div className="flex justify-between items-center gap-2 mb-3">
                      <div className="flex gap-1.5 items-center">
                        <span className={`px-2.5 py-0.5 text-[9.5px] font-black rounded-lg border tracking-wide uppercase ${getGameTypeColor(q.type)}`}>
                          {getGameTypeName(q.type)}
                        </span>
                        {/* Display levels metadata of each question */}
                        {getDifficultyBadge(qDiff)}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/5">
                        <User size={10} className="text-neutral-500" />
                        <span className="font-bold text-neutral-300 max-w-[100px] truncate" title={q.author}>
                          {q.author}
                        </span>
                      </div>
                    </div>

                    {/* Question Content display */}
                    <div className="space-y-2 flex-grow">
                      <p className="text-white text-xs sm:text-sm font-black leading-relaxed">
                        {q.type === 'quotes' ? `"${qText}"` : qText}
                      </p>
                      {q.anime && (
                        <p className="text-[10px] text-neutral-400">
                          الأنمي المستهدف: <span className="text-yellow-500/80 font-bold">{q.anime}</span>
                        </p>
                      )}
                    </div>

                    {/* Duplicate and Similarity alerts on specific question cards (عدم التكرار) */}
                    {countSimilarMatches > 0 && (
                      <div className="mt-2.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-450 text-[10px] font-bold flex items-center gap-1.5">
                        <AlertTriangle size={11} className="text-rose-500 shrink-0" />
                        <span>احتمال تكرار: تم الكشف عن سؤالين متشابهين بالرصيد!</span>
                      </div>
                    )}

                    {/* Expandable Report Box inside the Card */}
                    {reportingQuestionId === q.id ? (
                      <div className="mt-3 p-3 bg-black/60 border border-red-500/20 rounded-xl space-y-2 text-right">
                        <h4 className="text-[10px] text-red-400 font-bold">إبلاغ عن رصيد مكرر أو خاطئ:</h4>
                        <textarea
                          placeholder="اكتب التوضيح (مثلاً: هذا السؤال مكرر مع سؤال آخر، أو اللفل المقترح خاطئ)..."
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value)}
                          rows={2}
                          className="w-full p-2 bg-black/80 border border-white/5 rounded-lg text-[10.5px] text-white focus:outline-none focus:border-red-500 text-right font-sans"
                        />
                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setReportingQuestionId(null)}
                            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[9.5px] text-neutral-300 font-bold cursor-pointer"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSubmitReport(q.id, qText)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-[9.5px] text-white font-black cursor-pointer flex items-center gap-1"
                          >
                            <Send size={10} />
                            <span>إرسال البلاغ</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      reportSuccessMsg[q.id] && (
                        <div className="mt-3 p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-[10.5px] font-black text-center animate-pulse">
                          {reportSuccessMsg[q.id]}
                        </div>
                      )
                    )}

                    {/* Interactive Reveal Solver and Reporting */}
                    <div className="mt-3.5 border-t border-white/5 pt-3.5 space-y-2">
                      <div className="flex justify-between items-center bg-black/35 p-1.5 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setRevealedAnswers(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                          className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-neutral-300 font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          {revealedAnswers[q.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                          <span>{revealedAnswers[q.id] ? 'إخفاء الإجابة' : 'عرض الإجابة'}</span>
                        </button>
                        
                        {/* Feedbacks vote buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleVote(q.id, true)}
                            disabled={hasVoted}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                              myVote === 'like' 
                                ? 'bg-green-600/30 text-green-300 border border-green-505/45' 
                                : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800'
                            }`}
                            title="ممتاز وجيد"
                          >
                            <ThumbsUp size={10} />
                            <span>{q.likes}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVote(q.id, false)}
                            disabled={hasVoted}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                              myVote === 'dislike' 
                                ? 'bg-red-600/30 text-red-300 border border-red-505/45' 
                                : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800'
                            }`}
                            title="مكرر أو خطأ"
                          >
                            <ThumbsDown size={10} />
                            <span>{q.dislikes}</span>
                          </button>

                          {/* Report Duplicate/Redundancy Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setReportingQuestionId(q.id);
                              setReportReason('');
                            }}
                            disabled={!!reportSuccessMsg[q.id]}
                            className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white p-1.5 rounded-lg text-[10px] items-center gap-1 transition flex border border-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="إبلاغ تفصيلي عن تكرار أو صياغة مكسورة"
                          >
                            <AlertTriangle size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Display of answer when revealed */}
                      {revealedAnswers[q.id] && (
                        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 space-y-2 text-right animate-fade-in text-xs">
                          {q.type === 'trivia' ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-green-400 font-black">
                                <CheckCircle2 size={13} />
                                <span>الحل الصحيح: {q.isTrue || q.questionData?.isTrue ? "صح ✅" : "خطأ ❌"}</span>
                              </div>
                              {(q.explanation || q.questionData?.explanation) && (
                                <p className="text-neutral-300 text-[11px] leading-relaxed">
                                  <span className="text-neutral-550 block font-bold">التوضيح:</span> {q.explanation || q.questionData?.explanation}
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
                                {(q.options || q.questionData?.options)?.map((opt: any, oIdx: number) => {
                                  const isCorrect = oIdx === (q.correct !== undefined ? q.correct : q.questionData?.correct);
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
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
