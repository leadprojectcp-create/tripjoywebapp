'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import styles from './PostCard.module.css';

interface MediaImage {
  url: string;
  isVideo?: boolean;
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
  
  // 모든 Hook을 조건문 전에 선언
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  
  const checkScrollButtons = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    }
  }, []);

  const handleScroll = useCallback((direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 312; // 154px * 2 + gap
      const currentScroll = scrollRef.current.scrollLeft;
      const newScroll = direction === 'left' 
        ? Math.max(0, currentScroll - scrollAmount)
        : currentScroll + scrollAmount;
      
      scrollRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    }
  }, []);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScrollButtons);
      checkScrollButtons();
      return () => scrollElement.removeEventListener('scroll', checkScrollButtons);
    }
  }, [checkScrollButtons]);

  // PC에서 4개 이하일 때는 그리드 사용
  if (!isMobile && images.length <= 4) {
    return (
      <div className={styles.mediaGrid}>
        {images.map((item, index) => (
          <div key={index} className={styles.mediaSlot}>
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <img
                src={`${item.url}?width=308&fit=cover&quality=100`}
                alt={`게시물 이미지 ${index + 1}`}
                className={styles.mediaImage}
                loading={index < 1 && aboveTheFold ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={index < 1 && aboveTheFold ? 'high' : 'auto'}
                onClick={onClickImage}
                style={{ cursor: 'pointer' }}
              />
              {item.isVideo && (
                <img
                  src="/icons/motion_play.svg"
                  alt="동영상"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '24px',
                    height: '24px',
                    zIndex: 1
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 모바일이거나 PC에서 4개 초과일 때는 가로 스크롤

  return (
    <div style={{ position: 'relative' }}>
      {!isMobile && images.length > 4 && canScrollLeft && (
        <button
          onClick={() => handleScroll('left')}
          style={{
            position: 'absolute',
            left: '-15px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #e0e0e0',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      {!isMobile && images.length > 4 && canScrollRight && (
        <button
          onClick={() => handleScroll('right')}
          style={{
            position: 'absolute',
            right: '-15px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #e0e0e0',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      <div 
        ref={scrollRef}
        style={{ 
          display: 'flex', 
          overflowX: 'auto', 
          overflowY: 'hidden',
          gap: '4px',
          width: isMobile ? 'calc(100vw - 16px)' : '100%',
          maxWidth: isMobile ? 'none' : '100%',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}
      >
        {images.map((item, index) => (
        <div key={index} style={{ position: 'relative', flexShrink: 0 }}>
          <img 
            src={`${item.url}?width=308&fit=cover&quality=100`} 
            alt={`게시물 이미지 ${index + 1}`}
            loading="lazy"
            onClick={onClickImage}
            style={{ 
              cursor: 'pointer',
              width: '154px',
              height: '205px',
              objectFit: 'cover',
              borderRadius: index === 0 ? '8px 0 0 8px' : index === images.length - 1 ? '0 8px 8px 0' : '0'
            }}
          />
          {item.isVideo && (
            <img
              src="/icons/motion_play.svg"
              alt="동영상"
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '24px',
                height: '24px',
                zIndex: 1
              }}
            />
          )}
        </div>
        ))}
      </div>
    </div>
  );
};

export default PostMedia;