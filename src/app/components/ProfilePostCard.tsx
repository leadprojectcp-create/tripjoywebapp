'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PostData } from '../services/postService';
import { useTranslationContext } from '../contexts/TranslationContext';
import { useAuthContext } from '../contexts/AuthContext';
import { toggleLike, checkLikeStatus } from './post-hooks/usePostInteractions';
import { bunnyService } from '../services/bunnyService';
import styles from './ProfilePostCard.module.css';
import { PostHeader } from '../dashboard/postcard/PostHeader';
import { PostMedia } from '../dashboard/postcard/PostMedia';
import { PostFooter } from '../dashboard/postcard/PostFooter';
import { usePostLocationTranslations, buildImageUrls, formatPostDate } from './post-hooks/usePostData';

interface ProfilePostCardProps {
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
  showUserInfo?: boolean; // user-info 표시 여부
  cardClassName?: string; // 각 페이지별 고유 클래스명
  onInteractionChange?: (postId: string, type: 'like', isActive: boolean) => void; // 상호작용 변경 콜백
  showSettings?: boolean; // 설정 메뉴 표시 여부
  onEdit?: (postId: string) => void; // 수정 콜백
  onDelete?: (postId: string) => void; // 삭제 콜백
}

export const ProfilePostCard: React.FC<ProfilePostCardProps> = ({ 
  post, 
  userInfo = { name: '사용자', location: '위치 미상' },
  showUserInfo = true,
  cardClassName = 'content-card', // 기본값은 기존 클래스명
  onInteractionChange,
  showSettings = false,
  onEdit,
  onDelete
}) => {
  const { t, currentLanguage } = useTranslationContext();
  const { user } = useAuthContext();
  const router = useRouter();

  // (슬라이더 상태는 공통 미디어 섹션으로 위임)
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likeCount || 0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
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

  // 성별을 현재 언어로 번역하는 함수
  const translateGender = (gender: string): string => {
    if (!gender) return '';
    const lowerGender = gender.toLowerCase();
    if (lowerGender === 'male' || lowerGender === 'man' || lowerGender === '남성') {
      return t('male');
    } else if (lowerGender === 'female' || lowerGender === 'woman' || lowerGender === '여성') {
      return t('female');
    }
    return gender; // 번역이 없으면 원본 반환
  };

  // 나이에 언어별 단위를 붙이는 함수
  const formatAge = (age: number): string => {
    if (!age || age === 0) return '';
    return `${age}${t('ageUnit')}`;
  };

  // 생년월일로부터 나이 계산하는 함수
  const calculateAge = (birthDateString: string): number => {
    if (!birthDateString) return 0;
    
    try {
      // "2020년 6월 7일 오전 12시 0분 0초 UTC+9" 형식 파싱
      const koreanDateRegex = /(\d{4})년 (\d{1,2})월 (\d{1,2})일/;
      const match = birthDateString.match(koreanDateRegex);
      
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1; // JavaScript Date는 월이 0부터 시작
        const day = parseInt(match[3]);
        
        const birthDate = new Date(year, month, day);
        const today = new Date();
        
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        // 생일이 아직 지나지 않았다면 나이에서 1을 뺌
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        return age;
      }
      
      // 일반적인 날짜 형식도 시도
      const birthDate = new Date(birthDateString);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        return age;
      }
    } catch (error) {
      console.error('생년월일 파싱 오류:', error);
    }
    
    return 0;
  };

  // 🚀 이미지 URL 추출 (useMemo로 최적화 - 무한 렌더링 방지)
  const imageUrls = useMemo(() => buildImageUrls(post.images as any), [post.images]);


  // 🚀 스크롤 위치 확인 함수 (useCallback으로 최적화 - 무한 렌더링 방지)
  // (슬라이더 상태 체크는 공통 미디어 섹션으로 위임)

  // 🚀 슬라이더 스크롤 함수 (useCallback으로 최적화)
  // (스크롤 로직 공통화)

  // 🚀 컴포넌트 마운트 시 스크롤 상태 초기화 (최적화된 의존성)
  // (초기화 로직 공통화)

  // 🚀 이미지 프리로딩 (빠른 로딩을 위해)
  useEffect(() => {
    if (imageUrls.length > 0) {
      // 썸네일 이미지들을 미리 로드 (200x200 크기로)
      const thumbnailUrls = imageUrls.map(url => 
        `${url}?width=200&height=200&fit=cover&quality=100`
      );
      bunnyService.preloadImages(thumbnailUrls).catch(error => {
        console.warn('이미지 프리로딩 실패:', error);
      });
    }
  }, [imageUrls]);

  // 🚀 컴포넌트 언마운트 시 정리
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      // 컴포넌트 언마운트 시 상태 초기화
      isMountedRef.current = false;
      setShowShareMenu(false);
      setShowSettingsMenu(false);
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

  // 이미지 클릭 핸들러 (상세보기 페이지로 이동)
  const handleImageClick = useCallback(() => {
    router.push(`/post/${post.id}`);
  }, [post.id, router]);

  // dot indicator 클릭 핸들러
  const handleDotClick = useCallback((index: number) => {
    try {
      if (isMountedRef.current) {
        setCurrentSlideIndex(index);
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
  }, []);

  // 슬라이더 스크롤 시 현재 인덱스 업데이트
  const handleSliderScroll = useCallback(() => {
    try {
      if (isMountedRef.current && sliderRef.current && sliderRef.current.parentNode) {
        const slider = sliderRef.current;
        // 반응형: 컨테이너 너비에 따라 아이템 너비 계산
        const itemWidth = slider.offsetWidth;
        const currentIndex = Math.round(slider.scrollLeft / itemWidth);
        setCurrentSlideIndex(currentIndex);
      }
    } catch (error) {
      console.warn('Slider scroll handler failed:', error);
    }
  }, []);


  // 프로필 클릭 핸들러 (프로필 페이지로 이동)
  const handleProfileClick = useCallback(() => {
    if (post.userId) {
      router.push(`/profile?userId=${post.userId}`);
    }
  }, [post.userId, router]);



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

  // 설정 메뉴 토글 핸들러
  const handleSettingsToggle = useCallback(() => {
    setShowSettingsMenu(!showSettingsMenu);
  }, [showSettingsMenu]);

  // 수정 핸들러
  const handleEditClick = useCallback(() => {
    setShowSettingsMenu(false);
    if (onEdit && post.id) {
      onEdit(post.id);
    }
  }, [onEdit, post.id]);

  // 삭제 핸들러
  const handleDeleteClick = useCallback(() => {
    setShowSettingsMenu(false);
    if (onDelete && post.id) {
      onDelete(post.id);
    }
  }, [onDelete, post.id]);

  const mediaImages = useMemo(() => imageUrls.map(url => ({ url })), [imageUrls]);

  return (
    <div className={styles[cardClassName] || styles.contentCard}>
      {/* 카드 헤더 */}
      <div className={styles.cardHeader}>
        {showUserInfo && (
          <div className={styles.userInfo} onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
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
        )}
        
        {/* user-info가 숨겨졌을 때 place-name을 상단에 표시 */}
        {!showUserInfo && post.location && (
          <div className={styles.headerPlaceName}>
            <img src="/assets/location.svg" alt="위치" className={styles.locationIcon} />
            {post.location.name}
          </div>
        )}



        {/* 설정 메뉴 (본인 게시물인 경우에만 표시) */}
        {showSettings && (
          <div className={styles.settingsMenuContainer}>
            <button 
              className={styles.settingsBtn}
              onClick={handleSettingsToggle}
              title="설정"
            >
              ⋯
            </button>
            
            {showSettingsMenu && (
              <div className={styles.settingsDropdown}>
                <button className={styles.settingsOption} onClick={handleEditClick}>
                  수정하기
                </button>
                <button className={`${styles.settingsOption} ${styles.delete}`} onClick={handleDeleteClick}>
                  삭제하기
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <PostMedia 
        styles={styles}
        images={mediaImages}
        onClickImage={handleImageClick}
      />

      {/* 카드 푸터 */}
      <PostFooter 
        styles={styles}
        isLiked={isLiked}
        likesCount={likesCount}
        isLoading={isLoading}
        showShareMenu={showShareMenu}
        onToggleLike={handleLikeToggle}
        onToggleShare={handleShareToggle}
        onShare={handleShare}
        dateText={formatPostDate(post.createdAt, t)}
      />

    </div>
  );
};

export default ProfilePostCard;
