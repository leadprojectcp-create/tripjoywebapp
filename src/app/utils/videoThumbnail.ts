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
export const extractVideoThumbnail = async (_videoFile: File): Promise<ThumbnailResult> => {
  // Deprecated: Bunny Stream 자동 썸네일 사용으로 더 이상 필요 없음
  return { success: false, error: 'Deprecated: Use Bunny Stream thumbnail instead.' };
};

/**
 * 비디오 URL에서 썸네일 추출 (기존 비디오용)
 */
export const extractThumbnailFromVideoUrl = async (_videoUrl: string): Promise<ThumbnailResult> => {
  // Deprecated: Bunny Stream 자동 썸네일 사용
  return { success: false, error: 'Deprecated: Use Bunny Stream thumbnail instead.' };
};
