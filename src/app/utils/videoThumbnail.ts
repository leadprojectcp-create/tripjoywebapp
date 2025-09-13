/**
 * 비디오에서 썸네일 추출 (클라이언트 사이드)
 */

export interface ThumbnailResult {
  success: boolean;
  thumbnailUrl?: string;
  blob?: Blob;
  error?: string;
}

/**
 * 비디오 파일에서 0프레임 썸네일 추출
 */
export const extractVideoThumbnail = async (videoFile: File): Promise<ThumbnailResult> => {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve({ success: false, error: 'Canvas context not available' });
        return;
      }

      video.addEventListener('loadedmetadata', () => {
        // 비디오 크기 설정
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // 0프레임으로 이동
        video.currentTime = 0;
      });

      video.addEventListener('seeked', () => {
        try {
          // 0프레임을 캔버스에 그리기
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // PNG로 변환
          canvas.toBlob((blob) => {
            if (blob) {
              const thumbnailUrl = URL.createObjectURL(blob);
              resolve({ 
                success: true, 
                thumbnailUrl,
                blob
              });
            } else {
              resolve({ success: false, error: 'Failed to create thumbnail blob' });
            }
          }, 'image/png', 0.9);
        } catch (error) {
          resolve({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      });

      video.addEventListener('error', () => {
        resolve({ success: false, error: 'Video loading failed' });
      });

      // 비디오 파일 로드
      video.src = URL.createObjectURL(videoFile);
      video.load();
    } catch (error) {
      resolve({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
};

/**
 * 비디오 URL에서 썸네일 추출 (기존 비디오용)
 */
export const extractThumbnailFromVideoUrl = async (videoUrl: string): Promise<ThumbnailResult> => {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve({ success: false, error: 'Canvas context not available' });
        return;
      }

      video.crossOrigin = 'anonymous'; // CORS 설정
      video.muted = true; // 음소거

      video.addEventListener('loadedmetadata', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.currentTime = 0;
      });

      video.addEventListener('seeked', () => {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const thumbnailUrl = URL.createObjectURL(blob);
              resolve({ 
                success: true, 
                thumbnailUrl,
                blob
              });
            } else {
              resolve({ success: false, error: 'Failed to create thumbnail blob' });
            }
          }, 'image/png', 0.9);
        } catch (error) {
          resolve({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      });

      video.addEventListener('error', () => {
        resolve({ success: false, error: 'Video loading failed' });
      });

      video.src = videoUrl;
      video.load();
    } catch (error) {
      resolve({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
};
