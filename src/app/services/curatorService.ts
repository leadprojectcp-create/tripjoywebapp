import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

export interface CuratorData {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  photoUrl?: string;
  gender?: string;
  birthDate?: string;
  location?: string;
  nationality?: string;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
  createdAt?: any;
}

/**
 * users_test 컬렉션에서 모든 큐레이터 데이터를 가져옵니다
 */
export const getCurators = async (): Promise<CuratorData[]> => {
  try {
    const curatorsRef = collection(db, 'users_test');
    const q = query(curatorsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const curators: CuratorData[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      curators.push({
        id: doc.id,
        name: data.name || '사용자',
        email: data.email || '',
        profileImage: data.profileImage,
        photoUrl: data.photoUrl,
        gender: data.gender,
        birthDate: data.birthDate,
        location: data.location,
        nationality: data.nationality,
        postsCount: data.postsCount || 0,
        followersCount: data.followersCount || 52, // 기본값
        followingCount: data.followingCount || 12, // 기본값
        createdAt: data.createdAt,
      });
    });
    
    return curators;
  } catch (error) {
    console.error('큐레이터 데이터 가져오기 실패:', error);
    throw error;
  }
};

/**
 * 특정 큐레이터의 상세 정보를 가져옵니다
 */
export const getCuratorById = async (curatorId: string): Promise<CuratorData | null> => {
  try {
    const curatorsRef = collection(db, 'users_test');
    const querySnapshot = await getDocs(curatorsRef);
    
    let curator: CuratorData | null = null;
    
    querySnapshot.forEach((doc) => {
      if (doc.id === curatorId) {
        const data = doc.data();
        curator = {
          id: doc.id,
          name: data.name || '사용자',
          email: data.email || '',
          profileImage: data.profileImage,
          photoUrl: data.photoUrl,
          gender: data.gender,
          birthDate: data.birthDate,
          location: data.location,
          nationality: data.nationality,
          postsCount: data.postsCount || 0,
          followersCount: data.followersCount || 52,
          followingCount: data.followingCount || 12,
          createdAt: data.createdAt,
        };
      }
    });
    
    return curator;
  } catch (error) {
    console.error('큐레이터 상세 정보 가져오기 실패:', error);
    throw error;
  }
};
