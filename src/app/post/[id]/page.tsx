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
import { toggleLike, toggleBookmark, checkLikeStatus, checkBookmarkStatus } from '../../components/post-hooks/usePostInteractions';
import { PostDetailHeader } from './PostDetailHeader';
import { LocationInfoSection } from './LocationInfoSection';
import { usePostTranslation } from './usePostTranslation';
import { useLocationTranslation } from './useLocationTranslation';
import ClientStyleProvider from '../../components/ClientStyleProvider';
import { translateText, LANGUAGE_CODES, LanguageCode } from '../../services/translateService';

// 새로운 postcard 컴포넌트들
import { PostHeader } from '../postcard/PostHeader';
import { PostMedia } from '../postcard/PostMedia';
import { PostFooter } from '../postcard/PostFooter';
import { SameLocationPosts } from '../same-location/SameLocationPosts';
import { NearbyRestaurants } from '../nearby-restaurants/NearbyRestaurants';
import { CommentPopup } from '../comments/CommentPopup';
import { getCommentCount } from '../../services/commentService';

import styles from './page.module.css';
import postcardStyles from '../postcard/postcard.module.css';


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
    translatePostLocation: translatePostLocationRaw, 
    translatePaymentMethod 
  } = useLocationTranslation(post);
  
  // translatePostLocation 함수 래핑
  const translatePostLocation = useCallback(() => {
    if (!post?.location) return '';
    return translatePostLocationRaw(post.location);
  }, [post?.location, translatePostLocationRaw]);
  const [likesCount, setLikesCount] = useState(0);
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [isLoadingInteraction, setIsLoadingInteraction] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string>('');
  const [isContentTranslating, setIsContentTranslating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
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
        setCommentsCount(postData.comments || 0);
        
        // 댓글 수 가져오기
        try {
          const count = await getCommentCount(postId);
          setCommentsCount(count);
        } catch (error) {
          console.error('Failed to get comment count:', error);
        }

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

  // 이미지 URL 추출 및 미디어 데이터 준비
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
  
  // PostMedia용 이미지 데이터 준비
  const mediaImages = useMemo(() => {
    const images: Array<{url: string; isVideo: boolean; thumbnail?: string}> = post?.images?.map((img, index) => ({
      url: img.urls?.thumbnail || img.url,
      isVideo: false,
      thumbnail: undefined
    })) || [];
    
    // 비디오가 있으면 두 번째 위치에 삽입
    if (post?.video?.url) {
      const videoUrl = post.video.url; // HLS 스트리밍 URL (.m3u8)
      const videoThumbnail = post.video.urls?.thumbnail; // 썸네일 URL
      if (videoUrl && images.length > 0) {
        images.splice(1, 0, {
          url: videoUrl, // HLS 스트리밍 URL
          isVideo: true,
          ...(videoThumbnail && { thumbnail: videoThumbnail }) // 썸네일 URL
        });
      }
    }
    
    return images;
  }, [post?.images, post?.video]);

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
  
  // 프로필 클릭 핸들러
  const handleProfileClick = useCallback(() => {
    if (post?.userId) {
      router.push(`/profile?userId=${post.userId}`);
    }
  }, [post?.userId, router]);
  
  // 이미지 클릭 핸들러
  const handleImageClick = useCallback(() => {
    // 이미지 확대 모달 또는 갤러리 뷰 열기
    console.log('Image clicked');
  }, []);
  
  // 게시물 수정 핸들러
  const handleEdit = useCallback((postId: string) => {
    router.push(`/post-upload?edit=${postId}`);
  }, [router]);
  
  // 게시물 삭제 핸들러  
  const handleDelete = useCallback(async (postId: string) => {
    if (window.confirm('정말로 이 게시물을 삭제하시겠습니까?')) {
      // 삭제 로직 구현
      console.log('Delete post:', postId);
    }
  }, []);
  
  // 번역 토글 핸들러
  const handleToggleTranslate = useCallback(async () => {
    if (!post?.content || isContentTranslating) return;
    
    if (isTranslated) {
      // 원문으로 돌아가기
      setIsTranslated(false);
      setTranslatedContent('');
    } else {
      // 번역하기
      setIsContentTranslating(true);
      try {
        // translateService 사용하여 번역
        const targetLanguage = currentLanguage;
        const translated = await translateText(
          post.content, 
          LANGUAGE_CODES[targetLanguage as LanguageCode]
        );
        setTranslatedContent(translated);
        setIsTranslated(true);
      } catch (error) {
        console.error('번역 실패:', error);
        alert('번역 중 오류가 발생했습니다.');
      } finally {
        setIsContentTranslating(false);
      }
    }
  }, [post?.content, isTranslated, isContentTranslating, currentLanguage]);

  // 상대적 시간 계산 함수
  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return '방금 전';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}분 전`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}시간 전`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}일 전`;
    } else if (diffInSeconds < 31536000) {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `${weeks}주 전`;
    } else {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months}개월 전`;
    }
  };

  // 텍스트 자르기 및 더보기 버튼 생성 함수
  const getDisplayContent = (content: string, isExpanded: boolean) => {
    if (!content || content.length <= 100) {
      return content;
    }

    if (isExpanded) {
      return content;
    }

    // 3줄에 맞춰서 텍스트 자르기 (대략적인 계산)
    const maxLength = 100; // 3줄 정도의 길이
    const truncatedText = content.substring(0, maxLength);
    
    return truncatedText;
  };

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
                  {/* 새로운 PostHeader 컴포넌트 사용 */}
                  <PostHeader
                    post={post}
                    userInfo={userInfo || undefined}
                    showUserInfo={true}
                    showSettings={user?.uid === post.userId}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onProfileClick={handleProfileClick}
                    translatePostLocation={translatePostLocation}
                  />

                  <div className={styles.twoColumnLayout}>
                    {/* 왼쪽: 미디어 섹션 */}
                    <div className={styles.leftColumn}>
                      {/* PostMedia 컴포넌트 사용 */}
                      <PostMedia
                        images={mediaImages}
                        onClickImage={handleImageClick}
                        aboveTheFold={true}
                      />
                      
                      {/* PostFooter 컴포넌트 사용 - 좋아요와 공유 먼저 */}
                      <PostFooter
                        isLiked={isLiked}
                        likesCount={likesCount}
                        commentsCount={commentsCount}
                        isLoading={isLoadingInteraction}
                        showShareMenu={showShareMenu}
                        onToggleLike={handleLikeToggle}
                        onToggleShare={handleShareToggle}
                        onToggleComment={() => setShowCommentPopup(true)}
                        onShare={handleShare}
                      />
                      
                      {/* 컨텐츠 영역 */}
                      <div className={postcardStyles.postContentWrapper}>
                        <div className={postcardStyles.postContent}>
                          <p>
                            {isTranslated && translatedContent 
                              ? getDisplayContent(translatedContent, isExpanded)
                              : getDisplayContent(post.content, isExpanded)
                            }
                            {post.content && post.content.length > 100 && (
                              <>
                                {'...'}
                                <button 
                                  className={postcardStyles.expandButton}
                                  onClick={() => setIsExpanded(!isExpanded)}
                                >
                                  {isExpanded ? '접기' : '더보기'}
                                </button>
                              </>
                            )}
                          </p>
                        </div>
                        
                        {/* 번역 버튼과 날짜 - 같은 줄에 */}
                        <div className={postcardStyles.translateAndDateRow}>
                          <button 
                            className={postcardStyles.translateButton}
                            onClick={handleToggleTranslate}
                            disabled={isContentTranslating}
                          >
                            {isContentTranslating ? t('translating') : (isTranslated ? t('showOriginal') : t('translate'))}
                          </button>
                          <span className={postcardStyles.postDate}>
                            {post.createdAt ? getRelativeTime(post.createdAt.toDate ? post.createdAt.toDate() : post.createdAt) : ''}
                          </span>
                        </div>
                      </div>
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
              
              {/* 같은 위치의 다른 게시물들 */}
              {post?.location?.coordinates && (
                <SameLocationPosts
                  currentPostId={post.id || ''}
                  lat={post.location.coordinates.lat}
                  lng={post.location.coordinates.lng}
                />
              )}
              
              {/* 근처 추천 맛집 */}
              {post?.location?.coordinates && (
                <NearbyRestaurants
                  currentPostId={post.id || ''}
                  lat={post.location.coordinates.lat}
                  lng={post.location.coordinates.lng}
                />
              )}
            </div>

          </div>
        </div>
        
        {/* Mobile Bottom Navigator */}
        <BottomNavigator />
        
        {/* Comment Popup */}
        <CommentPopup
          postId={postId}
          isOpen={showCommentPopup}
          onClose={() => setShowCommentPopup(false)}
          onCommentCountUpdate={setCommentsCount}
        />
      </ClientStyleProvider>
    
  );
}