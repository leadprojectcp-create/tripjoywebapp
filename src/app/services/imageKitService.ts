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

/**
 * 이미지를 가로 450px로 리사이즈하고 세로는 비율 유지하는 함수
 */
const resizeImageToWidth = (file: File, targetWidth: number = 450): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      if (!ctx) {
        reject(new Error('Canvas context를 가져올 수 없습니다.'));
        return;
      }

      // 원본 이미지 크기
      const { width: originalWidth, height: originalHeight } = img;
      
      // 가로를 450px로 맞추고 세로는 비율 유지
      const aspectRatio = originalHeight / originalWidth;
      const targetHeight = Math.round(targetWidth * aspectRatio);

      // Canvas 크기 설정
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      console.log('🖼️ 이미지 리사이즈 정보:');
      console.log(`   원본 크기: ${originalWidth}x${originalHeight}`);
      console.log(`   비율: ${aspectRatio.toFixed(3)}`);
      console.log(`   최종 크기: ${targetWidth}x${targetHeight}`);

      // 배경을 흰색으로 채우기
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // 이미지를 비율 유지하며 리사이즈하여 그리기
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Canvas를 Blob으로 변환 (JPEG, 90% 품질)
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('이미지 변환에 실패했습니다.'));
          return;
        }

        // Blob을 File로 변환
        const resizedFile = new File([blob], file.name, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });

        console.log('✅ 이미지 리사이즈 완료:', {
          원본크기: `${originalWidth}x${originalHeight}`,
          리사이즈크기: `${targetWidth}x${targetHeight}`,
          원본용량: `${(file.size / 1024).toFixed(1)}KB`,
          리사이즈용량: `${(resizedFile.size / 1024).toFixed(1)}KB`,
          압축률: `${((1 - resizedFile.size / file.size) * 100).toFixed(1)}%`
        });

        resolve(resizedFile);
      }, 'image/jpeg', 0.9);
    };

    img.onerror = () => {
      reject(new Error('이미지 로드에 실패했습니다.'));
    };

    // 이미지 로드 시작
    img.src = URL.createObjectURL(file);
  });
};

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

    // 1단계: 이미지 리사이즈 (20-60%)
    onProgress?.(30, '이미지 처리 중...');
    const resizedFile = await resizeImageToWidth(file, 450);
    onProgress?.(60, '이미지 처리 완료');
    
    // 2단계: 업로드 (60-100%)
    onProgress?.(70, '업로드 시작...');
    const profileFolder = `profile/${userId}`;
    console.log('📁 프로필 이미지 업로드 폴더:', profileFolder);
    
    const uploadedImage = await uploadImageToImageKit(resizedFile, profileFolder);
    onProgress?.(100, '업로드 완료');
    
    return uploadedImage.url;
  } catch (error) {
    console.error('프로필 이미지 업로드 실패:', error);
    onProgress?.(0, '업로드 실패');
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

    console.log('📤 ImageKit 업로드 시작:', {
      fileName: finalFileName,
      folder: folder,
      fileSize: file.size,
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
