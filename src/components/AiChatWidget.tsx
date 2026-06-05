import { motion, AnimatePresence } from 'motion/react';
import { Bot, X, Sparkles, Send, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const { user, userData } = useAuth();
  
  const [chat, setChat] = useState([
    { sender: 'bot', text: 'مرحباً بك في أنمي MOD! أنا مساعدك الذكي. يمكنني اقتراح أنميات لك بناءً على ذوقك، أو مناقشة أحداث الحلقات معك. كيف يمكنني مساعدتك اليوم؟' }
  ]);

  const MIN_LEVEL = 10;
  const userLevel = userData?.level || 1;

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('open-ai-chat', handler);
    return () => window.removeEventListener('open-ai-chat', handler);
  }, []);

  const send = async () => {
    if(!msg.trim()) return;
    const userMsg = msg;
    const newChat = [...chat, { sender: 'user', text: userMsg }];
    setChat(newChat);
    setMsg('');
    
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newChat })
      });
      const data = await res.json();
      if (data.success) {
        setChat(prev => [...prev, { sender: 'bot', text: data.text }]);
      } else {
        setChat(prev => [...prev, { sender: 'bot', text: 'عذراً، حدث خطأ أثناء الاتصال بالخادم.' }]);
      }
    } catch(e) {
      setChat(prev => [...prev, { sender: 'bot', text: 'عذراً، حدث خطأ في الاتصال بالشبكة.' }]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed inset-4 max-w-md mx-auto bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden z-[100] flex flex-col"
          style={{ maxHeight: '80vh', top: '10%' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-4 shrink-0 flex justify-between items-center relative overflow-hidden">
            <Sparkles className="absolute left-2 top-2 text-purple-400 opacity-20" size={40} />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur shadow-lg border border-white/20">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">مساعد MOD </h3>
                <p className="text-[10px] text-purple-200">متصل (AI)</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition bg-black/20 rounded-full p-1 border border-white/10 relative z-10">
              <X size={20} />
            </button>
          </div>

          {/* Content Area */}
          {!user || userLevel < MIN_LEVEL ? (
            <div className="flex-1 bg-black/80 flex flex-col items-center justify-center p-8 text-center">
              <Lock size={48} className="text-neutral-600 mb-4" />
              <h3 className="text-white font-bold text-lg mb-2">ميزة مقفلة</h3>
              <p className="text-neutral-400 text-sm mb-4">
                عذراً، تحتاج للوصول إلى المستوى {MIN_LEVEL} لفتح مساعد الذكاء الاصطناعي للمحادثات.
              </p>
              <div className="px-4 py-2 bg-purple-500/10 text-purple-400 font-bold rounded-xl border border-purple-500/20">
                مستواك الحالي: {userLevel}
              </div>
            </div>
          ) : (
            <>
              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/80">
                {chat.map((c, i) => (
                  <div key={i} className={`flex ${c.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 text-sm rounded-2xl shadow-md ${c.sender === 'user' ? 'bg-gradient-to-l from-purple-600 to-blue-600 text-white rounded-tl-sm' : 'bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-tr-sm'}`}>
                      {c.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <div className="p-3 bg-neutral-900 border-t border-neutral-800 shrink-0">
                <div className="flex items-center gap-2 bg-black border border-neutral-800 rounded-full p-1 pl-3 shadow-inner">
                  <input 
                    type="text" 
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && send()}
                    placeholder="اكتب رسالتك..." 
                    className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                  />
                  <button onClick={send} className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg">
                    <Send size={14} className="-ml-1" />
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
