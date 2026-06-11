import { Play, Star, Bell, Search, UserCircle, RefreshCw, ChevronLeft, CalendarDays, Flame, Film, Clapperboard, Quote, Bot, Dices, Tv, Sparkles, Crown, Zap, X, Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import NotificationsModal from '../components/NotificationsModal';
import { clientCache } from '../utils/clientCache';
import { moderationService } from '../services/moderationService';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../firebaseUtils';

interface HomeViewProps {
  onAnimeClick?: (animeId: string) => void;
  onNavigateToGames?: () => void;
  onSearchCategory?: (category: string) => void;
  onNavigateToSchedule?: (targetDay?: string) => void;
  onNavigateToRecent?: () => void;
  onNavigateToSeason?: () => void;
}

export default function HomeView({ onAnimeClick, onNavigateToGames, onSearchCategory, onNavigateToSchedule, onNavigateToRecent, onNavigateToSeason }: HomeViewProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // VIP and High Traffic Simulator Active States
  const [showVipModal, setShowVipModal] = useState(false);
  const [isVipActivated, setIsVipActivated] = useState(() => {
    try {
      return localStorage.getItem('isUserVIP') === 'true';
    } catch {
      return false;
    }
  });
  const [activeUsersCount, setActiveUsersCount] = useState(14208); // Real simulated active users on custom socket pools

  useEffect(() => {
    const int = setInterval(() => {
      setActiveUsersCount(prev => prev + Math.floor(Math.random() * 7) - 3);
    }, 5000);
    return () => clearInterval(int);
  }, []);
  const [dashboard, setDashboard] = useState<{ top5: any[], recentEpisodes: any[], popular: any[], currentSeason: any[], schedule: any[] }>(() => {
    return clientCache.get<{ top5: any[], recentEpisodes: any[], popular: any[], currentSeason: any[], schedule: any[] }>('client_dashboard_cache') || { top5: [], recentEpisodes: [], popular: [], currentSeason: [], schedule: [] };
  });
  const [loading, setLoading] = useState(() => {
    return !clientCache.get('client_dashboard_cache');
  });
  const [history, setHistory] = useState<any[]>([]);
  const [sliderSettings, setSliderSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('adminSliderSettings') || '{"limit": 5, "season": "auto", "speed": 3, "globalAnnouncement": ""}');
    } catch (e) {
      return { limit: 5, season: 'auto', speed: 3, globalAnnouncement: '' };
    }
  });
  
  const sliderRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const fetchDashboard = async (customSeason?: string) => {
    setIsRefreshing(true);
    try {
      const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const clientDay = daysMap[new Date().getDay()];
      const activeSeason = customSeason || sliderSettings.season || 'auto';
      
      await clientCache.fetchWithRevalidate(
        `client_dashboard_cache_${activeSeason}_${clientDay}`,
        `/api/dashboard?day=${clientDay}&season=${activeSeason}`,
        (data) => {
          setDashboard(data);
          setLoading(false);
        },
        15 * 60 * 1000 // 15 mins client cache TTL
      );
    } catch (e) {
      console.error(e);
    }
    setIsRefreshing(false);
    setLoading(false);
  };

  useEffect(() => {
    // Real-time listener for slider configurations so they apply instantly to all active devices!
    const unsub = onSnapshot(doc(db, 'globalSettings', 'slider'), (snap) => {
      if (snap.exists()) {
        const fireConfigs = snap.data();
        setSliderSettings(fireConfigs);
        localStorage.setItem('adminSliderSettings', JSON.stringify(fireConfigs));
        // Trigger dashboard reload if the season has changed dynamically!
        fetchDashboard(fireConfigs.season || 'auto');
      } else {
        fetchDashboard('auto');
      }
    }, (err) => {
      console.error("Failed to query real-time slider configs:", err);
      fetchDashboard();
      try {
        handleFirestoreError(err, OperationType.GET, 'globalSettings/slider');
      } catch (e) {
        // Log formatted error or handle cleanly
      }
    });

    try {
      const saved = JSON.parse(localStorage.getItem('animeHistory') || '[]');
      setHistory(saved.slice(0, 5));
    } catch (e) {}

    return () => {
      unsub();
    };
  }, []);

  // Slider auto-scroll logic
  useEffect(() => {
    const top5Count = dashboard.top5?.length || 0;
    if (top5Count === 0) return;
    
    // Auto speed interval seconds
    const intervalTime = (sliderSettings.speed || 3) * 1000;

    const interval = setInterval(() => {
       setCurrentSlide(prev => {
          const topVisibleLimit = Math.min(top5Count, sliderSettings.limit || 5);
          return (prev + 1) % topVisibleLimit;
       });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [dashboard.top5, sliderSettings]);

  const categories = ['أكشن', 'شريحة من الحياة', 'إيسيكاي', 'رومانسي', 'كوميدي', 'خيال علمي', 'رياضي', 'شونين', 'غموض'];

  return (
    <div className="pb-8 space-y-4 md:space-y-6">
      {/* Global alert banner if configured by admins */}
      {sliderSettings.globalAnnouncement && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 md:mx-8 p-3 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 border border-purple-500/15 rounded-2xl flex items-center gap-2.5 text-xs text-purple-200 justify-center font-bold text-center leading-relaxed"
        >
          <Sparkles size={14} className="text-pink-400 animate-pulse shrink-0" />
          <span>{sliderSettings.globalAnnouncement}</span>
        </motion.div>
      )}

      {/* 2. Top Banner Slider */}
      {dashboard.top5 && dashboard.top5.length > 0 ? (
        <section className="relative overflow-hidden w-full select-none" id="home_hero_slider">
          <motion.div 
            drag="x"
            dragElastic={0.2}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(e, info) => {
              const top5Count = dashboard.top5?.length || 0;
              const topVisibleLimit = Math.min(top5Count, sliderSettings.limit || 5);
              const swipeThreshold = 50;
              if (info.offset.x < -swipeThreshold && currentSlide < topVisibleLimit - 1) {
                setCurrentSlide(prev => prev + 1);
              } else if (info.offset.x > swipeThreshold && currentSlide > 0) {
                setCurrentSlide(prev => prev - 1);
              }
            }}
            animate={{ x: `-${currentSlide * 100}%` }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
            className="flex w-full cursor-grab active:cursor-grabbing"
            dir="ltr"
          >
            {dashboard.top5.slice(0, sliderSettings.limit || 5).map((anime: any, idx: number) => (
              <div 
                key={`top5-${anime._id}-${idx}`}
                onClick={() => onAnimeClick?.(anime._id)}
                className="w-full flex-[0_0_100%] cursor-pointer relative aspect-[4/5] sm:aspect-[16/9] md:aspect-[21/9] group"
                dir="rtl"
              >
                <img src={anime.posterUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop'} referrerPolicy="no-referrer" className="w-full h-full object-cover pointer-events-none" alt={anime.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-6 md:p-12 pb-10">
                  <div className="w-full max-w-5xl mx-auto flex flex-col gap-3">
                    <span className="self-start bg-yellow-500 text-black text-xs md:text-sm font-black px-3 py-1 rounded-full shadow-lg border border-yellow-400">
                      #{idx + 1} الأفضل
                    </span>
                    <h4 className="text-3xl md:text-5xl text-white font-black drop-shadow-lg truncate">{anime.title}</h4>
                    <div className="flex items-center gap-3">
                      <span className="text-sm bg-black/50 backdrop-blur text-yellow-400 px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                        <Star size={14} fill="currentColor"/> {anime.rating || 0}
                      </span>
                      <span className="text-sm text-neutral-200 drop-shadow-md font-bold">{anime.genres?.[0] || 'أنمي'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Dots indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-40">
            {dashboard.top5.slice(0, sliderSettings.limit || 5).map((_, idx) => (
              <button
                key={idx}
                id={`slider_dot_${idx}`}
                onClick={(e) => { e.stopPropagation(); setCurrentSlide(idx); }}
                className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${currentSlide === idx ? 'bg-purple-500 w-5 md:w-6' : 'bg-white/40 hover:bg-white/70'}`}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="pt-24 px-4 md:px-8">
           {!loading && <div className="p-6 rounded-3xl border border-neutral-800 bg-neutral-900/50 text-sm text-neutral-500 text-center">- لا توجد بيانات رئيسية -</div>}
           {loading && <div className="aspect-[3/4] md:aspect-[21/9] rounded-none bg-neutral-900 animate-pulse border-b border-neutral-800 w-full"></div>}
        </div>
      )}

      {/* 3. Quick Navigation / Categories */}
      <section className="px-4 md:px-8 space-y-3">
        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1 pt-1">
          {categories.map((cat, idx) => (
            <motion.button 
              key={idx} 
              onClick={() => onSearchCategory?.(cat)}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 px-4 py-2 bg-neutral-900/50 border border-neutral-800 hover:border-purple-500 hover:bg-neutral-800 hover:text-white rounded-full text-xs font-bold text-neutral-400 transition whitespace-nowrap cursor-pointer gpu-accelerated"
            >
              {cat}
            </motion.button>
          ))}
        </div>
      </section>

      {/* History (Continue Watching) */}
      {history.length > 0 && (
        <section className="px-4 md:px-8">
          <div className="flex justify-between items-end mb-3 max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-black text-lg border-r-4 border-blue-500 pr-2">متابعة المشاهدة</h3>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar max-w-7xl mx-auto">
            {history.map((item: any, idx: number) => (
              <motion.div 
                key={`history-${item.id}-${idx}`} 
                onClick={() => onAnimeClick?.(item.id)}
                whileHover={{ y: -6, scale: 1.02, borderColor: '#3b82f6' }}
                whileTap={{ scale: 0.98 }}
                className="cursor-pointer w-[160px] md:w-[220px] lg:w-[260px] flex-shrink-0 relative rounded-2xl overflow-hidden group border border-neutral-800 transition-all duration-300 aspect-[16/9] bg-neutral-900 gpu-accelerated"
              >
              <img src={item.posterUrl || 'https://via.placeholder.com/300x168?text=Anime'} referrerPolicy="no-referrer" loading="lazy" className="w-full h-full object-cover opacity-75 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" alt="poster" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <Play size={10} fill="white" className="ml-0.5 text-white" />
                    </div>
                    <span className="text-blue-300 text-[10px] font-bold">الحلقة {item.lastEpisode}</span>
                  </div>
                  <h5 className="font-bold text-xs md:text-sm text-white truncate drop-shadow">{item.title}</h5>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Latest Episodes */}
      <section className="px-4 md:px-8">
        <div className="flex justify-between items-end mb-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-black text-lg border-r-4 border-red-500 pr-2">أحدث الحلقات</h3>
            <button onClick={fetchDashboard} className={`text-neutral-400 hover:text-white transition p-1.5 rounded-full hover:bg-neutral-800 ${isRefreshing ? 'animate-spin text-purple-500' : ''}`}>
              <RefreshCw size={14} />
            </button>
          </div>
          <button onClick={onNavigateToRecent} className="text-[10px] md:text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-1 group">
            عرض الكل <ChevronLeft size={14} className="transition-transform group-hover:-translate-x-1" />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar max-w-7xl mx-auto items-stretch">
          {dashboard.recentEpisodes && dashboard.recentEpisodes.length > 0 ? dashboard.recentEpisodes.map((ep: any, idx: number) => (
            <motion.div 
              key={`recent-${ep._id}-${idx}`} 
              onClick={() => onAnimeClick?.(`search-${ep.animeId?.title || ep.title || 'unknown'}`)}
              whileHover={{ y: -6, scale: 1.02, borderColor: '#ef4444' }}
              whileTap={{ scale: 0.98 }}
              className="cursor-pointer w-[130px] md:w-[180px] lg:w-[220px] flex-shrink-0 relative rounded-2xl overflow-hidden group border border-neutral-800 transition-all duration-300 aspect-[3/4] bg-neutral-900 gpu-accelerated"
            >
              <img 
                src={ep.animeId?.posterUrl || ep.thumbnailUrl || ep.animeId?.thumbnailUrl || 'https://via.placeholder.com/200x300?text=Anime'} 
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src && target.src.includes('-poster.')) {
                    target.src = target.src.replace('-poster.', '-thumbnail.');
                  }
                }}
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-full h-full object-cover opacity-100 group-hover:scale-[1.03] transition-all duration-500" 
                alt="poster" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-3 pointer-events-none">
                <span className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-lg flex items-center gap-1"><Tv size={10} /> جديد</span>
                <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-lg flex items-center gap-1">حلقة {ep.episodeNumber || '1'}</span>
                <h5 className="font-bold text-xs md:text-sm text-white drop-shadow line-clamp-2 text-right dir-rtl">{ep.animeId?.title || 'أنمي غير معروف'}</h5>
              </div>
            </motion.div>
          )) : (
            !loading && <div className="text-sm text-neutral-500 w-full py-8 text-center">- لا يوجد حلقات جديدة -</div>
          )}
          {loading && [1,2,3,4,5].map(i => <div key={i} className="w-[130px] md:w-[180px] lg:w-[220px] flex-shrink-0 aspect-[3/4] bg-neutral-900 rounded-2xl border border-neutral-800 animate-pulse"></div>)}
        </div>
      </section>

      {/* 5. Popular */}
      <section className="px-4 md:px-8">
        <div className="flex justify-between items-end mb-3 max-w-7xl mx-auto">
          <h3 className="text-white font-black text-lg border-r-4 border-yellow-500 pr-2">الأكثر شعبية</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar max-w-7xl mx-auto">
          {dashboard.popular && dashboard.popular.length > 0 ? dashboard.popular.map((anime: any, idx: number) => (
            <motion.div 
              key={`popular-${anime._id}-${idx}`} 
              onClick={() => onAnimeClick?.(anime._id)}
              whileHover={{ y: -6, scale: 1.02, borderColor: '#eab308' }}
              whileTap={{ scale: 0.98 }}
              className="cursor-pointer w-[130px] md:w-[180px] lg:w-[220px] flex-shrink-0 relative rounded-2xl overflow-hidden group border border-neutral-800 transition-all duration-300 aspect-[3/4] bg-neutral-900 gpu-accelerated"
            >
              <img src={anime.posterUrl || 'https://via.placeholder.com/200x300?text=Anime'} referrerPolicy="no-referrer" loading="lazy" className="w-full h-full object-cover opacity-95 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" alt="poster" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-3 pointer-events-none">
                <h5 className="font-bold text-xs md:text-sm text-white truncate drop-shadow text-center">{anime.title}</h5>
              </div>
            </motion.div>
          )) : (
            !loading && <div className="text-sm text-neutral-500 w-full py-8 text-center">- لا يوجد بيانات -</div>
          )}
          {loading && [1,2,3,4,5,6].map(i => <div key={i} className="w-[130px] md:w-[180px] lg:w-[220px] flex-shrink-0 aspect-[3/4] bg-neutral-900 rounded-2xl border border-neutral-800 animate-pulse"></div>)}
        </div>
      </section>

      {/* 6. Current Season */}
      <section className="px-4 md:px-8">
        <div className="flex justify-between items-end mb-3 max-w-7xl mx-auto">
          <h3 className="text-white font-black text-lg border-r-4 border-purple-500 pr-2">انميات الموسم الحالي</h3>
          <button onClick={onNavigateToSeason} className="text-[10px] md:text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-1 group">
            عرض الكل <ChevronLeft size={14} className="transition-transform group-hover:-translate-x-1" />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar max-w-7xl mx-auto">
          {dashboard.currentSeason && dashboard.currentSeason.length > 0 ? dashboard.currentSeason.map((anime: any, idx: number) => (
            <motion.div 
              key={`current-${anime._id}-${idx}`} 
              onClick={() => onAnimeClick?.(anime._id)}
              whileHover={{ y: -6, scale: 1.02, borderColor: '#a855f7' }}
              whileTap={{ scale: 0.98 }}
              className="cursor-pointer w-[130px] md:w-[180px] lg:w-[220px] flex-shrink-0 relative rounded-2xl overflow-hidden group border border-neutral-800 transition-all duration-300 aspect-[3/4] bg-neutral-900 gpu-accelerated"
            >
              <img src={anime.posterUrl || 'https://via.placeholder.com/200x300?text=Anime'} referrerPolicy="no-referrer" loading="lazy" className="w-full h-full object-cover opacity-95 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500" alt="poster" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-3 pointer-events-none">
                <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded text-[10px] font-bold shadow-lg flex items-center gap-1"><Star size={10} className="text-yellow-400" /> {anime.rating || 'N/A'}</span>
                <span className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-lg flex items-center gap-1"><Tv size={10} /> جديد</span>
                <h5 className="font-bold text-xs md:text-sm text-white drop-shadow line-clamp-2 text-right dir-rtl">{anime.title}</h5>
              </div>
            </motion.div>
          )) : (
            !loading && <div className="text-sm text-neutral-500 w-full py-6 text-center">- لا يوجد بيانات -</div>
          )}
          {loading && [1,2,3,4,5,6].map(i => <div key={i} className="w-[130px] md:w-[180px] lg:w-[220px] flex-shrink-0 aspect-[3/4] bg-neutral-900 rounded-2xl border border-neutral-800 animate-pulse"></div>)}
        </div>
      </section>

      {/* Schedule */}
      <section className="px-4 md:px-8">
        <div className="flex justify-between items-end mb-3 max-w-7xl mx-auto border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <h3 
              className="text-white font-black text-lg border-r-4 border-blue-500 pr-2 cursor-pointer hover:text-blue-400 transition flex items-center gap-1.5"
              onClick={() => {
                const d = new Date().getDay();
                const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                onNavigateToSchedule?.(map[d]);
              }}
            >
              يعرض اليوم ({['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][new Date().getDay()]})
            </h3>
          </div>
          <button 
            onClick={() => {
              const d = new Date().getDay();
              const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
              onNavigateToSchedule?.(map[d]);
            }}
            className="text-[10px] md:text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-500/20"
          >
            عرض المزيد بالجدول <ChevronLeft size={14} />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar max-w-7xl mx-auto">
          {dashboard.schedule && dashboard.schedule.length > 0 ? dashboard.schedule.map((anime: any, idx: number) => (
            <motion.div 
              key={`schedule-${anime._id}-${idx}`} 
              onClick={() => onAnimeClick?.(`search-${anime.title}`)}
              whileHover={{ y: -6, scale: 1.02, borderColor: '#3b82f6' }}
              whileTap={{ scale: 0.98 }}
              className="cursor-pointer w-[130px] md:w-[180px] lg:w-[220px] flex-shrink-0 relative rounded-2xl overflow-hidden group border border-neutral-800 transition-all duration-300 aspect-[3/4] bg-neutral-900 gpu-accelerated"
            >
              <img src={anime.posterUrl || 'https://via.placeholder.com/200x300?text=Anime'} referrerPolicy="no-referrer" loading="lazy" className="w-full h-full object-cover opacity-95 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" alt="poster" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-3 pointer-events-none">
                <h5 className="font-bold text-xs md:text-sm text-white truncate drop-shadow text-center">{anime.title}</h5>
              </div>
            </motion.div>
          )) : (
            !loading && <div className="text-sm text-neutral-500 w-full py-6 text-center">- لا يوجد بيانات مواعيد لليوم -</div>
          )}
          {loading && [1,2,3,4,5,6].map(i => <div key={i} className="w-[130px] md:w-[180px] lg:w-[220px] flex-shrink-0 aspect-[3/4] bg-neutral-900 rounded-2xl border border-neutral-800 animate-pulse"></div>)}
        </div>
      </section>

      {/* Social Indicator Banner */}
      <section className="px-4 md:px-8 max-w-7xl mx-auto" id="social_indicator_banner">
        <div className="bg-gradient-to-r from-neutral-900 to-zinc-950 border border-neutral-900 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-right">
            <h4 className="text-white text-xs font-black">أكبر مجتمع أوتاكو عربي تفاعلي والسرعة رقم #1 ⚡</h4>
            <p className="text-[10px] text-neutral-500 mt-1">تصفّح وشاهد الأنمي مع آلاف المتابعين الآن بأحدث التقنيات وبشكل مجاني بالكامل.</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 text-xs font-bold leading-none">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>نشط الآن: <strong className="font-extrabold font-mono text-white">{activeUsersCount.toLocaleString()}</strong> أوتاكو متصل</span>
          </div>
        </div>
      </section>

      {/* 7. Quotes Section */}
      <section className="px-4 md:px-8 pb-4">
        <div className="bg-gradient-to-br from-neutral-900 to-black border border-neutral-800 rounded-3xl p-6 md:p-8 relative overflow-hidden group cursor-pointer hover:border-purple-500/50 transition-all duration-300 shadow-xl max-w-4xl mx-auto">
          <Quote className="absolute top-4 left-4 md:top-6 md:left-6 text-neutral-800 opacity-30 rotate-180 group-hover:scale-110 group-hover:opacity-40 transition-all duration-500" size={80} />
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="bg-purple-600/20 text-purple-400 text-[10px] md:text-xs font-black px-2 py-1 rounded border border-purple-500/20">اقتباس انمي MOD</span>
            </div>
            <p className="text-sm md:text-xl md:leading-relaxed font-bold text-white leading-relaxed max-w-xl">
              "النجاح لا يأتي لمن ينتظر، بل لمن يعمل بشغف ولا يستسلم."
            </p>
            <div className="flex justify-between items-end mt-2 md:mt-4">
              <div>
                <p className="text-xs md:text-sm text-yellow-500 font-bold mb-1">غير معروف</p>
              </div>
              <button onClick={() => onNavigateToGames?.()} className="text-xs md:text-sm bg-neutral-800 hover:bg-neutral-700 text-white font-bold px-3 py-2 md:px-4 md:py-2.5 rounded-xl flex items-center gap-1.5 transition-colors">
                ألعاب الأنمي <Dices size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
