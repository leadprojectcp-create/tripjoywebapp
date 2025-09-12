'use client';

import React from 'react';
import { UserData } from '../../auth/services/authService';
import styles from './page.module.css';

interface PostDetailHeaderProps {
  userInfo: UserData | null;
}

export const PostDetailHeader: React.FC<PostDetailHeaderProps> = ({ userInfo }) => {
  if (!userInfo) return null;

  return (
    <div className={styles.cardHeader}>
      <div className={styles.userInfo}>
        <div className={styles.userAvatar}>
          {userInfo.photoUrl ? (
            <img src={userInfo.photoUrl} alt={userInfo.name} />
          ) : (
            <span>{userInfo.name.charAt(0)}</span>
          )}
        </div>
        <div className={styles.userDetails}>
          <div className={styles.userName}>{userInfo.name}</div>
        </div>
      </div>
    </div>
  );
};
