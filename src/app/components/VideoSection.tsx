'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslationContext } from '../contexts/TranslationContext';
import { PostData } from '../services/postService';
import styles from './VideoSection.module.css';

interface VideoSectionProps {
  posts: PostData[];
  userInfoCache: Record<string, any>;
}

export const VideoSection: React.FC<VideoSectionProps> = ({ posts, userInfoCache }) => {
  const router = useRouter();
  const { t } = useTranslationContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // video 필드가 있는 게시물만 필터링 (최대 5개)
  const videoPosts = posts
    .filter(post => post.video && (post.video.urls?.thumbnail || post.video.url))
    .slice(0, 5);

  // 슬라이드 이동 함수
  const scrollToSlide = (index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const slideWidth = container.offsetWidth;
      container.scrollTo({
        left: slideWidth * index,
        behavior: 'smooth'
      });
    }
    setCurrentIndex(index);
  };

  // 다음 슬라이드
  const nextSlide = () => {
    if (currentIndex < videoPosts.length - 1) {
      scrollToSlide(currentIndex + 1);
    }
  };

  // 이전 슬라이드
  const prevSlide = () => {
    if (currentIndex > 0) {
      scrollToSlide(currentIndex - 1);
    }
  };

  // 게시물 클릭 핸들러
  const handlePostClick = (postId: string | undefined) => {
    if (postId) {
      // 비디오 게시물의 인덱스 찾기
      const videoIndex = videoPosts.findIndex(post => post.id === postId);
      if (videoIndex !== -1) {
        router.push(`/shorts?index=${videoIndex}`);
      }
    }
  };

  // 비디오 썸네일 URL 생성
  const getVideoThumbnail = (post: PostData) => {
    if (post.video?.urls?.thumbnail) {
      return `${post.video.urls.thumbnail}?tr=w-320,h-480,c-maintain_ratio`;
    }
    return post.video?.url || '';
  };

  // 마우스 오버 핸들러
  const handleMouseEnter = (postId: string | undefined) => {
    if (postId) {
      setHoveredVideo(postId);
    }
  };

  const handleMouseLeave = () => {
    setHoveredVideo(null);
  };

  // 비디오 ref 관리
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  // 비디오 재생/정지 제어
  useEffect(() => {
    Object.keys(videoRefs.current).forEach(postId => {
      const video = videoRefs.current[postId];
      if (video) {
        if (hoveredVideo === postId) {
          if (video.paused) {
            video.play().catch(() => {});
          }
        } else {
          if (!video.paused) {
            video.pause();
          }
          video.currentTime = 0;
        }
      }
    });
  }, [hoveredVideo]);

  // 동영상이 없으면 렌더링하지 않음
  if (videoPosts.length === 0) {
    return null;
  }

  return (
    <div className={styles.videoSection}>
      <h2 className={styles.sectionTitle}>
        <img src="/icons/play.svg" alt="동영상" width="24" height="24" />
        {t('localRecommendedTripPlay')}
      </h2>
      
      <div className={styles.videoContainer}>
        <div 
          ref={scrollContainerRef}
          className={styles.videoScrollContainer}
        >
          {videoPosts.map((post, index) => (
            <div 
              key={post.id}
              className={styles.videoCard}
              onClick={() => handlePostClick(post.id)}
              onMouseEnter={() => handleMouseEnter(post.id)}
              onMouseLeave={handleMouseLeave}
            >
              <div className={styles.videoWrapper}>
                <video 
                  ref={(el) => {
                    if (post.id) {
                      videoRefs.current[post.id] = el;
                    }
                  }}
                  className={styles.video}
                  poster={getVideoThumbnail(post)}
                  preload="none"
                  muted
                  loop
                  playsInline
                >
                  <source src={post.video?.urls?.original || post.video?.url} type="video/mp4" />
                  <source src={post.video?.urls?.original || post.video?.url} type="video/webm" />
                  <source src={post.video?.urls?.original || post.video?.url} type="video/ogg" />
                  브라우저가 동영상을 지원하지 않습니다.
                </video>
                {hoveredVideo !== post.id && (
                  <div className={styles.playButton}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 네비게이션 버튼 */}
        {videoPosts.length > 1 && (
          <>
            <button 
              className={`${styles.navButton} ${styles.prevButton}`}
              onClick={prevSlide}
              disabled={currentIndex === 0}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
            
            <button 
              className={`${styles.navButton} ${styles.nextButton}`}
              onClick={nextSlide}
              disabled={currentIndex === videoPosts.length - 1}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
              </svg>
            </button>
          </>
        )}

        {/* 인디케이터 */}
        {videoPosts.length > 1 && (
          <div className={styles.indicators}>
            {videoPosts.map((_, index) => (
              <button
                key={index}
                className={`${styles.indicator} ${index === currentIndex ? styles.active : ''}`}
                onClick={() => scrollToSlide(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
