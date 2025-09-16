'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import styles from './PostCard.module.css';

interface MediaImage {
  url: string;
}

interface PostMediaProps {
  images: MediaImage[];
  onClickImage?: () => void;
  aboveTheFold?: boolean;
  gridCount?: number;
}

export const PostMedia: React.FC<PostMediaProps> = ({
  images,
  onClickImage,
  aboveTheFold = false,
  gridCount = 4
}) => {
  const imageUrls = useMemo(() => images.map(img => img.url), [images]);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  // PC에서 4개 이하일 때는 기존 그리드 사용
  if (!isMobile && imageUrls.length <= 4) {
    const items: (string | null)[] = [];
    for (let i = 0; i < gridCount; i++) {
      items.push(imageUrls[i] || null);
    }
    return (
      <div className={styles.mediaGrid}>
        {items.map((url, index) => (
          <div key={index} className={styles.mediaSlot}>
            {url ? (
              <img
                src={`${url}?width=308&fit=cover&quality=100`}
                alt={`게시물 이미지 ${index + 1}`}
                className={styles.mediaImage}
                loading={index < 1 && aboveTheFold ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={index < 1 && aboveTheFold ? 'high' : 'auto'}
                onClick={onClickImage}
                style={{ cursor: 'pointer' }}
              />
            ) : (
              <div className={styles.mediaPlaceholder} />
            )}
          </div>
        ))}
      </div>
    );
  }

  // 모바일이거나 PC에서 4개 초과일 때는 가로 스크롤
  return (
    <div style={{ 
      display: 'flex', 
      overflowX: 'auto', 
      overflowY: 'hidden',
      gap: '4px',
      width: isMobile ? 'calc(100vw - 16px)' : '100%',
      maxWidth: isMobile ? 'none' : '100%',
      WebkitOverflowScrolling: 'touch',
      msOverflowStyle: 'none',
      scrollbarWidth: 'none'
    }}>
      {imageUrls.map((imageUrl, index) => (
        <img 
          key={index}
          src={`${imageUrl}?width=308&fit=cover&quality=100`} 
          alt={`게시물 이미지 ${index + 1}`}
          loading="lazy"
          onClick={onClickImage}
          style={{ 
            cursor: 'pointer',
            flexShrink: 0,
            width: '154px',
            height: '205px',
            objectFit: 'cover',
            borderRadius: index === 0 ? '8px 0 0 8px' : index === imageUrls.length - 1 ? '0 8px 8px 0' : '0'
          }}
        />
      ))}
      {/* 빈 슬롯 추가 (4개 미만일 때) */}
      {imageUrls.length < 4 && Array.from({ length: 4 - imageUrls.length }).map((_, index) => (
        <div 
          key={`empty-${index}`}
          style={{
            flexShrink: 0,
            width: '154px',
            height: '205px',
            backgroundColor: '#f5f6f8',
            borderRadius: imageUrls.length + index === 3 ? '0 8px 8px 0' : '0'
          }}
        />
      ))}
    </div>
  );
};

export default PostMedia;