'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Hls from 'hls.js';
import { useRouter, useSearchParams } from 'next/navigation';
import { PostData, getPosts } from '../services/postService';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useTranslationContext } from '../contexts/TranslationContext';
import { AppBar } from '../components/AppBar';
import { BottomNavigator } from '../components/BottomNavigator';
import { filterPostsByLocation, filterVideoPosts } from './shortsLogic';
import styles from './shorts.module.css';

function ShortsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslationContext();
  
  const [allPosts, setAllPosts] = useState<PostData[]>([]);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [userInfoCache, setUserInfoCache] = useState<Record<string, any>>({});
  const [containerHeight, setContainerHeight] = useState('100vh');
  const [showPlayButton, setShowPlayButton] = useState(false);
  
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const safePlay = React.useCallback((el: HTMLVideoElement) => {
    el.play().catch((err: any) => {
      if (err?.name !== 'AbortError' && err?.name !== 'NotAllowedError') {
        console.error(err);
      }
    });
  }, []);

  // 비디오 게시물만 필터링
  const videoPosts = filterVideoPosts(posts);

  // 앱바와 바텀 높이 계산
  useEffect(() => {
    const calculateHeight = () => {
      if (typeof window !== 'undefined') {
        // 앱바와 바텀 네비게이터 요소 찾기
        const appBar = document.querySelector('[data-testid="app-bar"]') || 
                      document.querySelector('.app-bar') ||
                      document.querySelector('header') ||
                      document.querySelector('[role="banner"]') ||
                      document.querySelector('nav[data-testid="app-bar"]');
        
        const bottomNav = document.querySelector('[data-testid="bottom-navigator"]') || 
                          document.querySelector('.bottom-navigator') ||
                          document.querySelector('nav[role="navigation"]') ||
                          document.querySelector('footer');
        
        let appBarHeight = 0;
        let bottomHeight = 0;
        
        // 앱바 높이 계산 - 실제 높이를 정확히 측정
        if (appBar) {
          const rect = appBar.getBoundingClientRect();
          appBarHeight = rect.height;
          console.log('AppBar found:', appBar, 'Height:', appBarHeight);
        } else {
          // 앱바 기본 높이: 모바일 60px, PC 75px (CSS에서 확인)
          appBarHeight = window.innerWidth <= 768 ? 60 : 75;
          console.log('AppBar not found, using default:', appBarHeight);
        }
        
        // 바텀 네비게이터 높이 계산 - 실제 높이를 정확히 측정
        if (bottomNav) {
          const rect = bottomNav.getBoundingClientRect();
          bottomHeight = rect.height;
          console.log('BottomNav found:', bottomNav, 'Height:', bottomHeight);
        } else {
          // 바텀 네비게이터 기본 높이: 60px (CSS에서 확인)
          bottomHeight = 60;
          console.log('BottomNav not found, using default:', bottomHeight);
        }
        
        // 모든 브라우저에서 동적으로 높이 계산
        if (window.innerWidth <= 768) {
          // 모바일: 바텀만 제외 (앱바 숨김)
          const mobileBottomHeight = 60; // 모바일 바텀 높이
          const availableHeight = window.innerHeight - mobileBottomHeight;
          console.log('Mobile - Window height:', window.innerHeight, 'Bottom height:', mobileBottomHeight, 'Available height:', availableHeight);
          setContainerHeight(`${availableHeight}px`);
        } else {
          // PC: 앱바만 제외
          const availableHeight = window.innerHeight - appBarHeight;
          console.log('PC - Window height:', window.innerHeight, 'AppBar height:', appBarHeight, 'Available height:', availableHeight);
          setContainerHeight(`${availableHeight}px`);
        }
      }
    };

    // 초기 계산
    calculateHeight();
    
    // 리사이즈 이벤트 리스너
    window.addEventListener('resize', calculateHeight);
    
    // 컴포넌트가 마운트된 후 다시 계산
    const timer1 = setTimeout(calculateHeight, 100);
    const timer2 = setTimeout(calculateHeight, 500);
    const timer3 = setTimeout(calculateHeight, 1000);
    
    return () => {
      window.removeEventListener('resize', calculateHeight);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        
        // 🚀 가장 빠른 방법: 게시물과 사용자 정보를 동시에!
        const [allPostsData, userInfoMap] = await Promise.all([
          // 게시물 로드 (현재 사용자 ID 포함)
          getPosts(50, undefined, undefined), // shorts는 사용자 인증 없이도 접근 가능
          
          // 사용자 정보 로드 (게시물과 동시에!)
          (async () => {
            try {
              const usersSnapshot = await getDocs(collection(db, 'users'));
              const userMap: Record<string, any> = {};
              usersSnapshot.forEach((doc) => {
                userMap[doc.id] = doc.data();
              });
              return userMap;
            } catch (error) {
              console.error('사용자 정보 로드 실패:', error);
              return {};
            }
          })()
        ]);
        
        const videoOnlyPosts = filterVideoPosts(allPostsData);
        
        // 전체 비디오 게시물 저장
        setAllPosts(videoOnlyPosts);
        
        // URL에서 초기 인덱스가 있으면 해당 게시물 기준으로 필터링
        const initialIndex = searchParams.get('index');
        let filteredPosts = videoOnlyPosts;
        
        if (initialIndex) {
          const index = parseInt(initialIndex, 10);
          if (index >= 0 && index < videoOnlyPosts.length) {
            const referencePost = videoOnlyPosts[index];
            filteredPosts = filterPostsByLocation(videoOnlyPosts, referencePost);
            setCurrentIndex(0); // 필터링된 결과에서 첫 번째로 설정
          }
        } else {
          // 초기 인덱스가 없으면 첫 번째 게시물 기준으로 필터링
          filteredPosts = filterPostsByLocation(videoOnlyPosts);
        }
        
        setPosts(filteredPosts);
        setUserInfoCache(userInfoMap);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [searchParams]);

  // 현재 비디오 재생/일시정지
  useEffect(() => {
    // 모든 비디오 일시정지 (현재 비디오는 즉시 재생 시도하지 않음)
    Object.keys(videoRefs.current).forEach(postId => {
      const video = videoRefs.current[postId];
      if (video) {
        video.pause();
      }
    });

    const currentVideo = videoRefs.current[videoPosts[currentIndex]?.id || ''];
    if (!currentVideo) return;
    if (isPaused) {
      currentVideo.pause();
      return;
    }
    // 소스가 붙어 있고 재생 가능 상태면 안전 재생
    if (currentVideo.readyState >= 2) {
      safePlay(currentVideo);
    }
  }, [currentIndex, videoPosts, isPaused, safePlay]);

  const handleScroll = (direction: 'up' | 'down') => {
    if (direction === 'up' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === 'down' && currentIndex < videoPosts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (direction === 'down' && currentIndex === videoPosts.length - 1) {
      // 마지막 영상에 도달했을 때, 같은 위치의 다른 영상이 있는지 확인
      const currentPost = videoPosts[currentIndex];
      if (currentPost) {
        const sameLocationPosts = filterPostsByLocation(allPosts, currentPost);
        const remainingPosts = sameLocationPosts.filter(post => 
          !videoPosts.some(videoPost => videoPost.id === post.id)
        );
        
        if (remainingPosts.length > 0) {
          console.log(`🔄 같은 위치의 추가 영상 ${remainingPosts.length}개 발견, 목록에 추가`);
          setPosts(prev => [...prev, ...remainingPosts]);
        }
      }
    }
  };

  const handleVideoClick = () => {
    setIsPaused(!isPaused);
    // 터치 피드백을 위해 잠시 버튼 표시
    setShowPlayButton(true);
    setTimeout(() => setShowPlayButton(false), 1000);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const startY = e.touches[0].clientY;
    const startTime = Date.now();
    
    const handleTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0].clientY;
      const endTime = Date.now();
      const diff = startY - endY;
      const duration = endTime - startTime;
      
      // 짧은 터치 (클릭)인 경우 일시정지 토글
      if (duration < 300 && Math.abs(diff) < 30) {
        handleVideoClick();
        document.removeEventListener('touchend', handleTouchEnd);
        return;
      }
      
      // 스와이프인 경우
      if (Math.abs(diff) > 50) { // 최소 스와이프 거리
        if (diff > 0) {
          handleScroll('down');
        } else {
          handleScroll('up');
        }
      }
      
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchend', handleTouchEnd);
  };

  // PC에서 마우스 휠 이벤트 처리
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    // 휠을 위로 올리면 다음 영상 (down)
    // 휠을 아래로 내리면 이전 영상 (up)
    if (e.deltaY < 0) {
      handleScroll('down');
    } else if (e.deltaY > 0) {
      handleScroll('up');
    }
  };

  const getVideoThumbnail = (post: PostData) => {
    if (post.video?.urls?.thumbnail) {
      return post.video.urls.thumbnail;
    }
    return post.video?.url || '';
  };

  const getVideoUrl = (post: PostData) => {
    return post.video?.urls?.original || post.video?.url || '';
  };

  // 현재 인덱스 비디오에 HLS 붙이기 (중복 초기화/AbortError 방지)
  const hlsRef = useRef<Hls | null>(null);
  const attachedIdRef = useRef<string | null>(null);
  useEffect(() => {
    const post = videoPosts[currentIndex];
    if (!post) return;
    const url = getVideoUrl(post);
    const videoEl = videoRefs.current[post.id || ''];
    if (!videoEl || !url) return;
    // 동일 영상에 중복 부착 방지
    if (attachedIdRef.current === post.id) return;
    // 이전 정리
    try {
      videoEl.pause();
      videoEl.removeAttribute('src');
      videoEl.load();
    } catch {}
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    let hls: Hls | null = null;
    const isHls = url.endsWith('.m3u8');

    if (isHls) {
      if (Hls.isSupported()) {
        hls = new Hls({ maxBufferLength: 10 });
        hls.loadSource(url);
        hls.attachMedia(videoEl);
        hlsRef.current = hls;
      } else if (videoEl.canPlayType('application/vnd.apple.mpegURL')) {
        videoEl.src = url;
      }
    } else {
      videoEl.src = url;
    }
    attachedIdRef.current = post.id || null;

    const onCanPlay = () => {
      if (!isPaused) safePlay(videoEl);
    };
    videoEl.addEventListener('canplay', onCanPlay, { once: true } as any);
    // microtask로 한 번 더 시도
    setTimeout(() => { if (!isPaused) safePlay(videoEl); }, 0);

    return () => {
      // cleanup은 다음 부착 시 선행 정리에서 처리
      videoEl.removeEventListener('canplay', onCanPlay as any);
    };
  }, [currentIndex, videoPosts, isPaused, safePlay]);

  // 모바일에서는 앱바 숨김
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  if (isLoading) {
    return (
      <>
        {!isMobile && <AppBar />}
        <div className={styles.pageContainer} style={{ height: containerHeight }}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
          </div>
        </div>
        <BottomNavigator />
      </>
    );
  }

  if (videoPosts.length === 0) {
    return (
      <>
        {!isMobile && <AppBar />}
        <div className={styles.pageContainer} style={{ height: containerHeight }}>
          <div className={styles.noVideos}>
            <h2>동영상이 없습니다</h2>
            <button onClick={() => router.back()} className={styles.backButton}>
              뒤로 가기
            </button>
          </div>
        </div>
        <BottomNavigator />
      </>
    );
  }

  const currentPost = videoPosts[currentIndex];
  const currentUser = userInfoCache[currentPost?.userId || ''];

  return (
    <>
      {!isMobile && <AppBar />}
      <div className={styles.pageContainer} style={{ height: containerHeight }}>
        <div className={styles.shortsContainer}>
        <div className={styles.header}>
          <button 
            onClick={() => router.back()} 
            className={styles.backButton}
          >
            ←
          </button>
          <h1>동영상</h1>
        </div>
        
        <div className={styles.contentWrapper} style={{ height: containerHeight }}>
          <div 
            className={styles.videoContainer}
            onTouchStart={handleTouchStart}
            onWheel={handleWheel}
            onClick={handleVideoClick}
            ref={containerRef}
          >
            <div 
              className={styles.videoStack}
              style={{ 
                transform: `translateY(-${currentIndex * 100}%)`,
                transition: 'transform 0.3s ease-out'
              }}
            >
              {videoPosts.map((post, index) => (
                <div key={post.id} className={styles.videoWrapper}>
                  <video
                    ref={(el) => {
                      if (post.id) {
                        videoRefs.current[post.id] = el;
                      }
                    }}
                    className={styles.video}
                    poster={getVideoThumbnail(post)}
                    preload="metadata"
                    muted
                    loop
                    playsInline
                    autoPlay={index === currentIndex}
                  />
                  {/* 터치 피드백 버튼 */}
                  {showPlayButton && index === currentIndex && (
                    <div className={styles.playButton}>
                      {isPaused ? (
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                          <path d="M8 5v14l11-7z" fill="white"/>
                        </svg>
                      ) : (
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" fill="white"/>
                        </svg>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
        
        <div className={styles.contentOverlay}>
          <div className={styles.postInfo}>
            <h2 className={styles.postTitle}>{currentPost?.content || '제목 없음'}</h2>
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                {currentUser?.profileImage ? (
                  <img 
                    src={currentUser.profileImage} 
                    alt={currentUser.name || 'User'} 
                  />
                ) : (
                  <div className={styles.defaultAvatar}>
                    {(currentUser?.name || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{currentUser?.name || '익명'}</span>
                <span className={styles.userLocation}>
                  {currentPost?.location?.countryName || ''} {currentPost?.location?.cityName || ''}
                </span>
              </div>
            </div>
          </div>
          
          <div className={styles.actions}>
            <button className={styles.actionButton}>
              <span>❤️</span>
              <span>좋아요</span>
            </button>
            <button className={styles.actionButton}>
              <span>💬</span>
              <span>댓글</span>
            </button>
            <button className={styles.actionButton}>
              <span>📤</span>
              <span>공유</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className={styles.navigation}>
        <button 
          onClick={() => handleScroll('up')}
          disabled={currentIndex === 0}
          className={styles.navButton}
        >
          ↑
        </button>
        <span className={styles.indexIndicator}>
          {currentIndex + 1} / {videoPosts.length}
        </span>
        <button 
          onClick={() => handleScroll('down')}
          disabled={currentIndex === videoPosts.length - 1}
          className={styles.navButton}
        >
          ↓
        </button>
          </div>
        </div>
        </div>
      </div>
      <BottomNavigator />
    </>
  );
}

export default function ShortsPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#000',
        color: 'white'
      }}>
        <div>Loading...</div>
      </div>
    }>
      <ShortsContent />
    </Suspense>
  );
}
