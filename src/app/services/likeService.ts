import {
  collection,
  addDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  doc,
  getCountFromServer,
  onSnapshot,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

export interface Like {
  id?: string;
  userId: string;
  postId: string;
  createdAt: Timestamp;
}

const db = getFirebaseDb();

export const likeService = {
  // 좋아요 추가
  async addLike(userId: string, postId: string): Promise<void> {
    try {
      await addDoc(collection(db, 'likes'), {
        userId,
        postId,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error adding like:', error);
      throw error;
    }
  },

  // 좋아요 제거
  async removeLike(userId: string, postId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'likes'),
        where('userId', '==', userId),
        where('postId', '==', postId)
      );

      const querySnapshot = await getDocs(q);

      querySnapshot.forEach(async (document) => {
        await deleteDoc(doc(db, 'likes', document.id));
      });
    } catch (error) {
      console.error('Error removing like:', error);
      throw error;
    }
  },

  // 사용자가 특정 포스트를 좋아요했는지 확인
  async isLikedByUser(userId: string, postId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'likes'),
        where('userId', '==', userId),
        where('postId', '==', postId)
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking like status:', error);
      return false;
    }
  },

  // 포스트의 총 좋아요 수 가져오기
  async getLikeCount(postId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'likes'),
        where('postId', '==', postId)
      );

      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      console.error('Error getting like count:', error);
      return 0;
    }
  },

  // 사용자가 좋아요한 포스트 ID들 가져오기
  async getLikedPostIds(userId: string): Promise<string[]> {
    try {
      const q = query(
        collection(db, 'likes'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data().postId);
    } catch (error) {
      console.error('Error getting liked posts:', error);
      return [];
    }
  },

  // 포스트를 좋아요한 사용자들 가져오기
  async getUsersWhoLiked(postId: string, limitCount: number = 10): Promise<string[]> {
    try {
      const q = query(
        collection(db, 'likes'),
        where('postId', '==', postId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data().userId);
    } catch (error) {
      console.error('Error getting users who liked:', error);
      return [];
    }
  },

  // 실시간 좋아요 수 구독
  subscribeLikeCount(postId: string, callback: (count: number) => void): () => void {
    const q = query(
      collection(db, 'likes'),
      where('postId', '==', postId)
    );

    return onSnapshot(q, (snapshot) => {
      callback(snapshot.size);
    }, (error) => {
      console.error('Error in like count subscription:', error);
      callback(0);
    });
  },

  // 사용자의 좋아요 상태 실시간 구독
  subscribeLikeStatus(userId: string, postId: string, callback: (isLiked: boolean) => void): () => void {
    const q = query(
      collection(db, 'likes'),
      where('userId', '==', userId),
      where('postId', '==', postId)
    );

    return onSnapshot(q, (snapshot) => {
      callback(!snapshot.empty);
    }, (error) => {
      console.error('Error in like status subscription:', error);
      callback(false);
    });
  }
};