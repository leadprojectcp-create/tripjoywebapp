import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export interface BannerData {
  id: string;
  order: number;
  isActive: boolean;
  content: {
    [language: string]: {
      imageUrl: string;
      title?: string;
      subtitle?: string;
    };
  };
  targeting?: {
    countries: string[];
    startDate: Timestamp;
    endDate: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
}

export const fetchBanners = async (language: string): Promise<BannerItem[]> => {
  try {
    const now = new Date();
    const bannersRef = collection(db, 'banners');
    
    // 활성화된 배너만 가져오고 order 순으로 정렬
    const q = query(
      bannersRef,
      where('isActive', '==', true),
      orderBy('order', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const banners: BannerItem[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data() as BannerData;
      
      // 타겟팅 체크 (날짜)
      if (data.targeting) {
        // 날짜 체크
        const startDate = data.targeting.startDate?.toDate();
        const endDate = data.targeting.endDate?.toDate();
        
        if (startDate && now < startDate) return; // 아직 시작 안됨
        if (endDate && now > endDate) return; // 이미 종료됨
        
        // 국가/언어 체크 - targeting.countries가 언어 코드 배열임
        if (data.targeting.countries && data.targeting.countries.length > 0) {
          if (!data.targeting.countries.includes(language)) return;
        }
      }
      
      // 해당 언어의 콘텐츠 가져오기 (없으면 ko fallback)
      const content = data.content?.[language] || data.content?.['ko'] || data.content?.['en'];
      
      if (content?.imageUrl) {
        banners.push({
          id: data.id || doc.id,
          title: content.title || '',
          subtitle: content.subtitle || '',
          imageUrl: content.imageUrl
        });
      }
    });
    
    return banners;
  } catch (error) {
    console.error('배너 로드 실패:', error);
    return [];
  }
};
