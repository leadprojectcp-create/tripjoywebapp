'use client';

import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  getDoc,
  getDocs,
  query,
  where,
  collection,
  increment
} from 'firebase/firestore';
import { db } from './firebase';

// 팔로우 기능
export const followUser = async (followerId: string, followingId: string): Promise<boolean> => {
  try {
    console.log('👥 팔로우 시작:', { followerId, followingId });

    // 1. 팔로워(나)의 following 목록에 상대방 추가
    const followerDocRef = doc(db, 'users', followerId);
    await updateDoc(followerDocRef, {
      following: arrayUnion(followingId),
      followingCount: increment(1)
    });

    // 2. 팔로잉 대상(상대방)의 followers 목록에 나 추가
    const followingDocRef = doc(db, 'users', followingId);
    await updateDoc(followingDocRef, {
      followers: arrayUnion(followerId),
      followersCount: increment(1)
    });

    console.log('✅ 팔로우 완료');
    return true;
  } catch (error) {
    console.error('❌ 팔로우 실패:', error);
    return false;
  }
};

// 언팔로우 기능
export const unfollowUser = async (followerId: string, followingId: string): Promise<boolean> => {
  try {
    console.log('👥 언팔로우 시작:', { followerId, followingId });

    // 1. 팔로워(나)의 following 목록에서 상대방 제거
    const followerDocRef = doc(db, 'users', followerId);
    await updateDoc(followerDocRef, {
      following: arrayRemove(followingId),
      followingCount: increment(-1)
    });

    // 2. 팔로잉 대상(상대방)의 followers 목록에서 나 제거
    const followingDocRef = doc(db, 'users', followingId);
    await updateDoc(followingDocRef, {
      followers: arrayRemove(followerId),
      followersCount: increment(-1)
    });

    console.log('✅ 언팔로우 완료');
    return true;
  } catch (error) {
    console.error('❌ 언팔로우 실패:', error);
    return false;
  }
};

// 팔로우 상태 확인
export const isFollowing = async (followerId: string, followingId: string): Promise<boolean> => {
  try {
    const followerDocRef = doc(db, 'users', followerId);
    const followerDoc = await getDoc(followerDocRef);
    
    if (followerDoc.exists()) {
      const userData = followerDoc.data();
      const following = userData.following || [];
      return following.includes(followingId);
    }
    
    return false;
  } catch (error) {
    console.error('❌ 팔로우 상태 확인 실패:', error);
    return false;
  }
};

// 팔로워 목록 가져오기
export const getFollowers = async (userId: string): Promise<string[]> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.followers || [];
    }
    
    return [];
  } catch (error) {
    console.error('❌ 팔로워 목록 가져오기 실패:', error);
    return [];
  }
};

// 팔로잉 목록 가져오기
export const getFollowing = async (userId: string): Promise<string[]> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.following || [];
    }
    
    return [];
  } catch (error) {
    console.error('❌ 팔로잉 목록 가져오기 실패:', error);
    return [];
  }
};

// 팔로우 통계 가져오기
export const getFollowStats = async (userId: string): Promise<{ followersCount: number; followingCount: number }> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        followersCount: userData.followersCount || 0,
        followingCount: userData.followingCount || 0
      };
    }
    
    return { followersCount: 0, followingCount: 0 };
  } catch (error) {
    console.error('❌ 팔로우 통계 가져오기 실패:', error);
    return { followersCount: 0, followingCount: 0 };
  }
};

// 사용자 정보 타입
export interface UserInfo {
  id: string;
  name: string;
  photoUrl?: string;
}

// 팔로워 목록 가져오기
export const getFollowersList = async (userId: string): Promise<UserInfo[]> => {
  try {
    console.log('👥 팔로워 목록 조회:', userId);
    
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      console.error('사용자를 찾을 수 없습니다:', userId);
      return [];
    }
    
    const userData = userDoc.data();
    const followerIds = userData.followers || [];
    
    if (followerIds.length === 0) {
      console.log('팔로워가 없습니다.');
      return [];
    }
    
    // 팔로워들의 정보 조회
    const followersInfo: UserInfo[] = [];
    for (const followerId of followerIds) {
      try {
        const followerDoc = await getDoc(doc(db, 'users', followerId));
        if (followerDoc.exists()) {
          const followerData = followerDoc.data();
          followersInfo.push({
            id: followerId,
            name: followerData.name || '이름 없음',
            photoUrl: followerData.photoUrl
          });
        }
      } catch (error) {
        console.error('팔로워 정보 조회 실패:', followerId, error);
      }
    }
    
    console.log('✅ 팔로워 목록 조회 완료:', followersInfo.length, '명');
    return followersInfo;
  } catch (error) {
    console.error('팔로워 목록 조회 실패:', error);
    return [];
  }
};

// 팔로잉 목록 가져오기
export const getFollowingList = async (userId: string): Promise<UserInfo[]> => {
  try {
    console.log('👥 팔로잉 목록 조회:', userId);
    
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      console.error('사용자를 찾을 수 없습니다:', userId);
      return [];
    }
    
    const userData = userDoc.data();
    const followingIds = userData.following || [];
    
    if (followingIds.length === 0) {
      console.log('팔로잉이 없습니다.');
      return [];
    }
    
    // 팔로잉들의 정보 조회
    const followingInfo: UserInfo[] = [];
    for (const followingId of followingIds) {
      try {
        const followingDoc = await getDoc(doc(db, 'users', followingId));
        if (followingDoc.exists()) {
          const followingData = followingDoc.data();
          followingInfo.push({
            id: followingId,
            name: followingData.name || '이름 없음',
            photoUrl: followingData.photoUrl
          });
        }
      } catch (error) {
        console.error('팔로잉 정보 조회 실패:', followingId, error);
      }
    }
    
    console.log('✅ 팔로잉 목록 조회 완료:', followingInfo.length, '명');
    return followingInfo;
  } catch (error) {
    console.error('팔로잉 목록 조회 실패:', error);
    return [];
  }
};
