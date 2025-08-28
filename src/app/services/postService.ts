/**
 * 게시물 관련 서비스 (Firestore + ImageKit)
 */

import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { uploadMultipleImages, UploadedImage, deleteImageFromImageKit, deleteFolderFromImageKit } from './imageKitService';
import { LocationDetails } from '../components/GoogleMapsLocationPicker';

export interface PostData {
  id?: string;
  userId: string;
  content: string;
  images: UploadedImage[];
  // 🚀 imageUrls 제거 - images에서 동적으로 URL 추출
  location?: {
    name: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    placeId: string;
    description?: string; // 사용자가 작성한 장소 설명
    // 🆕 API 기반 지역 정보 추가
    city?: string;        // 도시 코드 (예: "HAN", "SEL")
    nationality?: string; // 국가 코드 (예: "VN", "KR")
    cityName?: string;    // 전체 도시명 (예: "Hanoi", "Seoul")
    countryName?: string; // 전체 국가명 (예: "Vietnam", "South Korea")
  };
  hashtags: string[];
  createdAt?: any;
  updatedAt?: any;
  likes?: number; // deprecated - 기존 데이터 호환성을 위해 optional
  likeCount: number; // 좋아요 수
  bookmarkCount?: number; // 북마크 수
  // 좋아요한 사용자들 맵 (userId -> timestamp)
  likedBy?: { [userId: string]: any }; // serverTimestamp
  // 북마크한 사용자들 맵 (userId -> timestamp)  
  bookmarkedBy?: { [userId: string]: any }; // serverTimestamp
  comments: number;
  isVisible: boolean;
}

interface CountryCityInfo {
  countryCode: string;
  cityCode: string;
}

/**
 * 게시물 생성 (이미지 업로드 + Firestore 저장)
 */
export const createPost = async (
  userId: string,
  content: string,
  imageFiles: File[],
  locationDetails: LocationDetails | null,
  locationDescription: string,
  hashtags: string,
  countryCityInfo?: CountryCityInfo,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    console.log('🚀 게시물 생성 시작');

    // 1. 임시 게시물 ID 생성 (ImageKit 폴더용)
    const tempPostId = `post_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // 2. 진행률 업데이트 (0% - 시작)
    onProgress?.(0);

    // 3. 이미지 업로드 (ImageKit)
    console.log(`📸 ${imageFiles.length}개 이미지 업로드 중...`);
    const uploadedImages = await uploadMultipleImages(
      imageFiles, 
      tempPostId,
      (imageProgress) => {
        // 이미지 업로드는 전체의 80%를 차지
        onProgress?.(imageProgress * 0.8);
      }
    );

    // 4. 해시태그 파싱
    const parsedHashtags = hashtags
      .split(' ')
      .filter(tag => tag.trim().startsWith('#'))
      .map(tag => tag.trim().toLowerCase());

    // 5. 위치 데이터 변환 (드롭다운 선택 지역 정보 포함)
    const locationData = locationDetails ? {
      name: locationDetails.name,
      address: locationDetails.address,
      coordinates: {
        lat: locationDetails.lat,
        lng: locationDetails.lng,
      },
      placeId: locationDetails.placeId,
      description: locationDescription.trim() || undefined,
      // 🆕 드롭다운에서 선택한 지역 정보 저장 (코드만)
      city: countryCityInfo?.cityCode || locationDetails.city,
      nationality: countryCityInfo?.countryCode || locationDetails.nationality,
      // 기존 API에서 가져온 이름들은 유지 (호환성을 위해)
      ...(locationDetails.cityName && { cityName: locationDetails.cityName }),
      ...(locationDetails.countryName && { countryName: locationDetails.countryName }),
    } : countryCityInfo ? {
      // 위치는 선택하지 않았지만 국가/도시는 선택한 경우
      name: '',
      address: '',
      coordinates: { lat: 0, lng: 0 },
      placeId: '',
      description: locationDescription.trim() || undefined,
      city: countryCityInfo.cityCode,
      nationality: countryCityInfo.countryCode,
      // cityName과 countryName 필드는 아예 추가하지 않음 (Firebase undefined 에러 방지)
    } : undefined;

    // 6. Firestore에 게시물 데이터 저장 (imageUrls 중복 제거)
    console.log('💾 Firestore에 게시물 저장 중...');
    onProgress?.(85);

    const postData: Omit<PostData, 'id'> = {
      userId,
      content: content.trim(),
      images: uploadedImages, // 🎯 images만 저장 (중복 제거)
      location: locationData,
      hashtags: parsedHashtags,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      likeCount: 0, // 좋아요 카운트
      bookmarkCount: 0, // 새로운 북마크 카운트
      likedBy: {}, // 좋아요한 사용자들 맵 초기화
      bookmarkedBy: {}, // 북마크한 사용자들 맵 초기화
      comments: 0,
      isVisible: true,
    };

    const docRef = await addDoc(collection(db, 'posts'), postData);
    const finalPostId = docRef.id;

    // 7. 완료
    onProgress?.(100);
    console.log('✅ 게시물 생성 완료:', finalPostId);
    console.log('📸 저장된 이미지들:', uploadedImages.map(img => ({
      id: img.id,
      originalName: img.originalName,
      url: img.url,
      thumbnailUrl: img.urls.thumbnail
    })));
    console.log('🌍 저장된 위치 정보:', locationData);

    return finalPostId;
  } catch (error) {
    console.error('❌ 게시물 생성 실패:', error);
    throw error;
  }
};

/**
 * 특정 게시물 가져오기 (ID로)
 */
export const getPostById = async (postId: string): Promise<PostData | null> => {
  try {
    const postDoc = await getDoc(doc(db, 'posts', postId));
    
    if (!postDoc.exists()) {
      return null;
    }
    
    const data = postDoc.data();
    return {
      id: postDoc.id,
      ...data
    } as PostData;
  } catch (error) {
    console.error('게시물 가져오기 실패:', error);
    return null;
  }
};

/**
 * 게시물 목록 조회 (최신순)
 */
export const getPosts = async (
  limitCount: number = 20,
  userId?: string
): Promise<PostData[]> => {
  try {
    let q = query(
      collection(db, 'posts'),
      where('isVisible', '==', true),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    // 특정 사용자 게시물만 조회
    if (userId) {
      q = query(
        collection(db, 'posts'),
        where('userId', '==', userId),
        where('isVisible', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }

    const querySnapshot = await getDocs(q);
    const posts: PostData[] = [];

    querySnapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data(),
      } as PostData);
    });

    return posts;
  } catch (error) {
    console.error('게시물 목록 조회 실패:', error);
    throw error;
  }
};

/**
 * 해시태그로 게시물 검색
 */
export const searchPostsByHashtag = async (
  hashtag: string,
  limitCount: number = 20
): Promise<PostData[]> => {
  try {
    const normalizedHashtag = hashtag.toLowerCase().startsWith('#') 
      ? hashtag.toLowerCase() 
      : `#${hashtag.toLowerCase()}`;

    const q = query(
      collection(db, 'posts'),
      where('hashtags', 'array-contains', normalizedHashtag),
      where('isVisible', '==', true),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const posts: PostData[] = [];

    querySnapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data(),
      } as PostData);
    });

    return posts;
  } catch (error) {
    console.error('해시태그 검색 실패:', error);
    throw error;
  }
};

/**
 * 위치로 게시물 검색
 */
export const searchPostsByLocation = async (
  locationName: string,
  limitCount: number = 20
): Promise<PostData[]> => {
  try {
    const q = query(
      collection(db, 'posts'),
      where('location.name', '>=', locationName),
      where('location.name', '<=', locationName + '\uf8ff'),
      where('isVisible', '==', true),
      orderBy('location.name'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const posts: PostData[] = [];

    querySnapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data(),
      } as PostData);
    });

    return posts;
  } catch (error) {
    console.error('위치 검색 실패:', error);
    throw error;
  }
};

/**
 * 국가별 게시물 검색
 */
export const getPostsByCountry = async (
  countryCode: string,
  limitCount: number = 20
): Promise<PostData[]> => {
  try {
    const q = query(
      collection(db, 'posts'),
      where('location.nationality', '==', countryCode),
      where('isVisible', '==', true),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const posts: PostData[] = [];

    querySnapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data(),
      } as PostData);
    });

    console.log(`🌍 ${countryCode} 국가의 게시물 ${posts.length}개 조회됨`);
    return posts;
  } catch (error) {
    console.error('국가별 게시물 조회 실패:', error);
    throw error;
  }
};

/**
 * 도시별 게시물 검색
 */
export const getPostsByCity = async (
  countryCode: string,
  cityCode: string,
  limitCount: number = 20
): Promise<PostData[]> => {
  try {
    const q = query(
      collection(db, 'posts'),
      where('location.nationality', '==', countryCode),
      where('location.city', '==', cityCode),
      where('isVisible', '==', true),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const posts: PostData[] = [];

    querySnapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data(),
      } as PostData);
    });

    console.log(`🏙️ ${countryCode}-${cityCode} 도시의 게시물 ${posts.length}개 조회됨`);
    return posts;
  } catch (error) {
    console.error('도시별 게시물 조회 실패:', error);
    throw error;
  }
};

// 게시물 삭제 (DB + ImageKit)
export const deletePost = async (postId: string, userId: string): Promise<boolean> => {
  try {
    console.log('🗑️ 게시물 삭제 시작:', postId);

    // 1. 게시물 데이터 조회 (이미지 URL 확인용)
    const postDoc = await getDoc(doc(db, 'posts', postId));
    if (!postDoc.exists()) {
      console.error('❌ 게시물을 찾을 수 없습니다:', postId);
      return false;
    }

    const postData = postDoc.data() as PostData;
    
    // 권한 확인
    if (postData.userId !== userId) {
      console.error('❌ 삭제 권한이 없습니다:', postId);
      return false;
    }

    // 2. ImageKit에서 이미지들 삭제
    if (postData.images && postData.images.length > 0) {
      console.log('🖼️ ImageKit 개별 이미지 삭제 시작:', postData.images.length, '개');
      console.log('🔄 새로운 삭제 로직 적용됨 - v2.0');
      
      for (const image of postData.images) {
        try {
          await deleteImageFromImageKit(image.url);
          console.log('✅ 이미지 삭제 완료:', image.url);
        } catch (error) {
          console.warn('⚠️ 이미지 삭제 실패 (계속 진행):', image.url, error);
        }
      }
      
      // 3. 모든 이미지 삭제 후 폴더 삭제 시도
      try {
        // 첫 번째 이미지 URL에서 실제 폴더 경로 추출
        if (postData.images.length > 0) {
          const firstImageUrl = postData.images[0].url;
          console.log('🔍 첫 번째 이미지 URL:', firstImageUrl);
          
          // URL에서 폴더 경로 추출
          // 예: https://ik.imagekit.io/leadproject/tripjoy/post_1756385577858_1ljkk/image_1_vtZpza_K8
          const urlParts = firstImageUrl.split('/');
          const imageKitIndex = urlParts.findIndex(part => part.includes('imagekit.io'));
          
          if (imageKitIndex !== -1 && urlParts.length > imageKitIndex + 3) {
            // leadproject 부분을 제외하고 폴더 경로 구성
            const pathParts = urlParts.slice(imageKitIndex + 2); // leadproject 이후부터
            pathParts.pop(); // 마지막 파일명 제거
            const folderPath = '/' + pathParts.join('/') + '/';
            
            console.log('🗂️ 실제 폴더 경로 추출:', folderPath);
            
            // ImageKit 파일 삭제 후 약간의 지연 시간 추가 (서버 처리 완료 대기)
            console.log('⏳ ImageKit 파일 삭제 완료 대기 중... (2초)');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('🗂️ 빈 폴더 삭제 시도:', folderPath);
            
            let folderDeleted = false;
            let attempts = 0;
            const maxAttempts = 3;
            
            // 최대 3번 재시도
            while (!folderDeleted && attempts < maxAttempts) {
              attempts++;
              console.log(`🔄 폴더 삭제 시도 ${attempts}/${maxAttempts}:`, folderPath);
              
              folderDeleted = await deleteFolderFromImageKit(folderPath);
              
              if (!folderDeleted && attempts < maxAttempts) {
                console.log('⏳ 1초 후 재시도...');
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            
            if (folderDeleted) {
              console.log('✅ 빈 폴더 삭제 완료:', folderPath);
            } else {
              console.log('ℹ️ 폴더 삭제 실패 또는 불필요 (파일이 남아있거나 이미 삭제됨)');
            }
          } else {
            console.warn('⚠️ 이미지 URL에서 폴더 경로를 추출할 수 없습니다:', firstImageUrl);
          }
        }
      } catch (error) {
        console.warn('⚠️ 폴더 삭제 실패 (무시 가능):', error);
      }
    } else {
      console.log('ℹ️ 삭제할 이미지가 없습니다.');
    }

    // 4. Firestore에서 게시물 삭제
    await deleteDoc(doc(db, 'posts', postId));
    console.log('✅ 게시물 삭제 완료:', postId);

    return true;
  } catch (error) {
    console.error('❌ 게시물 삭제 실패:', error);
    return false;
  }
};

// 게시물 업데이트
export const updatePost = async (
  postId: string,
  userId: string,
  content: string,
  locationDetails: LocationDetails | null,
  locationDescription: string,
  countryCode: string,
  cityCode: string,
  hashtags: string[],
  newImages?: File[],
  remainingExistingImages?: UploadedImage[] // 남은 기존 이미지들
): Promise<boolean> => {
  try {
    console.log('📝 게시물 업데이트 시작:', postId);

    // 1. 기존 게시물 확인
    const postDoc = await getDoc(doc(db, 'posts', postId));
    if (!postDoc.exists()) {
      console.error('❌ 게시물을 찾을 수 없습니다:', postId);
      return false;
    }

    const existingPost = postDoc.data() as PostData;
    
    // 권한 확인
    if (existingPost.userId !== userId) {
      console.error('❌ 수정 권한이 없습니다:', postId);
      return false;
    }

    // 2. 최종 이미지 목록 구성
    let finalImages: UploadedImage[] = [];
    
    // 남은 기존 이미지들 추가
    if (remainingExistingImages && remainingExistingImages.length > 0) {
      console.log('📷 남은 기존 이미지:', remainingExistingImages.length, '개');
      finalImages = [...remainingExistingImages];
    }
    
    // 새 이미지가 있으면 업로드하여 추가
    if (newImages && newImages.length > 0) {
      console.log('🖼️ 새 이미지 업로드 시작:', newImages.length, '개');
      const uploadedNewImages = await uploadMultipleImages(newImages, postId);
      finalImages = [...finalImages, ...uploadedNewImages];
    }
    
    console.log('🎯 최종 이미지 목록:', finalImages.length, '개');

    // 3. 게시물 업데이트
    const updatedPost: any = {
      content,
      location: locationDetails || undefined,
      locationDescription,
      countryCode,
      cityCode,
      hashtags,
      images: finalImages,
      updatedAt: new Date()
    };

    await updateDoc(doc(db, 'posts', postId), updatedPost);
    console.log('✅ 게시물 업데이트 완료:', postId);

    return true;
  } catch (error) {
    console.error('❌ 게시물 업데이트 실패:', error);
    return false;
  }
};
