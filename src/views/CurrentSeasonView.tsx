import React, { useEffect, useState } from 'react';
import { ChevronRight, PlayCircle, Star, Tv, Calendar, RefreshCw } from 'lucide-react';
import { clientCache } from '../utils/clientCache';
import { LongPressCopy } from '../components/LongPressCopy';

const SEASONS = [
  { value: 'now', label: 'الموسم الحالي' },
  { value: 'winter', label: 'شتاء' },
  { value: 'spring', label: 'ربيع' },
  { value: 'summer', label: 'صيف' },
  { value: 'fall', label: 'خريف' }
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => currentYear - i);

export default function CurrentSeasonView({ onBack, onAnimeClick }: { onBack: () => void, onAnimeClick: (id: string) => void }) {
  const [selectedSeason, setSelectedSeason] = useState('now');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [animeList, setAnimeList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch season data
  const loadSeasonData = (season: string, year: number) => {
    setLoading(true);
    let url = '/api/anime/season';
    if (season !== 'now') {
      url += `?year=${year}&season=${season}`;
    }

    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setAnimeList(d.data);
        } else {
          setAnimeList([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading seasonal anime:", err);
        setAnimeList([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadSeasonData(selectedSeason, selectedYear);
  }, [selectedSeason, selectedYear]);

  return (
    <div className="min-h-screen bg-black text-white pb-24" id="current_season_container">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button id="season_back_btn" onClick={onBack} className="p-2 bg-neutral-900 rounded-full hover:bg-neutral-800 transition">
            <ChevronRight size={20} />
          </button>
          <div>
            <h1 className="font-black text-lg md:text-xl">تصفح المواسم والأرشيف</h1>
            <p className="text-[10px] text-neutral-400 mt-0.5">يتم تحديث الفترات باستمرار بداية كل أسبوع</p>
          </div>
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2">
          {/* Season Selector */}
          <div className="relative flex-1 md:flex-initial">
            <select
              id="season_select_dropdown"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="w-full md:w-44 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-500 cursor-pointer appearance-none text-right pr-8"
              style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'left 8px center', backgroundSize: '12px' }}
            >
              {SEASONS.map(s => (
                <option key={s.value} value={s.value} className="bg-neutral-900 text-white font-bold">{s.label}</option>
              ))}
            </select>
          </div>

          {/* Year Selector (Only active if not "now" / live season) */}
          {selectedSeason !== 'now' && (
            <div className="relative flex-1 md:flex-initial">
              <select
                id="year_select_dropdown"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full md:w-32 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-500 cursor-pointer appearance-none text-right pr-8"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'left 8px center', backgroundSize: '12px' }}
              >
                {YEARS.map(y => (
                  <option key={y} value={y} className="bg-neutral-900 text-white font-bold">{y}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      
      {/* Anime Grid */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-7xl mx-auto">
        {loading ? (
          [...Array(10)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-neutral-900 rounded-2xl animate-pulse border border-neutral-800"></div>
          ))
        ) : animeList.length > 0 ? (
          animeList.map((anime: any, idx: number) => (
            <div 
              key={`seasonal-${anime._id}-${idx}`} 
              onClick={() => onAnimeClick(anime._id)}
              className="cursor-pointer relative rounded-2xl overflow-hidden group border border-neutral-800 hover:border-purple-500/50 transition-all duration-300 aspect-[3/4] bg-neutral-900 hover:shadow-lg hover:shadow-purple-500/10"
            >
              <img src={anime.posterUrl || 'https://via.placeholder.com/200x300?text=Anime'} loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500" alt="poster" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-3 pointer-events-none">
                <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded text-xs font-bold shadow-lg flex items-center gap-1"><Star size={10} className="text-yellow-400" /> {anime.rating || 'N/A'}</span>
                {selectedSeason === 'now' && (
                  <span className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-lg flex items-center gap-1"><Tv size={10} /> جديد</span>
                )}
                
                {/* Wrap Title in LongPressCopy element so long pressing copies it */}
                <h5 className="font-bold text-sm text-white drop-shadow line-clamp-2 text-right dir-rtl select-text pointer-events-auto">
                  <LongPressCopy text={anime.title} className="hover:text-purple-300 transition-colors">
                    {anime.title}
                  </LongPressCopy>
                </h5>
                <p className="text-[10px] text-neutral-300 mt-1 line-clamp-1 text-right">{anime.genres?.join(', ')}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-neutral-500 flex flex-col items-center justify-center gap-3">
            <Calendar size={48} className="text-neutral-700" />
            <span>لا تتوفر أنميات للموسم المحدد حالياً</span>
          </div>
        )}
      </div>
    </div>
  );
}
