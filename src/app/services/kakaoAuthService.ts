/**
 * 카카오톡 로그인 서비스 (Firebase OpenID Connect)
 */

import { 
  signInWithPopup, 
  signInWithRedirect,
  OAuthProvider, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { isWebView } from '../utils/webviewDetector';

export interface KakaoAuthResult {
  success: boolean;
  user?: User;
  error?: string;
  isNewUser?: boolean;
}

/**
 * 카카오 로그인 실행
 */
export const signInWithKakao = async (): Promise<KakaoAuthResult> => {
  try {
    console.log('🔄 카카오 로그인 시작');
    
    // 웹뷰 환경에서 네이티브 앱 처리
    if (isWebView() && typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
      console.log('📱 React Native 웹뷰에서 네이티브 카카오 로그인 호출');
      
      // 네이티브 앱에 카카오 로그인 요청
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({
        type: 'KAKAO_LOGIN'
      }));
      
      return {
        success: true,
        isNewUser: false
      };
    } else {
      console.log('🖥️ 웹 환경에서 Firebase OIDC 사용');
      
      // Firebase OIDC Provider 생성
      const provider = new OAuthProvider('oidc.kakao');
      
      // 추가 스코프 설정
      provider.addScope('profile');
      provider.addScope('email');
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      console.log('✅ 카카오 로그인 성공:', user);
      
      // 사용자 정보를 Firestore에 저장/업데이트
      await saveKakaoUserToFirestore(user);
      
      console.log('✅ 카카오 로그인 완료');
      return {
        success: true,
        user: user,
        isNewUser: false
      };
    }
    
  } catch (error: any) {
    console.error('❌ 카카오 로그인 실패:', error);
    
    let errorMessage = '카카오 로그인에 실패했습니다.';
    
    if (error.code === 'auth/account-exists-with-different-credential') {
      errorMessage = '이미 다른 방법으로 가입된 계정입니다.';
    } else if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = '로그인 창이 닫혔습니다.';
    } else if (error.code === 'auth/cancelled-popup-request') {
      errorMessage = '로그인이 취소되었습니다.';
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage = '팝업이 차단되었습니다. 팝업 차단을 해제해 주세요.';
    }
    
    return {
      success: false,
      error: errorMessage
    };
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
