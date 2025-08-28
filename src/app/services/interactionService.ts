/**
 * 게시물 상호작용 서비스 (좋아요, 북마크) - posts 문서 내 맵 저장
 */

import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment, 
  serverTimestamp,
  deleteField
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * 게시물 좋아요 토글 - posts 문서 내 likedBy 맵 업데이트
 */
export const toggleLike = async (postId: string, userId: string): Promise<{ isLiked: boolean; newCount: number }> => {
  try {
    const postDocRef = doc(db, 'posts', postId);
    
    // 현재 게시물 데이터 가져오기
    const postDoc = await getDoc(postDocRef);
    if (!postDoc.exists()) {
      throw new Error('게시물을 찾을 수 없습니다.');
    }
    
    const postData = postDoc.data();
    const likedBy = postData?.likedBy || {};
    const isCurrentlyLiked = userId in likedBy;
    
    const userDocRef = doc(db, 'users_test', userId);
    const timestamp = serverTimestamp();
    
    if (isCurrentlyLiked) {
      // 좋아요 취소 - 양방향 제거
      await Promise.all([
        // 1. 게시물에서 사용자 제거
        updateDoc(postDocRef, {
          likeCount: increment(-1),
          [`likedBy.${userId}`]: deleteField()
        }),
        // 2. 사용자 문서에서 게시물 제거
        updateDoc(userDocRef, {
          [`likedPosts.${postId}`]: deleteField()
        })
      ]);
      
      // 업데이트된 카운트 가져오기
      const updatedPost = await getDoc(postDocRef);
      const newCount = updatedPost.data()?.likeCount || 0;
      
      return { isLiked: false, newCount };
    } else {
      // 좋아요 추가 - 양방향 추가
      await Promise.all([
        // 1. 게시물에 사용자 추가
        updateDoc(postDocRef, {
          likeCount: increment(1),
          [`likedBy.${userId}`]: timestamp
        }),
        // 2. 사용자 문서에 게시물 추가
        updateDoc(userDocRef, {
          [`likedPosts.${postId}`]: timestamp
        })
      ]);
      
      // 업데이트된 카운트 가져오기
      const updatedPost = await getDoc(postDocRef);
      const newCount = updatedPost.data()?.likeCount || 0;
      
      return { isLiked: true, newCount };
    }
  } catch (error) {
    console.error('좋아요 토글 실패:', error);
    throw error;
  }
};

/**
 * 게시물 북마크 토글 - posts 문서 내 bookmarkedBy 맵 업데이트
 */
export const toggleBookmark = async (postId: string, userId: string): Promise<{ isBookmarked: boolean; newCount: number }> => {
  try {
    const postDocRef = doc(db, 'posts', postId);
    
    // 현재 게시물 데이터 가져오기
    const postDoc = await getDoc(postDocRef);
    if (!postDoc.exists()) {
      throw new Error('게시물을 찾을 수 없습니다.');
    }
    
    const postData = postDoc.data();
    const bookmarkedBy = postData?.bookmarkedBy || {};
    const isCurrentlyBookmarked = userId in bookmarkedBy;
    
    const userDocRef = doc(db, 'users_test', userId);
    const timestamp = serverTimestamp();
    
    if (isCurrentlyBookmarked) {
      // 북마크 취소 - 양방향 제거
      await Promise.all([
        // 1. 게시물에서 사용자 제거
        updateDoc(postDocRef, {
          bookmarkCount: increment(-1),
          [`bookmarkedBy.${userId}`]: deleteField()
        }),
        // 2. 사용자 문서에서 게시물 제거
        updateDoc(userDocRef, {
          [`bookmarkedPosts.${postId}`]: deleteField()
        })
      ]);
      
      // 업데이트된 카운트 가져오기
      const updatedPost = await getDoc(postDocRef);
      const newCount = updatedPost.data()?.bookmarkCount || 0;
      
      return { isBookmarked: false, newCount };
    } else {
      // 북마크 추가 - 양방향 추가
      await Promise.all([
        // 1. 게시물에 사용자 추가
        updateDoc(postDocRef, {
          bookmarkCount: increment(1),
          [`bookmarkedBy.${userId}`]: timestamp
        }),
        // 2. 사용자 문서에 게시물 추가
        updateDoc(userDocRef, {
          [`bookmarkedPosts.${postId}`]: timestamp
        })
      ]);
      
      // 업데이트된 카운트 가져오기
      const updatedPost = await getDoc(postDocRef);
      const newCount = updatedPost.data()?.bookmarkCount || 0;
      
      return { isBookmarked: true, newCount };
    }
  } catch (error) {
    console.error('북마크 토글 실패:', error);
    throw error;
  }
};

/**
 * 사용자의 특정 게시물 좋아요 상태 확인
 */
export const checkLikeStatus = async (postId: string, userId: string): Promise<boolean> => {
  try {
    const postDocRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postDocRef);
    
    if (postDoc.exists()) {
      const postData = postDoc.data();
      const likedBy = postData?.likedBy || {};
      // null 값이 아닌 경우에만 좋아요 상태로 인정
      return userId in likedBy && likedBy[userId] !== null;
    }
    
    return false;
  } catch (error) {
    console.error('좋아요 상태 확인 실패:', error);
    return false;
  }
};

/**
 * 사용자의 특정 게시물 북마크 상태 확인
 */
export const checkBookmarkStatus = async (postId: string, userId: string): Promise<boolean> => {
  try {
    const postDocRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postDocRef);
    
    if (postDoc.exists()) {
      const postData = postDoc.data();
      const bookmarkedBy = postData?.bookmarkedBy || {};
      // null 값이 아닌 경우에만 북마크 상태로 인정
      return userId in bookmarkedBy && bookmarkedBy[userId] !== null;
    }
    
    return false;
  } catch (error) {
    console.error('북마크 상태 확인 실패:', error);
    return false;
  }
};

/**
 * 게시물의 좋아요한 사용자 목록과 타임스탬프 가져오기
 */
export const getPostLikedUsers = async (postId: string): Promise<{ [userId: string]: any }> => {
  try {
    const postDocRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postDocRef);
    
    if (postDoc.exists()) {
      const postData = postDoc.data();
      const likedBy = postData?.likedBy || {};
      // null 값 제거하여 반환
      const filteredLikedBy: { [userId: string]: any } = {};
      Object.keys(likedBy).forEach(userId => {
        if (likedBy[userId] !== null) {
          filteredLikedBy[userId] = likedBy[userId];
        }
      });
      return filteredLikedBy;
    }
    
    return {};
  } catch (error) {
    console.error('좋아요 사용자 목록 가져오기 실패:', error);
    return {};
  }
};

/**
 * 게시물의 북마크한 사용자 목록과 타임스탬프 가져오기
 */
export const getPostBookmarkedUsers = async (postId: string): Promise<{ [userId: string]: any }> => {
  try {
    const postDocRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postDocRef);
    
    if (postDoc.exists()) {
      const postData = postDoc.data();
      const bookmarkedBy = postData?.bookmarkedBy || {};
      // null 값 제거하여 반환
      const filteredBookmarkedBy: { [userId: string]: any } = {};
      Object.keys(bookmarkedBy).forEach(userId => {
        if (bookmarkedBy[userId] !== null) {
          filteredBookmarkedBy[userId] = bookmarkedBy[userId];
        }
      });
      return filteredBookmarkedBy;
    }
    
    return {};
  } catch (error) {
    console.error('북마크 사용자 목록 가져오기 실패:', error);
    return {};
  }
};

/**
 * 사용자가 좋아요한 게시물 목록 가져오기 (users_test 문서에서)
 */
export const getUserLikedPostIds = async (userId: string): Promise<string[]> => {
  try {
    const userDocRef = doc(db, 'users_test', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const likedPosts = userData?.likedPosts || {};
      // null 값 제거하고 postId만 반환
      return Object.keys(likedPosts).filter(postId => likedPosts[postId] !== null);
    }
    
    return [];
  } catch (error) {
    console.error('사용자 좋아요 게시물 목록 가져오기 실패:', error);
    return [];
  }
};

/**
 * 사용자가 북마크한 게시물 목록 가져오기 (users_test 문서에서)
 */
export const getUserBookmarkedPostIds = async (userId: string): Promise<string[]> => {
  try {
    const userDocRef = doc(db, 'users_test', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const bookmarkedPosts = userData?.bookmarkedPosts || {};
      // null 값 제거하고 postId만 반환
      return Object.keys(bookmarkedPosts).filter(postId => bookmarkedPosts[postId] !== null);
    }
    
    return [];
  } catch (error) {
    console.error('사용자 북마크 게시물 목록 가져오기 실패:', error);
    return [];
  }
};