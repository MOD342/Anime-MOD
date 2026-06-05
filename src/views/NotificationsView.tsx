import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, Bell, Trash2, Check, MessageSquare, Trophy, Play, 
  Info, ShieldAlert, CheckCircle, Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { notificationsService, AppNotification } from '../services/notificationsService';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface NotificationsViewProps {
  onBack: () => void;
  onNavigate?: (route: string, params?: any) => void;
}

export default function NotificationsView({ onBack, onNavigate }: NotificationsViewProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    setLoading(true);
    let allNotifs: AppNotification[] = [];
    
    try {
      // Global Notifications
      const globals = await notificationsService.getGlobalNotifications();
      const globalsWithFlag = globals.map(n => ({ ...n, isGlobal: true, read: true }));
      allNotifs = [...globalsWithFlag];

      // User specific
      if (user) {
         const userNotifs = await notificationsService.getUserNotifications(user.uid);
         allNotifs = [...allNotifs, ...userNotifs];
      }
      
      // sort all by createdAt descending
      allNotifs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0);
        return timeB - timeA;
      });

      setNotifications(allNotifs);
    } catch (e) {
      console.error("Error loading notifications", e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (n: AppNotification) => {
    if (!user || n.read || (n as any).isGlobal) return;
    try {
      await notificationsService.markAsRead(user.uid, n.id);
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      const unreadUserNotifs = notifications.filter(n => !n.read && !(n as any).isGlobal);
      const promises = unreadUserNotifs.map(n => notificationsService.markAsRead(user.uid, n.id));
      await Promise.all(promises);
      
      setNotifications(prev => prev.map(n => !(n as any).isGlobal ? { ...n, read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, n: AppNotification) => {
    e.stopPropagation();
    if (!user || (n as any).isGlobal) return;
    try {
      await notificationsService.deleteUserNotification(user.uid, n.id);
      setNotifications(prev => prev.filter(item => item.id !== n.id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    if (!user) return;
    if (window.confirm("هل أنت متأكد من رغبتك في حذف جميع الإشعارات الخاصة بك؟")) {
      try {
        await notificationsService.clearAllUserNotifications(user.uid);
        setNotifications(prev => prev.filter(n => (n as any).isGlobal));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleNotificationClick = async (n: AppNotification) => {
    if (user && !n.read && !(n as any).isGlobal) {
      await handleMarkAsRead(n);
    }

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

  const getIcon = (type: string, titleText: string) => {
    const isLike = titleText?.includes('إعجاب') || titleText?.includes('عجب');
    if (isLike && type === 'social') {
      return <Flame size={16} className="text-orange-500" />;
    }
    switch (type) {
      case 'tournament': return <Trophy size={16} className="text-yellow-500 animate-pulse" />;
      case 'episode': return <Play size={16} className="text-[#FF1744]" />;
      case 'social': return <MessageSquare size={16} className="text-green-400" />;
      case 'system': return <ShieldAlert size={16} className="text-blue-400" />;
      default: return <Info size={16} className="text-purple-400" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read && !(n as any).isGlobal).length;

  return (
    <div className="min-h-screen bg-black pb-12 pt-14 md:pt-4 font-sans text-right" dir="rtl">
      <div className="max-w-xl mx-auto px-4">
        
        {/* Simple compact header line */}
        <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1.5 hover:bg-neutral-900 rounded-lg text-neutral-400 hover:text-white transition">
              <ChevronRight size={20} />
            </button>
            <div className="flex items-center gap-1.5">
              <Bell className="text-[#FF1744]" size={16} />
              <span className="text-white font-bold text-sm">الإشعارات</span>
              {unreadCount > 0 && (
                <span className="bg-[#FF1744] text-[9px] text-white px-1.5 py-0.5 rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
          
          {user && notifications.length > 0 && (
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllAsRead} 
                  className="text-[11px] text-neutral-400 hover:text-white transition flex items-center gap-1"
                >
                  <CheckCircle size={12} />
                  <span>قراءة الكل</span>
                </button>
              )}
              {notifications.some(n => !(n as any).isGlobal) && (
                <button 
                  onClick={handleClearAll} 
                  className="text-[11px] text-neutral-500 hover:text-red-400 transition"
                  title="مسح الإشعارات"
                >
                  مسح الكل
                </button>
              )}
            </div>
          )}
        </div>

        {/* Notifications list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-[#FF1744] border-t-transparent animate-spin"></div>
            <p className="text-neutral-500 text-xs">جاري جلب الإشعارات...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center">
            <Bell size={24} className="text-neutral-800 mb-2" />
            <p className="text-neutral-500 text-[11px]">لا توجد إشعارات حالياً</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence mode="popLayout" initial={false}>
              {notifications.map((n) => {
                const isGlobal = (n as any).isGlobal;
                const isUnread = !n.read && !isGlobal;

                return (
                  <motion.div
                    key={n.id}
                    layoutId={`notif-${n.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex gap-3 ${
                      isUnread 
                        ? 'bg-neutral-950/70 border-neutral-900/40 relative' 
                        : 'bg-transparent border-transparent hover:bg-neutral-950/40'
                    }`}
                  >
                    {/* Unread Indicator dot */}
                    {isUnread && (
                      <span className="absolute top-4.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FF1744]" />
                    )}

                    {/* Compact Image or Icon */}
                    <div className="w-9 h-9 bg-neutral-900 rounded-lg flex items-center justify-center shrink-0 overflow-hidden relative border border-neutral-800">
                      {n.imageUrl ? (
                        <img 
                          src={n.imageUrl} 
                          alt="" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        getIcon(n.type, n.title)
                      )}
                    </div>

                    {/* Middle Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className={`text-xs font-bold line-clamp-1 ${isUnread ? 'text-white' : 'text-neutral-400'}`}>
                          {n.title}
                        </h4>
                        {isGlobal && (
                          <span className="text-[8px] bg-neutral-900 text-neutral-400 px-1 py-0.5 rounded">عام</span>
                        )}
                      </div>
                      
                      <p className="text-[11px] text-neutral-500 leading-relaxed mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                      
                      <span className="text-[9px] text-neutral-600 block mt-1">
                        {n.createdAt?.toDate ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true, locale: ar }) : 'الآن'}
                      </span>
                    </div>

                    {/* Right action control */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!isGlobal && (
                        <button
                          onClick={(e) => handleDeleteNotification(e, n)}
                          className="p-1 hover:bg-neutral-900 rounded text-neutral-600 hover:text-red-500 transition"
                          title="حذف"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      
                      {isUnread && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(n);
                          }}
                          className="p-1 text-[#FF1744] hover:bg-red-500/10 rounded transition"
                          title="تحديد كمقروء"
                        >
                          <Check size={12} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
