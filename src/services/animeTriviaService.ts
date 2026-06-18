import { 
  collection, addDoc, getDocs, query, where, limit, 
  serverTimestamp, doc, updateDoc, increment, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { TriviaQuestion } from '../models/TriviaQuestion';

// Shuffling helper
const shuffleArray = <T>(arr: T[]): T[] => {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// Exceptional, authentic Anime trivia pool
export const SEED_TRIVIA_QUESTIONS: Omit<TriviaQuestion, 'createdAt'>[] = [
  {
    question: "من هو صانع السيوف الأسطوري الذي قام بنحت 'وادو إيتشيمونجي' و'إنما' في ون بيس؟",
    options: ["تنجو كوتيتسو", "شيموتسوكي كوزابورو", "كيوشيرو", "هيتيتسو"],
    correctIndex: 1,
    animeName: "One Piece",
    difficulty: "medium",
    author: "إدارة الفيلق 🛡️",
    likes: 5,
    dislikes: 0
  },
  {
    question: "ما هو الاسم الحقيقي للعميد 'إل' (L) في أنمي مذكرة الموت (Death Note)؟",
    options: ["إل ريوزاكي", "نات ريفر", "إل لولايت", "ميلو"],
    correctIndex: 2,
    animeName: "Death Note",
    difficulty: "easy",
    author: "أوتوكو محقق 🔍",
    likes: 8,
    dislikes: 0
  },
  {
    question: "ما هو اسم السيف الخاص بالشخصية 'رورونوا زورو' والمصنف كأوه-وازامونو (خنجر ذو مظهر أسود) وحصل عليه كنصف إرث؟",
    options: ["شوشوي", "وادو إيتشيمونجي", "يوباشيري", "ساندائي كيتيتسو"],
    correctIndex: 0,
    animeName: "One Piece",
    difficulty: "medium",
    author: "سياف الغسق ⚔️",
    likes: 12,
    dislikes: 1
  },
  {
    question: "في هجوم العمالقة، ما هو الاسم الحقيقي لعملاق الفك الذي ورثه فالكو غريس؟",
    options: ["بوركو غاليارد", "مارسيل غاليارد", "يومير", "العملاق الفك الأجنح"],
    correctIndex: 0,
    animeName: "Attack on Titan",
    difficulty: "hard",
    author: "فيلق الاستطلاع 🏹",
    likes: 15,
    dislikes: 0
  },
  {
    question: "ما نوع تشاكر النصل والنين لمدرب كورايبكا (كورابيكا) عندما تصبح عيناه قرمزية بالكامل؟",
    options: ["تجسيد", "تحويل", "متخصص", "تعزيز"],
    correctIndex: 2,
    animeName: "Hunter x Hunter",
    difficulty: "easy",
    author: "حكيم كونوها 🍃",
    likes: 9,
    dislikes: 2
  },
  {
    question: "ما هي الجملة أو الكلمة السحرية التي يطلقها بطل القصة 'سينكّو' لبدء التنشيط العلمي في أنمي دكتور ستون؟",
    options: ["بنسبة 10 مليار بالمئة", "العلم سينتصر دائماً", "هذا غير منطقي علمياً", "تمت محاكاة المعادلة"],
    correctIndex: 0,
    animeName: "Dr. Stone",
    difficulty: "easy",
    author: "أكاديمي العلوم 🧬",
    likes: 6,
    dislikes: 0
  },
  {
    question: "في بليتش، من هو الأقوى المرتبة صفر في منظمة الإيسبادا المدمرة؟",
    options: ["كويوت ستارك", "يامي رياجو", "أولكيورا تسيفر", "باراغان لويزنبرن"],
    correctIndex: 1,
    animeName: "Bleach",
    difficulty: "hard",
    author: "ملك الأرواح ☠️",
    likes: 10,
    dislikes: 1
  },
  {
    question: "كم عدد البوابات الداخلية التي قام مايت غاي بفتحها بالكامل في معركته الأسطورية ضد مادارا أوتشيها؟",
    options: ["سبع بوابات", "ثماني بوابات", "ست بوابات", "خمس بوابات"],
    correctIndex: 1,
    animeName: "Naruto Shippuden",
    difficulty: "easy",
    author: "الوحش الأخضر 🛡️",
    likes: 11,
    dislikes: 0
  },
  {
    question: "في بلاك كلوفر، ما هو اسم الشليطر السري والوجه الشيطاني الحقيقي المحبوس داخل كتاب تعاويذ أستا ذو الخمس نفات؟",
    options: ["ليبي", "زاغريد", "ميغيكيولا", "لوسيفر"],
    correctIndex: 0,
    animeName: "Black Clover",
    difficulty: "medium",
    author: "ساحر القرن 🔥",
    likes: 7,
    dislikes: 1
  },
  {
    question: "ما هو اسم السحر الشرير والتقنية التوسعية الإقليمية الخاصة بملك اللعنات 'سوكونا' في جوجوتسو كايسن؟",
    options: ["ضريح السوء (Malevolent Shrine)", "الفراغ اللانهائي", "تابوت جبل الحديد", "حديقة الظل الخيمية"],
    correctIndex: 0,
    animeName: "Jujutsu Kaisen",
    difficulty: "medium",
    author: "سحرة كوتو 🧬",
    likes: 14,
    dislikes: 0
  }
];

/**
 * Fetch trivia questions filtered by difficulty.
 * Supports background automatic seeding if empty, and falls back to seeds.
 */
export async function getTriviaQuestions(difficulty: 'easy' | 'medium' | 'hard', user: any = null): Promise<TriviaQuestion[]> {
  try {
    const q = query(
      collection(db, 'animeTrivia'),
      where('difficulty', '==', difficulty),
      limit(20)
    );
    const snap = await getDocs(q);
    const results: TriviaQuestion[] = [];
    
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data) {
        results.push({
          id: docSnap.id,
          question: data.question,
          options: data.options,
          correctIndex: data.correctIndex,
          animeName: data.animeName,
          difficulty: data.difficulty,
          author: data.author || 'الذكاء الاصطناعي 🛡️',
          likes: data.likes || 0,
          dislikes: data.dislikes || 0,
          createdAt: data.createdAt
        });
      }
    });

    // If Firestore does not have questions, automatically seed in background and return fallback shuffled
    if (results.length === 0) {
      console.log(`[TriviaService] No trivia in db for difficulty '${difficulty}'. Seeding standard questions...`);
      if (user) {
        seedAndCacheQuestions();
      }
      const filteredSeeds = SEED_TRIVIA_QUESTIONS.filter(q => q.difficulty === difficulty);
      return shuffleArray(filteredSeeds.length > 0 ? filteredSeeds : SEED_TRIVIA_QUESTIONS) as TriviaQuestion[];
    }

    return shuffleArray(results);
  } catch (error) {
    console.warn("[TriviaService] Failed to load trivia questions from Firestore:", error);
    const filteredSeeds = SEED_TRIVIA_QUESTIONS.filter(q => q.difficulty === difficulty);
    return shuffleArray(filteredSeeds.length > 0 ? filteredSeeds : SEED_TRIVIA_QUESTIONS) as TriviaQuestion[];
  }
}

/**
 * Seed Firestore in batches with initial questions
 */
export async function seedAndCacheQuestions() {
  try {
    const checkSnap = await getDocs(query(collection(db, 'animeTrivia'), limit(1)));
    if (!checkSnap.empty) return; // already seeded

    const batch = writeBatch(db);
    SEED_TRIVIA_QUESTIONS.forEach((q) => {
      const docRef = doc(collection(db, 'animeTrivia'));
      batch.set(docRef, {
        ...q,
        createdAt: serverTimestamp()
      });
    });
    await batch.commit();
    console.log("[TriviaService] Seeding of high-quality anime trivia complete.");
  } catch (error) {
    console.warn("[TriviaService] Seeding failed: ", error);
  }
}

/**
 * Submit user contributed Trivia question
 */
export async function submitTriviaQuestion(
  questionData: Omit<TriviaQuestion, 'createdAt' | 'likes' | 'dislikes'>,
  userId: string,
  username: string
): Promise<boolean> {
  try {
    await addDoc(collection(db, 'animeTrivia'), {
      question: questionData.question,
      options: questionData.options,
      correctIndex: questionData.correctIndex,
      animeName: questionData.animeName,
      difficulty: questionData.difficulty,
      author: username || 'الأوتوكو المساهم ⚔️',
      likes: 0,
      dislikes: 0,
      createdAt: serverTimestamp()
    });

    // Reward user with coins, mod points, and xp
    try {
      await updateDoc(doc(db, 'users', userId), {
        coins: increment(20), // 20 coins reward for high-fidelity trivia contributor!
        xp: increment(40),
        modPoints: increment(5)
      });
    } catch (err) {
      console.warn("Contributor reward update failed:", err);
    }

    return true;
  } catch (error) {
    console.error("[TriviaService] Failed to submit trivia question:", error);
    return false;
  }
}

/**
 * Vote on a trivia question quality
 */
export async function voteTriviaQuestion(questionId: string, isLike: boolean): Promise<void> {
  if (!questionId) return;
  try {
    await updateDoc(doc(db, 'animeTrivia', questionId), {
      [isLike ? 'likes' : 'dislikes']: increment(1)
    });
  } catch (err) {
    console.warn("[TriviaService] Voting on trivia question failed:", err);
  }
}
