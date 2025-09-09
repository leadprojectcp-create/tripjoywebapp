'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { AppBar } from '../../components/AppBar';
import { BottomNavigator } from '../../components/BottomNavigator';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTranslationContext } from '../../contexts/TranslationContext';
import { useUnreadMessageCount } from '../../hooks/useUnreadMessageCount';

import { PostCard } from '../../components/PostCard';
import { getPostById, PostData } from '../../services/postService';
import { getUserById } from '../../auth/services/authService';
import { toggleLike, toggleBookmark, checkLikeStatus, checkBookmarkStatus } from '../../services/interactionService';
import { GOOGLE_MAPS_API_KEY } from '../../utils/googleMaps';
import ClientStyleProvider from '../../components/ClientStyleProvider';
import styles from './page.module.css';

// Google Maps 타입 선언
declare global {
  interface Window {
    google: any;
  }
}

interface UserInfo {
  name: string;
  location: string;
  profileImage?: string;
  photoUrl?: string;
  gender?: string;
  birthDate?: string;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthContext();
  const { t } = useTranslationContext();
  const unreadMessageCount = useUnreadMessageCount();
  
  const [post, setPost] = useState<PostData | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 상호작용 상태
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isLoadingInteraction, setIsLoadingInteraction] = useState(false);
  
  // 이미지 슬라이더 상태
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [sliderState, setSliderState] = useState({ canScrollLeft: false, canScrollRight: true });
  const sliderRef = useRef<HTMLDivElement | null>(null);
  
  // 지도 상태
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);

  const postId = params.id as string;

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

  useEffect(() => {
    const loadPostDetail = async () => {
      if (!postId) return;

      try {
        setLoading(true);
        setError(null);

        // 게시물 정보 가져오기
        const postData = await getPostById(postId);
        if (!postData) {
          setError('게시물을 찾을 수 없습니다.');
          return;
        }

        setPost(postData);
        
        // 상호작용 상태 초기화
        setLikesCount(postData.likeCount || 0);
        setBookmarksCount(postData.bookmarkCount || 0);

        // 작성자 정보 가져오기
        if (postData.userId) {
          const authorData = await getUserById(postData.userId);
          if (authorData) {
            setUserInfo({
              name: authorData.name || '사용자',
              location: authorData.location || '위치 미상',
              profileImage: authorData.image || authorData.photoUrl,
              photoUrl: authorData.photoUrl,
              gender: authorData.gender,
              birthDate: authorData.birthDate
            });
          }
        }
      } catch (error) {
        console.error('게시물 상세 정보 로드 실패:', error);
        setError('게시물을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadPostDetail();
  }, [postId]);

  // 상호작용 상태 초기화
  useEffect(() => {
    const initializeInteractionStatus = async () => {
      if (!user || !post?.id) return;
      
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
  }, [user, post?.id]);

  // 이미지 URL 추출
  const imageUrls = useMemo(() => {
    if (post?.images && post.images.length > 0) {
      return {
        original: post.images.map(img => img.urls?.original || img.url),
        thumbnails: post.images.map(img => img.urls?.thumbnail || img.url),
        medium: post.images.map(img => img.urls?.medium || img.url),
      };
    }
    return { original: [], thumbnails: [], medium: [] };
  }, [post?.images]);

  // 좋아요 토글 핸들러
  const handleLikeToggle = useCallback(async () => {
    if (!user || !post?.id || isLoadingInteraction) return;
    
    setIsLoadingInteraction(true);
    
    try {
      const result = await toggleLike(post.id, user.uid);
      setIsLiked(result.isLiked);
      setLikesCount(result.newCount);
    } catch (error) {
      console.error('좋아요 토글 실패:', error);
    } finally {
      setIsLoadingInteraction(false);
    }
  }, [user, post?.id, isLoadingInteraction]);

  // 북마크 토글 핸들러
  const handleBookmarkToggle = useCallback(async () => {
    if (!user || !post?.id || isLoadingInteraction) return;
    
    setIsLoadingInteraction(true);
    
    try {
      const result = await toggleBookmark(post.id, user.uid);
      setIsBookmarked(result.isBookmarked);
      setBookmarksCount(result.newCount);
    } catch (error) {
      console.error('북마크 토글 실패:', error);
    } finally {
      setIsLoadingInteraction(false);
    }
  }, [user, post?.id, isLoadingInteraction]);

  // 공유 메뉴 토글
  const handleShareToggle = useCallback(() => {
    setShowShareMenu(!showShareMenu);
  }, [showShareMenu]);

  // 공유하기 핸들러
  const handleShare = useCallback(async (type: 'copy' | 'facebook' | 'twitter' | 'whatsapp') => {
    if (!post?.id) return;
    
    const url = `${window.location.origin}/post/${post.id}`;
    const text = `${post.content?.substring(0, 100)}...`;
    
    switch (type) {
      case 'copy':
        try {
          await navigator.clipboard.writeText(url);
          alert('링크가 복사되었습니다!');
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
  }, [post?.id, post?.content]);

  // 슬라이더 스크롤 함수
  const scrollSlider = useCallback((direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    
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
  }, []);

  // 스크롤 위치 확인
  const checkScrollPosition = useCallback(() => {
    if (!sliderRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setSliderState({
      canScrollLeft: scrollLeft > 0,
      canScrollRight: scrollLeft < scrollWidth - clientWidth - 1
    });
  }, []);

  // dot indicator 클릭 핸들러
  const handleDotClick = useCallback((index: number) => {
    if (sliderRef.current) {
      const slider = sliderRef.current;
      const itemWidth = slider.offsetWidth;
      slider.scrollTo({
        left: itemWidth * index,
        behavior: 'smooth'
      });
    }
  }, []);

  // 슬라이더 스크롤 시 현재 인덱스 업데이트
  const handleSliderScroll = useCallback(() => {
    if (sliderRef.current) {
      const slider = sliderRef.current;
      const itemWidth = slider.offsetWidth;
      const currentIndex = Math.round(slider.scrollLeft / itemWidth);
      setCurrentSlideIndex(currentIndex);
    }
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!post?.location?.coordinates) return;

    const initMap = () => {
      if (mapRef.current && window.google && window.google.maps && post?.location?.coordinates) {
        const { lat, lng } = post.location.coordinates;
        
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom: 15,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
        });
        
        // 마커 추가
        new window.google.maps.Marker({
          position: { lat, lng },
          map: mapInstanceRef.current,
          title: post.location.name,
        });
        
        setIsGoogleMapsLoaded(true);
      }
    };

    // Google Maps API가 이미 로드되어 있는지 확인
    if (window.google && window.google.maps) {
      // 이미 로드되어 있으면 바로 지도 생성
      setTimeout(initMap, 100);
    } else {
      // 로드되지 않았으면 스크립트 로드 후 지도 생성
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=ko`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setTimeout(initMap, 100);
      };
      document.head.appendChild(script);
    }
  }, [post?.location?.coordinates, post?.location?.name]);

  const handleBackClick = () => {
    router.back();
  };

  return (
    
      <ClientStyleProvider>
        <div className={styles.container}>
          {/* Top AppBar */}
          <AppBar 
            showBackButton={true}
            showLogo={false}
            showLanguageSelector={true}
          />
          
          {/* Body Content */}
          <div className="body-content">
            {/* Left Sidebar */}
            

            {/* Main Content */}
            <div className={styles.mainContent}>
              {loading ? (
                <div className={styles.loading}>
                  <div className={styles.spinner}></div>
                  <p>게시물을 불러오는 중...</p>
                </div>
              ) : error || !post ? (
                <div className={styles.error}>
                  <h2>오류</h2>
                  <p>{error || '게시물을 찾을 수 없습니다.'}</p>
                  <button onClick={handleBackClick} className={styles.backBtn}>
                    뒤로 가기
                  </button>
                </div>
              ) : (
                <div className={styles.postDetailContainer}>
                  {/* 페이지 제목 */}
                  <h1 className={styles.pageTitle}>게시물 상세</h1>

                         {/* 작성자 정보 */}
                         <div className={styles.formGroup}>
                           <label className={styles.formLabel}>작성자</label>
                           <div className={styles.userInfo}>
                             <div className={styles.userAvatar}>
                               {userInfo?.photoUrl || userInfo?.profileImage ? (
                                 <img src={userInfo.photoUrl || userInfo.profileImage} alt={userInfo.name} />
                               ) : (
                                 <span>{userInfo?.name?.charAt(0) || 'U'}</span>
                               )}
                             </div>
                             <div className={styles.userDetails}>
                               <div className={styles.userName}>{userInfo?.name || '사용자'}</div>
                               <div className={styles.userInfoRow}>
                                 <span className={styles.userLocation}>
                                   {translateCountry(userInfo?.location || '위치 미상')}
                                 </span>
                                 {userInfo?.gender && (
                                   <span className={styles.userGender}>
                                     {translateGender(userInfo.gender)}
                                   </span>
                                 )}
                                 {userInfo?.birthDate && (
                                   <span className={styles.userAge}>
                                     {formatAge(calculateAge(userInfo.birthDate))}
                                   </span>
                                 )}
                               </div>
                             </div>
                           </div>
                         </div>

                  {/* 위치 정보 */}
                  {post?.location && (post.location.nationality || post.location.city) && (
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>위치</label>
                      <div className={styles.postLocationRow}>
                        {post.location.nationality && (
                          <span className={styles.postNationality}>
                            {post.location.countryName || post.location.nationality}
                          </span>
                        )}
                        {post.location.city && (
                          <span className={styles.postCity}>
                            {post.location.cityName || post.location.city}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 게시물 내용 */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>게시물 내용</label>
                    <div className={styles.postContent}>
                      {post.content || '내용이 없습니다.'}
                    </div>
                  </div>

                  {/* 이미지 */}
                  {imageUrls.original.length > 0 && (
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>이미지</label>
                      {imageUrls.original.length === 1 ? (
                        // 단일 이미지
                        <>
                          <div className={`${styles.cardImage} ${styles.singleImage}`}>
                            <img 
                              src={imageUrls.original[0]} 
                              alt="게시물 이미지"
                              loading="lazy"
                            />
                          </div>
                          <div className={styles.dotIndicator}>
                            <div className={`${styles.dot} ${styles.active}`}></div>
                          </div>
                        </>
                      ) : (
                        // 다중 이미지 슬라이더
                        <>
                          <div className={styles.imageSliderContainer}>
                            <button 
                              className={`${styles.sliderArrow} ${styles.left} ${!sliderState.canScrollLeft ? styles.hidden : ''}`}
                              onClick={() => scrollSlider('left')}
                              aria-label="이전 이미지"
                            >
                              &lt;
                            </button>
                            <div 
                              className={`${styles.cardImage} ${styles.imageSlider}`} 
                              ref={sliderRef}
                              onScroll={() => {
                                checkScrollPosition();
                                handleSliderScroll();
                              }}
                            >
                              {imageUrls.original.map((imageUrl, index) => (
                                <div key={index} className={styles.imageItem}>
                                  <img 
                                    src={imageUrl} 
                                    alt={`게시물 이미지 ${index + 1}`}
                                    loading="lazy"
                                  />
                                </div>
                              ))}
                            </div>
                            <button 
                              className={`${styles.sliderArrow} ${styles.right} ${!sliderState.canScrollRight ? styles.hidden : ''}`}
                              onClick={() => scrollSlider('right')}
                              aria-label="다음 이미지"
                            >
                              &gt;
                            </button>
                          </div>
                          <div className={styles.dotIndicator}>
                            {imageUrls.original.map((_, index) => (
                              <div
                                key={index}
                                className={`${styles.dot} ${index === currentSlideIndex ? styles.active : ''}`}
                                onClick={() => handleDotClick(index)}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* 위치 정보 */}
                  {post.location && (
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>상세 주소</label>
                      <div className={styles.locationInfo}>
                        <div className={styles.locationName}>{post.location.name}</div>
                        {post.location.address && (
                          <div className={styles.locationAddress}>{post.location.address}</div>
                        )}
                        <div className={styles.mapContainer}>
                          {!isGoogleMapsLoaded && (
                            <div className={styles.mapLoading}>
                              <div className={styles.loadingSpinner}></div>
                              <p>지도를 불러오는 중...</p>
                            </div>
                          )}
                          <div 
                            ref={mapRef}
                            className={styles.googleMap}
                            style={{ 
                              height: '200px',
                              width: '100%',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              display: isGoogleMapsLoaded ? 'block' : 'none'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 해시태그 */}
                  {post.hashtags && post.hashtags.length > 0 && (
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>해시태그</label>
                      <div className={styles.hashtags}>
                        {post.hashtags.join(' ')}
                      </div>
                    </div>
                  )}

                  {/* 상호작용 버튼들 */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>상호작용</label>
                    <div className={styles.interactionButtons}>
                      <button 
                        className={`${styles.actionBtn} ${isLiked ? styles.liked : ''}`}
                        onClick={handleLikeToggle}
                        disabled={isLoadingInteraction}
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
                      
                      <button 
                        className={`${styles.actionBtn} ${isBookmarked ? styles.bookmarked : ''}`}
                        onClick={handleBookmarkToggle}
                        disabled={isLoadingInteraction}
                      >
                        <span className={styles.actionIcon}>
                          <img 
                            src={isBookmarked ? "/icons/scrap_active.svg" : "/icons/scrap.svg"} 
                            alt={isBookmarked ? "스크랩 취소" : "스크랩"}
                            width="20"
                            height="20"
                          />
                        </span>
                        <span className={styles.actionCount}>{bookmarksCount}</span>
                      </button>
                      
                      <div className={styles.shareContainer}>
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
                        
                        {showShareMenu && (
                          <div className={styles.shareMenu}>
                            <button onClick={() => handleShare('copy')} className={styles.shareOption}>
                              📋 링크 복사
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
                      </div>
                    </div>
                  </div>

                  {/* 작성일 */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>작성일</label>
                    <div className={styles.dateInfo}>
                      {post.createdAt ? new Date(post.createdAt.toDate ? post.createdAt.toDate() : post.createdAt).toLocaleString('ko-KR') : '날짜 정보 없음'}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
        
        {/* Mobile Bottom Navigator */}
        <BottomNavigator />
      </ClientStyleProvider>
    
  );
}
