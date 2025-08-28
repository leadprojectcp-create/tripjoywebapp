'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useTranslationContext } from '../../contexts/TranslationContext';
import { getUserData, updateUserProfile } from '../../auth/services/authService';
import { uploadImage } from '../../services/imageKitService';
import { Sidebar } from '../../components/Sidebar';
import { AppBar } from '../../components/AppBar';
import { RightSidebar } from '../../components/RightSidebar';
import { BottomNavigator } from '../../components/BottomNavigator';
import { AuthGuard } from '../../components/AuthGuard';
import ClientStyleProvider from '../../components/ClientStyleProvider';
import './style.css';

interface ProfileEditData {
  name: string;
  email: string;
  phoneNumber: string;
  gender: 'male' | 'female' | '';
  bio: string;
  image: string;
  companionRequestEnabled: boolean;
}

function ProfileEditContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslationContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileData, setProfileData] = useState<ProfileEditData>({
    name: '',
    email: '',
    phoneNumber: '',
    gender: '',
    bio: '',
    image: '',
    companionRequestEnabled: true
  });

  const [isLoading, setIsLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);

  // 한국어 성별을 영어로 변환하는 함수
  const convertGenderToEnglish = (koreanGender: string): 'male' | 'female' | '' => {
    if (koreanGender === '남성') return 'male';
    if (koreanGender === '여성') return 'female';
    return '';
  };

  // 영어 성별을 한국어로 변환하는 함수
  const convertGenderToKorean = (englishGender: 'male' | 'female' | ''): string => {
    if (englishGender === 'male') return '남성';
    if (englishGender === 'female') return '여성';
    return '';
  };

  // 사용자 데이터 로드
  useEffect(() => {
    const loadUserData = async () => {
      if (!user?.uid) return;

      try {
        const userData = await getUserData(user.uid);
        if (userData) {
          console.log('🔍 로드된 사용자 데이터:', userData);
          console.log('🔍 원본 성별 값:', userData.gender);
          
          const convertedGender = convertGenderToEnglish(userData.gender || '');
          console.log('🔍 변환된 성별 값:', convertedGender);
          
          setProfileData({
            name: userData.name || '',
            email: userData.email || '',
            phoneNumber: userData.phoneNumber || '',
            gender: convertedGender,
            bio: userData.bio || '',
            image: userData.photoUrl || userData.image || '', // photoUrl 우선, 없으면 image 필드
            companionRequestEnabled: userData.companionRequestEnabled ?? true
          });
        }
      } catch (error) {
        console.error('사용자 데이터 로드 실패:', error);
      }
    };

    loadUserData();
  }, [user]);

  // 입력값 변경 핸들러
  const handleInputChange = (field: keyof ProfileEditData, value: string | boolean) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 이미지 클릭 핸들러 (팝업 열기)
  const handleImageClick = () => {
    if (profileData.image) {
      setShowImageModal(true);
    }
  };

  // 이미지 모달 닫기
  const handleCloseImageModal = () => {
    setShowImageModal(false);
  };

  // 이미지 업로드 핸들러
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) return;

    setImageUploading(true);
    setUploadProgress(0);
    setUploadStage('시작 중...');
    
    try {
      console.log('📸 프로필 이미지 업로드 시작:', file.name);
      console.log('👤 사용자 ID:', user.uid);
      
      // 데이터베이스에서 현재 photoUrl 가져오기 (삭제용)
      let oldImageUrl = profileData.image; // 기본값
      
      try {
        const currentUserData = await getUserData(user.uid);
        if (currentUserData?.photoUrl) {
          oldImageUrl = currentUserData.photoUrl;
          console.log('🔍 DB에서 가져온 기존 photoUrl:', oldImageUrl);
        } else {
          console.log('⚠️ DB에 photoUrl이 없음, 현재 이미지 사용:', oldImageUrl);
        }
      } catch (error) {
        console.warn('⚠️ 사용자 데이터 조회 실패, 현재 이미지 사용:', error);
      }
      
      // tripjoy/profile/userId/ 폴더에 업로드 (진행률 콜백 + 기존 이미지 삭제)
      const imageUrl = await uploadImage(file, user.uid, (progress, stage) => {
        setUploadProgress(progress);
        setUploadStage(stage);
        console.log(`📊 업로드 진행률: ${progress}% - ${stage}`);
      }, oldImageUrl);
      
      console.log('✅ 업로드된 이미지 URL:', imageUrl);
      
      setProfileData(prev => ({
        ...prev,
        image: imageUrl
      }));
      
      // 성공 후 진행률 초기화
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStage('');
      }, 1000);
      
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      alert(t('imageUploadError'));
      setUploadProgress(0);
      setUploadStage('');
    } finally {
      setImageUploading(false);
    }
  };

  // 프로필 저장 핸들러
  const handleSave = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      const koreanGender = convertGenderToKorean(profileData.gender);
      console.log('💾 저장할 성별 값:', profileData.gender, '→', koreanGender);
      console.log('💾 저장할 이미지 URL:', profileData.image);
      
      await updateUserProfile(user.uid, {
        name: profileData.name,
        phoneNumber: profileData.phoneNumber,
        gender: koreanGender, // 한국어로 변환해서 저장
        bio: profileData.bio,
        photoUrl: profileData.image, // photoUrl 필드에 이미지 경로 저장
        companionRequestEnabled: profileData.companionRequestEnabled
      });

      alert(t('updateSuccess'));
      router.push('/profile');
    } catch (error) {
      console.error('프로필 업데이트 실패:', error);
      alert(t('updateError'));
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <>
      <AuthGuard>
        <ClientStyleProvider>
          <div className="profile-edit-container">
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
              <div className="profile-edit-main-content">
                <div className="profile-edit-header">
                  <h1 className="profile-edit-title">{t('title')}</h1>
                </div>

      <div className="profile-edit-content">
        {/* 프로필 이미지 섹션 */}
        <div className="profile-image-section">
          <h3>{t('profileImage')}</h3>
          <div className="profile-image-container">
            <div className="profile-image-wrapper">
              {profileData.image ? (
                <img 
                  src={profileData.image} 
                  alt="Profile" 
                  className="profile-image clickable"
                  onClick={handleImageClick}
                />
              ) : (
                <div className="profile-image-placeholder">
                  <span className="profile-initial">
                    {profileData.name.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
              )}
              <button 
                className="image-upload-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageUploading}
              >
                {imageUploading ? '⏳' : '📷'}
              </button>
              
              {/* 업로드 진행률 표시 */}
              {imageUploading && (
                <div className="upload-progress-container">
                  <div className="upload-progress-bar">
                    <div 
                      className="upload-progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <div className="upload-progress-text">
                    {uploadProgress}% - {uploadStage}
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* 닉네임 */}
        <div className="form-group">
          <label>{t('nickname')}</label>
          <input
            type="text"
            value={profileData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="form-input"
          />
        </div>

        {/* 이메일 */}
        <div className="form-group">
          <label>{t('email')}</label>
          <input
            type="email"
            value={profileData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="form-input"
            disabled
          />
        </div>

        {/* 휴대폰 번호 */}
        <div className="form-group">
          <label>{t('phoneNumber')}</label>
          <input
            type="tel"
            value={profileData.phoneNumber}
            onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
            className="form-input"
          />
        </div>

        {/* 성별 탭 */}
        <div className="form-group">
          <label>{t('gender')}</label>
          <div className="gender-tabs">
            <button
              type="button"
              className={`gender-tab ${profileData.gender === 'male' ? 'active' : ''}`}
              onClick={() => handleInputChange('gender', 'male')}
            >
              {t('genderMale')}
            </button>
            <button
              type="button"
              className={`gender-tab ${profileData.gender === 'female' ? 'active' : ''}`}
              onClick={() => handleInputChange('gender', 'female')}
            >
              {t('genderFemale')}
            </button>
          </div>
        </div>

        {/* 자기소개 */}
        <div className="form-group">
          <label>{t('bio')}</label>
          <textarea
            value={profileData.bio}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            placeholder={t('bioPlaceholder')}
            className="form-textarea"
            maxLength={150}
          />
          <div className="bio-counter">
            {profileData.bio.length}/150
          </div>
          <div className="bio-hint">
            {t('bioMaxLength')}
          </div>
        </div>

        {/* 동행신청 활성화 */}
        <div className="form-group">
          <div className="notification-section">
            <h3>{t('notificationSettings')}</h3>
            <div className="notification-item">
              <div className="notification-info">
                <div className="notification-title">
                  {t('notificationSettings')}
                </div>
                <div className="notification-description">
                  {t('notificationDescription')}
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={profileData.companionRequestEnabled}
                  onChange={(e) => handleInputChange('companionRequestEnabled', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

                {/* 저장 버튼 */}
                <div className="form-actions">
                  <button
                    className="save-button"
                    onClick={handleSave}
                    disabled={isLoading || imageUploading}
                  >
                    {isLoading ? '...' : t('saveButton')}
                  </button>
                </div>
              </div>
              </div>
              
              {/* Right Sidebar */}
              <RightSidebar />
            </div>
          </div>
          <BottomNavigator />
        </ClientStyleProvider>

        {/* 이미지 모달 */}
        {showImageModal && profileData.image && (
          <div className="image-modal-overlay" onClick={handleCloseImageModal}>
            <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={handleCloseImageModal}>
                ✕
              </button>
              <div className="modal-image-container">
                <img 
                  src={profileData.image} 
                  alt="프로필 이미지"
                  className="modal-image"
                />
              </div>
            </div>
          </div>
        )}
      </AuthGuard>
    </>
  );
}

// 메인 export 함수
export default function ProfileEditPage() {
  return <ProfileEditContent />;
}
