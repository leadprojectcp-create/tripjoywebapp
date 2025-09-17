'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import styles from './postcard.module.css';

interface MediaImage {
  url: string;
  isVideo?: boolean;
  thumbnail?: string;
}

interface PostMediaProps {
  images: MediaImage[];
  onClickImage?: () => void;
  aboveTheFold?: boolean;
}

export const PostMedia: React.FC<PostMediaProps> = ({ 
  images, 
  onClickImage,
  aboveTheFold = false
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showPauseButton, setShowPauseButton] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  // 모바일 체크
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 이전/다음 이미지 핸들러
  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  // 동영상 재생/일시정지 핸들러
  const handleVideoPlay = useCallback(() => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        // 재생 중이면 일시정지하고 일시정지 버튼을 잠시 보여줌
        videoRef.current.pause();
        setIsVideoPlaying(false);
        setShowPauseButton(true);
        setTimeout(() => setShowPauseButton(false), 1000); // 1초 후 숨김
      } else {
        // 일시정지 상태면 재생
        videoRef.current.play().catch((err: any) => {
          if (err?.name !== 'AbortError' && err?.name !== 'NotAllowedError') {
            console.error('Video play error:', err);
          }
        });
        setIsVideoPlaying(true);
        setShowPauseButton(false);
      }
    }
  }, [isVideoPlaying]);

  // 동영상 이벤트 핸들러
  const handleVideoEnded = useCallback(() => {
    setIsVideoPlaying(false);
  }, []);

  const handleVideoPause = useCallback(() => {
    setIsVideoPlaying(false);
  }, []);

  const handleVideoPlayEvent = useCallback(() => {
    setIsVideoPlaying(true);
  }, []);

  
  // 터치 이벤트 핸들러 (모바일용)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    setIsDragging(true);
    setTranslateX(0);
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    touchEndX.current = e.touches[0].clientX;
    const diff = touchEndX.current - touchStartX.current;
    
    // 실시간으로 이미지 이동
    setTranslateX(diff);
  }, [isDragging]);
  
  const handleTouchEnd = useCallback(() => {
    if (!touchStartX.current || !touchEndX.current) return;
    setIsDragging(false);
    
    const distance = touchStartX.current - touchEndX.current;
    const threshold = 50; // 스와이프 인식 임계값
    
    if (Math.abs(distance) > threshold) {
      if (distance > 0 && currentIndex < images.length - 1) {
        // 왼쪽으로 스와이프 (다음 이미지)
        setCurrentIndex(prev => prev + 1);
      } else if (distance < 0 && currentIndex > 0) {
        // 오른쪽으로 스와이프 (이전 이미지)
        setCurrentIndex(prev => prev - 1);
      }
    }
    
    // 원위치로 복귀
    setTranslateX(0);
    touchStartX.current = 0;
    touchEndX.current = 0;
  }, [currentIndex, images.length]);

  // HLS 동영상 초기화
  useEffect(() => {
    const currentImage = images[currentIndex];
    if (!currentImage?.isVideo || !videoRef.current) return;

    const videoEl = videoRef.current;
    const url = currentImage.url;
    
    // 이전 HLS 인스턴스 정리
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // 비디오 요소 초기화
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.load();

    const isHls = url.endsWith('.m3u8');

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({ maxBufferLength: 10 });
        hls.loadSource(url);
        hls.attachMedia(videoEl);
        hlsRef.current = hls;
      } else if (videoEl.canPlayType('application/vnd.apple.mpegURL')) {
        videoEl.src = url;
      }
    } else {
      videoEl.src = url;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentIndex, images]);

  if (!images || images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex];

  return (
    <div className={styles.singleMediaContainer}>
      {/* 이미지 표시 영역 */}
      <div 
        className={styles.singleMediaWrapper}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        ref={containerRef}
      >
        {/* 이미지 슬라이더 컨테이너 */}
        <div 
          className={styles.imageSlider}
          style={{
            transform: `translateX(calc(-${currentIndex * 100}% + ${translateX}px))`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          }}
        >
          {images.map((image, index) => (
            <div key={index} className={styles.slideItem}>
              {image.isVideo ? (
                <>
                  <video
                    ref={index === currentIndex ? videoRef : null}
                    className={styles.singleMediaImage}
                    poster={image.thumbnail ? `${image.thumbnail}?width=400&height=533&fit=cover&quality=100` : undefined}
                    onClick={handleVideoPlay}
                    onEnded={handleVideoEnded}
                    onPause={handleVideoPause}
                    onPlay={handleVideoPlayEvent}
                    controls={false}
                    preload="metadata"
                    draggable={false}
                    muted
                    playsInline
                  />
                  {/* 재생 버튼 - 일시정지 상태일 때만 표시 */}
                  {!isVideoPlaying && !showPauseButton && (
                    <button
                      className={styles.videoPlayButton}
                      onClick={handleVideoPlay}
                      aria-label="재생"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <polygon points="5,3 19,12 5,21" fill="white"/>
                      </svg>
                    </button>
                  )}
                  
                  {/* 일시정지 버튼 - 일시정지 시 잠시 표시 */}
                  {showPauseButton && (
                    <button
                      className={styles.videoPlayButton}
                      onClick={handleVideoPlay}
                      aria-label="일시정지"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <rect x="6" y="4" width="4" height="16" fill="white"/>
                        <rect x="14" y="4" width="4" height="16" fill="white"/>
                      </svg>
                    </button>
                  )}
                </>
              ) : (
                <img
                  src={`${image.url}?width=400&height=533&fit=cover&quality=100`}
                  alt={`게시물 이미지 ${index + 1}`}
                  className={styles.singleMediaImage}
                  loading={index === 0 && aboveTheFold ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={index === 0 && aboveTheFold ? 'high' : 'auto'}
                  onClick={onClickImage}
                  draggable={false}
                />
              )}
            </div>
          ))}
        </div>
        
        {/* 이미지 인디케이터 */}
        {images.length > 1 && (
          <div className={styles.imageIndicator}>
            <span>{currentIndex + 1} / {images.length}</span>
          </div>
        )}
      </div>
      
      {/* 이전/다음 버튼 (PC에서만, 이미지가 2개 이상일 때만) */}
      {!isMobile && images.length > 1 && (
        <>
          <button 
            className={`${styles.navButton} ${styles.navButtonLeft}`}
            onClick={handlePrevious}
            aria-label="이전 이미지"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <button 
            className={`${styles.navButton} ${styles.navButtonRight}`}
            onClick={handleNext}
            aria-label="다음 이미지"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </>
      )}
      
      {/* 하단 도트 인디케이터 (이미지가 2개 이상일 때만) */}
      {images.length > 1 && (
        <div className={styles.dotsContainer}>
          {images.map((_, index) => (
            <button
              key={index}
              className={`${styles.dot} ${index === currentIndex ? styles.dotActive : ''}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`이미지 ${index + 1}로 이동`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PostMedia;
