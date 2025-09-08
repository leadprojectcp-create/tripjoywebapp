/**
 * 구글 로그인 서비스 (Firebase Auth)
 */

import { 
  signInWithPopup, 
  signInWithRedirect,
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
import { isWebView, isReactNativeApp } from '../utils/webviewDetector';

export interface GoogleAuthResult {
  success: boolean;
  user?: User;
  error?: string;
  isNewUser?: boolean;
}

/**
 * 구글 로그인 실행
 */
export const signInWithGoogle = async (): Promise<GoogleAuthResult> => {
  try {
    console.log('🔄 구글 로그인 시작');
    
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
    const provider = new GoogleAuthProvider();
    
    // 추가 스코프 설정
    provider.addScope('profile');
    provider.addScope('email');
    
    // 웹뷰 환경 감지하여 적절한 로그인 방식 선택
    if (isWebView()) {
      console.log('📱 일반 웹뷰 환경에서 리다이렉트 로그인 사용');
      await signInWithRedirect(auth, provider);
      return {
        success: true,
        isNewUser: false
      };
    } else {
      console.log('🖥️ 데스크톱 환경에서 팝업 로그인 사용');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      console.log('✅ 구글 로그인 성공:', user);
      
      // 사용자 정보를 Firestore에 저장/업데이트 및 새 사용자 확인
      const isNewUser = await saveGoogleUserToFirestore(user);
      
      console.log('✅ 구글 로그인 완료');
      return {
        success: true,
        user: user,
        isNewUser: isNewUser
      };
    }
    
  } catch (error: any) {
    console.error('❌ 구글 로그인 실패:', error);
    
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
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * 구글 사용자 정보를 Firestore에 저장 및 새 사용자 확인
 */
export const saveGoogleUserToFirestore = async (user: User): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    const isNewUser = !userDoc.exists();
    
    // Firebase에서 제공하는 사용자 정보 사용
    const userData = {
      uid: user.uid,
      email: user.email,
      name: user.displayName || '구글 사용자',
      photoUrl: user.photoURL,
      provider: 'google',
      providerId: user.providerId,
      createdAt: userDoc.exists() ? userDoc.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      isActive: true
    };
    
    await setDoc(userRef, userData, { merge: true });
    console.log('✅ 구글 사용자 정보 Firestore 저장 완료');
    
    return isNewUser;
    
  } catch (error) {
    console.error('❌ 구글 사용자 정보 저장 실패:', error);
    // 에러가 발생해도 로그인은 성공으로 처리하되, 새 사용자로 간주
    return true;
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
