'use client';

import React, { useState, useEffect } from 'react';
import { useTranslationContext } from '../../contexts/TranslationContext';
import { fetchBanners, BannerItem } from '../../services/bannerService';
import styles from './Banner.module.css';

const BannerSlider: React.FC = () => {
  const { currentLanguage } = useTranslationContext();
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // 화면 크기 감지
  useEffect(() => {
    const checkMobile = () => {
      const isMobileSize = window.innerWidth <= 768;
      setIsMobile(isMobileSize);
      console.log('📱 화면 크기:', { width: window.innerWidth, isMobile: isMobileSize });
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 배너 로드
  useEffect(() => {
    const loadBanners = async () => {
      try {
        const bannerData = await fetchBanners(currentLanguage);
        setBanners(bannerData);
        console.log('📋 배너 로드됨:', bannerData);
      } catch (error) {
        console.error('❌ 배너 로드 실패:', error);
      }
    };

    loadBanners();
  }, [currentLanguage]);

  // 자동 슬라이드 (3초마다)
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        if (isMobile) {
          // 모바일: 1개씩 이동
          return (prev + 1) % banners.length;
        } else {
          // PC: 2개씩 이동하되, 마지막에서는 처음으로
          const maxIndex = Math.max(0, banners.length - 2);
          return prev >= maxIndex ? 0 : prev + 1;
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [banners.length, isMobile]);

  if (banners.length === 0) {
    return null;
  }

  // 이미지 URL 생성 (모바일과 PC 다른 크기로)
  const getImageUrl = (originalUrl: string) => {
    if (!originalUrl) return originalUrl;

    const separator = originalUrl.includes('?') ? '&' : '?';

    if (isMobile) {
      // 모바일: 화면 너비에서 좌우 여백 20px 뺀 실제 컨텐츠 영역 크기
      const contentWidth = Math.max(window.innerWidth - 20, 350); // 좌우 10px씩 빼기
      const mobileHeight = 140;
      console.log('📱 모바일 이미지 쿼리 (컨텐츠 영역):', {
        screenWidth: window.innerWidth,
        contentWidth: contentWidth,
        height: mobileHeight,
        fullUrl: `${originalUrl}${separator}width=${contentWidth}&height=${mobileHeight}&fit=fill&quality=100`
      });
      return `${originalUrl}${separator}width=${contentWidth}&height=${mobileHeight}&fit=fill&quality=100`;
    } else {
      // PC: 절반 너비 + 180px 높이 (2개씩 나오므로)
      const pcWidth = 620; // PC에서 배너 하나당 크기
      const pcHeight = 180;
      console.log('💻 PC 이미지 쿼리:', {
        width: pcWidth,
        height: pcHeight,
        fullUrl: `${originalUrl}${separator}width=${pcWidth}&height=${pcHeight}&fit=cover&quality=100`
      });
      return `${originalUrl}${separator}width=${pcWidth}&height=${pcHeight}&fit=cover&quality=100`;
    }
  };

  // 슬라이드 이동 계산
  const getTransform = () => {
    if (isMobile) {
      // 모바일: 100%씩 이동 (1개씩)
      return `translateX(-${currentIndex * 100}%)`;
    } else {
      // PC: 50%씩 이동 (2개씩 보이므로)
      return `translateX(-${currentIndex * 50}%)`;
    }
  };

  // 네비게이션 함수
  const goToPrevious = () => {
    setCurrentIndex(prev => {
      if (isMobile) {
        return prev <= 0 ? banners.length - 1 : prev - 1;
      } else {
        const maxIndex = Math.max(0, banners.length - 2);
        return prev <= 0 ? maxIndex : prev - 1;
      }
    });
  };

  const goToNext = () => {
    setCurrentIndex(prev => {
      if (isMobile) {
        return (prev + 1) % banners.length;
      } else {
        const maxIndex = Math.max(0, banners.length - 2);
        return prev >= maxIndex ? 0 : prev + 1;
      }
    });
  };

  return (
    <div className={styles.banner}>
      <div className={styles.container}>
        <div
          className={styles.track}
          style={{
            transform: getTransform(),
            width: isMobile ? `${banners.length * 100}%` : `${banners.length * 50}%`
          }}
        >
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`${styles.slide} ${isMobile ? styles.mobileSlide : styles.pcSlide}`}
            >
              {banner.imageUrl && (
                <img
                  src={getImageUrl(banner.imageUrl)}
                  alt={banner.title || '배너'}
                  className={styles.image}
                  onLoad={() => console.log(`✅ 이미지 ${index + 1} 로드 완료`)}
                  onError={() => console.log(`❌ 이미지 ${index + 1} 로드 실패`)}
                />
              )}

              {banner.title && (
                <div className={styles.overlay}>
                  <h2 className={styles.title}>{banner.title}</h2>
                  {banner.subtitle && (
                    <p className={styles.subtitle}>{banner.subtitle}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* PC에서만 네비게이션 버튼 */}
        {!isMobile && banners.length > 2 && (
          <>
            <button className={styles.navButton + ' ' + styles.prevButton} onClick={goToPrevious}>
              <span>‹</span>
            </button>
            <button className={styles.navButton + ' ' + styles.nextButton} onClick={goToNext}>
              <span>›</span>
            </button>
          </>
        )}

        {/* 인디케이터 */}
        {banners.length > 1 && (
          <div className={styles.indicators}>
            {isMobile ? (
              // 모바일: 모든 배너에 대한 인디케이터
              banners.map((_, index) => (
                <button
                  key={index}
                  className={`${styles.indicator} ${index === currentIndex ? styles.active : ''}`}
                  onClick={() => setCurrentIndex(index)}
                />
              ))
            ) : (
              // PC: 페이지 수만큼 인디케이터
              Array.from({ length: Math.ceil(banners.length / 2) }).map((_, index) => (
                <button
                  key={index}
                  className={`${styles.indicator} ${index === currentIndex ? styles.active : ''}`}
                  onClick={() => setCurrentIndex(index)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerSlider;