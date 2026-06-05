import React, { useState } from 'react';
import { Gift, Sparkles, Zap, Coins, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const REWARDS = [
  { id: 1, label: '50 كوينز', type: 'coins', amount: 50, color: 'bg-yellow-500' },
  { id: 2, label: '10 XP', type: 'points', amount: 10, color: 'bg-blue-500' },
  { id: 3, label: 'حظ أوفر', type: 'none', amount: 0, color: 'bg-neutral-600' },
  { id: 4, label: '20 كوينز', type: 'coins', amount: 20, color: 'bg-yellow-400' },
  { id: 5, label: '50 XP', type: 'points', amount: 50, color: 'bg-indigo-500' },
  { id: 6, label: '100 كوينز', type: 'coins', amount: 100, color: 'bg-amber-500' },
];

export default function DailySpin({ onClose }: { onClose: () => void }) {
  const { user, userData } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonReward, setWonReward] = useState<any>(null);

  const canSpin = !userData?.lastSpinDate || (new Date(userData.lastSpinDate).toDateString() !== new Date().toDateString());

  const handleSpin = async () => {
    if (!user || spinning || !canSpin) return;
    
    setSpinning(true);
    
    // Choose a random reward (weighted or entirely random)
    const rewardIndex = Math.floor(Math.random() * REWARDS.length);
    const reward = REWARDS[rewardIndex];
    
    // Calculate rotation to land on the reward
    const sectorAngle = 360 / REWARDS.length;
    
    // We want the chosen sector to end up at the top (0 degrees). 
    // The top pointer is at 0 degrees (or -90 depending on drawing, let's say 0 is top).
    // Let's add multiple full rotations (e.g. 5) + the specific angle for the reward.
    
    const extraSpins = 5 * 360;
    
    // Reverse calculating to stop at exactly the center of the target index piece
    // Each piece is sectorAngle wide.
    // Piece 0 spans from 0 to 60. Piece 1 from 60 to 120...
    // Center of Piece 0 is 30.
    const targetAngle = 360 - (rewardIndex * sectorAngle) - (sectorAngle / 2);
    
    const finalRotation = rotation + extraSpins + (targetAngle - (rotation % 360));

    setRotation(finalRotation);

    setTimeout(async () => {
      setWonReward(reward);
      setSpinning(false);
      
      try {
        const updates: any = {
           lastSpinDate: new Date().toISOString()
        };
        if (reward.type === 'coins') updates.coins = increment(reward.amount);
        if (reward.type === 'points') updates.aiGamesPoints = increment(reward.amount);
        
        await updateDoc(doc(db, 'users', user.uid), updates);
      } catch (e) {
         console.error(e);
      }
    }, 4000); // 4 seconds animation duration
  };

  return (
    <div className="fixed inset-0 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <AnimatePresence>
        {!wonReward ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#1a1a1a] p-6 rounded-3xl border border-neutral-800 w-full max-w-sm relative overflow-hidden text-center shadow-2xl">
            <button onClick={onClose} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition">
              <X size={24} />
            </button>
            <h2 className="text-white font-black text-2xl mb-2 flex items-center justify-center gap-2">عجلة الحظ <Gift className="text-pink-500" /></h2>
            <p className="text-sm text-neutral-400 mb-8 mb-6">دوّر العجلة مرة كل يوم للحصول على جوائز مجانية!</p>

            <div className="relative w-64 h-64 mx-auto mb-8">
               {/* Pointer */}
               <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]"></div>
               
               <div 
                 className="w-full h-full rounded-full border-4 border-neutral-800 overflow-hidden relative shadow-[0_0_30px_rgba(0,0,0,0.8)] transition-transform duration-[4000ms] ease-[cubic-bezier(0.1,0.7,0.1,1)]"
                 style={{ transform: `rotate(${rotation}deg)` }}
               >
                 {REWARDS.map((item, index) => {
                   const rotation = index * (360 / REWARDS.length);
                   return (
                     <div 
                       key={item.id}
                       className="absolute top-0 right-0 w-1/2 h-1/2 origin-bottom-left"
                       style={{ 
                         transform: `rotate(${rotation}deg) skewY(${-(90 - 360 / REWARDS.length)}deg)`,
                         backgroundColor: 'transparent'
                       }}
                     >
                        {/* Sector color */}
                        <div className={`w-full h-full ${item.color} border border-black/20`}></div>
                        
                        {/* Text positioning (tricky in CSS, approximation) */}
                        <div 
                           className="absolute top-1/2 left-1/2 w-[80px] -ml-[25px] mt-[10px] origin-center text-center font-black text-white text-sm drop-shadow-md z-10"
                           style={{ transform: `skewY(${90 - 360 / REWARDS.length}deg) rotate(${ (360 / REWARDS.length) / 2 }deg) translate(20px, -40px)` }}
                        >
                           {item.label}
                        </div>
                     </div>
                   );
                 })}
               </div>
            </div>

            <button 
              onClick={handleSpin} 
              disabled={spinning || !canSpin} 
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-lg transition shadow-lg ${spinning ? 'bg-neutral-800 text-neutral-500' : !canSpin ? 'bg-neutral-800 text-red-500' : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:scale-[1.02] text-white'}`}
            >
              {spinning ? 'جاري اللف...' : !canSpin ? 'لقد قمت باللف اليوم!' : 'لف العجلة!'}
            </button>
            {!canSpin && !spinning && (
              <p className="text-xs text-neutral-500 mt-3">عد غداً للمزيد من الحظ!</p>
            )}
          </motion.div>
        ) : (
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1a1a1a] p-8 rounded-3xl border border-neutral-800 w-full max-w-sm text-center shadow-2xl relative overflow-hidden">
             
             <Sparkles className="absolute top-4 left-4 text-yellow-500/20" size={80} />
             <Sparkles className="absolute bottom-4 right-4 text-purple-500/20" size={60} />
             
             <h2 className="text-white font-black text-3xl mb-4 relative z-10">النتيجة!</h2>
             
             <div className="w-24 h-24 mx-auto bg-black rounded-full border-4 border-neutral-800 flex items-center justify-center mb-6 relative z-10 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                {wonReward.type === 'coins' ? <Coins className="text-yellow-500" size={40} /> :
                 wonReward.type === 'points' ? <Zap className="text-blue-500" size={40} /> :
                 <X className="text-neutral-500" size={40} />}
             </div>
             
             <h3 className={`text-2xl font-black mb-6 ${wonReward.type !== 'none' ? 'text-green-500' : 'text-neutral-500'} relative z-10`}>
                {wonReward.type !== 'none' ? `لقد ربحت ${wonReward.label}!` : 'للأسف لم تربح شيئاً اليوم!'}
             </h3>
             
             <button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition relative z-10">
               استمرار
             </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
