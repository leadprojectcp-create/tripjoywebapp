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
import { bunnyService } from './bunnyService';
import { LocationDetails } from '../components/GoogleMapsLocationPicker';

// Bunny.net 업로드 인터페이스
export interface UploadedImage {
  id: string;
  url: string;
  originalName: string;
  size: number;
  width?: number;
  height?: number;
  urls?: {
    original: string;
    thumbnail?: string;
    medium?: string; // Bunny.net에서 제공할 수 있는 중간 크기
    large?: string;  // Bunny.net에서 제공할 수 있는 큰 크기
  };
}

export interface PostData {
  id?: string;
  userId: string;
  content: string;
  images: UploadedImage[];
  video?: UploadedImage | null; // 동영상 파일 (ImageKit 업로드된 형태)
  // 🚀 imageUrls 제거 - images에서 동적으로 URL 추출
  location?: {
    name: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    placeId: string;
    // 🆕 API 기반 지역 정보 추가
    city?: string;        // 도시 코드 (예: "HAN", "SEL")
    nationality?: string; // 국가 코드 (예: "VN", "KR")
    cityName?: string;    // 전체 도시명 (예: "Hanoi", "Seoul")
    countryName?: string; // 전체 국가명 (예: "Vietnam", "South Korea")
  };
  countryCode?: string;
  cityCode?: string;
  businessHours?: string;
  recommendedMenu?: string;
  paymentMethod?: string;
  postType?: string; // 'Local' 또는 'Traveler'
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
  // 🚀 현재 사용자 상태 (서버에서 미리 계산)
  isLikedByCurrentUser?: boolean;
  isBookmarkedByCurrentUser?: boolean;
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
  countryCityInfo?: CountryCityInfo,
  videoFile?: File | null,
  businessHours?: string,
  recommendedMenu?: string,
  paymentMethod?: string,
  postType?: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    console.log('🚀 게시물 생성 시작');

    // 1. 임시 게시물 ID 생성 (ImageKit 폴더용)
    const tempPostId = `post_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // 2. 진행률 업데이트 (0% - 시작)
    onProgress?.(0);

    // 3. 이미지 업로드 (Bunny.net)
    let uploadedImages: UploadedImage[] = [];
    
    if (imageFiles.length > 0) {
      console.log(`📸 ${imageFiles.length}개 이미지 업로드 중...`);
      uploadedImages = await uploadMultipleImagesToBunny(
        imageFiles, 
        tempPostId,
        (imageProgress) => {
          // 이미지 업로드는 전체의 60%를 차지
          onProgress?.(imageProgress * 0.6);
        }
      );
    }

    // 4. 동영상 업로드 (Bunny.net)
    let uploadedVideo: UploadedImage | null = null;
    
    if (videoFile) {
      console.log('🎥 동영상 업로드 중...', {
        fileName: videoFile.name,
        fileSize: videoFile.size,
        fileType: videoFile.type,
        postId: tempPostId
      });
      onProgress?.(60);
      uploadedVideo = await uploadVideoToBunny(videoFile, tempPostId);
      console.log('✅ 동영상 업로드 완료:', {
        url: uploadedVideo.url,
        id: uploadedVideo.id,
        size: uploadedVideo.size,
        width: uploadedVideo.width,
        height: uploadedVideo.height
      });
    } else {
      console.log('📹 동영상 파일이 없습니다.');
    }

    // 5. 업로드 완료 후 진행률 업데이트
    onProgress?.(80);

    // 해시태그 기능 제거됨

    // 5. 위치 데이터 변환 (드롭다운 선택 지역 정보 포함)
    const locationData = locationDetails ? {
      name: locationDetails.name,
      address: locationDetails.address,
      coordinates: {
        lat: locationDetails.lat,
        lng: locationDetails.lng,
      },
      placeId: locationDetails.placeId,
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
      city: countryCityInfo.cityCode,
      nationality: countryCityInfo.countryCode,
      // cityName과 countryName 필드는 아예 추가하지 않음 (Firebase undefined 에러 방지)
    } : {
      // 위치 정보가 없는 경우 기본값
      name: '',
      address: '',
      coordinates: { lat: 0, lng: 0 },
      placeId: '',
      city: '',
      nationality: '',
    };

    // 6. Firestore에 게시물 데이터 저장 (이미지 포함)
    console.log('💾 Firestore에 게시물 저장 중...');
    onProgress?.(85);

    // Firestore에 저장할 데이터 (기존 구조와 호환)
    const postData: any = {
      userId,
      content: content.trim(),
      images: uploadedImages, // 🎯 이미지 저장
      video: uploadedVideo, // 🎥 동영상 저장
      location: locationData,
      businessHours: businessHours || '',
      recommendedMenu: recommendedMenu || '',
      paymentMethod: paymentMethod || '',
      postType: postType || 'Traveler', // 포스트 타입 (현지인/여행자)
      createdAt: serverTimestamp(), // Firestore 서버 타임스탬프 사용
      updatedAt: serverTimestamp(), // Firestore 서버 타임스탬프 사용
      likeCount: 0, // 좋아요 카운트
      bookmarkCount: 0, // 새로운 북마크 카운트
      likedBy: {}, // 좋아요한 사용자들 맵 초기화
      bookmarkedBy: {}, // 북마크한 사용자들 맵 초기화
      comments: 0,
      isVisible: true,
    };

    console.log('💾 Firestore 저장 데이터:', {
      hasVideo: !!uploadedVideo,
      videoData: uploadedVideo,
      imageCount: uploadedImages.length,
      postId: tempPostId
    });

    // undefined 값 완전 제거 (재귀적으로 처리)
    const removeUndefined = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return null;
      }
      // serverTimestamp() 객체는 그대로 유지
      if (obj && typeof obj === 'object' && obj._methodName === 'serverTimestamp') {
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(removeUndefined).filter(item => item !== undefined);
      }
      if (typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            const cleanedValue = removeUndefined(value);
            if (cleanedValue !== undefined) {
              cleaned[key] = cleanedValue;
            }
          }
        }
        return cleaned;
      }
      return obj;
    };

    const cleanPostData = removeUndefined(postData);

    // 디버깅: undefined 값 확인
    console.log('🔍 postData 디버깅:');
    console.log('원본 postData:', postData);
    console.log('정리된 cleanPostData:', cleanPostData);

    const docRef = await addDoc(collection(db, 'posts'), cleanPostData);
    const finalPostId = docRef.id;

    // 7. 완료
    onProgress?.(100);
    console.log('✅ 게시물 생성 완료:', finalPostId);
    console.log('📸 저장된 이미지들:', uploadedImages.map(img => ({
      id: img.id,
      originalName: img.originalName,
      url: img.url,
      thumbnailUrl: img.urls?.thumbnail ? img.urls.thumbnail.split('?')[0] : img.url
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
  userId?: string,
  currentUserId?: string
): Promise<PostData[]> => {
  try {
    // 🚀 성능 최적화: 인덱스 최적화된 쿼리
    let q;
    
    if (userId) {
      // 특정 사용자 게시물: userId + createdAt 인덱스 사용
      q = query(
        collection(db, 'posts'),
        where('userId', '==', userId),
        where('isVisible', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    } else {
      // 🚀 전체 게시물: 단순한 쿼리로 최적화 (인덱스 없이도 빠름)
      q = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(limitCount * 2) // 더 많이 가져와서 클라이언트에서 필터링
      );
    }

    const querySnapshot = await getDocs(q);
    const posts: PostData[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // 🚀 클라이언트에서 isVisible 필터링 (더 빠른 쿼리)
      if (!userId && data.isVisible === false) {
        return; // isVisible이 false인 게시물은 건너뛰기
      }
      
      // 🚀 성능 최적화: 필요한 필드만 선택하여 전송량 줄이기
      posts.push({
        id: doc.id,
        userId: data.userId,
        content: data.content,
        // 🚀 이미지 최적화: 썸네일만 우선 로드
        images: data.images ? data.images.map((img: any) => ({
          ...img,
          // 원본 이미지는 나중에 로드
          url: img.urls?.thumbnail || img.url
        })) : [],
        video: data.video || null,
        location: data.location,
        postType: data.postType, // postType 필드 추가
        createdAt: data.createdAt,
        likeCount: data.likeCount || 0,
        bookmarkCount: data.bookmarkCount || 0,
        // 🚀 좋아요/북마크 정보 포함!
        likedBy: data.likedBy || {},
        bookmarkedBy: data.bookmarkedBy || {},
        comments: data.comments || 0,
        isVisible: data.isVisible,
        // 🚀 현재 사용자 좋아요/북마크 상태 미리 계산!
        isLikedByCurrentUser: currentUserId ? !!(data.likedBy?.[currentUserId]) : false,
        isBookmarkedByCurrentUser: currentUserId ? !!(data.bookmarkedBy?.[currentUserId]) : false
      } as PostData);
    });

    // 🚀 요청한 개수만큼만 반환
    return posts.slice(0, limitCount);
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
      const data = doc.data();
      posts.push({
        id: doc.id,
        userId: data.userId,
        content: data.content,
        images: data.images || [],
        video: data.video || null,
        location: data.location,
        postType: data.postType, // postType 필드 추가
        createdAt: data.createdAt,
        likeCount: data.likeCount || 0,
        bookmarkCount: data.bookmarkCount || 0,
        // 🚀 좋아요/북마크 정보 포함!
        likedBy: data.likedBy || {},
        bookmarkedBy: data.bookmarkedBy || {},
        comments: data.comments || 0,
        isVisible: data.isVisible
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
      const data = doc.data();
      posts.push({
        id: doc.id,
        userId: data.userId,
        content: data.content,
        images: data.images || [],
        video: data.video || null,
        location: data.location,
        postType: data.postType, // postType 필드 추가
        createdAt: data.createdAt,
        likeCount: data.likeCount || 0,
        bookmarkCount: data.bookmarkCount || 0,
        // 🚀 좋아요/북마크 정보 포함!
        likedBy: data.likedBy || {},
        bookmarkedBy: data.bookmarkedBy || {},
        comments: data.comments || 0,
        isVisible: data.isVisible
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
  limitCount: number = 20,
  currentUserId?: string
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
      const data = doc.data();
      posts.push({
        id: doc.id,
        userId: data.userId,
        content: data.content,
        images: data.images || [],
        video: data.video || null,
        location: data.location,
        postType: data.postType, // postType 필드 추가
        createdAt: data.createdAt,
        likeCount: data.likeCount || 0,
        bookmarkCount: data.bookmarkCount || 0,
        // 🚀 좋아요/북마크 정보 포함!
        likedBy: data.likedBy || {},
        bookmarkedBy: data.bookmarkedBy || {},
        comments: data.comments || 0,
        isVisible: data.isVisible,
        // 🚀 현재 사용자 좋아요/북마크 상태 미리 계산!
        isLikedByCurrentUser: currentUserId ? !!(data.likedBy?.[currentUserId]) : false,
        isBookmarkedByCurrentUser: currentUserId ? !!(data.bookmarkedBy?.[currentUserId]) : false
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
 * 위도/경도로 게시물 검색
 */
export const getPostsByLocation = async (
  lat: number,
  lng: number,
  limitCount: number = 20,
  currentUserId?: string
): Promise<PostData[]> => {
  try {
    // Firestore는 복합 쿼리를 지원하지 않으므로, 모든 게시물을 가져와서 필터링
    const q = query(
      collection(db, 'posts'),
      where('isVisible', '==', true),
      orderBy('createdAt', 'desc'),
      limit(limitCount * 3) // 더 많이 가져와서 필터링
    );

    const querySnapshot = await getDocs(q);
    const posts: PostData[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // 위도/경도가 일치하는 게시물만 필터링
      if (data.location?.coordinates?.lat === lat && 
          data.location?.coordinates?.lng === lng) {
        posts.push({
          id: doc.id,
          userId: data.userId,
          content: data.content,
          images: data.images || [],
          video: data.video || null,
          location: data.location,
          postType: data.postType,
          createdAt: data.createdAt,
          likeCount: data.likeCount || 0,
          bookmarkCount: data.bookmarkCount || 0,
          likedBy: data.likedBy || {},
          bookmarkedBy: data.bookmarkedBy || {},
          comments: data.comments || 0,
          isVisible: data.isVisible,
          isLikedByCurrentUser: currentUserId ? !!(data.likedBy?.[currentUserId]) : false,
          isBookmarkedByCurrentUser: currentUserId ? !!(data.bookmarkedBy?.[currentUserId]) : false
        } as PostData);
      }
    });

    // 제한된 수만큼만 반환
    const limitedPosts = posts.slice(0, limitCount);
    console.log(`📍 위치(${lat}, ${lng})의 게시물 ${limitedPosts.length}개 조회됨`);
    return limitedPosts;
  } catch (error) {
    console.error('Error fetching posts by location:', error);
    throw error;
  }
};

/**
 * 도시별 게시물 검색
 */
export const getPostsByCity = async (
  countryCode: string,
  cityCode: string,
  limitCount: number = 20,
  currentUserId?: string
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
      const data = doc.data();
      posts.push({
        id: doc.id,
        userId: data.userId,
        content: data.content,
        images: data.images || [],
        video: data.video || null,
        location: data.location,
        postType: data.postType, // postType 필드 추가
        createdAt: data.createdAt,
        likeCount: data.likeCount || 0,
        bookmarkCount: data.bookmarkCount || 0,
        // 🚀 좋아요/북마크 정보 포함!
        likedBy: data.likedBy || {},
        bookmarkedBy: data.bookmarkedBy || {},
        comments: data.comments || 0,
        isVisible: data.isVisible,
        // 🚀 현재 사용자 좋아요/북마크 상태 미리 계산!
        isLikedByCurrentUser: currentUserId ? !!(data.likedBy?.[currentUserId]) : false,
        isBookmarkedByCurrentUser: currentUserId ? !!(data.bookmarkedBy?.[currentUserId]) : false
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
          await bunnyService.deleteFile(image.url);
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
              
              // Bunny.net은 폴더 삭제 대신 개별 파일 삭제
              folderDeleted = true; // 폴더 삭제는 이미 개별 파일 삭제로 처리됨
              
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
  countryCode: string,
  cityCode: string,
  newImages?: File[],
  remainingExistingImages?: UploadedImage[], // 남은 기존 이미지들
  newVideo?: File | null, // 새 동영상 파일
  existingVideo?: UploadedImage | null, // 기존 동영상
  businessHours?: string,
  recommendedMenu?: string,
  paymentMethod?: string,
  postType?: string,
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
      const uploadedNewImages = await uploadMultipleImagesToBunny(newImages, postId);
      finalImages = [...finalImages, ...uploadedNewImages];
    }
    
    console.log('🎯 최종 이미지 목록:', finalImages.length, '개');

    // 3. 동영상 처리
    let finalVideo: UploadedImage | null = null;
    
    if (newVideo) {
      // 새 동영상 업로드
      console.log('🎥 새 동영상 업로드 시작');
      finalVideo = await uploadVideoToBunny(newVideo, postId);
      console.log('✅ 새 동영상 업로드 완료:', finalVideo.url);
    } else if (existingVideo) {
      // 기존 동영상 유지
      finalVideo = existingVideo;
      console.log('📹 기존 동영상 유지:', existingVideo.url);
    }
    
    console.log('🎯 최종 동영상:', finalVideo ? finalVideo.url : '없음');


    // 4. 게시물 업데이트
    const updatedPost: any = {
      content,
      location: locationDetails || undefined,
      countryCode,
      cityCode,
      images: finalImages,
      video: finalVideo, // 동영상 추가
      businessHours: businessHours || '',
      recommendedMenu: recommendedMenu || '',
      paymentMethod: paymentMethod || '',
      postType: postType || 'Traveler', // 포스트 타입 (현지인/여행자)
      updatedAt: serverTimestamp() // Firestore 서버 타임스탬프 사용
    };

    await updateDoc(doc(db, 'posts', postId), updatedPost);
    console.log('✅ 게시물 업데이트 완료:', postId);

    return true;
  } catch (error) {
    console.error('❌ 게시물 업데이트 실패:', error);
    return false;
  }
};

/**
 * DB에 먼저 게시물 생성 (미디어 없이)
 * 백그라운드 업로드를 위한 빠른 DB 저장
 */
export const createPostQuick = async (
  userId: string,
  content: string,
  locationDetails: LocationDetails | null,
  location: { countryCode: string; cityCode: string },
  businessHours?: string,
  recommendedMenu?: string,
  paymentMethod?: string
): Promise<string> => {
  try {
    console.log('🚀 빠른 게시물 생성 시작 (미디어 제외)');

    const postData = {
      userId,
      content,
      location: locationDetails?.address || '',
      locationDetails: locationDetails ? {
        name: locationDetails.name,
        address: locationDetails.address,
        placeId: locationDetails.placeId,
        lat: locationDetails.lat,
        lng: locationDetails.lng
      } : null,
      countryCode: location.countryCode,
      cityCode: location.cityCode,
      businessHours: businessHours || '',
      recommendedMenu: recommendedMenu || '',
      paymentMethod: paymentMethod || '',
      images: [], // 빈 배열로 시작
      video: null, // null로 시작
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likeCount: 0,
      bookmarkCount: 0,
      isVisible: true,
      comments: 0
    };

    const docRef = await addDoc(collection(db, 'posts'), postData);
    console.log(`✅ 빠른 게시물 생성 완료: ${docRef.id}`);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ 빠른 게시물 생성 실패:', error);
    throw error;
  }
};

/**
 * 게시물의 미디어 정보만 업데이트
 * 백그라운드 업로드 완료 후 호출
 */
export const updatePostMedia = async (
  postId: string,
  images: UploadedImage[],
  video?: UploadedImage | null
): Promise<boolean> => {
  try {
    console.log(`📤 게시물 미디어 업데이트 시작: ${postId}`);

    const postRef = doc(db, 'posts', postId);
    const updateData: any = {
      images: images || [],
      updatedAt: new Date().toISOString()
    };

    if (video !== undefined) {
      updateData.video = video;
    }

    await updateDoc(postRef, updateData);
    console.log(`✅ 게시물 미디어 업데이트 완료: ${postId}`);
    
    return true;
  } catch (error) {
    console.error(`❌ 게시물 미디어 업데이트 실패: ${postId}`, error);
    return false;
  }
};

/**
 * Bunny.net에 여러 이미지 업로드
 */
export const uploadMultipleImagesToBunny = async (
  files: File[],
  postId: string,
  onProgress?: (progress: number) => void
): Promise<UploadedImage[]> => {
  const uploadedImages: UploadedImage[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const progress = ((i + 1) / files.length) * 100;
    
    try {
      const result = await bunnyService.uploadImage(file, `${postId}/images`);
      
      if (result.success && result.url) {
        uploadedImages.push({
          id: `img_${Date.now()}_${i}`,
          url: result.url, // 원본 URL만 저장
          originalName: file.name,
          size: file.size
          // urls 객체 제거 - 필요할 때 쿼리 파라미터로 생성
        });
        
        console.log(`✅ 이미지 ${i + 1}/${files.length} 업로드 완료:`, result.url);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error(`❌ 이미지 ${i + 1} 업로드 실패:`, error);
      throw error;
    }
    
    onProgress?.(progress);
  }
  
  return uploadedImages;
};

/**
 * Bunny.net에 비디오 업로드
 */
export const uploadVideoToBunny = async (
  file: File,
  postId: string
): Promise<UploadedImage> => {
  // Bunny Stream을 사용하는 서버 API로 위임하여 업로드 및 URL 생성
  const form = new FormData();
  form.append('file', file);
  form.append('type', 'video-stream');
  form.append('postId', postId);

  const res = await fetch('/api/bunny/upload', {
    method: 'POST',
    body: form
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Video upload failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  // json: { success, videoId, url (HLS), posterUrl }
  if (!json.success || !json.url) {
    throw new Error(json.error || 'Video upload failed');
  }

  const videoId = json.videoId || `vid_${Date.now()}`;
  const hlsUrl = json.url as string;
  const posterUrl = (json.posterUrl as string) || hlsUrl;

  return {
    id: videoId,
    url: hlsUrl,
    originalName: file.name,
    size: file.size,
    urls: {
      original: hlsUrl,
      thumbnail: posterUrl
    }
  };
};
