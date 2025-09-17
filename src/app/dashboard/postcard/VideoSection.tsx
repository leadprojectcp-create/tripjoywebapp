'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { useRouter } from 'next/navigation';
import { useTranslationContext } from '../../contexts/TranslationContext';
import { PostData } from '../../services/postService';
import styles from './VideoSection.module.css';

interface VideoSectionProps {
  posts: PostData[];
  userInfoCache: Record<string, any>;
}

export const VideoSection: React.FC<VideoSectionProps> = ({ posts, userInfoCache }) => {
  const router = useRouter();
  const { t, currentLanguage } = useTranslationContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [countryData, setCountryData] = useState<any[]>([]);
  const [cityData, setCityData] = useState<any[]>([]);

  // video 필드가 있는 게시물만 필터링 (최대 5개)
  const videoPosts = posts
    .filter(post => post.video && (post.video.urls?.thumbnail || post.video.url))
    .slice(0, 5);

  // 국가/도시 데이터 로드
  useEffect(() => {
    const loadCountryData = async () => {
      try {
        const response = await fetch('/data/countries.json');
        const data = await response.json();
        setCountryData(data.countries || []); // countries 배열 추출
      } catch (error) {
        console.error('국가 데이터 로드 실패:', error);
      }
    };

    const loadCityData = async () => {
      try {
        const response = await fetch('/data/cities-kr.json');
        const data = await response.json();
        setCityData(data.cities || []); // cities 배열 추출
      } catch (error) {
        console.error('도시 데이터 로드 실패:', error);
      }
    };

    loadCountryData();
    loadCityData();
  }, []);

  // 위치 번역 함수
  const translatePostLocation = useCallback((post: PostData) => {
    const nationalityCode = post.location?.nationality;
    const cityCode = post.location?.city;
    
    if (!nationalityCode && !cityCode) return '';
    
    // JSON 데이터에서 국가명 가져오기
    const getCountryName = (code: string) => {
      const country = countryData.find(c => c.code === code);
      if (country) {
        return country.names?.[currentLanguage] || country.names?.['en'] || code;
      }
      return code;
    };
    
    // JSON 데이터에서 도시명 가져오기
    const getCityName = (code: string) => {
      const city = cityData.find((c: any) => c.code === code);
      if (city) {
        return city.names?.[currentLanguage] || city.names?.['en'] || code;
      }
      return code;
    };
    
    const parts: string[] = [];
    if (cityCode) parts.push(getCityName(cityCode));
    if (nationalityCode) parts.push(getCountryName(nationalityCode));
    
    return parts.join(', ');
  }, [currentLanguage, cityData, countryData]);

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

  const nextSlide = () => {
    if (currentIndex < videoPosts.length - 1) {
      scrollToSlide(currentIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentIndex > 0) {
      scrollToSlide(currentIndex - 1);
    }
  };

  // 게시물 클릭 핸들러
  const handlePostClick = (postId: string | undefined) => {
    if (postId) {
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

  // HLS 인스턴스 캐시
  const hlsRefs = useRef<{ [key: string]: Hls | null }>({});

  // 마우스 오버 핸들러 (HLS attach)
  const handleMouseEnter = (postId: string | undefined) => {
    if (!postId) return;
    setHoveredVideo(postId);
    const post = videoPosts.find(p => p.id === postId);
    const videoEl = videoRefs.current[postId];
    if (!post || !videoEl) return;
    const url = post.video?.urls?.original || post.video?.url || '';
    if (!url.endsWith('.m3u8')) return; // MP4 제거: HLS만 지원
    videoEl.muted = true;
    if (hlsRefs.current[postId]) {
      if (videoEl.readyState >= 2) {
        videoEl.play().catch(() => {});
      }
      return;
    }
    if (Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 10 });
      hlsRefs.current[postId] = hls;
      hls.loadSource(url);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoEl.play().catch(() => {});
      });
    } else if (videoEl.canPlayType('application/vnd.apple.mpegURL')) {
      videoEl.src = url;
      const onCanPlay = () => videoEl.play().catch(() => {});
      videoEl.addEventListener('canplay', onCanPlay, { once: true } as any);
    }
  };

  const handleMouseLeave = () => {
    const postId = hoveredVideo || '';
    setHoveredVideo(null);
    const videoEl = postId ? videoRefs.current[postId] : null;
    if (videoEl) {
      try {
        videoEl.pause();
        videoEl.currentTime = 0;
        const hls = hlsRefs.current[postId];
        if (hls) {
          hls.destroy();
          hlsRefs.current[postId] = null;
        }
        videoEl.removeAttribute('src');
        videoEl.load();
      } catch {}
    }
  };

  // 비디오 ref 관리
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  // 비디오 재생/정지 제어
  useEffect(() => {
    Object.keys(videoRefs.current).forEach(postId => {
      const video = videoRefs.current[postId];
      if (!video) return;
      if (hoveredVideo === postId) return;
      try {
        video.pause();
        video.currentTime = 0;
      } catch {}
    });
  }, [hoveredVideo]);

  if (videoPosts.length === 0) {
    return null;
  }

  return (
    <div className={styles.videoSection}>
      <div className={styles.videoContainer}>
        <div ref={scrollContainerRef} className={styles.videoScrollContainer}>
          {videoPosts.map((post, index) => (
            <div key={post.id} className={styles.videoCardContainer}>
              {/* 위치 정보 표시 - 비디오 카드 밖에 */}
              {translatePostLocation(post) && (
                <div className={styles.locationInfo}>
                  <span className={styles.locationText}>
                    <img src="/icons/location_pin.svg" alt="위치" className={styles.locationIcon} />
                    {translatePostLocation(post)}
                  </span>
                </div>
              )}
              <div className={styles.videoCard} onClick={() => handlePostClick(post.id)} onMouseEnter={() => handleMouseEnter(post.id)} onMouseLeave={handleMouseLeave}>
                <div className={styles.videoWrapper}>
                  <video ref={(el) => { if (post.id) { videoRefs.current[post.id] = el; } }} className={styles.video} poster={getVideoThumbnail(post)} preload="metadata" muted loop playsInline />
                  {hoveredVideo !== post.id && (
                    <div className={styles.playButton}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {videoPosts.length > 1 && (
          <>
            <button className={`${styles.navButton} ${styles.prevButton}`} onClick={prevSlide} disabled={currentIndex === 0}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
            <button className={`${styles.navButton} ${styles.nextButton}`} onClick={nextSlide} disabled={currentIndex === videoPosts.length - 1}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
              </svg>
            </button>
          </>
        )}
        {videoPosts.length > 1 && (
          <div className={styles.indicators}></div>
        )}
      </div>
    </div>
  );
};
