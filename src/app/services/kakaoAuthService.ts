/**
 * 카카오톡 로그인 서비스 (JavaScript SDK 직접 사용)
 */

import { 
  signInWithCustomToken,
  User 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from './firebase';

// 카카오 SDK 타입 정의
declare global {
  interface Window {
    Kakao: any;
  }
}

export interface KakaoAuthResult {
  success: boolean;
  user?: User;
  error?: string;
  isNewUser?: boolean;
}

/**
 * 카카오 SDK 초기화
 */
const initializeKakaoSDK = () => {
  console.log('🔄 카카오 SDK 초기화 시작...');
  console.log('🌐 window 객체 존재:', typeof window !== 'undefined');
  console.log('📱 Kakao 객체 존재:', typeof window !== 'undefined' && !!window.Kakao);
  
  if (typeof window !== 'undefined' && window.Kakao) {
    try {
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init('d63a09e76953cb133070b8ced4d4153b'); // JavaScript 키 사용
        console.log('🔄 카카오 SDK 초기화 완료');
      } else {
        console.log('🔄 카카오 SDK 이미 초기화됨');
      }
      return true;
    } catch (error) {
      console.error('❌ 카카오 SDK 초기화 실패:', error);
      return false;
    }
  } else {
    console.error('❌ 카카오 SDK를 찾을 수 없습니다.');
    return false;
  }
};

/**
 * 카카오 로그인 실행 (JavaScript SDK 직접 사용)
 */
export const signInWithKakao = async (): Promise<KakaoAuthResult> => {
  try {
    console.log('🔄 카카오 로그인 시작 (JavaScript SDK)');
    console.log('🌐 현재 환경:', typeof window !== 'undefined' ? '웹' : '서버');
    console.log('📱 웹뷰 환경:', typeof window !== 'undefined' && (window as any).ReactNativeWebView ? '예' : '아니오');
    console.log('📱 Kakao SDK 로드 상태:', typeof window !== 'undefined' ? (window.Kakao ? '로드됨' : '로드 안됨') : '서버');
    
    // 카카오 SDK가 로드될 때까지 대기
    let retryCount = 0;
    while (typeof window !== 'undefined' && !window.Kakao && retryCount < 10) {
      console.log(`🔄 카카오 SDK 로드 대기 중... (${retryCount + 1}/10)`);
      await new Promise(resolve => setTimeout(resolve, 500));
      retryCount++;
    }
    
    // 카카오 SDK 초기화
    if (!initializeKakaoSDK()) {
      throw new Error('카카오 SDK를 초기화할 수 없습니다.');
    }

    // 카카오 로그인 실행
    const response = await new Promise((resolve, reject) => {
      window.Kakao.Auth.login({
        success: (authObj: any) => {
          console.log('✅ 카카오 로그인 성공:', authObj);
          resolve(authObj);
        },
        fail: (err: any) => {
          console.error('❌ 카카오 로그인 실패:', err);
          reject(err);
        }
      });
    });

    // 카카오 사용자 정보 가져오기
    const userInfo = await new Promise((resolve, reject) => {
      window.Kakao.API.request({
        url: '/v2/user/me',
        success: (res: any) => {
          console.log('✅ 카카오 사용자 정보:', res);
          resolve(res);
        },
        fail: (err: any) => {
          console.error('❌ 카카오 사용자 정보 조회 실패:', err);
          reject(err);
        }
      });
    });

    // Firebase Custom Token 생성 (백엔드 API 호출)
    const customToken = await createFirebaseCustomToken((response as any).access_token, userInfo);
    
    // Firebase Custom Token으로 로그인
    const userCredential = await signInWithCustomToken(auth, customToken);
    const user = userCredential.user;

    console.log('✅ Firebase 로그인 성공:', user);

    return {
      success: true,
      user: user,
      isNewUser: false
    };

  } catch (error: any) {
    console.error('❌ 카카오 로그인 실패:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error);
    
    let errorMessage = '카카오 로그인에 실패했습니다.';
    
    if (error.code === 'auth/invalid-custom-token') {
      errorMessage = '인증 토큰이 유효하지 않습니다.';
    } else if (error.code === 'auth/custom-token-mismatch') {
      errorMessage = '토큰이 일치하지 않습니다.';
    } else if (error.message && error.message.includes('KOE')) {
      errorMessage = `카카오 로그인 오류: ${error.message}`;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Firebase Custom Token 생성 (Next.js API Route 호출)
 */
const createFirebaseCustomToken = async (accessToken: string, userInfo: any): Promise<string> => {
  try {
    console.log('🔄 Firebase Custom Token 생성 요청...');
    console.log('Access Token:', accessToken);
    console.log('User Info:', userInfo);
    
    // 서버가 기대하는 필드명으로 데이터 변환
    const requestData = {
      kakao_uid: userInfo.id,
      firebase_identifier: userInfo.kakao_account?.email || `kakao_${userInfo.id}@kakao.temp`,
      profile_nickname: userInfo.properties?.nickname || '카카오 사용자',
      profile_image: userInfo.properties?.profile_image || ''
    };
    
    console.log('📤 서버로 전송할 데이터:', requestData);
    
    const response = await fetch('/api/auth/kakao/custom-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API 응답 오류:', errorData);
      throw new Error(`API 요청 실패: ${response.status} - ${errorData.error || '알 수 없는 오류'}`);
    }
    
    const responseData = await response.json();
    console.log('✅ Firebase Custom Token 생성 완료:', responseData);
    
    // 응답에서 customToken이 없으면 다른 필드 확인
    if (responseData.customToken) {
      return responseData.customToken;
    } else if (responseData.firebaseData?.idToken) {
      return responseData.firebaseData.idToken;
    } else {
      throw new Error('Custom Token을 찾을 수 없습니다.');
    }
    
  } catch (error) {
    console.error('❌ Custom Token 생성 실패:', error);
    throw error;
  }
};

/**
 * 카카오 사용자 정보를 Firestore에 저장
 */
export const saveKakaoUserToFirestore = async (user: User): Promise<void> => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    // Firebase에서 제공하는 사용자 정보 사용
    const userData = {
      uid: user.uid,
      email: user.email,
      name: user.displayName || '카카오 사용자',
      photoUrl: user.photoURL,
      provider: 'kakao',
      providerId: user.providerId,
      createdAt: userDoc.exists() ? userDoc.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      isActive: true
    };
    
    await setDoc(userRef, userData, { merge: true });
    console.log('✅ 카카오 사용자 정보 Firestore 저장 완료');
    
  } catch (error) {
    console.error('❌ 카카오 사용자 정보 저장 실패:', error);
    throw error;
  }
};

/**
 * 카카오 로그아웃
 */
export const signOutFromKakao = async (): Promise<void> => {
  try {
    // Firebase 로그아웃만 수행 (OIDC는 Firebase가 관리)
    await auth.signOut();
    console.log('✅ 카카오 로그아웃 완료');
    
  } catch (error) {
    console.error('❌ 카카오 로그아웃 실패:', error);
    throw error;
  }
};
