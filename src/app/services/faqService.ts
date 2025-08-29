/**
 * FAQ 서비스
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

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'account' | 'travel' | 'companion' | 'technical' | 'safety';
  priority: number; // 높을수록 위에 표시
  createdAt: any;
  updatedAt: any;
  isVisible: boolean;
  tags?: string[];
}

/**
 * FAQ 목록 가져오기
 */
export const getFAQs = async (limit: number = 50): Promise<FAQItem[]> => {
  try {
    console.log('❓ FAQ 목록 가져오기 시작');

    // 임시 데이터 (실제로는 Firebase에서 가져올 예정)
    const mockFAQs: FAQItem[] = [
      // 일반 질문
      {
        id: '1',
        question: 'TRIPJOY는 어떤 서비스인가요?',
        answer: `TRIPJOY는 여행자들이 서로 연결되어 정보를 공유하고 동행을 찾을 수 있는 여행 커뮤니티 플랫폼입니다.

주요 기능:
• 여행 경험과 팁 공유
• 동행자 찾기 및 요청
• 큐레이터 팔로우 시스템
• 실시간 채팅
• 7개국 언어 지원

전 세계 여행자들과 함께 더 안전하고 즐거운 여행을 만들어보세요!`,
        category: 'general',
        priority: 100,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        isVisible: true,
        tags: ['서비스', '소개', '기능']
      },
      {
        id: '2',
        question: '회원가입은 어떻게 하나요?',
        answer: `TRIPJOY 회원가입은 매우 간단합니다!

1. 로그인 페이지에서 "회원가입" 클릭
2. 이메일과 비밀번호 입력
3. 이용약관 및 개인정보처리방침 동의
4. 기본 프로필 정보 입력
5. 인증 이메일 확인

또는 Google 계정으로 간편 가입도 가능합니다.
가입 후 프로필을 완성하면 더 많은 기능을 이용할 수 있어요!`,
        category: 'account',
        priority: 90,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        isVisible: true,
        tags: ['회원가입', '계정', '프로필']
      },
      {
        id: '3',
        question: '동행 요청은 어떻게 보내나요?',
        answer: `동행 요청을 보내는 방법:

1. 프로필 페이지에서 원하는 사용자를 찾기
2. "동행 요청" 버튼 클릭
3. 여행 정보 입력:
   - 목적지
   - 여행 날짜
   - 시간
   - 호텔명 (선택사항)
   - 요청 메시지
4. "요청 보내기" 클릭

상대방이 승인하면 채팅으로 자세한 계획을 세울 수 있습니다.
신청한 동행은 "신청한 동행" 메뉴에서 확인 가능해요!`,
        category: 'companion',
        priority: 85,
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-03'),
        isVisible: true,
        tags: ['동행', '요청', '여행']
      },
      {
        id: '4',
        question: '큐레이터는 무엇인가요?',
        answer: `큐레이터는 여행 전문가나 경험이 풍부한 여행자들입니다.

큐레이터의 특징:
• 특정 지역에 대한 전문 지식 보유
• 질 높은 여행 정보와 팁 제공
• 다른 사용자들의 질문에 적극적으로 답변
• 인증된 신뢰할 수 있는 여행 가이드

큐레이터를 팔로우하면:
• 최신 여행 정보를 빠르게 받을 수 있음
• 개인 맞춤형 여행 추천 가능
• 현지 정보와 숨은 명소 발견

큐레이터 페이지에서 관심 있는 지역의 전문가를 찾아보세요!`,
        category: 'general',
        priority: 80,
        createdAt: new Date('2024-01-04'),
        updatedAt: new Date('2024-01-04'),
        isVisible: true,
        tags: ['큐레이터', '팔로우', '전문가']
      },
      {
        id: '5',
        question: '언어 설정을 변경하려면?',
        answer: `TRIPJOY는 7개 언어를 지원합니다!

언어 변경 방법:
1. 사이드바 하단의 언어 선택기 클릭
2. 원하는 언어 선택:
   - 한국어 (한국어)
   - English (영어)
   - Tiếng Việt (베트남어)
   - 中文 (중국어)
   - 日本語 (일본어)
   - ไทย (태국어)
   - Filipino (필리핀어)

설정한 언어는 브라우저에 저장되어 다음 방문 시에도 유지됩니다.`,
        category: 'technical',
        priority: 70,
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-05'),
        isVisible: true,
        tags: ['언어', '설정', '다국어']
      },
      {
        id: '6',
        question: '안전한 여행을 위한 팁이 있나요?',
        answer: `TRIPJOY에서 안전한 여행을 위한 가이드라인:

만남 전 주의사항:
• 충분한 대화를 통해 상대방 파악하기
• 공개된 장소에서 첫 만남 갖기
• 개인정보 과도하게 공유하지 않기
• 직감이 좋지 않으면 무리하지 않기

여행 중 안전 수칙:
• 일정과 위치를 가족/친구에게 공유
• 중요 서류는 복사본 준비
• 현지 응급연락처 미리 저장
• 여행자 보험 가입 권장

문제 발생 시:
• 즉시 현지 경찰서나 대사관 연락
• TRIPJOY 고객센터에 신고
• 증거 자료 보관

안전한 여행이 가장 중요합니다!`,
        category: 'safety',
        priority: 95,
        createdAt: new Date('2024-01-06'),
        updatedAt: new Date('2024-01-06'),
        isVisible: true,
        tags: ['안전', '여행', '주의사항', '팁']
      },
      {
        id: '7',
        question: '프로필 사진을 변경하려면?',
        answer: `프로필 사진 변경 방법:

1. 프로필 페이지로 이동
2. "프로필 편집" 버튼 클릭
3. 프로필 사진 영역 클릭
4. 새로운 사진 선택 (JPEG, PNG 지원)
5. 크기 조정 후 "저장" 클릭

사진 가이드라인:
• 최대 파일 크기: 5MB
• 권장 크기: 400x400px 이상
• 본인의 얼굴이 선명하게 보이는 사진 권장
• 부적절한 이미지는 삭제될 수 있습니다

좋은 프로필 사진은 다른 사용자들에게 신뢰감을 줍니다!`,
        category: 'account',
        priority: 60,
        createdAt: new Date('2024-01-07'),
        updatedAt: new Date('2024-01-07'),
        isVisible: true,
        tags: ['프로필', '사진', '편집']
      },
      {
        id: '8',
        question: '채팅 기능은 어떻게 사용하나요?',
        answer: `TRIPJOY 채팅 기능 사용법:

채팅 시작하기:
• 동행 요청이 승인된 후 자동으로 채팅방 생성
• 메시지 메뉴에서 채팅 목록 확인

채팅 기능:
• 실시간 메시지 전송
• 읽음 표시
• 사진 공유
• 위치 공유 (선택사항)

채팅 에티켓:
• 정중한 언어 사용
• 개인정보 보호
• 불편한 내용 신고 기능 활용
• 상대방의 시간대 고려

문제가 있는 대화는 차단하거나 신고할 수 있습니다.`,
        category: 'technical',
        priority: 75,
        createdAt: new Date('2024-01-08'),
        updatedAt: new Date('2024-01-08'),
        isVisible: true,
        tags: ['채팅', '메시지', '소통']
      },
      {
        id: '9',
        question: '계정을 삭제하고 싶어요',
        answer: `계정 삭제 전에 알아두세요:

삭제 시 사라지는 정보:
• 모든 게시물과 사진
• 채팅 기록
• 팔로워/팔로잉 관계
• 동행 요청 내역
• 프로필 정보

계정 삭제 방법:
1. 설정 메뉴 접속
2. "회원탈퇴" 선택
3. 삭제 사유 선택 (선택사항)
4. 비밀번호 확인
5. 최종 확인 후 삭제

주의사항:
• 삭제된 계정은 복구 불가능
• 30일간 계정 복구 기간 제공
• 복구 기간 내 로그인 시 계정 복원 가능

신중하게 결정해 주세요!`,
        category: 'account',
        priority: 50,
        createdAt: new Date('2024-01-09'),
        updatedAt: new Date('2024-01-09'),
        isVisible: true,
        tags: ['계정삭제', '회원탈퇴', '주의사항']
      },
      {
        id: '10',
        question: '앱이 느리거나 오류가 발생해요',
        answer: `기술적 문제 해결 방법:

먼저 시도해볼 것:
1. 페이지 새로고침 (Ctrl+F5 또는 Cmd+R)
2. 브라우저 캐시 삭제
3. 다른 브라우저에서 접속 시도
4. 인터넷 연결 확인

브라우저 설정:
• JavaScript 활성화 확인
• 쿠키 허용 설정
• 팝업 차단 해제
• 최신 버전 브라우저 사용 권장

지원 브라우저:
• Chrome (권장)
• Firefox
• Safari
• Edge

문제가 지속되면:
고객센터로 연락하시거나 스크린샷과 함께 오류 내용을 신고해 주세요.
빠른 해결을 위해 도움드리겠습니다!`,
        category: 'technical',
        priority: 65,
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-10'),
        isVisible: true,
        tags: ['오류', '기술지원', '브라우저', '속도']
      }
    ];

    // 우선순위와 최신순으로 정렬
    const sortedFAQs = mockFAQs
      .filter(faq => faq.isVisible)
      .sort((a, b) => {
        // 우선순위가 높으면 위에, 같으면 최신순
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, limit);

    console.log('✅ FAQ 목록 가져오기 완료:', sortedFAQs.length, '개');
    return sortedFAQs;

    // TODO: 실제 Firebase 구현 (주석 처리)
    /*
    const q = query(
      collection(db, 'faqs'),
      where('isVisible', '==', true),
      orderBy('priority', 'desc'),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );

    const querySnapshot = await getDocs(q);
    const faqs: FAQItem[] = [];

    querySnapshot.forEach((doc) => {
      faqs.push({
        id: doc.id,
        ...doc.data(),
      } as FAQItem);
    });

    return faqs;
    */
  } catch (error) {
    console.error('❌ FAQ 목록 가져오기 실패:', error);
    return [];
  }
};

/**
 * 카테고리별 FAQ 가져오기
 */
export const getFAQsByCategory = async (
  category: FAQItem['category'],
  limit: number = 20
): Promise<FAQItem[]> => {
  try {
    const allFAQs = await getFAQs(100); // 더 많이 가져온 후 필터링
    const filteredFAQs = allFAQs
      .filter(faq => faq.category === category)
      .slice(0, limit);

    return filteredFAQs;
  } catch (error) {
    console.error('❌ 카테고리별 FAQ 가져오기 실패:', error);
    return [];
  }
};

/**
 * FAQ 검색
 */
export const searchFAQs = async (searchTerm: string, limit: number = 20): Promise<FAQItem[]> => {
  try {
    const allFAQs = await getFAQs(100);
    const searchLower = searchTerm.toLowerCase();
    
    const searchResults = allFAQs.filter(faq => 
      faq.question.toLowerCase().includes(searchLower) ||
      faq.answer.toLowerCase().includes(searchLower) ||
      faq.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    ).slice(0, limit);

    return searchResults;
  } catch (error) {
    console.error('❌ FAQ 검색 실패:', error);
    return [];
  }
};

/**
 * 카테고리 아이콘 가져오기
 */
export const getCategoryIcon = (category: FAQItem['category']): string => {
  const iconMap = {
    general: '❓',
    account: '👤',
    travel: '✈️',
    companion: '🤝',
    technical: '⚙️',
    safety: '🛡️'
  };
  
  return iconMap[category] || '❓';
};

/**
 * 카테고리명 가져오기 (번역용 키)
 */
export const getCategoryKey = (category: FAQItem['category']): string => {
  const keyMap = {
    general: 'categoryGeneral',
    account: 'categoryAccount', 
    travel: 'categoryTravel',
    companion: 'categoryCompanion',
    technical: 'categoryTechnical',
    safety: 'categorySafety'
  };
  
  return keyMap[category] || 'categoryGeneral';
};
