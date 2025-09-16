'use client';

import React, { useCallback, useState } from 'react';

interface PostHeaderProps {
  styles: Record<string, string>; // CSS Module 객체를 그대로 전달
  post: any;
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
  translatePostLocation: (postLocation: any) => string;
}

export const PostHeader: React.FC<PostHeaderProps> = ({
  styles,
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
            {translatePostLocation(post?.location) && (
              <div className={styles.userLocation}>
                <img src="/icons/location_pin.svg" alt="위치" className={styles.locationIcon} />
                <span className={styles.locationText}>
                  {translatePostLocation(post.location)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {!showUserInfo && post?.location && (
        <div className={styles.headerPlaceName}>
          <img src="/assets/location.svg" alt="위치" className={styles.locationIcon} />
          {post.location.name}
        </div>
      )}

      {showSettings && (
        <div className={styles.settingsMenuContainer}>
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


