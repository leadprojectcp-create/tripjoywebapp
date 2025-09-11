'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { PostData } from '../services/postService';
import { useTranslationContext } from '../contexts/TranslationContext';
import { useAuthContext } from '../contexts/AuthContext';
import { toggleLike, checkLikeStatus } from '../services/interactionService';
import styles from './PostDetailCard.module.css';

interface PostDetailCardProps {
  post: PostData;
  userInfo?: {
    name: string;
    location: string;
    profileImage?: string;
    photoUrl?: string;
    gender?: string;
    birthDate?: string;
    nationality?: string;
    city?: string;
  };
  onInteractionChange?: (postId: string, type: 'like', isActive: boolean) => void;
}

export const PostDetailCard: React.FC<PostDetailCardProps> = ({ 
  post, 
  userInfo = { name: '사용자', location: '위치 미상' },
  onInteractionChange
}) => {
  const { t, currentLanguage } = useTranslationContext();
  const { user } = useAuthContext();

  const [sliderState, setSliderState] = useState({ canScrollLeft: false, canScrollRight: true });
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likeCount || 0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [playingVideoIndex, setPlayingVideoIndex] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);
  
  // 국가/도시 데이터 상태
  const [countries, setCountries] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  // 국가 데이터 로드
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await fetch('/data/countries.json');
        const data = await response.json();
        setCountries(data.countries || []);
      } catch (error) {
        console.error('❌ 국가 데이터 로드 실패:', error);
      }
    };

    loadCountries();
  }, []);

  // 도시 데이터 로드 (게시물 위치의 국가가 변경될 때)
  useEffect(() => {
    const loadCities = async (countryCode: string) => {
      if (!countryCode) {
        setCities([]);
        return;
      }

      try {
        const selectedCountryData = countries.find(c => c.code === countryCode);
        if (!selectedCountryData) return;

        const countryFileMap: Record<string, string> = {
          'ko': 'kr', 'en': 'us', 'vi': 'vn', 'zh': 'cn',
          'ja': 'jp', 'th': 'th', 'fil': 'ph'
        };

        const fileName = countryFileMap[selectedCountryData.name];
        if (!fileName) return;

        const response = await fetch(`/data/cities-${fileName}.json`);
        const data = await response.json();
        setCities(data.cities || []);
      } catch (error) {
        console.error('❌ 도시 데이터 로드 실패:', error);
        setCities([]);
      }
    };

    // 게시물 위치의 국가 코드로 도시 데이터 로드
    if (post.location?.nationality) {
      loadCities(post.location.nationality);
    }
  }, [post.location?.nationality, countries]);

  // 국가코드를 현재 언어의 국가명으로 변환하는 함수
  const translateCountry = (countryCode: string): string => {
    if (!countryCode) return '';
    
    // 기본값들은 그대로 반환 (번역하지 않음)
    if (countryCode === '위치 미상' || countryCode === '사용자') {
      return countryCode;
    }
    
    const country = countries.find(c => c.code === countryCode);
    return country?.names[currentLanguage] || country?.names['en'] || countryCode;
  };

  // 도시코드를 현재 언어의 도시명으로 변환하는 함수
  const translateCity = (cityCode: string): string => {
    if (!cityCode) return '';
    
    const city = cities.find(c => c.code === cityCode);
    return city?.names[currentLanguage] || city?.names['en'] || cityCode;
  };

  // 게시물 위치 정보를 번역하는 함수
  const translatePostLocation = (postLocation: any): string => {
    if (!postLocation) return '';
    
    // 국가/도시 코드가 있으면 번역하여 표시
    if (postLocation.nationality && postLocation.city) {
      const countryName = translateCountry(postLocation.nationality);
      const cityName = translateCity(postLocation.city);
      return `${countryName} · ${cityName}`;
    }
    
    // 장소명이 있으면 그대로 표시
    if (postLocation.name) {
      return postLocation.name;
    }
    
    // 기본값 없음
    return '';
  };

  // 🚀 미디어 URL 추출 (이미지 + 비디오, useMemo로 최적화 - 무한 렌더링 방지)
  const mediaUrls = useMemo(() => {
    const mediaItems: Array<{
      type: 'image' | 'video';
      original: string;
      thumbnail: string;
      videoUrl?: string;
    }> = [];

    // 이미지 처리
    if (post.images && post.images.length > 0) {
      post.images.forEach(img => {
        mediaItems.push({
          type: 'image',
          original: img.urls?.original || img.url,
          thumbnail: img.urls?.thumbnail || img.url,
        });
      });
    }

    // 비디오 처리 (단일 비디오)
    if (post.video) {
      // 썸네일 URL 생성 (ImageKit 썸네일)
      const thumbnailUrl = post.video.urls?.thumbnail 
        ? `${post.video.urls.thumbnail}?tr=w-400,h-533,c-maintain_ratio`
        : post.video.url; // fallback
      
      mediaItems.push({
        type: 'video',
        original: thumbnailUrl, // 비디오는 썸네일을 original로 사용
        thumbnail: thumbnailUrl,
        videoUrl: post.video.urls?.original || post.video.url, // 실제 비디오 URL
      });
    }
    
    return mediaItems;
  }, [post.images, post.video]); // post.images와 post.video가 변경될 때만 재계산

  // 🚀 스크롤 위치 확인 함수 (useCallback으로 최적화 - 무한 렌더링 방지)
  const checkScrollPosition = useCallback(() => {
    try {
      if (isMountedRef.current && sliderRef.current && sliderRef.current.parentNode) {
        const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
        setSliderState({
          canScrollLeft: scrollLeft > 0,
          canScrollRight: scrollLeft < scrollWidth - clientWidth - 1
        });
      }
    } catch (error) {
      // 오류 무시 - 개발 환경에서만 발생하는 문제
      console.warn('Scroll position check failed:', error);
    }
  }, []); // 의존성 없음 (sliderRef는 ref이므로 안정적)

  // 🚀 슬라이더 스크롤 함수 (useCallback으로 최적화)
  const scrollSlider = useCallback((direction: 'left' | 'right') => {
    try {
      if (isMountedRef.current && sliderRef.current && sliderRef.current.parentNode) {
        // 반응형: 컨테이너 너비에 따라 스크롤 양 결정
        const containerWidth = sliderRef.current.offsetWidth;
        const scrollAmount = containerWidth;
        const currentScroll = sliderRef.current.scrollLeft;
        const targetScroll = direction === 'left' 
          ? currentScroll - scrollAmount 
          : currentScroll + scrollAmount;
        
        sliderRef.current.scrollTo({
          left: targetScroll,
          behavior: 'smooth'
        });
        
        // 스크롤 후 상태 업데이트 (컴포넌트가 여전히 마운트되어 있는지 확인)
        const timeoutId = setTimeout(() => {
          try {
            if (isMountedRef.current && sliderRef.current && sliderRef.current.parentNode) {
              checkScrollPosition();
              
              // 스크롤 후 현재 인덱스 계산하여 비디오 정지 체크
              const itemWidth = sliderRef.current.offsetWidth;
              const newIndex = Math.round(sliderRef.current.scrollLeft / itemWidth);
              if (playingVideoIndex !== null && mediaUrls[newIndex]?.type !== 'video') {
                setPlayingVideoIndex(null);
              }
            }
          } catch (error) {
            console.warn('Scroll timeout callback failed:', error);
          }
        }, 300);
        
        return () => clearTimeout(timeoutId);
      }
    } catch (error) {
      console.warn('Scroll slider failed:', error);
    }
  }, [checkScrollPosition, playingVideoIndex, mediaUrls]); // 의존성 추가

  // 🚀 컴포넌트 마운트 시 스크롤 상태 초기화 (최적화된 의존성)
  useEffect(() => {
    checkScrollPosition();
  }, [checkScrollPosition, mediaUrls.length]); // 배열 길이만 체크하여 안정성 확보

  // 🚀 컴포넌트 언마운트 시 정리
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      // 컴포넌트 언마운트 시 상태 초기화
      isMountedRef.current = false;
      setShowShareMenu(false);
    };
  }, []);

  // 좋아요 상태 초기화
  useEffect(() => {
    const initializeInteractionStatus = async () => {
      if (!user || !post.id) return;
      
      try {
        const likedStatus = await checkLikeStatus(post.id, user.uid);
        setIsLiked(likedStatus);
      } catch (error) {
        console.error('상호작용 상태 초기화 실패:', error);
      }
    };

    initializeInteractionStatus();
  }, [user, post.id]);

  // 좋아요 토글 핸들러
  const handleLikeToggle = useCallback(async () => {
    if (!user || !post.id || isLoading) return;
    
    setIsLoading(true);
    
    // 낙관적 업데이트 (UI 반응성을 위해)
    const optimisticIsLiked = !isLiked;
    setIsLiked(optimisticIsLiked);
    
    try {
      const result = await toggleLike(post.id, user.uid);
      // 서버 응답으로 최종 상태 업데이트 (서버가 진실의 원천)
      setIsLiked(result.isLiked);
      setLikesCount(result.newCount);
      
      // 콜백 호출 (상위 컴포넌트에 상태 변경 알림)
      if (onInteractionChange && post.id) {
        onInteractionChange(post.id, 'like', result.isLiked);
      }
    } catch (error) {
      console.error('좋아요 토글 실패:', error);
      // 에러 발생 시 원래 상태로 복원
      setIsLiked(isLiked);
    } finally {
      setIsLoading(false);
    }
  }, [user, post.id, isLoading, isLiked]);

  // 공유 메뉴 토글 핸들러
  const handleShareToggle = useCallback(() => {
    setShowShareMenu(!showShareMenu);
  }, [showShareMenu]);

  // 비디오 재생 핸들러
  const handleVideoPlay = useCallback((index: number) => {
    setPlayingVideoIndex(index);
  }, []);

  // 비디오 일시정지 핸들러 (완전 정지)
  const handleVideoPause = useCallback(() => {
    setPlayingVideoIndex(null);
  }, []);

  // 비디오 일시정지 핸들러 (일시정지만)
  const handleVideoPauseOnly = useCallback((index: number) => {
    // 일시정지는 상태를 유지하고 비디오만 일시정지
    // 실제 일시정지는 비디오 엘리먼트에서 자동으로 처리됨
  }, []);

  // 공유하기 핸들러
  const handleShare = useCallback(async (type: 'copy' | 'facebook' | 'twitter' | 'whatsapp') => {
    const url = `${window.location.origin}/post/${post.id}`;
    const text = `${post.content.substring(0, 100)}...`;
    
    switch (type) {
      case 'copy':
        try {
          await navigator.clipboard.writeText(url);
          alert(t('linkCopied') || '링크가 복사되었습니다!');
        } catch (error) {
          console.error('링크 복사 실패:', error);
        }
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`);
        break;
    }
    setShowShareMenu(false);
  }, [post.id, post.content, t]);

  // dot indicator 클릭 핸들러
  const handleDotClick = useCallback((index: number) => {
    try {
      if (isMountedRef.current) {
        setCurrentSlideIndex(index);
        
        // 클릭한 슬라이드가 비디오가 아니면 비디오 정지
        if (playingVideoIndex !== null && mediaUrls[index]?.type !== 'video') {
          setPlayingVideoIndex(null);
        }
        
        if (sliderRef.current && sliderRef.current.parentNode) {
          const slider = sliderRef.current;
          // 반응형: 컨테이너 너비에 따라 아이템 너비 계산
          const itemWidth = slider.offsetWidth;
          slider.scrollTo({
            left: itemWidth * index,
            behavior: 'smooth'
          });
        }
      }
    } catch (error) {
      console.warn('Dot click handler failed:', error);
    }
  }, [playingVideoIndex, mediaUrls]);

  // 슬라이더 스크롤 시 현재 인덱스 업데이트
  const handleSliderScroll = useCallback(() => {
    try {
      if (isMountedRef.current && sliderRef.current && sliderRef.current.parentNode) {
        const slider = sliderRef.current;
        // 반응형: 컨테이너 너비에 따라 아이템 너비 계산
        const itemWidth = slider.offsetWidth;
        const currentIndex = Math.round(slider.scrollLeft / itemWidth);
        setCurrentSlideIndex(currentIndex);
        
        // 현재 슬라이드가 비디오가 아니면 비디오 정지
        if (playingVideoIndex !== null && mediaUrls[currentIndex]?.type !== 'video') {
          setPlayingVideoIndex(null);
        }
      }
    } catch (error) {
      console.warn('Slider scroll handler failed:', error);
    }
  }, [playingVideoIndex, mediaUrls]);

  // 날짜 포맷팅
  const formatDate = (timestamp: any) => {
    if (!timestamp) return t('justNow') || '방금 전';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t('today') || '오늘';
    if (diffDays === 1) return t('oneDayAgo') || '1일 전';
    if (diffDays < 7) return `${diffDays}${t('daysAgoSuffix') || '일 전'}`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)}${t('weeksAgoSuffix') || '주 전'}`;
    
    return date.toLocaleDateString();
  };

  // 단일 미디어 렌더링 (이미지 또는 비디오)
  const renderSingleMedia = () => {
    const media = mediaUrls[0];
    return (
      <div className={styles.imageContainer}>
        <div className={`${styles.cardImage} ${styles.singleImage}`}>
          {media.type === 'video' ? (
            <div className={styles.videoContainer}>
              {playingVideoIndex === 0 ? (
                <video 
                  className={styles.videoPlayer}
                  controls
                  autoPlay
                  onEnded={handleVideoPause}
                >
                  <source src={media.videoUrl} type="video/mp4" />
                  비디오를 재생할 수 없습니다.
                </video>
              ) : (
                <>
                  <img 
                    src={media.original} 
                    alt="비디오 썸네일"
                    loading="lazy"
                    onError={(e) => {
                      console.error('썸네일 로드 실패:', media.original);
                      // fallback으로 비디오 URL 사용
                      e.currentTarget.src = media.videoUrl || '';
                    }}
                  />
                  <button 
                    className={styles.playButton}
                    onClick={() => handleVideoPlay(0)}
                    aria-label="비디오 재생"
                  >
                    ▶
                  </button>
                </>
              )}
            </div>
          ) : (
            <img 
              src={media.original} 
              alt="게시물 이미지"
              loading="lazy"
            />
          )}
        </div>
        <div className={styles.dotIndicator}>
          <div className={`${styles.dot} ${styles.active}`}></div>
        </div>
      </div>
    );
  };

  // 다중 미디어 슬라이더 렌더링 (이미지 + 비디오)
  const renderMediaSlider = () => (
    <div className={styles.imageContainer}>
      <div className={styles.imageSliderContainer}>
        <button 
          className={`${styles.sliderArrow} ${styles.left} ${!sliderState.canScrollLeft ? styles.hidden : ''}`}
          onClick={() => scrollSlider('left')}
          aria-label="이전 미디어"
        >
          ‹
        </button>
        <div 
          className={`${styles.cardImage} ${styles.imageSlider}`} 
          ref={sliderRef}
          onScroll={() => {
            checkScrollPosition();
            handleSliderScroll();
          }}
        >
          {mediaUrls.map((media, index) => (
            <div key={index} className={styles.imageItem}>
              {media.type === 'video' ? (
                <div className={styles.videoContainer}>
                  {playingVideoIndex === index ? (
                    <video 
                      className={styles.videoPlayer}
                      controls
                      autoPlay
                      onEnded={handleVideoPause}
                    >
                      <source src={media.videoUrl} type="video/mp4" />
                      비디오를 재생할 수 없습니다.
                    </video>
                  ) : (
                    <>
                      <img 
                        src={media.original} 
                        alt={`비디오 썸네일 ${index + 1}`}
                        loading="lazy"
                        onError={(e) => {
                          console.error('썸네일 로드 실패:', media.original);
                          // fallback으로 비디오 URL 사용
                          e.currentTarget.src = media.videoUrl || '';
                        }}
                      />
                      <button 
                        className={styles.playButton}
                        onClick={() => handleVideoPlay(index)}
                        aria-label={`비디오 ${index + 1} 재생`}
                      >
                        ▶
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <img 
                  src={media.original} 
                  alt={`게시물 이미지 ${index + 1}`}
                  loading="lazy"
                />
              )}
            </div>
          ))}
        </div>
        <button 
          className={`${styles.sliderArrow} ${styles.right} ${!sliderState.canScrollRight ? styles.hidden : ''}`}
          onClick={() => scrollSlider('right')}
          aria-label="다음 미디어"
        >
          ›
        </button>
      </div>
      <div className={styles.dotIndicator}>
        {mediaUrls.map((_, index) => (
          <div
            key={index}
            className={`${styles.dot} ${index === currentSlideIndex ? styles.active : ''}`}
            onClick={() => handleDotClick(index)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className={styles.postDetailCard}>
      {/* 카드 헤더 */}
      <div className={styles.cardHeader}>
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {userInfo.photoUrl || userInfo.profileImage ? (
              <img src={userInfo.photoUrl || userInfo.profileImage} alt={userInfo.name} />
            ) : (
              <span>{userInfo.name.charAt(0)}</span>
            )}
          </div>
          <div className={styles.userDetails}>
            <div className={styles.userName}>{userInfo.name}</div>
            {translatePostLocation(post.location) && (
              <div className={styles.userLocation}>
                <img src="/icons/location_pin.svg" alt="위치" className={styles.locationIcon} />
                <span className={styles.locationText}>
                  {translatePostLocation(post.location)}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* 날짜 표시 */}
        <span className={styles.dateBadge}>{formatDate(post.createdAt)}</span>
      </div>

      {/* 미디어 영역 - 9:16 비율 (이미지 + 비디오) */}
      {(() => {
        if (mediaUrls.length === 0) {
          return (
            <div className={styles.imageContainer}>
              <div className={`${styles.cardImage} ${styles.singleImage}`}>
                <div className={styles.imagePlaceholder}>
                  📷
                </div>
              </div>
              <div className={styles.dotIndicator}>
                <div className={`${styles.dot} ${styles.active}`}></div>
              </div>
            </div>
          );
        } else if (mediaUrls.length === 1) {
          return renderSingleMedia();
        } else {
          return renderMediaSlider();
        }
      })()}

      {/* 카드 푸터 */}
      <div className={styles.cardFooter}>
        {/* 액션 버튼들 */}
        <div className={styles.engagementActions}>
          <div className={styles.leftActions}>
            <button 
              className={`${styles.actionBtn} ${isLiked ? styles.liked : ''}`}
              onClick={handleLikeToggle}
              disabled={isLoading}
            >
              <span className={styles.actionIcon}>
                <img 
                  src={isLiked ? "/icons/like_active.svg" : "/icons/like.svg"} 
                  alt={isLiked ? "좋아요 취소" : "좋아요"}
                  width="20"
                  height="20"
                />
              </span>
              <span className={styles.actionCount}>{likesCount}</span>
            </button>
          </div>
          
          <button 
            className={`${styles.actionBtn} ${styles.shareBtn} ${showShareMenu ? styles.active : ''}`}
            onClick={handleShareToggle}
          >
            <span className={styles.actionIcon}>
              <img 
                src={showShareMenu ? "/icons/share_active.svg" : "/icons/share.svg"} 
                alt="공유하기"
                width="20"
                height="20"
              />
            </span>
          </button>
        </div>
        
        {/* 공유 메뉴 */}
        {showShareMenu && (
          <div className={styles.shareMenu}>
            <button onClick={() => handleShare('copy')} className={styles.shareOption}>
              📋 {t('copyLink') || '링크 복사'}
            </button>
            <button onClick={() => handleShare('facebook')} className={styles.shareOption}>
              📘 Facebook
            </button>
            <button onClick={() => handleShare('twitter')} className={styles.shareOption}>
              🐦 Twitter
            </button>
            <button onClick={() => handleShare('whatsapp')} className={styles.shareOption}>
              📱 WhatsApp
            </button>
          </div>
        )}

        <div className={styles.locationInfo}>
          {/* 게시물 내용 */}
          <div className={styles.postContent}>
            {post.content && (
              <span className={styles.postText}>
                {post.content}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
