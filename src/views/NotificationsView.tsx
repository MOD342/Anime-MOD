import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, Bell, Trash2, Check, MessageSquare, Trophy, Play, 
  Info, ShieldAlert, CheckCircle, Flame, Users, Calendar, Loader2,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { notificationsService, AppNotification } from '../services/notificationsService';
import { useAuth } from '../contexts/AuthContext';
import { formatArabicDistanceToNow } from '../utils/dateFormatter';

interface NotificationsViewProps {
  onBack: () => void;
  onNavigate?: (route: string, params?: any) => void;
}

type NotificationCategory = 'all' | 'social' | 'episodes' | 'system';

export default function NotificationsView({ onBack, onNavigate }: NotificationsViewProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
         const userNotifs = await notificationsService.getUserNotifications(user.id);
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
      await notificationsService.markAsRead(user.id, n.id);
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      const unreadUserNotifs = notifications.filter(n => !n.read && !(n as any).isGlobal);
      const promises = unreadUserNotifs.map(n => notificationsService.markAsRead(user.id, n.id));
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
      await notificationsService.deleteUserNotification(user.id, n.id);
      setNotifications(prev => prev.filter(item => item.id !== n.id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    if (!user) return;
    if (window.confirm("هل أنت متأكد من رغبتك في حذف جميع الإشعارات الخاصة بك؟")) {
      try {
        await notificationsService.clearAllUserNotifications(user.id);
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
    } else if (n.linkTo.startsWith('comment_view')) {
      const parts = n.linkTo.split(':');
      const animeId = parts[1] || n.metadata?.animeId;
      const commentId = parts[2] || n.metadata?.commentId;
      if (animeId) {
        onNavigate?.('anime_comments', { animeId, focusCommentId: commentId });
      }
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
      return <Flame size={15} className="text-orange-500" />;
    }
    switch (type) {
      case 'tournament': return <Trophy size={14} className="text-yellow-500" />;
      case 'episode': return <Play size={14} className="text-[#FF1744] fill-current" />;
      case 'social': return <MessageSquare size={14} className="text-emerald-400" fill="currentColor" fillOpacity={0.10} />;
      case 'system': return <ShieldAlert size={14} className="text-blue-400" />;
      default: return <Info size={14} className="text-purple-400" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read && !(n as any).isGlobal).length;

  const filteredNotifications = notifications.filter(n => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'social') return n.type === 'social';
    if (activeCategory === 'episodes') return n.type === 'episode';
    if (activeCategory === 'system') return n.type === 'system' || n.type === 'tournament' || (n as any).isGlobal;
    return true;
  });

  const getCategoryCount = (cat: NotificationCategory) => {
    if (cat === 'all') return notifications.length;
    if (cat === 'social') return notifications.filter(n => n.type === 'social').length;
    if (cat === 'episodes') return notifications.filter(n => n.type === 'episode').length;
    if (cat === 'system') return notifications.filter(n => n.type === 'system' || n.type === 'tournament' || (n as any).isGlobal).length;
    return 0;
  };

  return (
    <div className="min-h-screen bg-black pb-12 pt-14 md:pt-4 font-sans text-right select-none" dir="rtl">
      <div className="max-w-xl mx-auto px-4">
        
        {/* Custom Premium Header Block */}
        <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack} 
              className="w-10 h-10 bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition flex items-center justify-center cursor-pointer active:scale-95"
            >
              <ChevronRight size={22} className="transform scale-x-[-1] md:scale-x-[1]" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Bell className="text-[#FF1744] animate-bounce" size={17} />
                <h1 className="text-white font-black text-sm tracking-tight">صندوق الإشعارات الداخلي</h1>
              </div>
              <p className="text-[10px] text-neutral-500 font-bold mt-0.5">تابع التفاعلات والأخبار لحظة بلحظة</p>
            </div>
          </div>
          
          {user && notifications.length > 0 && (
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllAsRead} 
                  className="bg-neutral-900 border border-neutral-850 text-[10px] font-bold text-neutral-300 hover:text-white transition py-1.5 px-3 rounded-xl flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <CheckCircle size={12} className="text-emerald-500" />
                  <span>قراءة الكل</span>
                </button>
              )}
              {notifications.some(n => !(n as any).isGlobal) && (
                <button 
                  onClick={handleClearAll} 
                  className="text-[10px] font-bold text-neutral-500 hover:text-red-500 transition px-2 py-1 select-none cursor-pointer"
                  title="مسح الإشعارات"
                >
                  مسح الكل
                </button>
              )}
            </div>
          )}
        </div>

        {/* Categories Tab Swiper */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {[
            { id: 'all', label: 'الكل', count: getCategoryCount('all'), icon: Bell },
            { id: 'social', label: 'تفاعل واجتماعي', count: getCategoryCount('social'), icon: Users },
            { id: 'episodes', label: 'الحلقات المضافة', count: getCategoryCount('episodes'), icon: Play },
            { id: 'system', label: 'الإعلانات والنظام', count: getCategoryCount('system'), icon: Info }
          ].map((tab) => {
            const IconComponent = tab.icon;
            const isSelected = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as NotificationCategory)}
                className={`py-2 px-3.5 rounded-xl text-xs font-black shrink-0 transition flex items-center gap-2 cursor-pointer border ${
                  isSelected 
                    ? 'bg-[#FF1744] border-transparent text-white shadow-[0_4px_12px_rgba(255,23,68,0.3)]' 
                    : 'bg-neutral-950 border-neutral-850 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <IconComponent size={13} />
                <span>{tab.label}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-neutral-900 text-neutral-500'
                }`}>{tab.count}</span>
              </button>
            );
          })}
        </div>

        {/* Notifications list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-[#12161E]/20 border border-neutral-900 rounded-2xl">
            <Loader2 className="animate-spin text-[#FF1744]" size={22} />
            <p className="text-neutral-500 text-xs font-bold">جاري جلب إشعاراتك من السحابة...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center bg-zinc-950/40 border border-neutral-900/60 rounded-2xl p-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center text-neutral-600 mb-4 border border-neutral-850"
            >
              <Bell size={24} className="text-neutral-500" />
            </motion.div>
            <h3 className="text-xs font-black text-neutral-300 mb-1">لا توجد إشعارات في هذا التبويب</h3>
            <p className="text-[10px] text-neutral-500 max-w-[240px] leading-relaxed">
              ستظهر هنا التحديثات المخصصة والتفاعلات والردود والأنمي المفضل فور حدوثها!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredNotifications.map((n) => {
                const isGlobal = (n as any).isGlobal;
                const isUnread = !n.read && !isGlobal;
                const expanded = !!expandedIds[n.id];

                return (
                  <motion.div
                    key={n.id}
                    layoutId={`notif-${n.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex gap-3.5 group relative ${
                      isGlobal
                        ? 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/25 border-r-4 border-r-amber-500'
                        : isUnread 
                          ? 'bg-[#1A2230]/75 hover:bg-[#1A2230] border-[#FF1744]/20 border-r-4 border-r-[#FF1744] shadow-[0_4px_12px_rgba(255,23,68,0.06)]' 
                          : 'bg-neutral-950/45 hover:bg-[#12161E]/60 border-neutral-900'
                    }`}
                  >
                    {/* Unread indicator dot */}
                    {isUnread && (
                      <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#FF1744]" />
                    )}

                    {/* Compact Image or Icon */}
                    <div className="w-11 h-11 bg-neutral-900 rounded-xl flex items-center justify-center shrink-0 overflow-hidden relative border border-neutral-850 shadow-inner">
                      {n.imageUrl ? (
                        <img 
                          src={n.imageUrl} 
                          alt="" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                        />
                      ) : (
                        getIcon(n.type, n.title)
                      )}
                    </div>

                    {/* Middle Text Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(e, n.id);
                          }}
                          className={`text-xs font-black cursor-pointer hover:underline ${expanded ? '' : 'line-clamp-1'} ${isGlobal ? 'text-amber-400' : isUnread ? 'text-white' : 'text-neutral-250'}`}
                        >
                          {n.title}
                        </h4>
                        {isGlobal && (
                          <span className="text-[8px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-md font-bold border border-amber-500/20">إعلان رسمي 📢</span>
                        )}
                        {!isGlobal && isUnread && (
                          <span className="text-[8px] bg-[#FF1744]/10 text-[#FF1744] px-1.5 py-0.5 rounded-md font-bold border border-[#FF1744]/20">جديد</span>
                        )}
                      </div>
                      
                      <p 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(e, n.id);
                        }}
                        className={`text-[12px] leading-relaxed mt-1 font-semibold cursor-pointer hover:text-white transition-all ${
                          isUnread ? 'text-neutral-100' : 'text-neutral-300'
                        } ${expanded ? '' : 'line-clamp-2'}`}
                        title="اضغط للتكبير/التصغير"
                      >
                        {n.body}
                      </p>
                      
                      <span className="text-[9px] text-neutral-500 font-bold block mt-1">
                        {formatArabicDistanceToNow(n.createdAt)}
                      </span>
                    </div>

                    {/* Leftside Action Controls */}
                    <div className="flex items-center gap-1 shrink-0 self-center">
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(e, n.id)}
                        className={`w-7 h-7 rounded-lg transition flex items-center justify-center cursor-pointer select-none ${
                          expanded ? 'text-[#FF1744] bg-[#FF1744]/10' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'
                        }`}
                        title={expanded ? "تصغير الإشعار" : "عرض الإشعار كاملاً"}
                      >
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {!isGlobal && (
                        <button
                          onClick={(e) => handleDeleteNotification(e, n)}
                          className="w-7 h-7 hover:bg-red-500/10 rounded-lg text-neutral-600 hover:text-red-500 transition flex items-center justify-center cursor-pointer select-none"
                          title="حذف الإشعار"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                      
                      {isUnread && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(n);
                          }}
                          className="w-7 h-7 text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/10 rounded-lg transition flex items-center justify-center cursor-pointer"
                          title="تحديد كمقروء"
                        >
                          <Check size={13} strokeWidth={3} />
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
