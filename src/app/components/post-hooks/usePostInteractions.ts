'use client';

import { likeService } from '../../services/likeService';
import { bookmarkService } from '../../services/bookmarkService';

export const toggleLike = async (postId: string, userId: string): Promise<{ isLiked: boolean; newCount: number }> => {
  try {
    const isCurrentlyLiked = await likeService.isLikedByUser(userId, postId);

    if (isCurrentlyLiked) {
      await likeService.removeLike(userId, postId);
    } else {
      await likeService.addLike(userId, postId);
    }

    const newCount = await likeService.getLikeCount(postId);
    return { isLiked: !isCurrentlyLiked, newCount };
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
};

export const checkLikeStatus = async (postId: string, userId: string): Promise<boolean> => {
  try {
    return await likeService.isLikedByUser(userId, postId);
  } catch (error) {
    console.error('Error checking like status:', error);
    return false;
  }
};

export const checkBookmarkStatus = async (postId: string, userId: string): Promise<boolean> => {
  try {
    return await bookmarkService.isBookmarkedByUser(userId, postId);
  } catch (error) {
    console.error('Error checking bookmark status:', error);
    return false;
  }
};

export const toggleBookmark = async (postId: string, userId: string): Promise<{ isBookmarked: boolean; newCount: number }> => {
  try {
    const isCurrentlyBookmarked = await bookmarkService.isBookmarkedByUser(userId, postId);

    if (isCurrentlyBookmarked) {
      await bookmarkService.removeBookmark(userId, postId);
    } else {
      await bookmarkService.addBookmark(userId, postId);
    }

    const newCount = await bookmarkService.getBookmarkCount(postId);
    return { isBookmarked: !isCurrentlyBookmarked, newCount };
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    throw error;
  }
};

export const getUserLikedPostIds = async (userId: string): Promise<string[]> => {
  try {
    return await likeService.getLikedPostIds(userId);
  } catch (error) {
    console.error('Error getting liked post IDs:', error);
    return [];
  }
};

export const getUserBookmarkedPostIds = async (userId: string): Promise<string[]> => {
  try {
    return await bookmarkService.getBookmarkedPostIds(userId);
  } catch (error) {
    console.error('Error getting bookmarked post IDs:', error);
    return [];
  }
};

export const getUserLikedPosts = async (userId: string): Promise<any[]> => {
  try {
    const likedPostIds = await getUserLikedPostIds(userId);
    if (likedPostIds.length === 0) return [];

    const { getPostById } = await import('../../services/postService');
    const posts = await Promise.all(
      likedPostIds.map(async (postId) => {
        try {
          return await getPostById(postId);
        } catch (error) {
          console.error(`Error fetching post ${postId}:`, error);
          return null;
        }
      })
    );

    return posts
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
  } catch (error) {
    console.error('Error getting liked posts:', error);
    return [];
  }
};

export const getUserBookmarkedPosts = async (userId: string): Promise<any[]> => {
  try {
    const bookmarkedPostIds = await getUserBookmarkedPostIds(userId);
    if (bookmarkedPostIds.length === 0) return [];

    const { getPostById } = await import('../../services/postService');
    const posts = await Promise.all(
      bookmarkedPostIds.map(async (postId) => {
        try {
          return await getPostById(postId);
        } catch (error) {
          console.error(`Error fetching post ${postId}:`, error);
          return null;
        }
      })
    );

    return posts
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
  } catch (error) {
    console.error('Error getting bookmarked posts:', error);
    return [];
  }
};