/**
 * 구글 로그인 서비스 (Firebase Auth)
 */

import {
  signInWithPopup,
  GoogleAuthProvider,
  User
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { isReactNativeApp } from '../utils/webviewDetector';

export interface GoogleAuthResult {
  success: boolean;
  user?: User;
  error?: string;
  isNewUser?: boolean;
  needsAdditionalInfo?: boolean; // 추가 정보 입력이 필요한지 여부
}

/**
 * 구글 로그인 실행
 */
export const signInWithGoogle = async (): Promise<GoogleAuthResult> => {
  try {
    console.log('🔄 구글 로그인 시작');
    console.log('브라우저 환경:', typeof window !== 'undefined');
    console.log('현재 도메인:', typeof window !== 'undefined' ? window.location.origin : 'unknown');

    // Firebase가 초기화되었는지 확인
    if (!auth) {
      console.error('❌ Firebase Auth가 초기화되지 않았습니다');
      throw new Error('Firebase Auth가 초기화되지 않았습니다.');
    }

    console.log('✅ Firebase Auth 초기화 확인 완료');

    // React Native 앱 환경에서는 네이티브 SDK 사용
    if (isReactNativeApp()) {
      console.log('📱 React Native 앱에서 네이티브 구글 로그인 호출');

      if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({
          type: 'GOOGLE_LOGIN'
        }));
        return {
          success: true,
          isNewUser: false
        };
      } else {
        throw new Error('React Native WebView를 찾을 수 없습니다.');
      }
    }

    // Google Auth Provider 생성
    console.log('🔧 Google Auth Provider 생성 중...');
    const provider = new GoogleAuthProvider();

    // 추가 스코프 설정
    provider.addScope('profile');
    provider.addScope('email');

    // 팝업 차단을 위한 설정
    provider.setCustomParameters({
      'prompt': 'select_account'
    });

    console.log('✅ Google Auth Provider 설정 완료');

    // 브라우저 환경에서는 팝업 로그인 사용
    console.log('🖥️ 팝업 로그인 시도');
    console.log('Auth 객체 상태:', !!auth);
    console.log('Provider 객체 상태:', !!provider);

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    console.log('✅ 구글 로그인 성공');
    console.log('사용자 정보:', {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    });

    // API를 통해 사용자 정보를 Firestore에 저장/업데이트 및 사용자 상태 확인
    console.log('📤 사용자 정보 저장 시작');
    const userStatus = await saveGoogleUserViaAPI(user);

    console.log('✅ 구글 로그인 완료', userStatus);
    return {
      success: true,
      user: user,
      isNewUser: userStatus.isNewUser,
      needsAdditionalInfo: userStatus.needsAdditionalInfo
    };

  } catch (error: any) {
    console.error('❌ 구글 로그인 실패 상세:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    let errorMessage = '구글 로그인에 실패했습니다.';

    if (error.code === 'auth/account-exists-with-different-credential') {
      errorMessage = '이미 다른 방법으로 가입된 계정입니다.';
    } else if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = '로그인 창이 닫혔습니다.';
    } else if (error.code === 'auth/cancelled-popup-request') {
      errorMessage = '로그인이 취소되었습니다.';
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage = '팝업이 차단되었습니다. 팝업 차단을 해제해 주세요.';
    } else if (error.code === 'auth/unauthorized-domain') {
      errorMessage = '허용되지 않은 도메인입니다.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = '네트워크 연결을 확인해 주세요.';
    } else if (error.message.includes('Firebase Auth')) {
      errorMessage = 'Firebase 인증 서비스에 문제가 있습니다.';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * API를 통해 구글 사용자 정보를 Firestore에 저장 및 새 사용자/불완전 사용자 확인
 */
export const saveGoogleUserViaAPI = async (user: User): Promise<{ isNewUser: boolean; needsAdditionalInfo: boolean }> => {
  try {
    console.log('📤 구글 사용자 API 저장 호출:', { uid: user.uid, email: user.email, displayName: user.displayName });
    
    // 먼저 사용자 존재 확인
    const checkResponse = await fetch('/api/auth/user-management', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check-user', uid: user.uid })
    });
    
    if (!checkResponse.ok) {
      console.error('❌ 사용자 확인 API 실패:', checkResponse.status);
      return { isNewUser: true, needsAdditionalInfo: true }; // 에러 시 신규 사용자로 처리
    }
    
    const checkResult = await checkResponse.json();
    const isNewUser = !checkResult.exists;

    if (isNewUser) {
      // 신규 사용자인 경우 API로 생성
      console.log('🆕 신규 구글 사용자 - API로 생성');
      const createResponse = await fetch('/api/auth/user-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-social-user',
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          signupMethod: 'google'
        })
      });

      if (!createResponse.ok) {
        console.error('❌ 구글 사용자 생성 API 실패:', createResponse.status);
        return { isNewUser: true, needsAdditionalInfo: true }; // 에러 시 신규 사용자로 처리
      }

      const createResult = await createResponse.json();
      console.log('✅ 구글 사용자 API 생성 성공:', createResult);
      return { isNewUser: true, needsAdditionalInfo: true };

    } else {
      // 기존 사용자인 경우 - 데이터 완성도 체크
      console.log('👤 기존 구글 사용자 - 데이터 완성도 체크');

      const userData = checkResult.data;
      console.log('🔍 기존 사용자 데이터:', userData);

      // 필수 정보 완성도 체크
      const hasName = userData?.name && userData.name.trim() !== '';
      const hasPhone = userData?.phoneNumber && userData.phoneNumber.trim() !== '';
      const hasBirthDate = userData?.birthDate && userData.birthDate.trim() !== '';
      const hasConsents = userData?.consents?.termsOfService === true;

      const needsAdditionalInfo = !hasName || !hasPhone || !hasBirthDate || !hasConsents;

      console.log('📊 사용자 데이터 완성도:', {
        hasName,
        hasPhone,
        hasBirthDate,
        hasConsents,
        needsAdditionalInfo
      });

      return { isNewUser: false, needsAdditionalInfo };
    }
    
  } catch (error) {
    console.error('❌ 구글 사용자 API 저장 실패:', error);
    // 에러가 발생해도 로그인은 성공으로 처리하되, 새 사용자로 간주
    return { isNewUser: true, needsAdditionalInfo: true };
  }
};

/**
 * 구글 로그아웃
 */
export const signOutFromGoogle = async (): Promise<void> => {
  try {
    // Firebase 로그아웃 수행
    await auth.signOut();
    console.log('✅ 구글 로그아웃 완료');
    
  } catch (error) {
    console.error('❌ 구글 로그아웃 실패:', error);
    throw error;
  }
};
