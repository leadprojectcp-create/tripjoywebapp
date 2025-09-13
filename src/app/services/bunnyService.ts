/**
 * Bunny.net 서비스
 * 이미지 및 비디오 업로드, URL 생성 등을 담당
 */

export interface BunnyUploadResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export interface BunnyImageOptions {
  width?: number;
  height?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png';
  quality?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export class BunnyService {
  private storageZoneName: string;
  private storagePassword: string;
  private apiKey: string;
  private cdnUrl: string;
  private storageUrl: string;

  constructor() {
    this.storageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME || 'tripjoy';
    this.storagePassword = process.env.BUNNY_STORAGE_PASSWORD || '529a5878-2b3a-4ddb-aacb70439702-834b-4ccf';
    this.apiKey = process.env.BUNNY_API_KEY || '16de62a6-9b60-45ea-9e21-ef941fd4b9926c6f7dbb-c7f2-46c2-b127-13ac766b4333';
    this.cdnUrl = process.env.BUNNY_CDN_URL || 'https://tripjoy.b-cdn.net';
    this.storageUrl = process.env.BUNNY_STORAGE_URL || 'https://storage.bunnycdn.com/tripjoy';
  }

  /**
   * 이미지 업로드
   */
  async uploadImage(file: File, folder: string = 'images'): Promise<BunnyUploadResponse> {
    try {
      const fileName = this.generateFileName(file.name);
      const filePath = `${folder}/${fileName}`;
      
      const response = await fetch(`${this.storageUrl}/${this.storageZoneName}/${filePath}`, {
        method: 'PUT',
        headers: {
          'AccessKey': this.storagePassword,
          'Content-Type': file.type
        },
        body: file
      });

      if (response.ok) {
        const cdnUrl = `${this.cdnUrl}/${this.storageZoneName}/${filePath}`;
        return {
          success: true,
          url: cdnUrl
        };
      } else {
        return {
          success: false,
          error: `Upload failed: ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 비디오 업로드
   */
  async uploadVideo(file: File, folder: string = 'videos'): Promise<BunnyUploadResponse> {
    try {
      const fileName = this.generateFileName(file.name);
      const filePath = `${folder}/${fileName}`;
      
      const response = await fetch(`${this.storageUrl}/${this.storageZoneName}/${filePath}`, {
        method: 'PUT',
        headers: {
          'AccessKey': this.storagePassword,
          'Content-Type': file.type
        },
        body: file
      });

      if (response.ok) {
        const cdnUrl = `${this.cdnUrl}/${this.storageZoneName}/${filePath}`;
        return {
          success: true,
          url: cdnUrl
        };
      } else {
        return {
          success: false,
          error: `Upload failed: ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 최적화된 이미지 URL 생성
   */
  getOptimizedImageUrl(imageUrl: string, options: BunnyImageOptions = {}): string {
    // Bunny.net URL에서 경로 추출
    let imagePath = imageUrl;
    if (imageUrl.includes(this.cdnUrl)) {
      imagePath = imageUrl.replace(`${this.cdnUrl}/${this.storageZoneName}`, '');
    }
    
    const params = new URLSearchParams();
    
    if (options.width) params.append('width', options.width.toString());
    if (options.height) params.append('height', options.height.toString());
    if (options.format) params.append('format', options.format);
    if (options.quality) params.append('quality', options.quality.toString());
    if (options.fit) params.append('fit', options.fit);
    
    // Bunny.net 최적화 파라미터 추가
    params.append('cache', '1'); // 캐시 활성화
    params.append('optimize', '1'); // 자동 최적화
    
    const queryString = params.toString();
    return queryString 
      ? `${this.cdnUrl}/${this.storageZoneName}${imagePath}?${queryString}`
      : `${this.cdnUrl}/${this.storageZoneName}${imagePath}`;
  }



  /**
   * 이미지 프리로딩 (빠른 로딩을 위해)
   */
  preloadImage(imageUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image preload failed'));
      img.src = imageUrl;
    });
  }

  /**
   * 여러 이미지 프리로딩
   */
  async preloadImages(imageUrls: string[]): Promise<void> {
    const preloadPromises = imageUrls.map(url => this.preloadImage(url));
    await Promise.allSettled(preloadPromises);
  }

  /**
   * 비디오 URL 생성
   */
  getVideoUrl(videoPath: string): string {
    return `${this.cdnUrl}${videoPath}`;
  }


  /**
   * 파일명 생성 (중복 방지)
   */
  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    return `${timestamp}_${randomString}.${extension}`;
  }


  /**
   * 파일 삭제
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.storageUrl}/${filePath}`, {
        method: 'DELETE',
        headers: {
          'AccessKey': this.storagePassword
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * 일반 파일 업로드 (이미지, 썸네일 등)
   */
  async uploadFile(file: File, folderPath: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const fileName = this.generateFileName(file.name);
      const filePath = `${folderPath}/${fileName}`;
      const uploadUrl = `${this.storageUrl}/${this.storageZoneName}/${filePath}`;

      console.log('📤 파일 업로드 시작:');
      console.log('  파일명:', file.name);
      console.log('  파일 크기:', file.size);
      console.log('  폴더 경로:', folderPath);
      console.log('  최종 경로:', filePath);
      console.log('  업로드 URL:', uploadUrl);

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'AccessKey': this.storagePassword
        }
      });

      console.log('📤 업로드 응답:');
      console.log('  상태:', response.status);
      console.log('  상태 텍스트:', response.statusText);

      if (response.ok) {
        const cdnUrl = `${this.cdnUrl}/${this.storageZoneName}/${filePath}`;
        console.log('✅ 업로드 성공:', cdnUrl);
        return { success: true, url: cdnUrl };
      } else {
        const errorText = await response.text();
        console.error('❌ 업로드 실패:', response.status, errorText);
        return { success: false, error: `Upload failed: ${response.status} ${errorText}` };
      }
    } catch (error) {
      console.error('❌ 업로드 예외:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * API 키를 사용한 관리 작업 (필요시 확장)
   */
  async createFolder(folderPath: string): Promise<boolean> {
    try {
      // Bunny.net API를 사용한 폴더 생성 (필요시 구현)
      console.log('Creating folder:', folderPath);
      return true;
    } catch (error) {
      console.error('Error creating folder:', error);
      return false;
    }
  }

  /**
   * API 키를 사용한 폴더 삭제 (필요시 확장)
   */
  async deleteFolder(folderPath: string): Promise<boolean> {
    try {
      // Bunny.net API를 사용한 폴더 삭제 (필요시 구현)
      console.log('Deleting folder:', folderPath);
      return true;
    } catch (error) {
      console.error('Error deleting folder:', error);
      return false;
    }
  }
}

// 싱글톤 인스턴스
export const bunnyService = new BunnyService();
