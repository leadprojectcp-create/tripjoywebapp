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
          
          // 로그인 성공 시 홈페이지로 리다이렉션 (로그인 페이지에 있을 때만)
          if (typeof window !== 'undefined' && window.location.pathname === '/auth/login') {
            router.push('/');
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
          
          // 로그인 성공 시 홈페이지로 리다이렉션 (로그인 페이지에 있을 때만)
          if (typeof window !== 'undefined' && window.location.pathname === '/auth/login') {
            router.push('/');
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
