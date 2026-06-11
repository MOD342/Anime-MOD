import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../firebaseUtils';

export interface Comment {
  id?: string;
  animeId: string;
  userId: string;
  userDisplayName: string;
  text: string;
  likes: number;
  dislikes: number;
  userPhotoUrl?: string;
  parentCommentId?: string;
  isSpoiler?: boolean;
  createdAt?: any;
  equippedAvatar?: string | null;
  equippedFrame?: string | null;
  equippedTitle?: string | null;
  equippedBadge?: string | null;
}

export interface Recommendation {
  id?: string;
  animeId: string;
  animeTitle?: string;
  animePosterUrl?: string;
  targetAnimeId: string;
  targetAnimeTitle: string;
  targetAnimePosterUrl?: string;
  reason: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  likes?: number;
  dislikes?: number;
  createdAt?: any;
}

export const getComments = async (animeId: string): Promise<Comment[]> => {
  const q = query(
    collection(db, 'comments'),
    where('animeId', '==', animeId),
    orderBy('createdAt', 'desc')
  );
  try {
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'comments');
    return [];
  }
};

export const addComment = async (comment: Omit<Comment, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'comments'), {
      ...comment,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'comments');
    throw error;
  }
};

export const updateCommentInteraction = async (commentId: string, data: Partial<Comment>) => {
  try {
    const ref = doc(db, 'comments', commentId);
    await updateDoc(ref, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `comments/${commentId}`);
  }
};

export const getApprovedRecommendations = async (animeId: string): Promise<Recommendation[]> => {
  try {
    const q1 = query(
      collection(db, 'recommendations'),
      where('animeId', '==', animeId),
      where('status', '==', 'approved')
    );
    const q2 = query(
      collection(db, 'recommendations'),
      where('targetAnimeId', '==', animeId),
      where('status', '==', 'approved')
    );
    
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    const map = new Map<string, Recommendation>();
    
    snap1.docs.forEach(docSnap => {
      map.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Recommendation);
    });
    
    snap2.docs.forEach(docSnap => {
      map.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Recommendation);
    });
    
    const recs = Array.from(map.values());
    recs.sort((a,b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return bTime - aTime;
    });
    return recs;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'recommendations');
    return [];
  }
};

export const addRecommendation = async (rec: Omit<Recommendation, 'id' | 'createdAt' | 'status'>) => {
  try {
    const cleanRec: any = {
      animeId: String(rec.animeId),
      targetAnimeId: String(rec.targetAnimeId),
      targetAnimeTitle: String(rec.targetAnimeTitle),
      reason: String(rec.reason),
      userId: String(rec.userId),
    };

    if (rec.animeTitle !== undefined && rec.animeTitle !== null) {
      cleanRec.animeTitle = String(rec.animeTitle);
    }
    if (rec.animePosterUrl !== undefined && rec.animePosterUrl !== null) {
      cleanRec.animePosterUrl = String(rec.animePosterUrl);
    }
    if (rec.targetAnimePosterUrl !== undefined && rec.targetAnimePosterUrl !== null) {
      cleanRec.targetAnimePosterUrl = String(rec.targetAnimePosterUrl);
    }

    console.log("Saving recommendation payload:", cleanRec);

    await addDoc(collection(db, 'recommendations'), {
      ...cleanRec,
      status: 'pending',
      likes: 0,
      dislikes: 0,
      createdAt: serverTimestamp()
    });
    const { incrementInteraction } = await import('./gamificationService');
    await incrementInteraction(rec.userId, 'recommendation');
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'recommendations');
  }
};

export const updateRecommendationInteraction = async (recId: string, data: Partial<Recommendation>) => {
  try {
    const ref = doc(db, 'recommendations', recId);
    await updateDoc(ref, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `recommendations/${recId}`);
  }
};
