/**
 * Bunny Stream 서비스 (서버/클라이언트 공용 URL 빌더)
 * - 서버에서만 API 호출(비디오 생성/업로드)을 수행하세요.
 */

export interface BunnyStreamCreateResponse {
  success: boolean;
  videoId?: string;
  error?: string;
}

export class BunnyStreamService {
  private libraryId: string;
  private apiKey: string;
  private cdnBase: string;

  constructor() {
    this.libraryId = process.env.BUNNY_STREAM_LIBRARY_ID || '';
    this.apiKey = process.env.BUNNY_STREAM_API_KEY || '';
    this.cdnBase = process.env.BUNNY_STREAM_CDN_BASE || '';
  }

  /**
   * 비디오 생성 (서버 전용)
   */
  async createVideo(title: string): Promise<BunnyStreamCreateResponse> {
    try {
      const endpoint = `https://video.bunnycdn.com/library/${this.libraryId}/videos`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'AccessKey': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title })
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `Create failed: ${res.status} ${text}` };
      }
      const json = await res.json();
      // API 응답의 guid 또는 id 사용 (문서에 따라 guid 사용)
      const videoId = json.guid || json.id || json.videoId;
      if (!videoId) {
        return { success: false, error: 'Missing videoId in response' };
      }
      return { success: true, videoId };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 비디오 파일 업로드 (서버 전용)
   */
  async uploadVideoBinary(videoId: string, file: File | Blob): Promise<{ success: boolean; error?: string }>{
    try {
      const endpoint = `https://video.bunnycdn.com/library/${this.libraryId}/videos/${videoId}`;
      const arrayBuffer = await file.arrayBuffer();
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'AccessKey': this.apiKey,
          // Bunny Stream는 application/octet-stream 권장
          'Content-Type': 'application/octet-stream'
        },
        body: arrayBuffer
      } as RequestInit);

      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `Upload failed: ${res.status} ${text}` };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * HLS(m3u8) 재생 URL 생성
   */
  buildHlsUrl(videoId: string): string {
    // 예: https://vz-<your-pull-zone>.b-cdn.net/<videoId>/playlist.m3u8
    return `${this.cdnBase}/${videoId}/playlist.m3u8`;
  }

  /**
   * 썸네일 URL 생성 (자동 생성 썸네일)
   */
  buildPosterUrl(videoId: string, height?: number): string {
    const h = height ? `?height=${height}` : '';
    // 예: https://vz-<your-pull-zone>.b-cdn.net/<videoId>/thumbnail.jpg?height=600
    return `${this.cdnBase}/${videoId}/thumbnail.jpg${h}`;
  }
}

export const bunnyStreamService = new BunnyStreamService();


