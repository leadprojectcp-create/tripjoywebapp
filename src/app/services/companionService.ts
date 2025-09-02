import { 
  collection, 
  doc,
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';

// 동행 신청 데이터 인터페이스
export interface CompanionData {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName?: string;
  hotelName: string;
  location: string;
  country: string;
  city: string;
  dateRequested: string;
  timeRequested: string;
  region: string;
  status: 'pending' | 'accepted' | 'rejected' | 'past';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 동행 신청 생성
export async function createCompanionRequest(companionData: Omit<CompanionData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const now = Timestamp.now();
    
    const docData = {
      ...companionData,
      status: 'pending' as const,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, 'companion_requests'), docData);
    console.log('✅ 동행 신청 생성 성공:', docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ 동행 신청 생성 실패:', error);
    throw error;
  }
}

// 받은 동행 신청 가져오기
export async function getReceivedCompanions(userId?: string): Promise<CompanionData[]> {
  try {
    // TODO: 실제로는 현재 로그인한 사용자 ID를 사용
    const currentUserId = userId || 'current_user_id';
    
    const companionsQuery = query(
      collection(db, 'companion_requests'),
      where('receiverId', '==', currentUserId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(companionsQuery);
    const companions: CompanionData[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      companions.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as CompanionData);
    });

    console.log('✅ 받은 동행 목록 조회 성공:', companions.length, '개');
    return companions;
  } catch (error) {
    console.error('❌ 받은 동행 목록 조회 실패:', error);
    throw error;
  }
}

// 신청한 동행 가져오기
export async function getRequestedCompanions(userId?: string): Promise<CompanionData[]> {
  try {
    // TODO: 실제로는 현재 로그인한 사용자 ID를 사용
    const currentUserId = userId || 'current_user_id';
    
    const companionsQuery = query(
      collection(db, 'companion_requests'),
      where('senderId', '==', currentUserId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(companionsQuery);
    const companions: CompanionData[] = [];

    for (const docSnapshot of querySnapshot.docs) {
      const data = docSnapshot.data();
      
      // receiverName 가져오기 (사용자 정보에서)
      let receiverName = data.receiverName;
      if (!receiverName && data.receiverId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', data.receiverId));
          if (userDoc.exists()) {
            receiverName = userDoc.data().name || 'Unknown';
          }
        } catch (err) {
          console.warn('사용자 정보 조회 실패:', data.receiverId, err);
          receiverName = 'Unknown';
        }
      }

      companions.push({
        id: docSnapshot.id,
        ...data,
        receiverName,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as CompanionData);
    }

    console.log('✅ 신청한 동행 목록 조회 성공:', companions.length, '개');
    return companions;
  } catch (error) {
    console.error('❌ 신청한 동행 목록 조회 실패:', error);
    throw error;
  }
}

// 동행 신청 수락
export async function acceptCompanionRequest(companionId: string): Promise<void> {
  try {
    const companionRef = doc(db, 'companion_requests', companionId);
    
    await updateDoc(companionRef, {
      status: 'accepted',
      updatedAt: Timestamp.now(),
    });

    console.log('✅ 동행 신청 수락 성공:', companionId);
  } catch (error) {
    console.error('❌ 동행 신청 수락 실패:', error);
    throw error;
  }
}

// 동행 신청 거절
export async function rejectCompanionRequest(companionId: string): Promise<void> {
  try {
    const companionRef = doc(db, 'companion_requests', companionId);
    
    await updateDoc(companionRef, {
      status: 'rejected',
      updatedAt: Timestamp.now(),
    });

    console.log('✅ 동행 신청 거절 성공:', companionId);
  } catch (error) {
    console.error('❌ 동행 신청 거절 실패:', error);
    throw error;
  }
}

// 동행 신청 취소 (신청자가)
export async function cancelCompanionRequest(companionId: string): Promise<void> {
  try {
    const companionRef = doc(db, 'companion_requests', companionId);
    
    await deleteDoc(companionRef);

    console.log('✅ 동행 신청 취소 성공:', companionId);
  } catch (error) {
    console.error('❌ 동행 신청 취소 실패:', error);
    throw error;
  }
}

// 지난 동행으로 상태 변경 (스케줄러나 관리자용)
export async function markCompanionAsPast(companionId: string): Promise<void> {
  try {
    const companionRef = doc(db, 'companion_requests', companionId);
    
    await updateDoc(companionRef, {
      status: 'past',
      updatedAt: Timestamp.now(),
    });

    console.log('✅ 동행을 지난 상태로 변경 성공:', companionId);
  } catch (error) {
    console.error('❌ 동행을 지난 상태로 변경 실패:', error);
    throw error;
  }
}

// 동행 신청 개수 가져오기 (알림용)
export async function getCompanionRequestCount(userId?: string): Promise<{
  received: number;
  sent: number;
}> {
  try {
    // TODO: 실제로는 현재 로그인한 사용자 ID를 사용
    const currentUserId = userId || 'current_user_id';
    
    // 받은 동행 신청 중 pending 개수
    const receivedQuery = query(
      collection(db, 'companion_requests'),
      where('receiverId', '==', currentUserId),
      where('status', '==', 'pending')
    );
    const receivedSnapshot = await getDocs(receivedQuery);
    
    // 보낸 동행 신청 중 pending 개수
    const sentQuery = query(
      collection(db, 'companion_requests'),
      where('senderId', '==', currentUserId),
      where('status', '==', 'pending')
    );
    const sentSnapshot = await getDocs(sentQuery);

    const result = {
      received: receivedSnapshot.size,
      sent: sentSnapshot.size,
    };

    console.log('✅ 동행 신청 개수 조회 성공:', result);
    return result;
  } catch (error) {
    console.error('❌ 동행 신청 개수 조회 실패:', error);
    throw error;
  }
}
