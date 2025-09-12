"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AppBar } from "../components/AppBar";
import { BottomNavigator } from "../components/BottomNavigator";
import { useAuthContext } from "../contexts/AuthContext";
import { useTranslationContext } from "../contexts/TranslationContext";
import { useUnreadMessageCount } from "../hooks/useUnreadMessageCount";
import { getPosts, PostData, getPostsByCountry, getPostsByCity, getUsersBatch } from "../services/postService";
import { doc, getDoc } from 'firebase/firestore';
import { db } from "../services/firebase";
import CountryAndCitySelector, { CountryAndCitySelectorRef } from "../components/CountryAndCitySelector";
import { PostCard } from "../components/PostCard";
import { VideoSection } from "../components/VideoSection";
import styles from "./style.module.css";

export default function Dashboard() {
  const router = useRouter();
  const { 
    user,
    isAuthenticated,
    isLoading: authLoading
  } = useAuthContext();
  
  const { t, currentLanguage } = useTranslationContext();
  const unreadMessageCount = useUnreadMessageCount();

  // 게시물 상태 관리
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfoCache, setUserInfoCache] = useState<Record<string, any>>({});
  
  // 필터링 상태 관리
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  
  // 위치 선택 관련
  const [locationText, setLocationText] = useState('');
  const countryCitySelectorRef = useRef<CountryAndCitySelectorRef>(null);
  

  // 로그인 상태와 관계없이 Dashboard는 접근 가능
  // (게시물 읽기는 로그인 불필요)

  // 🚀 게시물 데이터 즉시 로드 (캐싱 없음!)
  useEffect(() => {
    const loadPosts = async () => {
      setIsLoading(true);
      
      try {
        let postsData: PostData[];
        
        if (selectedCity) {
          console.log('🔍 도시별 게시물 로드 중...', selectedCountry, selectedCity);
          postsData = await getPostsByCity(selectedCountry, selectedCity);
        } else if (selectedCountry) {
          console.log('🔍 국가별 게시물 로드 중...', selectedCountry);
          postsData = await getPostsByCountry(selectedCountry);  
        } else {
          console.log('🔍 전체 게시물 로드 중...');
          postsData = await getPosts();
        }
        
        console.log('✅ 게시물 데이터 로드 완료:', postsData.length);
        setPosts(postsData);
        
        // 🚀 병렬로 사용자 정보 조회 (UI 블로킹 없음!)
        if (postsData.length > 0) {
          const userIds = postsData.map(post => post.userId);
          // 사용자 정보는 백그라운드에서 로드하고 UI는 즉시 표시
          getUsersBatch(userIds).then(userInfoMap => {
            setUserInfoCache(prev => ({ ...prev, ...userInfoMap }));
          }).catch(error => {
            console.error('❌ 사용자 정보 로드 실패:', error);
          });
        }
      } catch (error) {
        console.error('❌ 게시물 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 🚀 인증 로딩을 기다리지 않고 즉시 로드!
    loadPosts();
  }, [selectedCountry, selectedCity]);

  // 위치 선택 관련 함수들
  const handleCountryCitySelect = (countryCode: string, cityCode: string) => {
    console.log('🔄 위치 변경:', { countryCode, cityCode });
    setSelectedCountry(countryCode);
    setSelectedCity(cityCode);
  };

  const handleLocationTextChange = (text: string) => {
    setLocationText(text);
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
                    t('filteredPosts')
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
                      posts.slice(0, 8).map((post) => ( // 최대 8개 (4개씩 2줄)
                        <PostCard
                          key={post.id}
                          post={post}
                          userInfo={userInfoCache[post.userId]}
                          showUserInfo={true}
                          cardClassName={styles['content-card']}
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
              <VideoSection 
                posts={posts}
                userInfoCache={userInfoCache}
              />
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
        />
      </div>
    </>
  );
}