/**
 * 알림 서비스 - 내 포스트에 좋아요/북마크한 사용자들 정보
 */

import { 
  doc, 
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit as firestoreLimit
} from 'firebase/firestore';
import { db } from './firebase';
import { PostData } from './postService';

export interface AlertItem {
  id: string;
  type: 'like' | 'bookmark';
  userId: string;
  userName: string;
  userProfileImage?: string;
  postId: string;
  postContent: string;
  postImage?: string;
  timestamp: any;
  isRead: boolean;
}

export interface UserInfo {
  id: string;
  name: string;
  profileImage?: string;
}

/**
 * 사용자 정보 가져오기
 */
const getUserInfo = async (userId: string): Promise<UserInfo | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        id: userId,
        name: userData.name || userData.displayName || '익명',
        profileImage: userData.profileImage || userData.photoURL
      };
    }
    return null;
  } catch (error) {
    console.error('사용자 정보 가져오기 실패:', error);
    return null;
  }
};

/**
 * 내 포스트들 가져오기
 */
const getMyPosts = async (userId: string): Promise<PostData[]> => {
  try {
    const q = query(
      collection(db, 'posts'),
      where('userId', '==', userId),
      where('isVisible', '==', true),
      orderBy('createdAt', 'desc'),
      firestoreLimit(50)
    );

    const querySnapshot = await getDocs(q);
    const posts: PostData[] = [];

    querySnapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data(),
      } as PostData);
    });

    return posts;
  } catch (error) {
    console.error('내 포스트 가져오기 실패:', error);
    return [];
  }
};

/**
 * 내 포스트에 대한 좋아요/북마크 알림들 가져오기
 */
export const getMyPostAlerts = async (userId: string): Promise<AlertItem[]> => {
  try {
    console.log('📢 알림 목록 가져오기 시작:', userId);

    const alerts: AlertItem[] = [];
    const myPosts = await getMyPosts(userId);

    console.log('📋 내 포스트 수:', myPosts.length);

    for (const post of myPosts) {
      if (!post.id) continue;

      const likedBy = post.likedBy || {};
      const bookmarkedBy = post.bookmarkedBy || {};

      for (const [likedUserId, timestamp] of Object.entries(likedBy)) {
        if (likedUserId === userId || !timestamp) continue;

        const userInfo = await getUserInfo(likedUserId);
        if (!userInfo) continue;

        alerts.push({
          id: `like_${post.id}_${likedUserId}`,
          type: 'like',
          userId: likedUserId,
          userName: userInfo.name,
          userProfileImage: userInfo.profileImage,
          postId: post.id,
          postContent: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
          postImage: post.images?.[0]?.urls?.thumbnail || post.images?.[0]?.url,
          timestamp,
          isRead: false
        });
      }

      for (const [bookmarkedUserId, timestamp] of Object.entries(bookmarkedBy)) {
        if (bookmarkedUserId === userId || !timestamp) continue;

        const userInfo = await getUserInfo(bookmarkedUserId);
        if (!userInfo) continue;

        alerts.push({
          id: `bookmark_${post.id}_${bookmarkedUserId}`,
          type: 'bookmark',
          userId: bookmarkedUserId,
          userName: userInfo.name,
          userProfileImage: userInfo.profileImage,
          postId: post.id,
          postContent: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
          postImage: post.images?.[0]?.urls?.thumbnail || post.images?.[0]?.url,
          timestamp,
          isRead: false
        });
      }
    }

    alerts.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      
      const aTime = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
      const bTime = b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
      
      return bTime.getTime() - aTime.getTime();
    });

    console.log('✅ 알림 목록 가져오기 완료:', alerts.length, '개');
    return alerts.slice(0, 100);

  } catch (error) {
    console.error('❌ 알림 목록 가져오기 실패:', error);
    return [];
  }
};

/**
 * 시간 포맷 유틸리티
 */
export const formatAlertTime = (timestamp: any): string => {
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return '방금 전';
    if (diffMinutes < 60) return `${diffMinutes}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    
    return date.toLocaleDateString('ko-KR');
  } catch (error) {
    return '알 수 없음';
  }
};
