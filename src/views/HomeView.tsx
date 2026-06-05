import { Play, Star, Bell, Search, UserCircle, RefreshCw, ChevronLeft, CalendarDays, Flame, Film, Clapperboard, Quote, Bot, Dices, Tv } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import NotificationsModal from '../components/NotificationsModal';

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
  const [dashboard, setDashboard] = useState<{ top5: any[], recentEpisodes: any[], popular: any[], currentSeason: any[], schedule: any[] }>(() => {
    try {
      const cached = sessionStorage.getItem('client_dashboard_cache');
      return cached ? JSON.parse(cached) : { top5: [], recentEpisodes: [], popular: [], currentSeason: [], schedule: [] };
    } catch {
      return { top5: [], recentEpisodes: [], popular: [], currentSeason: [], schedule: [] };
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      return !sessionStorage.getItem('client_dashboard_cache');
    } catch {
      return true;
    }
  });
  const [history, setHistory] = useState<any[]>([]);
  
  const sliderRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const fetchDashboard = async () => {
    setIsRefreshing(true);
    try {
      const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const clientDay = daysMap[new Date().getDay()];
      const res = await fetch(`/api/dashboard?day=${clientDay}`);
      const json = await res.json();
      if (json.success) {
        setDashboard(json.data);
        try {
          sessionStorage.setItem('client_dashboard_cache', JSON.stringify(json.data));
        } catch (e) {}
      }
    } catch (e) {
      console.error(e);
    }
    setIsRefreshing(false);
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
    try {
      const saved = JSON.parse(localStorage.getItem('animeHistory') || '[]');
      setHistory(saved.slice(0, 5));
    } catch (e) {}
  }, []);

  // Slider auto-scroll logic
  useEffect(() => {
    if (!dashboard.top5 || dashboard.top5.length === 0) return;
    
    const settings = JSON.parse(localStorage.getItem('adminSliderSettings') || '{"limit": 5, "season": "auto"}');
    const intervalTime = (settings.interval || 2) * 1000;

    const interval = setInterval(() => {
       setCurrentSlide(prev => {
          const next = (prev + 1) % dashboard.top5.length;
          if (sliderRef.current) {
            const childWidth = sliderRef.current.children[0]?.clientWidth || 0;
            sliderRef.current.scrollTo({ left: -(next * childWidth), behavior: 'smooth' });
          }
          return next;
       });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [dashboard.top5]);

  const categories = ['أكشن', 'شريحة من الحياة', 'إيسيكاي', 'رومانسي', 'كوميدي', 'خيال علمي', 'رياضي', 'شونين', 'غموض'];

  return (
    <div className="pb-8 space-y-4 md:space-y-6">
      {/* 2. Top Banner Slider */}
      {dashboard.top5 && dashboard.top5.length > 0 ? (
        <section className="relative">
          <div ref={sliderRef} className="flex overflow-x-hidden snap-x snap-mandatory scroll-smooth" dir="rtl">
            {dashboard.top5.map((anime: any, idx: number) => (
              <div 
                key={`top5-${anime._id}-${idx}`}
                onClick={() => onAnimeClick?.(anime._id)}
                className="w-full flex-[0_0_100%] snap-center cursor-pointer relative aspect-[4/5] sm:aspect-[16/9] md:aspect-[21/9] group"
              >
                <img src={anime.posterUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop'} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt={anime.title} />
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
