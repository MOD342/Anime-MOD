import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Reply, Flag, EyeOff, Edit2, Loader2, Check, Trash2, MoreVertical, MessageSquare } from 'lucide-react';
import { updateCommentInteraction } from '../services/animeInteractionService';
import { incrementInteraction } from '../services/gamificationService';
import { db } from '../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { moderationService } from '../services/moderationService';
import { notificationsService } from '../services/notificationsService';
import { STORE_ITEMS_SORTED, getAvatarShapeClass } from '../data/storeItems';

export default function AnimeCommentItem({ comment, user, onReply, onDeleteLocally }: any) {
  const { userRole } = useAuth();
  const [isRevealed, setIsRevealed] = useState(!comment.isSpoiler);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(comment.text);
  const [editedSpoiler, setEditedSpoiler] = useState(comment.isSpoiler || false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Reporting System States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

  // Mod Deletion States
  const [showModDeleteModal, setShowModDeleteModal] = useState(false);
  const [modDeleteReason, setModDeleteReason] = useState('');
  const [deletingAsMod, setDeletingAsMod] = useState(false);

  // local optimistic state for interactions
  const [likes, setLikes] = useState(comment.likes || 0);
  const [dislikes, setDislikes] = useState(comment.dislikes || 0);
  const [userVote, setUserVote] = useState<'like'|'dislike'|null>(null); // simple memory

  const activeAvatar = STORE_ITEMS_SORTED.find(i => i.id === comment.equippedAvatar);
  const activeFrame = STORE_ITEMS_SORTED.find(i => i.id === comment.equippedFrame);
  const activeTitle = STORE_ITEMS_SORTED.find(i => i.id === comment.equippedTitle);
  const activeBadge = STORE_ITEMS_SORTED.find(i => i.id === comment.equippedBadge);

  const handleLike = async () => {
    if (!user) return;
    const isNewLike = userVote !== 'like';
    const newLikes = isNewLike ? likes + 1 : likes - 1;
    let newDislikes = dislikes;
    if (userVote === 'dislike') newDislikes -= 1;
    setLikes(newLikes);
    setDislikes(newDislikes);
    setUserVote(isNewLike ? 'like' : null);
    await updateCommentInteraction(comment.id, { likes: newLikes, dislikes: newDislikes });
    if (isNewLike) {
      await incrementInteraction(comment.userId, 'like');
      if (user.uid !== comment.userId) {
        await notificationsService.createUserNotification(comment.userId, {
          title: '👍 إعجاب جديد بتعليقك!',
          body: `عَجب ${user.displayName || 'أحد الأعضاء'} بتعليقك: "${comment.text.slice(0, 40)}${comment.text.length > 40 ? '...' : ''}"`,
          type: 'social',
          linkTo: `anime_details:${comment.animeId}`,
          metadata: {
            animeId: comment.animeId,
            commentId: comment.id
          }
        });
      }
    } else {
      try {
        const uRef = doc(db, 'users', comment.userId);
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
    await updateCommentInteraction(comment.id, { likes: newLikes, dislikes: newDislikes });

    if (isNewDislike && user.uid !== comment.userId) {
      await notificationsService.createUserNotification(comment.userId, {
        title: '👎 تفاعل بعدم إعجاب مع تعليقك',
        body: `تفاعل ${user.displayName || 'أحد الأعضاء'} بعدم إعجاب مع تعليقك: "${comment.text.slice(0, 40)}${comment.text.length > 40 ? '...' : ''}"`,
        type: 'social',
        linkTo: `anime_details:${comment.animeId}`,
        metadata: {
          animeId: comment.animeId,
          commentId: comment.id
        }
      });
    }
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    await updateCommentInteraction(comment.id, { text: editedText, isSpoiler: editedSpoiler });
    comment.text = editedText;
    comment.isSpoiler = editedSpoiler;
    setIsEditing(false);
    setSavingEdit(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(comment.text);
    setCopied(true);
    setShowDropdown(false);
    setTimeout(() => setCopied(false), 2005);
  };

  // Owner Delete
  const handleDelete = async () => {
    if (window.confirm('هل أنت متأكد من حذف هذا التعليق؟')) {
      await moderationService.deleteComment(comment.id);
      if (onDeleteLocally) onDeleteLocally(comment.id);
      setShowDropdown(false);
    }
  };

  // Mod Delete Confirmation
  const handleModDeleteConfirm = async () => {
    if (!modDeleteReason.trim()) return;
    setDeletingAsMod(true);
    try {
      const displayReason = modDeleteReason.startsWith('آخر:') ? modDeleteReason.replace('آخر:', '') : modDeleteReason;
      
      // 1. Delete the comment
      await moderationService.deleteComment(comment.id);
      
      // 2. Notify the author
      await notificationsService.createUserNotification(comment.userId, {
        title: '⚠️ تمت إزالة تعليقك بواسطة الإدارة',
        body: `تم إزالة تعليقك: "${comment.text.slice(0, 30)}${comment.text.length > 30 ? '...' : ''}"\nالسبب: ${displayReason}`,
        type: 'system',
        linkTo: `anime_details:${comment.animeId}`
      });
      
      alert('تم حذف التعليق وإبلاغ العضو بنجاح');
      if (onDeleteLocally) onDeleteLocally(comment.id);
      setShowModDeleteModal(false);
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء محاولة الحذف');
    } finally {
      setDeletingAsMod(false);
    }
  };

  // Report submission system
  const handleSendReport = async () => {
    if (!reportReason.trim()) return;
    setReporting(true);
    try {
      const finalReason = reportReason.startsWith('آخر:') ? reportReason.replace('آخر:', '') : reportReason;
      await moderationService.reportContent(comment.id, 'comment', finalReason);
      alert('تم تقديم الإبلاغ بنجاح للإدارة وسيقوم المشرفون بمراجعته.');
      setShowReportModal(false);
      setReportReason('');
    } catch(e) {
      console.error(e);
      alert('حدث خطأ أثناء إرسال الإبلاغ');
    } finally {
      setReporting(false);
    }
  };

  const isMod = userRole === 'owner' || userRole === 'admin' || userRole === 'moderator';

  const getArabicRelativeTime = () => {
    if (!comment.createdAt) return 'الآن';
    const date = comment.createdAt.toDate ? comment.createdAt.toDate() : new Date(comment.createdAt);
    const diff = Date.now() - date.getTime();
    const sec = Math.floor(diff / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);

    if (day > 0) {
      return day === 1 ? 'قبل يوم' : day === 2 ? 'قبل يومين' : `منذ ${day} يوم`;
    }
    if (hr > 0) {
      return hr === 1 ? 'منذ ساعة' : hr === 2 ? 'قبل ساعتين' : `منذ ${hr} ساعة`;
    }
    if (min > 0) {
      return min === 1 ? 'منذ دقيقة' : min === 2 ? 'منذ دقيقتين' : `منذ ${min} دقيقة`;
    }
    return 'الآن';
  };

  return (
    <div className="py-4 border-b border-neutral-800/45 font-sans relative" dir="rtl" id={`comment-${comment.id}`}>
       {/* Meta Header block: Avatar left, Username next, timestamp right */}
       <div className="flex justify-between items-center mb-2">
         <div className="flex items-center gap-2.5">
           {/* Custom Circular Avatar with Optional Frame decoration */}
           <div className="relative shrink-0">
             <div className={`w-9 h-9 rounded-full overflow-hidden border border-neutral-800/50 bg-neutral-900 flex items-center justify-center`}>
               <img 
                 src={activeAvatar?.img || comment.userPhotoUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed="+comment.userId} 
                 className={`w-full h-full object-cover ${activeAvatar?.imageStyle || ''}`} 
                 alt="avatar" 
                 referrerPolicy="no-referrer"
               />
             </div>
             {activeFrame && (
               <div className={`absolute inset-0 ${getAvatarShapeClass(activeFrame.avatarShape)} pointer-events-none ${activeFrame.frameStyle}`} />
             )}
           </div>

           <div className="flex flex-col justify-center">
             <div className="flex items-center gap-1.5 flex-wrap">
               <span className={`font-semibold text-sm ${activeTitle ? activeTitle.color : 'text-neutral-300'}`}>
                 {comment.userDisplayName}
               </span>
               {activeBadge && (
                 <span className="p-0.5 border border-yellow-500/10 bg-yellow-500/5 rounded-full inline-flex items-center justify-center animate-pulse" title={activeBadge.name}>
                   {React.createElement(activeBadge.icon, { size: 8, className: activeBadge.color })}
                 </span>
               )}
               {activeTitle && (
                 <span className={`text-[8px] font-black ${activeTitle.color}`}>{activeTitle.name}</span>
               )}
             </div>
           </div>
         </div>

         {/* Timestamp aligned on the left */}
         <div className="text-[11px] text-neutral-500 font-medium">
           {getArabicRelativeTime()}
         </div>
       </div>

       {/* Comment Text / Edit area */}
       {isEditing ? (
         <div className="space-y-2 mb-2 pr-11">
            <textarea
              value={editedText}
              onChange={e => setEditedText(e.target.value)}
              className="w-full bg-[#181D26] border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-[#FF1744] outline-none min-h-[55px] resize-none text-right"
              dir="rtl"
            />
            <div className="flex justify-between items-center">
               <label className="flex items-center gap-1.5 text-[10px] text-neutral-400 cursor-pointer">
                 <input type="checkbox" checked={editedSpoiler} onChange={e => setEditedSpoiler(e.target.checked)} className="accent-[#FF1744]" />
                 يحتوي على حرق
               </label>
               <button onClick={handleSaveEdit} disabled={savingEdit} className="bg-[#FF1744] hover:bg-red-600 disabled:opacity-50 text-white font-bold text-[10px] px-3 py-1 rounded-md transition">
                 {savingEdit ? <Loader2 size={10} className="animate-spin" /> : "حفظ"}
               </button>
            </div>
         </div>
       ) : (
         <div className="relative mb-3 pr-11 text-right">
           {!isRevealed && (
             <div className="absolute inset-0 z-10 backdrop-blur-sm bg-black/75 rounded-lg flex flex-col items-center justify-center cursor-pointer border border-neutral-800" onClick={() => setIsRevealed(true)}>
               <EyeOff size={14} className="text-[#FF1744] mb-1" />
               <span className="text-[10px] font-bold text-white">الكشف عن حرق للأحداث</span>
             </div>
           )}
           <p className={`text-[13px] leading-relaxed text-neutral-200 whitespace-pre-wrap ${!isRevealed ? 'opacity-15 select-none blur-[1.5px]' : ''}`}>{comment.text}</p>
         </div>
       )}

       {/* Action Toolbar on Bottom */}
       <div className="flex items-center justify-between mt-1 pr-11 text-neutral-400">
          {/* Action Row Buttons: Likes, Dislikes, Comments/Replies */}
          <div className="flex items-center gap-5">
             <button onClick={handleLike} className={`flex items-center gap-1.5 text-[13px] transition ${userVote === 'like' ? 'text-blue-500' : 'text-neutral-500 hover:text-blue-400'}`}>
               <ThumbsUp size={15} fill={userVote === 'like' ? 'currentColor' : 'none'} className="opacity-85" />
               <span className="text-xs font-medium">{likes}</span>
             </button>
             <button onClick={handleDislike} className={`flex items-center gap-1.5 text-[13px] transition ${userVote === 'dislike' ? 'text-red-500' : 'text-neutral-500 hover:text-red-400'}`}>
               <ThumbsDown size={15} fill={userVote === 'dislike' ? 'currentColor' : 'none'} className="opacity-85" />
               <span className="text-xs font-medium">{dislikes}</span>
             </button>
             <button onClick={() => onReply(comment)} className="flex items-center gap-1.5 text-[13px] text-neutral-500 hover:text-white transition">
               <MessageSquare size={15} className="opacity-85" />
               <span className="text-xs font-medium">رد</span>
             </button>
          </div>

          {/* Vertical ellipsis controller with flyout */}
          <div className="relative">
             <button onClick={() => setShowDropdown(!showDropdown)} className="text-neutral-500 hover:text-white p-1 rounded-full transition hover:bg-white/5">
                <MoreVertical size={16} />
             </button>

             {/* Animated floating option menu matching the layout */}
             {showDropdown && (
               <>
                 <div className="fixed inset-0 z-30" onClick={() => setShowDropdown(false)} />
                  <div className="absolute left-0 top-full mt-1 bg-[#1A2230] border border-neutral-700/70 rounded-lg shadow-2xl py-1 w-36 z-40 text-xs text-right">


                    <button onClick={handleCopy} className="w-full text-right px-3 py-2 hover:bg-white/5 text-neutral-200 transition flex items-center gap-2 justify-start">
                       {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                       <span>{copied ? 'تم النسخ' : 'نسخ النص'}</span>
                    </button>
                    
                    {/* Only Owner can edit or delete their own comment */}
                    {user?.uid === comment.userId && (
                      <>
                        <button onClick={() => { setIsEditing(true); setShowDropdown(false); }} className="w-full text-right px-3 py-2 hover:bg-white/5 text-neutral-200 transition flex items-center gap-2 border-t border-neutral-800/40 justify-start">
                           <Edit2 size={12} className="text-blue-400" />
                           <span>تعديل</span>
                        </button>
                        <button onClick={handleDelete} className="w-full text-right px-3 py-2 hover:bg-red-600/10 text-red-500 transition flex items-center gap-2 justify-start">
                           <Trash2 size={12} />
                           <span>حذف التعليق</span>
                        </button>
                      </>
                    )}

                    {/* Report Option ONLY visible if NOT the owner */}
                    {user && user.uid !== comment.userId && (
                      <button onClick={() => { setShowReportModal(true); setShowDropdown(false); }} className="w-full text-right px-3 py-2 hover:bg-white/5 text-yellow-400 transition flex items-center gap-2 border-t border-neutral-800/40 justify-start">
                         <Flag size={12} />
                         <span>إبلاغ للإدارة</span>
                      </button>
                    )}

                    {/* Moderator Delete Option ONLY if the user is a Moderator/Staff and NOT the author */}
                    {isMod && user?.uid !== comment.userId && (
                      <button onClick={() => { setShowModDeleteModal(true); setShowDropdown(false); }} className="w-full text-right px-3 py-2 hover:bg-red-600/10 text-red-500 transition flex items-center gap-2 border-t border-neutral-800 justify-start">
                         <Trash2 size={12} />
                         <span className="font-bold">حذف (مُشرف)</span>
                      </button>
                    )}
                 </div>
               </>
             )}
          </div>
       </div>

       {/* Reporting Dialogue Modal */}
       {showReportModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in" dir="rtl">
           <div className="bg-[#1A2230] border border-neutral-750 rounded-2xl p-5 shadow-2xl max-w-sm w-full text-right">
             <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
               <Flag size={16} className="text-yellow-500" />
               إبلاغ عن مخالفة تعليق
             </h3>
             <p className="text-[11px] text-neutral-400 mb-4 font-sans">
               يسعدنا الحفاظ على مجتمع ون بيس ونظيف. حدد سبب إبلاغك لهذا التعليق:
             </p>
             
             <div className="space-y-1.5 mb-4">
               {[
                 'حرق أحداث غير مغطى ومكشوف للجميع',
                 'ألفاظ مسيئة أو كلام بذيء ونزاع',
                 'إعلانات وروابط خارجية مشبوهة',
                 'سب وتهجم على الأعضاء أو المترجمين',
                 'تعليقات غير هادفة و تكرار سبام',
               ].map((reasonCategory) => (
                 <button
                   key={reasonCategory}
                   type="button"
                   onClick={() => setReportReason(reasonCategory)}
                   className={`w-full text-right px-3 py-2 text-xs rounded-lg transition border ${
                     reportReason === reasonCategory
                       ? 'bg-yellow-500/10 border-yellow-500 text-white'
                       : 'bg-black/35 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                   }`}
                 >
                   {reasonCategory}
                 </button>
               ))}
               <textarea
                 placeholder="سبب آخر للتبليغ..."
                 value={reportReason.startsWith('آخر:') ? reportReason.replace('آخر:', '') : ''}
                 onChange={(e) => setReportReason(`آخر:${e.target.value}`)}
                 className="w-full bg-black/40 border border-neutral-800 rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-yellow-500/60 min-h-[55px] resize-none mt-1 text-right font-sans"
                 dir="rtl"
               />
             </div>

             <div className="flex gap-2">
               <button
                 onClick={handleSendReport}
                 disabled={!reportReason || reporting}
                 className="flex-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-black font-black text-xs py-2 rounded-xl transition flex items-center justify-center gap-1.5"
               >
                 {reporting ? <Loader2 size={12} className="animate-spin text-black" /> : null}
                 إرسال الإبلاغ
               </button>
               <button
                 onClick={() => { setShowReportModal(false); setReportReason(''); }}
                 disabled={reporting}
                 className="px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs py-2 rounded-xl transition"
               >
                 إلغاء
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Moderator Deletion Notification Dialog */}
       {showModDeleteModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" dir="rtl">
           <div className="bg-[#1A2230] border border-neutral-750 rounded-2xl p-5 shadow-2xl max-w-sm w-full text-right">
             <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
               <Trash2 size={16} className="text-red-500" />
               حذف التعليق كـ مشرف
             </h3>
             <p className="text-[11px] text-neutral-400 mb-4 font-sans leading-relaxed">
               أنت على وشك حذف تعليق العضو <strong className="text-neutral-200">@{comment.userDisplayName}</strong>.
               <br />
               <span className="text-[#FF1744] font-semibold">تنبيه:</span> سيتم إرسال إشعار تلقائي فوري بحساب العضو موضحاً فيه سبب الإزالة.
             </p>

             <div className="space-y-1.5 mb-4">
               {[
                 'حرق أحداث مكشوف دون تحديد وتغطية خيار الحرق',
                 'استخدام كلمات بذيئة ومخالفة للذوق العام',
                 'إثارة الفتن والمشاكل والشتم بين الأعضاء',
                 'نشر روابط تجارية وإعلانات خارجية غير مرغوبة',
                 'تعليق عشوائي غير هادف أو متكرر (سبام)',
               ].map((modReason) => (
                 <button
                   key={modReason}
                   type="button"
                   onClick={() => setModDeleteReason(modReason)}
                   className={`w-full text-right px-3 py-2 text-xs rounded-lg transition border ${
                     modDeleteReason === modReason
                       ? 'bg-red-500/10 border-red-500 text-white'
                       : 'bg-black/35 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'
                   }`}
                 >
                   {modReason}
                 </button>
               ))}
               <textarea
                 placeholder="اكتب سبب حذف مخصص يرسل للعضو..."
                 value={modDeleteReason.startsWith('آخر:') ? modDeleteReason.replace('آخر:', '') : ''}
                 onChange={(e) => setModDeleteReason(`آخر:${e.target.value}`)}
                 className="w-full bg-black/40 border border-neutral-800 rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-red-500/60 min-h-[55px] resize-none mt-1 text-right font-sans"
                 dir="rtl"
               />
             </div>

             <div className="flex gap-2">
               <button
                 onClick={handleModDeleteConfirm}
                 disabled={!modDeleteReason || deletingAsMod}
                 className="flex-1 bg-red-650 hover:bg-red-500 disabled:opacity-40 text-white font-black text-xs py-2 rounded-xl transition flex items-center justify-center gap-1.5"
               >
                 {deletingAsMod ? <Loader2 size={12} className="animate-spin text-white" /> : null}
                 تأكيد حذف وإخطار العضو
               </button>
               <button
                 onClick={() => { setShowModDeleteModal(false); setModDeleteReason(''); }}
                 disabled={deletingAsMod}
                 className="px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs py-2 rounded-xl transition"
               >
                 إلغاء
               </button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
}
