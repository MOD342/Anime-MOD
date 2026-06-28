import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Star, List, MessageCircle, Heart, Share2, Info, ChevronRight, Loader2, Users, Youtube, X, Plus, LogIn, ThumbsUp, ThumbsDown, Copy, Reply, Flag, EyeOff, Eye, Edit2, Trash2, ShieldCheck, CheckSquare, PlayCircle, Trophy, Send, Flame, Download, Lightbulb } from 'lucide-react';
import { Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { listService, CustomList, MainListStatus, AnimeEntry, getAnimeRewards } from '../services/listService';
import { Recommendation, getApprovedRecommendations, addRecommendation, Comment, getComments, addComment, updateCommentInteraction, updateRecommendationInteraction } from '../services/animeInteractionService';
import { notificationsService } from '../services/notificationsService';
import { clientCache } from '../utils/clientCache';
import { LongPressCopy } from '../components/LongPressCopy';

function RecommendationItem({ rec, user, isMod, onDelete }: any) {
  const [likes, setLikes] = useState(rec.likes || 0);
  const [dislikes, setDislikes] = useState(rec.dislikes || 0);
  const [userVote, setUserVote] = useState<'like'|'dislike'|null>(null);

  const handleLike = async () => {
    if (!user) return;
    const isNewLike = userVote !== 'like';
    const newLikes = isNewLike ? likes + 1 : likes - 1;
    let newDislikes = dislikes;
    if (userVote === 'dislike') newDislikes -= 1;
    setLikes(newLikes);
    setDislikes(newDislikes);
    setUserVote(isNewLike ? 'like' : null);
    await updateRecommendationInteraction(rec.id, { likes: newLikes, dislikes: newDislikes });
    
    if (isNewLike) {
      import('../services/gamificationService').then(({ incrementInteraction }) => {
        incrementInteraction(rec.userId, 'like');
      });
    } else {
      try {
        const uRef = doc(db, 'users', rec.userId);
        await updateDoc(uRef, { likesReceived: increment(-1) });
      } catch (e) {}
    }
  };

  const handleDislike = async () => {
    if (!user) return;
    const isNewDislike = userVote !== 'dislike';
    const newDislikes = isNewDislike ? dislikes + 1 : dislikes - 1;
    let newLikes = likes;
    if (userVote === 'like') newLikes -= 1;
    setDislikes(newDislikes);
    setLikes(newLikes);
    setUserVote(isNewDislike ? 'dislike' : null);
    await updateRecommendationInteraction(rec.id, { likes: newLikes, dislikes: newDislikes });
  };

  return (
    <div className="bg-[#121212] flex gap-4 p-4 rounded-xl border border-neutral-800 shadow-md relative group">
       {isMod && (
          <button onClick={() => onDelete(rec.id)} className="absolute top-2 left-2 p-2 bg-red-600/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition hover:bg-red-600/20 border border-red-500/20 z-20">
            <Trash2 size={14} />
          </button>
        )}
        
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex justify-between items-start">
            <div>
              <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-sm line-clamp-1">{rec.targetAnimeTitle}</span>
            </div>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed bg-[#1a1a1a] p-3 rounded-lg border border-neutral-800/80">
            "{rec.reason}"
          </p>
          <div className="flex items-center gap-4 mt-2">
             <button onClick={handleLike} className={`flex items-center gap-1.5 text-xs transition ${userVote === 'like' ? 'text-blue-500' : 'text-neutral-500 hover:text-blue-400'}`}>
               <ThumbsUp size={14} /> <span>{likes}</span>
             </button>
             <button onClick={handleDislike} className={`flex items-center gap-1.5 text-xs transition ${userVote === 'dislike' ? 'text-red-500' : 'text-neutral-500 hover:text-red-400'}`}>
               <ThumbsDown size={14} /> <span>{dislikes}</span>
             </button>
          </div>
        </div>
    </div>
  );
}
import { moderationService } from '../services/moderationService';
import AnimeCommentItem from '../components/AnimeCommentItem';
import RelatedAnimeCard from '../components/RelatedAnimeCard';

interface AnimeDetailsProps {
  id?: string;
  showComments?: boolean;
  focusCommentId?: string;
  autoplayEpisode?: string;
  onBack: () => void;
  onWatch: (episode: any, anime: any) => void;
  onAnimeClick?: (id: string, autoplayEpisode?: string) => void;
  onNavigate?: (view: string, props?: any) => void;
}

const MAIN_LISTS: { id: MainListStatus, label: string, icon: React.ElementType, color: string }[] = [
  { id: 'watching', label: 'أشاهده حالياً', icon: PlayCircle, color: 'text-green-500' },
  { id: 'completed', label: 'مكتمل', icon: CheckSquare, color: 'text-blue-500' },
  { id: 'plan_to_watch', label: 'أنوي مشاهدته', icon: List, color: 'text-purple-500' },
  { id: 'on_hold', label: 'مؤجل', icon: Info, color: 'text-yellow-500' },
  { id: 'dropped', label: 'ملغي', icon: Trash2, color: 'text-neutral-500' },
];

const RELATION_TYPES_AR: Record<string, string> = {
  'Sequel': 'تكملة',
  'Prequel': 'قصة سابقة',
  'Alternative setting': 'قصة بديلة',
  'Alternative version': 'نسخة بديلة',
  'Side story': 'قصة جانبية',
  'Summary': 'ملخص',
  'Full story': 'قصة كاملة',
  'Parent story': 'القصة الرئيسية',
  'Spin-off': 'عمل مشتق',
  'Adaptation': 'اقتباس',
  'Character': 'شخصية',
  'Other': 'أخرى'
};

export default function AnimeDetailsView({ id, showComments = false, focusCommentId, autoplayEpisode, onBack, onWatch, onAnimeClick, onNavigate }: AnimeDetailsProps) {
  const { user, signIn, userRole, userData } = useAuth();
  const [anime, setAnime] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appRating, setAppRating] = useState<{score: number, count: number}>({score: 0, count: 0});
  const [showListModal, setShowListModal] = useState(false);
  const [showDetailsNav, setShowDetailsNav] = useState(true);
  const [lastScrollYDetails, setLastScrollYDetails] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (Math.abs(currentScrollY - lastScrollYDetails) < 10) return;

      if (currentScrollY > lastScrollYDetails && currentScrollY > 85) {
        setShowDetailsNav(false);
      } else {
        setShowDetailsNav(true);
      }
      setLastScrollYDetails(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollYDetails]);

  // Autoplay episode if specified
  useEffect(() => {
    if (anime && autoplayEpisode) {
      const targetEp = anime.episodes?.find((e: any) => e.num === autoplayEpisode || e.title?.includes(autoplayEpisode) || e.num === parseInt(autoplayEpisode).toString());
      if (targetEp) {
        console.log(`[Autoplay] Launching watch player for episode ${autoplayEpisode}`);
        onWatch(targetEp, anime);
      }
    }
  }, [anime, autoplayEpisode, onWatch]);
  
  const [userEntry, setUserEntry] = useState<AnimeEntry | null>(null);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [newListName, setNewListName] = useState('');
  const [creatingCustomList, setCreatingCustomList] = useState(false);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [activeTab, setActiveTab] = useState<'story' | 'episodes' | 'characters' | 'photos' | 'recommendations'>('story');

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [showAddRecModal, setShowAddRecModal] = useState(false);
  const [recSearchQuery, setRecSearchQuery] = useState('');
  const [recSearchResults, setRecSearchResults] = useState<any[]>([]);
  const [searchingRecs, setSearchingRecs] = useState(false);
  const [selectedRecAnime, setSelectedRecAnime] = useState<any>(null);
  const [recReason, setRecReason] = useState('');
  const [submittingRec, setSubmittingRec] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (recSearchQuery.trim().length >= 2 && !selectedRecAnime) {
        setSearchingRecs(true);
        try {
          const res = await fetch(`/api/anime/search?q=${encodeURIComponent(recSearchQuery)}`);
          const json = await res.json();
          if (json.success) {
            setRecSearchResults(json.data.slice(0, 5));
          }
        } catch (e) {
          console.error(e);
        } finally {
          setSearchingRecs(false);
        }
      } else {
        setRecSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [recSearchQuery, selectedRecAnime]);

  const [pictures, setPictures] = useState<string[]>([]);
  const [loadingPictures, setLoadingPictures] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [downloadingPhoto, setDownloadingPhoto] = useState(false);
  const [hoverRating, setHoverRating] = useState<number>(0);

  useEffect(() => {
    if (!id) return;
    const fetchDetails = async () => {
      try {
        if (id !== 'random') {
          const cached = clientCache.get<any>(`client_anime_details_${id}`);
          if (cached && cached.description && cached.description !== 'جاري تحديث قصة وتفاصيل هذا الأنمي قريباً.') {
            setAnime(cached);
            setLoading(false);
          } else {
            setLoading(true);
          }
        } else {
          setLoading(true);
        }
      } catch (e) {
        setLoading(true);
      }
      try {
        await clientCache.fetchWithRevalidate(
          `client_anime_details_${id}`,
          `/api/anime/details/${id}`,
          (data: any) => {
            setAnime(data);
            import('../services/listService').then(({ listService }) => {
               listService.getAnimeAppRating(data._id || id).then(setAppRating);
            });
          },
          12 * 60 * 60 * 1000 // 12 Hours TTL for details with SWR revalidation
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  useEffect(() => {
    if (anime) {
      getApprovedRecommendations(anime._id).then(setRecommendations);
    }
  }, [anime]);

  useEffect(() => {
    if (activeTab === 'photos' && anime) {
      setLoadingPictures(true);
      fetch(`/api/anime/pictures/${anime._id || id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.pictures) {
            setPictures(data.pictures);
          }
        })
        .catch(err => console.error('Error loading pictures:', err))
        .finally(() => setLoadingPictures(false));
    }
  }, [activeTab, anime]);

  const handleDownloadImage = async (url: string) => {
    try {
      setDownloadingPhoto(true);
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${anime?.title || 'anime'}-image.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed, fallback to direct open', error);
      window.open(url, '_blank');
    } finally {
      setDownloadingPhoto(false);
    }
  };

  useEffect(() => {
    if (user && anime) {
      loadUserData();
    }
  }, [user, anime]);

  const loadUserData = async () => {
    if (!user || !anime) return;
    setIsLoadingLists(true);
    try {
      const [allCustom, allEntries] = await Promise.all([
        listService.getCustomLists(user.id),
        listService.getAnimeEntries(user.id)
      ]);
      setCustomLists(allCustom);
      const entry = allEntries.find(e => e.id === anime._id);
      setUserEntry(entry || null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingLists(false);
    }
  };

  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState('');
  const [pendingUpdate, setPendingUpdate] = useState<{status?: MainListStatus, watchedEpisodes?: number[]} | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationDetails, setCelebrationDetails] = useState<{coins: number, xp: number} | null>(null);

  const fetchQuiz = async () => {
    setQuizLoading(true);
    setQuizError('');
    setQuizData(null);
    try {
       const res = await fetch(`/api/ai/anti-cheat?title=${encodeURIComponent(anime?.title || '')}`);
       const json = await res.json();
       if (json.success) {
          setQuizData(json.data);
       } else {
          setQuizError(json.message || 'فشل تحميل الاختبار');
       }
    } catch (e) {
       setQuizError('خطأ في الاتصال بالذكاء الاصطناعي');
    } finally {
       setQuizLoading(false);
    }
  };

  const executeStatusUpdate = async (updateData: {status?: MainListStatus, watchedEpisodes?: number[], extraXp?: number, extraCoins?: number}) => {
    if (!user || !anime) return;
    
    const animeTotalEpisodes = anime.episodesCount || anime.episodes?.length || 0;
    const targetStatus = updateData.status !== undefined ? updateData.status : (userEntry?.status || 'none');
    const targetWatched = updateData.watchedEpisodes !== undefined ? updateData.watchedEpisodes : (userEntry?.watchedEpisodes || []);
    const progressToSave = targetStatus === 'completed' && animeTotalEpisodes > 0 
      ? animeTotalEpisodes 
      : targetWatched.length;

    const previousEntry = userEntry;
    
    // Optimistic local update!
    setUserEntry({
      id: anime._id,
      title: anime.title,
      posterUrl: anime.posterUrl,
      releaseYear: anime.releaseYear || '',
      status: targetStatus,
      customLists: userEntry?.customLists || {},
      score: userEntry?.score,
      watchedEpisodes: targetWatched,
      episodesCount: animeTotalEpisodes,
      progress: progressToSave,
      addedAt: userEntry?.addedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    setShowListModal(false);

    try {
      await listService.saveAnimeEntry(user.id, anime._id, {
        title: anime.title,
        posterUrl: anime.posterUrl,
        releaseYear: anime.releaseYear,
        status: targetStatus,
        customLists: userEntry?.customLists || {},
        score: userEntry?.score,
        watchedEpisodes: targetWatched,
        episodesCount: animeTotalEpisodes,
        progress: progressToSave,
        extraXp: updateData.extraXp,
        extraCoins: updateData.extraCoins
      });
      loadUserData();
    } catch (e) {
      console.error(e);
      setUserEntry(previousEntry);
    }
  };

  const handleUpdateStatus = async (status: MainListStatus) => {
    if (!user || !anime) return;
    
    const updatedStatus = userEntry?.status === status ? 'none' : status;
    
    if (updatedStatus === 'completed') {
       // Anti-cheat quiz
       setPendingUpdate({ status: 'completed' });
       setShowQuizModal(true);
       fetchQuiz();
       return;
    }
    
    executeStatusUpdate({ status: updatedStatus });
  };

  const handleUpdateScore = async (score: number) => {
    if (!user || !anime) return signIn();
    
    const previousEntry = userEntry;
    const newScore = userEntry?.score === score ? 0 : score;
    
    // Optimistic Update!
    setUserEntry(prev => {
      if (!prev) return null;
      return { ...prev, score: newScore };
    });

    try {
      await listService.saveAnimeEntry(user.id, anime._id, {
        title: anime.title,
        posterUrl: anime.posterUrl,
        releaseYear: anime.releaseYear,
        status: userEntry?.status || 'none',
        customLists: userEntry?.customLists || {},
        score: newScore,
        watchedEpisodes: userEntry?.watchedEpisodes || []
      });
      // Real-time instantaneous app rating sync!
      const freshRating = await listService.getAnimeAppRating(anime._id);
      setAppRating(freshRating);
      
      loadUserData();
    } catch (e) {
      console.error(e);
      setUserEntry(previousEntry);
    }
  };

  const handleToggleWatchedEpisode = async (epMalId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user || !anime) return signIn();
    try {
      const currentWatched = userEntry?.watchedEpisodes || [];
      const isWatched = currentWatched.includes(epMalId);
      const newWatched = isWatched ? currentWatched.filter(id => id !== epMalId) : [...currentWatched, epMalId];
      
      const newStatus = (anime.episodesCount && newWatched.length >= anime.episodesCount && userEntry?.status !== 'completed') ? 'completed' : (userEntry?.status || 'none');
      
      const previousEntry = userEntry;
      
      // Optimistic Update!
      setUserEntry(prev => {
        if (!prev) return null;
        return {
          ...prev,
          watchedEpisodes: newWatched,
          status: newStatus,
          progress: newWatched.length
        };
      });

      if (newStatus === 'completed' && userEntry?.status !== 'completed') {
         // Anti-cheat quiz applies if they try to finish it by watching the last episode
         setPendingUpdate({ status: 'completed', watchedEpisodes: newWatched });
         setShowQuizModal(true);
         fetchQuiz();
         return;
      }
      
      await executeStatusUpdate({ status: newStatus, watchedEpisodes: newWatched });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleCustomList = async (listId: string) => {
    if (!user || !anime) return;
    
    const currentMap = userEntry?.customLists || {};
    const newMap = { ...currentMap };
    if (newMap[listId]) {
      delete newMap[listId];
    } else {
      newMap[listId] = true;
    }
    
    const previousEntry = userEntry;
    
    // Optimistic Update!
    setUserEntry(prev => {
      if (!prev) return null;
      return { ...prev, customLists: newMap };
    });
    
    setShowListModal(false);

    try {
      await listService.saveAnimeEntry(user.id, anime._id, {
        title: anime.title,
        posterUrl: anime.posterUrl,
        releaseYear: anime.releaseYear,
        status: userEntry?.status || 'none',
        customLists: newMap,
        score: userEntry?.score,
        watchedEpisodes: userEntry?.watchedEpisodes || []
      });
      loadUserData();
    } catch (e) {
      console.error(e);
      setUserEntry(previousEntry);
    }
  };

  const handleCreateAndToggleList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !anime || !newListName.trim()) return;
    try {
      setCreatingCustomList(true);
      const listId = await listService.createCustomList(user.id, newListName.trim());
      setNewListName('');
      
      const currentMap = userEntry?.customLists || {};
      const newMap = { ...currentMap, [listId]: true };
      
      setUserEntry(prev => {
        if (!prev) return null;
        return { ...prev, customLists: newMap };
      });
      
      await listService.saveAnimeEntry(user.id, anime._id, {
        title: anime.title,
        posterUrl: anime.posterUrl,
        releaseYear: anime.releaseYear,
        status: userEntry?.status || 'none',
        customLists: newMap,
        score: userEntry?.score,
        watchedEpisodes: userEntry?.watchedEpisodes || []
      });
      
      const freshCustom = await listService.getCustomLists(user.id);
      setCustomLists(freshCustom);
      loadUserData();
      setShowListModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingCustomList(false);
    }
  };

  const handleAddRec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !anime || !selectedRecAnime || !recReason.trim()) return;
    setSubmittingRec(true);
    try {
      await addRecommendation({
        animeId: anime._id || id,
        animeTitle: anime.title,
        animePosterUrl: anime.posterUrl,
        targetAnimeId: selectedRecAnime._id || selectedRecAnime.id,
        targetAnimeTitle: selectedRecAnime.title,
        targetAnimePosterUrl: selectedRecAnime.posterUrl,
        reason: recReason,
        userId: user.id,
      });
      alert('تم تقديم توصيتك بنجاح! وسوف تظهر للجميع على الصفحة فور مراجعتها واعتمادها من قبل الإدارة. ✨');
      // Create global notification for recommendation (only if admin or owner)
      if (userRole === 'admin' || userRole === 'owner') {
        await notificationsService.createGlobalNotification({
          title: '💡 توصية أنمي جديدة!',
          body: `تمت إضافة ترشيح لـ "${anime.title}": لفت الانتباه وتوصية بـ "${selectedRecAnime.title}" للتفاصيل اضغط هنا!`,
          type: 'social',
          imageUrl: anime.posterUrl,
          linkTo: `anime_details:${anime._id}`
        });
      }
      setShowAddRecModal(false);
      setRecSearchQuery('');
      setSelectedRecAnime(null);
      setRecReason('');
    } catch (error) {
      console.error(error);
    } finally {
      setSubmittingRec(false);
    }
  };

  // Removed handleAddComment and parseMentionsAndNotify

  const handleDeleteRec = async (recId: string, trueRecId: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذه التوصية؟")) {
      await moderationService.deleteRecommendation(trueRecId);
      setRecommendations(recommendations.filter(r => r.id !== trueRecId));
    }
  };

  const isMod = userRole === 'owner' || userRole === 'admin' || userRole === 'moderator';

  if (loading || !anime) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  const isSaved = !!userEntry && userEntry.status !== 'none';

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="bg-black min-h-screen pb-24"
    >
      {/* Top Navbar */}
      <div className={`fixed top-0 right-0 left-0 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto p-4 pt-4 flex gap-2 z-[60] top-bar items-start pointer-events-none transition-all duration-300 ${
        showDetailsNav ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}>
        <button onClick={onBack} className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-[#FF1744] hover:border-[#FF1744] hover:scale-110 active:scale-95 shadow-2xl hover:shadow-[0_8px_20px_rgba(255,23,68,0.4)] hover:-translate-y-1 transition-all duration-300 pointer-events-auto">
          <ChevronRight size={24} />
        </button>
        <div className="flex-1" />
        <button onClick={() => { if(onAnimeClick) onAnimeClick('random') }} className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-purple-600 hover:border-purple-600 hover:scale-110 active:scale-95 shadow-2xl hover:shadow-[0_8px_20px_rgba(147,51,234,0.4)] hover:-translate-y-1 transition-all duration-300 pointer-events-auto">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
        </button>
        <button onClick={() => { 
              if(!user) signIn(); 
              else {
                const newStatus = !userEntry?.isFavorite;
                import('../services/listService').then(({ listService }) => {
                  listService.saveAnimeEntry(user.id, anime._id, {
                    title: anime.title,
                    posterUrl: anime.posterUrl,
                    releaseYear: anime.season || '',
                    isFavorite: newStatus
                  }).then(loadUserData);
                });
              }
            }} 
            className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-[#FF1744] hover:border-[#FF1744] hover:scale-110 active:scale-95 shadow-2xl hover:shadow-[0_8px_20px_rgba(255,23,68,0.4)] hover:-translate-y-1 transition-all duration-300 pointer-events-auto">
          <Heart size={18} fill={userEntry?.isFavorite ? "#FF1744" : "transparent"} className={userEntry?.isFavorite ? "text-[#FF1744]" : "text-white"} />
        </button>
      </div>

      {/* Header Image */}
      <div className="relative h-[65vh] w-full bg-[#121212] flex-shrink-0">
        <img 
          src={anime.posterUrl || "https://images.unsplash.com/photo-1614583225154-5fc2d153c391?q=80&w=1000&auto=format&fit=crop"} 
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src && target.src.includes('-poster.')) {
              target.src = target.src.replace('-poster.', '-thumbnail.');
            }
          }}
          alt="cover" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        
        {/* Info Overlay */}
        <div className="absolute bottom-6 right-4 left-4 z-30 flex flex-col items-center text-center gap-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight drop-shadow-2xl">
            <LongPressCopy text={anime.title}>
              {anime.title}
            </LongPressCopy>
          </h1>
          <div className="flex flex-row justify-center items-center gap-2 flex-wrap">
            <span className="text-yellow-400 flex items-center justify-center gap-1 bg-black/80 px-3 py-1 rounded backdrop-blur-md border border-white/5 text-xs font-bold"><Star size={14} fill="currentColor"/> {anime.rating || anime.score || '?'}</span>
            <span className="bg-black/80 px-3 py-1 rounded backdrop-blur-md border border-white/5 text-purple-300 text-xs font-bold">{anime.season || 'غير محدد'}</span>
            <span className="bg-black/80 px-3 py-1 rounded backdrop-blur-md border border-white/5 text-blue-300 text-xs font-bold">{anime.episodesCount || anime.episodes?.length || '?'} حلقة</span>
            <span className="bg-black/80 px-3 py-1 rounded backdrop-blur-md border border-white/5 text-green-300 text-xs font-bold">{anime.status}</span>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6 relative z-10 space-y-4">

        <div>
          <div className="flex gap-2 mb-3">
            <button 
              onClick={() => {
                if (!user) signIn();
                else setShowListModal(true);
              }}
              className={`flex-1 py-3 rounded-xl font-black flex items-center justify-center gap-2 transition text-white shadow-lg ${
                isSaved 
                  ? (userEntry.status === 'watching' ? 'bg-green-600 hover:bg-green-500' :
                     userEntry.status === 'completed' ? 'bg-blue-600 hover:bg-blue-500' :
                     userEntry.status === 'plan_to_watch' ? 'bg-purple-600 hover:bg-purple-500' :
                     userEntry.status === 'on_hold' ? 'bg-yellow-600 hover:bg-yellow-500 text-yellow-900 border-none' :
                     userEntry.status === 'dropped' ? 'bg-neutral-600 hover:bg-neutral-500' :
                     'bg-[#FF1744] hover:bg-red-600')
                  : 'bg-[#FF1744] hover:bg-red-600 shadow-[0_0_20px_rgba(255,23,68,0.4)]'
              }`}
            >
              {(() => {
                 if (!isSaved) return <><Plus size={20} /> أضف للقائمة</>;
                 const activeList = MAIN_LISTS.find(l => l.id === userEntry.status);
                 if (activeList) {
                   const Icon = activeList.icon;
                   return <><Icon size={20} /> {activeList.label}</>;
                 }
                 return <><List size={20} /> في قائمتك</>;
              })()}
            </button>
            
            <button 
              onClick={() => {
                if (anime) onNavigate?.('anime_comments', { animeId: anime._id || id });
              }}
              className="w-12 h-12 bg-[#1E1E1E] rounded-xl flex items-center justify-center text-[#FF1744] hover:bg-neutral-800 hover:border-[#FF1744]/40 transition border border-neutral-850 shrink-0 cursor-pointer select-none"
              title="النقاشات والتعليقات"
            >
              <MessageCircle size={20} />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar border-b border-neutral-800 pb-2 mt-3">
            {[
              { id: 'story', label: 'القصة' },
              { id: 'episodes', label: 'الحلقات' },
              { id: 'characters', label: 'الشخصيات' },
              { id: 'photos', label: 'صور الأنمي' }
            ].map(tab => (
              <motion.button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.96 }}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap text-xs font-bold transition-all cursor-pointer gpu-accelerated ${
                  activeTab === tab.id 
                    ? 'bg-[#FF1744] text-white shadow-[0_2px_8px_rgba(255,23,68,0.4)] border border-[#FF1744]'
                    : 'bg-[#1E1E1E] text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                {tab.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'story' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="bg-[#1E1E1E] p-3 rounded-2xl border border-neutral-800 space-y-3">
              <h3 className="text-white font-bold flex items-center gap-2 text-sm"><Info size={16} className="text-[#FF1744]"/> قصة الأنمي</h3>
              <p className="text-neutral-300 text-xs leading-relaxed">{anime.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {anime.genres?.map((g: string, idx: number) => (
                  <span key={`${g}-${idx}`} className="text-[10px] bg-[#121212] border border-neutral-800 px-2 py-1 rounded-full text-neutral-300 font-bold">{g}</span>
                ))}
              </div>
            </div>
            
            <div className="bg-[#1E1E1E] p-3 rounded-2xl border border-neutral-800 space-y-3">
              <h3 className="text-white font-bold flex items-center gap-2 text-sm"><Star size={16} className="text-yellow-500"/> تقييم المستخدمين</h3>
              <div className="flex gap-4 items-center">
                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#121212] border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)] min-w-[80px]">
                   <span className="text-3xl font-black text-yellow-500 leading-none">{appRating.score || '?'}</span>
                   <span className="text-[10px] font-bold text-neutral-500 mt-1">من {appRating.count} تقييم</span>
                </div>
                <div className="flex-1">
                   {/* 10 Stars Display */}
                   <div className="flex gap-0.5 mb-1.5" onMouseLeave={() => setHoverRating(0)}>
                     {[...Array(10)].map((_, i) => {
                       const starVal = i + 1;
                       const isActive = hoverRating ? starVal <= hoverRating : starVal <= (userEntry?.score || 0);
                       return (
                         <Star 
                           key={i} 
                           size={14} 
                           className={`cursor-pointer transition-colors ${isActive ? "text-yellow-500" : "text-neutral-700"} hover:scale-110`} 
                           fill={isActive ? "currentColor" : "none"} 
                           onMouseEnter={() => setHoverRating(starVal)}
                           onClick={() => handleUpdateScore(starVal)}
                         />
                       );
                     })}
                   </div>
                   <p className="text-[10px] text-[#B0B0B0] font-bold mb-1">
                     {userEntry?.score ? `تقييمك: ${userEntry.score} من 10` : 'التقييم يعتمد بالكامل على مستخدمي التطبيق فقط.'}
                   </p>
                </div>
              </div>
            </div>

            <div className="bg-[#1E1E1E] p-3 rounded-2xl border border-neutral-800 space-y-3">
              <h3 className="text-white font-bold flex items-center gap-2 text-sm"><List size={16} className="text-blue-500"/> الأجزاء المرتبطة</h3>
              {anime.related && anime.related.filter((rel: any) => !rel.type || rel.type.toLowerCase() === 'anime').length > 0 ? (
                <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2">
                  {anime.related.filter((rel: any) => !rel.type || rel.type.toLowerCase() === 'anime').map((rel: any, idx: number) => (
                    <RelatedAnimeCard key={idx} rel={rel} onClick={() => { if (onAnimeClick && rel.mal_id) onAnimeClick(rel.mal_id.toString()); }} />
                  ))}
                </div>
              ) : (
                <div className="text-xs text-neutral-500">لا توجد أجزاء أخرى مرتبطة معروفة.</div>
              )}
            </div>

            {/* Combined Jikan & User Recommendations */}
            <div className="bg-[#1E1E1E] p-3 rounded-2xl border border-neutral-800 space-y-3">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-white font-bold text-sm">أنميات مشابهة وتوصيات</h3>
                <button onClick={() => setShowAddRecModal(true)} className="text-[10px] bg-[#121212] border border-neutral-700 hover:border-[#FF1744] text-white font-bold px-2 py-1 rounded transition flex items-center gap-1">
                  <Plus size={12} /> أضف توصية
                </button>
              </div>
              <p className="text-[10px] text-[#B0B0B0]">توصيات الأعضاء وما يقترحه النظام.</p>
              
              <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2">
                {[
                  ...recommendations.map(r => {
                    const isSource = String(r.animeId) === String(anime._id);
                    return {
                      title: isSource ? r.targetAnimeTitle : (r.animeTitle || 'أنمي'),
                      reason: r.reason,
                      id: isSource ? r.targetAnimeId : r.animeId,
                      trueId: r.id,
                      isUser: true,
                      posterUrl: isSource ? (r.targetAnimePosterUrl || null) : (r.animePosterUrl || null)
                    };
                  }),
                  ...(anime.jikanRecommendations || []).map((jr: any) => ({ title: jr.title, posterUrl: jr.posterUrl, id: jr.id, trueId: null, isUser: false }))
                ].map((rec, i) => (
                  <div 
                    key={i} 
                    onClick={() => { if (onAnimeClick && rec.id) onAnimeClick(rec.id.toString()); }}
                    className="w-28 shrink-0 relative group cursor-pointer"
                  >
                    {rec.isUser && isMod && rec.trueId && (
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteRec('', rec.trueId); }} className="absolute z-20 top-1 left-1 p-1.5 bg-red-600/80 rounded-md text-white opacity-0 group-hover:opacity-100 transition shadow">
                        <Trash2 size={12} />
                      </button>
                    )}
                    <div className="w-28 h-40 rounded-xl overflow-hidden bg-[#121212] border border-neutral-800 shadow-lg group-hover:border-[#FF1744] transition-colors relative">
                       {rec.posterUrl ? (
                         <img src={rec.posterUrl} alt={rec.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" referrerPolicy="no-referrer" />
                       ) : (
                         <div className="w-full h-full flex flex-col p-2 items-center justify-center bg-neutral-900 border border-neutral-800">
                           <Lightbulb size={24} className="text-[#FF1744] mb-2" />
                           <span className="text-[9px] text-[#B0B0B0] text-center px-1 font-bold">توصية أنمي</span>
                         </div>
                       )}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                       {rec.isUser && (
                         <div className="absolute top-1 right-1 bg-green-500/80 text-green-100 text-[8px] font-bold px-1 rounded backdrop-blur-sm">توصية عضو</div>
                       )}
                       <div className="absolute bottom-2 left-1 right-1 text-center">
                         <h4 className="text-[10px] font-bold text-white line-clamp-2">{rec.title}</h4>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
              {recommendations.length === 0 && (!anime.jikanRecommendations || anime.jikanRecommendations.length === 0) && (
                 <div className="text-center py-6 text-neutral-500 font-bold text-xs bg-neutral-900/50 rounded-xl border border-neutral-800">
                    لا توجد توصيات حتى الآن. كن أول من يضيف توصية!
                 </div>
              )}
            </div>

          </motion.div>
        )}

        {activeTab === 'characters' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {anime.characters && anime.characters.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {anime.characters.map((char: any, idx: number) => (
                  <div key={`${char.id}-${idx}`} className="bg-[#121212] flex justify-between items-stretch rounded-xl overflow-hidden border border-neutral-800 shadow-sm h-16 relative group hover:border-[#FF1744] transition-colors">
                    <div className="flex gap-2 w-1/2 overflow-hidden">
                       <img src={char.imageUrl || "https://via.placeholder.com/100x150"} alt={char.name} className="w-12 h-16 object-cover shrink-0" />
                       <div className="flex flex-col py-1.5 justify-between min-w-0 pr-1">
                          <h4 className="text-[10px] md:text-[11px] font-bold text-white truncate">{char.name}</h4>
                          <span className="text-[9px] text-[#FF1744] font-bold">{char.role}</span>
                       </div>
                    </div>
                    {char.voiceActor && (
                      <div className="flex gap-2 w-1/2 justify-end text-left bg-neutral-900/40 pl-1 overflow-hidden">
                         <div className="flex flex-col py-1.5 justify-between items-end min-w-0">
                            <h4 className="text-[10px] md:text-[11px] font-bold text-neutral-200 truncate w-full text-left">{char.voiceActor.name}</h4>
                            <span className="text-[8px] text-neutral-500 font-bold">مؤدي ياباني</span>
                         </div>
                         <img src={char.voiceActor.imageUrl || "https://via.placeholder.com/100x150"} alt={char.voiceActor.name} className="w-12 h-16 object-cover shrink-0" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-neutral-500 text-xs font-bold bg-[#1E1E1E] rounded-2xl border border-neutral-800">لا توجد تفاصيل عن الشخصيات حالياً.</div>
            )}
          </motion.div>
        )}

        {activeTab === 'episodes' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
             {anime.episodes && anime.episodes.length > 0 ? anime.episodes.map((ep: any, idx: number) => {
               const epIdx = ep.num || (idx + 1);
               const isWatched = userEntry?.status === 'completed' || userEntry?.watchedEpisodes?.includes(epIdx) || false;
               return (
               <motion.div 
                 key={`${ep.id}-${idx}`}
                 onClick={() => onWatch(ep, anime)}
                 whileHover={{ scale: 1.01, x: -4 }}
                 whileTap={{ scale: 0.99 }}
                 className={`w-full bg-[#1E1E1E] border ${isWatched ? 'border-green-500/35' : 'border-neutral-800'} rounded-xl p-4 flex justify-between items-center transition-all duration-300 group shadow-md cursor-pointer relative overflow-hidden gpu-accelerated`}
               >
                 {/* Left Side: Title & Info aligned appropriately */}
                 <div className="flex flex-col text-right dir-rtl min-w-0 pr-1">
                   <h4 className="font-bold text-white text-sm group-hover:text-red-500 transition line-clamp-1">
                     {ep.title || `الحلقة ${ep.num}`}
                   </h4>
                   <span className="text-[10px] text-neutral-400 mt-0.5">رقم الحلقة {epIdx}</span>
                 </div>

                 {/* Right Side: Episode marking toggle (Opposite edge checkbox layout) */}
                 <button 
                   onClick={(e) => {
                     e.stopPropagation();
                     handleToggleWatchedEpisode(epIdx, e);
                   }}
                   className={`p-2.5 shrink-0 rounded-xl border transition-all ${
                     isWatched 
                       ? 'bg-green-500/20 text-green-500 border-green-500/30' 
                       : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-500 hover:text-white'
                   } z-10 active:scale-95`}
                   title={isWatched ? "إلغاء تحديد المشاهدة" : "تحديد كمشاهدة"}
                 >
                   {isWatched ? (
                     <CheckSquare size={18} />
                   ) : (
                     <div className="w-[18px] h-[18px] border-2 border-neutral-500 rounded transition group-hover:border-neutral-400" />
                   )}
                 </button>
               </motion.div>
             )}) : (
               <div className="text-center py-10 text-sm font-bold text-neutral-500 bg-[#1E1E1E] rounded-2xl border border-neutral-800">
                 لا توجد حلقات متاحة حالياً
               </div>
             )}
          </motion.div>
        )}

        {activeTab === 'photos' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-28">
            {loadingPictures ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <Loader2 className="animate-spin text-[#FF1744]" size={20} />
                <p className="text-xs text-neutral-500 font-bold">جاري تحميل البوم الصور...</p>
              </div>
            ) : pictures.length === 0 ? (
              <div className="text-center py-10 text-xs font-bold text-neutral-500 bg-[#1E1E1E] rounded-2xl border border-neutral-800">
                لا توجد صور متوفرة لهذا الأنمي حالياً.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pictures.map((picUrl, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedPhoto(picUrl)}
                    className="aspect-[4/3] bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800/60 shadow-md cursor-pointer relative group"
                  >
                    <img
                      src={picUrl}
                      alt={`anime-picture-${idx}`}
                      className="w-full h-full object-cover group-hover:brightness-110 transition duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="bg-black/70 backdrop-blur text-[10px] text-white px-2.5 py-1 rounded-full font-bold">توسيع الصورة 🔍</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

      </div>

      <AnimatePresence>
        {selectedPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto z-[120] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
          >
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="relative max-w-3xl w-full flex flex-col items-center gap-4 bg-transparent animate-fadeIn text-right"
              dir="rtl"
            >
              <button 
                onClick={() => setSelectedPhoto(null)}
                className="absolute -top-12 right-2 w-10 h-10 flex items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 transition cursor-pointer z-50 shadow-md"
              >
                <X size={20} />
              </button>

              <div className="w-full max-h-[80vh] flex items-center justify-center rounded-2xl overflow-hidden bg-neutral-950/75 border border-neutral-800/80 shadow-2xl relative select-none p-1">
                <img 
                  src={selectedPhoto} 
                  alt="Magnified Anime" 
                  className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain pointer-events-none shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex gap-2 w-full justify-center">
                <button
                  type="button"
                  onClick={() => handleDownloadImage(selectedPhoto)}
                  className="bg-[#FF1744] hover:bg-rose-600 active:scale-95 text-white font-black text-xs py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(255,23,68,0.45)] cursor-pointer select-none"
                >
                  {downloadingPhoto ? (
                    <Loader2 size={15} className="animate-spin text-white" />
                  ) : (
                    <Download size={15} />
                  )}
                  <span>تنزيل الصورة بأقصى دقة جودة</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {showAddRecModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto z-[100] bg-black/90 backdrop-blur flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-[#1E1E1E] rounded-3xl overflow-hidden shadow-2xl border border-neutral-800 flex flex-col"
            >
              <div className="flex justify-between items-center p-4 border-b border-neutral-800">
                <h3 className="font-black text-white text-lg">إضافة توصية</h3>
                <button 
                  onClick={() => setShowAddRecModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:text-white hover:bg-[#FF1744] transition"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleAddRec} className="p-4 space-y-4">
                <div>
                  <label className="text-xs text-neutral-400 font-bold mb-1 block">ابحث عن الأنمي المشابه</label>
                  {!selectedRecAnime ? (
                    <div className="relative">
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        {searchingRecs ? <Loader2 size={16} className="text-neutral-500 animate-spin" /> : <Search size={16} className="text-neutral-500" />}
                      </div>
                      <input 
                        type="text" 
                        value={recSearchQuery}
                        onChange={e => setRecSearchQuery(e.target.value)}
                        placeholder="اكتب اسم الأنمي..."
                        className="w-full bg-[#121212] border border-neutral-700 rounded-xl pr-10 pl-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                      />
                      {recSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1E1E1E] border border-neutral-700 rounded-xl shadow-xl overflow-hidden z-50">
                          {recSearchResults.map((res, sIdx) => (
                            <div 
                              key={`${res._id || ''}-${sIdx}`} 
                              onClick={() => { setSelectedRecAnime(res); setRecSearchResults([]); setRecSearchQuery(res.title); }}
                              className="flex items-center gap-3 p-2 hover:bg-neutral-800 cursor-pointer transition border-b border-neutral-800/50 last:border-0"
                            >
                              <img src={res.posterUrl} alt={res.title} className="w-8 h-10 object-cover rounded" />
                              <span className="text-xs font-bold text-white line-clamp-1">{res.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-[#121212] border border-[#FF1744]/50 rounded-xl p-2 shrink-0">
                      <div className="flex items-center gap-3">
                         <img src={selectedRecAnime.posterUrl} alt={selectedRecAnime.title} className="w-10 h-14 object-cover rounded" />
                         <span className="text-xs font-bold text-white line-clamp-2">{selectedRecAnime.title}</span>
                      </div>
                      <button type="button" onClick={() => { setSelectedRecAnime(null); setRecSearchQuery(''); }} className="p-2 text-neutral-500 hover:text-white transition">
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-neutral-400 font-bold mb-1 block">سبب التوصية (أقنع المشرفين)</label>
                  <textarea 
                    value={recReason}
                    onChange={e => setRecReason(e.target.value)}
                    placeholder="لماذا يشبه هذا الأنمي؟"
                    className="w-full bg-[#121212] border border-neutral-700 rounded-xl px-3 py-2 text-white text-sm focus:border-blue-500 outline-none min-h-[80px]"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={submittingRec || !selectedRecAnime || !recReason.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition flex justify-center items-center"
                >
                  {submittingRec ? <Loader2 className="animate-spin" /> : "إرسال للمراجعة"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showListModal && user && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto z-[100] bg-black/90 backdrop-blur flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl border border-neutral-800 flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center p-4 border-b border-white/5">
                <h3 className="font-black text-white text-md">إدارة القوائم والتصنيف</h3>
                <button 
                  onClick={() => setShowListModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto hide-scrollbar space-y-6 flex-1">
                <div>
                    <h4 className="text-xs font-bold text-neutral-500 mb-3 uppercase tracking-wider">القوائم الرئيسية</h4>
                    <div className="space-y-2">
                      {MAIN_LISTS.map(list => {
                         const isActive = userEntry?.status === list.id;
                         const Icon = list.icon;
                         return (
                           <button 
                             key={list.id}
                             onClick={() => handleUpdateStatus(list.id)}
                             className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                                isActive ? 'bg-neutral-800 border-neutral-600 shadow-md ring-1 ring-white/10' : 'bg-[#121212] border-neutral-800 hover:border-neutral-700'
                             }`}
                           >
                              <div className="flex items-center gap-3">
                                <Icon size={18} className={list.color} />
                                <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-neutral-300'}`}>{list.label}</span>
                              </div>
                             {isActive && <div className={`w-2 h-2 rounded-full ${list.color.replace('text-', 'bg-')} shadow-[0_0_10px_currentColor] ${list.color}`} />}
                           </button>
                         )
                      })}
                    </div>
                </div>
 
                <div>
                   <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">القوائم المخصصة</h4>
                      <span className="text-[10px] text-neutral-400 font-bold bg-white/5 px-1.5 py-0.5 rounded">{customLists.length} قوائم</span>
                   </div>
                   
                   {customLists.length > 0 ? (
                     <div className="space-y-2 mb-4 max-h-[160px] overflow-y-auto hide-scrollbar pr-0.5">
                       {customLists.map(list => {
                          const isActive = userEntry?.customLists?.[list.id] === true;
                          return (
                            <button 
                              key={list.id}
                              onClick={() => handleToggleCustomList(list.id)}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                                 isActive ? 'bg-red-500/10 border-red-500/40 text-red-500' : 'bg-[#121212] border-neutral-800 hover:border-neutral-700'
                              }`}
                            >
                              <span className={`text-sm font-bold ${isActive ? 'text-red-400' : 'text-neutral-300'}`}>{list.name}</span>
                              <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${isActive ? 'bg-red-500 border-red-500' : 'border-neutral-700'}`}>
                                 {isActive && <span className="text-white text-xs font-black">✓</span>}
                              </div>
                            </button>
                          )
                       })}
                     </div>
                   ) : (
                     <p className="text-[10px] text-neutral-500 text-center py-2 mb-3 bg-white/2 border border-dashed border-neutral-800 rounded-xl">لا توجد قوائم مخصصة بعد</p>
                   )}

                   {/* Quick custom list creator */}
                   <div className="pt-3 border-t border-neutral-800">
                      <h5 className="text-[10px] font-bold text-neutral-400 mb-2">إنشاء قائمة مخصصة جديدة وسريعة:</h5>
                      <form onSubmit={handleCreateAndToggleList} className="flex gap-2">
                        <input 
                          type="text"
                          value={newListName || ''}
                          onChange={(e) => setNewListName(e.target.value)}
                          placeholder="اكتب اسم القائمة..."
                          className="flex-1 text-xs bg-[#121212] border border-neutral-800 rounded-xl px-3 py-2 text-white outline-none focus:border-red-500 transition-colors"
                          maxLength={25}
                        />
                        <button 
                          type="submit" 
                          disabled={creatingCustomList || !newListName.trim()}
                          className="px-3.5 py-2 bg-red-600 text-white text-xs font-black rounded-xl hover:bg-red-500 transition disabled:opacity-40"
                        >
                          {creatingCustomList ? '...' : 'إنشاء'}
                        </button>
                      </form>
                   </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showCelebration && celebrationDetails && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto bg-black/95 z-[150] flex items-center justify-center p-4 backdrop-blur-md"
          >
            <div className="bg-[#0b0c10] w-full max-w-md rounded-3xl border border-yellow-500/30 overflow-hidden shadow-[0_0_50px_rgba(234,179,8,0.15)] relative text-center text-white font-sans">
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-yellow-500 via-amber-400 to-orange-500" />
              
              <div className="p-8 space-y-6">
                <div className="flex justify-center">
                  <motion.div 
                    initial={{ scale: 0.5, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-24 h-24 bg-gradient-to-tr from-yellow-500 to-amber-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.4)]"
                  >
                    <Trophy size={48} className="text-[#0a0a0c] -ml-0.5" />
                  </motion.div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-transparent bg-gradient-to-r from-yellow-400 to-amber-200 bg-clip-text">تم اجتياز اختبار المشاهدة!</h3>
                  <p className="text-neutral-400 text-xs text-center leading-relaxed">لقد قمت بإثبات مشاهدة أنمي <span className="text-white font-bold">"{anime?.title}"</span> بنجاح وحصلت على جوائز المشاهد الحقيقية كاملة بعد اجتياز فحص منع الغش!</p>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="flex flex-col items-center p-3 bg-black/40 rounded-xl">
                    <span className="text-2xl font-black text-yellow-500">+{celebrationDetails.coins}</span>
                    <span className="text-[10px] text-neutral-400 font-bold mt-1">كوينز أوتاكو</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-black/40 rounded-xl">
                    <span className="text-2xl font-black text-sky-400">+{celebrationDetails.xp}</span>
                    <span className="text-[10px] text-neutral-400 font-bold mt-1">خبرة (XP)</span>
                  </div>
                </div>

                <p className="text-[10px] text-yellow-500/80 bg-yellow-500/10 py-2.5 px-3 rounded-xl border border-yellow-500/20 text-center leading-normal font-bold">
                   🚀 تمت إضافة الجوائز لرصيدك، وتم تصنيف الأنمي في قائمتك كـ "مكتمل" بنجاح!
                </p>

                <button 
                  onClick={() => {
                     setShowCelebration(false);
                     setCelebrationDetails(null);
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black rounded-xl font-black text-xs transition duration-300 shadow-lg shadow-yellow-500/10 active:scale-95"
                >
                  استلام المكافآت والمتابعة
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {showQuizModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl mx-auto bg-black/90 z-[150] flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <div className="bg-[#0f0f13] w-full max-w-md rounded-2xl border border-red-500/30 overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-red-500 to-orange-500 opacity-50" />
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#09090b]">
                <h3 className="font-black text-white flex items-center gap-2"><ShieldCheck size={18} className="text-red-500" /> نظام منع الغش</h3>
                <button 
                  onClick={() => {
                    setShowQuizModal(false);
                    setPendingUpdate(null);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-neutral-400 transition"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-6">
                 {quizLoading && (
                   <div className="flex flex-col items-center py-6">
                      <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-4" />
                      <p className="text-sm font-bold text-neutral-400">جاري إحضار سؤال المراقبة...</p>
                   </div>
                 )}
                 {quizError && !quizLoading && (
                   <div className="text-center py-4">
                     <p className="text-red-400 mb-4 font-bold text-sm">{quizError}</p>
                     <button onClick={fetchQuiz} className="bg-red-500/20 text-red-500 px-4 py-2 flex items-center justify-center gap-2 w-full rounded-lg font-bold hover:bg-red-500/30 transition">
                       حاول مرة أخرى
                     </button>
                   </div>
                 )}
                 {quizData && !quizLoading && (
                   <div className="space-y-4">
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                        <p className="text-sm leading-relaxed font-bold text-white mb-2" dangerouslySetInnerHTML={{ __html: quizData.question }}></p>
                        <span className="text-[10px] text-red-400 font-bold bg-red-400/10 px-2 py-0.5 rounded">إثبات مشاهدة الانمي</span>
                      </div>
                      <div className="space-y-2">
                        {quizData.options.map((opt: string, idx: number) => (
                           <button 
                             key={idx}
                             onClick={() => {
                               if (idx === quizData.correct) {
                                  setShowQuizModal(false);
                                  
                                  const isCompletedTransition = (pendingUpdate?.status === 'completed' || pendingUpdate === null) && userEntry?.status !== 'completed';
                                  let rewardDetails = { coins: 50, xp: 250 };
                                  if (user && anime) {
                                     const baseEpsCount = anime.episodesCount || anime.episodes?.length || 0;
                                     rewardDetails = getAnimeRewards(baseEpsCount);
                                  }

                                  if (isCompletedTransition && user) {
                                     setCelebrationDetails(rewardDetails);
                                     setShowCelebration(true);
                                  }
                                  
                                  const extraXp = 0;
                                  const extraCoins = 0;
                                  
                                  if (pendingUpdate) {
                                    executeStatusUpdate({ ...pendingUpdate, extraXp, extraCoins });
                                  } else {
                                    executeStatusUpdate({ status: 'completed', extraXp, extraCoins });
                                  }
                                  setPendingUpdate(null);
                               } else {
                                 setQuizData(null);
                                 setQuizError('إجابة خاطئة! يبدو أنك لم تشاهد الأنمي جيداً.');
                               }
                             }}
                             className="w-full bg-[#121212] hover:bg-red-500/20 hover:border-red-500/50 border border-neutral-800 text-right p-3 rounded-xl transition text-sm font-bold text-neutral-300"
                           >
                             {opt}
                           </button>
                        ))}
                      </div>
                   </div>
                 )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
