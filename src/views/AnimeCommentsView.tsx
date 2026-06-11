import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Loader2, MessageCircle, Send, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getComments, addComment } from '../services/animeInteractionService';
import { notificationsService } from '../services/notificationsService';
import { clientCache } from '../utils/clientCache';
import AnimeCommentItem from '../components/AnimeCommentItem';

interface AnimeCommentsViewProps {
  animeId: string;
  focusCommentId?: string;
  onBack: () => void;
  onAnimeClick?: (id: string) => void;
  onUserClick?: (userId: string) => void;
}

export default function AnimeCommentsView({ animeId, focusCommentId, onBack, onAnimeClick, onUserClick }: AnimeCommentsViewProps) {
  const { user, signIn, userData } = useAuth();
  const [anime, setAnime] = useState<any>(null);
  const [loadingAnime, setLoadingAnime] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);

  // New Comment Form state
  const [newComment, setNewComment] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadComments = async () => {
    if (!animeId) return;
    try {
      setLoadingComments(true);
      const data = await getComments(animeId);
      setComments(data);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (!animeId) return;

    const fetchAnime = async () => {
      try {
        setLoadingAnime(true);
        const cached = clientCache.get<any>(`client_anime_details_${animeId}`);
        if (cached) {
          setAnime(cached);
          setLoadingAnime(false);
        }
        await clientCache.fetchWithRevalidate(
          `client_anime_details_${animeId}`,
          `/api/anime/details/${animeId}`,
          (data: any) => {
            setAnime(data);
          }
        );
      } catch (err) {
        console.error('Error fetching anime details for comments view:', err);
      } finally {
        setLoadingAnime(false);
      }
    };

    fetchAnime();
    loadComments();
  }, [animeId]);

  useEffect(() => {
    if (comments.length > 0 && focusCommentId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`comment-${focusCommentId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('bg-[#FF1744]/15', 'rounded-xl', 'p-3', 'border', 'border-[#FF1744]/30', 'transition-all', 'duration-500');
          setTimeout(() => {
            el.classList.remove('bg-[#FF1744]/15', 'border-[#FF1744]/30');
          }, 3000);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [comments, focusCommentId]);

  const parseMentionsAndNotify = async (text: string, currentAnimeId: string, commentId: string, currentUserId: string, animeTitle: string) => {
    const words = text.match(/@[^\s]+/g);
    if (!words) return;
    
    const uniqueTags = Array.from(new Set(words)).map(w => w.substring(1).trim());
    
    for (const tag of uniqueTags) {
      try {
        const qUsers = query(collection(db, 'users'), where('displayName', '==', tag));
        const resSnap = await getDocs(qUsers);
        if (!resSnap.empty) {
          const targetUserId = resSnap.docs[0].id;
          if (targetUserId !== currentUserId) {
            await notificationsService.createUserNotification(targetUserId, {
              title: '🏷️ تمت الإشارة إليك!',
              body: `${user?.displayName || 'متابع'} أشار إليك في تعليق بـ "${animeTitle}": "${text.substring(0, 50)}..."`,
              type: 'social',
              linkTo: `comment_view:${currentAnimeId}:${commentId}`,
              metadata: {
                animeId: currentAnimeId,
                commentId
              }
            });
          }
        }
      } catch (e) {
        console.error('Error seeking tagged user', e);
      }
    }
  };

  const handleAddComment = async (e: any, parentCommentId?: string, replyText?: string, replySpoiler?: boolean) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!user || !anime) return;
    if (userData?.isMuted) {
      alert('تم تقييد حسابك من الكتابة والنشر بواسطة الإدارة! 🔇');
      return;
    }
    if ((userData?.level || 1) < 2) {
      alert('تحتاج للوصول إلى المستوى 2 على الأقل للتمكن من التعليق ونشر الآراء! 🚀');
      return;
    }

    const isReply = !!parentCommentId;
    const textToSubmit = isReply ? replyText : newComment;
    const spoilerFlag = isReply ? replySpoiler : isSpoiler;

    if (!textToSubmit || !textToSubmit.trim()) return;

    setSubmittingComment(true);
    try {
      const commentPayload: any = {
        animeId: anime._id,
        userId: user.id,
        userDisplayName: user.displayName || 'مستخدم',
        userPhotoUrl: user.photoURL || undefined,
        text: textToSubmit,
        isSpoiler: spoilerFlag,
        likes: 0,
        dislikes: 0,
        equippedAvatar: userData?.equippedAvatar || null,
        equippedFrame: userData?.equippedFrame || null,
        equippedTitle: userData?.equippedTitle || null,
        equippedBadge: userData?.equippedBadge || null
      };

      if (isReply) {
        commentPayload.parentCommentId = parentCommentId;
      }

      const newId = await addComment(commentPayload);
      
      import('../services/gamificationService').then(({ incrementInteraction }) => {
        incrementInteraction(user.id, 'comment');
      });

      // Notify parent author if this is a reply and not tagging themselves
      if (isReply) {
        const parentComment = comments.find(c => c.id === parentCommentId);
        if (parentComment && parentComment.userId !== user.id) {
          await notificationsService.createUserNotification(parentComment.userId, {
            title: '💬 رد جديد على تعليقك!',
            body: `${user.displayName || 'متابع'} رد على تعليقك في أنمي "${anime.title}": "${textToSubmit.substring(0, 50)}..."`,
            type: 'social',
            linkTo: `comment_view:${anime._id}:${newId}`,
            metadata: {
              animeId: anime._id,
              commentId: newId
            }
          });
        }
      }

      // Notify any explicitly tagged users
      await parseMentionsAndNotify(textToSubmit, anime._id, newId, user.id, anime.title);

      if (!isReply) {
        setNewComment('');
        setIsSpoiler(false);
      }

      // Refetch comments
      const updated = await getComments(anime._id);
      setComments(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const mainComments = comments.filter(c => !c.parentCommentId);

  return (
    <div className="min-h-screen bg-black text-white pb-28 font-sans selection:bg-[#FF1744]/50 text-right" dir="rtl" id="anime_comments_screen">
      {/* Top Navigation */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-md z-40 border-b border-neutral-900 pb-3.5 pt-4 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-9 h-9 bg-[#1E1E1E] rounded-xl flex items-center justify-center text-neutral-400 hover:text-white transition hover:bg-neutral-800"
          >
            <ArrowRight size={18} />
          </button>
          
          {anime ? (
            <div className="flex items-center gap-2.5">
              <img 
                src={anime.posterUrl} 
                alt={anime.title} 
                className="w-8 h-10 object-cover rounded-lg shrink-0 border border-neutral-800"
                referrerPolicy="no-referrer"
              />
              <div>
                <h2 
                  onClick={() => onAnimeClick?.(anime._id)}
                  className="text-xs font-black line-clamp-1 text-white hover:text-[#FF1744] transition cursor-pointer"
                >
                  {anime.title}
                </h2>
                <p className="text-[10px] text-neutral-500 font-bold">نقاش وتعليقات الأعضاء</p>
              </div>
            </div>
          ) : (
            <div className="h-4 w-28 bg-neutral-900 rounded animate-pulse" />
          )}
        </div>
        
        <div className="flex items-center gap-1 bg-[#FF1744]/10 text-[#FF1744] px-2.5 py-1 rounded-full text-[10px] font-bold border border-[#FF1744]/20">
          <MessageCircle size={12} />
          <span>{comments.length} تعليق</span>
        </div>
      </div>

      {loadingAnime ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-[#FF1744]" size={24} />
          <p className="text-neutral-500 text-xs font-bold">جاري تحميل النقاشات...</p>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-4 mt-5 space-y-6">
          {/* Comments list container */}
          <div className="space-y-4">
            <h4 className="text-white text-xs font-black select-none">النقاشات والأفكار ({mainComments.length})</h4>
            
            {loadingComments ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-neutral-600" size={20} />
              </div>
            ) : mainComments.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 font-bold bg-[#1E1E1E] text-xs rounded-2xl border border-neutral-800">
                كن أول من يعلق ويبدأ النقاش حول هذا العمل! ✨
              </div>
            ) : (
              <div className="space-y-3 pb-8">
                {mainComments.map(comment => {
                  const commentReplies = comments
                    .filter(c => c.parentCommentId === comment.id)
                    .sort((a, b) => {
                      const timeA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0) || 0;
                      const timeB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0) || 0;
                      return timeA - timeB;
                    });
                  return (
                    <AnimeCommentItem 
                      key={comment.id} 
                      comment={comment} 
                      user={user} 
                      onReply={(c: any) => setNewComment(`@${c.userDisplayName} `)} 
                      onDeleteLocally={(id: string) => setComments(comments.filter(c => c.id !== id))} 
                      replies={commentReplies}
                      onAddReply={(parentId: string, text: string, spoiler: boolean) => handleAddComment(null, parentId, text, spoiler)}
                      onUserClick={onUserClick}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Fixed Comment Form bar */}
      {!loadingAnime && (
        <div className="fixed bottom-0 left-0 right-0 max-w-3xl mx-auto px-4 pb-4 pt-2 bg-gradient-to-t from-black via-black/95 to-transparent z-40">
          {user ? (
            <form onSubmit={(e) => handleAddComment(e)} className="flex flex-col gap-2 w-full">
              {isSpoiler && (
                <div className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/15 px-3 py-1 rounded-full self-start font-bold inline-flex items-center gap-1.5 animate-pulse">
                  <EyeOff size={11} />
                  <span>سيتم نشر هذا التعليق كحرق للأحداث!</span>
                </div>
              )}
              <div className="bg-[#12161E]/95 border border-neutral-850 px-2.5 py-1.5 rounded-full flex items-center justify-between gap-3 shadow-[0_-8px_32px_rgba(0,0,0,0.8)] w-full">
                {/* Flame/Spoiler toggle button */}
                <button
                  type="button"
                  title="تنبيه حرق"
                  onClick={() => setIsSpoiler(!isSpoiler)}
                  className={`p-2 rounded-full transition shrink-0 flex items-center justify-center ${isSpoiler ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'}`}
                >
                  <EyeOff size={16} />
                </button>

                {/* TextInput in middle */}
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder={
                    userData?.isMuted 
                      ? "تم كتم حسابك من النشر والتعليق بواسطة الإدارة 🔇" 
                      : (userData?.level || 1) < 2 
                        ? "المستوى 2 مطلوب على الأقل للتعليق ونشر الآراء 🚀" 
                        : "اكتب تعليقاً... (للإشارة استخدم @اسمه)"
                  }
                  className="flex-1 bg-transparent text-white text-xs py-2 focus:outline-none placeholder-neutral-500 font-sans text-right disabled:opacity-50 font-bold"
                  dir="rtl"
                  disabled={submittingComment || userData?.isMuted || (userData?.level || 1) < 2}
                />

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={!newComment.trim() || submittingComment || userData?.isMuted || (userData?.level || 1) < 2}
                  className="w-8 h-8 rounded-full bg-[#FF1744] hover:bg-red-600 disabled:opacity-35 text-white flex items-center justify-center transition shrink-0 shadow-md"
                >
                  {submittingComment ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Send size={13} className="transform rotate-180" />
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-[#12161E]/95 border border-neutral-850 px-3 py-2.5 rounded-full flex items-center justify-between gap-3 shadow-[0_-8px_32px_rgba(0,0,0,0.8)] w-full">
              <span className="text-neutral-400 text-xs font-bold px-2">تسجيل الدخول مطلوب للمشاركة في التعليقات ونقاش الأنمي</span>
              <button
                onClick={signIn}
                className="bg-[#FF1744] hover:bg-red-600 text-white font-black px-4 py-1.5 rounded-full text-[11px] cursor-pointer transition shadow-md shrink-0"
              >
                سجل الدخول
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
