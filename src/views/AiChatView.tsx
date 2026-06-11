import React, { useState, useEffect, useRef } from 'react';
import { Bot, ChevronRight, Send, Sparkles, Smile, MessageCircle, AlertCircle, Award, Volume2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

const MOODS = [
  { value: 'سعيد ومبتهج 😆', label: '😆 سعيد', color: 'hover:border-yellow-500 hover:text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  { value: 'حزين ومكتئب 😢', label: '😢 حزين', color: 'hover:border-blue-500 hover:text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { value: 'متحمس جداً ومشتعل 🔥', label: '🔥 متحمس', color: 'hover:border-red-500 hover:text-red-400 bg-red-500/10 border-red-500/30' },
  { value: 'طفشان وأشعر بالملل 😑', label: '😑 ملان', color: 'hover:border-emerald-500 hover:text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { value: 'حائر وأدور تحفة فنية 🤔', label: '🤔 حائر', color: 'hover:border-purple-500 hover:text-purple-400 bg-purple-500/10 border-purple-500/30' }
];

const STATUSES = [
  { value: 'أتابع أنمي حالياً ومستمر 📺', label: '📺 أتابع أنمي' },
  { value: 'أقرأ مانجا غامضة وأبحث عن نقاش 📚', label: '📚 أقرأ مانجا' },
  { value: 'أنا أوتاكو قديم ومتطلب وصعب الإرضاء 🛡️', label: '🛡️ أوتاكو متطلب' },
  { value: 'أنا مبتدئ تماماً في عالم الأنمي 🌟', label: '🌟 مبتدئ' },
  { value: 'مروق وبس جاي أفضفض معك يا سينباي ☕', label: '☕ أفضفض' }
];

export default function AiChatView({ onBack }: { onBack: () => void }) {
  const { user, userData } = useAuth();
  const [selectedMood, setSelectedMood] = useState('سعيد ومبتهج 😆');
  const [selectedStatus, setSelectedStatus] = useState('أتابع أنمي حالياً ومستمر 📺');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [chat, setChat] = useState<any[]>(() => {
    // Attempt local storage cache
    try {
      const cached = localStorage.getItem('otaku_chat_history');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return [
      { 
        sender: 'bot', 
        text: 'أهلاً بك يا ناكاما! أنا "السينباي المخضرم" الخاص بك في هذا التطبيق المذهل! 🌟 خبرتي في الأنمي تمتد لسنوات طوال، ويمكنني اقتراح أعظم التحف الفنية التي تناسب ذوقك ومشاعرك الآن، أو مناقشة النظريات العميقة للأحداث. \n\nاضبط مزاجك وحالتك من الأعلى، واكتب لي رسالتك وسنبدأ رحلة الحوار فوراً!' 
      }
    ];
  });

  const MIN_LEVEL = 7; // Lowered to 7 for better premium accessibility, retaining the lock motivation
  const userLevel = userData?.level || 1;
  const isUnlocked = userLevel >= MIN_LEVEL;

  useEffect(() => {
    try {
      localStorage.setItem('otaku_chat_history', JSON.stringify(chat));
    } catch (_) {}
    scrollToBottom();
  }, [chat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const send = async () => {
    if (!msg.trim() || loading) return;
    const userMsg = msg;
    const updatedChat = [...chat, { sender: 'user', text: userMsg }];
    setChat(updatedChat);
    setMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: updatedChat,
          mood: selectedMood,
          status: selectedStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        setChat(prev => [...prev, { sender: 'bot', text: data.text }]);
      } else {
        setChat(prev => [...prev, { sender: 'bot', text: 'أوه باكا! حدث خطأ غريب بالخادم. حاول مراسلتي ثانية!' }]);
      }
    } catch (e) {
      setChat(prev => [...prev, { sender: 'bot', text: 'الشبكة تلاشت كأنه جتسو انتقال سريع! تحقق من اتصالك بالإنترنت.' }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChatHistory = () => {
    if (window.confirm('هل تريد مسح سجل المحادثة بالكامل؟')) {
      const reset = [
        { sender: 'bot', text: 'تم مسح ذكرياتنا السابقة كأننا فككنا شفرة المذكرة! كيف تود بدء الحوار مجدداً يا ناكاما؟' }
      ];
      setChat(reset);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 flex flex-col" id="ai_chat_view_container" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#070707]/90 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button id="chat_back_btn" onClick={onBack} className="p-2 bg-neutral-900 rounded-full hover:bg-neutral-800 transition">
            <ChevronRight size={20} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg border border-purple-400/20">
              <Bot size={22} className="text-white animate-pulse" />
            </div>
            <div>
              <h1 className="font-black text-base md:text-lg text-white">الدردشة مع السينباي المخضرم</h1>
              <p className="text-[10px] text-purple-400 font-bold flex items-center gap-1"><Sparkles size={10} /> أوتاكو ليفيل ليدر (الـ AI المساعد)</p>
            </div>
          </div>
        </div>

        {isUnlocked && (
          <button 
            onClick={clearChatHistory}
            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-[10px] font-bold text-neutral-400 hover:text-white transition"
          >
            مسح المحادثة
          </button>
        )}
      </div>

      {/* Main UI Area */}
      {!isUnlocked ? (
        <div className="flex-1 max-w-lg mx-auto flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-purple-600/10 border border-purple-500/15 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-2xl relative">
            🔒
            <Award className="absolute -bottom-2 -left-2 text-yellow-400" size={24} />
          </div>
          <h2 className="text-xl font-black text-white mb-2">هذه الميزة الفريدة مقفلة ⚔️</h2>
          <p className="text-neutral-400 text-xs leading-relaxed max-w-sm mb-6">
            محادثة "السينباي المخضرم" ومتابعته لمزاجك هي ميزة حصرية تتطلب مستوى مهارة أكبر. تمكّن من رفع مستواك وتأثيرك في مجتمع أوتاكو هاب لتصل للمستوى المطلوب!
          </p>

          <div className="bg-neutral-950 border border-white/5 p-4 rounded-2xl w-full text-right space-y-3 mb-6">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-400">المستوى المطلوب:</span>
              <span className="text-purple-400 font-bold">المستوى {MIN_LEVEL}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-neutral-400">مستواك الحالي:</span>
              <span className="text-pink-400 font-bold">المستوى {userLevel}</span>
            </div>

            <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full"
                style={{ width: `${Math.min(100, (userLevel / MIN_LEVEL) * 100)}%` }}
              ></div>
            </div>
          </div>

          <p className="text-[10px] text-neutral-500 leading-normal">
            💡 نصيحة للارتفاع بسرعة: شارك في كتابة التعليقات، فز بجولات تخمين الألعاب، وأضف توصيات الأنمي المعتمدة لدعم أصدقائك لتكتسب نقاط الخبرة (EXP).
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full overflow-hidden">
          {/* Settings Panel (Mood / Status) */}
          <div className="bg-neutral-950 p-4 border-b border-white/5 space-y-4 shrink-0">
            {/* Mood selector */}
            <div>
              <span className="text-[10px] font-extrabold text-neutral-400 block mb-2 tracking-wide uppercase">ضبط مزاجك الحالي (تغيير أسلوب حواري):</span>
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                {MOODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setSelectedMood(m.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap border cursor-pointer ${selectedMood === m.value ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status selector */}
            <div>
              <span className="text-[10px] font-extrabold text-neutral-400 block mb-2 tracking-wide uppercase">وضعك الحالي كأوتاكو:</span>
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                {STATUSES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setSelectedStatus(s.value)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition whitespace-nowrap border cursor-pointer ${selectedStatus === s.value ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-500/20' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950/20">
            {chat.map((c, i) => (
              <div key={i} className={`flex ${c.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="flex gap-2 max-w-[85%]">
                  {c.sender === 'bot' && (
                    <div className="w-7 h-7 rounded-lg bg-purple-600 shrink-0 flex items-center justify-center text-white font-mono text-[10px] font-bold shadow">
                      M
                    </div>
                  )}
                  <div className={`p-3 text-sm leading-relaxed rounded-2xl shadow-xl whitespace-pre-wrap ${c.sender === 'user' ? 'bg-gradient-to-l from-purple-600 to-indigo-600 text-white rounded-tl-sm' : 'bg-neutral-900 text-neutral-100 border border-neutral-800 rounded-tr-sm'}`}>
                    {c.text}
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="flex gap-2 items-center bg-neutral-900 text-neutral-400 px-4 py-3 rounded-2xl border border-neutral-800 text-xs">
                  <Bot size={14} className="animate-spin text-purple-400" />
                  <span>السينباي يكتب بحماس ويفكر حالياً...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="bg-neutral-900 p-4 border-t border-white/5 shrink-0">
            <div className="flex gap-2 bg-black border border-neutral-800 rounded-2xl p-1.5 pr-4 pl-2 shadow-inner items-center max-w-4xl mx-auto">
              <input 
                type="text"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="اكتب رسالة إلى السينباي المخضرم..."
                disabled={loading}
                className="flex-1 bg-transparent text-sm text-white focus:outline-none disabled:opacity-50"
              />
              <button 
                onClick={send}
                disabled={loading || !msg.trim()}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center text-white shrink-0 shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-40 cursor-pointer"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
