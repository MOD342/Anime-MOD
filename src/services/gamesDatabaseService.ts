import { 
  collection, addDoc, getDocs, query, where, limit, 
  serverTimestamp, doc, updateDoc, increment, orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';

// Helper for shuffling array
const shuffleArray = (arr: any[]) => {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

/**
 * Intelligent game question provider
 */
export async function getGameQuestions(type: string, user: any = null): Promise<any[]> {
  const cacheLimit = 40; // pool size to read from Firestore
  let firestoreQuestions: any[] = [];

  // 1. Try fetching from Firestore first
  try {
    const q = query(
      collection(db, 'gameQuestions'),
      where('type', '==', type),
      limit(cacheLimit)
    );
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.questionData) {
        firestoreQuestions.push({
          id: docSnap.id,
          likes: data.likes || 0,
          dislikes: data.dislikes || 0,
          author: data.author || 'AI',
          ...data.questionData
        });
      }
    });
  } catch (error) {
    console.warn("Failed to retrieve questions from Firestore cache:", error);
  }

  // 2. Decide if we have enough questions or if we should fetch fresh AI questions
  const hasEnoughCache = firestoreQuestions.length >= 10;
  const shouldFetchFreshAI = !hasEnoughCache || Math.random() < 0.20; // 20% system freshness injection

  if (shouldFetchFreshAI) {
    console.log(`[SmartDB] Fetching fresh AI questions for type: '${type}'. Cache size: ${firestoreQuestions.length}`);
    try {
      const res = await fetch(`/api/ai/games/generate?type=${type}`);
      const payload = await res.json();
      if (payload.success && payload.data && payload.data.length > 0) {
        const freshQuestions = payload.data;

        // Asynchronously save these brand new questions to Firestore so they are added to the central pool
        if (user) {
          saveFreshQuestionsToDB(type, freshQuestions, 'الذكاء الاصطناعي ✨');
        }

        // Combine and return
        if (firestoreQuestions.length === 0) {
          return freshQuestions;
        }
        // Merge so we have a rich set
        const combined = [...freshQuestions, ...firestoreQuestions];
        return shuffleArray(combined).slice(0, 5);
      }
    } catch (apiError) {
      console.error("[SmartDB] Failed to fetch fresh questions from API, falling back to cache.", apiError);
    }
  }

  // 3. If we have cache, shuffle and return 5 random questions
  if (firestoreQuestions.length > 0) {
    console.log(`[SmartDB] Serving ${Math.min(5, firestoreQuestions.length)} shuffled questions from central pool for type: '${type}'.`);
    return shuffleArray(firestoreQuestions).slice(0, 5);
  }

  // 4. Return empty if absolutely everything fails
  return [];
}

/**
 * Saves generated questions to Firestore pool asynchronously
 */
export async function saveFreshQuestionsToDB(type: string, questions: any[], authorName = 'الذكاء الاصطناعي ✨') {
  try {
    for (const q of questions) {
      const questionId = `${type}_gen_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      await addDoc(collection(db, 'gameQuestions'), {
        type: type,
        questionData: q,
        author: authorName,
        likes: 0,
        dislikes: 0,
        createdAt: serverTimestamp()
      });
    }
    console.log(`[SmartDB] Successfully cached ${questions.length} new questions of type '${type}' in Firestore.`);
  } catch (e) {
    console.warn("[SmartDB] Failed to cache questions in Firestore (likely requires signed-in user):", e);
  }
}

/**
 * Submits a custom user-contributed question
 */
export async function submitCustomQuestion(
  type: string, 
  questionData: any, 
  userId: string, 
  username: string
): Promise<boolean> {
  try {
    await addDoc(collection(db, 'gameQuestions'), {
      type: type,
      questionData: questionData,
      author: username || 'الأوتوكو المساهم ⚔️',
      likes: 0,
      dislikes: 0,
      createdAt: serverTimestamp()
    });

    // Reward user for their contribution
    try {
      await updateDoc(doc(db, 'users', userId), {
        coins: increment(15), // 15 coins for smart database contribution!
        modPoints: increment(5),
        xp: increment(30)
      });
    } catch (rewardErr) {
      console.warn("Failed to award contribution rewards:", rewardErr);
    }

    return true;
  } catch (e) {
    console.error("Failed to submit custom game question:", e);
    return false;
  }
}

/**
 * Vote on question quality
 */
export async function voteOnQuestion(questionId: string, isLike: boolean) {
  if (!questionId || questionId.includes('_gen_')) return; // skip unsaved inline docs
  try {
    const qDoc = doc(db, 'gameQuestions', questionId);
    await updateDoc(qDoc, {
      [isLike ? 'likes' : 'dislikes']: increment(1)
    });
  } catch (e) {
    console.warn("Failed to record vote on trivia question:", e);
  }
}

/**
 * Fetches latest contributed/generated questions within the central pool
 */
export async function getLatestSubmittedQuestions(limitCount = 25): Promise<any[]> {
  try {
    const q = query(
      collection(db, 'gameQuestions'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const results: any[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data) {
        results.push({
          id: docSnap.id,
          likes: data.likes || 0,
          dislikes: data.dislikes || 0,
          author: data.author || 'AI',
          type: data.type,
          createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : null,
          ...data.questionData
        });
      }
    });
    return results;
  } catch (error) {
    console.error("Failed to fetch latest submitted questions with sorting, trying unsorted fallback:", error);
    try {
      const q = query(
        collection(db, 'gameQuestions'),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      const results: any[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data) {
          results.push({
            id: docSnap.id,
            likes: data.likes || 0,
            dislikes: data.dislikes || 0,
            author: data.author || 'AI',
            type: data.type,
            createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : null,
            ...data.questionData
          });
        }
      });
      return results;
    } catch (e2) {
      console.error("Unsorted fallback failed too:", e2);
      return [];
    }
  }
}
