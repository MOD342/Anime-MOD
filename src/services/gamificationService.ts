import { db } from '../firebase';
import { doc, getDoc, updateDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { notificationsService } from './notificationsService';

export const updateDailyStreak = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;
    
    const data = snap.data();
    const lastActive = data.lastActiveDate;
    const today = new Date().toISOString().split('T')[0];
    
    if (lastActive === today) {
      return; // Already updated today
    }
    
    let newStreak = data.streakDays || 0;
    
    if (lastActive) {
      const lastDate = new Date(lastActive);
      const currentDate = new Date(today);
      const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays === 1) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }
    
    await updateDoc(userRef, { 
      streakDays: newStreak,
      lastActiveDate: today
    });
    
    if (newStreak % 5 === 0) {
      // Award bonuses for multiple of 5 days streak
      await awardModPoints(userId, 50);
      await awardXP(userId, 100);
    }
  } catch (error) {
    console.error("Error updating streak:", error);
  }
};

export const awardXP = async (userId: string, xpAmount: number, giveCoins: boolean | number = false, additionalFields?: Record<string, any>) => {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const isCoinsRestricted = data.isCoinsRestricted === true;
    let newXp = (data.xp || 0) + xpAmount;
    let newLevel = data.level || 1;

    // Calculate level up
    let requiredXpForNextLevel = Math.floor(Math.pow(newLevel, 1.5) * 500) + 500;
    let leveledUp = false;

    while (newXp >= requiredXpForNextLevel && newLevel < 100) {
      newXp -= requiredXpForNextLevel;
      newLevel++;
      requiredXpForNextLevel = Math.floor(Math.pow(newLevel, 1.5) * 500) + 500;
      leveledUp = true;
    }
    
    if (newLevel >= 100) {
       newLevel = 100;
       if (newXp > requiredXpForNextLevel) newXp = requiredXpForNextLevel; // cap XP at max
    }

    const updateObj: any = { xp: newXp };
    
    // Copy additionalFields first so they can be overridden by system if needed, or vice-versa
    if (additionalFields) {
      Object.assign(updateObj, additionalFields);
    }

    if (leveledUp) {
      updateObj.level = newLevel;
      // Award modPoints and coins for leveling up
      updateObj.modPoints = increment(50);
      if (!isCoinsRestricted) {
        updateObj.coins = increment((updateObj.coins ? 100 : 100)); // We adjust or set increment
      }
    }
    
    if (leveledUp) {
      updateObj.level = newLevel;
      updateObj.modPoints = increment(50);
      if (!isCoinsRestricted) {
        if (updateObj.coins) {
          // already set
        } else {
          updateObj.coins = increment(100);
        }
      }
    }

    if (giveCoins && !isCoinsRestricted) {
        if (typeof giveCoins === 'number') {
          if (updateObj.coins) {
             // If there's already a coins increment (from level up)
             updateObj.coins = increment(giveCoins + 100);
          } else {
             updateObj.coins = increment(giveCoins);
          }
        } else {
          const calculated = Math.max(1, Math.floor(xpAmount / 5));
          if (updateObj.coins) {
             updateObj.coins = increment(calculated + 100);
          } else {
             updateObj.coins = increment(calculated);
          }
        }
    }
    
    // Update daily stats directly within the same call if possible, or wait
    const today = new Date().toDateString();
    let dailyStats = data.dailyStats || { date: today, xpGained: 0, gamesPlayed: 0, commentsAdded: 0, ratingsAdded: 0, episodesWatched: 0, quest1Claimed: false, quest2Claimed: false };
    if (dailyStats.date !== today) {
        dailyStats = { date: today, xpGained: 0, gamesPlayed: 0, commentsAdded: 0, ratingsAdded: 0, episodesWatched: 0, quest1Claimed: false, quest2Claimed: false };
    }
    dailyStats.xpGained += xpAmount;
    updateObj.dailyStats = dailyStats;
    
    await updateDoc(userRef, updateObj);
    return { leveledUp, newLevel, newXp };
  } catch (error) {
    console.error("Error awarding XP:", error);
  }
};

export const awardModPoints = async (userId: string, pointsAmount: number) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { modPoints: increment(pointsAmount) });
  } catch (error) {
    console.error("Error awarding mod points:", error);
  }
};

export const incrementInteraction = async (userId: string, type: 'like' | 'comment' | 'recommendation' | 'rating' | 'chat') => {
  try {
    const fieldMap: Record<string, string> = {
      like: 'likesReceived',
      comment: 'commentsCount',
      recommendation: 'recommendationsAccepted',
      rating: 'ratingsCount',
      chat: 'chatMessagesCount'
    };
    
    if (fieldMap[type]) {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return;
      const data = snap.data();

      const updateObj: any = {
        [fieldMap[type]]: increment(1)
      };

      // Enrich dailyStats
      const today = new Date().toDateString();
      let dailyStats = data.dailyStats || { date: today, xpGained: 0, gamesPlayed: 0, commentsAdded: 0, ratingsAdded: 0, episodesWatched: 0, quest1Claimed: false, quest2Claimed: false };
      if (dailyStats.date !== today) {
        dailyStats = { date: today, xpGained: 0, gamesPlayed: 0, commentsAdded: 0, ratingsAdded: 0, episodesWatched: 0, quest1Claimed: false, quest2Claimed: false };
      }
      
      if (type === 'comment') {
        dailyStats.commentsAdded = (dailyStats.commentsAdded || 0) + 1;
      } else if (type === 'rating') {
        dailyStats.ratingsAdded = (dailyStats.ratingsAdded || 0) + 1;
      }
      
      updateObj.dailyStats = dailyStats;
      await updateDoc(userRef, updateObj);
      
      let xpToAward = 0;
      if (type === 'comment') xpToAward = 10;
      else if (type === 'recommendation') xpToAward = 50;
      else if (type === 'rating') xpToAward = 5;
      else if (type === 'chat') xpToAward = 2;
      else if (type === 'like') xpToAward = 5; // The user receiving the like gets 5 XP
      
      if (xpToAward > 0) {
        await awardXP(userId, xpToAward);
      }
    }
  } catch (error) {
    console.error("Error incrementing interaction:", error);
  }
};

export const recordEpisodeWatch = async (
  userId: string, 
  anime?: { _id: string; title: string; posterUrl: string; releaseYear: string; episodes?: any[]; episodesCount?: number }, 
  episodeNum?: number
) => {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;
    const userData = snap.data();
    
    let isAlreadyWatched = false;
    let newlyCompleted = false;
    let playedNewEpisode = false;
    let watchedEpisodes: number[] = [];
    let currentStatus = 'none';

    if (anime && episodeNum !== undefined) {
      const entryRef = doc(db, 'users', userId, 'animeEntries', anime._id);
      const entrySnap = await getDoc(entryRef);
      const exists = entrySnap.exists();
      
      if (exists) {
        const entryData = entrySnap.data();
        watchedEpisodes = entryData.watchedEpisodes || [];
        currentStatus = entryData.status || 'none';
      }
      
      isAlreadyWatched = watchedEpisodes.includes(episodeNum);
      
      if (!isAlreadyWatched) {
        playedNewEpisode = true;
        watchedEpisodes.push(episodeNum);
        watchedEpisodes.sort((a, b) => a - b);
        
        let statusToSave = currentStatus;
        if (statusToSave === 'none' || !statusToSave) {
          statusToSave = 'watching';
        }
        
        const totalEps = anime.episodesCount || (anime.episodes ? anime.episodes.length : 0);
        if (totalEps > 0 && watchedEpisodes.length >= totalEps && currentStatus !== 'completed') {
          statusToSave = 'completed';
          newlyCompleted = true;
        }
        
        const payload: any = {
          animeId: anime._id,
          title: anime.title,
          posterUrl: anime.posterUrl,
          releaseYear: anime.releaseYear || '',
          updatedAt: serverTimestamp(),
          watchedEpisodes,
          status: statusToSave
        };
        
        if (newlyCompleted) {
          payload.completedXpClaimed = true;
        }
        
        if (!exists) {
          payload.addedAt = serverTimestamp();
        }
        
        await setDoc(entryRef, payload, { merge: true });
        
        // Dynamically invalidate list caches to avoid stale views and circular dependency
        try {
          const { listService } = await import('./listService');
          listService.invalidateUserCache(userId, anime._id);
        } catch (_) {}
      }
    } else {
      playedNewEpisode = true;
    }

    const today = new Date().toDateString();
    let dailyStats = userData.dailyStats || { date: today, xpGained: 0, gamesPlayed: 0, commentsAdded: 0, ratingsAdded: 0, episodesWatched: 0, quest1Claimed: false, quest2Claimed: false };
    if (dailyStats.date !== today) {
      dailyStats = { date: today, xpGained: 0, gamesPlayed: 0, commentsAdded: 0, ratingsAdded: 0, episodesWatched: 0, quest1Claimed: false, quest2Claimed: false };
    }
    
    if (playedNewEpisode) {
      dailyStats.episodesWatched = (dailyStats.episodesWatched || 0) + 1;
      
      const userUpdate: any = {
        dailyStats,
        totalEpisodesWatched: increment(1)
      };
      
      if (anime && currentStatus === 'none') {
        userUpdate.listCount = increment(1);
      }
      
      if (newlyCompleted) {
        userUpdate.completedAnimeCount = increment(1);
      }
      
      await updateDoc(userRef, userUpdate);
      await awardXP(userId, 15, 5); // Award 15 XP & 5 Coins
      
      if (anime) {
        await notificationsService.createUserNotification(userId, {
          title: '📺 تم تسجيل مشاهدة حلقة!',
          body: `شاهدت الحلقة ${episodeNum} من أنمي ${anime.title}. حصلت على +15 XP و +5 كوينز!`,
          type: 'episode',
          imageUrl: anime.posterUrl,
          linkTo: `anime_details:${anime._id}`
        });
      }

      if (newlyCompleted && anime) {
        await awardXP(userId, 100, 30); // Extra reward for completion
        await notificationsService.createUserNotification(userId, {
          title: '🎉 تهانينا! أكملت الأنمي بالكامل',
          body: `مبروك! لقد أكملت مشاهدة ${anime.title}! حصلت على جائزة إضافية: +100 XP و +30 كوينز!`,
          type: 'tournament',
          imageUrl: anime.posterUrl,
          linkTo: `anime_details:${anime._id}`
        });
      }
    }
  } catch (error) {
    console.error("Error updates episode watch:", error);
  }
};

export const awardAiGamePoints = async (userId: string, score: number) => {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;
    
    const data = snap.data();
    const currentHigh = data.aiGamesPoints || 0;
    
    const updateObj: any = {};
    if (score > currentHigh) {
      updateObj.aiGamesPoints = score;
    }
    // you could also award XP for playing -> awardXP(userId, 20);
    
    if (Object.keys(updateObj).length > 0) {
      await updateDoc(userRef, updateObj);
    }
    await awardXP(userId, 50); // Gives 50XP for playing
  } catch(error) {
    console.error("Error awarding ai points", error);
  }
}
