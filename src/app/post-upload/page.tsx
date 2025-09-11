'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslationContext } from '../contexts/TranslationContext';
import { useAuthContext } from '../contexts/AuthContext';
import { createPost, updatePost, PostData as PostServiceData } from '../services/postService';
import { deleteImageFromImageKit, UploadedImage } from '../services/imageKitService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { AuthGuard } from '../components/AuthGuard';
import { AppBar } from '../components/AppBar';

import GoogleMapsLocationPicker, { LocationDetails } from '../components/GoogleMapsLocationPicker';
import PostUploadCountryCitySelector from '../components/PostUploadCountryCitySelector';
import styles from './page.module.css';

interface PostData {
  content: string;
  location: string;
  locationDetails: LocationDetails | null;
  countryCode: string;
  cityCode: string;
  images: File[];
  video: File | null;
  businessHours: string;
  recommendedMenu: string;
  paymentMethod: string;
}

interface PreviewImage {
  file: File;
  url: string;
  isExisting?: boolean; // 기존 이미지인지 새 이미지인지 구분
  originalUrl?: string; // 기존 이미지의 원본 URL (ImageKit 삭제용)
}

interface PreviewVideo {
  file: File;
  url: string;
  isExisting?: boolean; // 기존 동영상인지 새 동영상인지 구분
  originalUrl?: string; // 기존 동영상의 원본 URL (ImageKit 삭제용)
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
    countryCode: '',
    cityCode: '',
    images: [],
    video: null,
    businessHours: '',
    recommendedMenu: '',
    paymentMethod: '',
  });

  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [previewVideo, setPreviewVideo] = useState<PreviewVideo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletedExistingImages, setDeletedExistingImages] = useState<string[]>([]); // 삭제된 기존 이미지 URL들
  const [deletedExistingVideo, setDeletedExistingVideo] = useState<string | null>(null); // 삭제된 기존 동영상 URL
  const [existingPost, setExistingPost] = useState<PostServiceData | null>(null); // 기존 게시물 데이터
  const [draftCount, setDraftCount] = useState(0); // 임시저장 카운트

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

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

        const existingPostData = postDoc.data() as PostServiceData;
        setExistingPost(existingPostData); // 상태에 저장
        
        // 권한 확인
        if (existingPostData.userId !== user.uid) {
          console.error('❌ 수정 권한이 없습니다:', editPostId);
          alert('이 게시물을 수정할 권한이 없습니다.');
          router.push('/profile');
          return;
        }

        console.log('✅ 기존 게시물 데이터:', existingPostData);

        // 기존 데이터로 폼 채우기
        setPostData({
          content: existingPostData.content || '',
          location: existingPostData.location?.name || '',
          locationDetails: existingPostData.location as unknown as LocationDetails || null,
          countryCode: existingPostData.countryCode || '',
          cityCode: existingPostData.cityCode || '',
          images: [], // 기존 이미지는 File 객체가 아니므로 빈 배열
          video: null, // 기존 동영상은 File 객체가 아니므로 null
          businessHours: existingPostData.businessHours || '',
          recommendedMenu: existingPostData.recommendedMenu || '',
          paymentMethod: existingPostData.paymentMethod || '',
        });

        // 기존 이미지들을 미리보기로 표시 (URL만)
        if (existingPostData.images && existingPostData.images.length > 0) {
          const existingPreviews: PreviewImage[] = existingPostData.images.map((image, index) => ({
            file: new File([], `existing_image_${index}`, { type: 'image/jpeg' }), // 더미 파일
            url: image.url,
            isExisting: true, // 기존 이미지 표시
            originalUrl: image.url // ImageKit 삭제용 원본 URL
          }));
          setPreviewImages(existingPreviews);
        }

        // 기존 동영상을 미리보기로 표시 (URL만)
        if (existingPostData.video) {
          const existingVideoPreview: PreviewVideo = {
            file: new File([], 'existing_video', { type: 'video/mp4' }), // 더미 파일
            url: existingPostData.video.url,
            isExisting: true,
            originalUrl: existingPostData.video.url // 기존 동영상 URL 저장
          };
          setPreviewVideo(existingVideoPreview);
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
  const handleInputChange = useCallback((field: keyof PostData, value: string) => {
    setPostData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);


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

  // 이미지 업로드 핸들러
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    // 기존 이미지와 합쳐서 최대 10장 제한
    if (previewImages.length + files.length > 10) {
      alert('최대 10장의 사진만 업로드할 수 있습니다.');
      return;
    }

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
      
      const url = URL.createObjectURL(file);
      setPreviewImages(prev => [...prev, { url, file, isExisting: false }]);
    });
    
    event.target.value = '';
  };

  // 동영상 업로드 핸들러
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 동영상 파일만 허용
    if (!file.type.startsWith('video/')) {
      alert(t('videoRequired'));
      return;
    }

    // 파일 크기 제한 (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert(t('videoSizeLimit'));
      return;
    }

    // 동영상 길이 확인 (10초 이내)
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const duration = video.duration;
      
      if (duration > 10) {
        alert(t('videoDurationLimit'));
        return;
      }

      // 새 동영상을 미리보기에 추가
      const newVideoPreview: PreviewVideo = {
        file,
        url: URL.createObjectURL(file),
        isExisting: false
      };

      setPreviewVideo(newVideoPreview);
      setPostData(prev => ({
        ...prev,
        video: file
      }));

      // 파일 입력 초기화
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
    };

    video.onerror = () => {
      alert(t('videoReadError'));
      window.URL.revokeObjectURL(video.src);
    };

    video.src = URL.createObjectURL(file);
  };

  // 동영상 제거 핸들러
  const handleVideoRemove = async () => {
    if (!previewVideo) return;

    if (previewVideo.isExisting && previewVideo.originalUrl) {
      // 기존 동영상인 경우 ImageKit에서 삭제하고 삭제 목록에 추가
      try {
        console.log('🗑️ 기존 동영상 삭제 시작:', previewVideo.originalUrl);
        await deleteImageFromImageKit(previewVideo.originalUrl);
        console.log('✅ ImageKit에서 동영상 삭제 완료:', previewVideo.originalUrl);
        
        // 삭제된 기존 동영상 목록에 추가
        setDeletedExistingVideo(previewVideo.originalUrl);
      } catch (error) {
        console.warn('⚠️ ImageKit 동영상 삭제 실패 (계속 진행):', error);
        // 삭제 실패해도 UI에서는 제거 (나중에 정리)
        setDeletedExistingVideo(previewVideo.originalUrl);
      }
    } else {
      // 새 동영상인 경우 URL 해제
      URL.revokeObjectURL(previewVideo.url);
    }
    
    // 로컬 상태에서 동영상 제거
    setPostData(prev => ({
      ...prev,
      video: null
    }));

    setPreviewVideo(null);
  };



  // 위치 선택 핸들러
  const handleLocationSelect = useCallback((location: string, locationDetails: LocationDetails | null) => {
    console.log('📍 Location selected:', { location, locationDetails });
    setPostData(prev => ({
      ...prev,
      location,
      locationDetails
    }));
  }, []);

  // 국가/도시 선택 핸들러
  const handleCountryCitySelect = useCallback((countryCode: string, cityCode: string) => {
    console.log('🌍 Country/City selected:', { countryCode, cityCode });
    setPostData(prev => ({
      ...prev,
      countryCode,
      cityCode
    }));
  }, []);

  // 임시 저장 데이터 로드
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('postDraft');
      if (savedDraft && !isEditMode) {
        const draftData = JSON.parse(savedDraft);
        setPostData(prev => ({
          ...prev,
          content: draftData.content || '',
          businessHours: draftData.businessHours || '',
          recommendedMenu: draftData.recommendedMenu || '',
          paymentMethod: draftData.paymentMethod || '',
        }));
        setDraftCount(1);
      }
    } catch (error) {
      console.error('임시 저장 데이터 로드 실패:', error);
    }
  }, [isEditMode]);

  // 임시 저장 데이터 삭제
  const clearDraft = () => {
    localStorage.removeItem('postDraft');
    setDraftCount(0);
  };

  // 임시 저장
  const handleSaveDraft = useCallback(() => {
    try {
      const draftData = {
        content: postData.content,
        location: postData.location,
        locationDetails: postData.locationDetails,
        countryCode: postData.countryCode,
        cityCode: postData.cityCode,
        businessHours: postData.businessHours,
        recommendedMenu: postData.recommendedMenu,
        paymentMethod: postData.paymentMethod,
        savedAt: new Date().toISOString(),
        isEditMode: isEditMode,
        editPostId: editPostId
      };

      localStorage.setItem('postDraft', JSON.stringify(draftData));
      setDraftCount(prev => prev + 1);
      alert('임시 저장되었습니다.');
    } catch (error) {
      console.error('임시 저장 실패:', error);
      alert('임시 저장에 실패했습니다.');
    }
  }, [postData, isEditMode, editPostId]);

  // 뒤로가기 시 취소 확인
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (postData.content || previewImages.length > 0 || previewVideo) {
        e.preventDefault();
        e.returnValue = '게시물 작성을 취소하시겠어요? 작성된 내용은 삭제됩니다.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [postData.content, previewImages.length, previewVideo]);

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
      alert(t('mediaRequired'));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
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

        
        // 새로 추가된 파일들만 추출
        const newImageFiles = previewImages
          .filter(img => !img.isExisting && img.file)
          .map(img => img.file!);
        
        const newImages = newImageFiles.length > 0 ? newImageFiles : undefined;
        
        console.log('📷 남은 기존 이미지:', remainingExistingImages.length, '개');
        console.log('🖼️ 새 이미지:', newImages?.length || 0, '개');
        
        const success = await updatePost(
          editPostId,
          user.uid,
          postData.content,
          postData.locationDetails,
          postData.countryCode,
          postData.cityCode,
          newImages,
          remainingExistingImages,
          postData.video, // 새 동영상 파일
          existingPost?.video, // 기존 동영상
          postData.businessHours,
          postData.recommendedMenu,
          postData.paymentMethod
        );

        if (success) {
          console.log('✅ 게시물 수정 완료');
          clearDraft(); // 임시 저장 데이터 삭제
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
          countryCode: postData.countryCode,
          cityCode: postData.cityCode,
          imageCount: postData.images.length,
          user: user.uid
        });

        // 새로 업로드할 파일들 추출
        const newImageFiles = previewImages
          .filter(img => !img.isExisting && img.file)
          .map(img => img.file!);
        

        const postId = await createPost(
          user.uid,
          postData.content,
          newImageFiles,
          postData.locationDetails,
          {
            countryCode: postData.countryCode,
            cityCode: postData.cityCode
          },
          postData.video, // 동영상 파일 전달
          postData.businessHours,
          postData.recommendedMenu,
          postData.paymentMethod,
          (progress: number) => {
            setUploadProgress(progress);
          }
        );

        console.log('✅ 게시물 업로드 완료! Post ID:', postId);
        clearDraft(); // 임시 저장 데이터 삭제
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
      <div className={styles['post-upload-container']}>
        <AppBar />
        
        <div className={styles['post-upload-body-content']}>
          
          
          <div className={styles['post-upload-main-content']}>
            <form onSubmit={handleSubmit} className={styles['post-upload-form']}>
            
            {/* 페이지 제목 */}
            <h1 className={styles['page-title']}>
              {isEditMode ? '게시물 수정' : t('createPost')}
            </h1>

            {/* 안내 사항 */}
            <div className={styles['guidelines-notice']}>
              <h3 className={styles['guidelines-title']}>{t('reviewGuidelines')}</h3>
              <p className={styles['guidelines-content']}>{t('reviewGuidelinesContent')}</p>
            </div>

            {/* 국가/도시 선택 */}
            <div className={styles['form-group']}>
              <label className={styles['form-label']}>
                <img src="/icons/compass.svg" alt="나침반" width="16" height="16" style={{ marginRight: '8px' }} />
                {t('countryAndCitySelection')}
              </label>
              <PostUploadCountryCitySelector
                selectedCountry={postData.countryCode}
                selectedCity={postData.cityCode}
                onSelectionChange={handleCountryCitySelect}
                className={styles['country-city-selector-wrapper']}
              />
            </div>

            {/* 위치 선택 */}
            <div className={styles['form-group']}>
              <label className={styles['form-label']}>
                <img src="/icons/map.svg" alt="지도" width="16" height="16" style={{ marginRight: '8px' }} />
                {t('addLocation')}
              </label>
              <GoogleMapsLocationPicker
                initialLocation={postData.location}
                locationDetails={postData.locationDetails}
                onLocationSelect={handleLocationSelect}
                className={styles['location-picker']}
              />
            </div>

            {/* 이미지 업로드 */}
            <div className={styles['form-group']}>
              <div className={styles['label-with-count']}>
                <label className={styles['form-label-secondary']}>{t('uploadImages')}</label>
                <div className={styles['media-count-info']}>
                  사진 {postData.images.length + previewImages.filter(img => img.isExisting).length}/10
                </div>
              </div>
              
              {/* 숨겨진 파일 입력들 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleImageUpload}
                className={styles['file-input']}
                style={{ display: 'none' }}
              />
              
              {/* 미디어 미리보기 컨테이너 */}
              <div className={styles['media-upload-container']}>
                {/* 이미지 미리보기 */}
                {previewImages.map((preview, index) => (
                  <div key={`img-${index}`} className={styles['image-preview-wrapper']}>
                    <img
                      src={preview.url}
                      alt={`미리보기 ${index + 1}`}
                      className={styles['image-preview']}
                    />
                    <button
                      type="button"
                      className={styles['remove-image-btn']}
                      onClick={() => handleImageRemove(index)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                
                
                {/* 이미지 추가 버튼 */}
                {previewImages.length < 10 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={styles['add-media-btn']}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    {t('addImages')}
                  </button>
                )}
              </div>
              
            </div>

            {/* 동영상 업로드 */}
            <div className={styles['form-group']}>
              <label className={styles['form-label-secondary']}>{t('uploadVideo')}</label>
              <div className={styles['video-upload-hint']}>
                {t('videoUploadHint')}
              </div>
              
              {/* 숨겨진 동영상 파일 입력 */}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className={styles['file-input']}
                style={{ display: 'none' }}
              />
              
              {/* 동영상 미리보기 컨테이너 */}
              <div className={styles['video-upload-container']}>
                {/* 동영상 미리보기 */}
                {previewVideo && (
                  <div className={styles['video-preview-wrapper']}>
                    <video
                      src={previewVideo.url}
                      controls
                      className={styles['video-preview']}
                    />
                    <button
                      type="button"
                      className={styles['remove-video-btn']}
                      onClick={handleVideoRemove}
                    >
                      ✕
                    </button>
                  </div>
                )}
                
                {/* 동영상 추가 버튼 */}
                {!previewVideo && (
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className={styles['add-video-btn']}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="23 7 16 12 23 17 23 7" stroke="currentColor" strokeWidth="2"/>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    <span>{t('addVideo')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* 영업시간과 추천 메뉴 (한 줄) */}
            <div className={styles['form-group']}>
              <div className={styles['two-column-inputs']}>
                <div className={styles['input-column']}>
                  <label className={styles['form-label-secondary']}>{t('businessHours')}</label>
                  <input
                    type="text"
                    value={postData.businessHours}
                    onChange={(e) => handleInputChange('businessHours', e.target.value)}
                    placeholder={t('businessHoursPlaceholder')}
                    className={styles['form-input']}
                  />
                </div>
                <div className={styles['input-column']}>
                  <label className={styles['form-label-secondary']}>{t('recommendedMenu')}</label>
                  <input
                    type="text"
                    value={postData.recommendedMenu}
                    onChange={(e) => handleInputChange('recommendedMenu', e.target.value)}
                    placeholder={t('recommendedMenuPlaceholder')}
                    className={styles['form-input']}
                  />
                </div>
              </div>
            </div>

            {/* 결제 방법 */}
            <div className={styles['form-group']}>
              <label className={styles['form-label-secondary']}>{t('paymentMethod')}</label>
              <div className={styles['payment-hint']}>
                {t('paymentMethodHint')}
              </div>
              <div className={styles['radio-group']}>
                <label className={styles['radio-option']}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={postData.paymentMethod === 'card'}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                  />
                  <span className={styles['radio-label']}>{t('paymentCard')}</span>
                </label>
                <label className={styles['radio-option']}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={postData.paymentMethod === 'cash'}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                  />
                  <span className={styles['radio-label']}>{t('paymentCash')}</span>
                </label>
                <label className={styles['radio-option']}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="both"
                    checked={postData.paymentMethod === 'both'}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                  />
                  <span className={styles['radio-label']}>{t('paymentBoth')}</span>
                </label>
              </div>
            </div>

            {/* 게시글 내용 */}
            <div className={styles['form-group']}>
              <label className={styles['form-label-secondary']}>{t('postContent')}</label>
              <textarea
                value={postData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder={t('contentPlaceholder')}
                className={styles['form-textarea']}
                rows={6}
                maxLength={1000}
              />
              <div className={styles['char-count']}>
                {postData.content.length}/1000
              </div>
            </div>

            {/* 선택된 위치 표시는 GoogleMapsLocationPicker 내부에서 처리 */}





            {/* 버튼 섹션 */}
            <div className={styles['button-section']}>
              <button
                type="button"
                className={styles['save-draft-btn']}
                onClick={handleSaveDraft}
                disabled={isUploading}
              >
                임시 저장 {draftCount > 0 && `(${draftCount})`}
              </button>
              
              <button
                type="submit"
                className={styles['submit-btn']}
                disabled={isUploading}
              >
                {isUploading 
                  ? `${isEditMode ? '수정' : '업로드'} 중... ${uploadProgress.toFixed(0)}%` 
                  : isEditMode ? '게시물 수정' : t('createPost')
                }
              </button>
              
              {/* 업로드 진행률 표시 */}
              {isUploading && (
                <div className={styles['upload-progress']}>
                  <div className={styles['progress-bar']}>
                    <div 
                      className={styles['progress-fill']}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className={styles['progress-text']}>
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
        </div>
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