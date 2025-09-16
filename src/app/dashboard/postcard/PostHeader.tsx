'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { PostData } from '../../services/postService';
import styles from './PostCard.module.css';

interface PostHeaderProps {
  post: PostData;
  userInfo?: {
    name: string;
    location: string;
    profileImage?: string;
    photoUrl?: string;
  };
  showUserInfo?: boolean;
  showSettings?: boolean;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onProfileClick?: () => void;
  translatePostLocation: () => string;
}

export const PostHeader: React.FC<PostHeaderProps> = ({
  post,
  userInfo = { name: '사용자', location: '위치 미상' },
  showUserInfo = true,
  showSettings = false,
  onEdit,
  onDelete,
  onProfileClick,
  translatePostLocation
}) => {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSettingsToggle = useCallback(() => {
    setShowSettingsMenu(prev => !prev);
  }, []);

  const handleEditClick = useCallback(() => {
    setShowSettingsMenu(false);
    if (onEdit && post?.id) onEdit(post.id);
  }, [onEdit, post?.id]);

  const handleDeleteClick = useCallback(() => {
    setShowSettingsMenu(false);
    if (onDelete && post?.id) onDelete(post.id);
  }, [onDelete, post?.id]);

  return (
    <div className={styles.cardHeader}>
      {showUserInfo && (
        <div className={styles.userInfo} onClick={onProfileClick} style={{ cursor: 'pointer' }}>
          <div className={styles.userAvatar}>
            {userInfo.photoUrl || userInfo.profileImage ? (
              <img src={userInfo.photoUrl || userInfo.profileImage} alt={userInfo.name} />
            ) : (
              <span>{userInfo.name.charAt(0)}</span>
            )}
          </div>
          <div className={styles.userDetails}>
            <div className={styles.userName}>{userInfo.name}</div>
            {translatePostLocation() && (
              <div className={styles.userLocation}>
                <svg className={styles.locationIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <span className={styles.locationText}>{translatePostLocation()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {!showUserInfo && post?.location && (
        <div className={styles.headerPlaceName}>
          <svg className={styles.locationIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          {post.location.name}
        </div>
      )}

      {showSettings && (
        <div className={styles.settingsMenuContainer} ref={settingsRef}>
          <button 
            className={styles.settingsBtn}
            onClick={handleSettingsToggle}
            title="설정"
          >
            ⋯
          </button>
          {showSettingsMenu && (
            <div className={styles.settingsDropdown}>
              <button className={styles.settingsOption} onClick={handleEditClick}>
                수정하기
              </button>
              <button className={`${styles.settingsOption} ${styles.delete}`} onClick={handleDeleteClick}>
                삭제하기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PostHeader;