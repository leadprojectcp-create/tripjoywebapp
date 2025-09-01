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
  if (typeof window !== 'undefined' && window.Kakao) {
    if (!window.Kakao.isInitialized()) {
      window.Kakao.init('d63a09e76953cb133070b8ced4d4153b'); // JavaScript 키 사용
      console.log('🔄 카카오 SDK 초기화 완료');
    }
    return true;
  }
  return false;
};

/**
 * 카카오 로그인 실행 (JavaScript SDK 직접 사용)
 */
export const signInWithKakao = async (): Promise<KakaoAuthResult> => {
  try {
    console.log('🔄 카카오 로그인 시작 (JavaScript SDK)');
    console.log('🌐 현재 환경:', typeof window !== 'undefined' ? '웹' : '서버');
    console.log('📱 웹뷰 환경:', typeof window !== 'undefined' && (window as any).ReactNativeWebView ? '예' : '아니오');
    
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
 * Firebase Custom Token 생성 (백엔드 API 호출)
 */
const createFirebaseCustomToken = async (accessToken: string, userInfo: any): Promise<string> => {
  try {
    // 실제 구현에서는 백엔드 API를 호출하여 Custom Token을 생성해야 합니다
    // 여기서는 임시로 에러를 발생시켜 백엔드 구현이 필요함을 알립니다
    
    console.log('🔄 Firebase Custom Token 생성 요청...');
    console.log('Access Token:', accessToken);
    console.log('User Info:', userInfo);
    
    // TODO: 백엔드 API 구현 필요
    // const response = await fetch('/api/auth/kakao/custom-token', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ accessToken, userInfo })
    // });
    // const { customToken } = await response.json();
    
    throw new Error('백엔드 API 구현이 필요합니다. Firebase Custom Token 생성 엔드포인트를 구현해주세요.');
    
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
