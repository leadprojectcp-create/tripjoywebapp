/**
 * 카카오톡 로그인 서비스 (Firebase OpenID Connect)
 */

import { 
  signInWithRedirect,
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
    
    // 모든 환경에서 Firebase OIDC 사용 (웹뷰 포함)
    console.log('🔥 Firebase OIDC로 카카오 로그인 처리');
    
    // Firebase OIDC Provider 생성
    const provider = new OAuthProvider('oidc.kakao');
    
    // 추가 스코프 설정
    provider.addScope('profile');
    provider.addScope('email');
    
    // 리다이렉트 방식 사용
    console.log('🔄 카카오 로그인 리다이렉트 시작...');
    await signInWithRedirect(auth, provider);
    
    // 리다이렉트는 페이지를 떠나므로 여기까지 실행되지 않음
    // 결과는 페이지 로드 시 getRedirectResult로 처리됨
    return {
      success: true,
      isNewUser: false
    };
    
  } catch (error: any) {
    console.error('❌ 카카오 로그인 실패:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', JSON.stringify(error));
    
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
