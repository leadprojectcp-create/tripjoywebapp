'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslationContext } from '../../contexts/TranslationContext';
import { fetchBanners, BannerItem } from '../../services/bannerService';
import styles from './Banner.module.css';

interface BannerSliderProps {
  height?: string;
  autoSlide?: boolean;
  autoSlideInterval?: number;
}

const BannerSlider: React.FC<BannerSliderProps> = ({
  height = "180px",
  autoSlide = true,
  autoSlideInterval = 2000  // 3초로 변경
}) => {
  const { currentLanguage } = useTranslationContext();
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // DB에서 배너 데이터 로드
  useEffect(() => {
    const loadBanners = async () => {
      try {
        const bannerData = await fetchBanners(currentLanguage);
        setBanners(bannerData);
      } catch (error) {
        console.error('배너 로드 실패:', error);
      }
    };
    
    loadBanners();
  }, [currentLanguage]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [itemWidth, setItemWidth] = useState<number>(0);
  const [itemsPerView, setItemsPerView] = useState<number>(2);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const GAP_PX = 16; // PC에서 배너 간격

  // 컨테이너 기준 카드 너비 계산 (2개 표시, 갭 16px)
  useEffect(() => {
    const compute = () => {
      const container = containerRef.current;
      if (!container) return;
      // 반응형: 모바일(<=768px)에서는 1개, 그 외 2개
      const mobileCheck = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
      setIsMobile(mobileCheck);
      const nextItemsPerView = mobileCheck ? 1 : 2;
      setItemsPerView(nextItemsPerView);

      const containerWidth = container.clientWidth;
      
      if (mobileCheck) {
        // 모바일에서는 gap 없이 전체 너비 사용
        setItemWidth(containerWidth);
      } else {
        // PC에서는 gap 고려
        const totalGap = GAP_PX * (nextItemsPerView - 1);
        const widthPerItem = (containerWidth - totalGap) / nextItemsPerView;
        setItemWidth(widthPerItem);
      }
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);
  
  // 배너가 로드되면 너비 재계산
  useEffect(() => {
    if (banners.length > 0) {
      // 약간의 지연을 주어 DOM이 완전히 렌더링된 후 계산
      setTimeout(() => {
        const container = containerRef.current;
        if (!container) return;
        
        const mobileCheck = window.innerWidth <= 768;
        const nextItemsPerView = mobileCheck ? 1 : 2;
        const containerWidth = container.clientWidth;
        
        if (mobileCheck) {
          // 모바일에서는 컨테이너 전체 너비 사용
          setItemWidth(containerWidth);
        } else {
          // PC에서는 gap 고려
          const totalGap = GAP_PX * (nextItemsPerView - 1);
          const widthPerItem = (containerWidth - totalGap) / nextItemsPerView;
          setItemWidth(widthPerItem);
        }
        
        setItemsPerView(nextItemsPerView);
        setIsMobile(mobileCheck);
      }, 100);
    }
  }, [banners]);

  // 유효한 최대 인덱스 (마지막에 항상 2개가 보이도록)
  const maxIndex = Math.max(0, banners.length - itemsPerView);

  // 자동 슬라이드 - 배너가 itemsPerView보다 많을 때만 작동
  useEffect(() => {
    if (!autoSlide || banners.length <= itemsPerView) return;

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
  }, [autoSlide, autoSlideInterval, banners.length, maxIndex, itemsPerView]);

  const goToPrevious = () => {
    if (banners.length <= itemsPerView) return;
    setCurrentIndex((prevIndex) => (prevIndex <= 0 ? maxIndex : prevIndex - 1));
  };

  const goToNext = () => {
    if (banners.length <= itemsPerView) return;
    setCurrentIndex((prevIndex) => (prevIndex >= maxIndex ? 0 : prevIndex + 1));
  };

  const renderBanner = (banner: BannerItem, index: number) => {
    // 모바일에서 간단한 스타일
    const bannerStyle: React.CSSProperties = isMobile ? {} : {
      height: height,
      width: itemWidth > 0 ? `${itemWidth}px` : '100%',
      flexShrink: 0
    };

    // 이미지 URL - 모바일에서는 화면 너비에 맞게
    const getImageUrl = (url: string) => {
      if (!url) return '';
      const separator = url.includes('?') ? '&' : '?';
      
      if (isMobile) {
        const mobileWidth = Math.floor(window.innerWidth * 0.9); // 90% 너비
        const mobileHeight = Math.floor(mobileWidth * 180 / 630); // 630:180 비율
        return `${url}${separator}width=${mobileWidth}&height=${mobileHeight}&fit=cover&quality=100`;
      }
      
      return `${url}${separator}width=630&height=180&fit=cover&quality=100`;
    };

    return (
      <div key={banner.id} className={styles.bannerItem} style={bannerStyle}>
        {banner.imageUrl && (
          <img 
            src={getImageUrl(banner.imageUrl)}
            alt={banner.title || '배너 이미지'}
            className={styles.bannerImage}
          />
        )}
        
        {(banner.title || banner.subtitle) && (
          <div className={styles.content}>
            {banner.title && <h1 className={styles.title}>{banner.title}</h1>}
            {banner.subtitle && <p className={styles.subtitle}>{banner.subtitle}</p>}
          </div>
        )}
      </div>
    );
  };

  if (banners.length === 0) return null;

  return (
    <div className={styles.bannerSlider}>
      <div className={styles.sliderContainer} ref={containerRef} style={{ height: isMobile ? 'auto' : height }}>
        <div className={styles.sliderViewport}>
          <div 
            className={styles.sliderTrack}
            style={{
              transform: isMobile 
                ? `translateX(-${currentIndex * 100}%)`
                : `translateX(-${currentIndex * (itemWidth + GAP_PX)}px)`,
              transition: 'transform 0.3s ease',
              gap: isMobile ? '0' : `${GAP_PX}px`
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
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button 
              className={`${styles.navButton} ${styles.nextButton}`}
              onClick={goToNext}
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
