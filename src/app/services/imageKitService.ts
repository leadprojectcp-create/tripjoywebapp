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
