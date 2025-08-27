"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Sidebar } from "../components/Sidebar";
import { AppBar } from "../components/AppBar";
import { RightSidebar } from "../components/RightSidebar";
import { BottomNavigator } from "../components/BottomNavigator";
import { useAuthContext } from "../contexts/AuthContext";
import { AuthGuard } from "../components/AuthGuard";
import { useTranslationContext } from "../contexts/TranslationContext";
import { db } from "../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { PostCard } from "../components/PostCard";
import { getPosts, PostData } from "../services/postService";
import ClientStyleProvider from "../components/ClientStyleProvider";
import "./page.css";

// useSearchParams를 사용하는 컴포넌트를 별도로 분리
function ProfileContent() {
  const { user } = useAuthContext();
  const { t, currentLanguage } = useTranslationContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileUserId = searchParams.get('userId'); // URL에서 사용자 ID 가져오기
  
  // 편집 모드 상태 관리
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [profileData, setProfileData] = useState({
    uid: '',
    name: '',
    photoUrl: '',
    introduction: '',
    location: '',
    gender: '',
    birthDate: '',
    followerCount: 0,
    followingCount: 0,
    postCount: 0
  });

  // 편집용 임시 데이터
  const [editData, setEditData] = useState({
    name: '',
    introduction: ''
  });

  // 사용자 게시물 데이터
  const [userPosts, setUserPosts] = useState<PostData[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // 현재 로그인한 사용자의 프로필인지 확인
  const isOwnProfile = !profileUserId || profileUserId === user?.uid;

  // 국가코드를 현재 언어의 국가명으로 변환하는 함수
  const translateCountry = (countryCode: string): string => {
    if (!countryCode) return '';
    
    // 기본값들은 그대로 반환 (번역하지 않음)
    if (countryCode === '위치 미상' || countryCode === '사용자') {
      return countryCode;
    }
    
    try {
      return t(`countries.${countryCode}`);
    } catch (error) {
      return countryCode; // 번역이 없으면 원본 반환
    }
  };

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



  const handleEdit = () => {
    setEditData({
      name: profileData.name || '',
      introduction: profileData.introduction || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!user?.uid) return;

    try {
      const updates: any = {};
      
      // 이름이 변경되었거나 비어있던 경우
      if (editData.name.trim() && editData.name !== profileData.name) {
        updates.name = editData.name.trim();
      }
      
      // 한줄소개가 변경되었거나 비어있던 경우
      if (editData.introduction !== profileData.introduction) {
        updates.introduction = editData.introduction.trim();
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'users_test', user.uid), updates);
        
        // 로컬 상태 업데이트
        setProfileData(prev => ({
          ...prev,
          name: editData.name.trim() || prev.name,
          introduction: editData.introduction.trim()
        }));
      }

      setIsEditing(false);
    } catch (error) {
      console.error('프로필 저장 실패:', error);
      alert('프로필 저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleCancel = () => {
    // 편집 데이터를 원래 값으로 복원
    setEditData({
      name: profileData.name || '',
      introduction: profileData.introduction || ''
    });
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };



  // 컴포넌트 마운트 상태 관리 (하이드레이션 안정성)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Firebase에서 사용자 데이터 가져오기
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        const targetUserId = profileUserId || user?.uid;
        
        if (!targetUserId) {
          setIsLoading(false);
          return;
        }

        const userDoc = await getDoc(doc(db, 'users_test', targetUserId));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const profile = {
            uid: targetUserId,
            name: userData.name || '사용자',
            photoUrl: userData.photoUrl || '',
            introduction: userData.introduction || '',
            location: userData.location || '',
            gender: userData.gender || '',
            birthDate: userData.birthDate || '',
            followerCount: userData.followerCount || 0,
            followingCount: userData.followingCount || 0,
            postCount: userData.postCount || 0
          };
          
          setProfileData(profile);
          setEditData({
            name: profile.name,
            introduction: profile.introduction
          });
        } else {
          console.error('사용자 데이터를 찾을 수 없습니다.');
        }

        // 프로필 데이터 로드 후 게시물도 가져오기
        if (targetUserId) {
          await fetchUserPosts(targetUserId);
        }
      } catch (error) {
        console.error('프로필 데이터 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [profileUserId, user?.uid]);

  const handleFollow = () => {
    // TODO: 팔로우/언팔로우 로직 구현
    console.log('팔로우 버튼 클릭');
  };

  const handleChat = () => {
    // TODO: 채팅하기 로직 구현
    console.log('채팅하기 버튼 클릭');
  };

  const handleCompanionRequest = () => {
    // TODO: 동행신청 로직 구현
    console.log('동행신청 버튼 클릭');
  };

  const handleReceivedBookings = () => {
    // TODO: 받은예약 로직 구현
    console.log('받은예약 버튼 클릭');
  };

  const handleMyBookings = () => {
    // TODO: 내가한 예약 로직 구현
    console.log('내가한 예약 버튼 클릭');
  };

  const handleUploadPost = () => {
    // 게시물 업로드 페이지로 이동
    router.push('/post-upload');
  };

  // 사용자 게시물 가져오기
  const fetchUserPosts = async (userId: string) => {
    try {
      setPostsLoading(true);
      const posts = await getPosts(1000, userId); // 모든 게시물 가져오기 (userId로 필터링)
      setUserPosts(posts);
      
      // 게시물 수 업데이트
      setProfileData(prev => ({
        ...prev,
        postCount: posts.length
      }));
    } catch (error) {
      console.error('사용자 게시물 로드 실패:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  // 마운트되지 않은 경우 최소한의 로딩 표시
  if (!isMounted) {
    return (
      <AuthGuard>
        <div className="profile-container">
          <AppBar 
            showBackButton={false}
            showLogo={true}
            showLanguageSelector={true}
          />
          <div className="body-content">
            <Sidebar />
            <div className="profile-main-content">
              <div className="profile-loading">
                <div className="profile-loading-spinner">로딩 중...</div>
              </div>
            </div>
            <RightSidebar />
          </div>
        </div>
        <BottomNavigator />
      </AuthGuard>
    );
  }

  return (
    <>
      <AuthGuard>
        <ClientStyleProvider>
          <div className="profile-container">
            {/* Top AppBar */}
            <AppBar 
              showBackButton={false}
              showLogo={true}
              showLanguageSelector={true}
            />
            
            {/* Body Content */}
            <div className="body-content">
              {/* Left Sidebar */}
              <Sidebar />

              {/* Main Content */}
              <div className="profile-main-content">
                {isLoading ? (
                <div className="profile-loading">
                  <div className="profile-loading-spinner">{t('loading')}</div>
                </div>
              ) : (
                <>
                  {/* Profile Header */}
                  <div className="profile-header">
                    <div className="profile-info">
                      <div className="profile-avatar">
                        {profileData.photoUrl ? (
                          <img 
                            src={profileData.photoUrl} 
                            alt="프로필 이미지" 
                            className="avatar-image"
                          />
                        ) : (
                          <div className="avatar-circle">👤</div>
                        )}
                      </div>
                      <div className="profile-basic-info">
                        {isEditing ? (
                          <input
                            type="text"
                            className="profile-name-input"
                            value={editData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            placeholder={t('enterNamePlaceholder')}
                          />
                        ) : (
                          <h1 className="profile-name">
                            {profileData.name || t('setNamePlaceholder')}
                          </h1>
                        )}
                        
                        <div className="profile-details">
                          <span>
                            {translateCountry(profileData.location)}
                            {profileData.gender && `, ${translateGender(profileData.gender)}`}
                            {profileData.birthDate && `, ${formatAge(calculateAge(profileData.birthDate))}`}
                          </span>
                        </div>
                        
                        {isEditing ? (
                          <div className="profile-introduction-edit">
                            <textarea
                              className="profile-introduction-input"
                              value={editData.introduction}
                              onChange={(e) => handleInputChange('introduction', e.target.value)}
                              placeholder={t('introPlaceholder')}
                              rows={3}
                            />
                          </div>
                        ) : (
                          <div className="profile-introduction">
                            {profileData.introduction || (isOwnProfile ? t('addIntroPlaceholder') : "")}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="profile-actions">
                      {isOwnProfile ? (
                        !isEditing ? (
                          <button className="edit-profile-btn" onClick={handleEdit}>
                            {t('editProfile')}
                          </button>
                        ) : (
                          <div className="edit-actions">
                            <button className="save-btn" onClick={handleSave}>
                              {t('save')}
                            </button>
                            <button className="cancel-btn" onClick={handleCancel}>
                              {t('cancel')}
                            </button>
                          </div>
                        )
                      ) : (
                        <button className="follow-btn" onClick={handleFollow}>
                          {t('follow')}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stats Section - 로그인한 사용자의 프로필인 경우만 표시 */}
                  {isOwnProfile && (
                    <div className="profile-stats">
                      <div className="stat-item">
                        <span className="stat-number">{profileData.followerCount}</span>
                        <span className="stat-label">{t('followers')}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-number">{profileData.followingCount}</span>
                        <span className="stat-label">{t('following')}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-number">{profileData.postCount}</span>
                        <span className="stat-label">{t('posts')}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="profile-action-buttons">
                    {isOwnProfile ? (
                      <>
                        <button className="action-btn primary" onClick={handleReceivedBookings}>
                          {t('receivedBookings')}
                        </button>
                        <button className="action-btn secondary" onClick={handleMyBookings}>
                          {t('myBookings')}
                        </button>
                        {/* 모바일에서만 보이는 게시물 업로드 버튼 */}
                        <button className="action-btn upload-btn mobile-only" onClick={handleUploadPost}>
                          <span className="upload-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                          <span className="upload-text">{t('uploadPost')}</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="action-btn primary" onClick={handleChat}>
                          {t('chat')}
                        </button>
                        <button className="action-btn secondary" onClick={handleCompanionRequest}>
                          {t('companionRequest')}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}



              {/* Posts Section - 로딩 완료 후에만 표시 */}
              {!isLoading && (
                <div className="profile-posts-section">
                  <h2>{isOwnProfile ? t('myPosts') : `${profileData.name}${t('userPosts')}`}</h2>
                  <div className="profile-content-grid">
                    {postsLoading ? (
                      <div className="profile-loading">
                        <div className="profile-loading-spinner">🔄</div>
                        <span>로딩 중...</span>
                      </div>
                    ) : userPosts.length === 0 ? (
                      <div className="no-posts">
                        <h3>아직 게시물이 없습니다</h3>
                        <p>첫 번째 게시물을 작성해보세요!</p>
                      </div>
                    ) : (
                      userPosts.map((post) => (
                        <PostCard 
                          key={post.id} 
                          post={post}
                          userInfo={{
                            name: profileData.name,
                            location: profileData.location,
                            profileImage: profileData.photoUrl,
                            gender: profileData.gender,
                            birthDate: profileData.birthDate
                          }}
                          showUserInfo={false}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

              {/* Right Sidebar */}
              <RightSidebar />
            </div>
          </div>
          
          {/* Mobile Bottom Navigator */}
          <BottomNavigator />
        </ClientStyleProvider>
      </AuthGuard>
    </>
  );
}

// 로딩 컴포넌트
function ProfileLoading() {
  return (
    <div className="profile-loading">
      <div className="loading-spinner">로딩 중...</div>
    </div>
  );
}

// 메인 export 함수에서 Suspense로 감싸기
export default function Profile() {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfileContent />
    </Suspense>
  );
}

