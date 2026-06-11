import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bookmark, Star, Trash2, Plus, FolderPlus, LogIn, Filter, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { listService, CustomList, AnimeEntry, MainListStatus } from '../services/listService';

interface MyListsViewProps {
  onAnimeClick: (id: string) => void;
}

const MAIN_LISTS: { id: MainListStatus, label: string }[] = [
  { id: 'watching', label: 'أشاهده حالياً' },
  { id: 'completed', label: 'مكتمل' },
  { id: 'plan_to_watch', label: 'أنوي مشاهدته' },
  { id: 'on_hold', label: 'مؤجل' },
  { id: 'dropped', label: 'ملغي' },
];

export default function MyListsView({ onAnimeClick }: MyListsViewProps) {
  const { user, signIn } = useAuth();
  const [activeListId, setActiveListId] = useState<string>('watching'); // can be MainListStatus or customList id
  const [customLists, setCustomLists] = useState<CustomList[]>(() => {
    try {
      const cached = sessionStorage.getItem('client_mylists_custom');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [entries, setEntries] = useState<AnimeEntry[]>(() => {
    try {
      const cached = sessionStorage.getItem('client_mylists_entries');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      return !sessionStorage.getItem('client_mylists_entries');
    } catch {
      return true;
    }
  });
  const [showAddList, setShowAddList] = useState(false);
  const [newListName, setNewListName] = useState('');
  
  const [sortBy, setSortBy] = useState<'alpha' | 'date' | 'year'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [fetchedCustom, fetchedEntries] = await Promise.all([
        listService.getCustomLists(user.id),
        listService.getAnimeEntries(user.id)
      ]);
      const getMillis = (val: any) => {
        if (!val) return 0;
        if (typeof val.toMillis === 'function') return val.toMillis();
        if (typeof val.toDate === 'function') return val.toDate().getTime();
        if (val.seconds !== undefined) return val.seconds * 1000 + (val.nanoseconds || 0) / 1000000;
        if (val instanceof Date) return val.getTime();
        if (typeof val === 'string' || typeof val === 'number') return new Date(val).getTime();
        return 0;
      };
      const sortedCustom = fetchedCustom.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
      setCustomLists(sortedCustom);
      setEntries(fetchedEntries);
      try {
        sessionStorage.setItem('client_mylists_custom', JSON.stringify(sortedCustom));
        sessionStorage.setItem('client_mylists_entries', JSON.stringify(fetchedEntries));
      } catch (e) {}
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!user || !newListName.trim()) return;
    try {
      await listService.createCustomList(user.id, newListName.trim());
      setNewListName('');
      setShowAddList(false);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!user) return;
    if (window.confirm('هل أنت متأكد من حذف هذه القائمة؟')) {
      try {
        await listService.deleteCustomList(user.id, listId);
        if (activeListId === listId) setActiveListId('watching');
        loadData();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const removeEntry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (window.confirm('هل تريد إزالة الأنمي من المكتبة؟')) {
       try {
         await listService.removeAnimeEntry(user.id, id);
         setEntries(prev => prev.filter(a => a.id !== id));
       } catch (err) {
         console.error(err);
       }
    }
  };

  const currentDisplayEntries = useMemo(() => {
    let filtered = entries.filter(e => {
        if (MAIN_LISTS.some(m => m.id === activeListId)) {
          return e.status === activeListId;
        } else {
          return e.customLists?.[activeListId] === true;
        }
    });

    return filtered.sort((a, b) => {
       let comparison = 0;
       if (sortBy === 'alpha') {
          comparison = a.title.localeCompare(b.title, 'ar');
       } else if (sortBy === 'year') {
          comparison = parseInt(a.releaseYear || '0') - parseInt(b.releaseYear || '0');
       } else {
          const getMillis = (val: any) => {
             if (!val) return 0;
             if (typeof val.toMillis === 'function') return val.toMillis();
             if (typeof val.toDate === 'function') return val.toDate().getTime();
             if (val.seconds !== undefined) return val.seconds * 1000 + (val.nanoseconds || 0) / 1000000;
             if (val instanceof Date) return val.getTime();
             if (typeof val === 'string' || typeof val === 'number') return new Date(val).getTime();
             return 0;
          };
          comparison = getMillis(a.addedAt) - getMillis(b.addedAt);
       }
       return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [entries, activeListId, sortBy, sortOrder]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
        <div className="w-20 h-20 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 mb-6">
          <Bookmark size={32} />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">قوائمك المحفوظة</h2>
        <p className="text-sm text-neutral-400 font-bold mb-8 max-w-sm">
          قم بتسجيل الدخول لإنشاء قوائم مخصصة، تتبع ما تشاهده، وحفظ الأنميات المفضلة لديك.
        </p>
        <button 
          onClick={signIn}
          className="bg-purple-600 hover:bg-purple-500 text-white font-black px-8 py-3 rounded-xl flex items-center gap-2 transition shadow-lg shadow-purple-500/20"
        >
          <LogIn size={20} /> تسجيل الدخول باستخدام جوجل
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 space-y-6 pt-8 pb-32"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400">
            <Bookmark size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white drop-shadow">مكتبتي</h2>
            <p className="text-xs text-neutral-400 font-bold">({entries.length}) أنمي في القوائم</p>
          </div>
        </div>

        <div className="flex gap-2 items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 shrink-0">
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-xs text-white p-2 font-bold outline-none cursor-pointer"
          >
            <option value="date">تاريخ الإضافة</option>
            <option value="alpha">أبجدياً</option>
            <option value="year">سنة الإصدار</option>
          </select>
          <button 
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="p-2 text-neutral-400 hover:text-white transition"
          >
            <ArrowUpDown size={16} className={sortOrder === 'desc' ? 'rotate-180' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
        {MAIN_LISTS.map(list => (
          <button
            key={list.id}
            onClick={() => setActiveListId(list.id)}
            className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors ${
              activeListId === list.id 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            {list.label}
          </button>
        ))}
        
        <div className="w-px h-8 bg-neutral-800 mx-1 shrink-0 self-center" />
        
        {customLists.map(list => (
          <div key={list.id} className="relative group flex shrink-0">
             <button
              onClick={() => setActiveListId(list.id)}
              className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-colors ${
                activeListId === list.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-neutral-900 text-blue-400/80 hover:text-blue-400 border border-neutral-800'
              }`}
             >
               {list.name}
             </button>
             <button 
                onClick={() => handleDeleteList(list.id)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
             >
               <Trash2 size={8} className="text-white" />
             </button>
          </div>
        ))}

        <button
          onClick={() => setShowAddList(true)}
          className="px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap flex items-center gap-1 bg-neutral-900/50 text-neutral-400 hover:text-white border border-dashed border-neutral-700 shrink-0"
        >
          <Plus size={14} /> إضافة قائمة
        </button>
      </div>

      <AnimatePresence>
        {showAddList && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 items-center"
          >
            <input 
               type="text" 
               placeholder="اسم القائمة المخصصة..." 
               value={newListName}
               onChange={(e) => setNewListName(e.target.value)}
               className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-purple-500 outline-none"
               autoFocus
            />
            <button 
               onClick={handleCreateList}
               className="bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm"
            >
               حفظ
            </button>
            <button 
               onClick={() => setShowAddList(false)}
               className="bg-neutral-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm"
            >
               إلغاء
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"/>
        </div>
      ) : currentDisplayEntries.length > 0 ? (
        <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {currentDisplayEntries.map((anime, idx) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={`${anime.id}-${idx}`} 
                onClick={() => onAnimeClick(anime.id)}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden cursor-pointer group hover:border-purple-500/50 transition-colors flex flex-col relative shadow-md"
              >
                <div className="aspect-[3/4] relative overflow-hidden">
                  <img 
                    src={anime.posterUrl || "https://via.placeholder.com/300x400?text=Anime"} 
                    alt={anime.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  <button 
                    title="حذف من المكتبة بالكامل"
                    onClick={(e) => removeEntry(anime.id, e)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="p-3 absolute bottom-0 inset-x-0">
                  <h3 className="font-bold text-white text-sm truncate mb-1 drop-shadow-md">{anime.title}</h3>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-300">
                    <span className="bg-neutral-800/80 px-1.5 rounded">{anime.releaseYear || 'غير معروف'}</span>
                    <span className="bg-purple-600/80 px-1.5 rounded text-white">{anime.status}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-neutral-800 border-dashed rounded-3xl bg-neutral-900/50">
          <FolderPlus size={48} className="text-neutral-700 mb-4" />
          <p className="text-neutral-400 font-bold mb-2">القائمة فارغة</p>
          <p className="text-xs text-neutral-500 max-w-xs leading-relaxed">
            تصفح الأنميات وقم بإضافتها إلى قوائمك من صفحة تفاصيل الأنمي لمتابعتها لاحقاً.
          </p>
        </div>
      )}
    </motion.div>
  );
}
