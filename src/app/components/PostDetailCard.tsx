'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { PostData } from '../services/postService';
import { useTranslationContext } from '../contexts/TranslationContext';
import { useAuthContext } from '../contexts/AuthContext';
import { toggleLike, checkLikeStatus } from './post-hooks/usePostInteractions';
import { translateText, LANGUAGE_CODES, LanguageCode } from '../services/translateService';
import styles from './PostDetailCard.module.css';
import { PostHeader } from './post-sections/PostHeader';
import { PostMedia } from './post-sections/PostMedia';
import { PostFooter } from './post-sections/PostFooter';
import { usePostLocationTranslations, buildImageUrls, formatPostDate } from './post-hooks/usePostData';

interface PostDetailCardProps {
  post: PostData;
  onInteractionChange?: (postId: string, type: 'like', isActive: boolean) => void;
}

export const PostDetailCard: React.FC<PostDetailCardProps> = ({ 
  post, 
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
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);
  

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
  // (슬라이더 상태 체크는 공통 미디어 섹션으로 위임)

  // 🚀 슬라이더 스크롤 함수 (useCallback으로 최적화)
  // (스크롤 로직 공통화)

  // 🚀 컴포넌트 마운트 시 스크롤 상태 초기화 (최적화된 의존성)
  // (초기화 로직 공통화)

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

  // 번역 핸들러
  const handleTranslate = useCallback(async () => {
    if (!post.content || isTranslating) return;

    try {
      setIsTranslating(true);
      
      // 현재 선택된 언어로 번역 (브라우저에서 선택된 언어)
      const targetLanguage = currentLanguage;
      
      const translated = await translateText(post.content, LANGUAGE_CODES[targetLanguage as LanguageCode]);
      setTranslatedText(translated);
      setShowTranslated(true);
    } catch (error) {
      console.error('번역 실패:', error);
      alert('번역 중 오류가 발생했습니다.');
    } finally {
      setIsTranslating(false);
    }
  }, [post.content, currentLanguage, isTranslating]);

  // 원문 보기 핸들러
  const handleShowOriginal = useCallback(() => {
    setShowTranslated(false);
  }, []);

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

  // 공통 미디어 섹션 데이터 구성
  const mediaImages = useMemo(() => mediaUrls.filter(m => m.type === 'image').map(m => ({ url: m.original })), [mediaUrls]);
  const mediaVideo = useMemo(() => {
    const vid = mediaUrls.find(m => m.type === 'video');
    return vid ? { url: vid.videoUrl || vid.original, thumbnail: vid.thumbnail } : null;
  }, [mediaUrls]);

  // (미디어 슬라이더는 공통 섹션 사용)

  return (
    <div className={styles.postDetailCard}>

      <PostHeader 
        styles={styles}
        post={post}
        showUserInfo={false}
        showSettings={false}
        translatePostLocation={() => ''}
      />

      <PostMedia 
        styles={styles}
        images={mediaImages}
        video={mediaVideo}
      />

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
                {showTranslated && translatedText ? translatedText : post.content}
              </span>
            )}
          </div>
          
          {/* 번역 버튼과 날짜 */}
          <div className={styles.postActions}>
            {/* 번역 버튼 */}
            {post.content && (
              <button 
                className={styles.translateBtn}
                onClick={showTranslated ? handleShowOriginal : handleTranslate}
                disabled={isTranslating}
              >
                {isTranslating ? '번역 중...' : (showTranslated ? '원문 보기' : '번역하기')}
              </button>
            )}
            
            {/* 글작성 날짜 - 오른쪽 정렬 */}
            <div className={styles.postDate}>
              {formatPostDate(post.createdAt, t)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
