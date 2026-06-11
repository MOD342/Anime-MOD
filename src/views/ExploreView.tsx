import { useState, useEffect, useRef } from 'react';
import { Search, Filter, Star, Loader2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LongPressCopy } from '../components/LongPressCopy';

const GENRE_ARABIC_MAP: Record<string, string> = {
  'Action': 'أكشن ⚔️',
  'Adventure': 'مغامرات 🗺️',
  'Comedy': 'كوميديا 🎭',
  'Drama': 'دراما 😭',
  'Fantasy': 'خيالي 🦄',
  'Romance': 'رومانسي 💕',
  'Sci-Fi': 'خيال علمي 🚀',
  'Slice of Life': 'شريحة من الحياة 🌸',
  'Supernatural': 'قوى خارقة 🔮',
  'Suspense': 'إثارة ⏳',
  'Mystery': 'غموض 🔍',
  'Sports': 'رياضة ⚽',
  'Horror': 'رعب 👻',
  'Gourmet': 'طهي وطعام 🍜',
  'Award Winning': 'حائز على جوائز 🏆',
  'Boys Love': 'رومانسية شباب',
  'Girls Love': 'رومانسية فتيات',
  'Ecchi': 'إيتشي 🔞',
  'Avant Garde': 'طليعي / غريب 🎨',
  'Erotica': 'عمل للبالغين 🔞',
  'Hentai': 'محتوى للبالغين 🔞',
  'Workplace': 'بيئة عمل 💼'
};

interface ExploreViewProps {
  onAnimeClick: (id: string) => void;
  initialQuery?: string;
}

const CustomSelect = ({ label, value, options, onChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((o: any) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <h3 className="text-xs font-bold text-neutral-400 mb-2">{label}</h3>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-white rounded-lg py-2.5 px-3 flex items-center justify-between text-sm font-bold transition-colors"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : 'الكل'}</span>
        <ChevronDown size={14} className={`text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            className="absolute top-[full] mt-1 left-0 right-0 max-h-48 overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl shadow-black z-50 hide-scrollbar"
          >
            {options.map((opt: any) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`w-full text-right px-3 py-2.5 text-sm font-bold transition-colors ${value === opt.value ? 'bg-purple-600 text-white' : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'}`}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function ExploreView({ onAnimeClick, initialQuery }: ExploreViewProps) {
  const [query, setQuery] = useState(initialQuery || '');
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery || '');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  
  const [showFilters, setShowFilters] = useState(false);
  const [genres, setGenres] = useState<{mal_id: number, name: string}[]>([]);
  
  // Persisted state
  const [selectedGenres, setSelectedGenres] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('animeSelectedGenres') || '[]'); } catch { return []; }
  });
  const [minScore, setMinScore] = useState(() => localStorage.getItem('animeMinScore') || '');
  const [status, setStatus] = useState(() => localStorage.getItem('animeStatus') || '');
  const [year, setYear] = useState(() => localStorage.getItem('animeYear') || '');
  const [orderBy, setOrderBy] = useState(() => localStorage.getItem('animeOrderBy') || '');
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem('animeSortOrder') || 'desc');

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('animeSelectedGenres', JSON.stringify(selectedGenres));
    localStorage.setItem('animeMinScore', minScore);
    localStorage.setItem('animeStatus', status);
    localStorage.setItem('animeYear', year);
    localStorage.setItem('animeOrderBy', orderBy);
    localStorage.setItem('animeSortOrder', sortOrder);
  }, [selectedGenres, minScore, status, year, orderBy, sortOrder]);

  // Fetch genres
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('client_genres_cache');
      if (cached) {
        setGenres(JSON.parse(cached));
      }
    } catch {}

    fetch('/api/anime/genres')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setGenres(data.data);
          try {
            sessionStorage.setItem('client_genres_cache', JSON.stringify(data.data));
          } catch (e) {}
        }
      });
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch results based on filters & query
  useEffect(() => {
    fetchResults(true);
  }, [debouncedQuery, selectedGenres, minScore, status, year, orderBy, sortOrder]);

  const fetchResults = async (reset: boolean = false) => {
    const currentPage = reset ? 1 : page + 1;
    let url = `/api/anime/search?page=${currentPage}`;
    if (debouncedQuery) url += `&q=${encodeURIComponent(debouncedQuery)}`;
    if (selectedGenres.length > 0) url += `&genres=${selectedGenres.join(',')}`;
    if (minScore) url += `&min_score=${minScore}`;
    if (status) url += `&status=${status}`;
    if (year) url += `&year=${year}`;
    if (orderBy) url += `&order_by=${orderBy}`;
    if (sortOrder) url += `&sort=${sortOrder}`;

    let hasCached = false;
    if (reset) {
      try {
        const cached = sessionStorage.getItem(`client_explore_results_${url}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setResults(parsed.data || []);
          setHasNextPage(parsed.hasNextPage ?? false);
          setLoading(false);
          hasCached = true;
        } else {
          setLoading(true);
        }
      } catch (e) {
        setLoading(true);
      }
      setPage(1);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        if (reset) {
          setResults(data.data);
          try {
            sessionStorage.setItem(`client_explore_results_${url}`, JSON.stringify({
              data: data.data,
              hasNextPage: data.pagination?.has_next_page || false
            }));
          } catch (e) {}
        } else {
          setResults(prev => [...prev, ...data.data]);
        }
        setHasNextPage(data.pagination?.has_next_page || false);
        if (!reset) setPage(currentPage);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const toggleGenre = (id: number) => {
    setSelectedGenres(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  return (
    <div className="pt-8 pb-32 px-4 md:px-8 space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header & Search Bar */}
        <div className="sticky top-0 z-30 pt-4 pb-4 bg-black/98 backdrop-blur-3xl border-b border-white/5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-xl font-black text-white">استكشف الأنمي</h1>
          </div>

          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
              <input 
                type="text" 
                placeholder="ابحث عن أنمي..." 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl py-2.5 pr-10 pl-3 focus:outline-none focus:border-purple-500/50 text-sm transition shadow-inner"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-xl transition-all border ${showFilters ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'}`}
            >
              <Filter size={18} />
            </button>
          </div>
          
          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 pb-2 space-y-6">
                  {/* Genres */}
                  <div>
                    <h3 className="text-xs font-bold text-neutral-500 mb-3 uppercase tracking-wider">التصنيفات</h3>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto hide-scrollbar">
                      {genres.map(g => (
                        <button
                          key={g.mal_id}
                          onClick={() => toggleGenre(g.mal_id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            selectedGenres.includes(g.mal_id) 
                              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' 
                              : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {GENRE_ARABIC_MAP[g.name] || g.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 relative z-40">
                    <CustomSelect 
                      label="ترتيب حسب" 
                      value={orderBy} 
                      onChange={setOrderBy}
                      options={[
                        { label: 'تلقائي', value: '' },
                        { label: 'التقييم', value: 'score' },
                        { label: 'الأبجدية', value: 'title' },
                        { label: 'العام', value: 'start_date' },
                        { label: 'الشعبية', value: 'popularity' }
                      ]}
                    />

                    <CustomSelect 
                      label="نوع الترتيب" 
                      value={sortOrder} 
                      onChange={setSortOrder}
                      options={[
                        { label: 'تنازلي', value: 'desc' },
                        { label: 'تصاعدي', value: 'asc' }
                      ]}
                    />

                    <CustomSelect 
                      label="سنة الإصدار" 
                      value={year} 
                      onChange={setYear}
                      options={[
                        { label: 'الكل', value: '' },
                        ...Array.from({length: 30}, (_, i) => new Date().getFullYear() - i).map(y => ({ label: String(y), value: String(y) }))
                      ]}
                    />

                    <CustomSelect 
                      label="الحالة" 
                      value={status} 
                      onChange={setStatus}
                      options={[
                        { label: 'الكل', value: '' },
                        { label: 'مستمر', value: 'airing' },
                        { label: 'مكتمل', value: 'complete' },
                        { label: 'قادم', value: 'upcoming' }
                      ]}
                    />
                  </div>
                  
                  {/* Reset Filters */}
                  <div className="flex justify-end pt-2 border-t border-white/5">
                    <button 
                      onClick={() => {
                        setSelectedGenres([]);
                        setStatus('');
                        setMinScore('');
                        setYear('');
                        setOrderBy('');
                        setSortOrder('desc');
                      }}
                      className="text-xs font-bold text-neutral-500 hover:text-white transition px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800"
                    >
                      إعادة الافتراضي
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results Grid */}
        <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-5">
               {[1,2,3,4,5,6,7,8,9,10].map(i => (
                 <div key={i} className="aspect-[3/4] bg-neutral-900 animate-pulse rounded-2xl border border-neutral-800"></div>
               ))}
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-5">
                {results.map((anime, idx) => (
                  <motion.div 
                    key={`search-${anime._id}-${idx}`}
                    onClick={() => onAnimeClick(anime._id)}
                    whileHover={{ scale: 1.03, y: -6, borderColor: '#a855f7' }}
                    whileTap={{ scale: 0.97 }}
                    className="cursor-pointer relative aspect-[3/4] bg-neutral-900 rounded-2xl overflow-hidden group border border-neutral-800 transition-all duration-300 gpu-accelerated"
                  >
                    <img src={anime.posterUrl || 'https://via.placeholder.com/300x400?text=Anime'} alt={anime.title} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:opacity-100 hover:scale-[1.03] transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-3 pointer-events-none">
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur text-yellow-400 px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] font-bold border border-white/10">
                        <Star size={10} fill="currentColor" /> {anime.rating || 'N/A'}
                      </div>
                      {anime.status && (
                        <div className="absolute top-2 left-2 bg-neutral-900/60 backdrop-blur text-white px-1.5 py-0.5 rounded text-[10px] font-bold border border-white/10">
                          {anime.status}
                        </div>
                      )}
                      <LongPressCopy text={anime.title}>
                        <h5 className="font-bold text-xs md:text-sm text-white truncate drop-shadow text-center pointer-events-auto">{anime.title}</h5>
                      </LongPressCopy>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Load More */}
              {hasNextPage && (
                <div className="flex justify-center mt-8">
                  <button 
                    onClick={() => fetchResults(false)}
                    disabled={loadingMore}
                    className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white font-bold py-3 px-8 rounded-xl transition flex items-center gap-2"
                  >
                    {loadingMore ? <><Loader2 size={18} className="animate-spin" /> جاري التحميل...</> : 'عرض المزيد'}
                  </button>
                </div>
              )}
            </>
          ) : (
             <div className="text-center py-20 bg-neutral-900/30 rounded-3xl border border-neutral-800/50">
               <Search className="mx-auto text-neutral-600 mb-4" size={48} />
               <h3 className="text-lg font-bold text-neutral-400 mb-1">لم يتم العثور على نتائج</h3>
               <p className="text-sm text-neutral-500">جرب البحث بكلمات أخرى أو تغيير الفلاتر</p>
             </div>
          )}
        </div>

      </div>
    </div>
  );
}
