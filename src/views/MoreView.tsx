import React, { useState, useEffect } from 'react';
import { UserCircle, Gamepad2, CalendarDays, Trophy, ShoppingCart, Shield, LogOut, ChevronLeft, Heart, Lock, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { moderationService } from '../services/moderationService';

interface MoreViewProps {
  onNavigate: (view: string, props?: any) => void;
}

export default function MoreView({ onNavigate }: MoreViewProps) {
  const { user, signIn, logout, userData } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const userLevel = userData?.level || 1;

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const role = await moderationService.getCurrentUserRole();
        setIsAdmin(role === 'admin' || role === 'owner');
      }
    };
    checkAdmin();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      onNavigate('home');
    } catch(e) {
      console.error(e);
    }
  };

  const menuItems: { id: string; label: string; icon: any; color: string; bg: string; minLevel?: number }[] = [
    { id: 'profile', label: 'حسابي', icon: UserCircle, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'favorites', label: 'المفضلة', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { id: 'notifications', label: 'الإشعارات', icon: Bell, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'schedule', label: 'جدول العرض', icon: CalendarDays, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { id: 'tournaments', label: 'البطولات', icon: Trophy, color: 'text-red-500', bg: 'bg-red-500/10' },
    { id: 'games', label: 'ألعاب الأنمي', icon: Gamepad2, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'leaderboard', label: 'المتصدرين', icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { id: 'store', label: 'متجر الأوتاكو', icon: ShoppingCart, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  if (isAdmin) {
    menuItems.push(
      { id: 'admin', label: 'لوحة الإدارة', icon: Shield, color: 'text-red-500', bg: 'bg-red-500/10' }
    );
  }

  return (
    <div className="pb-8 pt-6 px-4 md:px-8 space-y-6 max-w-3xl mx-auto font-sans">
      <h1 className="text-2xl font-black text-white mb-6">المزيد</h1>
      
      {user ? (
         <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800 flex items-center gap-4 mb-6 shadow-lg shadow-black">
           <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-14 h-14 rounded-full border-2 border-neutral-700 bg-black object-cover" />
           <div>
             <h3 className="text-white font-bold">{user.displayName || 'أوتاكو'}</h3>
             <p className="text-xs text-neutral-400">{user.email}</p>
           </div>
         </motion.div>
      ) : (
         <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 flex flex-col items-center justify-center text-center gap-3 mb-6">
            <UserCircle size={40} className="text-neutral-500" />
            <div>
              <h3 className="text-white font-bold mb-1">تسجيل الدخول</h3>
              <p className="text-xs text-neutral-400">سجل دخولك لفتح ميزات المجتمع، الألعاب، وقائمتك الخاصة.</p>
            </div>
            <button onClick={signIn} className="mt-2 bg-[#FF1744] hover:bg-red-600 text-white font-bold py-2 px-6 rounded-xl transition shadow-[0_0_15px_rgba(255,23,68,0.3)]">دخول / تسجيل</button>
         </motion.div>
      )}

      <div className="space-y-3">
        <AnimatePresence>
          {menuItems.map((item, idx) => {
            // Requires login for these routes:
            const requiresLogin = ['profile', 'games', 'leaderboard', 'store', 'admin', 'tournaments', 'notifications'].includes(item.id);
            if (!user && requiresLogin) return null;

            return (
              <motion.button 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={item.id}
                onClick={() => (!item.minLevel || userLevel >= item.minLevel) && onNavigate(item.id)}
                className={`w-full bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 p-4 rounded-2xl flex items-center justify-between transition-all group shadow-sm ${item.minLevel && userLevel < item.minLevel ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg} group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className={item.color} size={20} />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-white font-bold text-sm tracking-wide">{item.label}</span>
                    {item.minLevel && userLevel < item.minLevel && (
                       <span className="text-[10px] font-bold text-neutral-500 bg-black/40 px-2 py-0.5 rounded-full border border-neutral-800">يفتح في مستوى {item.minLevel}</span>
                    )}
                  </div>
                </div>
                {item.minLevel && userLevel < item.minLevel ? (
                   <Lock className="text-neutral-600" size={18} />
                ) : (
                   <ChevronLeft className="text-neutral-600 group-hover:text-white transition-all transform group-hover:-translate-x-1" size={20} />
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
      
      {user && (
         <motion.button 
           initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
           onClick={handleLogout}
           className="w-full mt-8 bg-red-900/10 hover:bg-red-900/30 text-[#FF1744] border border-red-900/30 p-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm group"
         >
           <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" /> تسجيل الخروج
         </motion.button>
      )}
    </div>
  );
}
