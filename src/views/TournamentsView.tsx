import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Award, Timer, Users, Crown, ChevronLeft, Zap, Gift, PlayCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface TournamentsViewProps {
  onBack: () => void;
  onNavigate?: (route: string) => void;
}

const ACTIVE_TOURNAMENT = {
  id: 't-1',
  title: 'بطولة أوتاكو الكبرى',
  description: 'أثبت خبرتك في عالم الأنمي من خلال الإجابة على التحديات والمنافسة على المركز الأول. الجائزة الكبرى تنتظر الأبطال!',
  prize: '5000 عملة + لقب بطل الأوتاكو',
  participants: 1240,
  endsIn: '2 أيام و 4 ساعات',
  bg: 'from-orange-600 to-red-600',
  icon: Crown
};

const UPCOMING_TOURNAMENTS = [
  { id: 't-2', title: 'معركة الأوبينينغ', time: 'يبدأ غداً', prize: '1000 عملة', participants: 420 },
  { id: 't-3', title: 'تحدي خبراء ون بيس', time: 'بعد 4 أيام', prize: 'لقب "ملك القراصنة"', participants: 1890 },
  { id: 't-4', title: 'بطولة الذاكرة الخارقة', time: 'الأسبوع القادم', prize: '500 عملة', participants: 310 }
];

export default function TournamentsView({ onBack, onNavigate }: TournamentsViewProps) {
  const { user } = useAuth();
  const [joined, setJoined] = useState(false);

  return (
    <div className="bg-black min-h-screen pb-24 overflow-y-auto hide-scrollbar font-sans">
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-neutral-900 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 bg-neutral-900 rounded-full flex items-center justify-center text-white border border-neutral-800 hover:bg-neutral-800 transition">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="text-yellow-500" size={24} />
            <h1 className="text-xl font-black text-white">البطولات</h1>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto space-y-8">
        
        {/* Active Tournament */}
        <section>
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-black text-white flex items-center gap-2">
               <span className="relative flex h-3 w-3">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
               </span>
               البطولة الحالية
             </h2>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-3xl p-1 bg-gradient-to-br ${ACTIVE_TOURNAMENT.bg} shadow-lg shadow-red-900/20`}
          >
            <div className="bg-[#121212]/90 backdrop-blur-sm rounded-[22px] p-6 h-full flex flex-col relative overflow-hidden">
               {/* Decorative background elements */}
               <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-x-10 -translate-y-10" />
               <div className="absolute bottom-0 right-0 w-40 h-40 bg-red-500/10 rounded-full blur-3xl translate-x-10 translate-y-10" />
               
               <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.3)] border-4 border-[#121212]">
                     <ACTIVE_TOURNAMENT.icon size={40} className="text-white" />
                  </div>
                  
                  <div>
                    <h3 className="text-2xl w-full font-black text-white drop-shadow-md">{ACTIVE_TOURNAMENT.title}</h3>
                    <p className="text-xs text-neutral-400 mt-2 leading-relaxed">{ACTIVE_TOURNAMENT.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 w-full mt-2">
                     <div className="bg-black/50 border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center gap-1">
                        <Timer size={18} className="text-red-400" />
                        <span className="text-[10px] text-neutral-400">تنتهي خلال</span>
                        <strong className="text-xs text-white">{ACTIVE_TOURNAMENT.endsIn}</strong>
                     </div>
                     <div className="bg-black/50 border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center gap-1">
                        <Users size={18} className="text-blue-400" />
                        <span className="text-[10px] text-neutral-400">المشاركين</span>
                        <strong className="text-xs text-white">{ACTIVE_TOURNAMENT.participants}</strong>
                     </div>
                  </div>

                  <div className="w-full bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-center justify-center gap-2">
                     <Gift size={16} className="text-yellow-500" />
                     <span className="text-sm font-bold text-yellow-500">{ACTIVE_TOURNAMENT.prize}</span>
                  </div>

                  {joined ? (
                    <button 
                      onClick={() => onNavigate?.('games')}
                      className="w-full bg-neutral-800 text-white border border-neutral-700 py-4 rounded-2xl font-black text-sm flex justify-center items-center gap-2 transition hover:bg-neutral-700 shadow-lg"
                    >
                      <PlayCircle size={20} /> العب لجمع النقاط
                    </button>
                  ) : (
                    <button 
                      onClick={() => setJoined(true)}
                      className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] py-4 rounded-2xl font-black text-sm flex justify-center items-center gap-2 transition transform active:scale-95"
                    >
                      <Zap size={20} fill="currentColor" /> انضم للبطولة الآن
                    </button>
                  )}
               </div>
            </div>
          </motion.div>
        </section>

        {/* Upcoming Tournaments */}
        <section>
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-black text-white">بطولات قادمة</h2>
          </div>

          <div className="space-y-3">
             {UPCOMING_TOURNAMENTS.map((t, idx) => (
               <motion.div 
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: 0.1 + (idx * 0.1) }}
                 key={t.id} 
                 className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex items-center gap-4"
               >
                 <div className="w-12 h-12 bg-neutral-800 border border-neutral-700 rounded-xl flex items-center justify-center shrink-0">
                    <Trophy size={20} className="text-neutral-400" />
                 </div>
                 <div className="flex-1">
                    <h4 className="text-sm font-bold text-white mb-1">{t.title}</h4>
                    <div className="flex items-center gap-3 text-[10px] font-bold">
                       <span className="text-neutral-500 flex items-center gap-1"><Timer size={12}/> {t.time}</span>
                       <span className="text-neutral-500 flex items-center gap-1"><Users size={12}/> {t.participants} مهتم</span>
                    </div>
                 </div>
                 <div className="text-left shrink-0">
                    <span className="bg-yellow-500/10 text-yellow-500 text-[10px] font-bold px-2 py-1 rounded-lg border border-yellow-500/20">{t.prize}</span>
                 </div>
               </motion.div>
             ))}
          </div>
        </section>

      </div>
    </div>
  );
}
