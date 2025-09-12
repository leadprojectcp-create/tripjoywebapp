'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { AppBar } from '../../components/AppBar';
import { BottomNavigator } from '../../components/BottomNavigator';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTranslationContext } from '../../contexts/TranslationContext';
import { useUnreadMessageCount } from '../../hooks/useUnreadMessageCount';

import { PostDetailCard } from '../../components/PostDetailCard';
import { getPostById, PostData } from '../../services/postService';
import { getUserById } from '../../auth/services/authService';
import { toggleLike, toggleBookmark, checkLikeStatus, checkBookmarkStatus } from '../../services/interactionService';
import { PostDetailHeader } from './PostDetailHeader';
import { LocationInfoSection } from './LocationInfoSection';
import { usePostTranslation } from './usePostTranslation';
import { useLocationTranslation } from './useLocationTranslation';
import ClientStyleProvider from '../../components/ClientStyleProvider';
import styles from './page.module.css';


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
  const { t, currentLanguage } = useTranslationContext();
  const unreadMessageCount = useUnreadMessageCount();
  
  const [post, setPost] = useState<PostData | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 상호작용 상태
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  // 커스텀 훅 사용
  const { 
    translatedBusinessHours, 
    translatedRecommendedMenu, 
    translatedAddress, 
    isTranslating 
  } = usePostTranslation(post);
  
  const { 
    translatePostLocation, 
    translatePaymentMethod 
  } = useLocationTranslation(post);
  const [likesCount, setLikesCount] = useState(0);
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isLoadingInteraction, setIsLoadingInteraction] = useState(false);
  
  // 이미지 슬라이더 상태
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [sliderState, setSliderState] = useState({ canScrollLeft: false, canScrollRight: true });
  const sliderRef = useRef<HTMLDivElement | null>(null);
  


  const postId = params.id as string;


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


  const handleBackClick = () => {
    router.back();
  };

  // 상호작용 변경 핸들러
  const handleInteractionChange = useCallback((postId: string, type: 'like', isActive: boolean) => {
    if (type === 'like') {
      setIsLiked(isActive);
    }
  }, []);

  return (
    
      <ClientStyleProvider>
        <div className={styles.container}>
          {/* Top AppBar */}
          <AppBar 
            title="게시물 상세"
            showBackButton={true}
            showLogo={false}
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
                  {/* 카드 헤더 - 전체 넓이 사용 */}
                  <PostDetailHeader userInfo={userInfo ? {
                    id: userInfo.name || '',
                    email: '',
                    name: userInfo.name || '',
                    photoUrl: userInfo.photoUrl || userInfo.profileImage || '',
                    phoneNumber: '',
                    signupMethod: 'email',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    birthDate: userInfo.birthDate || '',
                    gender: userInfo.gender || '',
                    location: userInfo.location || '',
                    loginType: 'email',
                    lastLoginAt: new Date().toISOString(),
                    points: 0,
                    usage_count: 0,
                    language: 'ko',
                    consents: {
                      termsOfService: false,
                      personalInfo: false,
                      locationInfo: false,
                      marketing: false,
                      thirdParty: false
                    },
                    lastUpdated: new Date().toISOString()
                  } : null} />

                  <div className={styles.twoColumnLayout}>
                    {/* 왼쪽: PostDetailCard - 9:16 비율 */}
                    <div className={styles.leftColumn}>
                      <PostDetailCard 
                        post={post}
                        onInteractionChange={handleInteractionChange}
                      />
                    </div>

                    {/* 오른쪽: 기존 상세 정보들 */}
                    <div className={styles.rightColumn}>
                      <LocationInfoSection 
                        post={post}
                        translatedBusinessHours={translatedBusinessHours}
                        translatedRecommendedMenu={translatedRecommendedMenu}
                        translatedAddress={translatedAddress}
                        translatePaymentMethod={translatePaymentMethod}
                        translatePostLocation={translatePostLocation}
                      />
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