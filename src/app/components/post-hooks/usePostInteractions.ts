'use client';

import { doc, getDoc, updateDoc, increment, serverTimestamp, deleteField } from 'firebase/firestore';
import { db } from '../../services/firebase';

export const toggleLike = async (postId: string, userId: string): Promise<{ isLiked: boolean; newCount: number }> => {
  const postDocRef = doc(db, 'posts', postId);
  const postDoc = await getDoc(postDocRef);
  if (!postDoc.exists()) throw new Error('게시물을 찾을 수 없습니다.');
  const likedBy = (postDoc.data()?.likedBy || {}) as Record<string, any>;
  const isCurrentlyLiked = userId in likedBy;
  const userDocRef = doc(db, 'users', userId);
  const ts = serverTimestamp();
  if (isCurrentlyLiked) {
    await Promise.all([
      updateDoc(postDocRef, { likeCount: increment(-1), [`likedBy.${userId}`]: deleteField() }),
      updateDoc(userDocRef, { [`likedPosts.${postId}`]: deleteField() })
    ]);
  } else {
    await Promise.all([
      updateDoc(postDocRef, { likeCount: increment(1), [`likedBy.${userId}`]: ts }),
      updateDoc(userDocRef, { [`likedPosts.${postId}`]: ts })
    ]);
  }
  const updated = await getDoc(postDocRef);
  return { isLiked: !isCurrentlyLiked, newCount: updated.data()?.likeCount || 0 };
};

export const checkLikeStatus = async (postId: string, userId: string): Promise<boolean> => {
  const postDocRef = doc(db, 'posts', postId);
  const postDoc = await getDoc(postDocRef);
  if (!postDoc.exists()) return false;
  const likedBy = (postDoc.data()?.likedBy || {}) as Record<string, any>;
  return userId in likedBy && likedBy[userId] !== null;
};

export const checkBookmarkStatus = async (postId: string, userId: string): Promise<boolean> => {
  const postDocRef = doc(db, 'posts', postId);
  const postDoc = await getDoc(postDocRef);
  if (!postDoc.exists()) return false;
  const bookmarkedBy = (postDoc.data()?.bookmarkedBy || {}) as Record<string, any>;
  return userId in bookmarkedBy && bookmarkedBy[userId] !== null;
};

export const toggleBookmark = async (postId: string, userId: string): Promise<{ isBookmarked: boolean; newCount: number }> => {
  const postDocRef = doc(db, 'posts', postId);
  const postDoc = await getDoc(postDocRef);
  if (!postDoc.exists()) throw new Error('게시물을 찾을 수 없습니다.');
  const bookmarkedBy = (postDoc.data()?.bookmarkedBy || {}) as Record<string, any>;
  const isCurrentlyBookmarked = userId in bookmarkedBy;
  const userDocRef = doc(db, 'users', userId);
  const ts = serverTimestamp();
  if (isCurrentlyBookmarked) {
    await Promise.all([
      updateDoc(postDocRef, { bookmarkCount: increment(-1), [`bookmarkedBy.${userId}`]: deleteField() }),
      updateDoc(userDocRef, { [`bookmarkedPosts.${postId}`]: deleteField() })
    ]);
  } else {
    await Promise.all([
      updateDoc(postDocRef, { bookmarkCount: increment(1), [`bookmarkedBy.${userId}`]: ts }),
      updateDoc(userDocRef, { [`bookmarkedPosts.${postId}`]: ts })
    ]);
  }
  const updated = await getDoc(postDocRef);
  return { isBookmarked: !isCurrentlyBookmarked, newCount: updated.data()?.bookmarkCount || 0 };
};

export const getUserLikedPostIds = async (userId: string): Promise<string[]> => {
  const userDocRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userDocRef);
  if (!userDoc.exists()) return [];
  const likedPosts = (userDoc.data()?.likedPosts || {}) as Record<string, any>;
  return Object.keys(likedPosts).filter((postId) => likedPosts[postId] !== null);
};

export const getUserLikedPosts = async (userId: string): Promise<any[]> => {
  const likedPostIds = await getUserLikedPostIds(userId);
  if (likedPostIds.length === 0) return [];
  const posts = await Promise.all(
    likedPostIds.map(async (postId) => {
      const postDocRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postDocRef);
      if (postDoc.exists()) {
        return { id: postDoc.id, ...postDoc.data() } as any;
      }
      return null;
    })
  );
  return posts
    .filter(Boolean)
    .sort((a: any, b: any) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
};


