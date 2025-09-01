/**
 * 카카오톡 로그인 서비스 (Firebase OpenID Connect)
 */

import { 
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
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
    console.log('🌐 현재 환경:', typeof window !== 'undefined' ? '웹' : '서버');
    console.log('📱 웹뷰 환경:', typeof window !== 'undefined' && (window as any).ReactNativeWebView ? '예' : '아니오');
    
    // 모든 환경에서 Firebase OIDC 사용 (웹뷰 포함)
    console.log('🔥 Firebase OIDC로 카카오 로그인 처리');
    
    // Firebase OIDC Provider 생성
    const provider = new OAuthProvider('oidc.kakao');
    console.log('🔧 OIDC Provider 생성 완료:', provider.providerId);
    
    // 카카오 개발자 콘솔에 설정된 동의 항목에 맞는 스코프 설정
    // provider.addScope('profile'); // 제거
    // provider.addScope('email');   // 제거
    console.log('📋 스코프 설정 완료: 기본 스코프만 사용');
    
    // 웹뷰에서는 팝업이 차단될 수 있으므로 팝업 방식 먼저 시도
    console.log('🔄 카카오 로그인 팝업 방식 시도...');
    
    try {
      const result = await signInWithPopup(auth, provider);
      console.log('✅ 팝업 로그인 성공:', result.user);
      
      return {
        success: true,
        user: result.user,
        isNewUser: false
      };
    } catch (popupError: any) {
      console.log('❌ 팝업 로그인 실패, 리다이렉트 방식으로 전환:', popupError);
      
      // 팝업이 실패하면 리다이렉트 방식 사용
      console.log('🔄 카카오 로그인 리다이렉트 시작...');
      await signInWithRedirect(auth, provider);
      
      return {
        success: true,
        isNewUser: false
      };
    }
    
  } catch (error: any) {
    console.error('❌ 카카오 로그인 실패:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    let errorMessage = '카카오 로그인에 실패했습니다.';
    
    if (error.code === 'auth/account-exists-with-different-credential') {
      errorMessage = '이미 다른 방법으로 가입된 계정입니다.';
    } else if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = '로그인 창이 닫혔습니다.';
    } else if (error.code === 'auth/cancelled-popup-request') {
      errorMessage = '로그인이 취소되었습니다.';
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage = '팝업이 차단되었습니다. 팝업 차단을 해제해 주세요.';
    } else if (error.code === 'auth/invalid-credential') {
      errorMessage = '카카오 인증 정보가 유효하지 않습니다. Firebase OIDC 설정을 확인해주세요.';
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMessage = '카카오 로그인이 허용되지 않습니다. Firebase Console에서 OIDC 설정을 확인해주세요.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = '네트워크 연결에 실패했습니다. 인터넷 연결을 확인해주세요.';
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
