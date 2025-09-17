import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  parentId?: string; // 대댓글 기능을 위한 필드
}

export interface CommentInput {
  postId: string;
  userId: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  parentId?: string;
}

// 댓글 추가
export const addComment = async (comment: CommentInput): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'comments'), {
      ...comment,
      createdAt: comment.createdAt || Date.now(),
      updatedAt: comment.updatedAt || Date.now()
    });
    
    // 포스트의 댓글 수 업데이트
    await updatePostCommentCount(comment.postId, 1);
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

// 댓글 목록 가져오기
export const getComments = async (postId: string): Promise<Comment[]> => {
  try {
    const q = query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const comments: Comment[] = [];
    
    querySnapshot.forEach((doc) => {
      comments.push({
        id: doc.id,
        ...doc.data()
      } as Comment);
    });
    
    return comments;
  } catch (error) {
    console.error('Error getting comments:', error);
    throw error;
  }
};

// 댓글 삭제
export const deleteComment = async (commentId: string): Promise<void> => {
  try {
    // 댓글 정보 가져오기
    const commentDoc = await getDoc(doc(db, 'comments', commentId));
    if (!commentDoc.exists()) {
      throw new Error('Comment not found');
    }
    
    const commentData = commentDoc.data();
    
    // 댓글 삭제
    await deleteDoc(doc(db, 'comments', commentId));
    
    // 포스트의 댓글 수 감소
    if (commentData?.postId) {
      await updatePostCommentCount(commentData.postId, -1);
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

// 댓글 수정
export const updateComment = async (
  commentId: string, 
  updates: Partial<Comment>
): Promise<void> => {
  try {
    const commentRef = doc(db, 'comments', commentId);
    await updateDoc(commentRef, {
      ...updates,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    throw error;
  }
};

// 특정 사용자의 댓글 가져오기
export const getUserComments = async (userId: string): Promise<Comment[]> => {
  try {
    const q = query(
      collection(db, 'comments'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const comments: Comment[] = [];
    
    querySnapshot.forEach((doc) => {
      comments.push({
        id: doc.id,
        ...doc.data()
      } as Comment);
    });
    
    return comments;
  } catch (error) {
    console.error('Error getting user comments:', error);
    throw error;
  }
};

// 댓글 수 가져오기
export const getCommentCount = async (postId: string): Promise<number> => {
  try {
    const q = query(
      collection(db, 'comments'),
      where('postId', '==', postId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting comment count:', error);
    return 0;
  }
};

// 포스트의 댓글 수 업데이트 (내부 함수)
const updatePostCommentCount = async (postId: string, increment: number): Promise<void> => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);
    
    if (postDoc.exists()) {
      const currentCount = postDoc.data()?.comments || 0;
      const newCount = Math.max(0, currentCount + increment);
      
      await updateDoc(postRef, {
        comments: newCount
      });
    }
  } catch (error) {
    console.error('Error updating post comment count:', error);
    // 에러가 발생해도 댓글 작업은 계속 진행
  }
};

// 대댓글 가져오기
export const getReplies = async (parentId: string): Promise<Comment[]> => {
  try {
    const q = query(
      collection(db, 'comments'),
      where('parentId', '==', parentId),
      orderBy('createdAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    const replies: Comment[] = [];
    
    querySnapshot.forEach((doc) => {
      replies.push({
        id: doc.id,
        ...doc.data()
      } as Comment);
    });
    
    return replies;
  } catch (error) {
    console.error('Error getting replies:', error);
    throw error;
  }
};
