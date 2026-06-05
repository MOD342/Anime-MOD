/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppLayout } from './components/AppLayout';
import { Loader2 } from 'lucide-react';
import HomeView from './views/HomeView';

const ExploreView = lazy(() => import('./views/ExploreView'));
const CommunityView = lazy(() => import('./views/CommunityView'));
const MyListsView = lazy(() => import('./views/MyListsView'));
const ProfileView = lazy(() => import('./views/ProfileView'));
const AnimeDetailsView = lazy(() => import('./views/AnimeDetailsView'));
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

const AiChatWidget = lazy(() => import('./components/AiChatWidget'));

const ViewFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] text-neutral-400 gap-4" dir="rtl">
    <Loader2 className="animate-spin text-purple-500" size={36} />
    <span className="text-sm font-bold font-mono text-neutral-500 bg-neutral-900/40 border border-white/5 py-1 px-4 rounded-full">جاري تحميل الصفحة...</span>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [viewStack, setViewStack] = useState<{name: string, props?: any}[]>([{ name: 'home' }]);

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
        return <HomeView onAnimeClick={(id) => navigateTo('anime_details', { id })} onNavigateToGames={() => navigateTo('games')} onSearchCategory={(cat) => { setActiveTab('watch'); navigateTo('watch', { initialQuery: cat }); }} onNavigateToSchedule={(day) => navigateTo('schedule', { initialDay: day })} onNavigateToRecent={() => navigateTo('recent_episodes')} onNavigateToSeason={() => navigateTo('current_season')} />;
      case 'watch': 
        return <ExploreView onAnimeClick={(id) => navigateTo('anime_details', { id })} initialQuery={currentView.props?.initialQuery} />;
      case 'community':
        return <CommunityView onUserClick={(userId) => navigateTo('other_profile', { userId })} />;
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
        return <AnimeDetailsView key={currentView.props?.t || currentView.props?.id} id={currentView.props?.id} onBack={goBack} onWatch={(ep, anime) => navigateTo('watch_episode', { episode: ep, anime })} onAnimeClick={(id) => navigateTo('anime_details', id === 'random' ? { id: 'random', t: Date.now() } : { id })} />;
      case 'watch_episode':
        return <WatchView onBack={goBack} episode={currentView.props?.episode} anime={currentView.props?.anime} />;
      case 'admin':
        return <AdminDashboardView onBack={goBack} />;
      case 'games':
        return <AIGamesView onBack={goBack} onNavigateToLeaderboard={() => navigateTo('leaderboard')} onNavigateToStore={() => navigateTo('store')} onNavigateToRewards={() => navigateTo('rewards')} />;
      case 'leaderboard':
        return <LeaderboardView onBack={goBack} onUserClick={(userId) => navigateTo('other_profile', { userId })} />;
      case 'schedule':
        return <ScheduleView onBack={goBack} onAnimeClick={(id) => navigateTo('anime_details', { id })} initialDay={currentView.props?.initialDay} />;
      case 'store':
        return <StoreView onBack={goBack} />;
      case 'recent_episodes':
        return <RecentEpisodesView onBack={goBack} onAnimeClick={(id) => navigateTo('anime_details', { id })} />;
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
      default:
        return <HomeView onAnimeClick={(id) => navigateTo('anime_details', { id })} onNavigateToGames={() => navigateTo('games')} onNavigateToSchedule={(day) => navigateTo('schedule', { initialDay: day })} onNavigateToRecent={() => navigateTo('recent_episodes')} onNavigateToSeason={() => navigateTo('current_season')} />;
    }
  };

  // Do not show AppLayout (top/bottom navs) if we are in fullscreen views like details or watch
  const isFullScreenView = currentView.name === 'level_perks' || currentView.name === 'anime_details' || currentView.name === 'watch_episode' || currentView.name === 'admin' || currentView.name === 'games' || currentView.name === 'leaderboard' || currentView.name === 'store' || currentView.name === 'schedule' || currentView.name === 'tournaments' || currentView.name === 'recent_episodes' || currentView.name === 'current_season' || currentView.name === 'rewards' || currentView.name === 'other_profile' || currentView.name === 'favorites' || currentView.name === 'notifications';

  return (
    <>
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
      <Suspense fallback={null}>
        <AiChatWidget />
      </Suspense>
    </>
  );
}
