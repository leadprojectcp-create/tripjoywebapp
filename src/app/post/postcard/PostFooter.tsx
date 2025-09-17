'use client';

import React from 'react';
import styles from './postcard.module.css';

interface PostFooterProps {
  isLiked: boolean;
  likesCount: number;
  commentsCount?: number;
  isLoading?: boolean;
  showShareMenu: boolean;
  onToggleLike: () => void;
  onToggleShare: () => void;
  onToggleComment?: () => void;
  onShare: (type: 'copy' | 'facebook' | 'twitter' | 'whatsapp') => void;
}

export const PostFooter: React.FC<PostFooterProps> = ({
  isLiked,
  likesCount,
  commentsCount = 0,
  isLoading = false,
  showShareMenu,
  onToggleLike,
  onToggleShare,
  onToggleComment,
  onShare
}) => {
  return (
    <div className={styles.cardFooter}>
      <div className={styles.actionButtonsRow}>
        <button 
          className={`${styles.actionBtn} ${isLiked ? styles.liked : ''}`}
          onClick={onToggleLike}
          disabled={isLoading}
        >
          <span className={styles.actionIcon}>
            <img 
              src={isLiked ? "/icons/like_active.svg" : "/icons/like.svg"} 
              alt={isLiked ? "좋아요 취소" : "좋아요"}
              width="20"
              height="20"
            />
          </span>
          <span className={styles.actionCount}>{likesCount}</span>
        </button>

        <button 
          className={styles.actionBtn}
          onClick={onToggleComment}
        >
          <span className={styles.actionIcon}>
            <img 
              src="/icons/comment.svg" 
              alt="댓글"
              width="20"
              height="20"
            />
          </span>
          <span className={styles.actionCount}>{commentsCount}</span>
        </button>

        <button 
          className={`${styles.actionBtn} ${styles.shareBtn} ${showShareMenu ? styles.active : ''}`}
          onClick={onToggleShare}
        >
          <span className={styles.actionIcon}>
            <img 
              src={showShareMenu ? "/icons/share_active.svg" : "/icons/share.svg"} 
              alt="공유하기"
              width="20"
              height="20"
            />
          </span>
        </button>
      </div>

      {showShareMenu && (
        <div className={styles.shareMenu}>
          <button onClick={() => onShare('copy')} className={styles.shareOption}>📋 링크 복사</button>
          <button onClick={() => onShare('facebook')} className={styles.shareOption}>📘 Facebook</button>
          <button onClick={() => onShare('twitter')} className={styles.shareOption}>🐦 Twitter</button>
          <button onClick={() => onShare('whatsapp')} className={styles.shareOption}>📱 WhatsApp</button>
        </div>
      )}

    </div>
  );
};

export default PostFooter;
