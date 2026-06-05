import React, { useState, useEffect } from 'react';
import { Bell, X, Info, Trophy, MessageCircle, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { notificationsService, AppNotification } from '../services/notificationsService';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface NotificationsModalProps {
  onClose: () => void;
  onNavigate?: (route: any, params?: any) => void;
}

export default function NotificationsModal({ onClose, onNavigate }: NotificationsModalProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    setLoading(true);
    let allNotifs: AppNotification[] = [];
    
    // Global
    const globals = await notificationsService.getGlobalNotifications();
    allNotifs = [...globals];

    // User specific
    if (user) {
       const userNotifs = await notificationsService.getUserNotifications(user.uid);
       allNotifs = [...allNotifs, ...userNotifs];
    }
    
    // sort all by createdAt descending
    allNotifs.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    setNotifications(allNotifs);
    setLoading(false);
  };

  const handleClear = async () => {
    if (user) {
      await notificationsService.clearAllUserNotifications(user.uid);
      await loadNotifications();
    }
  };

  const handleNotificationClick = (n: AppNotification) => {
    onClose();
    if (!n.linkTo) return;

    if (n.linkTo === 'rewards') {
      onNavigate?.('rewards');
    } else if (n.linkTo === 'games') {
      onNavigate?.('games');
    } else if (n.linkTo === 'leaderboard') {
      onNavigate?.('leaderboard');
    } else if (n.linkTo.startsWith('anime_details')) {
      const parts = n.linkTo.split(':');
      const animeId = parts[1] || n.metadata?.animeId;
      if (animeId) {
        onNavigate?.('anime_details', { id: animeId });
      } else {
        onNavigate?.('home');
      }
    } else if (n.linkTo.startsWith('watch_episode')) {
      const parts = n.linkTo.split(':');
      const animeId = parts[1] || n.metadata?.animeId;
      const epNum = parts[2] || '1';
      if (animeId) {
        onNavigate?.('anime_details', { id: animeId, autoplayEpisode: Number(epNum) });
      }
    } else {
      onNavigate?.('home');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'tournament': return <Trophy size={16} className="text-yellow-500" />;
      case 'episode': return <Play size={16} className="text-blue-500" />;
      case 'social': return <MessageCircle size={16} className="text-green-500" />;
      default: return <Info size={16} className="text-purple-500" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto z-[100] flex justify-end overflow-hidden">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        ></motion.div>
        
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full md:w-[400px] h-full bg-[#0a0a0a] border-l border-white/5 flex flex-col shadow-2xl"
        >
           <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/50 backdrop-blur-md">
             <div className="flex items-center gap-2">
               <Bell className="text-blue-500" />
               <h2 className="text-lg font-bold text-white">الإشعارات</h2>
             </div>
             <button onClick={onClose} className="p-2 bg-neutral-900 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition">
               <X size={20} />
             </button>
           </div>
           
           <div className="flex-1 overflow-y-auto hide-scrollbar p-2 space-y-2">
             {loading ? (
                <div className="text-center py-10 text-neutral-500">جاري التحميل...</div>
             ) : notifications.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center justify-center opacity-50">
                  <Bell size={48} className="mb-4 text-neutral-600" />
                  <p className="text-white font-bold">لا توجد إشعارات</p>
                  <p className="text-xs text-neutral-400 mt-1">عندما يصلك أي تحديث سيظهر هنا</p>
                </div>
             ) : (
                notifications.map((n, i) => (
                  <div 
                    key={`notification-${n.id || ''}-${i}`}
                    onClick={() => handleNotificationClick(n)}
                    className="p-3 bg-neutral-900/50 hover:bg-neutral-800/80 rounded-xl border border-neutral-800 transition cursor-pointer flex gap-3"
                  >
                     <div className="w-10 h-10 bg-black rounded-lg border border-neutral-800 flex items-center justify-center shrink-0 overflow-hidden relative">
                        {n.imageUrl ? (
                           <img src={n.imageUrl} alt="icon" className="w-full h-full object-cover" />
                        ) : getIcon(n.type)}
                     </div>
                     <div className="flex-1 min-w-0">
                       <h4 className="text-sm font-bold text-white mb-1 line-clamp-1">{n.title}</h4>
                       <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">{n.body}</p>
                       <span className="text-[10px] text-neutral-600 mt-2 block">
                         {n.createdAt && n.createdAt.toMillis ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true, locale: ar }) : 'الآن'}
                       </span>
                     </div>
                  </div>
                ))
             )}
           </div>

           {notifications.length > 0 && user && (
             <div className="p-4 border-t border-white/5 bg-black">
               <button onClick={handleClear} className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-sm font-bold transition border border-neutral-800">
                 مسح الإشعارات القديمة
               </button>
             </div>
           )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
