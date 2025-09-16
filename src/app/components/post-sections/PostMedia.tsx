'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';

interface ImageItem {
  url: string;
}

interface VideoItem {
  url: string;
  thumbnail?: string;
}

interface PostMediaProps {
  styles: Record<string, string>;
  images?: ImageItem[];
  video?: VideoItem | null;
  onClickImage?: () => void;
  aboveTheFold?: boolean;
}

export const PostMedia: React.FC<PostMediaProps> = ({
  styles,
  images = [],
  video = null,
  onClickImage,
  aboveTheFold = false
}) => {
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [sliderState, setSliderState] = useState({ canScrollLeft: false, canScrollRight: true });
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const imageUrls = useMemo(() => images.map(img => img.url), [images]);

  const checkScrollPosition = useCallback(() => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setSliderState({
      canScrollLeft: scrollLeft > 0,
      canScrollRight: scrollLeft < scrollWidth - clientWidth - 1
    });
  }, []);

  useEffect(() => {
    checkScrollPosition();
  }, [checkScrollPosition, imageUrls.length]);

  const scrollSlider = useCallback((direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const containerWidth = sliderRef.current.offsetWidth;
    const scrollAmount = containerWidth;
    const currentScroll = sliderRef.current.scrollLeft;
    const targetScroll = direction === 'left' ? currentScroll - scrollAmount : currentScroll + scrollAmount;
    sliderRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    setTimeout(checkScrollPosition, 300);
  }, [checkScrollPosition]);

  if (video && imageUrls.length === 0) {
    // 비디오만 있는 경우 (상세용 기본 형태)
    const poster = video.thumbnail || video.url;
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
      const el = videoRef.current;
      if (!el || !video?.url) return;
      let hls: Hls | null = null;
      const isHls = video.url.endsWith('.m3u8');
      if (isHls) {
        if (Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(video.url);
          hls.attachMedia(el);
        } else if (el.canPlayType('application/vnd.apple.mpegURL')) {
          el.src = video.url;
        }
      } else {
        el.src = video.url;
      }
      return () => {
        if (hls) hls.destroy();
      };
    }, [video?.url]);

    return (
      <div className={styles.imageContainer}>
        <div className={`${styles.cardImage} ${styles.singleImage}`}>
          <video ref={videoRef} className={styles.videoPlayer} controls poster={poster} />
        </div>
        <div className={styles.dotIndicator}>
          <div className={`${styles.dot} ${styles.active}`}></div>
        </div>
      </div>
    );
  }

  if (imageUrls.length <= 1) {
    // 단일 이미지
    return (
      <>
        <div className={`${styles.cardImage} ${styles.singleImage}`}>
          {imageUrls[0] ? (
            <img 
              src={`${imageUrls[0]}?width=400&height=400&fit=cover&quality=100`} 
              alt="게시물 이미지"
              loading={aboveTheFold ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={aboveTheFold ? 'high' : 'auto'}
              onClick={onClickImage}
              style={{ cursor: 'pointer' }}
            />
          ) : (
            <div className={styles.imagePlaceholder}>📷</div>
          )}
        </div>
        <div className={styles.dotIndicator}>
          <div className={`${styles.dot} ${styles.active}`}></div>
        </div>
      </>
    );
  }

  // 다중 이미지 슬라이더
  return (
    <>
      <div className={styles.imageSliderContainer}>
        <button 
          className={`${styles.sliderArrow} ${styles.left} ${!sliderState.canScrollLeft ? styles.hidden : ''}`}
          onClick={() => scrollSlider('left')}
          aria-label="이전 이미지"
        >
          ‹
        </button>
        <div 
          className={`${styles.cardImage} ${styles.imageSlider}`} 
          ref={sliderRef}
          onScroll={checkScrollPosition}
        >
          {imageUrls.map((imageUrl, index) => (
            <div key={index} className={styles.imageItem}>
              <img 
                src={`${imageUrl}?width=400&height=400&fit=cover&quality=100`} 
                alt={`게시물 이미지 ${index + 1}`}
                loading={index < 1 && aboveTheFold ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={index < 1 && aboveTheFold ? 'high' : 'auto'}
                onClick={onClickImage}
                style={{ cursor: 'pointer' }}
              />
              <div className={styles.imagePlaceholder} style={{ display: 'none' }}>📷</div>
            </div>
          ))}
        </div>
        <button 
          className={`${styles.sliderArrow} ${styles.right} ${!sliderState.canScrollRight ? styles.hidden : ''}`}
          onClick={() => scrollSlider('right')}
          aria-label="다음 이미지"
        >
          ›
        </button>
      </div>
      <div className={styles.dotIndicator}>
        {imageUrls.map((_, index) => (
          <div key={index} className={`${styles.dot} ${index === currentSlideIndex ? styles.active : ''}`} />
        ))}
      </div>
    </>
  );
};

export default PostMedia;


