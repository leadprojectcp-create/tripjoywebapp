"use client";

import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { signInWithEmail, getUserData, signOut } from '../auth/services/authService';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';

interface UserData {
  id: string;
  uid: string; // Firebase uid와 동일하게 설정
  email: string;
  name?: string;
  phoneNumber?: string;
  birthDate?: string;
  gender?: string;
  location?: string;
  signupMethod?: 'email' | 'kakao' | 'google' | 'apple';
}

export const useAuth = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const router = useRouter();

  // isAuthenticated 계산
  const isAuthenticated = !!user;



  useEffect(() => {
    // Firebase가 설정되지 않은 경우
    if (!auth) {
      setUser(null);
      setIsLoading(false);
      return;
    }



    // Firebase Auth 상태 변경 감지
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Firestore에서 사용자 정보 가져오기
          const userData = await getUserData(firebaseUser.uid);
          
          if (userData) {
            // uid 필드 추가
            const userWithUid = { ...userData, uid: firebaseUser.uid };
            setUser(userWithUid);
            localStorage.setItem('tripjoy_user', JSON.stringify(userWithUid));
          } else {
            // Firestore에 사용자 정보가 없는 경우 기본 정보 사용
            const defaultUserData: UserData = {
              id: firebaseUser.uid,
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0]
            };
            setUser(defaultUserData);
            localStorage.setItem('tripjoy_user', JSON.stringify(defaultUserData));
          }
          
          // 로그인 성공 시 리다이렉션 처리 (로그인 페이지에 있을 때만)
          if (typeof window !== 'undefined' && window.location.pathname === '/auth/login') {
            // 실제 Firestore userData만 체크 (defaultUserData는 제외)
            const realUserData = await getUserData(firebaseUser.uid);
            
            if (realUserData) {
              // 간단한 로직: Firestore에 실제 사용자 데이터가 있으면 → 기존 사용자 → 홈으로 이동
              console.log('✅ Firestore에 실제 사용자 데이터 존재 - 기존 사용자 → 홈으로 이동');
              router.push('/');
            } else {
              // Firestore에 사용자 데이터가 없으면 → 새 사용자 → 회원가입 플로우
              console.log('🔄 Firestore에 사용자 데이터 없음 - 새 사용자 → 회원가입 플로우');
              
              // 새 사용자 플래그 확인해서 소셜 로그인인지 판단
              const kakaoNewUser = localStorage.getItem('kakao_new_user');
              const googleNewUser = localStorage.getItem('google_new_user');
              const appleNewUser = localStorage.getItem('apple_new_user');
              
              let method = 'email';
              if (kakaoNewUser) method = 'kakao';
              else if (googleNewUser) method = 'google';  
              else if (appleNewUser) method = 'apple';
              
              console.log('🔍 회원가입 플로우 진입:', { method, uid: firebaseUser.uid });
              // 새 사용자는 회원가입 플로우 계속 진행 (리다이렉트 안 함)
            }
          }
        } catch (error) {
          console.error('Failed to get user data:', error);
          // 에러 발생 시 기본 정보 사용
          const defaultUserData: UserData = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0]
          };
          setUser(defaultUserData);
          localStorage.setItem('tripjoy_user', JSON.stringify(defaultUserData));
          
          // 로그인 성공 시 리다이렉션 처리 (로그인 페이지에 있을 때만)
          if (typeof window !== 'undefined' && window.location.pathname === '/auth/login') {
            // 에러 케이스도 실제 Firestore 데이터 다시 확인
            try {
              const realUserData = await getUserData(firebaseUser.uid);
              
              if (realUserData) {
                console.log('✅ 에러 후 재확인: Firestore에 실제 사용자 데이터 존재 - 홈으로 이동');
                router.push('/');
              } else {
                console.log('🔄 에러 후 재확인: Firestore에 사용자 데이터 없음 - 회원가입 플로우');
                
                // 새 사용자 플래그 확인해서 소셜 로그인인지 판단
                const kakaoNewUser = localStorage.getItem('kakao_new_user');
                const googleNewUser = localStorage.getItem('google_new_user');
                const appleNewUser = localStorage.getItem('apple_new_user');
                
                let method = 'email';
                if (kakaoNewUser) method = 'kakao';
                else if (googleNewUser) method = 'google';  
                else if (appleNewUser) method = 'apple';
                
                console.log('🔍 회원가입 플로우 진입 (에러 케이스):', { method, uid: firebaseUser.uid });
                // 새 사용자는 회원가입 플로우 계속 진행 (리다이렉트 안 함)
              }
            } catch (retryError) {
              console.log('⚠️ 재확인도 실패 - 새 사용자로 간주하여 회원가입 플로우 진행');
              // 재확인도 실패하면 새 사용자로 간주
            }
          }
        }
      } else {
        setUser(null);
        localStorage.removeItem('tripjoy_user');
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      if (!auth) {
        return { 
          success: false, 
          error: '로그인 서비스를 사용할 수 없습니다.' 
        };
      }
      
      await signInWithEmail(email, password);
      // Firebase Auth의 onAuthStateChanged가 자동으로 사용자 상태를 업데이트
      // 리다이렉션은 onAuthStateChanged에서 처리하도록 제거
      return { success: true };
    } catch (error: any) {
      console.error('로그인 실패:', error);
      return { success: false, error: error.message || '로그인에 실패했습니다.' };
    }
  };

  const logout = async () => {
    try {
      if (!auth) {
        setUser(null);
        // 웹뷰 환경 감지
        if (isWebView()) {
          // 웹뷰에서는 메인 페이지로 리다이렉트
          router.push('/');
        } else {
          router.push('/auth/login');
        }
        return;
      }
      
      await signOut();
      
      // 웹뷰 환경 감지
      if (isWebView()) {
        // 웹뷰에서는 메인 페이지로 리다이렉트 (로그인 상태가 해제된 상태)
        router.push('/');
      } else {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('로그아웃 실패:', error);
      // 에러 발생 시에도 웹뷰 환경에 따라 리다이렉트
      if (isWebView()) {
        router.push('/');
      } else {
        router.push('/auth/login');
      }
    }
  };

  // 웹뷰 환경 감지 함수
  const isWebView = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    const userAgent = window.navigator.userAgent.toLowerCase();
    
    // iOS WebView 감지
    const isIOSWebView = /iphone|ipad|ipod/.test(userAgent) && 
                        /webkit/.test(userAgent) && 
                        !/safari/.test(userAgent);
    
    // Android WebView 감지
    const isAndroidWebView = /android/.test(userAgent) && 
                            /webkit/.test(userAgent) && 
                            !/chrome/.test(userAgent);
    
    // React Native WebView 감지
    const isReactNativeWebView = /react-native/.test(userAgent);
    
    // 기타 WebView 감지
    const isOtherWebView = /wv/.test(userAgent) || 
                          /mobile/.test(userAgent) && /safari/.test(userAgent);
    
    return isIOSWebView || isAndroidWebView || isReactNativeWebView || isOtherWebView;
  };

  const openLoginPage = () => {
    router.push('/auth/login');
  };

  const openSignupModal = () => {
    setShowSignupModal(true);
  };

  const closeSignupModal = () => {
    setShowSignupModal(false);
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    showSignupModal,
    login,
    logout,
    openLoginPage,
    openSignupModal,
    closeSignupModal
  };
};
