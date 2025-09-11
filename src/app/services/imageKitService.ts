/**
 * ImageKit.io 이미지 업로드 서비스
 */

export interface ImageKitUploadResponse {
  fileId: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  height: number;
  width: number;
  size: number;
}

export interface UploadedImage {
  id: string;
  url: string;
  originalName: string;
  size: number;
  width: number;
  height: number;
  // 다양한 크기의 URL들을 배열로 제공
  urls: {
    original: string;
    thumbnail: string;
    medium?: string;
    large?: string;
  };
}


const IMAGEKIT_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_ENDPOINT;
const IMAGEKIT_PUBLIC_KEY = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;

/**
 * ImageKit 업로드를 위한 인증 토큰 생성 (서버 사이드)
 */
export const getImageKitAuthToken = async (): Promise<{
  signature: string;
  expire: number;
  token: string;
}> => {
  try {
    const response = await fetch('/api/imagekit/auth');
    if (!response.ok) {
      throw new Error('Failed to get ImageKit auth token');
    }
    return await response.json();
  } catch (error) {
    console.error('ImageKit 인증 토큰 생성 실패:', error);
    throw error;
  }
};

// 🗑️ 이미지 리사이즈 함수 제거됨 - 원본 해상도 보존을 위해

/**
 * ImageKit에서 이미지 삭제 (서버 API 통해)
 */
export const deleteImageFromImageKit = async (imageUrl: string): Promise<boolean> => {
  try {
    console.log('🗑️ ImageKit 이미지 삭제 시작:', imageUrl);

    // 서버 API를 통해 이미지 삭제 요청
    const response = await fetch('/api/imagekit/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ ImageKit 이미지 삭제 성공:', result);
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ ImageKit 이미지 삭제 실패:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ ImageKit 이미지 삭제 중 오류:', error);
    return false;
  }
};

/**
 * ImageKit URL에서 fileId 추출
 */
const extractFileIdFromUrl = (imageUrl: string): string | null => {
  try {
    // ImageKit URL 패턴: https://ik.imagekit.io/your-imagekit-id/path/filename
    // 또는 tr 파라미터가 있는 경우를 고려
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    
    // 마지막 부분이 파일명이고, 그 앞이 경로
    const fileName = pathParts[pathParts.length - 1];
    
    // 파일명에서 확장자 제거하여 fileId로 사용
    // 실제로는 ImageKit API를 통해 파일 목록을 조회해야 할 수도 있음
    return fileName.split('.')[0];
  } catch (error) {
    console.error('URL 파싱 오류:', error);
    return null;
  }
};

/**
 * 사용자의 기존 프로필 이미지 삭제
 */
export const deleteOldProfileImage = async (oldImageUrl: string): Promise<void> => {
  if (!oldImageUrl || oldImageUrl.trim() === '') {
    console.log('🔍 삭제할 기존 이미지가 없습니다.');
    return;
  }

  try {
    console.log('🗑️ 기존 프로필 이미지 삭제 시도:', oldImageUrl);
    
    // 삭제 시도 (실패해도 업로드는 계속 진행)
    try {
      const deleted = await deleteImageFromImageKit(oldImageUrl);
      if (deleted) {
        console.log('✅ 기존 프로필 이미지 삭제 완료');
      } else {
        console.warn('⚠️ 기존 프로필 이미지 삭제 실패 (계속 진행)');
      }
    } catch (deleteError) {
      console.warn('⚠️ 이미지 삭제 실패하지만 업로드는 계속 진행:', deleteError);
      // 삭제 실패는 치명적이지 않으므로 계속 진행
    }
  } catch (error) {
    console.error('❌ 기존 프로필 이미지 삭제 중 오류:', error);
    // 삭제 실패해도 새 이미지 업로드는 계속 진행
  }
};

/**
 * 프로필 이미지 업로드 (사용자 ID별 폴더)
 */
export const uploadImage = async (
  file: File,
  userId: string,
  onProgress?: (progress: number, stage: string) => void,
  oldImageUrl?: string
): Promise<string> => {
  try {
    console.log('📸 원본 이미지:', {
      이름: file.name,
      크기: `${(file.size / 1024).toFixed(1)}KB`,
      타입: file.type
    });

    // 0단계: 기존 이미지 삭제 (0-20%)
    if (oldImageUrl) {
      onProgress?.(5, '기존 이미지 삭제 중...');
      await deleteOldProfileImage(oldImageUrl);
      onProgress?.(20, '기존 이미지 삭제 완료');
    }

    // 1단계: 원본 이미지 업로드 (20-100%)
    onProgress?.(30, '원본 이미지 업로드 중...');
    const profileFolder = `profile/${userId}`;
    console.log('📁 프로필 이미지 업로드 폴더:', profileFolder);
    
    const uploadedImage = await uploadImageToImageKit(file, profileFolder);
    onProgress?.(100, '업로드 완료');
    
    return uploadedImage.url;
  } catch (error) {
    console.error('프로필 이미지 업로드 실패:', error);
    onProgress?.(0, '업로드 실패');
    throw error;
  }
};

/**
 * ImageKit에 동영상 업로드
 */
export const uploadVideoToImageKit = async (
  file: File,
  postId: string,
  fileName?: string
): Promise<UploadedImage> => {
  try {
    console.log('🎥 ImageKit 동영상 업로드 시작:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    if (!IMAGEKIT_PUBLIC_KEY) {
      throw new Error('ImageKit Public Key가 설정되지 않았습니다. .env 파일을 확인해주세요.');
    }

    // 인증 토큰 가져오기
    const authToken = await getImageKitAuthToken();

    // 파일명 생성 (중복 방지를 위해 timestamp 추가)
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const finalFileName = fileName || `video_${timestamp}.${extension}`;

    // 폴더 경로: tripjoy/{postId}/videos/
    const folder = `tripjoy/${postId}/videos`;

    // FormData 생성
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', finalFileName);
    formData.append('folder', folder);
    formData.append('publicKey', IMAGEKIT_PUBLIC_KEY);
    formData.append('signature', authToken.signature);
    formData.append('expire', authToken.expire.toString());
    formData.append('token', authToken.token);
    formData.append('useOriginalFileName', 'true'); // 원본 파일명 사용
    formData.append('overwriteFile', 'false'); // 파일 덮어쓰기 방지
    

    console.log('📤 ImageKit 동영상 업로드 요청:', {
      fileName: finalFileName,
      folder: folder,
      fileSize: file.size,
      fileType: file.type,
      useOriginalFileName: true,
      overwriteFile: false
    });

    // ImageKit 업로드 요청
    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`ImageKit 동영상 업로드 실패: ${errorData.message}`);
    }

    const result: ImageKitUploadResponse = await response.json();

    console.log('✅ ImageKit 동영상 업로드 완료:', {
      fileId: result.fileId,
      url: result.url,
      size: result.size,
      width: result.width,
      height: result.height,
      dimensions: `${result.width} x ${result.height}`,
      originalFileName: file.name,
      originalFileSize: file.size,
      isOriginalPreserved: result.width && result.height ? '원본 해상도 보존됨' : '해상도 변환됨'
    });

    // 동영상 썸네일 생성 (1프레임 추출)
    const thumbnailUrl = await extractVideoThumbnail(file, postId, result.fileId);

    return {
      id: result.fileId,
      url: result.url,
      originalName: file.name,
      size: result.size,
      width: result.width,
      height: result.height,
      urls: {
        original: result.url,
        thumbnail: thumbnailUrl,
      },
    };
  } catch (error) {
    console.error('ImageKit 동영상 업로드 실패:', error);
    throw error;
  }
};

/**
 * ImageKit에 이미지 업로드
 */
export const uploadImageToImageKit = async (
  file: File,
  postId: string,
  fileName?: string
): Promise<UploadedImage> => {
  try {
    console.log('🔧 ImageKit 환경변수 확인:', {
      endpoint: IMAGEKIT_ENDPOINT ? '✅ 설정됨' : '❌ 없음',
      publicKey: IMAGEKIT_PUBLIC_KEY ? '✅ 설정됨' : '❌ 없음'
    });

    if (!IMAGEKIT_PUBLIC_KEY) {
      throw new Error('ImageKit Public Key가 설정되지 않았습니다. .env 파일을 확인해주세요.');
    }

    // 인증 토큰 가져오기
    console.log('🔑 ImageKit 인증 토큰 요청 중...');
    const authToken = await getImageKitAuthToken();
    console.log('✅ 인증 토큰 획득 완료');

    // 파일명 생성 (중복 방지를 위해 timestamp 추가)
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const finalFileName = fileName || `image_${timestamp}.${extension}`;

    // 폴더 경로: tripjoy/{postId}/
    const folder = `tripjoy/${postId}`;

    // FormData 생성
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', finalFileName);
    formData.append('folder', folder);
    formData.append('publicKey', IMAGEKIT_PUBLIC_KEY);
    formData.append('signature', authToken.signature);
    formData.append('expire', authToken.expire.toString());
    formData.append('token', authToken.token);
    
    // 🖼️ 이미지 원본 해상도 보존 설정
    formData.append('useOriginalFileName', 'true'); // 원본 파일명 사용
    formData.append('overwriteFile', 'false'); // 파일 덮어쓰기 방지

    console.log('📤 ImageKit 이미지 업로드 요청:', {
      fileName: finalFileName,
      folder: folder,
      fileSize: file.size,
      fileType: file.type,
      useOriginalFileName: true,
      overwriteFile: false,
      publicKey: IMAGEKIT_PUBLIC_KEY?.substring(0, 10) + '...'
    });

    // ImageKit 업로드 요청 (올바른 업로드 엔드포인트 사용)
    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`ImageKit 업로드 실패: ${errorData.message}`);
    }

    const result: ImageKitUploadResponse = await response.json();

    console.log('✅ ImageKit 이미지 업로드 완료:', {
      fileId: result.fileId,
      url: result.url,
      size: result.size,
      width: result.width,
      height: result.height,
      dimensions: `${result.width} x ${result.height}`,
      originalFileName: file.name,
      originalFileSize: file.size,
      isOriginalPreserved: result.width && result.height ? '원본 해상도 보존됨' : '해상도 변환됨'
    });

    // 다양한 크기의 URL 생성
    const baseUrl = result.url;
    const thumbnailUrl = result.thumbnailUrl || getOptimizedImageUrl(baseUrl, { width: 300, height: 300, quality: 80 });
    const mediumUrl = getOptimizedImageUrl(baseUrl, { width: 800, height: 600, quality: 85 });
    const largeUrl = getOptimizedImageUrl(baseUrl, { width: 1200, height: 900, quality: 90 });

    return {
      id: result.fileId,
      url: baseUrl, // 원본 URL
      originalName: file.name,
      size: result.size,
      width: result.width,
      height: result.height,
      // URL 배열 형태로 제공
      urls: {
        original: baseUrl,
        thumbnail: thumbnailUrl,
        medium: mediumUrl,
        large: largeUrl,
      },
    };
  } catch (error) {
    console.error('ImageKit 업로드 실패:', error);
    throw error;
  }
};

/**
 * 여러 이미지를 동시에 업로드 (병렬 처리)
 */
export const uploadMultipleImages = async (
  files: File[],
  postId: string,
  onProgress?: (progress: number) => void
): Promise<UploadedImage[]> => {
  try {
    console.log(`🖼️ ${files.length}개 이미지 업로드 시작: PostID ${postId}`);

    const uploadPromises = files.map(async (file, index) => {
      try {
        const result = await uploadImageToImageKit(file, postId, `image_${index + 1}`);
        
        // 진행률 업데이트
        if (onProgress) {
          const progress = ((index + 1) / files.length) * 100;
          onProgress(progress);
        }

        return result;
      } catch (error) {
        console.error(`이미지 ${index + 1} 업로드 실패:`, error);
        throw error;
      }
    });

    // 모든 업로드 완료 대기
    const results = await Promise.all(uploadPromises);

    console.log('✅ 모든 이미지 업로드 완료:', results);
    return results;
  } catch (error) {
    console.error('다중 이미지 업로드 실패:', error);
    throw error;
  }
};

/**
 * 이미지 URL에서 최적화된 버전 생성
 */
export const getOptimizedImageUrl = (
  originalUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'jpg' | 'png';
  } = {}
): string => {
  if (!originalUrl.includes('imagekit.io')) {
    return originalUrl;
  }

  const params = new URLSearchParams();
  
  if (options.width) params.append('w', options.width.toString());
  if (options.height) params.append('h', options.height.toString());
  if (options.quality) params.append('q', options.quality.toString());
  if (options.format) params.append('f', options.format);

  const paramString = params.toString();
  return paramString ? `${originalUrl}?${paramString}` : originalUrl;
};







// ImageKit에서 폴더 전체 삭제
export const deleteFolderFromImageKit = async (folderPath: string): Promise<boolean> => {
  try {
    console.log('🗂️ ImageKit 폴더 삭제 시작:', folderPath);

    const response = await fetch('/api/imagekit/delete-folder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ folderPath }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ ImageKit 폴더 삭제 완료:', result);
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ ImageKit 폴더 삭제 실패:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ ImageKit 폴더 삭제 실패:', error);
    return false;
  }
};

// 동영상에서 1프레임을 썸네일로 추출하는 함수
export const extractVideoThumbnail = async (videoFile: File, postId: string, fileId: string): Promise<string> => {
  try {
    console.log('🎬 동영상 썸네일 추출 시작:', { fileName: videoFile.name, postId, fileId });
    
    // 동영상 요소 생성
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    
    // 동영상 URL 생성
    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;
    
    return new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        // 1초 지점에서 썸네일 추출
        video.currentTime = 1;
      };
      
      video.onseeked = () => {
        try {
          // 캔버스 생성
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Canvas context를 생성할 수 없습니다');
          }
          
          // 캔버스 크기 설정 (480px 너비로 조정)
          const maxWidth = 480;
          const aspectRatio = video.videoHeight / video.videoWidth;
          canvas.width = maxWidth;
          canvas.height = maxWidth * aspectRatio;
          
          // 동영상 프레임을 캔버스에 그리기
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // 캔버스를 PNG Blob으로 변환
          canvas.toBlob(async (blob) => {
            if (!blob) {
              throw new Error('썸네일 Blob 생성 실패');
            }
            
            console.log('🎬 썸네일 Blob 생성 성공:', { size: blob.size, type: blob.type });
            
            // Blob을 File 객체로 변환
            const thumbnailFile = new File([blob], `thumbnail_${fileId}.png`, { type: 'image/png' });
            
            // 썸네일을 ImageKit에 업로드
            const uploadedThumbnail = await uploadImageToImageKit(thumbnailFile, postId, `thumbnail_${fileId}`);
            
            console.log('✅ 동영상 썸네일 업로드 완료:', uploadedThumbnail.url);
            
            // 메모리 정리
            URL.revokeObjectURL(videoUrl);
            
            resolve(uploadedThumbnail.url);
          }, 'image/png', 0.9);
          
        } catch (error) {
          console.error('❌ 썸네일 추출 실패:', error);
          URL.revokeObjectURL(videoUrl);
          reject(error);
        }
      };
      
      video.onerror = (error) => {
        console.error('❌ 동영상 로드 실패:', error);
        URL.revokeObjectURL(videoUrl);
        reject(error);
      };
    });
    
  } catch (error) {
    console.error('❌ 동영상 썸네일 추출 실패:', error);
    throw error;
  }
};
