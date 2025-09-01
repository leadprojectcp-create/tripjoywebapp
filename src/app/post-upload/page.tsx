'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslationContext } from '../contexts/TranslationContext';
import { useAuthContext } from '../contexts/AuthContext';
import { createPost, updatePost, PostData as PostServiceData } from '../services/postService';
import { deleteImageFromImageKit, UploadedImage } from '../services/imageKitService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { AuthGuard } from '../components/AuthGuard';
import { AppBar } from '../components/AppBar';
import { Sidebar } from '../components/Sidebar';
import { RightSidebar } from '../components/RightSidebar';
import GoogleMapsLocationPicker, { LocationDetails } from '../components/GoogleMapsLocationPicker';
import CountryAndCitySelector from '../components/CountryAndCitySelector';
import './page.css';

interface PostData {
  content: string;
  location: string;
  locationDetails: LocationDetails | null;
  locationDescription: string; // 위치에 대한 추가 설명
  countryCode: string;
  cityCode: string;
  images: File[];
  hashtags: string;
  companionAvailable: boolean; // 동행 가능 여부
}

interface PreviewImage {
  file: File;
  url: string;
  isExisting?: boolean; // 기존 이미지인지 새 이미지인지 구분
  originalUrl?: string; // 기존 이미지의 원본 URL (ImageKit 삭제용)
}

const PostUploadContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const { t } = useTranslationContext();
  
  // 수정 모드 감지
  const editPostId = searchParams.get('edit');
  const isEditMode = !!editPostId;

  // State
  const [postData, setPostData] = useState<PostData>({
    content: '',
    location: '',
    locationDetails: null,
    locationDescription: '',
    countryCode: '',
    cityCode: '',
    images: [],
    hashtags: '',
    companionAvailable: false // 동행 가능 여부 기본값
  });

  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletedExistingImages, setDeletedExistingImages] = useState<string[]>([]); // 삭제된 기존 이미지 URL들

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 수정 모드일 때 기존 게시물 데이터 로드
  useEffect(() => {
    const loadPostData = async () => {
      if (!isEditMode || !editPostId || !user?.uid) return;

      try {
        console.log('📝 수정할 게시물 데이터 로드 시작:', editPostId);
        
        const postDoc = await getDoc(doc(db, 'posts', editPostId));
        if (!postDoc.exists()) {
          console.error('❌ 게시물을 찾을 수 없습니다:', editPostId);
          alert('게시물을 찾을 수 없습니다.');
          router.push('/profile');
          return;
        }

        const existingPost = postDoc.data() as PostServiceData;
        
        // 권한 확인
        if (existingPost.userId !== user.uid) {
          console.error('❌ 수정 권한이 없습니다:', editPostId);
          alert('이 게시물을 수정할 권한이 없습니다.');
          router.push('/profile');
          return;
        }

        console.log('✅ 기존 게시물 데이터:', existingPost);

        // 기존 데이터로 폼 채우기
        setPostData({
          content: existingPost.content || '',
          location: existingPost.location?.name || '',
          locationDetails: existingPost.location as unknown as LocationDetails || null,
          locationDescription: '',
          countryCode: '',
          cityCode: '',
          images: [], // 기존 이미지는 File 객체가 아니므로 빈 배열
          hashtags: existingPost.hashtags?.join(' ') || '',
          companionAvailable: existingPost.companionAvailable || false
        });

        // 기존 이미지들을 미리보기로 표시 (URL만)
        if (existingPost.images && existingPost.images.length > 0) {
          const existingPreviews: PreviewImage[] = existingPost.images.map((image, index) => ({
            file: new File([], `existing_image_${index}`, { type: 'image/jpeg' }), // 더미 파일
            url: image.url,
            isExisting: true, // 기존 이미지 표시
            originalUrl: image.url // ImageKit 삭제용 원본 URL
          }));
          setPreviewImages(existingPreviews);
        }

      } catch (error) {
        console.error('❌ 게시물 데이터 로드 실패:', error);
        alert('게시물 데이터를 불러오는데 실패했습니다.');
        router.push('/profile');
      }
    };

    loadPostData();
  }, [isEditMode, editPostId, user?.uid, router]);

  // 입력 필드 변경 핸들러
  const handleInputChange = (field: keyof PostData, value: string) => {
    setPostData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 다중 이미지 업로드 핸들러
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    // 기존 이미지와 합쳐서 최대 10장 제한
    if (postData.images.length + files.length > 10) {
      alert('최대 10장의 사진까지 업로드할 수 있습니다.');
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: PreviewImage[] = [];

    files.forEach(file => {
      // 이미지 파일 검증
      if (!file.type.startsWith('image/')) {
        alert(`${file.name}은(는) 이미지 파일이 아닙니다.`);
        return;
      }

      // 파일 크기 제한 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name}의 파일 크기는 10MB 이하여야 합니다.`);
        return;
      }

      validFiles.push(file);

      // 미리보기 URL 생성
      const url = URL.createObjectURL(file);
      newPreviews.push({ 
        file, 
        url,
        isExisting: false // 새 이미지 표시
      });
    });

    if (validFiles.length > 0) {
      setPostData(prev => ({
        ...prev,
        images: [...prev.images, ...validFiles]
      }));

      setPreviewImages(prev => [...prev, ...newPreviews]);
    }

    // input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 이미지 제거 핸들러
  const handleImageRemove = async (index: number) => {
    const imageToRemove = previewImages[index];
    
    if (imageToRemove.isExisting && imageToRemove.originalUrl) {
      // 기존 이미지인 경우 ImageKit에서 삭제하고 삭제 목록에 추가
      try {
        console.log('🗑️ 기존 이미지 삭제 시작:', imageToRemove.originalUrl);
        await deleteImageFromImageKit(imageToRemove.originalUrl);
        console.log('✅ ImageKit에서 이미지 삭제 완료:', imageToRemove.originalUrl);
        
        // 삭제된 기존 이미지 목록에 추가
        setDeletedExistingImages(prev => [...prev, imageToRemove.originalUrl!]);
      } catch (error) {
        console.warn('⚠️ ImageKit 이미지 삭제 실패 (계속 진행):', error);
        // 삭제 실패해도 UI에서는 제거 (나중에 정리)
        setDeletedExistingImages(prev => [...prev, imageToRemove.originalUrl!]);
      }
    } else {
      // 새 이미지인 경우 URL 해제
      URL.revokeObjectURL(imageToRemove.url);
    }
    
    // 로컬 상태에서 이미지 제거
    setPostData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));

    setPreviewImages(prev => prev.filter((_, i) => i !== index));
  };

  // 위치 선택 핸들러
  const handleLocationSelect = (location: string, locationDetails: LocationDetails | null) => {
    console.log('📍 Location selected:', { location, locationDetails });
    setPostData(prev => ({
      ...prev,
      location,
      locationDetails
    }));
  };

  // 국가/도시 선택 핸들러
  const handleCountryCitySelect = (countryCode: string, cityCode: string) => {
    console.log('🌍 Country/City selected:', { countryCode, cityCode });
    setPostData(prev => ({
      ...prev,
      countryCode,
      cityCode
    }));
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid) {
      alert('로그인이 필요합니다.');
      router.push('/auth/login');
      return;
    }

    if (!postData.content.trim()) {
      alert(t('contentRequired'));
      return;
    }

    if (postData.images.length === 0 && previewImages.length === 0) {
      alert(t('imageRequired'));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const hashtags = postData.hashtags.split(' ').filter(tag => tag.trim() !== '');

      if (isEditMode && editPostId) {
        // 수정 모드
        console.log('📝 게시물 수정 시작:', editPostId);
        
        // 남은 기존 이미지들 추출 (삭제되지 않은 기존 이미지들)
        const remainingExistingImages = previewImages
          .filter(img => img.isExisting && img.originalUrl)
          .map((img, index) => ({
            id: `existing_${index}`,
            url: img.originalUrl!,
            originalName: `existing_image_${index}`,
            size: 0,
            width: 0, // 기존 이미지는 크기 정보가 없으므로 0으로 설정
            height: 0,
            urls: {
              original: img.originalUrl!,
              thumbnail: img.originalUrl!,
              medium: img.originalUrl!
            }
          }));
        
        // 새로 추가된 이미지들만 추출
        const newImages = postData.images.length > 0 ? postData.images : undefined;
        
        console.log('📷 남은 기존 이미지:', remainingExistingImages.length, '개');
        console.log('🖼️ 새 이미지:', newImages?.length || 0, '개');
        
        const success = await updatePost(
          editPostId,
          user.uid,
          postData.content,
          postData.locationDetails,
          postData.locationDescription,
          postData.countryCode,
          postData.cityCode,
          hashtags,
          postData.companionAvailable,
          newImages,
          remainingExistingImages
        );

        if (success) {
          console.log('✅ 게시물 수정 완료');
          alert('게시물이 수정되었습니다.');
          router.push('/profile');
        } else {
          throw new Error('게시물 수정에 실패했습니다.');
        }
      } else {
        // 새 게시물 생성
        console.log('🚀 게시물 업로드 시작:', {
          content: postData.content,
          location: postData.location,
          locationDetails: postData.locationDetails,
          locationDescription: postData.locationDescription,
          countryCode: postData.countryCode,
          cityCode: postData.cityCode,
          hashtags: hashtags,
          imageCount: postData.images.length,
          user: user.uid
        });

        const postId = await createPost(
          user.uid,
          postData.content,
          postData.images,
          postData.locationDetails,
          postData.locationDescription,
          postData.hashtags,
          postData.companionAvailable,
          {
            countryCode: postData.countryCode,
            cityCode: postData.cityCode
          },
          (progress) => {
            setUploadProgress(progress);
          }
        );

        console.log('✅ 게시물 업로드 완료! Post ID:', postId);
        alert(t('uploadSuccess'));
        
        // 홈으로 이동
        router.push('/');
      }
    } catch (error: any) {
      console.error('❌ 게시물 업로드 실패:', error);
      
      let errorMessage = '게시물 업로드에 실패했습니다. 다시 시도해 주세요.';
      
      if (error.message?.includes('ImageKit')) {
        errorMessage = '이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.';
      } else if (error.message?.includes('Firestore')) {
        errorMessage = '게시물 저장에 실패했습니다. 인터넷 연결을 확인해 주세요.';
      }
      
      alert(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <AuthGuard>
      <div className="post-upload-container">
        <AppBar />
        <Sidebar />
        
        <div className="post-upload-main-content">
          <form onSubmit={handleSubmit} className="post-upload-form">
            
            {/* 페이지 제목 */}
            <h1 className="page-title">
              {isEditMode ? '게시물 수정' : t('createPost')}
            </h1>

            {/* 이미지 업로드 */}
            <div className="form-group">
              <label className="form-label">{t('uploadImages')}</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="file-input"
                style={{ display: 'none' }}
              />
              
              {/* 이미지 미리보기 */}
              <div className="image-upload-container">
                {previewImages.map((preview, index) => (
                  <div key={index} className="image-preview-wrapper">
                    <img
                      src={preview.url}
                      alt={`미리보기 ${index + 1}`}
                      className="image-preview"
                    />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => handleImageRemove(index)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                
                {/* 이미지 추가 버튼 */}
                {postData.images.length < 10 && (
                  <button
                    type="button"
                    className="add-image-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    {t('addImage')}
                  </button>
                )}
              </div>
              <div className="image-count-info">
                {postData.images.length}/10 {t('uploadImages')}
              </div>
            </div>

            {/* 게시글 내용 */}
            <div className="form-group">
              <label className="form-label">{t('postContent')}</label>
              <textarea
                value={postData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder={t('contentPlaceholder')}
                className="form-textarea"
                rows={6}
                maxLength={1000}
              />
              <div className="char-count">
                {postData.content.length}/1000
              </div>
            </div>

            {/* 위치 선택 */}
            <GoogleMapsLocationPicker
              initialLocation={postData.location}
              locationDetails={postData.locationDetails}
              onLocationSelect={handleLocationSelect}
              className="location-picker"
            />

            {/* 선택된 위치 표시는 GoogleMapsLocationPicker 내부에서 처리 */}

            {/* 위치 설명 (위치가 선택된 경우에만 표시) */}
            {postData.locationDetails && (
              <div className="form-group location-description-group">
                <label className="form-label">{t('locationDescriptionLabel')}</label>
                <textarea
                  value={postData.locationDescription}
                  onChange={(e) => handleInputChange('locationDescription', e.target.value)}
                  placeholder={t('locationDescriptionPlaceholder')}
                  className="form-textarea location-description-textarea"
                  rows={3}
                  maxLength={200}
                />
                <div className="char-count">
                  {postData.locationDescription.length}/200
                </div>
                <div className="location-description-hint">
                  {t('locationDescriptionHint')}
                </div>
              </div>
            )}

            {/* 국가/도시 선택 */}
            <div className="form-group">
              <CountryAndCitySelector
                selectedCountry={postData.countryCode}
                selectedCity={postData.cityCode}
                onSelectionChange={handleCountryCitySelect}
                className="country-city-selector-wrapper"
              />
            </div>

            {/* 해시태그 */}
            <div className="form-group">
              <label className="form-label">{t('hashtags')}</label>
              <input
                type="text"
                value={postData.hashtags}
                onChange={(e) => handleInputChange('hashtags', e.target.value)}
                placeholder={t('hashtagsPlaceholder')}
                className="form-input hashtags-input"
                maxLength={200}
              />
              <div className="hashtags-hint">
                {t('hashtagsHint')}
              </div>
            </div>

            {/* 동행 가능 여부 */}
            <div className="form-group">
              <div className="notification-section">
                <h3>🤝 동행 가능 여부</h3>
                <div className="notification-item">
                  <div className="notification-info">
                    <div className="notification-title">
                      동행 가능 여부
                    </div>
                    <div className="notification-description">
                      {postData.companionAvailable 
                        ? '다른 여행자들과 함께 여행할 수 있습니다.' 
                        : '혼자 여행하거나 동행을 원하지 않습니다.'}
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={postData.companionAvailable}
                      onChange={(e) => setPostData(prev => ({ ...prev, companionAvailable: e.target.checked }))}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            {/* 제출 버튼 */}
            <div className="submit-section">
              <button
                type="submit"
                className="submit-btn"
                disabled={isUploading}
              >
                {isUploading 
                  ? `${isEditMode ? '수정' : '업로드'} 중... ${uploadProgress.toFixed(0)}%` 
                  : isEditMode ? '게시물 수정' : t('uploadPost')
                }
              </button>
              
              {/* 업로드 진행률 표시 */}
              {isUploading && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className="progress-text">
                    {uploadProgress < 80 
                      ? '이미지 업로드 중...' 
                      : uploadProgress < 95 
                      ? '게시물 저장 중...' 
                      : '완료 중...'}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
        
        <RightSidebar />
      </div>
    </AuthGuard>
  );
};

const PostUpload: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PostUploadContent />
    </Suspense>
  );
};

export default PostUpload;