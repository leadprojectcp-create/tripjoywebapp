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

export interface Bookmark {
  id?: string;
  userId: string;
  postId: string;
  createdAt: Timestamp;
}

const db = getFirebaseDb();

export const bookmarkService = {
  // 북마크 추가
  async addBookmark(userId: string, postId: string): Promise<void> {
    try {
      await addDoc(collection(db, 'bookmarks'), {
        userId,
        postId,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error adding bookmark:', error);
      throw error;
    }
  },

  // 북마크 제거
  async removeBookmark(userId: string, postId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'bookmarks'),
        where('userId', '==', userId),
        where('postId', '==', postId)
      );

      const querySnapshot = await getDocs(q);

      querySnapshot.forEach(async (document) => {
        await deleteDoc(doc(db, 'bookmarks', document.id));
      });
    } catch (error) {
      console.error('Error removing bookmark:', error);
      throw error;
    }
  },

  // 사용자가 특정 포스트를 북마크했는지 확인
  async isBookmarkedByUser(userId: string, postId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'bookmarks'),
        where('userId', '==', userId),
        where('postId', '==', postId)
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking bookmark status:', error);
      return false;
    }
  },

  // 포스트의 총 북마크 수 가져오기
  async getBookmarkCount(postId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'bookmarks'),
        where('postId', '==', postId)
      );

      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      console.error('Error getting bookmark count:', error);
      return 0;
    }
  },

  // 사용자가 북마크한 포스트 ID들 가져오기
  async getBookmarkedPostIds(userId: string): Promise<string[]> {
    try {
      const q = query(
        collection(db, 'bookmarks'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data().postId);
    } catch (error) {
      console.error('Error getting bookmarked posts:', error);
      return [];
    }
  },

  // 포스트를 북마크한 사용자들 가져오기
  async getUsersWhoBookmarked(postId: string, limitCount: number = 10): Promise<string[]> {
    try {
      const q = query(
        collection(db, 'bookmarks'),
        where('postId', '==', postId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data().userId);
    } catch (error) {
      console.error('Error getting users who bookmarked:', error);
      return [];
    }
  },

  // 실시간 북마크 수 구독
  subscribeBookmarkCount(postId: string, callback: (count: number) => void): () => void {
    const q = query(
      collection(db, 'bookmarks'),
      where('postId', '==', postId)
    );

    return onSnapshot(q, (snapshot) => {
      callback(snapshot.size);
    }, (error) => {
      console.error('Error in bookmark count subscription:', error);
      callback(0);
    });
  },

  // 사용자의 북마크 상태 실시간 구독
  subscribeBookmarkStatus(userId: string, postId: string, callback: (isBookmarked: boolean) => void): () => void {
    const q = query(
      collection(db, 'bookmarks'),
      where('userId', '==', userId),
      where('postId', '==', postId)
    );

    return onSnapshot(q, (snapshot) => {
      callback(!snapshot.empty);
    }, (error) => {
      console.error('Error in bookmark status subscription:', error);
      callback(false);
    });
  }
};