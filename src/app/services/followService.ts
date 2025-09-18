'use client';

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

export interface Follow {
  id?: string;
  followerId: string; // 팔로우하는 사람
  followingId: string; // 팔로우받는 사람
  createdAt: Timestamp;
}

const db = getFirebaseDb();

export const followService = {
  // 팔로우 추가
  async followUser(followerId: string, followingId: string): Promise<void> {
    try {
      console.log('👥 팔로우 시작:', { followerId, followingId });

      // 이미 팔로우 중인지 확인
      const isAlreadyFollowing = await this.isFollowing(followerId, followingId);
      if (isAlreadyFollowing) {
        console.log('⚠️ 이미 팔로우 중입니다.');
        return;
      }

      await addDoc(collection(db, 'follows'), {
        followerId,
        followingId,
        createdAt: Timestamp.now()
      });

      console.log('✅ 팔로우 완료');
    } catch (error) {
      console.error('❌ 팔로우 실패:', error);
      throw error;
    }
  },

  // 언팔로우
  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    try {
      console.log('👥 언팔로우 시작:', { followerId, followingId });

      const q = query(
        collection(db, 'follows'),
        where('followerId', '==', followerId),
        where('followingId', '==', followingId)
      );

      const querySnapshot = await getDocs(q);

      querySnapshot.forEach(async (document) => {
        await deleteDoc(doc(db, 'follows', document.id));
      });

      console.log('✅ 언팔로우 완료');
    } catch (error) {
      console.error('❌ 언팔로우 실패:', error);
      throw error;
    }
  },

  // 팔로우 여부 확인
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'follows'),
        where('followerId', '==', followerId),
        where('followingId', '==', followingId)
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  },

  // 팔로워 수 가져오기
  async getFollowersCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'follows'),
        where('followingId', '==', userId)
      );

      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      console.error('Error getting followers count:', error);
      return 0;
    }
  },

  // 팔로잉 수 가져오기
  async getFollowingCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'follows'),
        where('followerId', '==', userId)
      );

      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      console.error('Error getting following count:', error);
      return 0;
    }
  },

  // 팔로워 목록 가져오기
  async getFollowers(userId: string, limitCount: number = 50): Promise<string[]> {
    try {
      const q = query(
        collection(db, 'follows'),
        where('followingId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data().followerId);
    } catch (error) {
      console.error('Error getting followers:', error);
      return [];
    }
  },

  // 팔로잉 목록 가져오기
  async getFollowing(userId: string, limitCount: number = 50): Promise<string[]> {
    try {
      const q = query(
        collection(db, 'follows'),
        where('followerId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data().followingId);
    } catch (error) {
      console.error('Error getting following:', error);
      return [];
    }
  },

  // 실시간 팔로워 수 구독
  subscribeFollowersCount(userId: string, callback: (count: number) => void): () => void {
    const q = query(
      collection(db, 'follows'),
      where('followingId', '==', userId)
    );

    return onSnapshot(q, (snapshot) => {
      callback(snapshot.size);
    }, (error) => {
      console.error('Error in followers count subscription:', error);
      callback(0);
    });
  },

  // 실시간 팔로잉 수 구독
  subscribeFollowingCount(userId: string, callback: (count: number) => void): () => void {
    const q = query(
      collection(db, 'follows'),
      where('followerId', '==', userId)
    );

    return onSnapshot(q, (snapshot) => {
      callback(snapshot.size);
    }, (error) => {
      console.error('Error in following count subscription:', error);
      callback(0);
    });
  },

  // 실시간 팔로우 상태 구독
  subscribeFollowStatus(followerId: string, followingId: string, callback: (isFollowing: boolean) => void): () => void {
    const q = query(
      collection(db, 'follows'),
      where('followerId', '==', followerId),
      where('followingId', '==', followingId)
    );

    return onSnapshot(q, (snapshot) => {
      callback(!snapshot.empty);
    }, (error) => {
      console.error('Error in follow status subscription:', error);
      callback(false);
    });
  }
};

// 사용자 정보 인터페이스 (기존 호환성)
export interface UserInfo {
  id?: string; // 호환성을 위한 id 필드 추가
  uid: string;
  name: string;
  photoUrl?: string;
  location?: string;
  gender?: string;
  birthDate?: string;
}

// 팔로우 통계 인터페이스
export interface FollowStats {
  followerCount: number;
  followingCount: number;
}

// 호환성을 위한 기존 함수들 (boolean 반환하도록 래핑)
export const followUser = async (followerId: string, followingId: string): Promise<boolean> => {
  try {
    await followService.followUser(followerId, followingId);
    return true;
  } catch (error) {
    console.error('팔로우 실패:', error);
    return false;
  }
};

export const unfollowUser = async (followerId: string, followingId: string): Promise<boolean> => {
  try {
    await followService.unfollowUser(followerId, followingId);
    return true;
  } catch (error) {
    console.error('언팔로우 실패:', error);
    return false;
  }
};
export const isFollowing = followService.isFollowing.bind(followService);
export const getFollowersCount = followService.getFollowersCount.bind(followService);
export const getFollowingCount = followService.getFollowingCount.bind(followService);
export const getFollowers = followService.getFollowers.bind(followService);
export const getFollowing = followService.getFollowing.bind(followService);

// 기존 코드와의 호환성을 위한 추가 함수들
export const getFollowStats = async (userId: string): Promise<FollowStats> => {
  try {
    const [followerCount, followingCount] = await Promise.all([
      followService.getFollowersCount(userId),
      followService.getFollowingCount(userId)
    ]);

    return { followerCount, followingCount };
  } catch (error) {
    console.error('Error getting follow stats:', error);
    return { followerCount: 0, followingCount: 0 };
  }
};

export const getFollowersList = async (userId: string): Promise<UserInfo[]> => {
  try {
    const followerIds = await followService.getFollowers(userId);

    // 팔로워들의 사용자 정보 가져오기
    const { getUserData } = await import('../auth/services/authService');
    const followers = await Promise.all(
      followerIds.map(async (followerId) => {
        try {
          const userData = await getUserData(followerId);
          return {
            id: followerId, // 호환성을 위한 id 필드
            uid: followerId,
            name: userData?.name || '사용자',
            photoUrl: userData?.photoUrl,
            location: userData?.location,
            gender: userData?.gender,
            birthDate: userData?.birthDate
          } as UserInfo;
        } catch (error) {
          console.error(`Error fetching follower ${followerId}:`, error);
          return null;
        }
      })
    );

    return followers.filter(Boolean) as UserInfo[];
  } catch (error) {
    console.error('Error getting followers list:', error);
    return [];
  }
};

export const getFollowingList = async (userId: string): Promise<UserInfo[]> => {
  try {
    const followingIds = await followService.getFollowing(userId);

    // 팔로잉들의 사용자 정보 가져오기
    const { getUserData } = await import('../auth/services/authService');
    const following = await Promise.all(
      followingIds.map(async (followingId) => {
        try {
          const userData = await getUserData(followingId);
          return {
            id: followingId, // 호환성을 위한 id 필드
            uid: followingId,
            name: userData?.name || '사용자',
            photoUrl: userData?.photoUrl,
            location: userData?.location,
            gender: userData?.gender,
            birthDate: userData?.birthDate
          } as UserInfo;
        } catch (error) {
          console.error(`Error fetching following ${followingId}:`, error);
          return null;
        }
      })
    );

    return following.filter(Boolean) as UserInfo[];
  } catch (error) {
    console.error('Error getting following list:', error);
    return [];
  }
};