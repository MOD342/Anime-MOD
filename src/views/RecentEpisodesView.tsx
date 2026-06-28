import React, { useEffect, useState } from 'react';
import { ChevronRight, PlayCircle, Star, Tv } from 'lucide-react';
import { clientCache } from '../utils/clientCache';

export default function RecentEpisodesView({ onBack, onAnimeClick }: { onBack: () => void, onAnimeClick: (id: string, epNum?: string) => void }) {
  const [episodes, setEpisodes] = useState<any[]>(() => {
    const cached = clientCache.get<any>('client_dashboard_cache');
    return cached?.recentEpisodes || [];
  });
  const [loading, setLoading] = useState(() => {
    return !clientCache.get('client_dashboard_cache');
  });

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data?.recentEpisodes) {
          setEpisodes(d.data.recentEpisodes);
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
          <h1 className="font-black text-lg md:text-xl">أحدث الحلقات</h1>
        </div>
      </div>
      
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-7xl mx-auto">
        {loading ? (
          [...Array(12)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-neutral-900 rounded-2xl animate-pulse border border-neutral-800"></div>
          ))
        ) : episodes.length > 0 ? (
          episodes.map((ep: any, idx: number) => (
            <div 
              key={`recent-${ep._id}-${idx}`} 
              onClick={() => onAnimeClick(`search-${ep.animeId?.title || ep.title || 'unknown'}`, ep.episodeNumber?.toString())}
              className="cursor-pointer relative rounded-2xl overflow-hidden group border border-neutral-800 hover:border-red-500/50 transition-all duration-300 aspect-[3/4] bg-neutral-900"
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
                <div className="absolute top-2 left-2 right-2 flex justify-between items-center gap-1 flex-wrap">
                  <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-lg flex items-center gap-1 shrink-0">مترجم</span>
                  <span className="bg-black/60 backdrop-blur-md text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-lg flex items-center gap-1 shrink-0">حلقة {ep.episodeNumber || '1'}</span>
                </div>
                <h5 className="font-bold text-sm text-white drop-shadow line-clamp-2 text-right dir-rtl">{ep.animeId?.title || 'أنمي غير معروف'}</h5>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-neutral-500">
            لا توجد حلقات حديثة متاحة حالياً
          </div>
        )}
      </div>
    </div>
  );
}
