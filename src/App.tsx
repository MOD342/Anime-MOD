/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, lazy, Suspense, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppLayout } from './components/AppLayout';
import { Loader2, Sparkles, X, Trophy, Play, MessageSquare, Info, Bell, Flame, ShieldAlert } from 'lucide-react';
import HomeView from './views/HomeView';
import { useAuth } from './contexts/AuthContext';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const ExploreView = lazy(() => import('./views/ExploreView'));
const CommunityView = lazy(() => import('./views/CommunityView'));
const MyListsView = lazy(() => import('./views/MyListsView'));
const ProfileView = lazy(() => import('./views/ProfileView'));
const AnimeDetailsView = lazy(() => import('./views/AnimeDetailsView'));
const AnimeCommentsView = lazy(() => import('./views/AnimeCommentsView'));
const WatchView = lazy(() => import('./views/WatchView'));
const AdminDashboardView = lazy(() => import('./views/AdminDashboardView'));
const AIGamesView = lazy(() => import('./views/AIGamesView'));
const LeaderboardView = lazy(() => import('./views/LeaderboardView'));
const ScheduleView = lazy(() => import('./views/ScheduleView'));
const StoreView = lazy(() => import('./views/StoreView'));
const TournamentsView = lazy(() => import('./views/TournamentsView'));
const MoreView = lazy(() => import('./views/MoreView'));
const RecentEpisodesView = lazy(() => import('./views/RecentEpisodesView'));
const CurrentSeasonView = lazy(() => import('./views/CurrentSeasonView'));
const LevelPerksView = lazy(() => import('./views/LevelPerksView'));
const FavoritesView = lazy(() => import('./views/FavoritesView'));
const RewardsView = lazy(() => import('./views/RewardsView'));
const NotificationsView = lazy(() => import('./views/NotificationsView'));
const AiChatView = lazy(() => import('./views/AiChatView'));
const AdSupportView = lazy(() => import('./views/AdSupportView'));
const SupportPortalView = lazy(() => import('./views/SupportPortalView'));
const SuggestionsHubView = lazy(() => import('./views/SuggestionsHubView'));
const DiagnosticsView = lazy(() => import('./views/DiagnosticsView'));

const AiChatWidget = lazy(() => import('./components/AiChatWidget'));
import { MascotLoadingScreen, MascotOfflineScreen } from './components/MascotScreens';
import PermissionPromptModal from './components/PermissionPromptModal';

const ViewFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] text-neutral-400 gap-4" dir="rtl">
    <Loader2 className="animate-spin text-purple-500" size={36} />
    <span className="text-sm font-bold font-mono text-neutral-500 bg-neutral-900/40 border border-white/5 py-1 px-4 rounded-full">جاري تحميل الصفحة...</span>
  </div>
);

export default function App() {
  const { banInfo, user, userRole, loading } = useAuth();
  const [activeTab, setActiveTab ] = useState('home');
  const [showSplash, setShowSplash] = useState(false);
  const [askPermissions, setAskPermissions] = useState(false);
  const [viewStack, setViewStack] = useState<{name: string, props?: any}[]>([{ name: 'home' }]);
  const [activeToasts, setActiveToasts] = useState<any[]>([]);

  const triggerToast = (notif: any) => {
    setActiveToasts(prev => {
      if (prev.some(t => t.id === notif.id)) return prev;
      return [...prev, notif];
    });

    // Send native system notification if permission has been granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const title = notif.title || 'إشعار جديد ⚡';
        const body = notif.body || '';
        const options: NotificationOptions = {
          body,
          icon: '/favicon.ico',
          dir: 'rtl',
        };
        if (notif.imageUrl) {
          (options as any).image = notif.imageUrl;
        }

        const nativeNotification = new Notification(title, options);
        nativeNotification.onclick = () => {
          window.focus();
          handleToastClick(notif);
        };
      } catch (err) {
        console.warn('Failed to dispatch native system notification:', err);
      }
    }

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      setActiveToasts(prev => prev.filter(t => t.id !== notif.id));
    }, 6000);
  };

  useEffect(() => {
    if (!user) {
      setActiveToasts([]);
      return;
    }

    const sessionStartTime = Date.now();
    const seenIds = new Set<string>();

    const getDocCreatedTime = (data: any) => {
      if (!data) return Date.now();
      if (data.createdAt?.toMillis) return data.createdAt.toMillis();
      if (data.createdAt?.toDate) return data.createdAt.toDate().getTime();
      if (data.createdAt instanceof Date) return data.createdAt.getTime();
      if (typeof data.createdAt === 'number') return data.createdAt;
      if (typeof data.createdAt === 'string') {
        const p = Date.parse(data.createdAt);
        if (!isNaN(p)) return p;
      }
      if (data.addedAt?.toMillis) return data.addedAt.toMillis();
      if (data.addedAt?.toDate) return data.addedAt.toDate().getTime();
      if (typeof data.addedAt === 'string') {
        const p = Date.parse(data.addedAt);
        if (!isNaN(p)) return p;
      }
      return Date.now();
    };

    // 1. Listen to real-time User Specific Notifications
    const unsubUserNotifs = onSnapshot(
      query(collection(db, 'users', user.id, 'notifications'), orderBy('createdAt', 'desc'), limit(1)),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const id = change.doc.id;

            const createdTime = getDocCreatedTime(data);

            // Only alert if it's after session load, is unread, and hasn't been shown in this window session
            if (createdTime >= sessionStartTime - 4000 && !data.read && !seenIds.has(id)) {
              seenIds.add(id);
              triggerToast({ id, ...data });
            }
          }
        });
      },
      (err) => console.warn("Real-time toast error:", err)
    );

    // 2. Listen to real-time Global Notifications
    const unsubGlobalNotifs = onSnapshot(
      query(collection(db, 'globalNotifications'), orderBy('createdAt', 'desc'), limit(1)),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const id = change.doc.id;

            const createdTime = getDocCreatedTime(data);

            if (createdTime >= sessionStartTime - 4000 && !seenIds.has(id)) {
              seenIds.add(id);
              triggerToast({ id, ...data, isGlobal: true });
            }
          }
        });
      },
      (err) => console.warn("Real-time global toast error:", err)
    );

    // 3. Listen to Administration Events (Reports, Suggestions, Recommendations) in Real-time
    let unsubAdminReports = () => {};
    let unsubAdminSuggestions = () => {};
    let unsubAdminRecommendations = () => {};

    const isAdmin = userRole === 'owner' || userRole === 'admin' || userRole === 'moderator';

    if (isAdmin) {
      unsubAdminReports = onSnapshot(
        query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(1)),
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const id = change.doc.id;
              const createdTime = getDocCreatedTime(data);

              if (createdTime >= sessionStartTime - 4000 && !seenIds.has(id)) {
                seenIds.add(id);
                triggerToast({
                  id,
                  title: '⚠️ بلاغ أمني جديد 🛡️',
                  body: `بلاغ عن محتوى مخالف بمستوى (${data.type === 'comment' ? 'تعليق مخالف' : 'محتوى مخالف'}). السبب: ${data.reason || 'غير محدد'}`,
                  type: 'admin_report',
                  linkTo: 'admin:reports',
                  isAdminNotification: true
                });
              }
            }
          });
        },
        (err) => console.warn("Admin real-time reports error:", err)
      );

      unsubAdminSuggestions = onSnapshot(
        query(collection(db, 'suggestions'), orderBy('createdAt', 'desc'), limit(1)),
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const id = change.doc.id;
              const createdTime = getDocCreatedTime(data);

              if (createdTime >= sessionStartTime - 4000 && !seenIds.has(id)) {
                seenIds.add(id);
                const isComplaint = data.type === 'complaint';
                triggerToast({
                  id,
                  title: isComplaint ? '🚨 شكوى إدارية جديدة' : '💡 مقترح جديد للمنصة',
                  body: `"${data.title || data.text || ''}" - بواسطة: ${data.userName || 'عضو مجهول'}`,
                  type: 'admin_suggestion',
                  linkTo: 'admin:suggestions_moderation',
                  isAdminNotification: true
                });
              }
            }
          });
        },
        (err) => console.warn("Admin real-time suggestions error:", err)
      );

      unsubAdminRecommendations = onSnapshot(
        query(collection(db, 'recommendations'), orderBy('createdAt', 'desc'), limit(1)),
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const id = change.doc.id;
              const createdTime = getDocCreatedTime(data);

              if (createdTime >= sessionStartTime - 4000 && data.status === 'pending' && !seenIds.has(id)) {
                seenIds.add(id);
                triggerToast({
                  id,
                  title: '📖 توصية جديدة بانتظار الاعتماد',
                  body: `توصية لـ "${data.targetAnimeTitle || 'أنمي'}" من العضو: ${data.userDisplayName || 'عضو مجهول'}`,
                  type: 'admin_recommendation',
                  linkTo: 'admin:recommendations',
                  isAdminNotification: true
                });
              }
            }
          });
        },
        (err) => console.warn("Admin real-time recommendations error:", err)
      );
    }

    return () => {
      unsubUserNotifs();
      unsubGlobalNotifs();
      unsubAdminReports();
      unsubAdminSuggestions();
      unsubAdminRecommendations();
    };
  }, [user, userRole]);

  const handleToastClick = (toast: any) => {
    setActiveToasts(prev => prev.filter(t => t.id !== toast.id));
    if (!toast.linkTo) return;

    if (toast.linkTo.startsWith('admin:')) {
      const parts = toast.linkTo.split(':');
      const tab = parts[1] || 'reports';
      navigateTo('admin', { initialTab: tab });
    } else if (toast.linkTo === 'rewards') {
      navigateTo('rewards');
    } else if (toast.linkTo === 'games') {
      navigateTo('games');
    } else if (toast.linkTo === 'leaderboard') {
      navigateTo('leaderboard');
    } else if (toast.linkTo.startsWith('comment_view')) {
      const parts = toast.linkTo.split(':');
      const animeId = parts[1] || toast.metadata?.animeId;
      const commentId = parts[2] || toast.metadata?.commentId;
      if (animeId) {
        navigateTo('anime_comments', { animeId, focusCommentId: commentId });
      }
    } else if (toast.linkTo.startsWith('anime_details')) {
      const parts = toast.linkTo.split(':');
      const animeId = parts[1] || toast.metadata?.animeId;
      if (animeId) {
        navigateTo('anime_details', { id: animeId });
      }
    } else if (toast.linkTo.startsWith('watch_episode')) {
      const parts = toast.linkTo.split(':');
      const animeId = parts[1] || toast.metadata?.animeId;
      const epNum = parts[2] || '1';
      if (animeId) {
        navigateTo('anime_details', { id: animeId, autoplayEpisode: Number(epNum) });
      }
    } else {
      navigateTo('home');
    }
  };

  useEffect(() => {
    const handleOpenChat = () => {
      setViewStack(prev => [...prev, { name: 'ai_chat' }]);
    };
    window.addEventListener('open-ai-chat', handleOpenChat);

    // Prompt for permissions on mount (since splash loading is removed)
    if (typeof window !== 'undefined') {
      const prompted = localStorage.getItem('mod_permissions_prompted');
      if (prompted !== 'true') {
        const timer = setTimeout(() => {
          setAskPermissions(true);
        }, 800);
        return () => {
          window.removeEventListener('open-ai-chat', handleOpenChat);
          clearTimeout(timer);
        };
      }
    }

    return () => window.removeEventListener('open-ai-chat', handleOpenChat);
  }, []);

  if (showSplash) {
    return (
      <MascotLoadingScreen 
        authLoading={loading} 
        onComplete={() => {
          setShowSplash(false);
          if (typeof window !== 'undefined') {
            const prompted = localStorage.getItem('mod_permissions_prompted');
            if (prompted !== 'true') {
              setAskPermissions(true);
            }
          }
        }} 
      />
    );
  }

  if (askPermissions) {
    return <PermissionPromptModal onComplete={() => setAskPermissions(false)} />;
  }

  if (banInfo && banInfo.isBanned) {
    return (
      <div className="min-h-screen bg-[#070707] text-white flex flex-col items-center justify-center p-6 text-center select-none" dir="rtl">
        <div className="bg-[#121212] border border-red-500/20 max-w-md w-full rounded-2xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-pulse"></div>
          <div className="w-20 h-20 bg-red-600/10 border border-red-500/15 rounded-full flex items-center justify-center mx-auto text-4xl shadow-lg ring-4 ring-red-600/5">
            🚫
          </div>
          
          <div className="space-y-2 animate-fadeIn">
            <h1 className="text-xl font-black text-white tracking-tight">تم حظر حسابك بقرار إشرافي</h1>
            <p className="text-xs text-neutral-400 leading-relaxed">لقد تم تعليق حسابك نهائياً من دخول منصة أوتاكو هاب لمخالفتك شروط وقواعد الاستخدام والآداب العامة.</p>
          </div>

          <div className="bg-[#0b0b0b] border border-white/5 rounded-xl p-4 text-right space-y-2">
            <span className="text-[10px] font-bold text-neutral-500 block uppercase tracking-wider font-mono">سبب الحظر الإداري:</span>
            <p className="text-sm font-bold text-red-400 leading-relaxed">{banInfo.reason || 'مخالفة معايير مجتمع أوتاكو هاب وتكرار السلوكيات السلبية والسبام.'}</p>
          </div>

          <div className="text-xs text-neutral-500 font-semibold space-y-1">
            <p>إذا كنت ترى أن هذا القرار متسرع أو به خطأ، يمكنك التواصل مع الدعم الفني لتقديم التماس.</p>
            <p className="text-[10px] font-mono text-neutral-600 mt-2">معرف المستخدم المتأثر (ID): {user?.id || 'N/A'}</p>
          </div>
        </div>
      </div>
    );
  }

  const currentView = viewStack[viewStack.length - 1];

  const navigateTo = (viewName: string, props?: any) => {
    setViewStack(prev => [...prev, { name: viewName, props }]);
  };

  const goBack = () => {
    if (viewStack.length > 1) {
      setViewStack(prev => prev.slice(0, -1));
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setViewStack([{ name: tab }]);
  };

  const renderView = () => {
    switch (currentView.name) {
      case 'home':
        return <HomeView onAnimeClick={(id, epNum) => navigateTo('anime_details', { id, autoplayEpisode: epNum })} onNavigateToGames={() => navigateTo('games')} onSearchCategory={(cat) => { setActiveTab('watch'); navigateTo('watch', { initialQuery: cat }); }} onNavigateToSchedule={(day) => navigateTo('schedule', { initialDay: day })} onNavigateToRecent={() => navigateTo('recent_episodes')} onNavigateToSeason={() => navigateTo('current_season')} />;
      case 'watch': 
        return <ExploreView onAnimeClick={(id) => navigateTo('anime_details', { id })} initialQuery={currentView.props?.initialQuery} />;
      case 'community':
        return <CommunityView focusCommentId={currentView.props?.focusCommentId} onUserClick={(userId) => navigateTo('other_profile', { userId })} />;
      case 'lists':
        return <MyListsView onAnimeClick={(id) => navigateTo('anime_details', { id })} />;
      case 'more':
        return <MoreView onNavigate={navigateTo} />;
      case 'profile':
        return <ProfileView onAdminClick={() => navigateTo('admin')} onRewardsClick={() => navigateTo('rewards')} onLevelPerksClick={() => navigateTo('level_perks')} />;
      case 'tournaments':
        return <TournamentsView onBack={goBack} onNavigate={(route) => navigateTo(route)} />;
      case 'other_profile':
        return <ProfileView userId={currentView.props?.userId} onBack={goBack} />;
      case 'anime_details':
        return <AnimeDetailsView key={currentView.props?.t || currentView.props?.id} id={currentView.props?.id} showComments={currentView.props?.showComments} focusCommentId={currentView.props?.focusCommentId} autoplayEpisode={currentView.props?.autoplayEpisode} onBack={goBack} onWatch={(ep, anime) => navigateTo('watch_episode', { episode: ep, anime })} onAnimeClick={(id, epNum) => navigateTo('anime_details', id === 'random' ? { id: 'random', t: Date.now() } : { id, autoplayEpisode: epNum })} onNavigate={navigateTo} />;
      case 'anime_comments':
        return <AnimeCommentsView animeId={currentView.props?.animeId} focusCommentId={currentView.props?.focusCommentId} onBack={goBack} onAnimeClick={(id) => navigateTo('anime_details', { id })} onUserClick={(userId) => navigateTo('other_profile', { userId })} />;
      case 'watch_episode':
        return <WatchView key={`${currentView.props?.anime?._id || ''}-${currentView.props?.episode?.id || currentView.props?.episode?.num || ''}`} onBack={goBack} episode={currentView.props?.episode} anime={currentView.props?.anime} />;
      case 'admin':
        if (userRole !== 'owner' && userRole !== 'admin' && userRole !== 'moderator') {
          return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 selection:bg-rose-600/50 selection:text-white animate-fadeIn" dir="rtl" id="app_unauthorized_guard">
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl text-center max-w-sm w-full shadow-xl">
                <h2 className="text-zinc-100 text-lg font-bold mb-2">القسم مغلق للعامة 🛡️</h2>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  هذه الزاوية الإشرافية والتحليلية مخصصة فقط لأعضاء طاقم الدعم والرقابة المعتمدين لمنصة الأوتوكو.
                </p>
                <button 
                  onClick={goBack} 
                  className="mt-6 w-full bg-zinc-800 hover:bg-zinc-750 text-zinc-100 font-semibold py-2 rounded-xl text-xs transition cursor-pointer border border-zinc-700/60"
                >
                  العودة للخلف
                </button>
              </div>
            </div>
          );
        }
        return <AdminDashboardView onBack={goBack} initialTab={currentView.props?.initialTab} onNavigate={(view, props) => {
          if (view === 'community') {
            handleTabChange('community');
          } else {
            navigateTo(view, props);
          }
        }} />;
      case 'games':
        return <AIGamesView onBack={goBack} onNavigateToLeaderboard={() => navigateTo('leaderboard')} onNavigateToStore={() => navigateTo('store')} onNavigateToRewards={() => navigateTo('rewards')} />;
      case 'leaderboard':
        return <LeaderboardView onBack={goBack} onUserClick={(userId) => navigateTo('other_profile', { userId })} />;
      case 'schedule':
        return <ScheduleView onBack={goBack} onAnimeClick={(id) => navigateTo('anime_details', { id })} initialDay={currentView.props?.initialDay} />;
      case 'store':
        return <StoreView onBack={goBack} />;
      case 'recent_episodes':
        return <RecentEpisodesView onBack={goBack} onAnimeClick={(id, epNum) => navigateTo('anime_details', { id, autoplayEpisode: epNum })} />;
      case 'current_season':
        return <CurrentSeasonView onBack={goBack} onAnimeClick={(id) => navigateTo('anime_details', { id })} />;
      case 'level_perks':
        return <LevelPerksView onBack={goBack} onNavigateToStore={() => navigateTo('store')} />;
      case 'rewards':
        return <RewardsView onBack={goBack} />;
      case 'favorites':
        return <FavoritesView onBack={goBack} onAnimeClick={(id) => navigateTo('anime_details', { id })} />;
      case 'notifications':
        return <NotificationsView onBack={goBack} onNavigate={navigateTo} />;
      case 'suggestions_hub':
        return <SuggestionsHubView onBack={goBack} />;
      case 'diagnostics':
        return <DiagnosticsView onBack={goBack} />;
      case 'ai_chat':
        return <AiChatView onBack={goBack} />;
      case 'ad_support':
        return <AdSupportView onBack={goBack} />;
      case 'support_help':
        return <SupportPortalView onBack={goBack} initialTab="ad_support" />;
      case 'support_suggestions':
        return <SupportPortalView onBack={goBack} initialTab="suggestions" />;
      case 'support_donate':
        return <SupportPortalView onBack={goBack} initialTab="donate" />;
      case 'support_chat':
        return <SupportPortalView onBack={goBack} initialTab="chat" />;
      case 'support_news':
        return <SupportPortalView onBack={goBack} initialTab="news" />;
      default:
        return <HomeView onAnimeClick={(id) => navigateTo('anime_details', { id })} onNavigateToGames={() => navigateTo('games')} onNavigateToSchedule={(day) => navigateTo('schedule', { initialDay: day })} onNavigateToRecent={() => navigateTo('recent_episodes')} onNavigateToSeason={() => navigateTo('current_season')} />;
    }
  };

  // Do not show AppLayout (top/bottom navs) if we are in fullscreen views like details or watch
  const isFullScreenView = currentView.name === 'diagnostics' || currentView.name === 'suggestions_hub' || currentView.name === 'ai_chat' || currentView.name === 'level_perks' || currentView.name === 'anime_details' || currentView.name === 'anime_comments' || currentView.name === 'watch_episode' || currentView.name === 'admin' || currentView.name === 'games' || currentView.name === 'leaderboard' || currentView.name === 'store' || currentView.name === 'schedule' || currentView.name === 'tournaments' || currentView.name === 'recent_episodes' || currentView.name === 'current_season' || currentView.name === 'rewards' || currentView.name === 'other_profile' || currentView.name === 'favorites' || currentView.name === 'notifications' || currentView.name === 'ad_support' || currentView.name === 'support_help' || currentView.name === 'support_suggestions' || currentView.name === 'support_donate' || currentView.name === 'support_chat' || currentView.name === 'support_news';

  return (
    <>
      <MascotOfflineScreen />
      {/* Real-time Toast Notifications Overlay */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:right-6 sm:w-[380px] z-[99999] flex flex-col gap-2.5 pointer-events-none" dir="rtl">
        <AnimatePresence>
          {activeToasts.map((toast) => {
            let badgeColor = "bg-[#FF1744]/10 border-[#FF1744]/30 text-[#FF1744]";
            let iconColor = "text-[#FF1744]";
            let borderColor = "border-[#FF1744]/20";
            let glowColor = "shadow-[0_4px_24px_rgba(255,23,68,0.12)]";
            let label = "إشعار جديد";
            let icon = <Bell size={15} />;

            const titleText = toast.title || '';
            const isLike = titleText.includes('إعجاب') || titleText.includes('عجب');

            if (isLike && toast.type === 'social') {
              badgeColor = "bg-orange-500/10 border-orange-500/25 text-orange-400";
              iconColor = "text-orange-400";
              borderColor = "border-orange-500/20";
              glowColor = "shadow-[0_4px_24px_rgba(249,115,22,0.1)]";
              label = "تفاعل مجتمعي";
              icon = <Flame size={15} />;
            } else if (toast.isGlobal) {
              badgeColor = "bg-amber-500/10 border-amber-500/25 text-amber-400";
              iconColor = "text-amber-400";
              borderColor = "border-amber-500/20";
              glowColor = "shadow-[0_4px_24px_rgba(245,158,11,0.12)]";
              label = "إعلان رسمي";
              icon = <Sparkles size={15} />;
            } else if (toast.type === 'admin_report') {
              badgeColor = "bg-rose-500/15 border-rose-500/30 text-rose-400";
              iconColor = "text-rose-400";
              borderColor = "border-rose-500/25";
              glowColor = "shadow-[0_4px_24px_rgba(239,68,68,0.15)]";
              label = "رادار المخالفات 🛡️";
              icon = <ShieldAlert size={14} className="animate-pulse" />;
            } else if (toast.type === 'admin_suggestion') {
              badgeColor = "bg-sky-500/15 border-sky-500/30 text-sky-400";
              iconColor = "text-sky-400";
              borderColor = "border-sky-500/25";
              glowColor = "shadow-[0_4px_24px_rgba(14,165,233,0.15)]";
              label = "بريد المقترحات 💡";
              icon = <MessageSquare size={14} />;
            } else if (toast.type === 'admin_recommendation') {
              badgeColor = "bg-amber-500/15 border-amber-500/30 text-amber-400";
              iconColor = "text-amber-400";
              borderColor = "border-amber-500/25";
              glowColor = "shadow-[0_4px_24px_rgba(245,158,11,0.15)]";
              label = "مراجعة المحتوى 📖";
              icon = <Trophy size={14} />;
            } else {
              switch (toast.type) {
                case 'tournament':
                  badgeColor = "bg-yellow-500/10 border-yellow-500/25 text-yellow-400";
                  iconColor = "text-yellow-400";
                  borderColor = "border-yellow-500/20";
                  glowColor = "shadow-[0_4px_24px_rgba(234,179,8,0.1)]";
                  label = "بطولة نشطة";
                  icon = <Trophy size={15} />;
                  break;
                case 'episode':
                  badgeColor = "bg-[#FF1744]/10 border-[#FF1744]/25 text-[#FF1744]";
                  iconColor = "text-[#FF1744]";
                  borderColor = "border-[#FF1744]/20";
                  glowColor = "shadow-[0_4px_24px_rgba(255,23,68,0.12)]";
                  label = "حلقة جديدة";
                  icon = <Play size={13} className="fill-current" />;
                  break;
                case 'social':
                  badgeColor = "bg-emerald-500/10 border-emerald-500/25 text-emerald-400";
                  iconColor = "text-emerald-400";
                  borderColor = "border-emerald-500/20";
                  glowColor = "shadow-[0_4px_24px_rgba(16,185,129,0.1)]";
                  label = "تفاعل";
                  icon = <MessageSquare size={14} />;
                  break;
                case 'system':
                  badgeColor = "bg-blue-500/10 border-blue-500/25 text-blue-400";
                  iconColor = "text-blue-400";
                  borderColor = "border-blue-500/20";
                  glowColor = "shadow-[0_4px_24px_rgba(59,130,246,0.1)]";
                  label = "النظام";
                  icon = <Info size={14} />;
                  break;
              }
            }

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.18 } }}
                className={`pointer-events-auto w-full bg-[#0a0d14]/95 backdrop-blur-md rounded-2xl border ${borderColor} p-3.5 ${glowColor} flex gap-3.5 relative overflow-hidden select-none cursor-pointer transition duration-300 hover:bg-[#0e121c]/95 active:scale-98`}
                onClick={() => handleToastClick(toast)}
              >
                {/* Subtle visual light bar */}
                <div className={`absolute top-0 right-0 bottom-0 w-1 ${iconColor} bg-current`} />

                {/* Content Image/Icon Thumbnail */}
                <div className="w-10 h-10 rounded-xl bg-[#141a29] border border-white/5 flex items-center justify-center shrink-0 overflow-hidden relative">
                  {toast.imageUrl ? (
                    <img src={toast.imageUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <span className={iconColor}>{icon}</span>
                  )}
                </div>

                {/* Info Text */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-full border ${badgeColor}`}>
                      {label}
                    </span>
                    <span className="text-[9px] text-neutral-500 font-bold">الآن</span>
                  </div>
                  
                  <h5 className="text-[12px] font-black text-white truncate leading-snug">
                    {toast.title}
                  </h5>
                  <p className="text-[10px] sm:text-[11px] font-bold text-neutral-300 leading-normal line-clamp-2 mt-0.5">
                    {toast.body}
                  </p>
                </div>

                {/* Dismiss Controller */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveToasts(prev => prev.filter(t => t.id !== toast.id));
                  }}
                  className="w-6 h-6 hover:bg-white/5 rounded-lg text-neutral-500 hover:text-white transition flex items-center justify-center cursor-pointer select-none self-start shrink-0 relative -top-1 -left-1"
                >
                  <X size={12} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {isFullScreenView ? (
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={currentView.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="h-full w-full mx-auto max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl bg-black min-h-screen relative shadow-[0_0_60px_rgba(0,0,0,0.8)] border-x border-white/5"
          >
             <Suspense fallback={<ViewFallback />}>
               {renderView()}
             </Suspense>
          </motion.div>
        </AnimatePresence>
      ) : (
        <AppLayout activeTab={activeTab} setActiveTab={handleTabChange} onNavigateTo={navigateTo}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={currentView.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="h-full w-full gpu-accelerated"
            >
              <Suspense fallback={<ViewFallback />}>
                {renderView()}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </AppLayout>
      )}
    </>
  );
}
