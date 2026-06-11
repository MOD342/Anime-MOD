import React, { useEffect, useState } from 'react';
import { ChevronRight, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { AnimeEntry } from '../services/listService';

export default function FavoritesView({ onBack, onAnimeClick }: { onBack: () => void, onAnimeClick: (id: string) => void }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<AnimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
       const fetchFavs = async () => {
         try {
           const q = query(collection(db, 'users', user.id, 'animeEntries'), where('isFavorite', '==', true));
           const snap = await getDocs(q);
           const favs = snap.docs.map(d => ({id: d.id, ...d.data()} as AnimeEntry));
           setFavorites(favs);
         } catch(e) {
           console.error(e);
         } finally {
           setLoading(false);
         }
       };
       fetchFavs();
    } else {
      setLoading(false);
    }
  }, [user]);

  return (
    <div className="bg-black min-h-screen pb-20">
      <div className="sticky top-0 bg-black/90 backdrop-blur-md z-40 p-4 border-b border-neutral-800 flex items-center gap-3">
        <button onClick={onBack} className="p-2 bg-neutral-900 rounded-full text-white hover:bg-neutral-800 transition">
          <ChevronRight size={20} />
        </button>
        <h1 className="text-xl font-black text-white flex items-center gap-2"><Heart size={20} className="text-[#FF1744] drop-shadow-[0_0_8px_rgba(255,23,68,0.6)]" fill="#FF1744" /> المفضلة</h1>
      </div>

      <div className="p-4">
        {loading ? (
           <div className="flex justify-center p-10"><div className="w-8 h-8 rounded-full border-2 border-[#FF1744] border-t-transparent animate-spin"/></div>
        ) : favorites.length > 0 ? (
           <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
             {favorites.map(anime => (
               <div key={anime.id} onClick={() => onAnimeClick(anime.id)} className="cursor-pointer group relative">
                 <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[#121212] border border-neutral-800 group-hover:border-[#FF1744] transition-colors relative">
                    <img src={anime.posterUrl} alt={anime.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    <div className="absolute bottom-2 left-2 right-2 text-center text-[10px] sm:text-xs font-bold text-white line-clamp-2">
                      {anime.title}
                    </div>
                 </div>
               </div>
             ))}
           </div>
        ) : (
           <div className="flex flex-col items-center justify-center p-10 text-neutral-500">
             <Heart size={48} className="mb-4 text-neutral-800" />
             <p className="font-bold text-sm">ليس لديك أنميات في المفضلة بعد.</p>
           </div>
        )}
      </div>
    </div>
  );
}
