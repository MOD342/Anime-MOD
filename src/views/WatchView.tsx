import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronRight, 
  Settings, 
  MessageSquare, 
  Download, 
  Share2, 
  Server, 
  Play, 
  ListVideo, 
  Tv, 
  ThumbsUp, 
  Trash2, 
  Send, 
  Loader2, 
  Lock 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { recordEpisodeWatch } from '../services/gamificationService';
import CustomVideoPlayer from '../components/CustomVideoPlayer';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { STORE_ITEMS_SORTED, getAvatarShapeClass } from '../data/storeItems';

interface WatchViewProps {
  onBack: () => void;
  episode?: any;
  anime?: any;
  onEpisodeSelect?: (ep: any) => void;
}

export default function WatchView({ onBack, episode: initialEpisode, anime, onEpisodeSelect }: WatchViewProps) {
  const [episode, setEpisode] = useState(initialEpisode);
  const [activeTab, setActiveTab] = useState<'servers' | 'episodes' | 'comments'>('servers');
  const [useAdBlocker, setUseAdBlocker] = useState(true);
  const [servers, setServers] = useState<any[]>([]);
  const [activeServerUrl, setActiveServerUrl] = useState<string | null>(null);
  const [loadingServers, setLoadingServers] = useState(false);
  const [extractedUrl, setExtractedUrl] = useState<string | null>(null);
  const [extractedType, setExtractedType] = useState<'direct' | 'hls'>('direct');
  const [extractedSources, setExtractedSources] = useState<any[]>([]);
  const [extracting, setExtracting] = useState(false);
  const { user, userData, userRole } = useAuth();
  const MIN_COMMENT_LEVEL = 5;
  const userLevel = userData?.level || 1;
  const isMod = userRole === 'owner' || userRole === 'admin' || userRole === 'moderator';

  // Real-time Watchroom Live Chat States
  const [liveComments, setLiveComments] = useState<any[]>([]);
  const [newChatText, setNewChatText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  
  useEffect(() => {
    if (anime && episode) {
      try {
        const history = JSON.parse(localStorage.getItem('animeHistory') || '[]');
        const updated = history.filter((h: any) => h.id !== anime._id);
        updated.unshift({
          id: anime._id,
          title: anime.title,
          posterUrl: anime.posterUrl,
          lastEpisode: episode.num,
          watchedAt: new Date().toISOString()
        });
        // Keep only last 20
        localStorage.setItem('animeHistory', JSON.stringify(updated.slice(0, 20)));
      } catch (e) {}

      if (user) {
        const parseEpisodeNumber = (numVal: any, titleStr: string): number => {
          if (numVal !== undefined && numVal !== null && !isNaN(Number(numVal))) return Number(numVal);
          const text = String(numVal || titleStr || '');
          const match = text.match(/\d+/);
          if (match) {
            const parsed = parseInt(match[0], 10);
            if (!isNaN(parsed)) return parsed;
          }
          return 1;
        };
        const epNum = parseEpisodeNumber(episode?.num, episode?.title || '');
        recordEpisodeWatch(user.uid, anime, epNum).catch(console.error);
      }
    }

    // Fetch Servers
    if (episode) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setLoadingServers(true);
      fetch('/api/anime/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: episode.id || episode.link })
      })
      .then(r => r.json())
      .then(data => {
        if (data && data.success && data.data) {
          setServers(data.data);
          if (data.data.length > 0) {
            handleServerSelect(data.data[0].url);
          }
        } else {
          setServers([]);
          setActiveServerUrl(null);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingServers(false));
    }
  }, [anime, episode]);

  // Read comments in real time for specific watch room
  useEffect(() => {
    if (!anime || !episode) return;
    
    setLiveComments([]); // reset
    
    const epCommentsId = `${anime._id}-ep-${episode.num}`;
    const q = query(
      collection(db, 'comments'),
      where('animeId', '==', epCommentsId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort chronologically on the client to circumvent custom index requirements
      list.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeA - timeB;
      });
      setLiveComments(list);
    }, (error) => {
      console.error("Real-time watchroom comments snapshot error", error);
    });
    
    return () => unsubscribe();
  }, [anime, episode]);

  const handleServerSelect = async (url: string) => {
    setActiveServerUrl(url);
    setExtractedUrl(null);
    setExtractedSources([]);
    
    // Check client-side extraction cache
    try {
      const cached = sessionStorage.getItem(`client_extracted_${url}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setExtractedUrl(parsed.directUrl);
        setExtractedType(parsed.type || 'direct');
        setExtractedSources(parsed.sources || []);
        setExtracting(false);
        return;
      }
    } catch (e) {}

    setExtracting(true);
    try {
      const res = await fetch('/api/anime/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const json = await res.json();
      if (json.success && json.data?.directUrl) {
        setExtractedUrl(json.data.directUrl);
        setExtractedType(json.data.type || 'direct');
        setExtractedSources(json.data.sources || []);
        try {
          sessionStorage.setItem(`client_extracted_${url}`, JSON.stringify({
            directUrl: json.data.directUrl,
            type: json.data.type || 'direct',
            sources: json.data.sources || []
          }));
        } catch (e) {}
      } else {
        setExtractedUrl(null); // fallback to iframe
        setExtractedSources([]);
      }
    } catch (e) {
      setExtractedUrl(null);
      setExtractedSources([]);
    } finally {
      setExtracting(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newChatText.trim()) return;
    if (userLevel < MIN_COMMENT_LEVEL) return;
    
    setSendingChat(true);
    try {
      const epCommentsId = `${anime._id}-ep-${episode.num}`;
      const commentPayload: any = {
        animeId: epCommentsId,
        userId: user.uid,
        userDisplayName: userData?.displayName || user.displayName || 'نينجا مجهول',
        text: newChatText.trim(),
        likes: 0,
        dislikes: 0,
        createdAt: serverTimestamp()
      };
      
      // Inject cosmetics if they are present
      if (user.photoURL) commentPayload.userPhotoUrl = user.photoURL;
      if (userData?.equippedAvatar) commentPayload.equippedAvatar = userData.equippedAvatar;
      if (userData?.equippedFrame) commentPayload.equippedFrame = userData.equippedFrame;
      if (userData?.equippedTitle) commentPayload.equippedTitle = userData.equippedTitle;
      if (userData?.equippedBadge) commentPayload.equippedBadge = userData.equippedBadge;

      await addDoc(collection(db, 'comments'), commentPayload);
      setNewChatText('');
      
      // Increment gamification points
      try {
        const { incrementInteraction } = await import('../services/gamificationService');
        await incrementInteraction(user.uid, 'comment');
      } catch (err) {}
    } catch (err) {
      console.error("Failed to post watchroom chat", err);
    } finally {
      setSendingChat(false);
    }
  };

  const handleLikeComment = async (chatId: string, currentLikes: number) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'comments', chatId), {
        likes: currentLikes + 1
      });
    } catch (e) {
      console.error("Error liking comment", e);
    }
  };

  const handleDeleteComment = async (chatId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التعليق؟")) return;
    try {
      const { moderationService } = await import('../services/moderationService');
      await moderationService.deleteComment(chatId);
    } catch (e) {
      console.error("Error deleting comment", e);
    }
  };

  // Find next episode in the list
  const getNextEpisode = () => {
    const episodesList = anime?.episodes || [];
    if (episodesList.length <= 1) return null;
    const currentIdx = episodesList.findIndex((ep: any) => ep.id === episode?.id);
    if (currentIdx === -1) return null;

    // Determine sort direction of list
    const isDescending = parseInt(episodesList[0]?.num || 0) > parseInt(episodesList[episodesList.length - 1]?.num || 0);

    if (isDescending) {
      if (currentIdx > 0) {
        return episodesList[currentIdx - 1];
      }
    } else {
      if (currentIdx < episodesList.length - 1) {
        return episodesList[currentIdx + 1];
      }
    }
    return null;
  };

  const nextEpisode = getNextEpisode();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="bg-[#050505] min-h-screen flex flex-col"
    >
      {/* Cinema mode exit floating toggle */}
      {isCinemaMode && (
        <button 
          onClick={() => setIsCinemaMode(false)}
          className="fixed bottom-6 right-6 z-[60] bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-purple-500/30 transition-all scale-100 hover:scale-105 active:scale-95"
        >
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          إلغاء نمط السينما
        </button>
      )}

      {/* Video Player Area */}
      <div className="w-full aspect-video bg-black relative flex flex-col justify-between border-b border-neutral-900 sticky top-0 z-50 overflow-hidden group shadow-2xl">
        <button onClick={onBack} className="absolute top-4 right-4 w-10 h-10 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white z-20 border border-white/10 hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100 shadow-lg select-none">
          <ChevronRight size={22} className="-translate-x-0.5" />
        </button>
        
        {/* Actual Player */}
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-950">
          {loadingServers || extracting ? (
              <div className="flex flex-col items-center gap-3">
                 <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"/>
                 <span className="text-sm font-bold text-neutral-400">{extracting ? 'جاري استخراج رابط المشاهدة...' : 'جاري جلب السيرفرات...'}</span>
              </div>
          ) : (extractedUrl && extractedType !== 'iframe') || (activeServerUrl && servers.find(s => s.url === activeServerUrl)?.type === 'direct') ? (
               <CustomVideoPlayer 
                 url={extractedUrl || activeServerUrl || ''} 
                 type={extractedType}
                 sources={extractedSources}
                 poster={anime?.posterUrl}
                 episodeTitle={episode?.title || `الحلقة ${episode?.num}`}
                 onFallback={() => {
                   setExtractedUrl(null);
                   setExtractedType('iframe');
                 }}
                 hasNextEpisode={!!nextEpisode}
                 onNextEpisode={() => {
                   if (nextEpisode) {
                     setEpisode(nextEpisode);
                     if (onEpisodeSelect) onEpisodeSelect(nextEpisode);
                   }
                 }}
               />
          ) : activeServerUrl ? (
               <iframe 
                 src={activeServerUrl || undefined} 
                 className="w-full h-full border-none bg-black" 
                 sandbox={useAdBlocker && !(
                   activeServerUrl.includes('mega.nz') || 
                   activeServerUrl.includes('drive.google.com') || 
                   activeServerUrl.includes('google') ||
                   activeServerUrl.includes('ok.ru') ||
                   activeServerUrl.includes('sibnet') ||
                   activeServerUrl.includes('samaup')
                 ) ? "allow-scripts allow-same-origin allow-presentation allow-forms" : undefined} 
                 allowFullScreen
               />
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-neutral-900/80 backdrop-blur-md border border-neutral-800 flex items-center justify-center mb-4 transition-all duration-300">
                <Play size={24} fill="currentColor" className="text-neutral-500 ml-1" />
              </div>
              <p className="text-neutral-500 font-bold text-sm">لا توجد سيرفرات متاحة</p>
            </div>
          )}
        </div>
      </div>

      {/* Safe Embed / Server Ad-Blocker Toggle */}
      {activeServerUrl && !extractedUrl && (
        <div className="mx-4 mt-4 p-3.5 bg-purple-950/20 border border-purple-500/20 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${useAdBlocker ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
            <div className="text-right">
              <span className="text-xs font-black text-neutral-100 block">وضع حظر إعلانات السيرفرات (Ad-Block)</span>
              <span className="text-[10px] text-neutral-400">يمنع النوافذ المنبثقة والتحويلات المزعجة لسيرفرات المشاهدة تلقائياً</span>
            </div>
          </div>
          <button 
            onClick={() => setUseAdBlocker(!useAdBlocker)}
            className={`text-[10px] font-black px-4 py-2 rounded-xl transition-all ${useAdBlocker ? 'bg-purple-600 text-white shadow-md' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
          >
            {useAdBlocker ? 'مفعّل تلقائياً ✓' : 'إلغاء التفعيل'}
          </button>
        </div>
      )}

      {/* Info & Controls */}
      <div className={`p-4 flex-1 overflow-y-auto pb-24 transition-all duration-500 ${isCinemaMode ? 'opacity-10 pointer-events-none filter blur-[1.5px]' : 'opacity-100'}`}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white leading-tight mb-1 tracking-tight">
              {episode?.title || `الحلقة ${episode?.num}`}
            </h1>
            <p className="text-sm text-neutral-400 font-bold">{anime?.title || 'أنمي'}</p>
          </div>
        </div>

        {(extractedUrl || (activeServerUrl && servers.find(s => s.url === activeServerUrl)?.type === 'direct')) && (
           <div className="flex flex-wrap gap-2 mb-6">
              <a 
                href={`intent:${extractedUrl || activeServerUrl}#Intent;package=com.mxtech.videoplayer.ad;S.title=${anime?.title || 'Anime'}_Ep${episode?.num};end`}
                className="flex-1 bg-[#1a4b9c] rounded-xl p-3 flex items-center justify-center gap-2 text-white text-xs font-bold shadow-lg hover:bg-[#133878] transition"
              >
                 <Play size={16} /> MX Player
              </a>
              <a 
                href={`intent:${extractedUrl || activeServerUrl}#Intent;package=com.dv.adm;S.title=${anime?.title || 'Anime'}_Ep${episode?.num};end`}
                className="flex-1 bg-[#d84e20] rounded-xl p-3 flex items-center justify-center gap-2 text-white text-xs font-bold shadow-lg hover:bg-[#b03d17] transition"
              >
                 <Download size={16} /> ADM (تحميل)
              </a>
           </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-8">
          <button className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-neutral-900/50 hover:bg-neutral-800 border border-neutral-800/50 text-neutral-400 hover:text-white transition group">
            <Share2 size={22} className="group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold">مشاركة</span>
          </button>
          
          <button 
            onClick={() => setIsCinemaMode(!isCinemaMode)}
            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition group ${isCinemaMode ? 'bg-purple-900/40 border-purple-500 text-purple-400 font-bold shadow-lg shadow-purple-500/10' : 'bg-neutral-900/50 hover:bg-neutral-800 border-neutral-800/50 text-neutral-400 hover:text-white'}`}
          >
            <Tv size={22} className={`transition-transform ${isCinemaMode ? 'scale-110 animate-pulse' : 'group-hover:scale-110'}`} />
            <span className="text-[11px] font-bold">نمط السينما</span>
          </button>

          <button className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-neutral-900/50 hover:bg-neutral-800 border border-neutral-800/50 text-neutral-400 hover:text-white transition group">
            <Settings size={22} className="group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-bold">إعدادات</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-neutral-900/80 backdrop-blur-md rounded-xl p-1 mb-6 shadow-inner border border-neutral-800/50">
          <button 
            onClick={() => setActiveTab('episodes')}
            className={`flex-1 py-1.5 md:py-2.5 text-[10px] md:text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-300 ${activeTab === 'episodes' ? 'bg-[#151515] text-white shadow-sm ring-1 ring-white/10' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <ListVideo size={14} /> الحلقات
          </button>
          <button 
            onClick={() => setActiveTab('servers')}
            className={`flex-1 py-1.5 md:py-2.5 text-[10px] md:text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-300 ${activeTab === 'servers' ? 'bg-[#151515] text-white shadow-sm ring-1 ring-white/10' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <Server size={14} /> السيرفرات
          </button>
          <button 
            onClick={() => setActiveTab('comments')}
            className={`flex-1 overflow-hidden relative py-1.5 md:py-2.5 text-[10px] md:text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-300 ${activeTab === 'comments' ? 'bg-[#151515] text-white shadow-sm ring-1 ring-white/10' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            <MessageSquare size={14} /> التعليقات
          </button>
        </div>

        {/* Active Tab Content */}
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.2 }}
        >
          {activeTab === 'comments' && (
             <div className="w-full">
               {userLevel < MIN_COMMENT_LEVEL ? (
                 <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-2xl p-8 text-center flex flex-col items-center">
                    <Lock size={44} className="text-neutral-700 mb-3" />
                    <h3 className="text-white font-bold mb-1.5">غرفة الدردشة مقفلة</h3>
                    <p className="text-neutral-500 text-xs mb-4 max-w-sm leading-relaxed">
                      يجب أن تصل إلى المستوى {MIN_COMMENT_LEVEL} لفتح ميزة الدردشة والتعليق في غرف المشاهدة المباشرة للحلقات.
                    </p>
                    <span className="bg-neutral-800 text-neutral-400 text-[10px] font-black px-4 py-1.5 rounded-full border border-neutral-700/50">
                       مستواك الحالي: {userLevel}
                    </span>
                 </div>
               ) : (
                 <div className="bg-neutral-950/60 border border-neutral-900 rounded-2xl p-4 flex flex-col h-[500px]">
                    {/* Chat Header */}
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-3 shrink-0">
                       <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs font-black text-white/95">الدردشة الحية للحلقة</span>
                       </div>
                       <span className="text-[10px] text-[#FF1744] font-bold bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                          {liveComments.length} تعليق نشط
                       </span>
                    </div>

                    {/* Chat Message Scroll Panel */}
                    <div 
                      className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-thin scrollbar-thumb-neutral-800 scroll-smooth flex flex-col" 
                      dir="rtl"
                      ref={(el) => {
                        if (el) {
                          el.scrollTop = el.scrollHeight;
                        }
                      }}
                    >
                       {liveComments.length === 0 ? (
                         <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
                            <MessageSquare size={36} className="text-neutral-800 mb-3 animate-bounce" />
                            <h4 className="text-xs font-black text-neutral-400 mb-1">هدوء في الغرفة...</h4>
                            <p className="text-[10px] text-neutral-600 max-w-xs leading-relaxed">كن أول من يعلق أو يشارك أفكاره حول هذه الحلقة مع بقية المتابعين!</p>
                         </div>
                       ) : (
                         liveComments.map((chat: any) => {
                           const chatAvatar = STORE_ITEMS_SORTED.find(i => i.id === chat.equippedAvatar);
                           const chatFrame = STORE_ITEMS_SORTED.find(i => i.id === chat.equippedFrame);
                           const chatTitle = STORE_ITEMS_SORTED.find(i => i.id === chat.equippedTitle);
                           const chatBadge = STORE_ITEMS_SORTED.find(i => i.id === chat.equippedBadge);
                           
                           return (
                             <div key={chat.id} className="flex gap-2.5 items-start group">
                                {/* Cosmetic Avatar Container */}
                                <div className="relative p-0.5 shrink-0">
                                   <div className={`w-8 h-8 ${getAvatarShapeClass(chatFrame?.avatarShape)} overflow-hidden border border-neutral-800 bg-neutral-900 flex items-center justify-center`}>
                                      <img 
                                        src={chatAvatar?.img || chat.userPhotoUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + chat.userId} 
                                        className={`w-full h-full object-cover ${chatAvatar?.imageStyle || ''}`} 
                                        alt="chat-avatar"
                                        referrerPolicy="no-referrer"
                                      />
                                   </div>
                                   {chatFrame && (
                                      <div className={`absolute inset-0 ${getAvatarShapeClass(chatFrame.avatarShape)} pointer-events-none ${chatFrame.frameStyle}`} />
                                   )}
                                </div>

                                {/* Message block */}
                                <div className="flex-1 text-right">
                                   <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`text-[11px] font-black ${chatTitle ? chatTitle.color : 'text-neutral-200'}`}>
                                         {chat.userDisplayName}
                                      </span>
                                      {chatBadge && (
                                         <span className="p-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full inline-flex items-center justify-center" title={chatBadge.name}>
                                            {React.createElement(chatBadge.icon, { size: 8, className: chatBadge.color })}
                                         </span>
                                      )}
                                      {chatTitle && (
                                         <span className={`text-[8px] font-black tracking-wide uppercase px-1 bg-purple-950/20 border border-purple-500/10 rounded-md ${chatTitle.color}`}>
                                            {chatTitle.name}
                                         </span>
                                      )}
                                   </div>
                                   
                                   <p className="text-xs text-neutral-300 mt-1 bg-neutral-900/40 p-2.5 rounded-2xl rounded-tr-none border border-neutral-900 inline-block max-w-full break-words leading-relaxed text-right">
                                      {chat.text}
                                   </p>
                                   
                                   {/* Micro interactions */}
                                   <div className="flex items-center gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => handleLikeComment(chat.id, chat.likes || 0)} 
                                        className="text-[9px] font-bold text-neutral-500 hover:text-blue-400 transition flex items-center gap-1"
                                      >
                                         <ThumbsUp size={10} /> {chat.likes || 0}
                                      </button>
                                      {isMod && (
                                         <button 
                                           onClick={() => handleDeleteComment(chat.id)} 
                                           className="text-[9px] font-bold text-neutral-500 hover:text-red-500 transition flex items-center gap-1"
                                         >
                                            <Trash2 size={10} /> حذف
                                         </button>
                                      )}
                                   </div>
                                </div>
                             </div>
                           );
                         })
                       )}
                    </div>

                    {/* Message submission interface */}
                    <form onSubmit={handleSendChat} className="flex gap-2 mt-auto shrink-0 relative z-10">
                       <input 
                         type="text" 
                         value={newChatText}
                         onChange={e => setNewChatText(e.target.value)}
                         placeholder="اكتب رسالة لغرفة المشاهدة..." 
                         className="flex-1 bg-[#101010] border border-neutral-800 text-xs text-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-600 transition text-right" 
                         disabled={sendingChat}
                       />
                       <button 
                         type="submit" 
                         disabled={sendingChat || !newChatText.trim()}
                         className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-extrabold text-xs px-5 rounded-xl transition flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/10"
                       >
                          {sendingChat ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                       </button>
                    </form>
                 </div>
               )}
             </div>
          )}

          {activeTab === 'episodes' && (
            <div className="grid gap-2">
               {anime?.episodes?.map((ep: any, idx: number) => {
                 const isActive = ep.id === episode?.id;
                 return (
                   <button 
                     key={idx}
                     onClick={() => setEpisode(ep)}
                     className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${isActive ? 'bg-purple-900/20 border-purple-500/50 ring-1 ring-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-neutral-900/30 border-neutral-800/50 hover:bg-neutral-800/80 hover:border-neutral-700'}`}
                   >
                     <div className="flex items-center gap-3">
                       <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${isActive ? 'bg-purple-600 text-white shadow-md' : 'bg-neutral-800 text-neutral-400'}`}>
                         <Play size={14} fill={isActive ? "currentColor" : "none"} />
                       </div>
                       <div className="text-right">
                         <h4 className={`font-bold text-sm ${isActive ? 'text-purple-50' : 'text-neutral-200'}`}>
                           {ep.title || `الحلقة ${ep.num}`}
                         </h4>
                       </div>
                     </div>
                   </button>
                 );
               })}
            </div>
          )}

          {activeTab === 'servers' && (
            <div className="grid gap-3">
              {loadingServers ? (
                <div className="flex flex-col items-center justify-center py-12 text-neutral-500 gap-3">
                   <div className="h-0.5 w-16 bg-neutral-800 rounded overflow-hidden">
                     <div className="h-full bg-purple-500 animate-pulse" style={{ width: '60%'}}></div>
                   </div>
                   <span className="text-xs font-bold tracking-wide">جاري فحص السيرفرات...</span>
                </div>
              ) : servers.length === 0 ? (
                <div className="text-center text-red-400/80 font-bold p-8 border border-red-500/20 rounded-2xl bg-red-500/5">
                  عذراً، لا توجد سيرفرات متاحة لهذه الحلقة حالياً.
                </div>
              ) : (
                servers.map((s, i) => {
                  const isActive = activeServerUrl === s.url;
                  return (
                    <button 
                      key={i} 
                      onClick={() => handleServerSelect(s.url)}
                      className={`w-full relative overflow-hidden rounded-xl p-4 flex items-center justify-between group transition-all duration-300 border ${isActive ? 'bg-purple-900/20 border-purple-500 ring-1 ring-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'bg-[#0f0f0f] border-neutral-800/80 hover:bg-[#151515] hover:border-neutral-700'}`}
                    >
                      {isActive && <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-transparent pointer-events-none" />}
                      <div className="flex items-center gap-3 relative z-10">
                        <div className={`p-2.5 rounded-lg transition-colors ${isActive ? 'bg-purple-500 shadow-lg shadow-purple-500/30 text-white' : 'bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700 group-hover:text-white'}`}>
                          <Server size={18} />
                        </div>
                        <div className="text-right">
                          <h4 className={`font-black text-sm tracking-wide ${isActive ? 'text-white' : 'text-neutral-300'}`}>
                            {s.serverName}
                          </h4>
                          <span className={`text-[10px] font-bold ${isActive ? 'text-purple-300' : 'text-neutral-500'}`}>
                            {s.type === 'direct' ? 'تحميل مباشر' : 'مشاهدة'}
                          </span>
                        </div>
                      </div>
                      
                      {isActive && (
                        <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,1)] relative z-10 animate-pulse" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
