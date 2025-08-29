/**
 * 공지사항 서비스
 */

import { 
  collection, 
  query, 
  orderBy, 
  limit as firestoreLimit,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from './firebase';

export interface NoticeItem {
  id: string;
  title: string;
  content: string;
  category: 'update' | 'maintenance' | 'event' | 'general';
  importance: 'important' | 'normal';
  createdAt: any;
  author: string;
  isVisible: boolean;
}

/**
 * 공지사항 목록 가져오기
 */
export const getNotices = async (limit: number = 20): Promise<NoticeItem[]> => {
  try {
    console.log('📢 공지사항 목록 가져오기 시작');

    // 임시 데이터 (실제로는 Firebase에서 가져올 예정)
    const mockNotices: NoticeItem[] = [
      {
        id: '1',
        title: '🎉 TRIPJOY 베타 버전 출시 안내',
        content: `안녕하세요, TRIPJOY 사용자 여러분!

드디어 TRIPJOY 베타 버전이 출시되었습니다. 
새로운 기능들을 체험해보시고 소중한 피드백을 남겨주세요.

주요 새 기능:
• 실시간 채팅 기능
• 동행 요청 시스템
• 큐레이터 팔로우 기능
• 다국어 지원 (7개 언어)

버그 신고나 개선사항은 고객센터를 통해 알려주시기 바랍니다.

감사합니다!`,
        category: 'update',
        importance: 'important',
        createdAt: new Date('2024-01-15'),
        author: 'TRIPJOY 팀',
        isVisible: true
      },
      {
        id: '2',
        title: '🔧 시스템 점검 안내 (1월 20일)',
        content: `서비스 안정성 향상을 위한 시스템 점검을 실시합니다.

점검 일시: 2024년 1월 20일 (토) 02:00 ~ 06:00 (4시간)
점검 내용: 서버 성능 최적화 및 보안 업데이트

점검 시간 동안은 서비스 이용이 불가능하오니 양해 부탁드립니다.

보다 나은 서비스로 찾아뵙겠습니다.`,
        category: 'maintenance',
        importance: 'important',
        createdAt: new Date('2024-01-18'),
        author: 'TRIPJOY 팀',
        isVisible: true
      },
      {
        id: '3',
        title: '📱 모바일 앱 출시 예정',
        content: `TRIPJOY 모바일 앱이 곧 출시될 예정입니다!

예상 출시일: 2024년 2월 말
지원 플랫폼: iOS, Android

앱 출시 시 푸시 알림을 통해 안내드리겠습니다.
많은 기대 부탁드립니다.`,
        category: 'update',
        importance: 'normal',
        createdAt: new Date('2024-01-10'),
        author: 'TRIPJOY 팀',
        isVisible: true
      },
      {
        id: '4',
        title: '🎊 신년 이벤트 진행 중',
        content: `2024년 새해를 맞아 특별 이벤트를 진행합니다!

이벤트 기간: 2024년 1월 1일 ~ 1월 31일
참여 방법: 
1. 첫 게시물 작성하기
2. 큐레이터 3명 이상 팔로우하기  
3. 동행 요청 1회 이상 보내기

달성하신 분들께는 특별 배지를 드립니다!`,
        category: 'event',
        importance: 'normal',
        createdAt: new Date('2024-01-01'),
        author: 'TRIPJOY 팀',
        isVisible: true
      },
      {
        id: '5',
        title: '개인정보 처리방침 업데이트',
        content: `개인정보 처리방침이 업데이트되었습니다.

주요 변경사항:
• 데이터 보관 기간 명시
• 제3자 제공 범위 구체화
• 사용자 권리 강화

자세한 내용은 설정 > 개인정보 처리방침에서 확인하실 수 있습니다.`,
        category: 'general',
        importance: 'normal',
        createdAt: new Date('2024-01-05'),
        author: 'TRIPJOY 팀',
        isVisible: true
      }
    ];

    // 최신순으로 정렬
    const sortedNotices = mockNotices
      .filter(notice => notice.isVisible)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    console.log('✅ 공지사항 목록 가져오기 완료:', sortedNotices.length, '개');
    return sortedNotices;

    // TODO: 실제 Firebase 구현 (주석 처리)
    /*
    const q = query(
      collection(db, 'notices'),
      where('isVisible', '==', true),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );

    const querySnapshot = await getDocs(q);
    const notices: NoticeItem[] = [];

    querySnapshot.forEach((doc) => {
      notices.push({
        id: doc.id,
        ...doc.data(),
      } as NoticeItem);
    });

    return notices;
    */
  } catch (error) {
    console.error('❌ 공지사항 목록 가져오기 실패:', error);
    return [];
  }
};

/**
 * 카테고리별 공지사항 가져오기
 */
export const getNoticesByCategory = async (
  category: NoticeItem['category'],
  limit: number = 20
): Promise<NoticeItem[]> => {
  try {
    const allNotices = await getNotices(100); // 더 많이 가져온 후 필터링
    const filteredNotices = allNotices
      .filter(notice => notice.category === category)
      .slice(0, limit);

    return filteredNotices;
  } catch (error) {
    console.error('❌ 카테고리별 공지사항 가져오기 실패:', error);
    return [];
  }
};

/**
 * 중요 공지사항만 가져오기
 */
export const getImportantNotices = async (limit: number = 10): Promise<NoticeItem[]> => {
  try {
    const allNotices = await getNotices(100);
    const importantNotices = allNotices
      .filter(notice => notice.importance === 'important')
      .slice(0, limit);

    return importantNotices;
  } catch (error) {
    console.error('❌ 중요 공지사항 가져오기 실패:', error);
    return [];
  }
};

/**
 * 시간 포맷 유틸리티
 */
export const formatNoticeTime = (timestamp: any): string => {
  try {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    
    return date.toLocaleDateString('ko-KR');
  } catch (error) {
    return '알 수 없음';
  }
};

/**
 * 카테고리 아이콘 가져오기
 */
export const getCategoryIcon = (category: NoticeItem['category']): string => {
  const iconMap = {
    update: '🚀',
    maintenance: '🔧',
    event: '🎉',
    general: '📄'
  };
  
  return iconMap[category] || '📄';
};

/**
 * 중요도 아이콘 가져오기
 */
export const getImportanceIcon = (importance: NoticeItem['importance']): string => {
  return importance === 'important' ? '🔥' : '';
};
