export interface DynamicAchievement {
  id: string;
  title: string;
  req: string;
  rewardType: 'xp' | 'coins' | 'modPoints';
  rewardVal: number;
  category: 'anime' | 'episodes' | 'games' | 'level' | 'interaction';
  condition: (u: any, s: any) => boolean;
  progress: (u: any, s: any) => number;
  max: number;
}

export const DYNAMIC_ACHIEVEMENTS: DynamicAchievement[] = [];

// Category names mapping helper
export const CATEGORY_LABELS = {
  all: 'الكل',
  anime: 'متابعة الأنمي',
  episodes: 'مشاهدة الحلقات',
  games: 'العاب الذكاء',
  level: 'الارتقاء والمستوى',
  interaction: 'التفاعل والمجتمع'
};

// 1. Anime Completed Achievements (100 milestones: 5, 10, 15, ..., 500)
for (let i = 1; i <= 100; i++) {
  const target = i * 5;
  const rewardVal = Math.floor(target * 4 + 10);
  const types: ('xp' | 'coins' | 'modPoints')[] = ['xp', 'coins', 'modPoints'];
  const rewardType = types[i % 3];
  
  DYNAMIC_ACHIEVEMENTS.push({
    id: `dyn_anime_${target}`,
    title: `حفيظ الأراشيف | م${i}`,
    req: `إنهاء مشاهدة ${target} عمل أنمي بالقائمة الخاصة بك`,
    rewardType,
    rewardVal,
    category: 'anime',
    condition: (u: any, s: any) => {
      const current = s?.listCount?.completed || u?.completedAnimeCount || 0;
      return current >= target;
    },
    progress: (u: any, s: any) => s?.listCount?.completed || u?.completedAnimeCount || 0,
    max: target
  });
}

// 2. Episodes Watched Achievements (100 milestones: 20, 40, 60, ..., 2000)
for (let i = 1; i <= 100; i++) {
  const target = i * 20;
  const rewardVal = Math.floor(target * 1.5 + 20);
  const types: ('xp' | 'coins' | 'modPoints')[] = ['coins', 'xp', 'modPoints'];
  const rewardType = types[i % 3];

  DYNAMIC_ACHIEVEMENTS.push({
    id: `dyn_ep_${target}`,
    title: `متابع دؤوب للقصص | م${i}`,
    req: `بلوغ مشاهدة ${target} حلقة أنمي بالكامل في الأرشيف المعتمد`,
    rewardType,
    rewardVal,
    category: 'episodes',
    condition: (u: any, s: any) => {
      const current = s?.totalEpisodesWatched || u?.totalEpisodesWatched || 0;
      return current >= target;
    },
    progress: (u: any, s: any) => s?.totalEpisodesWatched || u?.totalEpisodesWatched || 0,
    max: target
  });
}

// 3. Intelligence Games / AI Games (100 milestones: 100, 200, 300, ..., 10000)
for (let i = 1; i <= 100; i++) {
  const target = i * 100;
  const rewardVal = Math.floor(target * 0.15 + 15);
  const types: ('xp' | 'coins' | 'modPoints')[] = ['modPoints', 'coins', 'xp'];
  const rewardType = types[i % 3];

  DYNAMIC_ACHIEVEMENTS.push({
    id: `dyn_games_${target}`,
    title: `أستاذ الألعاب الذكية | م${i}`,
    req: `حصد ${target} نقطة خبرة فكرية في قسم ألعاب الذكاء وتحديات الأنمي الكبرى`,
    rewardType,
    rewardVal,
    category: 'games',
    condition: (u: any, s: any) => {
      const current = u?.aiGamesPoints || 0;
      return current >= target;
    },
    progress: (u: any, s: any) => u?.aiGamesPoints || 0,
    max: target
  });
}

// 4. User level milestones (100 milestones: levels 2, 3, 4, ..., 101)
for (let i = 1; i <= 100; i++) {
  const target = i + 1; // from Level 2 to 101
  const rewardVal = Math.floor(target * 15 + 10);
  const types: ('xp' | 'coins' | 'modPoints')[] = ['xp', 'modPoints', 'coins'];
  const rewardType = types[i % 3];

  DYNAMIC_ACHIEVEMENTS.push({
    id: `dyn_level_${target}`,
    title: `رتبة تسامي الحساب | م${i}`,
    req: `تطوير مستوى حسابك والارتقاء إلى المستوى ${target} لفتح ميزات نادرة جداً`,
    rewardType,
    rewardVal,
    category: 'level',
    condition: (u: any, s: any) => {
      const current = u?.level || 1;
      return current >= target;
    },
    progress: (u: any, s: any) => u?.level || 1,
    max: target
  });
}

// 5. Interaction (Comments + Likes Received) (100 milestones: 5, 10, 15, ..., 500)
for (let i = 1; i <= 100; i++) {
  const target = i * 5;
  const rewardVal = Math.floor(target * 6 + 10);
  const types: ('xp' | 'coins' | 'modPoints')[] = ['coins', 'xp', 'modPoints'];
  const rewardType = types[i % 3];

  DYNAMIC_ACHIEVEMENTS.push({
    id: `dyn_interact_${target}`,
    title: `قائد الرأي والحديث | م${i}`,
    req: `المشاركة التفاعلية بـ ${target} تعليق أو إعجاب مستلم لتنشيط عوالم المنصة`,
    rewardType,
    rewardVal,
    category: 'interaction',
    condition: (u: any, s: any) => {
      const current = (u?.commentsCount || 0) + (u?.likesReceived || 0);
      return current >= target;
    },
    progress: (u: any, s: any) => (u?.commentsCount || 0) + (u?.likesReceived || 0),
    max: target
  });
}
