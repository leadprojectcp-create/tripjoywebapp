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
import { uploadMultipleImages, UploadedImage } from './imageKitService';
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
  likes: number;
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
      likes: 0,
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
