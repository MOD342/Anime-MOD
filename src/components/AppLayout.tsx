import { Store, UserCircle, PlaySquare, Swords, Home, Bookmark, MoreHorizontal, Shuffle, Bell, Search, Bot } from 'lucide-react';
import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { notificationsService } from '../services/notificationsService';
import NotificationsModal from './NotificationsModal';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

export function AppLayout({ children, activeTab, setActiveTab, onNavigateTo }: { children: ReactNode; activeTab: string; setActiveTab: (tab: string) => void; onNavigateTo: (view: string, props?: any) => void }) {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    // Listen to user notifications in real-time for updated unread badgecount
    const q = query(collection(db, 'users', user.id, 'notifications'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const count = snapshot.docs.filter(d => !d.data().read).length;
        setUnreadNotifsCount(count);
      },
      (err) => {
        console.warn("Real-time notifications counter error:", err);
      }
    );

    return () => unsub();
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Debounce small scrolls
      if (Math.abs(currentScrollY - lastScrollY) < 10) return;

      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setShowNav(false); // scroll down -> hide
      } else {
        setShowNav(true); // scroll up -> show
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleRandomAnime = () => {
    onNavigateTo('anime_details', { id: 'random', t: Date.now() });
  };

  return (
    <div className="min-h-screen w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto bg-black text-neutral-200 font-sans pb-24 md:pb-28 pt-16 border-x border-white/5 shadow-[0_0_60px_rgba(0,0,0,0.8)] relative" dir="rtl">
      {/* Top Nav */}
      {activeTab === 'home' && (
      <div className={`fixed top-0 left-0 right-0 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto z-50 bg-transparent border-b-0 pt-4 px-4 flex justify-between items-center transition-all duration-300 pointer-events-none ${
        showNav ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}>
        <div className="flex items-center gap-2.5 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-xl hover:bg-black/85 hover:border-white/30 transition-all duration-300 pointer-events-auto">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-purple-500/30 cursor-pointer hover:scale-105 active:scale-95 transition-all" onClick={() => onNavigateTo('profile')} />
          ) : (
            <div onClick={() => onNavigateTo('profile')} className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-black shadow-lg shadow-purple-500/20 text-xs cursor-pointer hover:scale-105 active:scale-95 transition-all">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <h1 className="text-sm font-black tracking-tight text-white drop-shadow-md md:text-base">
            أنمي <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">MOD</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
          {user && (
            <button onClick={() => onNavigateTo('notifications')} className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-blue-600/30 backdrop-blur-md border border-blue-500/30 flex items-center justify-center text-blue-400 hover:bg-blue-600 hover:text-white hover:scale-110 active:scale-95 hover:shadow-[0_0_15px_rgba(59,130,246,0.6)] transition-all duration-300 relative cursor-pointer">
              <Bell size={16} />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-black animate-pulse shadow-[0_0_8px_#ef4444]">
                  {unreadNotifsCount}
                </span>
              )}
            </button>
          )}
          <button onClick={handleRandomAnime} className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-orange-600/30 backdrop-blur-md border border-orange-500/30 flex items-center justify-center text-orange-400 hover:bg-orange-600 hover:text-white hover:scale-110 active:scale-95 hover:shadow-[0_0_15px_rgba(249,115,22,0.6)] transition-all duration-300 cursor-pointer">
            <Shuffle size={16} />
          </button>
          <button onClick={() => window.dispatchEvent(new Event('open-ai-chat'))} className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-purple-600/30 backdrop-blur-md border border-purple-500/30 flex items-center justify-center text-purple-400 hover:bg-purple-600 hover:text-white hover:scale-110 active:scale-95 hover:shadow-[0_0_15px_rgba(147,51,234,0.6)] transition-all duration-300 cursor-pointer">
            <Bot size={16} />
          </button>
        </div>
      </div>
      )}

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl h-full -mt-16">
        {children}
      </main>
      
      {showNotifications && (
         <NotificationsModal 
           onClose={() => setShowNotifications(false)} 
           onNavigate={(route, params) => {
             setShowNotifications(false);
             onNavigateTo(route, params);
           }}
         />
      )}

      {/* Backdropped Floating Bottom Nav */}
      <div className={`fixed bottom-4 left-0 right-0 mx-auto w-[calc(100%-2rem)] max-w-[410px] sm:max-w-md md:max-w-lg lg:max-w-xl bg-black/85 backdrop-blur-xl border border-white/10 rounded-2xl py-2 px-3 shadow-[0_10px_40px_rgba(0,0,0,0.85)] z-50 transition-all duration-300 ${
        showNav ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'
      }`}>
        <div className="flex justify-between items-center w-full">
          {[
            { id: 'home', icon: Home, label: 'الرئيسية' },
            { id: 'watch', icon: PlaySquare, label: 'الأنمي' },
            { id: 'community', icon: Swords, label: 'مجتمع' },
            { id: 'lists', icon: Bookmark, label: 'قائمتي' },
            { id: 'more', icon: MoreHorizontal, label: 'المزيد' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'more') {
                     // Can open a modal or do something else. For now it triggers 'more'
                     setActiveTab(tab.id);
                  } else {
                     setActiveTab(tab.id);
                  }
                }}
                className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all duration-300 flex-1 ${
                  isActive ? 'text-blue-400 scale-110 drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <Icon strokeWidth={isActive ? 2.5 : 2} size={isActive? 24 : 22} className="mb-1 transition-all" />
                <span className={`text-[9px] font-bold transition-all ${isActive ? 'opacity-100' : 'opacity-0 h-0 hidden'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
