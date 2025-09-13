import { PostData } from '../services/postService';

/**
 * Shorts 페이지의 비즈니스 로직을 관리하는 유틸리티 함수들
 */

/**
 * 특정 게시물과 같은 나라/도시의 게시물만 필터링하는 함수
 * @param posts 전체 게시물 배열
 * @param referencePost 기준이 되는 게시물
 * @returns 필터링된 게시물 배열
 */
export const filterPostsByLocation = (posts: PostData[], referencePost?: PostData): PostData[] => {
  if (posts.length === 0) return posts;
  
  // 기준 게시물이 없으면 첫 번째 게시물을 기준으로 사용
  const basePost = referencePost || posts[0];
  const baseNationality = basePost.location?.nationality;
  const baseCity = basePost.location?.city;
  
  console.log('📍 기준 위치:', baseNationality, baseCity, '기준 게시물 ID:', basePost.id);
  
  // 같은 나라와 도시의 게시물만 필터링
  const filtered = posts.filter(post => {
    const postNationality = post.location?.nationality;
    const postCity = post.location?.city;
    
    return postNationality === baseNationality && postCity === baseCity;
  });
  
  console.log(`🎯 필터링 결과: ${posts.length}개 → ${filtered.length}개`);
  
  return filtered;
};

/**
 * 첫 번째 게시물 기준으로 필터링하는 함수 (기존 호환성 유지)
 * @param posts 전체 게시물 배열
 * @returns 필터링된 게시물 배열
 */
export const filterPostsByFirstLocation = (posts: PostData[]): PostData[] => {
  return filterPostsByLocation(posts);
};

/**
 * 비디오 게시물만 필터링하는 함수
 * @param posts 전체 게시물 배열
 * @returns 비디오가 있는 게시물 배열
 */
export const filterVideoPosts = (posts: PostData[]): PostData[] => {
  return posts.filter(post => 
    post.video && 
    post.video.url && 
    post.video.url.trim() !== ''
  );
};

/**
 * 게시물을 위치별로 그룹화하는 함수
 * @param posts 전체 게시물 배열
 * @returns 위치별로 그룹화된 게시물 맵
 */
export const groupPostsByLocation = (posts: PostData[]): Map<string, PostData[]> => {
  const locationMap = new Map<string, PostData[]>();
  
  posts.forEach(post => {
    const nationality = post.location?.nationality || 'Unknown';
    const city = post.location?.city || 'Unknown';
    const locationKey = `${nationality}-${city}`;
    
    if (!locationMap.has(locationKey)) {
      locationMap.set(locationKey, []);
    }
    
    locationMap.get(locationKey)!.push(post);
  });
  
  return locationMap;
};

/**
 * 특정 위치의 게시물을 가져오는 함수
 * @param posts 전체 게시물 배열
 * @param nationality 국가 코드
 * @param city 도시 코드
 * @returns 해당 위치의 게시물 배열
 */
export const getPostsByLocation = (
  posts: PostData[], 
  nationality: string, 
  city: string
): PostData[] => {
  return posts.filter(post => 
    post.location?.nationality === nationality && 
    post.location?.city === city
  );
};

/**
 * 게시물을 인기도순으로 정렬하는 함수
 * @param posts 게시물 배열
 * @returns 정렬된 게시물 배열
 */
export const sortPostsByPopularity = (posts: PostData[]): PostData[] => {
  return [...posts].sort((a, b) => {
    const aLikes = a.likes || 0;
    const bLikes = b.likes || 0;
    return bLikes - aLikes;
  });
};

/**
 * 게시물을 최신순으로 정렬하는 함수
 * @param posts 게시물 배열
 * @returns 정렬된 게시물 배열
 */
export const sortPostsByDate = (posts: PostData[]): PostData[] => {
  return [...posts].sort((a, b) => {
    const aDate = new Date(a.createdAt || 0).getTime();
    const bDate = new Date(b.createdAt || 0).getTime();
    return bDate - aDate;
  });
};

/**
 * 게시물을 랜덤하게 섞는 함수
 * @param posts 게시물 배열
 * @returns 섞인 게시물 배열
 */
export const shufflePosts = (posts: PostData[]): PostData[] => {
  const shuffled = [...posts];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * 게시물을 다양한 조건으로 필터링하는 고급 함수
 * @param posts 전체 게시물 배열
 * @param options 필터링 옵션
 * @returns 필터링된 게시물 배열
 */
export const filterPostsAdvanced = (
  posts: PostData[], 
  options: {
    location?: { nationality?: string; city?: string };
    sortBy?: 'popularity' | 'date' | 'random';
    limit?: number;
    hasVideo?: boolean;
  } = {}
): PostData[] => {
  let filtered = [...posts];
  
  // 비디오 필터링
  if (options.hasVideo) {
    filtered = filterVideoPosts(filtered);
  }
  
  // 위치 필터링
  if (options.location) {
    const { nationality, city } = options.location;
    if (nationality && city) {
      filtered = getPostsByLocation(filtered, nationality, city);
    } else if (nationality) {
      filtered = filtered.filter(post => post.location?.nationality === nationality);
    }
  }
  
  // 정렬
  switch (options.sortBy) {
    case 'popularity':
      filtered = sortPostsByPopularity(filtered);
      break;
    case 'date':
      filtered = sortPostsByDate(filtered);
      break;
    case 'random':
      filtered = shufflePosts(filtered);
      break;
  }
  
  // 개수 제한
  if (options.limit && options.limit > 0) {
    filtered = filtered.slice(0, options.limit);
  }
  
  return filtered;
};

/**
 * 게시물 통계 정보를 계산하는 함수
 * @param posts 게시물 배열
 * @returns 통계 정보 객체
 */
export const calculatePostStats = (posts: PostData[]) => {
  const totalPosts = posts.length;
  const videoPosts = filterVideoPosts(posts).length;
  const imagePosts = posts.filter(post => post.images && post.images.length > 0).length;
  
  const locationGroups = groupPostsByLocation(posts);
  const uniqueLocations = locationGroups.size;
  
  const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
  const avgLikes = totalPosts > 0 ? Math.round(totalLikes / totalPosts) : 0;
  
  return {
    totalPosts,
    videoPosts,
    imagePosts,
    uniqueLocations,
    totalLikes,
    avgLikes,
    locationGroups: Array.from(locationGroups.entries()).map(([key, posts]) => ({
      location: key,
      count: posts.length
    }))
  };
};
