'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PostData } from '../services/postService';
import { useTranslationContext } from '../contexts/TranslationContext';
import { useAuthContext } from '../contexts/AuthContext';
import { toggleLike } from './post-hooks/usePostInteractions';
import { bunnyService } from '../services/bunnyService';
import styles from './PostCard.module.css';
import { PostHeader } from './post-sections/PostHeader';
import { PostMedia } from './post-sections/PostMedia';
import { PostFooter } from './post-sections/PostFooter';
import { usePostLocationTranslations, buildImageUrls, formatPostDate } from './post-hooks/usePostData';

interface PostCardProps {
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
  currentUser?: any; // 현재 로그인한 사용자 정보
  showUserInfo?: boolean; // user-info 표시 여부
  cardClassName?: string; // 각 페이지별 고유 클래스명
  onInteractionChange?: (postId: string, type: 'like', isActive: boolean) => void; // 상호작용 변경 콜백
  showSettings?: boolean; // 설정 메뉴 표시 여부
  onEdit?: (postId: string) => void; // 수정 콜백
  onDelete?: (postId: string) => void; // 삭제 콜백
  aboveTheFold?: boolean; // 최초 뷰포트 상단 영역 여부(이미지 우선 로드)
}

const PostCardComponent: React.FC<PostCardProps> = ({ 
  post, 
  userInfo = { name: '사용자', location: '위치 미상' },
  currentUser,
  showUserInfo = true,
  cardClassName = 'content-card', // 기본값은 기존 클래스명
  onInteractionChange,
  showSettings = false,
  onEdit,
  onDelete,
  aboveTheFold = false
}) => {
  const { t, currentLanguage } = useTranslationContext();
  const { user } = useAuthContext();
  const router = useRouter();

  // 🚀 성능 최적화: 디버깅 로그 제거

  // 🚀 좋아요 토글을 위한 로컬 상태 (낙관적 업데이트용)
  const [localIsLiked, setLocalIsLiked] = useState<boolean | null>(null);
  
  // 🚀 가장 빠른 방법: 서버에서 미리 계산된 값 사용!
  // 인증 대기 없이 초기 좋아요 상태 계산 (early uid 선반영)
  const earlyUid: string | undefined = typeof window !== 'undefined'
    ? (JSON.parse(localStorage.getItem('tripjoy_user') || 'null')?.uid as string | undefined)
    : undefined;
  const isLiked = localIsLiked !== null ? localIsLiked : 
    (post.isLikedByCurrentUser !== undefined ? post.isLikedByCurrentUser : 
     (earlyUid && post.likedBy?.[earlyUid]) ||
     (currentUser?.uid && post.likedBy?.[currentUser.uid]) || 
     (user?.uid && post.likedBy?.[user.uid]) || false);
  const [likesCount, setLikesCount] = useState(post.likeCount || 0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const isMountedRef = useRef(true);

  // 🚀 사용자 정보가 로드되면 즉시 좋아요 상태 업데이트
  useEffect(() => {
    const activeUser = currentUser || user;
    if (activeUser?.uid && post.likedBy) {
      const hasLiked = activeUser.uid in post.likedBy && post.likedBy[activeUser.uid] !== null;
      if (localIsLiked === null) {
        setLocalIsLiked(hasLiked);
      }
    }
  }, [currentUser?.uid, user?.uid, post.likedBy, localIsLiked]);

  
  // 위치 번역 훅 (공통 데이터 로딩/번역)
  const { translatePostLocation } = usePostLocationTranslations(currentLanguage, post.location?.nationality);

  // translatePostLocation은 훅에서 제공됨

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

  // 🚀 이미지 URL 정리 (공통 유틸)
  const imageUrls = useMemo(() => buildImageUrls(post.images as any), [post.images]);


  // (슬라이더 로직은 PostMedia로 이동)

  // 🚀 첫 이미지 초저해상 프리로드 (LQIP 느낌)
  useEffect(() => {
    if (imageUrls.length > 0) {
      const firstImageUrl = `${imageUrls[0]}?width=60&height=60&fit=cover&quality=30`;
      bunnyService.preloadImages([firstImageUrl]).catch(() => {});
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

  // 좋아요 토글 핸들러
  const handleLikeToggle = useCallback(async () => {
    if (!user || !post.id || isLoading) return;
    
    setIsLoading(true);
    
    // 낙관적 업데이트 (UI 반응성을 위해)
    const optimisticIsLiked = !isLiked;
    setLocalIsLiked(optimisticIsLiked);
    
    try {
      const result = await toggleLike(post.id, user.uid);
      // 서버 응답으로 최종 상태 업데이트 (서버가 진실의 원천)
      setLocalIsLiked(result.isLiked);
      setLikesCount(result.newCount);
      
      // 콜백 호출 (상위 컴포넌트에 상태 변경 알림)
      if (onInteractionChange && post.id) {
        onInteractionChange(post.id, 'like', result.isLiked);
      }
    } catch (error) {
      console.error('좋아요 토글 실패:', error);
      // 에러 발생 시 원래 상태로 복원
      setLocalIsLiked(null); // 로컬 상태 초기화하여 원래 상태로 복원
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

  // (indicator/scroll 핸들러는 PostMedia 내부로 위임)


  // 프로필 클릭 핸들러 (프로필 페이지로 이동)
  const handleProfileClick = useCallback(() => {
    if (post.userId) {
      router.push(`/profile?userId=${post.userId}`);
    }
  }, [post.userId, router]);



  // 날짜 포맷팅 (더 안전한 처리)
  const formatDate = (timestamp: any) => {
    console.log('🔍 formatDate 입력값:', timestamp, '타입:', typeof timestamp);
    
    if (!timestamp) {
      console.log('❌ timestamp가 없음');
      return t('justNow') || '방금 전';
    }
    
    let date: Date;
    
    try {
      // Firebase Timestamp 객체인 경우
      if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
        console.log('📅 Firebase Timestamp로 변환:', date);
      }
      // toDate() 메서드가 있는 경우 (Firestore Timestamp)
      else if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
        console.log('📅 toDate() 메서드로 변환:', date);
      }
      // 이미 Date 객체인 경우
      else if (timestamp instanceof Date) {
        date = timestamp;
        console.log('📅 이미 Date 객체:', date);
      }
      // 숫자 타임스탬프인 경우
      else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
        console.log('📅 숫자 타임스탬프로 변환:', date);
      }
      // 문자열인 경우
      else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
        console.log('📅 문자열로 변환:', date);
      }
      else {
        console.warn('❌ 알 수 없는 타임스탬프 형식:', timestamp);
        return t('justNow') || '방금 전';
      }
      
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        console.warn('❌ 유효하지 않은 날짜:', timestamp);
        return t('justNow') || '방금 전';
      }
      
    } catch (error) {
      console.error('❌ 날짜 변환 오류:', error, timestamp);
      return t('justNow') || '방금 전';
    }
    
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    console.log('📊 날짜 차이:', diffDays, '일');
    
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

  // 공통 미디어 섹션에 전달할 데이터 구성
  const mediaImages = useMemo(() => imageUrls.map(url => ({ url })), [imageUrls]);
  // 이미지가 많은 카드에서 첫 장만 먼저 렌더하도록 슬라이스 (초기 페인트)
  const fastImages = useMemo(() => {
    return aboveTheFold ? mediaImages : mediaImages.slice(0, 1);
  }, [mediaImages, aboveTheFold]);

  return (
    <div className={styles[cardClassName] || styles.contentCard}>
      <PostHeader 
        styles={styles}
        post={post}
        userInfo={userInfo}
        showUserInfo={showUserInfo}
        showSettings={showSettings}
        onEdit={onEdit}
        onDelete={onDelete}
        onProfileClick={handleProfileClick}
        translatePostLocation={translatePostLocation}
      />

      <PostMedia 
        styles={styles}
        images={fastImages}
        onClickImage={handleImageClick}
        aboveTheFold={aboveTheFold}
      />

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

// 🚀 원래 방식으로 복원
export const PostCard = PostCardComponent;
