"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AppBar } from "../components/AppBar";
import { BottomNavigator } from "../components/BottomNavigator";
import { useAuthContext } from "../contexts/AuthContext";
import { useTranslationContext } from "../contexts/TranslationContext";
import { useUnreadMessageCount } from "../hooks/useUnreadMessageCount";
import { getPosts, PostData, getPostsByCountry, getPostsByCity } from "../services/postService";
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { db } from "../services/firebase";
import CountryAndCitySelector, { CountryAndCitySelectorRef } from "../components/CountryAndCitySelector";
import { PostCard } from "./postcard/PostCard";
import { BannerSlider } from "./banner";
const DynamicVideoSection = dynamic(() => import("./postcard/VideoSection").then(m => m.VideoSection), {
  ssr: false,
  loading: () => <div style={{ height: 220 }} />
});
import styles from "./style.module.css";

export default function Dashboard() {
  const router = useRouter();
  const { 
    user,
    isAuthenticated,
    isLoading: authLoading
  } = useAuthContext();
  // 인증 완료를 기다리지 않고 선렌더링을 위해 localStorage에 저장된 uid를 즉시 활용
  const earlyUid: string | undefined = typeof window !== 'undefined'
    ? (JSON.parse(localStorage.getItem('tripjoy_user') || 'null')?.uid as string | undefined)
    : undefined;
  
  const { t, currentLanguage } = useTranslationContext();
  const unreadMessageCount = useUnreadMessageCount();

  // 게시물 상태 관리
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfoCache, setUserInfoCache] = useState<Record<string, any>>({});
  const [visibleCount, setVisibleCount] = useState<number>(4);
  const [showVideoSection, setShowVideoSection] = useState<boolean>(false);
  const videoSentinelRef = useRef<HTMLDivElement | null>(null);
  
  // 필터링 상태 관리 (초기값을 로컬스토리지에서 즉시 복원)
  const [selectedCountry, setSelectedCountry] = useState(
    typeof window !== 'undefined' ? (localStorage.getItem('dashboard_selectedCountry') || '') : ''
  );
  const [selectedCity, setSelectedCity] = useState(
    typeof window !== 'undefined' ? (localStorage.getItem('dashboard_selectedCity') || '') : ''
  );
  
  // 위치 선택 관련 (텍스트도 즉시 복원)
  const [locationText, setLocationText] = useState(
    typeof window !== 'undefined' ? (localStorage.getItem('dashboard_locationText') || '') : ''
  );
  const countryCitySelectorRef = useRef<CountryAndCitySelectorRef>(null);

  // 초기 복원 useEffect 제거 (상태 초기화에서 복원)

  useEffect(() => {
    if (!isLoading && posts.length > 4) {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        // @ts-ignore
        window.requestIdleCallback(() => setVisibleCount(Math.min(8, posts.length)));
      } else {
        setTimeout(() => setVisibleCount(Math.min(8, posts.length)), 0);
      }
    } else if (!isLoading) {
      setVisibleCount(posts.length);
    }
  }, [isLoading, posts]);

  useEffect(() => {
    if (!videoSentinelRef.current || showVideoSection) return;
    const el = videoSentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setShowVideoSection(true);
          io.disconnect();
        }
      });
    }, { rootMargin: "200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [showVideoSection]);

  // AppBar에서 지역 선택 이벤트 수신
  useEffect(() => {
    const handleLocationSelectionChanged = (event: CustomEvent) => {
      const { countryCode, cityCode } = event.detail;
      console.log('대시보드에서 AppBar 지역 선택 이벤트 수신:', { countryCode, cityCode });
      
      // 대시보드의 지역 선택 상태 업데이트
      setSelectedCountry(countryCode);
      setSelectedCity(cityCode);
      
      // 로컬 스토리지에 저장
      localStorage.setItem('dashboard_selectedCountry', countryCode);
      localStorage.setItem('dashboard_selectedCity', cityCode);
    };

    window.addEventListener('locationSelectionChanged', handleLocationSelectionChanged as EventListener);
    
    return () => {
      window.removeEventListener('locationSelectionChanged', handleLocationSelectionChanged as EventListener);
    };
  }, []);
  
  // 🚀 게시물 먼저 로드 후 필요한 사용자만 병렬 조회 (user?.uid 변화에 재호출되지 않도록 고정)
  useEffect(() => {
    let aborted = false;
    const loadPostsWithUsers = async () => {
      setIsLoading(true);
      try {
        let postsData: PostData[] = [];
        if (selectedCity) {
          postsData = await getPostsByCity(selectedCountry, selectedCity, 8, earlyUid);
        } else if (selectedCountry) {
          postsData = await getPostsByCountry(selectedCountry, 8, earlyUid);
        } else {
          postsData = await getPosts(8, undefined, earlyUid);
        }
        if (aborted) return;
        setPosts(postsData);

        // 1) 우선 화면에 보이는 상단 N개의 작성자만 빠르게 조회
        const INITIAL_COUNT = 4;
        const initialAuthorIds = Array.from(new Set(
          postsData.slice(0, INITIAL_COUNT).map(p => p.userId).filter(Boolean)
        ));
        const initialUserMap: Record<string, any> = { ...userInfoCache };
        await Promise.all(initialAuthorIds.map(async (uid) => {
          if (initialUserMap[uid]) return; // 캐시된 경우 생략
          try {
            const snap = await getDoc(doc(db, 'users', uid));
            if (snap.exists()) initialUserMap[uid] = snap.data();
          } catch {}
        }));
        if (aborted) return;
        setUserInfoCache(initialUserMap);
        setIsLoading(false); // 상단 영역 먼저 노출

        // 2) 나머지 작성자 정보는 백그라운드로 채우기
        const remainingAuthorIds = Array.from(new Set(
          postsData.map(p => p.userId).filter(Boolean)
        )).filter(uid => !initialAuthorIds.includes(uid));
        if (remainingAuthorIds.length > 0) {
          const restMap: Record<string, any> = {};
          await Promise.all(remainingAuthorIds.map(async (uid) => {
            if (initialUserMap[uid]) return;
            try {
              const snap = await getDoc(doc(db, 'users', uid));
              if (snap.exists()) restMap[uid] = snap.data();
            } catch {}
          }));
          if (aborted) return;
          setUserInfoCache(prev => ({ ...prev, ...restMap }));
        }
      } catch (error) {
        console.error('❌ 게시물/사용자 로드 실패:', error);
        setIsLoading(false);
      }
    };
    loadPostsWithUsers();
    return () => { aborted = true; };
  }, [selectedCountry, selectedCity]);

  // ✅ 사용자 UID가 나중에 준비되면, 재조회 없이 좋아요 상태만 즉시 동기화
  useEffect(() => {
    if (!user?.uid || posts.length === 0) return;
    const uid = user.uid;
    setPosts(prev => prev.map(p => ({
      ...p,
      isLikedByCurrentUser: !!(p.likedBy && p.likedBy[uid])
    })));
  }, [user?.uid]);

  // 위치 선택 관련 함수들
  const handleCountryCitySelect = (countryCode: string, cityCode: string) => {
    console.log('🔄 위치 변경:', { countryCode, cityCode });
    setSelectedCountry(countryCode);
    setSelectedCity(cityCode);
    
    // 로컬 스토리지에 저장
    localStorage.setItem('dashboard_selectedCountry', countryCode);
    localStorage.setItem('dashboard_selectedCity', cityCode);
  };

  const handleLocationTextChange = (text: string) => {
    setLocationText(text);
    
    // 로컬 스토리지에 위치 텍스트 저장
    localStorage.setItem('dashboard_locationText', text);
    
    // AppBar에 위치 텍스트 업데이트 전달
    window.dispatchEvent(new CustomEvent('locationTextChanged', { 
      detail: { text } 
    }));
  };

  // AppBar에서 모달 열기 이벤트 수신
  useEffect(() => {
    const handleOpenLocationModal = () => {
      countryCitySelectorRef.current?.openMobileModal();
    };

    window.addEventListener('openLocationModal', handleOpenLocationModal);
    
    return () => {
      window.removeEventListener('openLocationModal', handleOpenLocationModal);
    };
  }, []);




  return (
    <>
      <div className={styles['dashboard-container']}>
        {/* Top AppBar */}
        <AppBar 
          showBackButton={false}
          showLogo={true}
        />
        
        {/* Body Content */}
        <div className={styles['body-content']}>
          {/* Main Content */}
          <div className={styles['main-content']}>
              {/* Banner Section */}
              <BannerSlider 
                height="180px"
                autoSlide={true}
                autoSlideInterval={5000}
              />
              
              {/* Top Section */}
              <div className={styles['top-section']}>
              </div>

              {/* Popular Destinations */}
              <div className={styles['popular-destinations']}>
                <h2 className={styles['section-title']}>
                  <img src="/icons/real-check.svg" alt="실시간" width="24" height="24" />
                  {t('realtimePopularAreas')}
                </h2>
                <div className={styles['destinations-grid']}>
                  <div className={styles['destination-circle']}>
                    <img src="/assets/popular-curator/danang.png" alt="다낭" className={styles['circle-image']} />
                    <span>다낭</span>
                  </div>
                  <div className={styles['destination-circle']}>
                    <img src="/assets/popular-curator/hanoi.png" alt="하노이" className={styles['circle-image']} />
                    <span>하노이</span>
                  </div>
                  <div className={styles['destination-circle']}>
                    <img src="/assets/popular-curator/dalat.png" alt="달랏" className={styles['circle-image']} />
                    <span>달랏</span>
                  </div>
                  <div className={styles['destination-circle']}>
                    <img src="/assets/popular-curator/hocimin.png" alt="호치민" className={styles['circle-image']} />
                    <span>호치민</span>
                  </div>
                  <div className={styles['destination-circle']}>
                    <img src="/assets/popular-curator/puckuok.png" alt="푸꾸옥" className={styles['circle-image']} />
                    <span>푸꾸옥</span>
                  </div>
                  <div className={styles['destination-circle']}>
                    <img src="/assets/popular-curator/nattrang.png" alt="나트랑" className={styles['circle-image']} />
                    <span>나트랑</span>
                  </div>
                </div>
              </div>

              {/* Posts Section */}
              <div className={styles['trending-section']}>
                <h2>
                  {selectedCountry || selectedCity ? (
                    <>
                      <img src="/icons/popular-bolt.svg" alt="인기" width="24" height="24" />
                      {t('filteredPosts')}
                    </>
                  ) : (
                    <>
                      <img src="/icons/popular-bolt.svg" alt="인기" width="24" height="24" />
                      {t('popularPosts')}
                    </>
                  )}
                </h2>

                {/* Post Content */}
                {isLoading ? (
                  <div className={styles['loading-container']}>
                    <div className={styles['loading-spinner']}></div>
                  </div>
                ) : (
                  <div className={styles['content-grid']}>
                    {posts.length > 0 ? (
                      posts.slice(0, visibleCount).map((post, idx) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          userInfo={userInfoCache[post.userId]}
                          currentUser={user} // 🚀 사용자 정보 전달 (user가 없어도 렌더링)
                          showUserInfo={true}
                          cardClassName={styles['content-card']}
                          aboveTheFold={idx < 4}
                        />
                      ))
                    ) : (
                      <div className={styles['no-posts']}>
                        <p>{t('noPosts')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Video Section */}
              <div ref={videoSentinelRef} />
              {showVideoSection && (
                <DynamicVideoSection 
                  posts={posts}
                  userInfoCache={userInfoCache}
                />
              )}
            </div>
          </div>
        
        {/* Mobile Bottom Navigator */}
        <BottomNavigator />
        
        {/* 위치 선택 컴포넌트 (모달 기능) */}
        <CountryAndCitySelector
          ref={countryCitySelectorRef}
          selectedCountry={selectedCountry}
          selectedCity={selectedCity}
          onSelectionChange={handleCountryCitySelect}
          onLocationTextChange={handleLocationTextChange}
          renderTrigger={false}
        />
      </div>
    </>
  );
}