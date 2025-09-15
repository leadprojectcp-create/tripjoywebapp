'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './Banner.module.css';

interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  showGradient?: boolean;
}

interface BannerSliderProps {
  banners: BannerItem[];
  height?: string;
  autoSlide?: boolean;
  autoSlideInterval?: number;
}

const BannerSlider: React.FC<BannerSliderProps> = ({
  banners,
  height = "180px",
  autoSlide = true,
  autoSlideInterval = 5000
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [itemWidth, setItemWidth] = useState<number>(0);
  const [itemsPerView, setItemsPerView] = useState<number>(2);
  const GAP_PX = 16; // 배너 간격

  // 컨테이너 기준 카드 너비 계산 (2개 표시, 갭 16px)
  useEffect(() => {
    const compute = () => {
      const container = containerRef.current;
      if (!container) return;
      // 반응형: 모바일(<=768px)에서는 1개, 그 외 2개
      const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
      const nextItemsPerView = isMobile ? 1 : 2;
      setItemsPerView(nextItemsPerView);

      const containerWidth = container.clientWidth;
      const totalGap = GAP_PX * (nextItemsPerView - 1);
      const widthPerItem = (containerWidth - totalGap) / nextItemsPerView;
      setItemWidth(widthPerItem);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  // 유효한 최대 인덱스 (마지막에 항상 2개가 보이도록)
  const maxIndex = Math.max(0, banners.length - itemsPerView);

  // 자동 슬라이드
  useEffect(() => {
    if (!autoSlide || banners.length <= 2) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        // 마지막에서 첫 번째로 돌아가기
        if (prevIndex >= maxIndex) {
          return 0;
        }
        return prevIndex + 1;
      });
    }, autoSlideInterval);

    return () => clearInterval(interval);
  }, [autoSlide, autoSlideInterval, banners.length, maxIndex]);

  const goToPrevious = () => {
    if (isTransitioning || banners.length <= 2) return;
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) => (prevIndex <= 0 ? maxIndex : prevIndex - 1));
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goToNext = () => {
    if (isTransitioning || banners.length <= 2) return;
    setIsTransitioning(true);
    setCurrentIndex((prevIndex) => (prevIndex >= maxIndex ? 0 : prevIndex + 1));
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const renderBanner = (banner: BannerItem, index: number) => {
    const bannerStyle: React.CSSProperties = {
      backgroundColor: banner.showGradient !== false ? undefined : banner.backgroundColor || "#4A90E2",
      color: banner.textColor || "#FFFFFF",
      height: height,
      width: itemWidth > 0 ? `${itemWidth}px` : undefined
    };

    return (
      <div key={banner.id} className={styles.bannerItem} style={bannerStyle}>
        {banner.imageUrl && (
          <div 
            className={styles.backgroundImage} 
            style={{ backgroundImage: `url(${banner.imageUrl})` }} 
          />
        )}
        
        {banner.showGradient !== false && (
          <div className={styles.gradientOverlay} />
        )}
        
        <div className={styles.content}>
          <h1 className={styles.title}>{banner.title}</h1>
          <p className={styles.subtitle}>{banner.subtitle}</p>
        </div>
      </div>
    );
  };

  if (banners.length === 0) return null;

  return (
    <div className={styles.bannerSlider}>
      <div className={styles.sliderContainer} ref={containerRef} style={{ height }}>
        <div className={styles.sliderViewport}>
          <div 
            className={styles.sliderTrack}
            style={{
              transform: `translateX(-${Math.max(0, currentIndex) * (itemWidth + GAP_PX)}px)`,
              transition: isTransitioning ? 'transform 0.3s ease-in-out' : 'none'
            }}
          >
            {banners.map((banner, index) => renderBanner(banner, index))}
          </div>
        </div>
        
        {/* 네비게이션 버튼 (컨테이너 기준 정중앙 배치) */}
        {banners.length > itemsPerView && itemsPerView > 1 && (
          <>
            <button 
              className={`${styles.navButton} ${styles.prevButton}`}
              onClick={goToPrevious}
              disabled={isTransitioning}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button 
              className={`${styles.navButton} ${styles.nextButton}`}
              onClick={goToNext}
              disabled={isTransitioning}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </>
        )}
      </div>
      
      {/* 인디케이터 제거 */}
    </div>
  );
};

export default BannerSlider;
