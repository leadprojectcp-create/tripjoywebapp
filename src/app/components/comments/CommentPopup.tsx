'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTranslationContext } from '../../contexts/TranslationContext';
import { 
  addComment, 
  getComments, 
  deleteComment, 
  updateComment,
  Comment 
} from '../../services/commentService';
import { getUserById } from '../../auth/services/authService';
import { translateText, LANGUAGE_CODES, LanguageCode } from '../../services/translateService';
import styles from './CommentPopup.module.css';

interface CommentPopupProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onCommentCountUpdate?: (count: number) => void;
}

interface CommentWithUser {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  parentId?: string;
  userName?: string;
  userProfileImage?: string;
  isTranslated?: boolean;
  translatedContent?: string;
}

export const CommentPopup: React.FC<CommentPopupProps> = ({ 
  postId, 
  isOpen, 
  onClose,
  onCommentCountUpdate 
}) => {
  const { user } = useAuthContext();
  const { t, currentLanguage } = useTranslationContext();
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [translatingCommentId, setTranslatingCommentId] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 댓글 목록 불러오기
  useEffect(() => {
    if (isOpen && postId) {
      loadComments();
    }
  }, [isOpen, postId]);

  // 팝업 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const fetchedComments = await getComments(postId);
      
      // 각 댓글의 사용자 정보 가져오기
      const commentsWithUsers = await Promise.all(
        fetchedComments.map(async (comment: Comment) => {
          try {
            const userInfo = await getUserById(comment.userId);
            return {
              ...comment,
              userName: userInfo?.name || 'Unknown User',
              userProfileImage: userInfo?.photoUrl
            };
          } catch (error) {
            return {
              ...comment,
              userName: 'Unknown User'
            };
          }
        })
      );

      setComments(commentsWithUsers);
      onCommentCountUpdate?.(commentsWithUsers.length);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      await addComment({
        postId,
        userId: user.uid,
        content: newComment.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      setNewComment('');
      await loadComments();
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert(t('commentErrorSubmit'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm(t('commentConfirmDelete'))) return;

    try {
      await deleteComment(commentId);
      await loadComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert(t('commentErrorDelete'));
    }
  };

  const handleEditComment = (comment: CommentWithUser) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  const handleUpdateComment = async () => {
    if (!editingCommentId || !editingContent.trim()) return;

    try {
      await updateComment(editingCommentId, {
        content: editingContent.trim(),
        updatedAt: Date.now()
      });
      
      setEditingCommentId(null);
      setEditingContent('');
      await loadComments();
    } catch (error) {
      console.error('Failed to update comment:', error);
      alert(t('commentErrorUpdate'));
    }
  };

  const handleTranslateComment = async (comment: CommentWithUser) => {
    if (comment.isTranslated) {
      // 원문으로 되돌리기
      setComments(prevComments => 
        prevComments.map(c => 
          c.id === comment.id 
            ? { ...c, isTranslated: false, translatedContent: '' }
            : c
        )
      );
      return;
    }

    // 번역하기
    setTranslatingCommentId(comment.id);
    try {
      const targetLanguage = currentLanguage;
      const translated = await translateText(
        comment.content,
        LANGUAGE_CODES[targetLanguage as LanguageCode]
      );
      
      setComments(prevComments => 
        prevComments.map(c => 
          c.id === comment.id 
            ? { ...c, isTranslated: true, translatedContent: translated }
            : c
        )
      );
    } catch (error) {
      console.error('번역 실패:', error);
      alert('번역 중 오류가 발생했습니다.');
    } finally {
      setTranslatingCommentId(null);
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('commentJustNow');
    if (minutes < 60) return t('commentMinutesAgo').replace('{{count}}', minutes.toString());
    if (hours < 24) return t('commentHoursAgo').replace('{{count}}', hours.toString());
    if (days < 7) return t('commentDaysAgo').replace('{{count}}', days.toString());
    
    return new Date(timestamp).toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.popup} ref={popupRef}>
        <div className={styles.header}>
          <h3>{t('commentTitle')}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <img src="/icons/close_md.svg" alt="Close" width="24" height="24" />
          </button>
        </div>

        <div className={styles.commentsList}>
          {loading ? (
            <div className={styles.loading}>{t('commentLoading')}</div>
          ) : comments.length === 0 ? (
            <div className={styles.empty}>{t('commentEmpty')}</div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className={styles.commentItem}>
                <div className={styles.commentHeader}>
                  <div className={styles.userInfo}>
                    {comment.userProfileImage ? (
                      <img 
                        src={comment.userProfileImage} 
                        alt={comment.userName} 
                        className={styles.userAvatar}
                      />
                    ) : (
                      <div className={styles.userAvatarPlaceholder}>
                        {comment.userName?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className={styles.userName}>{comment.userName}</span>
                    <span className={styles.commentTime}>
                      {formatTime(comment.createdAt)}
                    </span>
                  </div>
                  
                  {user?.uid === comment.userId && (
                    <div className={styles.commentActions}>
                      <button 
                        onClick={() => handleEditComment(comment)}
                        className={styles.editBtn}
                      >
                        {t('commentEdit')}
                      </button>
                      <button 
                        onClick={() => handleDeleteComment(comment.id)}
                        className={styles.deleteBtn}
                      >
                        {t('commentDelete')}
                      </button>
                    </div>
                  )}
                </div>

                {editingCommentId === comment.id ? (
                  <div className={styles.editingArea}>
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className={styles.editInput}
                      rows={3}
                    />
                    <div className={styles.editActions}>
                      <button 
                        onClick={handleUpdateComment}
                        className={styles.saveBtn}
                      >
                        {t('commentSave')}
                      </button>
                      <button 
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditingContent('');
                        }}
                        className={styles.cancelBtn}
                      >
                        {t('commentCancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className={styles.commentContent}>
                      {comment.isTranslated && comment.translatedContent 
                        ? comment.translatedContent 
                        : comment.content}
                    </p>
                    <button
                      className={styles.translateBtn}
                      onClick={() => handleTranslateComment(comment)}
                      disabled={translatingCommentId === comment.id}
                    >
                      {translatingCommentId === comment.id 
                        ? t('translating')
                        : comment.isTranslated 
                          ? t('showOriginal')
                          : t('translate')
                      }
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {user ? (
          <div className={styles.inputArea}>
            <textarea
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t('commentPlaceholder')}
              className={styles.commentInput}
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
            />
            <button 
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
              className={styles.submitBtn}
            >
              {submitting ? t('commentSubmitting') : t('commentSubmit')}
            </button>
          </div>
        ) : (
          <div className={styles.loginPrompt}>
            {t('commentLoginRequired')}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentPopup;
