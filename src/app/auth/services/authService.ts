import { 
  signInWithEmailAndPassword,
  UserCredential,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { getErrorMessage, logError } from '../../utils/errorHandler';

// 사용자 인터페이스
export interface UserData {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string; // 타임스탬프로 저장
  gender: string; // "남성" | "여성"
  location: string; // 국가명

  referralCode?: string;
  referredBy?: string | null;
  signupMethod: 'email' | 'kakao' | 'google' | 'apple';
  loginType: string; // "email" | "google" | "kakao" | "apple"
  photoUrl?: string;
  
  // 프로필 편집 관련 필드
  bio?: string;
  image?: string;
  
  // 포인트 시스템
  points: number;
  usage_count: number;
  
  // 언어 및 토큰
  language: string;
  fcmToken?: string;
  
  // 동의 관련 (맵 형태로 묶음)
  consents: {
    termsOfService: boolean;
    personalInfo: boolean;
    locationInfo: boolean;
    marketing: boolean;
    thirdParty: boolean;
  };
  
  
  // 채팅방 ID 목록
  chatIds?: string[]; // 참여 중인 채팅방 ID 배열
  
  // 타임스탬프들
  createdAt: string;
  updatedAt: string;
  lastUpdated: string;
  lastLoginAt: string;
  tokenUpdatedAt?: string;
}



// 이메일 회원가입 (API 사용)
export const signUpWithEmail = async (email: string, password: string, userInfo: any): Promise<UserData> => {
  try {
    // 입력 데이터 검증
    if (!email || !password || !userInfo) {
      throw new Error('필수 정보가 누락되었습니다.');
    }

    if (password.length < 6) {
      throw new Error('비밀번호는 6자 이상이어야 합니다.');
    }

    console.log('📤 이메일 회원가입 API 호출:', { email, userInfo });

    // 통합 API를 통해 사용자 생성
    const response = await fetch('/api/auth/user-management', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create-email-user', email, password, userInfo })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '회원가입에 실패했습니다.');
    }

    const result = await response.json();
    console.log('✅ 이메일 회원가입 API 성공:', result);

    // 클라이언트에서 Firebase Auth 로그인
    if (!auth) {
      throw new Error('Firebase가 설정되지 않았습니다.');
    }

    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    // API에서 반환된 사용자 데이터 사용
    const userData = result.userData;
    
    // Firebase 회원가입 완료 후 localStorage 업데이트
    if (typeof window !== 'undefined') {
      localStorage.setItem('tripjoy_user', JSON.stringify(userData));
    }
    
    return userData;
  } catch (error) {
    logError(error, 'signUpWithEmail');
    throw new Error(getErrorMessage(error));
  }
};

// 이메일 로그인
export const signInWithEmail = async (email: string, password: string): Promise<User | UserData> => {
  try {
    // 입력 데이터 검증
    if (!email || !password) {
      throw new Error('이메일과 비밀번호를 입력해주세요.');
    }

    // Firebase가 초기화되지 않은 경우 에러
    if (!auth) {
      throw new Error('Firebase가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    logError(error, 'signInWithEmail');
    throw new Error(getErrorMessage(error));
  }
};

// 이메일로 기존 사용자 찾기
export const getUserDataByEmail = async (email: string): Promise<UserData | null> => {
  try {
    if (!db) {
      throw new Error('Firebase가 설정되지 않았습니다.');
    }
    
    // 이메일로 사용자 검색
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      console.log('📧 이메일로 기존 사용자 찾음:', userDoc.id);
      return { ...userDoc.data(), id: userDoc.id } as UserData;
    }
    
    return null;
  } catch (error) {
    console.error('이메일로 사용자 정보 조회 실패:', error);
    return null;
  }
};

// 기존 사용자 UID 업데이트 (uid 변경 시 사용)
export const updateUserUID = async (oldUserId: string, newUserId: string): Promise<UserData | null> => {
  try {
    if (!db) {
      throw new Error('Firebase가 설정되지 않았습니다.');
    }
    
    // 기존 문서 가져오기
    const oldUserDoc = await getDoc(doc(db, 'users', oldUserId));
    if (!oldUserDoc.exists()) {
      throw new Error('기존 사용자 문서를 찾을 수 없습니다.');
    }
    
    const userData = oldUserDoc.data() as UserData;
    
    // 새로운 UID로 문서 생성
    const updatedUserData = {
      ...userData,
      id: newUserId,
      uid: newUserId,
      updatedAt: new Date().toISOString()
    };
    
    // 새 문서 생성하고 기존 문서 삭제
    await setDoc(doc(db, 'users', newUserId), updatedUserData);
    
    console.log('✅ 사용자 UID 업데이트 완료:', { old: oldUserId, new: newUserId });
    return updatedUserData;
  } catch (error) {
    console.error('사용자 UID 업데이트 실패:', error);
    throw error;
  }
};

// 사용자 정보 가져오기
export const getUserData = async (userId: string): Promise<UserData | null> => {
  try {
    // Firebase가 초기화되지 않은 경우 에러
    if (!db) {
      throw new Error('Firebase가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
    }
    
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data() as UserData;
    }
    return null;
  } catch (error) {
    console.error('사용자 정보 가져오기 실패:', error);
    throw error;
  }
};

// getUserInfo는 getUserData의 별칭 (호환성을 위해)
export const getUserInfo = getUserData;

// 현재 로그인한 사용자 가져오기
export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  // Firebase Auth 사용자 확인
  if (auth && auth.currentUser) {
    return auth.currentUser;
  }
  
  return null;
};

// 로그아웃
export const signOut = async (): Promise<void> => {
  try {
    if (auth && auth.currentUser) {
      await auth.signOut();
    }
    
    // localStorage 정리
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tripjoy_user');
    }
    
    console.log('✅ 로그아웃 성공');
  } catch (error) {
    logError(error, 'signOut');
    throw new Error(getErrorMessage(error));
  }
};


// 사용자 프로필 업데이트
export const updateUserProfile = async (
  userId: string, 
  updateData: {
    name?: string;
    phoneNumber?: string;
    gender?: string;
    birthDate?: string;
    location?: string;
    bio?: string;
    image?: string;
    photoUrl?: string;
  }
) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    // 기존 데이터 가져오기
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }
    
    // 업데이트할 데이터만 병합
    const updatedData = {
      ...userDoc.data(),
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    // Firestore에 업데이트
    await setDoc(userRef, updatedData, { merge: true });
    
    console.log('✅ 프로필 업데이트 성공:', updateData);
    return updatedData;
  } catch (error) {
    logError(error, 'updateUserProfile');
    throw new Error(getErrorMessage(error));
  }
};

// 사용자 ID로 사용자 정보 가져오기
export const getUserById = async (userId: string): Promise<UserData | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserData;
      console.log('✅ 사용자 정보 조회 성공:', userId);
      return userData;
    } else {
      console.log('⚠️ 사용자를 찾을 수 없음:', userId);
      return null;
    }
  } catch (error) {
    console.error('❌ 사용자 정보 조회 실패:', error);
    throw error;
  }
};
