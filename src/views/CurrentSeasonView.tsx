import React, { useEffect, useState } from 'react';
import { ChevronRight, PlayCircle, Star, Tv } from 'lucide-react';

export default function CurrentSeasonView({ onBack, onAnimeClick }: { onBack: () => void, onAnimeClick: (id: string) => void }) {
  const [animeList, setAnimeList] = useState<any[]>(() => {
    try {
      const cached = sessionStorage.getItem('client_dashboard_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.currentSeason || [];
      }
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(() => {
    try {
      return !sessionStorage.getItem('client_dashboard_cache');
    } catch {
      return true;
    }
  });

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data?.currentSeason) {
          setAnimeList(d.data.currentSeason);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-neutral-900 rounded-full hover:bg-neutral-800 transition">
            <ChevronRight size={20} />
          </button>
          <h1 className="font-black text-lg md:text-xl">أنميات الموسم الحالي</h1>
        </div>
      </div>
      
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-7xl mx-auto">
        {loading ? (
          [...Array(10)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-neutral-900 rounded-2xl animate-pulse border border-neutral-800"></div>
          ))
        ) : animeList.length > 0 ? (
          animeList.map((anime: any, idx: number) => (
            <div 
              key={`current-${anime._id}-${idx}`} 
              onClick={() => onAnimeClick(anime._id)}
              className="cursor-pointer relative rounded-2xl overflow-hidden group border border-neutral-800 hover:border-purple-500/50 transition-all duration-300 aspect-[3/4] bg-neutral-900"
            >
              <img src={anime.posterUrl || 'https://via.placeholder.com/200x300?text=Anime'} loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500" alt="poster" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-3 pointer-events-none">
                <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded text-xs font-bold shadow-lg flex items-center gap-1"><Star size={10} className="text-yellow-400" /> {anime.rating || 'N/A'}</span>
                <span className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-lg flex items-center gap-1"><Tv size={10} /> جديد</span>
                <h5 className="font-bold text-sm text-white drop-shadow line-clamp-2 text-right dir-rtl">{anime.title}</h5>
                <p className="text-[10px] text-neutral-300 mt-1 line-clamp-1 text-right">{anime.genres?.join(', ')}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-neutral-500">
            لا تتوفر أنميات للموسم الحالي
          </div>
        )}
      </div>
    </div>
  );
}
