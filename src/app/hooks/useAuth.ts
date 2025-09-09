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
  isTemporary?: boolean; // 임시 사용자 플래그 (약관 동의 + 추가 정보 미완료)
  consents?: {
    termsOfService?: boolean;
    personalInfo?: boolean;
    locationInfo?: boolean;
    marketing?: boolean;
    thirdParty?: boolean;
  };
}

// API로 사용자 데이터 가져오기
const getUserDataViaAPI = async (uid: string): Promise<UserData | null> => {
  try {
    console.log('🔍 API로 사용자 데이터 확인:', uid);
    
    const response = await fetch('/api/auth/user-management', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check-user', uid })
    });
    
    if (!response.ok) {
      console.error('❌ 사용자 확인 API 실패:', response.status);
      return null;
    }
    
    const result = await response.json();
    console.log('✅ 사용자 확인 API 결과:', result);
    
    if (result.exists && result.data) {
      return result.data as UserData;
    }
    
    return null;
  } catch (error) {
    console.error('❌ 사용자 확인 오류:', error);
    return null;
  }
};

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
          // API로 사용자 정보 가져오기
          const userData = await getUserDataViaAPI(firebaseUser.uid);
          
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
          
          // 로그인 성공 시 리다이렉션 처리 (로그인 페이지에 있을 때만)
          if (typeof window !== 'undefined' && window.location.pathname === '/auth/login') {
            // 이미 위에서 가져온 userData 사용 (중복 API 호출 방지)
            
            if (isCompleteUser) {
              // 완전한 사용자 - 홈으로 이동
              console.log('✅ 완전한 사용자 - 홈으로 이동');
              
              // 앱에 로그인 알림 (앱에서 FCM 토큰 처리)
              try {
                const { notifyAppUserLogin } = await import('../services/fcmService');
                notifyAppUserLogin(firebaseUser.uid);
              } catch (error) {
                console.log('📝 앱 알림 실패 (웹 브라우저일 수 있음)');
              }
              
              // 네이티브 앱 환경에서는 자동 리다이렉트 하지 않음 (웹뷰 메시지로 처리)
              if (window.location.search.includes('app=true') || 
                  window.navigator.userAgent.includes('ReactNativeWebView')) {
                console.log('📱 네이티브 앱 환경 - 자동 리다이렉트 건너뜀 (웹뷰 메시지로 처리)');
                return;
              }
              
              window.location.href = '/';
            } else {
              // Firestore에 데이터가 없는 신규 사용자 - 회원가입 플로우 필요
              console.log('🆕 신규 사용자 - 회원가입 플로우로 이동');
              
              // 새 사용자 플래그 확인해서 로그인 방법 판단
              const kakaoNewUser = localStorage.getItem('kakao_new_user');
              const googleNewUser = localStorage.getItem('google_new_user');
              const appleNewUser = localStorage.getItem('apple_new_user');
              const emailNewUser = localStorage.getItem('email_new_user');
              
              let method = 'email';
              if (kakaoNewUser) method = 'kakao';
              else if (googleNewUser) method = 'google';  
              else if (appleNewUser) method = 'apple';
              else if (emailNewUser) method = 'email';
              
              console.log('🔍 회원가입 플로우 진입:', { 
                method, 
                uid: firebaseUser.uid,
                flags: { kakaoNewUser, googleNewUser, appleNewUser, emailNewUser }
              });
              
              // 소셜과 이메일을 완전히 분리
              if (method === 'email') {
                // 이메일 가입 플로우 (이메일 입력부터)
                router.push('/auth/email');
              } else {
                // 소셜 가입 플로우 (약관 동의부터)
                router.push(`/auth/terms?method=${method}&uid=${firebaseUser.uid}`);
              }
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
              const realUserData = await getUserDataViaAPI(firebaseUser.uid);
              
              if (realUserData) {
                
                // 앱에 로그인 알림 (에러 케이스)
                console.log('🔄 에러 케이스 로그인 성공 - 앱에 사용자 정보 전달');
                try {
                  const { notifyAppUserLogin } = await import('../services/fcmService');
                  notifyAppUserLogin(firebaseUser.uid);
                } catch (error) {
                  console.log('📝 에러 케이스 앱 알림 실패 (웹 브라우저일 수 있음)');
                }
                
                window.location.href = '/';
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
