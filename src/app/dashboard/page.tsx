"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppBar } from "../components/AppBar";
import { BottomNavigator } from "../components/BottomNavigator";
import { PostCard } from "./postcard/PostCard";
import { BannerSlider } from "./banner";
import { useAuthContext } from "../contexts/AuthContext";
import { useTranslationContext } from "../contexts/TranslationContext";
import { useUnreadMessageCount } from "../hooks/useUnreadMessageCount";
// import { AuthGuard } from "../components/AuthGuard"; // 대시보드는 로그인 없이도 접근 가능
import { getPosts, PostData, getPostsByCountry, getPostsByCity } from "../services/postService";
import { doc, getDoc } from 'firebase/firestore';
import { db } from "../services/firebase";
import { PopularLocations } from "./popular-locations/PopularLocations";
import { VideoSection } from "./postcard/VideoSection";
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
  const [filteredPosts, setFilteredPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfoCache, setUserInfoCache] = useState<Record<string, any>>({});

  // 지역 필터 상태 관리
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');
  const [selectedCityCode, setSelectedCityCode] = useState<string>('');
  

  // 대시보드는 로그인 없이도 접근 가능하도록 변경
  // 로그인 체크 로직 제거

  // 게시물 데이터 로드
  useEffect(() => {
    const loadPosts = async () => {
      setIsLoading(true);
      try {
        let postsData: PostData[];
        
        console.log('🔍 전체 게시물 로드 중...');
        postsData = await getPosts();
        
        console.log('✅ 게시물 데이터 로드 완료:', postsData.length);
        setPosts(postsData);
        setFilteredPosts(postsData); // 초기에는 전체 게시물 표시
      } catch (error) {
        console.error('❌ 게시물 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 로그인 상태와 관계없이 게시물 로드
    loadPosts();
  }, []);


  // 사용자 정보 캐시
  const getUserInfo = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserInfoCache(prev => ({
          ...prev,
          [userId]: userData
        }));
        return userData;
      }
    } catch (error) {
      console.error('❌ 사용자 정보 로드 실패:', error);
    }
    return null;
  };

  // 사용자 정보가 아직 캐시되지 않은 게시물들에 대해 비동기로 가져오기
  useEffect(() => {
    const fetchMissingUserInfo = async () => {
      const missingUserIds = posts
        .map(post => post.userId)
        .filter(userId => !userInfoCache[userId]);

      if (missingUserIds.length > 0) {
        console.log('🔄 사용자 정보 가져오는 중...', missingUserIds);

        for (const userId of missingUserIds) {
          await getUserInfo(userId);
        }
      }
    };

    if (posts.length > 0) {
      fetchMissingUserInfo();
    }
  }, [posts, userInfoCache]);

  // 지역 필터링 로직
  useEffect(() => {
    console.log('🔍 지역 필터링 적용:', { selectedCountryCode, selectedCityCode });

    if (!selectedCountryCode && !selectedCityCode) {
      // 필터가 없으면 전체 게시물 표시
      setFilteredPosts(posts);
      return;
    }

    const filtered = posts.filter(post => {
      const postCountry = post.location?.nationality || post.countryCode;
      const postCity = post.location?.city || post.cityCode;

      // 국가만 선택된 경우
      if (selectedCountryCode && !selectedCityCode) {
        return postCountry === selectedCountryCode;
      }

      // 국가와 도시 모두 선택된 경우
      if (selectedCountryCode && selectedCityCode) {
        return postCountry === selectedCountryCode && postCity === selectedCityCode;
      }

      return true;
    });

    console.log(`✅ 필터링 결과: ${filtered.length}/${posts.length} 게시물`);
    setFilteredPosts(filtered);
  }, [posts, selectedCountryCode, selectedCityCode]);

  // 인기 지역 선택 핸들러
  const handleLocationSelect = (countryCode: string, cityCode: string) => {
    console.log('인기 지역 선택:', { countryCode, cityCode });
    setSelectedCountryCode(countryCode);
    setSelectedCityCode(cityCode);

    // 로컬 스토리지에 저장 (CountryAndCitySelector와 동기화)
    localStorage.setItem('dashboard_selectedCountry', countryCode);
    localStorage.setItem('dashboard_selectedCity', cityCode);

    // CountryAndCitySelector 업데이트를 위한 이벤트 발생
    console.log('Dashboard에서 이벤트 발생:', { countryCode, cityCode });
    window.dispatchEvent(new CustomEvent('locationSelectionChanged', {
      detail: { countryCode, cityCode }
    }));

    // 강제로 커스텀 이벤트 트리거 (다중 보장)
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('locationSelectionChanged', {
        detail: { countryCode, cityCode }
      }));
    }, 100);
  };

  // AppBar에서 발생하는 지역 선택 이벤트 리스닝
  useEffect(() => {
    const handleLocationSelectionChanged = (event: CustomEvent) => {
      const { countryCode, cityCode } = event.detail;
      console.log('AppBar에서 지역 선택 이벤트 받음:', { countryCode, cityCode });
      setSelectedCountryCode(countryCode);
      setSelectedCityCode(cityCode);
    };

    window.addEventListener('locationSelectionChanged', handleLocationSelectionChanged as EventListener);

    return () => {
      window.removeEventListener('locationSelectionChanged', handleLocationSelectionChanged as EventListener);
    };
  }, []);

  // 로컬 스토리지에서 저장된 지역 정보 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCountry = localStorage.getItem('dashboard_selectedCountry');
      const savedCity = localStorage.getItem('dashboard_selectedCity');

      console.log('Dashboard 로컬 스토리지에서 불러온 값들:', {
        savedCountry,
        savedCity
      });

      if (savedCountry) setSelectedCountryCode(savedCountry);
      if (savedCity) setSelectedCityCode(savedCity);
    }
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
              <BannerSlider />

              {/* Popular Locations - 실시간 데이터 기반 */}
              <PopularLocations
                onLocationSelect={handleLocationSelect}
              />

              {/* Posts Section */}
              <div className={styles['trending-section']}>
                <h2>
                  <img src="/icons/popular-bolt.svg" alt="인기" width="24" height="24" />
                  {t('popularPosts')}
                </h2>

                {/* Video Section - 동영상 게시물 (맨 위) */}
                <VideoSection
                  posts={filteredPosts}
                  userInfoCache={userInfoCache}
                />

                {/* Post Content */}
                {isLoading ? (
                  <div className={styles['loading-container']}>
                    <div className={styles['loading-spinner']}></div>
                  </div>
                ) : (
                  <div className={styles['content-grid']}>
                    {filteredPosts.length > 0 ? (
                      filteredPosts.map((post) => (
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
            </div>
          </div>
        
        {/* Mobile Bottom Navigator */}
        <BottomNavigator />
        </div>
    </>
  );
}