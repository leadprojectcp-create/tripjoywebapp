/**
 * 카카오톡 로그인 서비스 (JavaScript SDK 직접 사용)
 */

import { 
  signInWithCustomToken,
  User 
} from 'firebase/auth';
import { auth } from './firebase';
import { isReactNativeApp } from '../utils/webviewDetector';

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
  uid?: string;
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
    console.log('🔄 카카오 로그인 시작');
    console.log('🌐 현재 환경:', typeof window !== 'undefined' ? '웹' : '서버');
    console.log('📱 React Native 앱 환경:', isReactNativeApp() ? '예' : '아니오');
    console.log('📱 웹뷰 환경:', typeof window !== 'undefined' && (window as any).ReactNativeWebView ? '예' : '아니오');
    
    // React Native 앱 환경에서는 네이티브 SDK 사용
    if (isReactNativeApp()) {
      console.log('📱 React Native 앱에서 네이티브 카카오 로그인 호출');
      
      if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({
          type: 'KAKAO_LOGIN'
        }));
        return {
          success: true,
          isNewUser: false
        };
      } else {
        throw new Error('React Native WebView를 찾을 수 없습니다.');
      }
    }
    
    console.log('🖥️ 웹 환경에서 JavaScript SDK 사용');
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
          console.log('🔍 카카오 사용자 ID:', res.id);
          console.log('🔍 ID 타입:', typeof res.id);
          console.log('🔍 ID 길이:', res.id ? res.id.toString().length : 'undefined');
          resolve(res);
        },
        fail: (err: any) => {
          console.error('❌ 카카오 사용자 정보 조회 실패:', err);
          reject(err);
        }
      });
    });

    // Firebase Custom Token 생성 (백엔드 API 호출)
    const tokenResult = await createFirebaseCustomToken((response as any).access_token, userInfo);
    
    // Firebase Custom Token으로 로그인
    const userCredential = await signInWithCustomToken(auth, tokenResult.customToken);
    const user = userCredential.user;

    console.log('✅ Firebase 로그인 성공:', user);

    return {
      success: true,
      user: user,
      isNewUser: tokenResult.isNewUser,
      uid: tokenResult.uid
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
const createFirebaseCustomToken = async (accessToken: string, userInfo: any): Promise<{ customToken: string; isNewUser: boolean; uid: string }> => {
  try {
    console.log('🔄 Firebase Custom Token 생성 요청...');
    console.log('Access Token:', accessToken);
    console.log('User Info:', userInfo);
    
    // UID 유효성 검사
    if (!userInfo.id) {
      console.error('❌ 카카오 사용자 ID가 없습니다:', userInfo);
      throw new Error('카카오에서 사용자 ID를 가져올 수 없습니다.');
    }
    
    const kakaoUid = userInfo.id.toString(); // 숫자를 문자열로 변환
    
    if (kakaoUid.length === 0 || kakaoUid.length > 128) {
      console.error('❌ 카카오 UID 길이 오류:', { uid: kakaoUid, length: kakaoUid.length });
      throw new Error('카카오 사용자 ID 형식이 올바르지 않습니다.');
    }
    
    console.log('✅ 카카오 UID 검증 완료:', kakaoUid);
    
    // 서버가 기대하는 필드명으로 데이터 변환
    const requestData = {
      kakao_uid: kakaoUid, // 문자열로 변환된 UID 사용
      firebase_identifier: userInfo.kakao_account?.email || `kakao_${kakaoUid}@kakao.temp`,
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
    
    // 응답에서 필요한 정보 반환
    if (responseData.customToken && responseData.uid) {
      return {
        customToken: responseData.customToken,
        isNewUser: responseData.isNewUser || false,
        uid: responseData.uid
      };
    } else {
      throw new Error('Custom Token 또는 UID를 찾을 수 없습니다.');
    }
    
  } catch (error) {
    console.error('❌ Custom Token 생성 실패:', error);
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
