import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, CalendarDays, Loader2, Clock, Search, Filter, Globe, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
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

// Helper to convert JST Broadcast to user's Local timezone with details
function getLocalBroadcastInfo(jstTimeStr: string, dayId: string) {
  try {
    if (!jstTimeStr || !jstTimeStr.includes(':')) {
      return { localTime: 'غير معروف', shiftedDayName: '', countdown: '', isLive: false };
    }

    const [jstHour, jstMin] = jstTimeStr.split(':').map(Number);
    if (isNaN(jstHour) || isNaN(jstMin)) {
      return { localTime: jstTimeStr, shiftedDayName: '', countdown: '', isLive: false };
    }

    const daysOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const daysArabic: Record<string, string> = {
      sunday: 'الأحد',
      monday: 'الإثنين',
      tuesday: 'الثلاثاء',
      wednesday: 'الأربعاء',
      thursday: 'الخميس',
      friday: 'الجمعة',
      saturday: 'السبت'
    };

    const targetDayIndex = daysOrder.indexOf(dayId);
    if (targetDayIndex === -1) {
      return { localTime: jstTimeStr, shiftedDayName: '', countdown: '', isLive: false };
    }

    const now = new Date();
    const currentDayIndex = now.getDay();
    
    // Day offset calculation
    const dayDiff = targetDayIndex - currentDayIndex;
    const jstDate = new Date(now.getTime() + dayDiff * 24 * 60 * 60 * 1000);
    
    // Set time in Japan Time Zone (UTC+9)
    // UTC Hour = JST Hour - 9
    let utcHour = jstHour - 9;
    let dayShift = 0;
    if (utcHour < 0) {
      utcHour += 24;
      dayShift = -1;
    } else if (utcHour >= 24) {
      utcHour -= 24;
      dayShift = 1;
    }
    
    jstDate.setUTCHours(utcHour, jstMin, 0, 0);
    if (dayShift !== 0) {
      jstDate.setUTCDate(jstDate.getUTCDate() + dayShift);
    }

    // Capture User's Local properties
    const localDayIndex = jstDate.getDay();
    const shiftedDayName = daysArabic[daysOrder[localDayIndex]] || '';
    
    // Format local time nicely
    const localTimeFormatted = jstDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Compute relative state
    const diffMs = jstDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    let countdown = '';
    let isLive = false;

    if (Math.abs(diffHours) < 1.0) {
      countdown = 'يعرض الآن 🔴';
      isLive = true;
    } else if (diffHours > 0 && diffHours < 18) {
      const h = Math.floor(diffHours);
      const m = Math.round((diffHours - h) * 60);
      countdown = h > 0 ? `بعد ${h} ساعة و ${m} د` : `بعد ${m} دقيقة`;
    } else if (diffHours < 0 && diffHours > -18) {
      countdown = `عُرض اليوم (منذ ${Math.ceil(Math.abs(diffHours))} س)`;
    }

    return {
      localTime: localTimeFormatted,
      shiftedDayName,
      countdown,
      isLive
    };
  } catch (e) {
    return { localTime: jstTimeStr, shiftedDayName: '', countdown: '', isLive: false };
  }
}

export default function ScheduleView({ onBack, onAnimeClick, initialDay }: ScheduleViewProps) {
  const [selectedDay, setSelectedDay] = useState(() => {
    if (initialDay) return initialDay;
    const d = new Date().getDay();
    const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return map[d];
  });
  
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('ALL');
  const [showLocalTimeOnly, setShowLocalTimeOnly] = useState(true);
  const [viewMode, setViewMode] = useState<'daily' | 'all-week'>('daily');
  const [allWeekData, setAllWeekData] = useState<Record<string, any[]>>({});
  const [weekLoading, setWeekLoading] = useState(false);

  // Fetch target day schedule
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

    if (viewMode === 'daily') {
      fetchSchedule();
    }
    return () => {
      active = false;
    };
  }, [selectedDay, viewMode]);

  // Fetch full week schedule for "All Week" dashboard
  useEffect(() => {
    let active = true;
    if (viewMode === 'all-week' && Object.keys(allWeekData).length === 0) {
      const fetchFullWeek = async () => {
        setWeekLoading(true);
        const dataMap: Record<string, any[]> = {};
        try {
          await Promise.all(
            DAYS.map(async (day) => {
              try {
                const cached = sessionStorage.getItem(`client_sched_${day.id}`);
                if (cached) {
                  dataMap[day.id] = JSON.parse(cached);
                } else {
                  const res = await fetch(`/api/anime/jikan-schedule?day=${day.id}`);
                  const json = await res.json();
                  if (json.success && json.data) {
                    dataMap[day.id] = json.data;
                    sessionStorage.setItem(`client_sched_${day.id}`, JSON.stringify(json.data));
                  } else {
                    dataMap[day.id] = [];
                  }
                }
              } catch (err) {
                console.error(`Error loading ${day.id}:`, err);
                dataMap[day.id] = [];
              }
            })
          );
          if (active) {
            setAllWeekData(dataMap);
          }
        } catch (e) {
          console.error("Failed loading full week", e);
        } finally {
          if (active) setWeekLoading(false);
        }
      };
      fetchFullWeek();
    }
    return () => {
      active = false;
    };
  }, [viewMode]);

  // Dynamic filter lists
  const availableGenres = useMemo(() => {
    const genresSet = new Set<string>();
    const list = viewMode === 'daily' ? schedule : Object.values(allWeekData).flat();
    list.forEach((anime: any) => {
      anime.genres?.forEach((g: any) => {
        if (g.name) genresSet.add(g.name);
      });
    });
    return Array.from(genresSet);
  }, [schedule, allWeekData, viewMode]);

  const filteredSchedule = useMemo(() => {
    let list = schedule;
    if (viewMode === 'all-week') {
      list = Object.values(allWeekData).flat();
    }
    return list.filter((anime: any) => {
      const matchQuery = anime.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         anime.title_english?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchGenre = selectedGenre === 'ALL' || anime.genres?.some((g: any) => g.name === selectedGenre);
      return matchQuery && matchGenre;
    });
  }, [schedule, allWeekData, searchQuery, selectedGenre, viewMode]);

  // Local Timezone info string
  const timeZoneName = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'توقيتك المحلي';
    } catch {
      return 'توقيتك المحلي';
    }
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col pt-12 md:pt-4 font-sans text-white pb-10" dir="rtl">
      {/* Title Header */}
      <div className="flex flex-col gap-4 p-4 sticky top-0 bg-black/90 backdrop-blur-md z-30 border-b border-neutral-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 bg-neutral-900 rounded-full hover:bg-neutral-800 transition text-neutral-300">
              <ChevronRight size={20} />
            </button>
            <h1 className="font-black text-xl md:text-2xl flex items-center gap-2 bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              <CalendarDays size={24} className="text-blue-500 animate-pulse" /> جدول العرض ومواعيد الحلقات
            </h1>
          </div>
          
          <div className="flex bg-neutral-900 p-1 rounded-xl text-xs font-bold shadow-inner">
            <button 
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg transition-all duration-300 ${viewMode === 'daily' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'}`}
            >
              عرض يومي
            </button>
            <button 
              onClick={() => setViewMode('all-week')}
              className={`px-3 py-1.5 rounded-lg transition-all duration-300 ${viewMode === 'all-week' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'}`}
            >
              جدول الأسبوع بالكامل
            </button>
          </div>
        </div>

        {/* Timezone Indicator Info */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-neutral-400">
          <div className="flex items-center gap-1.5 bg-neutral-900/60 border border-white/5 py-1 px-3 rounded-full">
            <Globe size={13} className="text-emerald-400" />
            <span>منطقة التوقيت المكتشفة: </span>
            <span className="font-mono text-emerald-300 font-bold">{timeZoneName}</span>
          </div>

          <button 
            onClick={() => setShowLocalTimeOnly(!showLocalTimeOnly)}
            className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 py-1 px-3 rounded-full hover:bg-blue-500/20 transition text-[11px] font-bold"
          >
            <Sparkles size={12} />
            <span>{showLocalTimeOnly ? 'إظهار التوقيت الياباني الافتراضي (JST)' : 'عرض التوقيت المحلي الذكي فقط'}</span>
          </button>
        </div>
      </div>

      {/* Daily Switcher Tab Bar */}
      {viewMode === 'daily' && (
        <div className="flex overflow-x-auto hide-scrollbar gap-2 px-4 py-3 sticky top-[130px] bg-black/95 backdrop-blur-md z-20 border-b border-neutral-900">
          {DAYS.map(day => (
            <button
              key={day.id}
              onClick={() => {
                setSelectedDay(day.id);
                setSelectedGenre('ALL');
              }}
              className={`px-5 py-2 font-bold text-sm rounded-xl whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 ${selectedDay === day.id ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.35)] scale-105' : 'bg-neutral-900/80 text-neutral-400 hover:bg-neutral-850 hover:text-neutral-200'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${selectedDay === day.id ? 'bg-white animate-ping' : 'bg-neutral-600'}`}></span>
              {day.label}
            </button>
          ))}
        </div>
      )}

      {/* Filter and Search Box Section */}
      <div className="p-4 flex flex-col md:flex-row gap-3 bg-neutral-950/40 border-b border-neutral-900">
        <div className="flex-1 relative">
          <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="بحث في جدول العرض..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900/90 border border-neutral-800 rounded-xl pr-10 pl-4 py-2.5 text-sm font-bold text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-all duration-300"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <Filter size={16} className="text-blue-500 shrink-0" />
          <button
            onClick={() => setSelectedGenre('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg shrink-0 transition ${selectedGenre === 'ALL' ? 'bg-blue-600 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
          >
            كل التصانيف
          </button>
          {availableGenres.map(genre => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg shrink-0 transition-all ${selectedGenre === genre ? 'bg-blue-600 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stream Area */}
      <div className="flex-1 p-4">
        {(loading && viewMode === 'daily') || (weekLoading && viewMode === 'all-week') ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="animate-spin text-blue-500" size={36} />
            <span className="text-sm font-bold text-neutral-400">جاري تحميل جدول المواعيد وتحديثها...</span>
          </div>
        ) : (
          <>
            {viewMode === 'all-week' ? (
              // All week grouping layout (Bento Grid Group style)
              <div className="space-y-8">
                {DAYS.map(day => {
                  const dayItems = allWeekData[day.id] || [];
                  const filteredDayItems = dayItems.filter((anime: any) => {
                    const matchQuery = anime.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                       anime.title_english?.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchGenre = selectedGenre === 'ALL' || anime.genres?.some((g: any) => g.name === selectedGenre);
                    return matchQuery && matchGenre;
                  });

                  if (filteredDayItems.length === 0) return null;

                  return (
                    <div key={day.id} className="bg-neutral-950/40 border border-neutral-900 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-800">
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></span>
                          جدول يوم {day.label}
                        </h2>
                        <span className="text-xs text-neutral-500 font-mono font-bold">({filteredDayItems.length} أنمي)</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {filteredDayItems.map((anime: any, idx: number) => {
                          const timeInfo = getLocalBroadcastInfo(anime.broadcast?.time, day.id);
                          return (
                            <div 
                              onClick={() => onAnimeClick(anime.mal_id.toString())}
                              key={`${day.id}-${anime.mal_id}-${idx}`}
                              className="group cursor-pointer bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-blue-500/40 transition duration-300 flex flex-col"
                            >
                              <div className="relative aspect-[3/4] overflow-hidden">
                                <img 
                                  src={anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url} 
                                  loading="lazy" 
                                  className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                                  alt={anime.title} 
                                />
                                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                  <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-lg flex items-center gap-1">
                                    <Clock size={10} />
                                    <span>{timeInfo.localTime}</span>
                                  </span>
                                  {!showLocalTimeOnly && anime.broadcast?.time && (
                                    <span className="bg-purple-600/90 text-white px-2 py-0.5 rounded text-[9px] font-bold shadow-lg">
                                      JST: {anime.broadcast.time}
                                    </span>
                                  )}
                                </div>
                                {timeInfo.countdown && (
                                  <div className="absolute bottom-2 right-2 left-2 bg-black/80 backdrop-blur-sm border border-white/5 px-2 py-1 rounded text-[10px] text-center font-bold text-emerald-400 truncate">
                                    {timeInfo.countdown}
                                  </div>
                                )}
                              </div>
                              <div className="p-2 flex flex-col gap-1 justify-center items-center text-center">
                                <h3 className="font-bold text-xs text-neutral-200 line-clamp-1 group-hover:text-blue-400 transition">
                                  {anime.title}
                                </h3>
                                {anime.score && (
                                  <span className="text-[10px] text-amber-500 font-bold">★ {anime.score}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {Object.keys(allWeekData).length > 0 && Object.values(allWeekData).flat().length === 0 && (
                  <div className="text-center py-20 text-neutral-500 font-bold">لا توجد بيانات متاحة لهذا الأسبوع حالياً.</div>
                )}
              </div>
            ) : (
              // Daily View Layout
              <>
                {filteredSchedule.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredSchedule.map((anime: any, idx) => {
                      const timeInfo = getLocalBroadcastInfo(anime.broadcast?.time, selectedDay);
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                          key={`${anime.mal_id}-${idx}`}
                          onClick={() => onAnimeClick(anime.mal_id.toString())}
                          className="cursor-pointer group flex flex-col relative rounded-2xl overflow-hidden border border-neutral-800 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] bg-neutral-900 transition-all duration-300"
                        >
                          <div className="relative aspect-[3/4] overflow-hidden">
                            <img 
                              src={anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url} 
                              loading="lazy" 
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                              alt={anime.title} 
                            />
                            
                            {/* Broadcast Badges */}
                            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
                              <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-md text-[10px] font-black shadow-lg flex items-center gap-1.5 border border-white/10">
                                <Clock size={11} />
                                <span>{timeInfo.localTime}</span>
                              </span>
                              {!showLocalTimeOnly && anime.broadcast?.time && (
                                <span className="bg-purple-600/90 text-white px-2 py-0.5 rounded text-[9px] font-bold shadow-lg">
                                  بث طوكيو JST: {anime.broadcast.time}
                                </span>
                              )}
                            </div>

                            {/* Live Countdown Overlay */}
                            {timeInfo.countdown && (
                              <div className={`absolute bottom-3 right-3 left-3 px-2.5 py-1.5 rounded-xl text-center text-[10px] font-bold shadow-lg border backdrop-blur-md flex items-center justify-center gap-1.5 transition duration-300 ${timeInfo.isLive ? 'bg-red-500/25 border-red-500/40 text-red-400 animate-pulse' : 'bg-black/85 border-white/5 text-emerald-400'}`}>
                                <span className={`w-2 h-2 rounded-full ${timeInfo.isLive ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`}></span>
                                <span className="truncate">{timeInfo.countdown}</span>
                              </div>
                            )}
                          </div>

                          {/* Content Panel */}
                          <div className="p-3 flex flex-col gap-2">
                            <h3 className="font-bold text-xs md:text-sm text-neutral-100 line-clamp-1 group-hover:text-blue-400 transition" title={anime.title}>
                              {anime.title}
                            </h3>
                            
                            <div className="flex items-center justify-between text-[11px] text-neutral-400">
                              <span className="bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded font-medium truncate max-w-[80px]">
                                {anime.genres?.[0]?.name || 'أنمي'}
                              </span>
                              {anime.score && (
                                <span className="text-amber-500 font-bold flex items-center gap-0.5">
                                  ★ {anime.score}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-28 text-center text-neutral-500 border border-dashed border-neutral-800 rounded-3xl p-6 bg-neutral-900/10">
                    <AlertCircle className="text-neutral-600 mb-3" size={36} />
                    <h4 className="font-bold text-base text-neutral-400">لا توجد لمطابقات الأنميات تحت محددات التصفية هذه.</h4>
                    <p className="text-xs text-neutral-600 max-w-sm mt-1">حاول كتابة مصطلح بحث مختلف أو حدّد يوماً آخر لرؤية الأنميات المقررة لعرضها.</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Helpful Tips Bottom */}
      <div className="px-4 mt-6">
        <div className="bg-gradient-to-l from-neutral-950 via-neutral-900 to-neutral-950 border border-neutral-900 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3.5 max-w-4xl mx-auto shadow-xl">
          <div className="p-3 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl">
            <Clock size={18} />
          </div>
          <div className="flex-1 text-center sm:text-right gap-1 flex flex-col">
            <h5 className="font-bold text-xs text-blue-400">تحويل ذكي لمنطقة التوقيت!</h5>
            <p className="text-[11px] leading-relaxed text-neutral-400">
              يقوم نظام السيرفرات الذكي باكتشاف موقعك وتحويل مواعيد العرض من التوقيت الياباني القياسي (JST) وتعديلها تلقائياً لتناسب منطقتك السكنية الحالية حتى لا تفوّت موعد البث المباشر لأي حلقة جديدة!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
