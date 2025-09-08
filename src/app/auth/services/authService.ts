import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  UserCredential,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
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
  
  // 좋아요/북마크한 게시물들 (postId -> timestamp)
  likedPosts?: { [postId: string]: any }; // serverTimestamp
  bookmarkedPosts?: { [postId: string]: any }; // serverTimestamp
  
  // 채팅방 ID 목록
  chatIds?: string[]; // 참여 중인 채팅방 ID 배열
  
  // 타임스탬프들
  createdAt: string;
  updatedAt: string;
  lastUpdated: string;
  lastLoginAt: string;
  tokenUpdatedAt?: string;
}



// 이메일 회원가입
export const signUpWithEmail = async (email: string, password: string, userInfo: any): Promise<UserData> => {
  try {
    // 입력 데이터 검증
    if (!email || !password || !userInfo) {
      throw new Error('필수 정보가 누락되었습니다.');
    }

    if (password.length < 6) {
      throw new Error('비밀번호는 6자 이상이어야 합니다.');
    }

    // Firebase가 초기화되지 않은 경우 에러
    console.log('🔍 Firebase auth 상태:', !!auth);
    console.log('🔍 Firebase db 상태:', !!db);
    if (!auth || !db) {
      console.error('❌ Firebase가 초기화되지 않았습니다.');
      console.error('auth:', auth);
      console.error('db:', db);
      throw new Error('Firebase가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
    }

    // 실제 Firebase Auth로 사용자 계정 생성
    const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 한국 시간대 기준 타임스탬프 포맷팅 함수
    const formatKoreanTimestamp = (date: Date): string => {
      const koreaTime = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
      
      const year = koreaTime.getFullYear();
      const month = koreaTime.getMonth() + 1;
      const day = koreaTime.getDate();
      const hours = koreaTime.getHours();
      const minutes = koreaTime.getMinutes();
      const seconds = koreaTime.getSeconds();
      
      const period = hours < 12 ? '오전' : '오후';
      const displayHours = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
      
      return `${year}년 ${month}월 ${day}일 ${period} ${displayHours}시 ${minutes}분 ${seconds}초 UTC+9`;
    };

    // 생년월일을 타임스탬프로 변환
    const birthDate = new Date(
      parseInt(userInfo.birthYear), 
      parseInt(userInfo.birthMonth) - 1, 
      parseInt(userInfo.birthDay)
    );
    
    const currentTime = new Date();
    
    // 국가코드에 따른 언어 설정 (지원하는 7개 언어만)
    const getLanguageByCountryCode = (countryCode: string): string => {
      switch (countryCode) {
        case '+82': return 'ko';  // 한국
        case '+1': return 'en';   // 미국
        case '+84': return 'vi';  // 베트남
        case '+86': return 'zh';  // 중국
        case '+81': return 'ja';  // 일본
        case '+66': return 'th';  // 태국
        case '+63': return 'fil'; // 필리핀
        default: return 'en';     // 기본값: 영어
      }
    };

    // 전화번호 국가코드를 ISO 국가코드로 변환 (지원하는 7개 언어만)
    const getISOCountryCode = (countryCode: string): string => {
      switch (countryCode) {
        case '+82': return 'ko';  // 한국
        case '+1': return 'en';   // 미국
        case '+84': return 'vi';  // 베트남
        case '+86': return 'zh';  // 중국
        case '+81': return 'ja';  // 일본
        case '+66': return 'th';  // 태국
        case '+63': return 'fil'; // 필리핀
        default: return 'en';     // 기본값: 영어
      }
    };



    // Firestore에 사용자 정보 저장
    const userData: UserData = {
      id: user.uid,
      name: userInfo.name,
      email: user.email!,
      phoneNumber: userInfo.countryCode + userInfo.phoneNumber, // 국가코드 + 전화번호
      birthDate: formatKoreanTimestamp(birthDate),
      gender: userInfo.gender === 'male' ? '남성' : '여성',
      location: getISOCountryCode(userInfo.countryCode), // ISO 국가코드로 저장

      referralCode: userInfo.referralCode || '',
      referredBy: null,
      signupMethod: 'email',
      loginType: 'email',
      photoUrl: '',
      
      // 포인트 시스템 기본값
      points: 3000, // 가입 시 기본 포인트
      usage_count: 0,
      
      // 언어 및 토큰 (선택한 국가에 따라 언어 설정)
      language: getLanguageByCountryCode(userInfo.countryCode),
      fcmToken: '',
      
      // 동의 관련 (맵 형태로 저장)
      consents: {
        termsOfService: userInfo.consents.termsOfService,
        personalInfo: userInfo.consents.personalInfo,
        locationInfo: userInfo.consents.locationInfo,
        marketing: userInfo.consents.marketing,
        thirdParty: userInfo.consents.thirdParty
      },
      
      // 타임스탬프들
      createdAt: formatKoreanTimestamp(currentTime),
      updatedAt: formatKoreanTimestamp(currentTime),
      lastUpdated: formatKoreanTimestamp(currentTime),
      lastLoginAt: formatKoreanTimestamp(currentTime),
      tokenUpdatedAt: formatKoreanTimestamp(currentTime)
    };

    await setDoc(doc(db, 'users', user.uid), userData);
    
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

// 소셜 로그인 사용자 회원가입 (정보 완성)
export const createSocialUser = async (
  userId: string,
  email: string,
  signupMethod: 'kakao' | 'google' | 'apple',
  userInfo: {
    name: string;
    phoneNumber: string;
    countryCode: string;
    birthYear: string;
    birthMonth: string;
    birthDay: string;
    gender: string;
    referralCode?: string;
    consents?: {
      termsOfService: boolean;
      personalInfo: boolean;
      locationInfo: boolean;
      marketing: boolean;
      thirdParty: boolean;
    };
  }
): Promise<UserData> => {
  try {
    console.log('🚀 createSocialUser 함수 시작:', { userId, email, signupMethod, userInfo });
    
    // 한국 시간대 기준 타임스탬프 포맷팅 함수
    const formatKoreanTimestamp = (date: Date): string => {
      const koreaTime = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
      
      const year = koreaTime.getFullYear();
      const month = koreaTime.getMonth() + 1;
      const day = koreaTime.getDate();
      const hours = koreaTime.getHours();
      const minutes = koreaTime.getMinutes();
      const seconds = koreaTime.getSeconds();
      
      const period = hours < 12 ? '오전' : '오후';
      const displayHours = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
      
      return `${year}년 ${month}월 ${day}일 ${period} ${displayHours}시 ${minutes}분 ${seconds}초 UTC+9`;
    };

    // 생년월일을 타임스탬프로 변환
    const birthDate = new Date(
      parseInt(userInfo.birthYear), 
      parseInt(userInfo.birthMonth) - 1, 
      parseInt(userInfo.birthDay)
    );
    
    const currentTime = new Date();
    
    // 국가코드에 따른 언어 및 위치 설정
    const getLanguageAndLocationByCountryCode = (countryCode: string): { language: string, location: string } => {
      switch (countryCode) {
        case '+82': return { language: 'ko', location: 'ko' };  // 한국
        case '+1': return { language: 'en', location: 'en' };   // 미국
        case '+84': return { language: 'vi', location: 'vi' };  // 베트남
        case '+86': return { language: 'zh', location: 'zh' };  // 중국
        case '+81': return { language: 'ja', location: 'ja' };  // 일본
        case '+66': return { language: 'th', location: 'th' };  // 태국
        case '+63': return { language: 'fil', location: 'fil' }; // 필리핀
        default: return { language: 'en', location: 'en' };     // 기본값
      }
    };

    const { language, location } = getLanguageAndLocationByCountryCode(userInfo.countryCode);

    // Firestore에 사용자 정보 저장
    const userData: UserData = {
      id: userId,
      name: userInfo.name,
      email: email,
      phoneNumber: userInfo.countryCode + userInfo.phoneNumber,
      birthDate: formatKoreanTimestamp(birthDate),
      gender: userInfo.gender === 'male' ? '남성' : '여성',
      location: location,

      referralCode: userInfo.referralCode || '',
      referredBy: null,
      signupMethod: signupMethod,
      loginType: signupMethod,
      photoUrl: '',
      
      // 포인트 시스템 기본값
      points: 3000, // 가입 시 기본 포인트
      usage_count: 0,
      
      // 언어 및 토큰
      language: language,
      fcmToken: '',
      
      // 동의 관련 (실제 사용자 동의 정보 사용 - 이메일 회원가입과 동일)
      consents: userInfo.consents || {
        termsOfService: true,
        personalInfo: true,
        locationInfo: false,
        marketing: false,
        thirdParty: false
      },
      
      // 타임스탬프들
      createdAt: formatKoreanTimestamp(currentTime),
      updatedAt: formatKoreanTimestamp(currentTime),
      lastUpdated: formatKoreanTimestamp(currentTime),
      lastLoginAt: formatKoreanTimestamp(currentTime),
      tokenUpdatedAt: formatKoreanTimestamp(currentTime)
    };

    console.log('💾 Firestore 저장 시작 - users 컬렉션:', { userId, userData });
    
    await setDoc(doc(db, 'users', userId), userData);
    
    console.log('✅ 소셜 사용자 Firestore 저장 성공!');
    console.log('📊 저장된 데이터:', userData);
    return userData;
  } catch (error: any) {
    console.error('❌ createSocialUser 에러 발생:', error);
    console.error('❌ 에러 세부사항:', {
      message: error?.message || 'Unknown error',
      code: error?.code || 'NO_CODE',
      stack: error?.stack || 'No stack trace'
    });
    logError(error, 'createSocialUser');
    throw new Error(`소셜 사용자 저장 실패: ${getErrorMessage(error)}`);
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
