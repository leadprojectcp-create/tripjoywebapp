'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PostData } from '../services/postService';
import { useTranslationContext } from '../contexts/TranslationContext';
import { useAuthContext } from '../contexts/AuthContext';
import { toggleLike, toggleBookmark, checkLikeStatus, checkBookmarkStatus } from '../services/interactionService';
import './PostCard.css';

interface PostCardProps {
  post: PostData;
  userInfo?: {
    name: string;
    location: string;
    profileImage?: string;
    gender?: string;
    birthDate?: string;
  };
  showUserInfo?: boolean; // user-info 표시 여부
  cardClassName?: string; // 각 페이지별 고유 클래스명
  onInteractionChange?: (postId: string, type: 'like' | 'bookmark', isActive: boolean) => void; // 상호작용 변경 콜백
  showSettings?: boolean; // 설정 메뉴 표시 여부
  onEdit?: (postId: string) => void; // 수정 콜백
  onDelete?: (postId: string) => void; // 삭제 콜백
}

export const PostCard: React.FC<PostCardProps> = ({ 
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
  const [sliderState, setSliderState] = useState({ canScrollLeft: false, canScrollRight: true });
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likeCount || 0);
  const [bookmarksCount, setBookmarksCount] = useState(post.bookmarkCount || 0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  // 국가코드를 현재 언어의 국가명으로 변환하는 함수
  const translateCountry = (countryCode: string): string => {
    if (!countryCode) return '';
    
    // 기본값들은 그대로 반환 (번역하지 않음)
    if (countryCode === '위치 미상' || countryCode === '사용자') {
      return countryCode;
    }
    
    try {
      return t(`countries.${countryCode}`);
    } catch (error) {
      return countryCode; // 번역이 없으면 원본 반환
    }
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
  const imageUrls = useMemo(() => {
    if (post.images && post.images.length > 0) {
      return {
        original: post.images.map(img => img.urls?.original || img.url),
        thumbnails: post.images.map(img => img.urls?.thumbnail || img.url),
        medium: post.images.map(img => img.urls?.medium || img.url),
        large: post.images.map(img => img.urls?.large || img.url),
      };
    }
    
    // 기본값
    return {
      original: [],
      thumbnails: [],
      medium: [],
      large: [],
    };
  }, [post.images]); // post.images가 변경될 때만 재계산

  // 🚀 스크롤 위치 확인 함수 (useCallback으로 최적화 - 무한 렌더링 방지)
  const checkScrollPosition = useCallback(() => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setSliderState({
        canScrollLeft: scrollLeft > 0,
        canScrollRight: scrollLeft < scrollWidth - clientWidth - 1
      });
    }
  }, []); // 의존성 없음 (sliderRef는 ref이므로 안정적)

  // 🚀 슬라이더 스크롤 함수 (useCallback으로 최적화)
  const scrollSlider = useCallback((direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = 200;
      const currentScroll = sliderRef.current.scrollLeft;
      const targetScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      sliderRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
      
      // 스크롤 후 상태 업데이트
      setTimeout(() => {
        checkScrollPosition();
      }, 300);
    }
  }, [checkScrollPosition]); // checkScrollPosition에 의존

  // 🚀 컴포넌트 마운트 시 스크롤 상태 초기화 (최적화된 의존성)
  useEffect(() => {
    checkScrollPosition();
  }, [checkScrollPosition, imageUrls.thumbnails.length]); // 배열 길이만 체크하여 안정성 확보

  // 좋아요와 북마크 상태 초기화
  useEffect(() => {
    const initializeInteractionStatus = async () => {
      if (!user || !post.id) return;
      
      try {
        const [likedStatus, bookmarkedStatus] = await Promise.all([
          checkLikeStatus(post.id, user.uid),
          checkBookmarkStatus(post.id, user.uid)
        ]);
        
        setIsLiked(likedStatus);
        setIsBookmarked(bookmarkedStatus);
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

  // 북마크 토글 핸들러
  const handleBookmarkToggle = useCallback(async () => {
    if (!user || !post.id || isLoading) return;
    
    setIsLoading(true);
    
    // 낙관적 업데이트 (UI 반응성을 위해)
    const optimisticIsBookmarked = !isBookmarked;
    setIsBookmarked(optimisticIsBookmarked);
    
    try {
      const result = await toggleBookmark(post.id, user.uid);
      // 서버 응답으로 최종 상태 업데이트 (서버가 진실의 원천)
      setIsBookmarked(result.isBookmarked);
      setBookmarksCount(result.newCount);
      
      // 콜백 호출 (상위 컴포넌트에 상태 변경 알림)
      if (onInteractionChange && post.id) {
        onInteractionChange(post.id, 'bookmark', result.isBookmarked);
      }
    } catch (error) {
      console.error('북마크 토글 실패:', error);
      // 에러 발생 시 원래 상태로 복원
      setIsBookmarked(isBookmarked);
    } finally {
      setIsLoading(false);
    }
  }, [user, post.id, isLoading, isBookmarked]);

  // 공유 메뉴 토글 핸들러
  const handleShareToggle = useCallback(() => {
    setShowShareMenu(!showShareMenu);
  }, [showShareMenu]);

  // 이미지 클릭 핸들러 (팝업 열기)
  const handleImageClick = useCallback((imageIndex: number) => {
    // 유효한 인덱스인지 확인
    if (imageUrls.medium && imageIndex >= 0 && imageIndex < imageUrls.medium.length) {
      setSelectedImageIndex(imageIndex);
      setShowImageModal(true);
    }
  }, [imageUrls.medium]);

  // 이미지 모달 닫기
  const handleCloseImageModal = useCallback(() => {
    setShowImageModal(false);
  }, []);

  // 프로필 클릭 핸들러 (프로필 페이지로 이동)
  const handleProfileClick = useCallback(() => {
    if (post.userId) {
      router.push(`/profile?userId=${post.userId}`);
    }
  }, [post.userId, router]);

  // 채팅 시작 핸들러
  const handleChatClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // 프로필 클릭 이벤트 방지
    if (post.userId && user?.uid && post.userId !== user.uid) {
      router.push(`/chat?userId=${post.userId}`);
    }
  }, [post.userId, user?.uid, router]);

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

  // 단일 이미지 렌더링
  const renderSingleImage = () => (
    <div className="card-image single-image">
      <img 
        src={imageUrls.thumbnails[0]} 
        alt="게시물 이미지"
        loading="lazy"
        onClick={() => handleImageClick(0)}
        style={{ cursor: 'pointer' }}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling?.setAttribute('style', 'display: flex');
        }}
      />
      <div className="image-placeholder" style={{ display: 'none' }}>
        📷
      </div>
    </div>
  );

  // 다중 이미지 슬라이더 렌더링
  const renderImageSlider = () => (
    <div className="image-slider-container">
      <button 
        className={`slider-arrow left ${!sliderState.canScrollLeft ? 'hidden' : ''}`}
        onClick={() => scrollSlider('left')}
        aria-label="이전 이미지"
      >
        &lt;
      </button>
      <div 
        className="card-image image-slider" 
        ref={sliderRef}
        onScroll={checkScrollPosition}
      >
        {imageUrls.thumbnails.map((imageUrl, index) => (
          <div key={index} className="image-item">
            <img 
              src={imageUrl} 
              alt={`게시물 이미지 ${index + 1}`}
              loading="lazy"
              onClick={() => handleImageClick(index)}
              style={{ cursor: 'pointer' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.setAttribute('style', 'display: flex');
              }}
            />
            <div className="image-placeholder" style={{ display: 'none' }}>
              📷
            </div>
          </div>
        ))}
      </div>
      <button 
        className={`slider-arrow right ${!sliderState.canScrollRight ? 'hidden' : ''}`}
        onClick={() => scrollSlider('right')}
        aria-label="다음 이미지"
      >
        &gt;
      </button>
    </div>
  );

  return (
    <div className={cardClassName}>
      {/* 카드 헤더 */}
      <div className="card-header">
        {showUserInfo && (
          <div className="user-info" onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
            <div className="user-avatar">
              {userInfo.profileImage ? (
                <img src={userInfo.profileImage} alt={userInfo.name} />
              ) : (
                <span>{userInfo.name.charAt(0)}</span>
              )}
            </div>
            <div className="user-details">
              <div className="user-name">{userInfo.name}</div>
              <div className="user-location">
                {post.location ? (
                  <>
                    <img src="/assets/location.svg" alt="위치" className="location-icon" />
                    {post.location.name}
                  </>
                ) : '위치 정보 없음'}
              </div>
            </div>
            
            {/* 채팅 버튼 (본인 게시물이 아닌 경우에만 표시) */}
            {user?.uid && post.userId !== user.uid && (
              <button 
                className="chat-btn"
                onClick={handleChatClick}
                title="채팅하기"
              >
                💬
              </button>
            )}
          </div>
        )}
        
        {/* user-info가 숨겨졌을 때 place-name을 상단에 표시 */}
        {!showUserInfo && post.location && (
          <div className="header-place-name">
            <img src="/assets/location.svg" alt="위치" className="location-icon" />
            {post.location.name}
          </div>
        )}

        {/* 설정 메뉴 (본인 게시물인 경우에만 표시) */}
        {showSettings && (
          <div className="settings-menu-container">
            <button 
              className="settings-btn"
              onClick={handleSettingsToggle}
              title="설정"
            >
              ⋯
            </button>
            
            {showSettingsMenu && (
              <div className="settings-dropdown">
                <button className="settings-option" onClick={handleEditClick}>
                  수정하기
                </button>
                <button className="settings-option delete" onClick={handleDeleteClick}>
                  삭제하기
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 이미지 영역 */}
      {imageUrls.thumbnails.length === 0 ? (
        <div className="card-image single-image">
          <div className="image-placeholder">
            📷
          </div>
        </div>
      ) : imageUrls.thumbnails.length === 1 ? (
        renderSingleImage()
      ) : (
        renderImageSlider()
      )}

      {/* 카드 푸터 */}
      <div className="card-footer">
        {/* 액션 버튼들 */}
        <div className="engagement-actions">
          <button 
            className={`action-btn like-btn ${isLiked ? 'liked' : ''}`}
            onClick={handleLikeToggle}
            disabled={isLoading}
          >
            <span className="action-icon">{isLiked ? '❤️' : '🤍'}</span>
            <span className="action-count">{likesCount}</span>
          </button>
          
          <button 
            className={`action-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
            onClick={handleBookmarkToggle}
            disabled={isLoading}
          >
            <span className="action-icon">{isBookmarked ? '🔖' : '📌'}</span>
            <span className="action-count">{bookmarksCount}</span>
          </button>
          
          <button 
            className={`action-btn share-btn ${showShareMenu ? 'active' : ''}`}
            onClick={handleShareToggle}
          >
            <span className="action-icon">📤</span>
            <span className="action-label">{t('share') || '공유'}</span>
          </button>
        </div>
        
        {/* 공유 메뉴 */}
        {showShareMenu && (
          <div className="share-menu">
            <button onClick={() => handleShare('copy')} className="share-option">
              📋 {t('copyLink') || '링크 복사'}
            </button>
            <button onClick={() => handleShare('facebook')} className="share-option">
              📘 Facebook
            </button>
            <button onClick={() => handleShare('twitter')} className="share-option">
              🐦 Twitter
            </button>
            <button onClick={() => handleShare('whatsapp')} className="share-option">
              📱 WhatsApp
            </button>
          </div>
        )}

        <div className="location-info">
          {/* 게시물 내용 */}
          <div className={`post-content ${!post.content ? 'date-only' : ''}`}>
            {post.content && (
              <span className="post-text">
                {post.content.length > 100 
                  ? `${post.content.substring(0, 100)}...` 
                  : post.content}
              </span>
            )}
            <span className="date-badge">{formatDate(post.createdAt)}</span>
          </div>
          

          
          {/* 해시태그 */}
          {post.hashtags.length > 0 && (
            <div className="hashtags">
              {post.hashtags.join(' ')}
            </div>
          )}
        </div>
      </div>

      {/* 이미지 모달 */}
      {showImageModal && imageUrls.medium && imageUrls.medium.length > 0 && selectedImageIndex < imageUrls.medium.length && (
        <div className="image-modal-overlay" onClick={handleCloseImageModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={handleCloseImageModal}>
              ✕
            </button>
            <div className="modal-image-container">
              <img 
                src={imageUrls.medium[selectedImageIndex]} 
                alt={`게시물 이미지 ${selectedImageIndex + 1}`}
                className="modal-image"
              />
              {imageUrls.medium.length > 1 && (
                <div className="modal-navigation">
                  <button 
                    className="modal-nav-btn prev"
                    onClick={() => setSelectedImageIndex(prev => {
                      const maxIndex = imageUrls.medium.length - 1;
                      return prev > 0 ? prev - 1 : maxIndex;
                    })}
                    disabled={imageUrls.medium.length <= 1}
                  >
                    ‹
                  </button>
                  <button 
                    className="modal-nav-btn next"
                    onClick={() => setSelectedImageIndex(prev => {
                      const maxIndex = imageUrls.medium.length - 1;
                      return prev < maxIndex ? prev + 1 : 0;
                    })}
                    disabled={imageUrls.medium.length <= 1}
                  >
                    ›
                  </button>
                </div>
              )}
              {imageUrls.medium.length > 1 && (
                <span className="modal-image-counter">
                  {selectedImageIndex + 1} / {imageUrls.medium.length}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
