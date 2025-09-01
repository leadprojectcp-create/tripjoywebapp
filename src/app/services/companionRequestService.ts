import { db } from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { getUserInfo } from '../auth/services/authService';

export interface CompanionRequest {
  id: string;
  requesterId: string;
  targetUserId: string;
  place: string;
  date: Date;
  time: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  requesterInfo: {
    name: string;
    photoUrl: string;
    location: string;
  };
  targetUserInfo: {
    name: string;
    photoUrl: string;
    location: string;
  };
}

export interface CreateCompanionRequestData {
  requesterId: string;
  targetUserId: string;
  place: string;
  date: Date;
  time: string;
  locationDetails?: {
    placeId: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    city?: string;
    nationality?: string;
    cityName?: string;
    countryName?: string;
  } | null;
}

// 동행신청 생성
export const createCompanionRequest = async (data: CreateCompanionRequestData): Promise<string> => {
  try {
    // 신청자와 대상 사용자 정보 가져오기
    const [requesterInfo, targetUserInfo] = await Promise.all([
      getUserInfo(data.requesterId),
      getUserInfo(data.targetUserId)
    ]);

    if (!requesterInfo || !targetUserInfo) {
      throw new Error('사용자 정보를 찾을 수 없습니다.');
    }

    // Firestore에 저장할 데이터 준비
    const requestData = {
      requesterId: data.requesterId,
      targetUserId: data.targetUserId,
      place: data.place,
      date: Timestamp.fromDate(data.date),
      time: data.time,
      status: 'pending' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      locationDetails: data.locationDetails || null,
      requesterInfo: {
        name: requesterInfo.name || '사용자',
        photoUrl: requesterInfo.photoUrl || '',
        location: requesterInfo.location || ''
      },
      targetUserInfo: {
        name: targetUserInfo.name || '사용자',
        photoUrl: targetUserInfo.photoUrl || '',
        location: targetUserInfo.location || ''
      }
    };

    // Firestore에 저장
    const docRef = await addDoc(collection(db, 'companion-requests'), requestData);
    
    console.log('✅ 동행신청 생성 완료:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ 동행신청 생성 실패:', error);
    throw error;
  }
};

// 동행신청 상태 업데이트
export const updateCompanionRequestStatus = async (
  requestId: string, 
  status: 'accepted' | 'rejected' | 'cancelled'
): Promise<boolean> => {
  try {
    const requestRef = doc(db, 'companion-requests', requestId);
    await updateDoc(requestRef, {
      status,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ 동행신청 상태 업데이트 완료:', requestId, status);
    return true;
  } catch (error) {
    console.error('❌ 동행신청 상태 업데이트 실패:', error);
    return false;
  }
};

// 동행신청 삭제
export const deleteCompanionRequest = async (requestId: string): Promise<boolean> => {
  try {
    const requestRef = doc(db, 'companion-requests', requestId);
    await deleteDoc(requestRef);
    
    console.log('✅ 동행신청 삭제 완료:', requestId);
    return true;
  } catch (error) {
    console.error('❌ 동행신청 삭제 실패:', error);
    return false;
  }
};

// 특정 동행신청 조회
export const getCompanionRequest = async (requestId: string): Promise<CompanionRequest | null> => {
  try {
    const requestRef = doc(db, 'companion-requests', requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      return null;
    }
    
    const data = requestDoc.data();
    return {
      id: requestDoc.id,
      requesterId: data.requesterId,
      targetUserId: data.targetUserId,
      place: data.place,
      date: data.date.toDate(),
      time: data.time,
      status: data.status,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      requesterInfo: data.requesterInfo,
      targetUserInfo: data.targetUserInfo
    };
  } catch (error) {
    console.error('❌ 동행신청 조회 실패:', error);
    return null;
  }
};

// 내가 신청한 동행신청 목록 조회
export const getMyCompanionRequests = async (userId: string): Promise<CompanionRequest[]> => {
  try {
    const q = query(
      collection(db, 'companion-requests'),
      where('requesterId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const requests: CompanionRequest[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        requesterId: data.requesterId,
        targetUserId: data.targetUserId,
        place: data.place,
        date: data.date.toDate(),
        time: data.time,
        status: data.status,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        requesterInfo: data.requesterInfo,
        targetUserInfo: data.targetUserInfo
      });
    });
    
    console.log('✅ 내 동행신청 목록 조회 완료:', requests.length, '개');
    return requests;
  } catch (error) {
    console.error('❌ 내 동행신청 목록 조회 실패:', error);
    return [];
  }
};

// 내가 받은 동행신청 목록 조회
export const getReceivedCompanionRequests = async (userId: string): Promise<CompanionRequest[]> => {
  try {
    const q = query(
      collection(db, 'companion-requests'),
      where('targetUserId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const requests: CompanionRequest[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        requesterId: data.requesterId,
        targetUserId: data.targetUserId,
        place: data.place,
        date: data.date.toDate(),
        time: data.time,
        status: data.status,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        requesterInfo: data.requesterInfo,
        targetUserInfo: data.targetUserInfo
      });
    });
    
    console.log('✅ 받은 동행신청 목록 조회 완료:', requests.length, '개');
    return requests;
  } catch (error) {
    console.error('❌ 받은 동행신청 목록 조회 실패:', error);
    return [];
  }
};

// 특정 상태의 동행신청 목록 조회
export const getCompanionRequestsByStatus = async (
  userId: string, 
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled',
  type: 'sent' | 'received' = 'received'
): Promise<CompanionRequest[]> => {
  try {
    const field = type === 'sent' ? 'requesterId' : 'targetUserId';
    const q = query(
      collection(db, 'companion-requests'),
      where(field, '==', userId),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const requests: CompanionRequest[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        requesterId: data.requesterId,
        targetUserId: data.targetUserId,
        place: data.place,
        date: data.date.toDate(),
        time: data.time,
        status: data.status,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        requesterInfo: data.requesterInfo,
        targetUserInfo: data.targetUserInfo
      });
    });
    
    console.log(`✅ ${status} 상태의 ${type} 동행신청 목록 조회 완료:`, requests.length, '개');
    return requests;
  } catch (error) {
    console.error(`❌ ${status} 상태의 ${type} 동행신청 목록 조회 실패:`, error);
    return [];
  }
};

// 동행신청 통계 조회
export const getCompanionRequestStats = async (userId: string) => {
  try {
    const [sentRequests, receivedRequests] = await Promise.all([
      getMyCompanionRequests(userId),
      getReceivedCompanionRequests(userId)
    ]);
    
    const stats = {
      sent: {
        total: sentRequests.length,
        pending: sentRequests.filter(r => r.status === 'pending').length,
        accepted: sentRequests.filter(r => r.status === 'accepted').length,
        rejected: sentRequests.filter(r => r.status === 'rejected').length,
        cancelled: sentRequests.filter(r => r.status === 'cancelled').length
      },
      received: {
        total: receivedRequests.length,
        pending: receivedRequests.filter(r => r.status === 'pending').length,
        accepted: receivedRequests.filter(r => r.status === 'accepted').length,
        rejected: receivedRequests.filter(r => r.status === 'rejected').length,
        cancelled: receivedRequests.filter(r => r.status === 'cancelled').length
      }
    };
    
    console.log('✅ 동행신청 통계 조회 완료:', stats);
    return stats;
  } catch (error) {
    console.error('❌ 동행신청 통계 조회 실패:', error);
    return null;
  }
};
