'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PostData, getPostsByLocation } from '../../services/postService';
import { getUserById } from '../../auth/services/authService';
import { PostCard } from '../../dashboard/postcard/PostCard';
import { useTranslationContext } from '../../contexts/TranslationContext';
import styles from './SameLocationPosts.module.css';

interface SameLocationPostsProps {
  currentPostId: string;
  lat: number;
  lng: number;
}

export const SameLocationPosts: React.FC<SameLocationPostsProps> = ({
  currentPostId,
  lat,
  lng
}) => {
  const { t } = useTranslationContext();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [userInfoCache, setUserInfoCache] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  
  // 모바일 체크
  useEffect(() => {
    const checkMobile = () => {
      const wasMobile = isMobile;
      const nowMobile = window.innerWidth <= 768;
      setIsMobile(nowMobile);
      
      // 모바일/PC 전환 시 페이지 리셋
      if (wasMobile !== nowMobile) {
        setCurrentPage(0);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobile]);
  
  // 모바일과 PC에서 다른 페이지당 카드 수
  const postsPerPage = isMobile ? 1 : 2;

  // 같은 위치의 게시물 로드
  useEffect(() => {
    const loadSameLocationPosts = async () => {
      try {
        setIsLoading(true);
        
        // 같은 위도/경도의 게시물 가져오기
        const allPosts = await getPostsByLocation(lat, lng);
        
        // 현재 게시물 제외
        const filteredPosts = allPosts.filter(post => post.id !== currentPostId);
        
        if (filteredPosts.length === 0) {
          setPosts([]);
          setIsLoading(false);
          return;
        }
        
        // 사용자 정보 로드
        const userIds = [...new Set(filteredPosts.map(post => post.userId))];
        const userInfoPromises = userIds.map(userId => 
          getUserById(userId).then(info => ({ userId, info }))
        );
        
        const userInfoResults = await Promise.all(userInfoPromises);
        const userCache: Record<string, any> = {};
        userInfoResults.forEach(({ userId, info }) => {
          if (info) userCache[userId] = info;
        });
        
        setPosts(filteredPosts);
        setUserInfoCache(userCache);
      } catch (error) {
        console.error('Error loading same location posts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSameLocationPosts();
  }, [currentPostId, lat, lng]);

  // 페이지 변경 시 스크롤
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const cards = container.querySelectorAll(`.${styles.postItem}`);
    
    if (cards.length > 0) {
      // 실제 카드 요소의 너비를 가져옴
      const firstCard = cards[0] as HTMLElement;
      const cardWidth = firstCard.offsetWidth;
      const gap = 20; // CSS에서 설정한 gap 값
      
      // 현재 페이지의 첫 번째 카드 위치로 스크롤
      const cardsToScroll = currentPage * postsPerPage;
      const scrollPosition = cardsToScroll * (cardWidth + gap);
      
      container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  }, [currentPage, postsPerPage, posts]); // isMobile 제거하고 posts 추가

  // 총 페이지 수 계산
  const totalPages = Math.ceil(posts.length / postsPerPage);

  // 페이지 인디케이터 클릭 핸들러
  const handlePageClick = useCallback((pageIndex: number) => {
    setCurrentPage(pageIndex);
  }, []);

  // 이전/다음 페이지 핸들러
  const handlePrevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  }, [totalPages]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>{t('sameLocationPosts')}</h2>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return null; // 같은 위치의 다른 게시물이 없으면 섹션 자체를 표시하지 않음
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t('sameLocationPosts')}</h2>
      
      <div className={styles.postsWrapper}>
        {/* 게시물 슬라이더 */}
        <div 
          ref={scrollContainerRef}
          className={styles.postsSlider}
        >
          {posts.map((post) => (
            <div 
              key={post.id} 
              className={styles.postItem}
              style={{ overflow: 'hidden' }}
            >
              <PostCard
                post={post}
                userInfo={userInfoCache[post.userId]}
                showUserInfo={true}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 페이지 인디케이터 */}
      {totalPages > 1 && (
        <div className={styles.pageIndicator}>
          {/* 이전 화살표 */}
          <button
            className={styles.pageArrow}
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            aria-label="이전 페이지"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* 페이지 점들 - 최대 5개까지만 표시 */}
          {(() => {
            const maxDots = 5;
            let startPage = 0;
            let endPage = totalPages;
            
            if (totalPages > maxDots) {
              // 현재 페이지를 중심으로 5개 표시
              startPage = Math.max(0, currentPage - 2);
              endPage = Math.min(totalPages, startPage + maxDots);
              
              // 끝에 도달했을 때 조정
              if (endPage - startPage < maxDots) {
                startPage = Math.max(0, endPage - maxDots);
              }
            }
            
            return Array.from({ length: endPage - startPage }, (_, i) => {
              const pageIndex = startPage + i;
              return (
                <button
                  key={pageIndex}
                  className={`${styles.pageDot} ${pageIndex === currentPage ? styles.pageDotActive : ''}`}
                  onClick={() => handlePageClick(pageIndex)}
                  aria-label={`페이지 ${pageIndex + 1}`}
                />
              );
            });
          })()}

          {/* 다음 화살표 */}
          <button
            className={styles.pageArrow}
            onClick={handleNextPage}
            disabled={currentPage === totalPages - 1}
            aria-label="다음 페이지"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default SameLocationPosts;
