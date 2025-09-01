/**
 * 애플 로그인 서비스 (Firebase Auth)
 */

import { 
  signInWithPopup, 
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

export interface AppleAuthResult {
  success: boolean;
  user?: User;
  error?: string;
  isNewUser?: boolean;
}

/**
 * 애플 로그인 실행
 */
export const signInWithApple = async (): Promise<AppleAuthResult> => {
  try {
    console.log('🔄 애플 로그인 시작');
    
    // Apple Auth Provider 생성
    const provider = new OAuthProvider('apple.com');
    
    // 추가 스코프 설정
    provider.addScope('email');
    provider.addScope('name');
    
    // 로그인 팝업 실행
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    console.log('✅ 애플 로그인 성공:', user);
    
    // 사용자 정보를 Firestore에 저장/업데이트
    await saveAppleUserToFirestore(user);
    
    console.log('✅ 애플 로그인 완료');
    return {
      success: true,
      user: user,
      isNewUser: result._tokenResponse?.isNewUser || false
    };
    
  } catch (error: any) {
    console.error('❌ 애플 로그인 실패:', error);
    
    let errorMessage = '애플 로그인에 실패했습니다.';
    
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
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMessage = '애플 로그인이 활성화되지 않았습니다.';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * 애플 사용자 정보를 Firestore에 저장
 */
export const saveAppleUserToFirestore = async (user: User): Promise<void> => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    // Firebase에서 제공하는 사용자 정보 사용
    const userData = {
      uid: user.uid,
      email: user.email,
      name: user.displayName || '애플 사용자',
      photoUrl: user.photoURL,
      provider: 'apple',
      providerId: user.providerId,
      createdAt: userDoc.exists() ? userDoc.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      isActive: true
    };
    
    await setDoc(userRef, userData, { merge: true });
    console.log('✅ 애플 사용자 정보 Firestore 저장 완료');
    
  } catch (error) {
    console.error('❌ 애플 사용자 정보 저장 실패:', error);
    throw error;
  }
};

/**
 * 애플 로그아웃
 */
export const signOutFromApple = async (): Promise<void> => {
  try {
    // Firebase 로그아웃 수행
    await auth.signOut();
    console.log('✅ 애플 로그아웃 완료');
    
  } catch (error) {
    console.error('❌ 애플 로그아웃 실패:', error);
    throw error;
  }
};
