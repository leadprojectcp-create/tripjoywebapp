"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppBar } from "../components/AppBar";
import { BottomNavigator } from "../components/BottomNavigator";
import { PostCard } from "../components/PostCard";
import { useAuthContext } from "../contexts/AuthContext";
import { useTranslationContext } from "../contexts/TranslationContext";
import { useUnreadMessageCount } from "../hooks/useUnreadMessageCount";
import { getPosts, PostData, getPostsByCountry, getPostsByCity } from "../services/postService";
import { doc, getDoc } from 'firebase/firestore';
import { db } from "../services/firebase";
import CountryAndCitySelector, { CountryAndCitySelectorRef } from "../components/CountryAndCitySelector";
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
  
  // 모바일 감지
  const [isMobile, setIsMobile] = useState(false);
  
  // 모바일 모달 상태
  const [locationText, setLocationText] = useState('');
  const countryCitySelectorRef = useRef<CountryAndCitySelectorRef>(null);

  // 모바일 감지 useEffect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 480);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 로그인 상태와 관계없이 Dashboard는 접근 가능
  // (게시물 읽기는 로그인 불필요)

  // 게시물 데이터 로드
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
      } catch (error) {
        console.error('❌ 게시물 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      loadPosts();
    }
  }, [selectedCountry, selectedCity, authLoading]);

  // 국가/도시 선택 핸들러
  const handleCountryCitySelect = (countryCode: string, cityCode: string) => {
    console.log('🔄 필터 변경:', { countryCode, cityCode });
    setSelectedCountry(countryCode);
    setSelectedCity(cityCode);
  };

  // CountryAndCitySelector로부터 location text 받기
  const handleLocationTextChange = (text: string) => {
    setLocationText(text);
  };

  // 모바일 타이틀 클릭 핸들러 (CountryAndCitySelector의 모달을 열기 위해)
  const handleMobileTitleClick = () => {
    if (!isMobile) return;
    countryCitySelectorRef.current?.openMobileModal();
  };


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

  return (
    <>
      <div className={styles['dashboard-container']}>
        {/* Top AppBar */}
        <AppBar 
          showBackButton={false}
          showLogo={true}
          showLanguageSelector={true}
        />
        
        {/* Body Content */}
        <div className={styles['body-content']}>
          {/* Main Content */}
          <div className={styles['main-content']}>
              {/* Top Section */}
              <div className={styles['top-section']}>
                {/* 어디로 떠나세요? 텍스트 */}
                {isMobile ? (
                  // 모바일: 클릭 가능한 타이틀
                  <div className={styles['mobile-title']} onClick={handleMobileTitleClick}>
                    <img src="/icons/location_pin.svg" alt="location" width={24} height={24} />
                    <span>{locationText || t('whereToGo')}</span>
                    <img src="/icons/stat_minus.svg" alt="dropdown" width={20} height={20} />
                  </div>
                ) : (
                  // PC: 일반 타이틀
                  <div className={styles['where-to-go-title']}>
                    <img src="/icons/location_pin.svg" alt="location" width={24} height={24} />
                    <span>{t('whereToGo')}</span>
                  </div>
                )}
                
                <CountryAndCitySelector
                  ref={countryCitySelectorRef}
                  selectedCountry={selectedCountry}
                  selectedCity={selectedCity}
                  onSelectionChange={handleCountryCitySelect}
                  onLocationTextChange={handleLocationTextChange}
                />
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
                      posts.map((post) => (
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