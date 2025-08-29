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
import { useUnreadMessageCount } from "../hooks/useUnreadMessageCount";
import { db } from "../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { PostCard } from "../components/PostCard";
import { getPosts, PostData, deletePost } from "../services/postService";
import { followUser, unfollowUser, isFollowing, getFollowStats, getFollowersList, getFollowingList, UserInfo } from "../services/followService";
import ClientStyleProvider from "../components/ClientStyleProvider";
import styles from "./style.module.css";

// useSearchParams를 사용하는 컴포넌트를 별도로 분리
function ProfileContent() {
  const { user } = useAuthContext();
  const { t, currentLanguage } = useTranslationContext();
  const unreadMessageCount = useUnreadMessageCount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileUserId = searchParams.get('userId'); // URL에서 사용자 ID 가져오기
  
  // 편집 모드 상태 관리
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  
  // 팔로우 상태 관리
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');
  const [followList, setFollowList] = useState<UserInfo[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);
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
    router.push('/profile/profile-edit');
  };

  // 이미지 클릭 핸들러 (팝업 열기)
  const handleImageClick = () => {
    if (profileData.photoUrl) {
      setShowImageModal(true);
    }
  };

  // 이미지 모달 닫기
  const handleCloseImageModal = () => {
    setShowImageModal(false);
  };

  // 팔로워 목록 클릭
  const handleFollowersClick = async () => {
    const targetUserId = profileUserId || user?.uid;
    if (!targetUserId) return;

    setFollowModalType('followers');
    setShowFollowModal(true);
    setFollowListLoading(true);
    
    try {
      const followers = await getFollowersList(targetUserId);
      setFollowList(followers);
    } catch (error) {
      console.error('팔로워 목록 조회 실패:', error);
      setFollowList([]);
    } finally {
      setFollowListLoading(false);
    }
  };

  // 팔로잉 목록 클릭
  const handleFollowingClick = async () => {
    const targetUserId = profileUserId || user?.uid;
    if (!targetUserId) return;

    setFollowModalType('following');
    setShowFollowModal(true);
    setFollowListLoading(true);
    
    try {
      const following = await getFollowingList(targetUserId);
      setFollowList(following);
    } catch (error) {
      console.error('팔로잉 목록 조회 실패:', error);
      setFollowList([]);
    } finally {
      setFollowListLoading(false);
    }
  };

  // 팔로우 모달 닫기
  const handleCloseFollowModal = () => {
    setShowFollowModal(false);
    setFollowList([]);
  };

  // 게시물 수정 핸들러
  const handleEditPost = (postId: string) => {
    console.log('게시물 수정:', postId);
    // TODO: 게시물 수정 페이지로 이동
    router.push(`/post-upload?edit=${postId}`);
  };

  // 게시물 삭제 핸들러
  const handleDeletePost = async (postId: string) => {
    if (!user?.uid) return;

    const confirmDelete = window.confirm('정말로 이 게시물을 삭제하시겠습니까?\n삭제된 게시물은 복구할 수 없습니다.');
    if (!confirmDelete) return;

    try {
      console.log('🗑️ 게시물 삭제 시작:', postId);
      const success = await deletePost(postId, user.uid);
      
      if (success) {
        console.log('✅ 게시물 삭제 완료');
        alert('게시물이 삭제되었습니다.');
        // 페이지 새로고침으로 목록 업데이트
        window.location.reload();
      } else {
        console.error('❌ 게시물 삭제 실패');
        alert('게시물 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ 게시물 삭제 중 오류:', error);
      alert('게시물 삭제 중 오류가 발생했습니다.');
    }
  };

  // 언팔로우 처리
  const handleUnfollow = async (targetUserId: string) => {
    if (!user?.uid) return;

    try {
      await unfollowUser(user.uid, targetUserId);
      
      // 목록에서 제거
      setFollowList(prev => prev.filter(item => item.id !== targetUserId));
      
      // 실제 데이터를 다시 로드해서 정확한 카운트 반영
      window.location.reload();
      
      console.log('✅ 언팔로우 완료:', targetUserId);
    } catch (error) {
      console.error('❌ 언팔로우 실패:', error);
      alert('언팔로우에 실패했습니다.');
    }
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
          console.log('✅ 사용자 데이터 로드 성공:', userData);
          console.log('📊 팔로워 배열:', userData.followers);
          console.log('📊 팔로잉 배열:', userData.following);
          console.log('📊 팔로워 수:', userData.followers?.length || 0);
          console.log('📊 팔로잉 수:', userData.following?.length || 0);
          
          const profile = {
            uid: targetUserId,
            name: userData.name || '사용자',
            photoUrl: userData.photoUrl || '',
            introduction: userData.introduction || '',
            location: userData.location || '',
            gender: userData.gender || '',
            birthDate: userData.birthDate || '',
            followerCount: (userData.followers && Array.isArray(userData.followers)) ? userData.followers.length : 0,
            followingCount: (userData.following && Array.isArray(userData.following)) ? userData.following.length : 0,
            postCount: userData.postCount || 0
          };
          
          setProfileData(profile);
          setEditData({
            name: profile.name,
            introduction: profile.introduction
          });

          // 다른 사용자의 프로필인 경우 팔로우 상태 확인
          if (targetUserId !== user?.uid && user?.uid) {
            const followingStatus = await isFollowing(user.uid, targetUserId);
            setIsFollowingUser(followingStatus);
          }
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

  const handleFollow = async () => {
    const targetUserId = profileUserId || user?.uid;
    if (!user?.uid || !targetUserId || isFollowLoading || targetUserId === user?.uid) return;
    
    try {
      setIsFollowLoading(true);
      
      if (isFollowingUser) {
        // 언팔로우
        const success = await unfollowUser(user.uid, targetUserId);
        if (success) {
          setIsFollowingUser(false);
          // 실제 데이터를 다시 로드해서 정확한 카운트 반영
          window.location.reload();
        }
      } else {
        // 팔로우
        const success = await followUser(user.uid, targetUserId);
        if (success) {
          setIsFollowingUser(true);
          // 실제 데이터를 다시 로드해서 정확한 카운트 반영
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('팔로우/언팔로우 실패:', error);
    } finally {
      setIsFollowLoading(false);
    }
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
            <Sidebar unreadMessageCount={unreadMessageCount} />
            <div className={styles.profileMainContent}>
              <div className={styles.profileLoading}>
                <div className={styles.profileLoadingSpinner}>로딩 중...</div>
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
          <div className={styles.profileContainer}>
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
              <div className={styles.profileMainContent}>
                {isLoading ? (
                <div className={styles.profileLoading}>
                  <div className={styles.profileLoadingSpinner}>{t('loading')}</div>
                </div>
              ) : (
                <>
                  {/* Profile Header */}
                  <div className={styles.profileHeader}>
                    <div className={styles.profileInfo}>
                      <div className={styles.profileAvatar}>
                        {profileData.photoUrl ? (
                          <img 
                            src={profileData.photoUrl} 
                            alt="프로필 이미지" 
                            className={`${styles.avatarImage} ${styles.clickable}`}
                            onClick={handleImageClick}
                          />
                        ) : (
                          <div className={styles.avatarCircle}>👤</div>
                        )}
                      </div>
                      <div className={styles.profileBasicInfo}>
                        {isEditing ? (
                          <input
                            type="text"
                            className={styles.profileNameInput}
                            value={editData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            placeholder={t('enterNamePlaceholder')}
                          />
                        ) : (
                          <h1 className={styles.profileName}>
                            {profileData.name || t('setNamePlaceholder')}
                          </h1>
                        )}
                        
                        <div className={styles.profileDetails}>
                          <span>
                            {translateCountry(profileData.location)}
                            {profileData.gender && `, ${translateGender(profileData.gender)}`}
                            {profileData.birthDate && `, ${formatAge(calculateAge(profileData.birthDate))}`}
                          </span>
                        </div>
                        
                        {isEditing ? (
                          <div className={styles.profileIntroductionEdit}>
                            <textarea
                              className={styles.profileIntroductionInput}
                              value={editData.introduction}
                              onChange={(e) => handleInputChange('introduction', e.target.value)}
                              placeholder={t('introPlaceholder')}
                              rows={3}
                            />
                          </div>
                        ) : (
                          <div className={styles.profileIntroduction}>
                            {profileData.introduction || (isOwnProfile ? t('addIntroPlaceholder') : "")}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.profileActions}>
                      {isOwnProfile ? (
                        !isEditing ? (
                          <button className={styles.editProfileBtn} onClick={handleEdit}>
                            {t('editProfile')}
                          </button>
                        ) : (
                          <div className={styles.editActions}>
                            <button className={styles.saveBtn} onClick={handleSave}>
                              {t('save')}
                            </button>
                            <button className={styles.cancelBtn} onClick={handleCancel}>
                              {t('cancel')}
                            </button>
                          </div>
                        )
                      ) : (
                        <button 
                          className={`${styles.followBtn} ${isFollowingUser ? styles.following : ''}`} 
                          onClick={handleFollow}
                          disabled={isFollowLoading}
                        >
                          {isFollowLoading 
                            ? '...' 
                            : isFollowingUser 
                              ? (t('following') || '팔로잉') 
                              : (t('follow') || '팔로우')
                          }
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stats Section - 로그인한 사용자의 프로필인 경우만 표시 */}
                  <div className={styles.profileStats}>
                    <div className={`${styles.statItem} ${styles.clickable}`} onClick={handleFollowersClick}>
                      <span className={styles.statNumber}>{profileData.followerCount}</span>
                      <span className={styles.statLabel}>{t('followers')}</span>
                    </div>
                    <div className={`${styles.statItem} ${styles.clickable}`} onClick={handleFollowingClick}>
                      <span className={styles.statNumber}>{profileData.followingCount}</span>
                      <span className={styles.statLabel}>{t('following')}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statNumber}>{profileData.postCount}</span>
                      <span className={styles.statLabel}>{t('posts')}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className={styles.profileActionButtons}>
                    {isOwnProfile ? (
                      <>
                        <button className={`${styles.actionBtn} ${styles.primary}`} onClick={handleReceivedBookings}>
                          {t('receivedBookings')}
                        </button>
                        <button className={`${styles.actionBtn} ${styles.secondary}`} onClick={handleMyBookings}>
                          {t('myBookings')}
                        </button>
                        {/* 모바일에서만 보이는 게시물 업로드 버튼 */}
                        <button className={`${styles.actionBtn} ${styles.uploadBtn} ${styles.mobileOnly}`} onClick={handleUploadPost}>
                          <span className={styles.uploadIcon}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                          <span className={styles.uploadText}>{t('uploadPost')}</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button className={`${styles.actionBtn} ${styles.primary}`} onClick={handleChat}>
                          {t('chat')}
                        </button>
                        <button className={`${styles.actionBtn} ${styles.secondary}`} onClick={handleCompanionRequest}>
                          {t('companionRequest')}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}



              {/* Posts Section - 로딩 완료 후에만 표시 */}
              {!isLoading && (
                <div className={styles.profilePostsSection}>
                  <h2>{isOwnProfile ? t('myPosts') : `${profileData.name}${t('userPosts')}`}</h2>
                  <div className={styles.profileContentGrid}>
                    {postsLoading ? (
                      <div className={styles.profileLoading}>
                        <div className={styles.profileLoadingSpinner}>🔄</div>
                        <span>로딩 중...</span>
                      </div>
                    ) : userPosts.length === 0 ? (
                      <div className={styles.noPosts}>
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
                            photoUrl: profileData.photoUrl,
                            gender: profileData.gender,
                            birthDate: profileData.birthDate
                          }}
                          showUserInfo={false}
                          showSettings={isOwnProfile}
                          onEdit={handleEditPost}
                          onDelete={handleDeletePost}

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

        {/* 이미지 모달 */}
        {showImageModal && profileData.photoUrl && (
          <div className={styles.imageModalOverlay} onClick={handleCloseImageModal}>
            <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
              <button className={styles.modalCloseBtn} onClick={handleCloseImageModal}>
                ✕
              </button>
              <div className={styles.modalImageContainer}>
                <img 
                  src={profileData.photoUrl} 
                  alt="프로필 이미지"
                  className={styles.modalImage}
                />
              </div>
            </div>
          </div>
        )}

        {/* 팔로우 모달 */}
        {showFollowModal && (
          <div className={styles.followModalOverlay} onClick={handleCloseFollowModal}>
            <div className={styles.followModalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.followModalHeader}>
                <h3>{followModalType === 'followers' ? t('followers') : t('following')}</h3>
                <button className={styles.modalCloseBtn} onClick={handleCloseFollowModal}>
                  ✕
                </button>
              </div>
              
              <div className={styles.followModalBody}>
                {followListLoading ? (
                  <div className={styles.followModalLoading}>로딩 중...</div>
                ) : followList.length === 0 ? (
                  <div className={styles.followModalEmpty}>
                    {followModalType === 'followers' ? '팔로워가 없습니다.' : '팔로잉이 없습니다.'}
                  </div>
                ) : (
                  <div className={styles.followList}>
                    {followList.map((userInfo) => (
                      <div key={userInfo.id} className={styles.followItem}>
                        <div className={styles.followUserInfo}>
                          <div className={styles.followUserAvatar}>
                            {userInfo.photoUrl ? (
                              <img src={userInfo.photoUrl} alt={userInfo.name} />
                            ) : (
                              <div className={styles.defaultAvatar}>👤</div>
                            )}
                          </div>
                          <div className={styles.followUserName}>
                            {userInfo.name}
                          </div>
                        </div>
                        
                        {/* 팔로잉 목록에서만 취소 버튼 표시 (내가 팔로우한 사람들) */}
                        {followModalType === 'following' && isOwnProfile && (
                          <button 
                            className={styles.unfollowBtn}
                            onClick={() => handleUnfollow(userInfo.id)}
                          >
                            취소
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AuthGuard>
    </>
  );
}

// 로딩 컴포넌트
function ProfileLoading() {
  return (
    <div className={styles.profileLoading}>
      <div className={styles.profileLoadingSpinner}>로딩 중...</div>
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

