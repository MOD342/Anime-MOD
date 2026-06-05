import React, { useState, useEffect } from 'react';
import { ChevronRight, CalendarDays, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScheduleViewProps {
  onBack: () => void;
  onAnimeClick: (id: string) => void;
  initialDay?: string;
}

const DAYS = [
  { id: 'saturday', label: 'السبت' },
  { id: 'sunday', label: 'الأحد' },
  { id: 'monday', label: 'الإثنين' },
  { id: 'tuesday', label: 'الثلاثاء' },
  { id: 'wednesday', label: 'الأربعاء' },
  { id: 'thursday', label: 'الخميس' },
  { id: 'friday', label: 'الجمعة' },
];

export default function ScheduleView({ onBack, onAnimeClick, initialDay }: ScheduleViewProps) {
  const [selectedDay, setSelectedDay] = useState(() => {
    if (initialDay) return initialDay;
    const d = new Date().getDay();
    const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return map[d];
  });
  
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchSchedule = async () => {
      try {
        const cached = sessionStorage.getItem(`client_sched_${selectedDay}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (active) {
            setSchedule(parsed);
            setLoading(false);
          }
        } else {
          if (active) setLoading(true);
        }
      } catch (e) {}

      try {
        const res = await fetch(`/api/anime/jikan-schedule?day=${selectedDay}`);
        const json = await res.json();
        if (json.success && json.data) {
          if (active) {
            setSchedule(json.data);
            try {
              sessionStorage.setItem(`client_sched_${selectedDay}`, JSON.stringify(json.data));
            } catch (e) {}
          }
        }
      } catch (e) {
        console.error(e);
      }
      if (active) setLoading(false);
    };
    fetchSchedule();
    return () => {
      active = false;
    };
  }, [selectedDay]);

  return (
    <div className="min-h-screen bg-black flex flex-col pt-12 md:pt-4 font-sans text-white">
      <div className="flex items-center gap-3 p-4 sticky top-0 bg-black/80 backdrop-blur-md z-20 border-b border-white/5">
        <button onClick={onBack} className="p-2 bg-neutral-900 rounded-full hover:bg-neutral-800 transition">
          <ChevronRight size={20} />
        </button>
        <h1 className="font-black text-xl flex items-center gap-2">
          <CalendarDays size={20} className="text-blue-500" /> جدول العرض
        </h1>
      </div>

      <div className="flex overflow-x-auto hide-scrollbar gap-2 px-4 py-4 sticky top-[68px] bg-black/95 backdrop-blur-md z-10 border-b border-neutral-900">
        {DAYS.map(day => (
          <button
            key={day.id}
            onClick={() => setSelectedDay(day.id)}
            className={`px-4 py-2 font-bold text-sm rounded-full whitespace-nowrap transition ${selectedDay === day.id ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'}`}
          >
            {day.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : schedule.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {schedule.map((anime: any, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={`${anime.mal_id}-${idx}`}
                onClick={() => onAnimeClick(anime.mal_id.toString())}
                className="cursor-pointer relative rounded-2xl overflow-hidden group border border-neutral-800 hover:border-blue-500/50 transition-all duration-300 aspect-[3/4] bg-neutral-900"
              >
                <img src={anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url} loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" alt={anime.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-3 pointer-events-none">
                  <span className="absolute top-2 right-2 bg-blue-600/90 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-lg">{anime.broadcast?.time || 'غير معروف'}</span>
                  <h5 className="font-bold text-xs md:text-sm text-white truncate drop-shadow text-center">{anime.title}</h5>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center text-neutral-500 py-20 font-bold">لا يوجد أنميات تعرض في هذا اليوم.</div>
        )}
      </div>
    </div>
  );
}
