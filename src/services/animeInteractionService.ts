import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, updateDoc, doc } from 'firebase/firestore';

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
  targetAnimeId: string;
  targetAnimeTitle: string;
  reason: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
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
    console.error("Error fetching comments", error);
    return [];
  }
};

export const addComment = async (comment: Omit<Comment, 'id' | 'createdAt'>) => {
  try {
    await addDoc(collection(db, 'comments'), {
      ...comment,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error adding comment", error);
  }
};

export const updateCommentInteraction = async (commentId: string, data: Partial<Comment>) => {
  try {
    const ref = doc(db, 'comments', commentId);
    await updateDoc(ref, data);
  } catch (error) {
    console.error("Error updating comment", error);
  }
};

export const getApprovedRecommendations = async (animeId: string): Promise<Recommendation[]> => {
  const q = query(
    collection(db, 'recommendations'),
    where('animeId', '==', animeId),
    where('status', '==', 'approved'),
    orderBy('createdAt', 'desc')
  );
  try {
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recommendation));
  } catch (error) {
    console.error("Error fetching recommendations", error);
    return [];
  }
};

export const addRecommendation = async (rec: Omit<Recommendation, 'id' | 'createdAt' | 'status'>) => {
  try {
    await addDoc(collection(db, 'recommendations'), {
      ...rec,
      status: 'approved',
      likes: 0,
      dislikes: 0,
      createdAt: serverTimestamp()
    });
    const { incrementInteraction } = await import('./gamificationService');
    await incrementInteraction(rec.userId, 'recommendation');
  } catch (error) {
    console.error("Error adding recommendation", error);
  }
};

export const updateRecommendationInteraction = async (recId: string, data: Partial<Recommendation>) => {
  try {
    const ref = doc(db, 'recommendations', recId);
    await updateDoc(ref, data);
  } catch (error) {
    console.error("Error updating recommendation", error);
  }
};
