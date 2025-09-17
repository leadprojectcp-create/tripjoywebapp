"use client";

import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
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
  isTemporary?: boolean; // 임시 사용자 플래그 (약관 동의 + 추가 정보 미완료)
  consents?: {
    termsOfService?: boolean;
    personalInfo?: boolean;
    locationInfo?: boolean;
    marketing?: boolean;
    thirdParty?: boolean;
  };
}

// Firestore에서 사용자 데이터 가져오기 (accounts:lookup 호출 회피)
const getUserDataFromFirestore = async (uid: string): Promise<UserData | null> => {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data() as any;
    return {
      id: uid,
      uid,
      email: data.email || '',
      name: data.name,
      phoneNumber: data.phoneNumber,
      birthDate: data.birthDate,
      gender: data.gender,
      location: data.location,
      signupMethod: data.signupMethod,
      isTemporary: data.isTemporary,
      consents: data.consents
    } as UserData;
  } catch (error) {
    console.error('❌ Firestore 사용자 조회 실패:', error);
    return null;
  }
};

export const useAuth = () => {
  const [user, setUser] = useState<UserData | null>(null);
  // 초기에는 인증 상태가 확정되지 않았으므로 true로 시작해야 보호 라우트에서 조기 리다이렉트가 발생하지 않음
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



    // Firebase Auth 상태 변경 감지 (초기 렌더 우선, 경로에 따라 지연 시작)
    let unsubscribe: (() => void) | null = null;
    const startAuthListener = () => {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Firestore로 사용자 정보 가져오기 (빠르고 계정조회 호출 없음)
          const userData = await getUserDataFromFirestore(firebaseUser.uid);
          
          // 사용자 데이터 완성도 검사
          const isCompleteUser = userData && 
            !userData.isTemporary && 
            userData.name && 
            userData.phoneNumber && 
            userData.birthDate &&
            userData.consents?.termsOfService;
            
          console.log('🔍 사용자 완성도 검사:', {
            hasUserData: !!userData,
            isTemporary: userData?.isTemporary,
            hasName: !!userData?.name,
            hasPhone: !!userData?.phoneNumber,
            hasBirth: !!userData?.birthDate,
            hasConsents: !!userData?.consents?.termsOfService,
            isCompleteUser
          });

          if (isCompleteUser) {
            // 완전한 사용자 데이터 (약관 동의 + 추가 정보 완료)
            const userWithUid = { ...userData, uid: firebaseUser.uid };
            setUser(userWithUid);
            localStorage.setItem('tripjoy_user', JSON.stringify(userWithUid));
          } else {
            // 불완전한 사용자 - 회원가입 플로우 필요
            console.log('⚠️ 불완전한 사용자 - 회원가입 플로우 필요');
            setUser(null); // 로그인 상태로 처리하지 않음
          }
          
          // 앱에 로그인 알림 (앱에서 FCM 토큰 처리)
          if (isCompleteUser) {
            try {
              const { notifyAppUserLogin } = await import('../services/fcmService');
              notifyAppUserLogin(firebaseUser.uid);
            } catch (error) {
              console.log('📝 앱 알림 실패 (웹 브라우저일 수 있음)');
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
          
          // 앱에 로그인 알림 (에러 케이스)
          try {
            const { notifyAppUserLogin } = await import('../services/fcmService');
            notifyAppUserLogin(firebaseUser.uid);
          } catch (error) {
            console.log('📝 에러 케이스 앱 알림 실패 (웹 브라우저일 수 있음)');
          }
        }
      } else {
        setUser(null);
        localStorage.removeItem('tripjoy_user');
      }
      
      // 로그인 체크 완료 후에만 isLoading을 false로 설정
      console.log('로그인 체크 완료:', { isAuthenticated: !!user, isLoading: false });
      setIsLoading(false);
    });
    };

    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const isDashboardFirstLoad = path === '/' || path === '/dashboard';
    const isProtectedPath = (p: string) => {
      return p.startsWith('/post-upload') ||
             p.startsWith('/profile') ||
             p.startsWith('/wishlist') ||
             p.startsWith('/chat');
    };

    // 모든 페이지에서 백그라운드 로그인 체크 즉시 시작
    if (typeof window !== 'undefined') {
      console.log('백그라운드 로그인 체크 시작:', path);
      startAuthListener();
    }

    return () => {
      try { unsubscribe && unsubscribe(); } catch {}
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
      
      const result = await signInWithEmail(email, password);
      
      // 이메일 로그인 후 Firestore에서 사용자 정보 확인
      const userData = await getUserData((result as any).uid);
      
      if (!userData) {
        // 새 사용자인 경우 플래그 설정
        console.log('🆕 이메일 새 사용자 감지 - 회원가입 플로우로 이동');
        localStorage.setItem('email_new_user', 'true');
      }
      
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
          window.location.href = '/';
        } else {
          router.push('/'); // 로그인 페이지가 아닌 홈으로 이동
        }
        return;
      }
      
      await signOut();
      
      // 로그아웃 후 홈으로 이동 (로그인 페이지가 아닌)
      if (isWebView()) {
        // 웹뷰에서는 메인 페이지로 리다이렉트
        window.location.href = '/';
      } else {
        router.push('/'); // 로그인 페이지가 아닌 홈으로 이동
      }
    } catch (error) {
      console.error('로그아웃 실패:', error);
      // 에러 발생 시에도 홈으로 리다이렉트
      if (isWebView()) {
        window.location.href = '/';
      } else {
        router.push('/'); // 로그인 페이지가 아닌 홈으로 이동
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
    // AuthGuard에서만 호출되는 함수 - 로그인이 필수인 페이지에서만 리다이렉트
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
