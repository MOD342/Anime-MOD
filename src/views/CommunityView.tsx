import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Gamepad2, 
  Medal, 
  Users, 
  MessageSquare, 
  Heart, 
  Share2, 
  Flame, 
  Send, 
  Sparkles, 
  TrendingUp, 
  Crown, 
  Lock, 
  Volume2, 
  CornerDownLeft, 
  Award,
  Loader2,
  X,
  Brain,
  Calculator,
  Music,
  Eye,
  Ghost,
  Clock,
  Laugh,
  ShieldAlert,
  Swords,
  Sword
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { STORE_ITEMS_SORTED, getAvatarShapeClass } from '../data/storeItems';
import { awardXP } from '../services/gamificationService';

const WhoSaidGame = lazy(() => import('../components/games/WhoSaidGame'));
const AnimeMathGame = lazy(() => import('../components/games/AnimeMathGame'));
const EmojiCharadesGame = lazy(() => import('../components/games/EmojiCharadesGame'));
const ImposterGame = lazy(() => import('../components/games/ImposterGame'));
const MemoryGame = lazy(() => import('../components/games/MemoryGame'));
const OpeningLyricsGame = lazy(() => import('../components/games/OpeningLyricsGame'));
const PixelGuessGame = lazy(() => import('../components/games/PixelGuessGame'));
const PowerLevelGame = lazy(() => import('../components/games/PowerLevelGame'));
const SilhouetteGame = lazy(() => import('../components/games/SilhouetteGame'));
const SpeedTriviaGame = lazy(() => import('../components/games/SpeedTriviaGame'));
const TierBattleGame = lazy(() => import('../components/games/TierBattleGame'));
const TimelineGame = lazy(() => import('../components/games/TimelineGame'));
const WeaponMatchGame = lazy(() => import('../components/games/WeaponMatchGame'));

const GAME_COMPONENTS: { [key: string]: React.ComponentType<{ onScoreUpdate: (pts: number) => void }> } = {
  quotes: WhoSaidGame,
  math: AnimeMathGame,
  emojis: EmojiCharadesGame,
  imposter: ImposterGame,
  memory: MemoryGame,
  lyrics: OpeningLyricsGame,
  pixel: PixelGuessGame,
  power: PowerLevelGame,
  silhouette: SilhouetteGame,
  trivia: SpeedTriviaGame,
  tier: TierBattleGame,
  timeline: TimelineGame,
  weapon: WeaponMatchGame,
};

const GAME_CATEGORIES = [
  { id: 'all', label: 'الكل' },
  { id: 'visual', label: 'بصريات وتخمين' },
  { id: 'trivia', label: 'معلومات عامة' },
  { id: 'observation', label: 'ذكاء وملاحظة' },
  { id: 'battle', label: 'معارك وقوة' },
];

const ALL_GAMES = [
  {
    id: 'quotes',
    title: 'من القائل؟',
    description: 'خمن شخصيات الأنمي الشهيرة من اقتباساتها وحصل على نقاط خبرة حقيقية.',
    icon: MessageSquare,
    category: 'trivia',
    colorClass: 'text-purple-400 bg-purple-500/10 hover:border-purple-500/30',
    colorGlow: 'bg-purple-500/10'
  },
  {
    id: 'emojis',
    title: 'ألغاز الإيموجي',
    description: 'تحدَّ فراستك في الربط بين الإيموجيات المبتكرة وعناوين الأنمي.',
    icon: Laugh,
    category: 'visual',
    colorClass: 'text-orange-400 bg-orange-500/10 hover:border-orange-500/30',
    colorGlow: 'bg-orange-500/10'
  },
  {
    id: 'math',
    title: 'رياضيات الأنمي',
    description: 'لعبة تجمع العمليات الحسابية بأرقام وإحصائيات وبطولات عالم الأنمي.',
    icon: Calculator,
    category: 'trivia',
    colorClass: 'text-green-400 bg-green-500/10 hover:border-green-500/30',
    colorGlow: 'bg-green-500/10'
  },
  {
    id: 'imposter',
    title: 'تحديد الدخيل',
    description: 'استخرج الشخصية أو الخيار الدخيل الذي لا ينتمي لنفس طاقم الأنمي.',
    icon: Ghost,
    category: 'observation',
    colorClass: 'text-violet-400 bg-violet-500/10 hover:border-violet-500/30',
    colorGlow: 'bg-violet-500/10'
  },
  {
    id: 'memory',
    title: 'لعبة الذاكرة',
    description: 'اختبر قوة ذاكرتك بمطابقة الوجوه وبطاقات الأبطال التاريخية.',
    icon: Brain,
    category: 'observation',
    colorClass: 'text-teal-400 bg-teal-500/10 hover:border-teal-500/30',
    colorGlow: 'bg-teal-500/10'
  },
  {
    id: 'lyrics',
    title: 'كلمات الشارات',
    description: 'اسمع اللحن بقلبك واحزر اسم الأنمي من الكلمات الغنائية للافتتاحيات.',
    icon: Music,
    category: 'trivia',
    colorClass: 'text-rose-400 bg-rose-500/10 hover:border-rose-500/30',
    colorGlow: 'bg-rose-500/10'
  },
  {
    id: 'pixel',
    title: 'تخمين الصورة البكسلية',
    description: 'خمن شخصية الأنمي من ملامحها المشوشة بكسلياً قبل زوال الضباب.',
    icon: Eye,
    category: 'visual',
    colorClass: 'text-yellow-400 bg-yellow-500/10 hover:border-yellow-500/30',
    colorGlow: 'bg-yellow-500/10'
  },
  {
    id: 'power',
    title: 'مستويات القوة',
    description: 'مقارنة قتالية مباشرة لأرقام ومستويات القوة بين شينوبي وصيادين وسحرة.',
    icon: ShieldAlert,
    category: 'battle',
    colorClass: 'text-red-400 bg-red-500/10 hover:border-red-500/30',
    colorGlow: 'bg-red-500/10'
  },
  {
    id: 'silhouette',
    title: 'ظلال الأبطال',
    description: 'هل تحفظ ملامح وتفاصيل أبطالك؟ حدد الشخصية بناءً على ظلها فقط.',
    icon: Sparkles,
    category: 'visual',
    colorClass: 'text-pink-400 bg-pink-500/10 hover:border-pink-500/30',
    colorGlow: 'bg-pink-500/10'
  },
  {
    id: 'trivia',
    title: 'تحدي السرعة الخاطف',
    description: 'أسئلة عامة سريعة في كافة تصانيف الأنمي، تحتاج سرعة بديهة خيالية.',
    icon: Clock,
    category: 'trivia',
    colorClass: 'text-blue-400 bg-blue-500/10 hover:border-blue-500/30',
    colorGlow: 'bg-blue-500/10'
  },
  {
    id: 'tier',
    title: 'معارك الفئات (Tiers)',
    description: 'صنف وقارن قوة أبطال الأنمي وحدد فئاتهم الأسطورية بناءً على البيانات.',
    icon: Swords,
    category: 'battle',
    colorClass: 'text-amber-500 bg-amber-500/10 hover:border-amber-500/30',
    colorGlow: 'bg-amber-500/10'
  },
  {
    id: 'timeline',
    title: 'الجدول الزمني الأبدي',
    description: 'رتب تواريخ إنتاج وإصدارات الأنميات الشهيرة تسلسلياً.',
    icon: Trophy,
    category: 'observation',
    colorClass: 'text-cyan-400 bg-cyan-500/10 hover:border-cyan-500/30',
    colorGlow: 'bg-cyan-500/10'
  },
  {
    id: 'weapon',
    title: 'سلاح ومقاتل',
    description: 'أقرن السيف أو التقنية أو السلاح السحري بصاحبه الحقيقي لتفوز.',
    icon: Sword,
    category: 'battle',
    colorClass: 'text-emerald-400 bg-emerald-500/10 hover:border-emerald-500/30',
    colorGlow: 'bg-emerald-500/10'
  }
];

interface CommunityViewProps {
  onUserClick?: (userId: string) => void;
}

export default function CommunityView({ onUserClick }: CommunityViewProps) {
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'feed' | 'challenges' | 'leaderboard'>('feed');

  // Feed Tab States
  const [posts, setPosts] = useState<any[]>([]);
  const [replies, setReplies] = useState<any[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [posting, setPosting] = useState(false);
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [newReplyText, setNewReplyText] = useState<{ [postId: string]: string }>({});
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Challenges Tab States
  const [activeChallengeGame, setActiveChallengeGame] = useState<string | null>(null);
  const [gameCategory, setGameCategory] = useState<string>('all');

  // Leaderboard Tab States
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  // 1. Listen to community posts & global community replies in real-time
  useEffect(() => {
    setLoadingPosts(true);
    // Listen to main posts where animeId is "community"
    const qPosts = query(
      collection(db, 'comments'),
      where('animeId', '==', 'community')
    );

    const unsubscribePosts = onSnapshot(qPosts, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort client-side to prevent composite index requirement
      list.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA; // post desc
      });
      setPosts(list);
      setLoadingPosts(false);
    }, (error) => {
      console.error("Error loading community posts:", error);
      setLoadingPosts(false);
    });

    // Listen to sub-replies where animeId is "community_reply"
    const qReplies = query(
      collection(db, 'comments'),
      where('animeId', '==', 'community_reply')
    );

    const unsubscribeReplies = onSnapshot(qReplies, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort replies ascending by date
      list.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeA - timeB;
      });
      setReplies(list);
    }, (error) => {
      console.error("Error loading community replies:", error);
    });

    return () => {
      unsubscribePosts();
      unsubscribeReplies();
    };
  }, []);

  // 2. Fetch Leaderboard in real-time (XP ranking)
  useEffect(() => {
    if (activeTab === 'leaderboard') {
      setLoadingLeaderboard(true);
      const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(25));
      
      const unsubscribeLeaderboard = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];
        // Filter out users with zero points to maintain competitive leaderboard
        setLeaders(list.filter(u => (u.xp || 0) > 0));
        setLoadingLeaderboard(false);
      }, (error) => {
        console.error("Leaderboard fetch failed", error);
        setLoadingLeaderboard(false);
      });

      return () => unsubscribeLeaderboard();
    }
  }, [activeTab]);

  // Form Submission for creating a main post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newPostText.trim()) return;

    setPosting(true);
    try {
      const postPayload: any = {
        animeId: 'community',
        userId: user.uid,
        userDisplayName: userData?.displayName || user.displayName || 'لاعب مجهول',
        text: newPostText.trim(),
        likes: 0,
        dislikes: 0,
        createdAt: serverTimestamp()
      };

      // Add user cosmetic properties if equipped
      if (user.photoURL) postPayload.userPhotoUrl = user.photoURL;
      if (userData?.equippedAvatar) postPayload.equippedAvatar = userData.equippedAvatar;
      if (userData?.equippedFrame) postPayload.equippedFrame = userData.equippedFrame;
      if (userData?.equippedTitle) postPayload.equippedTitle = userData.equippedTitle;
      if (userData?.equippedBadge) postPayload.equippedBadge = userData.equippedBadge;

      await addDoc(collection(db, 'comments'), postPayload);
      setNewPostText('');

      // Award XP for contributing a post (+10 XP)
      await awardXP(user.uid, 10);
    } catch (err) {
      console.error("Failed to publish community post", err);
    } finally {
      setPosting(false);
    }
  };

  // Form Submission for submitting a nested reply
  const handleCreateReply = async (postId: string) => {
    if (!user) return;
    const text = newReplyText[postId]?.trim();
    if (!text) return;

    try {
      const replyPayload: any = {
        animeId: 'community_reply',
        parentCommentId: postId,
        userId: user.uid,
        userDisplayName: userData?.displayName || user.displayName || 'لاعب مجهول',
        text: text,
        likes: 0,
        dislikes: 0,
        createdAt: serverTimestamp()
      };

      if (user.photoURL) replyPayload.userPhotoUrl = user.photoURL;
      if (userData?.equippedAvatar) replyPayload.equippedAvatar = userData.equippedAvatar;
      if (userData?.equippedFrame) replyPayload.equippedFrame = userData.equippedFrame;
      if (userData?.equippedTitle) replyPayload.equippedTitle = userData.equippedTitle;
      if (userData?.equippedBadge) replyPayload.equippedBadge = userData.equippedBadge;

      await addDoc(collection(db, 'comments'), replyPayload);
      setNewReplyText(prev => ({ ...prev, [postId]: '' }));

      // Award XP for reply (+5 XP)
      await awardXP(user.uid, 5);
    } catch (err) {
      console.error("Failed to publish reply", err);
    }
  };

  // Upvote/Like feature
  const handleLikeItem = async (itemId: string, currentLikes: number) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'comments', itemId), {
        likes: currentLikes + 1
      });
    } catch (err) {
      console.error("Failed to like item", err);
    }
  };

  // Scoring in quiz awards actual user XP + Coins in db
  const handleQuizScoreUpdated = async (pointsGained: number) => {
    if (user) {
      await awardXP(user.uid, pointsGained, true);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-6 pt-8 pb-32 min-h-screen bg-[#050505] font-sans selection:bg-purple-500/30 text-right"
      dir="rtl"
    >
      {/* Dynamic Game Overlay Portal */}
      <AnimatePresence>
        {activeChallengeGame && GAME_COMPONENTS[activeChallengeGame] && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[100] flex flex-col justify-center items-center p-4 overflow-y-auto"
          >
            <div className="w-full max-w-md relative my-8">
              <button 
                onClick={() => setActiveChallengeGame(null)}
                className="absolute -top-12 left-0 w-10 h-10 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full flex items-center justify-center transition border border-white/10 z-[110]"
              >
                <X size={20} />
              </button>
              <div className="w-full h-full">
                <Suspense fallback={
                  <div className="flex flex-col items-center justify-center p-12 text-neutral-400 gap-3 min-h-[300px]">
                    <Loader2 className="animate-spin text-purple-500" size={32} />
                    <span className="text-xs font-bold font-mono">جاري تحميل ساحة اللعب...</span>
                  </div>
                }>
                  {React.createElement(GAME_COMPONENTS[activeChallengeGame], { onScoreUpdate: handleQuizScoreUpdated })}
                </Suspense>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600/20 to-blue-600/20 flex items-center justify-center text-purple-400 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <Users size={24} />
          </div>
          <div className="text-right">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">المجتمع</h2>
            <p className="text-xs md:text-sm text-neutral-400 font-medium">تواصل وناقش وتحدّ الأوتاكو في ساحة الأبطال الدافئة</p>
          </div>
        </div>
      </div>

      {/* Category Selection Tabs */}
      <div className="flex bg-[#0d0d0d] border border-white/5 rounded-2xl p-1.5 mb-6 shadow-xl relative z-10">
        {[
          { id: 'feed', label: 'المنشورات', icon: MessageSquare },
          { id: 'challenges', label: 'التحديات التفاعلية', icon: Flame },
          { id: 'leaderboard', label: 'لوحة التصنيف', icon: Crown },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-xl transition-all duration-300 flex justify-center items-center gap-2 ${
              activeTab === tab.id 
                ? 'bg-[#151515] text-white shadow-lg border border-white/5 ring-1 ring-white/10' 
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <tab.icon size={15} className={`transition-colors ${activeTab === tab.id ? 'text-purple-400' : ''}`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 1. Feed / Stream Tab */}
      {activeTab === 'feed' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Post publishing input */}
          {user ? (
            <form onSubmit={handleCreatePost} className="flex gap-3 mb-6 bg-gradient-to-br from-[#0c0c0e] to-[#060608] p-4 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl opacity-50 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
               
               {/* Current User avatar frame cosmetically formatted */}
               <div className="relative p-0.5 shrink-0 h-12 w-12">
                   <div className={`w-full h-full ${getAvatarShapeClass(STORE_ITEMS_SORTED.find(i => i.id === userData?.equippedFrame)?.avatarShape)} overflow-hidden border border-neutral-800 bg-neutral-900 flex items-center justify-center shadow-lg`}>
                      <img 
                        src={STORE_ITEMS_SORTED.find(i => i.id === userData?.equippedAvatar)?.img || user.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user.uid} 
                        className="w-full h-full object-cover" 
                        alt="my-avatar"
                        referrerPolicy="no-referrer"
                      />
                   </div>
                   {userData?.equippedFrame && (
                      <div className={`absolute inset-0 ${getAvatarShapeClass(STORE_ITEMS_SORTED.find(i => i.id === userData.equippedFrame)?.avatarShape)} pointer-events-none ${STORE_ITEMS_SORTED.find(i => i.id === userData.equippedFrame)?.frameStyle}`} />
                   )}
               </div>

               <div className="flex-1 relative">
                 <input 
                   type="text" 
                   value={newPostText}
                   onChange={e => setNewPostText(e.target.value)}
                   disabled={posting}
                   placeholder="ما الذي يدور في ذهنك اليوم من نظريات أنمي؟ شاركنا منشورك..." 
                   className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs md:text-sm text-white focus:outline-none focus:border-purple-500/50 focus:bg-black/60 transition-all font-medium placeholder:text-neutral-600 block text-right"
                 />
                 <button 
                   type="submit"
                   disabled={posting || !newPostText.trim()}
                   className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 disabled:opacity-40 rounded-xl transition-colors cursor-pointer"
                 >
                   {posting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} className="translate-x-0.5" />}
                 </button>
               </div>
            </form>
          ) : (
            <div className="bg-neutral-900/20 border border-neutral-800 p-4 rounded-2xl text-center text-xs text-neutral-400 font-bold mb-4">
              يرجى تسجيل الدخول لتتمكن من كتابة المنشورات والتفاعل مع الآخرين.
            </div>
          )}

          {/* Posts list container */}
          {loadingPosts ? (
            <div className="flex flex-col items-center py-16 gap-3 text-neutral-500">
              <Loader2 className="animate-spin text-purple-500" size={32} />
              <span className="text-xs font-bold font-mono">جاري تحميل منشورات الساحة...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-neutral-800 rounded-3xl bg-neutral-900/5">
              <MessageSquare size={44} className="mx-auto text-neutral-700 mb-3 animate-pulse" />
              <h3 className="font-bold text-neutral-400 mb-1">الساحة هادئة للغاية</h3>
              <p className="text-[11px] text-neutral-500 max-w-sm mx-auto leading-relaxed">تجرأ وكن البطل الأول الذي يشعل الساحة بكتابة تدوينة جديدة ومشاركة النظريات الأسطورية!</p>
            </div>
          ) : (
            posts.map((post) => {
              const postAvatar = STORE_ITEMS_SORTED.find(i => i.id === post.equippedAvatar);
              const postFrame = STORE_ITEMS_SORTED.find(i => i.id === post.equippedFrame);
              const postTitle = STORE_ITEMS_SORTED.find(i => i.id === post.equippedTitle);
              const postBadge = STORE_ITEMS_SORTED.find(i => i.id === post.equippedBadge);
              
              const isExpanded = expandedCommentsPostId === post.id;
              const postReplies = replies.filter(r => r.parentCommentId === post.id);

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={post.id} 
                  className="bg-[#0b0b0d] border border-white/5 rounded-3xl p-5 shadow-xl relative overflow-hidden group hover:border-purple-500/20 transition-all duration-300"
                >
                  {/* Decorative faint glow */}
                  <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/[0.02] rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/[0.05] transition-colors" />

                  {/* Post Author Row */}
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => onUserClick && onUserClick(post.userId)}>
                      {/* Interactive Custom Avatar Frame styling */}
                      <div className="relative p-0.5 shrink-0">
                        <div className={`w-11 h-11 ${getAvatarShapeClass(postFrame?.avatarShape)} overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center transform group-hover:scale-105 transition-transform`}>
                          <img 
                            src={postAvatar?.img || post.userPhotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.userId}`} 
                            className="w-full h-full object-cover" 
                            alt="author-avatar"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        {postFrame && (
                          <div className={`absolute inset-0 ${getAvatarShapeClass(postFrame.avatarShape)} pointer-events-none ${postFrame.frameStyle}`} />
                        )}
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className={`font-black text-sm tracking-wide ${postTitle ? postTitle.color : 'text-white'}`}>
                            {post.userDisplayName}
                          </h4>
                          {postBadge && (
                             <span className="p-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full inline-flex items-center justify-center" title={postBadge.name}>
                                {React.createElement(postBadge.icon, { size: 8, className: postBadge.color })}
                             </span>
                          )}
                          {postTitle && (
                             <span className={`text-[8px] font-black tracking-wide bg-purple-950/20 border border-purple-500/10 px-1.5 py-0.5 rounded-md ${postTitle.color}`}>
                                {postTitle.name}
                             </span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-500 mt-0.5 font-bold">
                          {post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'معلّق'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Main content body */}
                  <p className="text-sm text-neutral-200 mb-4 leading-relaxed font-medium whitespace-pre-wrap text-right">{post.text}</p>

                  {/* Primary interactive row */}
                  <div className="flex gap-2 border-t border-white/5 pt-4 relative z-10">
                    <button 
                      onClick={() => handleLikeItem(post.id, post.likes || 0)}
                      className="flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-extrabold text-neutral-400 hover:bg-rose-500/10 hover:text-rose-400 transition group border border-transparent hover:border-rose-500/20 select-none cursor-pointer"
                    >
                      <Heart size={16} className="group-hover:fill-rose-500/50 transition-colors" /> 
                      <span className="mt-0.5">{post.likes || 0}</span>
                    </button>

                    <button 
                      onClick={() => setExpandedCommentsPostId(isExpanded ? null : post.id)}
                      className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-extrabold transition select-none cursor-pointer border ${
                        isExpanded 
                          ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
                          : 'text-neutral-400 hover:bg-purple-500/10 hover:text-purple-400 border-transparent hover:border-purple-500/20'
                      }`}
                    >
                      <MessageSquare size={16} /> 
                      <span className="mt-0.5">{postReplies.length} تعليق</span>
                    </button>
                  </div>

                  {/* Nested live reply sub-stream accordion */}
                  <AnimatePresence>
                     {isExpanded && (
                       <motion.div 
                         initial={{ height: 0, opacity: 0 }}
                         animate={{ height: 'auto', opacity: 1 }}
                         exit={{ height: 0, opacity: 0 }}
                         className="overflow-hidden mt-4 pt-4 border-t border-white/5 space-y-3.5"
                       >
                         {/* Replies Container */}
                         <div className="space-y-3 pr-2 border-r border-[#151515]">
                           {postReplies.length === 0 ? (
                             <p className="text-[11px] text-neutral-600 font-bold p-3 text-center">أنت حالياً تنظر لصفحة فارغة.. لا ردود هنا حتى الآن.</p>
                           ) : (
                             postReplies.map((reply) => {
                               const repAvatar = STORE_ITEMS_SORTED.find(i => i.id === reply.equippedAvatar);
                               const repFrame = STORE_ITEMS_SORTED.find(i => i.id === reply.equippedFrame);
                               const repTitle = STORE_ITEMS_SORTED.find(i => i.id === reply.equippedTitle);
                               const repBadge = STORE_ITEMS_SORTED.find(i => i.id === reply.equippedBadge);

                               return (
                                 <div key={reply.id} className="flex gap-2.5 items-start bg-[#0e0e11]/45 p-3 rounded-2xl border border-neutral-900 text-right">
                                   {/* Comment frame cosmetics */}
                                   <div className="relative p-0.5 shrink-0">
                                     <div className={`w-8 h-8 ${getAvatarShapeClass(repFrame?.avatarShape)} overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center`}>
                                       <img 
                                         src={repAvatar?.img || reply.userPhotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.userId}`} 
                                         className="w-full h-full object-cover" 
                                         alt="reply-avatar"
                                         referrerPolicy="no-referrer"
                                       />
                                     </div>
                                     {repFrame && (
                                       <div className={`absolute inset-0 ${getAvatarShapeClass(repFrame.avatarShape)} pointer-events-none ${repFrame.frameStyle}`} />
                                     )}
                                   </div>

                                   <div className="flex-1">
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <span className={`text-[11px] font-black ${repTitle ? repTitle.color : 'text-neutral-300'}`}>
                                          {reply.userDisplayName}
                                        </span>
                                        {repBadge && (
                                           <span className="p-0.5 bg-yellow-500/5 rounded-full inline-flex items-center justify-center" title={repBadge.name}>
                                              {React.createElement(repBadge.icon, { size: 6, className: repBadge.color })}
                                           </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-neutral-400 mt-1 break-words">{reply.text}</p>
                                      
                                      {/* Like nested reply */}
                                      <div className="flex items-center gap-2 mt-2">
                                        <button 
                                          onClick={() => handleLikeItem(reply.id, reply.likes || 0)}
                                          className="text-[10px] font-extrabold text-neutral-500 hover:text-rose-400 transition flex items-center gap-1 select-none cursor-pointer"
                                        >
                                          <Heart size={10} /> 
                                          <span>{reply.likes || 0}</span>
                                        </button>
                                      </div>
                                   </div>
                                 </div>
                               );
                             })
                           )}
                         </div>

                         {/* Add a reply form interface */}
                         {user && (
                           <div className="flex gap-2 pt-2 bg-gradient-to-l from-[#0e0e11] to-transparent rounded-xl p-2">
                             <input 
                               type="text" 
                               value={newReplyText[post.id] || ''}
                               onChange={e => setNewReplyText(prev => ({ ...prev, [post.id]: e.target.value }))}
                               placeholder="اكتب ردك على هذا المنشور..." 
                               className="flex-1 bg-black/60 border border-neutral-800 text-xs text-neutral-300 rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-600 transition text-right"
                             />
                             <button
                               onClick={() => handleCreateReply(post.id)}
                               disabled={!(newReplyText[post.id]?.trim())}
                               className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white p-2.5 rounded-xl transition flex items-center justify-center shrink-0"
                             >
                               <CornerDownLeft size={14} />
                             </button>
                           </div>
                         )}
                       </motion.div>
                     )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </motion.div>
      )}

      {/* 2. Challenges & Games Tab */}
      {activeTab === 'challenges' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Main Tournament Banner */}
          <div className="bg-gradient-to-br from-[#1a0f05] to-[#0a0604] border border-orange-500/20 rounded-3xl p-6 text-center relative overflow-hidden shadow-2xl group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
            <div className="absolute -bottom-10 -left-10 opacity-[0.03] text-orange-500 transform -rotate-12 pointer-events-none">
              <Trophy size={200} />
            </div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-b from-orange-400 to-red-500 rounded-2xl flex items-center justify-center text-white mb-4 shadow-[0_0_30px_rgba(249,115,22,0.4)]">
                 <Trophy size={32} />
              </div>
              <h2 className="text-3xl font-black text-white drop-shadow-xl mb-2 tracking-tight">بطولة الأوتاكو الأسبوعية</h2>
              <p className="text-orange-200/80 text-xs md:text-sm mb-6 max-w-sm font-medium">أجب على قنابل الأسئلة واربح جوائز قيّمة، نقاط خبرة وترتيب فوري على لوحة الصدارة العامة!</p>
              
              <button 
                onClick={() => setActiveChallengeGame('quotes')}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-base md:text-lg w-full py-4 rounded-2xl shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all transform hover:-translate-y-0.5 cursor-pointer select-none"
              >
                انضم لغزوة الأسئلة الآن
              </button>
              
              <div className="flex justify-center items-center gap-6 mt-6 text-[10px] md:text-xs font-bold bg-black/40 px-6 py-2.5 rounded-xl border border-orange-500/10">
                <span className="flex items-center gap-1.5 text-orange-200">
                  <Users size={14} className="text-orange-400" /> 
                  <span className="mt-0.5">38,124 أوتاكو مشارك</span>
                </span>
                <span className="w-1 h-1 rounded-full bg-orange-500/50"></span>
                <span className="flex items-center gap-1.5 text-yellow-400">
                  <Sparkles size={14} /> 
                  <span className="mt-0.5">الجوائز: هدايا + XP مضاعف</span>
                </span>
              </div>
            </div>
          </div>

          {/* Categories Filtering tabs */}
          <div className="flex gap-2 border-b border-white/5 pb-3 overflow-x-auto no-scrollbar scroll-smooth">
            {GAME_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setGameCategory(cat.id)}
                className={`py-1.5 px-4 rounded-full text-xs font-bold transition-all relative shrink-0 select-none cursor-pointer border ${
                  gameCategory === cat.id
                    ? 'border-purple-500/20 bg-purple-500/10 text-purple-400 font-extrabold shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                    : 'border-white/5 bg-[#0d0d0f]/50 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Individual Mini-Game selection items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ALL_GAMES.filter(g => gameCategory === 'all' || g.category === gameCategory).map(game => {
              const GameIcon = game.icon;
              return (
                <div 
                  key={game.id}
                  onClick={() => setActiveChallengeGame(game.id)}
                  className="bg-[#0b0b0d] border border-white/5 p-5 rounded-3xl flex items-start gap-4 hover:border-purple-500/20 hover:bg-[#0c0c11] transition-all duration-300 shadow-xl group cursor-pointer relative overflow-hidden active:scale-[0.98]"
                >
                  <div className={`absolute top-0 right-0 w-24 h-24 ${game.colorGlow} rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                  
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 ${game.colorClass} group-hover:scale-105 transition-transform duration-300`}>
                    <GameIcon size={22} />
                  </div>
                  
                  <div className="flex-1 text-right">
                    <h3 className="font-extrabold text-white text-sm md:text-base group-hover:text-purple-400 transition-colors">
                      {game.title}
                    </h3>
                    <p className="text-[11px] text-neutral-500 font-bold mt-1 leading-relaxed">
                      {game.description}
                    </p>
                    
                    {/* Tiny badge indicating the category */}
                    <div className="mt-2 flex items-center gap-1">
                      <span className="text-[9px] font-black tracking-wide uppercase bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-neutral-400">
                        {game.category === 'visual' ? 'تخمين بصري' : game.category === 'trivia' ? 'معلومات عامة' : game.category === 'observation' ? 'ذكاء وملاحظة' : 'مقارنة وقوة'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* 3. Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-black text-xl flex items-center gap-2">
               <TrendingUp size={24} className="text-purple-400 animate-pulse" /> 
               <span>لوحة تصنيف الأبطال المباشرة</span>
            </h3>
          </div>

          <div className="space-y-3 relative z-10">
            {loadingLeaderboard ? (
              <div className="flex flex-col items-center justify-center py-20 text-neutral-500 gap-3">
                 <Loader2 className="animate-spin text-purple-500" size={32} />
                 <span className="text-xs font-bold tracking-widest font-mono">جاري رصد مستويات الأبطال...</span>
              </div>
            ) : leaders.length === 0 ? (
              <div className="text-center text-neutral-500 py-10 font-black">لا توجد سجلات مستخدمين بالخادم حتى الآن!</div>
            ) : (
              leaders.map((leader, index) => {
                const level = leader.level || 1;
                const isCurrentUser = user?.uid === leader.id;
                
                // Fetch dynamic equipped assets from the shop database list
                const equippedAvatarId = leader.equippedAvatar || null;
                const equippedFrameId = leader.equippedFrame || null;
                const equippedTitleId = leader.equippedTitle || null;
                const equippedBadgeId = leader.equippedBadge || null;

                const activeAvatar = STORE_ITEMS_SORTED.find(i => i.id === equippedAvatarId);
                const activeFrame = STORE_ITEMS_SORTED.find(i => i.id === equippedFrameId);
                const activeTitle = STORE_ITEMS_SORTED.find(i => i.id === equippedTitleId);
                const activeBadge = STORE_ITEMS_SORTED.find(i => i.id === equippedBadgeId);

                let rankIcon = null;
                if (index === 0) rankIcon = <Medal className="text-yellow-500" size={26} fill="currentColor" />;
                else if (index === 1) rankIcon = <Medal className="text-neutral-400" size={24} fill="currentColor" />;
                else if (index === 2) rankIcon = <Medal className="text-amber-600" size={24} fill="currentColor" />;
                else rankIcon = <span className="font-mono text-sm font-black text-neutral-500 w-6 text-center">{index + 1}</span>;

                const rowBg = isCurrentUser 
                  ? 'bg-purple-900/10 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/20' 
                  : 'bg-[#0b0b0d] border-white/5';

                return (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    key={leader.id} 
                    onClick={() => onUserClick && onUserClick(leader.id)}
                    className={`flex border rounded-2xl p-4 items-center gap-4 relative overflow-hidden group shadow-lg cursor-pointer hover:border-purple-500/10 transition-colors ${rowBg}`}
                  >
                    {/* Rank Position */}
                    <div className="w-8 flex justify-center shrink-0">
                      {rankIcon}
                    </div>

                    {/* Custom Avatar with correct equipped shape & Frame */}
                    <div className="relative shrink-0 p-1">
                      <div className={`w-11 h-11 ${getAvatarShapeClass(activeFrame?.avatarShape)} overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center`}>
                        <img 
                          src={activeAvatar?.img || leader.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${leader.id}`} 
                          alt="leader-avatar" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      
                      {activeFrame && (
                        <div className={`absolute inset-0 ${getAvatarShapeClass(activeFrame.avatarShape)} pointer-events-none ${activeFrame.frameStyle}`} />
                      )}
                    </div>

                    {/* Author Profile Details */}
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className={`font-extrabold text-[13px] md:text-sm truncate max-w-[150px] ${activeTitle ? activeTitle.color : 'text-white'}`}>
                          {leader.displayName || 'لاعب مجهول'} 
                        </h3>

                        {activeBadge && (
                          <span className="p-0.5 border border-yellow-500/20 bg-yellow-500/10 rounded-full inline-flex items-center justify-center">
                            {React.createElement(activeBadge.icon, { size: 8, className: activeBadge.color })}
                          </span>
                        )}

                        {isCurrentUser && (
                          <span className="text-[8px] font-black bg-purple-600/30 border border-purple-500/40 text-purple-300 px-1.5 py-0.5 rounded">أنت</span>
                        )}
                      </div>
                      
                      <p className="text-[10px] text-neutral-400 font-bold mt-1 flex items-center gap-2">
                        <span>مستوى {level}</span>
                        {activeTitle && (
                          <span className="text-[8px] font-black text-neutral-500">• {activeTitle.name}</span>
                        )}
                      </p>
                    </div>

                    {/* Gained XP */}
                    <div className="text-left shrink-0">
                      <div className="text-white font-mono font-black text-sm md:text-base">{leader.xp || 0}</div>
                      <div className="text-[9px] text-neutral-500 font-bold">XP نقطة</div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
