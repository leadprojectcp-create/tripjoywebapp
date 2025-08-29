"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sidebar } from "../components/Sidebar";
import { AppBar } from "../components/AppBar";
import { RightSidebar } from "../components/RightSidebar";
import { BottomNavigator } from "../components/BottomNavigator";
import { PostCard } from "../components/PostCard";
import { useAuthContext } from "../contexts/AuthContext";
import { useTranslationContext } from "../contexts/TranslationContext";
import { useUnreadMessageCount } from "../hooks/useUnreadMessageCount";
import { AuthGuard } from "../components/AuthGuard";
import { SignupFlow } from "../auth/signup/SignupFlow";
import { SignupMethod } from "../auth/signup/types";
import { getPosts, PostData, getPostsByCountry, getPostsByCity } from "../services/postService";
import { doc, getDoc } from 'firebase/firestore';
import { db } from "../services/firebase";
import CountryAndCitySelector from "../components/CountryAndCitySelector";
import "./style.css";

export default function Dashboard() {
  const { 
    showSignupModal,
    closeSignupModal,
    openSignupModal
  } = useAuthContext();
  
  const { t } = useTranslationContext();
  const unreadMessageCount = useUnreadMessageCount();

  // 게시물 상태 관리
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfoCache, setUserInfoCache] = useState<Record<string, any>>({});
  
  // 필터링 상태 관리
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const handleSignupComplete = (userData: any) => {
    console.log('회원가입 완료:', userData);
    closeSignupModal();
  };

  // 사용자 정보 가져오기
  const getUserInfo = async (userId: string) => {
    if (userInfoCache[userId]) {
      return userInfoCache[userId];
    }

    try {
      const userDoc = await getDoc(doc(db, 'users_test', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userInfo = {
          name: userData.name || '사용자',
          location: userData.location || '위치 미상',
          profileImage: userData.profileImage || null,
          photoUrl: userData.photoUrl || null,
          gender: userData.gender || '',
          birthDate: userData.birthDate || ''
        };
        
        // 캐시에 저장
        setUserInfoCache(prev => ({
          ...prev,
          [userId]: userInfo
        }));
        
        return userInfo;
      }
    } catch (error) {
      console.error('사용자 정보 조회 실패:', error);
    }
    
    return { name: '사용자', location: '위치 미상', gender: '', birthDate: '' };
  };

  // 게시물 목록 가져오기
  const fetchPosts = async (countryCode?: string, cityCode?: string) => {
    try {
      setIsLoading(true);
      console.log('🔄 게시물 목록 가져오는 중...', { countryCode, cityCode });
      
      let postsData: PostData[];
      
      if (cityCode && countryCode) {
        // 도시별 게시물 조회
        postsData = await getPostsByCity(countryCode, cityCode, 20);
        console.log(`🏙️ ${countryCode}-${cityCode} 도시 게시물 조회`);
      } else if (countryCode) {
        // 국가별 게시물 조회
        postsData = await getPostsByCountry(countryCode, 20);
        console.log(`🌍 ${countryCode} 국가 게시물 조회`);
      } else {
        // 전체 게시물 조회
        postsData = await getPosts(20);
        console.log('📋 전체 게시물 조회');
      }
      
      console.log('📋 가져온 게시물 수:', postsData.length);
      setPosts(postsData);
    } catch (error) {
      console.error('❌ 게시물 목록 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 게시물 가져오기
  useEffect(() => {
    fetchPosts();
  }, []);

  // 국가/도시 선택 변경 시 게시물 다시 가져오기
  useEffect(() => {
    if (selectedCountry !== '' || selectedCity !== '') {
      fetchPosts(selectedCountry || undefined, selectedCity || undefined);
    }
  }, [selectedCountry, selectedCity]);

  // 국가/도시 선택 핸들러
  const handleCountryCitySelect = (countryCode: string, cityCode: string) => {
    console.log('🌍 필터 선택됨:', { countryCode, cityCode });
    setSelectedCountry(countryCode);
    setSelectedCity(cityCode);
    
    // 선택이 모두 해제된 경우 전체 게시물 다시 로드
    if (!countryCode && !cityCode) {
      fetchPosts();
    }
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
      <AuthGuard>
        <div className="dashboard-container">
          {/* Top AppBar */}
          <AppBar 
            showBackButton={false}
            showLogo={true}
            showLanguageSelector={true}
          />
          
          {/* Body Content */}
          <div className="body-content">
            {/* Left Sidebar */}
            <Sidebar unreadMessageCount={unreadMessageCount} />

            {/* Main Content */}
            <div className="main-content">
              {/* Top Section */}
              <div className="top-section">
                <h1 className="main-title">{t('whereToGo')}</h1>
                
                {/* 국가/도시 필터 선택 */}
                <div className="location-filter">
                  <CountryAndCitySelector
                    selectedCountry={selectedCountry}
                    selectedCity={selectedCity}
                    onSelectionChange={handleCountryCitySelect}
                    className="dashboard-country-city-selector"
                  />
                </div>
              </div>

              {/* Mobile Popular Areas Section */}
              <div className="mobile-popular-areas">
                <h3>{t('popularAreas')}</h3>
                <div className="mobile-destination-circles">
                  <div className="mobile-destination-circle">
                    <div className="mobile-circle-image">🌊</div>
                    <span>{t('destinations.danang')}</span>
                  </div>
                  <div className="mobile-destination-circle">
                    <div className="mobile-circle-image">🌅</div>
                    <span>{t('destinations.hanoi')}</span>
                  </div>
                  <div className="mobile-destination-circle">
                    <div className="mobile-circle-image">🌻</div>
                    <span>{t('destinations.dalat')}</span>
                  </div>
                  <div className="mobile-destination-circle">
                    <div className="mobile-circle-image">🌃</div>
                    <span>{t('destinations.hochiminh')}</span>
                  </div>
                  <div className="mobile-destination-circle">
                    <div className="mobile-circle-image">🚠</div>
                    <span>{t('destinations.phuquoc')}</span>
                  </div>
                  <div className="mobile-destination-circle">
                    <div className="mobile-circle-image">🏖️</div>
                    <span>{t('destinations.nhatrang')}</span>
                  </div>
                </div>
              </div>

            {/* Posts Section */}
            <div className="trending-section">
              <h2>
                {selectedCountry || selectedCity 
                  ? t('filteredPosts') 
                  : t('recentPosts')
                }
              </h2>
              <div className="content-grid">
                {isLoading ? (
                  <div className="loading-container">
                    <div className="loading-spinner">🔄</div>
                    {t('loadingPosts')}
                  </div>
                ) : posts.length === 0 ? (
                  <div className="no-posts">
                    <h3>{t('noPosts')}</h3>
                    <p>{t('createFirstPost')}</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <PostCard 
                      key={post.id} 
                      post={post}
                      userInfo={userInfoCache[post.userId]}
                    />
                  ))
                )}
              </div>
            </div>
                      </div>

            {/* Right Sidebar */}
            <RightSidebar />
          </div>
        </div>
        
        {/* Mobile Bottom Navigator */}
        <BottomNavigator />
      </AuthGuard>
      
      <SignupFlow 
        isOpen={showSignupModal} 
        onClose={closeSignupModal} 
        onSignupComplete={handleSignupComplete}
        initialMethod="email"
      />
    </>
  );
}
