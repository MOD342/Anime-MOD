import React, { useEffect, useState } from 'react';
import { ChevronRight, Trophy, Medal, Star, Award } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { STORE_ITEMS_SORTED, getAvatarShapeClass } from '../data/storeItems';

interface LeaderboardViewProps {
  onBack: () => void;
  onUserClick?: (userId: string) => void;
}

export default function LeaderboardView({ onBack, onUserClick }: LeaderboardViewProps) {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchLeaderboard = async () => {
      try {
        const cached = sessionStorage.getItem('client_leaderboard_cache');
        if (cached) {
          setLeaders(JSON.parse(cached));
          setLoading(false);
        }
      } catch (e) {}

      try {
        const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        
        // Filter out users with 0 points if we want, or just show them
        const filtered = data.filter(u => (u.xp || 0) > 0);
        if (active) {
          setLeaders(filtered);
          setLoading(false);
          try {
            sessionStorage.setItem('client_leaderboard_cache', JSON.stringify(filtered));
          } catch (e) {}
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard", error);
        if (active) setLoading(false);
      }
    };
    fetchLeaderboard();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-black pb-8 pt-12 md:pt-0 font-sans text-right" dir="rtl">
      <div className="flex items-center justify-between p-4 sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-neutral-900 rounded-full hover:bg-neutral-800 transition text-white">
            <ChevronRight size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="text-yellow-500 animate-bounce" size={24} />
            <h1 className="text-white font-black text-xl md:text-2xl">لوحة المتصدرين للأبطال</h1>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-2xl mx-auto">
         {loading ? (
            <div className="flex justify-center p-8"><div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></div></div>
         ) : leaders.length === 0 ? (
            <div className="text-center text-neutral-500 py-10 font-bold">لا يوجد أبطال بعد! كن الأول الآن.</div>
         ) : (
            <div className="space-y-3">
              {leaders.map((leader, index) => {
                const level = leader.level || 1;
                const isCurrentUser = user?.uid === leader.id;
                
                // Fetch dynamic equipped assets from the shop database list
                const equippedAvatarId = leader.equippedAvatar || null;
                const equippedFrameId = leader.equippedFrame || null;
                const equippedTitleId = leader.equippedTitle || null;
                const equippedBadgeId = leader.equippedBadge || null;

                const activeAvatar = STORE_ITEMS_SORTED.find(i => i.id === equippedAvatarId);
                const activeFrame = STORE_ITEMS_SORTED.find(i => i.id === equippedFrameId);
                const activeTitle = STORE_ITEMS_SORTED.find(i => i.id === equippedTitleId);
                const activeBadge = STORE_ITEMS_SORTED.find(i => i.id === equippedBadgeId);

                let rankIcon = null;
                if (index === 0) rankIcon = <Medal className="text-yellow-500" size={26} fill="currentColor" />;
                else if (index === 1) rankIcon = <Medal className="text-neutral-400" size={24} fill="currentColor" />;
                else if (index === 2) rankIcon = <Medal className="text-amber-600" size={24} fill="currentColor" />;
                else rankIcon = <span className="font-mono text-xs font-black text-neutral-500 w-6 text-center">{index + 1}</span>;

                const rowBg = isCurrentUser 
                  ? 'bg-purple-900/10 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.15)]' 
                  : 'bg-[#0d0d0d] border-neutral-900';

                return (
                  <div 
                    key={leader.id} 
                    onClick={() => onUserClick?.(leader.id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border ${rowBg} transition-all cursor-pointer hover:border-purple-500/30 hover:bg-neutral-950/25`}
                  >
                    <div className="w-8 flex justify-center shrink-0">
                      {rankIcon}
                    </div>
                    
                    {/* Visual Avatar with Frame Ring Styles strictly overlaid */}
                    <div className="relative shrink-0 p-1">
                      <div className={`w-12 h-12 ${getAvatarShapeClass(activeFrame?.avatarShape)} overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center`}>
                        <img 
                          src={activeAvatar?.img || leader.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${leader.id}`} 
                          alt="avatar" 
                          referrerPolicy="no-referrer"
                          className={`w-full h-full object-cover ${activeAvatar?.imageStyle || ''}`} 
                        />
                      </div>
                      
                      {/* Active Frame styling */}
                      {activeFrame && (
                        <div className={`absolute inset-0 ${getAvatarShapeClass(activeFrame.avatarShape)} pointer-events-none ${activeFrame.frameStyle}`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Interactive dynamic titles applying customized text colors */}
                        <h3 className={`font-extrabold text-sm truncate max-w-[170px] ${activeTitle ? activeTitle.color : 'text-white'}`}>
                          {leader.displayName || 'لاعب مجهول'} 
                        </h3>

                        {/* Interactive Dynamic Badge if equipped */}
                        {activeBadge && (
                          <span className="p-0.5 border border-yellow-500/20 bg-yellow-500/10 rounded-full inline-flex items-center justify-center" title={activeBadge.name}>
                            {React.createElement(activeBadge.icon, { size: 10, className: activeBadge.color })}
                          </span>
                        )}

                        {isCurrentUser && (
                          <span className="text-[8px] font-black bg-purple-600/20 border border-purple-500/30 text-purple-400 px-1.5 py-0.5 rounded ml-2">أنت</span>
                        )}
                      </div>
                      
                      {/* Sub-label showing current user title text explicitly if they have one */}
                      <p className="text-[10px] text-neutral-400 font-bold mt-1 flex items-center gap-2">
                        <span>مستوى {level}</span>
                        {activeTitle && (
                          <span className="text-[9px] font-black text-neutral-500">• {activeTitle.name}</span>
                        )}
                      </p>
                    </div>

                    <div className="text-left shrink-0">
                      <div className="text-white font-mono font-black text-base">{leader.xp || 0}</div>
                      <div className="text-[9px] text-neutral-500 font-bold">نقطة XP</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
       </div>
    </div>
  );
}
