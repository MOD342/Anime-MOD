import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Target, Lock, Crown, Star, Shield, Image, Sparkles, Gamepad2, ShoppingCart, Bot, Zap, Ticket } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { STORE_ITEMS } from '../data/storeItems';

interface LevelPerksViewProps {
  onBack: () => void;
  onNavigateToStore?: () => void;
}

export default function LevelPerksView({ onBack, onNavigateToStore }: LevelPerksViewProps) {
  const { userData } = useAuth();
  const currentLevel = userData?.level || 1;

  // Let's generate a list of levels that have special perks
  const perksRoadmap = useMemo(() => {
    const roadmap = [];
    for (let lvl = 1; lvl <= 100; lvl++) {
      let isSpecial = false;
      const perks = [];

      // Check Store Items unlocked exactly at this level
      const unlockedStoreItems = STORE_ITEMS.filter(it => it.minLevel === lvl);
      if (unlockedStoreItems.length > 0) {
        
        let framesCount = unlockedStoreItems.filter(i => i.type === 'frame').length;
        let avatarsCount = unlockedStoreItems.filter(i => i.type === 'avatar').length;
        let bannersCount = unlockedStoreItems.filter(i => i.type === 'banner').length;
        let titles = unlockedStoreItems.filter(i => i.type === 'title');
        let badges = unlockedStoreItems.filter(i => i.type === 'badge');

        if (avatarsCount > 0) perks.push({ text: `فتح ${avatarsCount} صورة ملف شخصي`, icon: Image, color: 'text-blue-400' });
        if (bannersCount > 0) perks.push({ text: `فتح ${bannersCount} غلاف حساب`, icon: Image, color: 'text-indigo-400' });
        if (framesCount > 0) perks.push({ text: `فتح ${framesCount} إطار أسطوري`, icon: Shield, color: 'text-cyan-400' });
        
        titles.forEach(t => perks.push({ text: t.name, icon: Crown, color: 'text-yellow-400' }));
        badges.forEach(b => perks.push({ text: b.name, icon: Star, color: 'text-orange-400' }));
      }

      // Hardcoded game unlocks
      if (lvl === 5) perks.push({ text: 'لعبة "تخمين من صورة مموهة"', icon: Gamepad2, color: 'text-purple-400' });
      if (lvl === 10) perks.push({ text: 'لعبة "من القائل"', icon: Gamepad2, color: 'text-purple-400' });
      if (lvl === 10) perks.push({ text: 'فتح مساعد الذكاء الاصطناعي الخاص', icon: Bot, color: 'text-green-400' });
      if (lvl === 20) perks.push({ text: 'لعبة "تخمين من الإيموجي"', icon: Gamepad2, color: 'text-purple-400' });
      if (lvl === 25) perks.push({ text: 'لعبة "تحدي سرعة البديهة"', icon: Gamepad2, color: 'text-purple-400' });
      if (lvl === 30) perks.push({ text: 'لعبة "اكتشف الدخيل"', icon: Gamepad2, color: 'text-purple-400' });
      if (lvl === 40) perks.push({ text: 'لعبة "معركة التقييمات"', icon: Gamepad2, color: 'text-purple-400' });
      if (lvl === 50) perks.push({ text: 'لعبة "عين الشارينغان"', icon: Gamepad2, color: 'text-purple-400' });
      if (lvl === 60) perks.push({ text: 'لعبة "من الأقوى؟"', icon: Gamepad2, color: 'text-purple-400' });
      if (lvl === 70) perks.push({ text: 'لعبة "كلمات الأغاني"', icon: Gamepad2, color: 'text-purple-400' });
      if (lvl === 80) perks.push({ text: 'لعبة "ترتيب الأحداث"', icon: Gamepad2, color: 'text-purple-400' });
      
      // Additional features
      if (lvl === 5) perks.push({ text: 'ميزة التعليق في غرف المشاهدة', icon: Zap, color: 'text-red-400' });

      const isUnlockLevel = [5, 10, 20, 25, 30, 40, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100].includes(lvl);

      if (perks.length > 0) {
        roadmap.push({ level: lvl, perks, isMilestone: (lvl % 10 === 0 || isUnlockLevel) });
      }
    }
    return roadmap.reverse(); // highest to lowest
  }, []);

  return (
    <div className="h-full bg-[#0a0a0c] flex flex-col font-sans text-right" dir="rtl">
      {/* Header */}
      <div className="p-4 shrink-0 flex items-center justify-between sticky top-0 bg-[#0a0a0c]/80 backdrop-blur z-20 border-b border-white/5">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition">
          <ChevronRight size={24} className="text-white" />
        </button>
        <h1 className="text-xl font-black text-white flex items-center gap-2">مسار المستويات <Target size={20} className="text-blue-500" /></h1>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 hide-scrollbar">
         <div className="bg-gradient-to-br from-blue-900/40 to-blue-600/10 rounded-3xl p-6 mb-8 border border-blue-500/20 text-center relative overflow-hidden">
            <Sparkles className="absolute -left-4 -bottom-4 text-blue-500/20 w-32 h-32 rotate-12" />
            <h2 className="text-2xl font-black text-white mb-2">مستواك الحالي: {currentLevel}</h2>
            <p className="text-blue-200/70 text-sm font-medium">ارتقِ بمستواك عبر المشاهدة، التقييم، الكويزات، والألعاب لفتح عناصر مذهلة!</p>
         </div>

         <div className="pl-2 border-r-2 border-white/10 space-y-8 pr-6 relative">
            <div className="absolute top-0 bottom-0 right-0 w-2 bg-gradient-to-b from-blue-500 rounded-full h-full -mr-2" style={{ height: `${Math.min(100, (currentLevel / 100) * 100)}%` }} />
            
            {perksRoadmap.map((item, idx) => {
              const isUnlocked = currentLevel >= item.level;
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={item.level} 
                  className={`relative bg-[#121215] rounded-2xl p-5 border shadow-xl transition-all ${isUnlocked ? 'border-blue-500/30 ring-1 ring-blue-500/10' : 'border-neutral-800 opacity-70'}`}
                >
                   {/* Level Node on Timeline */}
                   <div className={`absolute top-1/2 -mt-4 -right-[35px] w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ring-4 ring-[#0a0a0c] z-10 ${isUnlocked ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-500'}`}>
                     {item.level}
                   </div>

                   <div className="flex items-center justify-between mb-4">
                     <h3 className={`font-black text-lg ${isUnlocked ? (item.isMilestone ? 'text-yellow-400' : 'text-white') : 'text-neutral-500'}`}>
                       المستوى {item.level}
                       {item.isMilestone && <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full mr-2">محطة رئيسية</span>}
                     </h3>
                     {!isUnlocked && <Lock size={16} className="text-neutral-600" />}
                   </div>
                   
                   <div className="flex flex-col gap-3">
                     {item.perks.map((perk, i) => (
                        <div key={i} className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isUnlocked ? 'bg-neutral-800/80 text-white' : 'bg-neutral-900/50 text-neutral-600'}`}>
                             <perk.icon size={16} className={isUnlocked ? perk.color : 'text-neutral-600'} />
                           </div>
                           <span className={`text-sm font-bold ${isUnlocked ? 'text-neutral-300' : 'text-neutral-600'}`}>{perk.text}</span>
                        </div>
                     ))}
                   </div>
                </motion.div>
              )
            })}
         </div>
      </div>
    </div>
  );
}
