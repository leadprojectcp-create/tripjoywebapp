"use client";

import React, { useState, useEffect } from "react";
import "./page.css";
import { useRouter } from "next/navigation";
import { useAuthContext } from "../../contexts/AuthContext";
import { useTranslationContext } from "../../contexts/TranslationContext";
import { AppBar } from "../../components/AppBar";
import { signInWithKakao } from "../../services/kakaoAuthService";
import { signInWithGoogle } from "../../services/googleAuthService";
import { signInWithApple } from "../../services/appleAuthService";
import { getRedirectResult } from "firebase/auth";
import { auth } from "../../services/firebase";
import { saveKakaoUserToFirestore } from "../../services/kakaoAuthService";
import { saveGoogleUserToFirestore } from "../../services/googleAuthService";
import { saveAppleUserToFirestore } from "../../services/appleAuthService";

export default function LoginPage(): React.JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { login } = useAuthContext();
  const { t, currentLanguage } = useTranslationContext();
  
  console.log('🌍 Current language in LoginPage:', currentLanguage);

  // 리다이렉트 결과 처리 및 웹뷰 메시지 처리
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        console.log('🔄 리다이렉트 결과 확인 중...');
        const result = await getRedirectResult(auth);
        
        if (result) {
          console.log('✅ 리다이렉트 로그인 성공:', result.user);
          
          // 사용자 정보를 Firestore에 저장/업데이트
          const user = result.user;
          const providerId = user.providerId;
          
          if (providerId === 'oidc.kakao') {
            await saveKakaoUserToFirestore(user);
          } else if (providerId === 'google.com') {
            await saveGoogleUserToFirestore(user);
          } else if (providerId === 'apple.com') {
            await saveAppleUserToFirestore(user);
          }
          
          console.log('✅ 사용자 정보 저장 완료');
        }
      } catch (error) {
        console.error('❌ 리다이렉트 결과 처리 실패:', error);
      }
    };

    // 웹뷰 메시지 처리
    const handleWebViewMessage = (event: MessageEvent) => {
      try {
        // JSON이 아닌 메시지는 무시
        if (typeof event.data !== 'string' || !event.data.startsWith('{')) {
          console.log('📱 웹뷰 메시지 (JSON 아님):', event.data);
          return;
        }
        
        const data = JSON.parse(event.data);
        console.log('📱 웹뷰 메시지 수신:', data);
        
        if (data.type === 'KAKAO_LOGIN_REDIRECT') {
          console.log('🔄 카카오 로그인 리다이렉트:', data.url);
          // 카카오 로그인 페이지로 리다이렉트
          window.location.href = data.url;
        } else if (data.type === 'KAKAO_LOGIN_SUCCESS') {
          console.log('✅ 네이티브 카카오 로그인 성공:', data.user);
          setIsLoading(false);
          // 네이티브에서 받은 사용자 정보로 Firebase 로그인 처리
          // 이 부분은 네이티브 앱에서 Firebase Auth로 처리됨
        } else if (data.type === 'KAKAO_LOGIN_FAILED') {
          console.error('❌ 네이티브 카카오 로그인 실패:', data.error);
          setError('카카오 로그인에 실패했습니다.');
          setIsLoading(false);
        } else if (data.type === 'GOOGLE_LOGIN_SUCCESS') {
          console.log('✅ 네이티브 구글 로그인 성공:', data.user);
          setIsLoading(false);
        } else if (data.type === 'GOOGLE_LOGIN_FAILED') {
          console.error('❌ 네이티브 구글 로그인 실패:', data.error);
          setError('구글 로그인에 실패했습니다.');
          setIsLoading(false);
        } else if (data.type === 'APPLE_LOGIN_SUCCESS') {
          console.log('✅ 네이티브 애플 로그인 성공:', data.user);
          setIsLoading(false);
        } else if (data.type === 'APPLE_LOGIN_FAILED') {
          console.error('❌ 네이티브 애플 로그인 실패:', data.error);
          setError('애플 로그인에 실패했습니다.');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('❌ 웹뷰 메시지 처리 실패:', error);
        // JSON 파싱 실패는 무시 (다른 메시지들)
      }
    };

    handleRedirectResult();

    // 웹뷰 메시지 리스너 등록
    if (typeof window !== 'undefined') {
      window.addEventListener('message', handleWebViewMessage);
    }

    // 클린업
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('message', handleWebViewMessage);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    const result = await login(email, password);
    
    if (!result.success) {
      setError(result.error || "로그인에 실패했습니다.");
      setIsLoading(false);
    }
    // 성공 시에는 로딩 상태를 유지하고 onAuthStateChanged에서 리다이렉션 처리
  };

  const handleSignupClick = () => {
    router.push("/auth/signup");
  };

  const handleSocialLogin = async (method: 'kakao' | 'google' | 'apple') => {
    if (method === 'kakao') {
      try {
        setIsLoading(true);
        setError("");
        
        const result = await signInWithKakao();
        
        if (!result.success) {
          setError(result.error || "카카오 로그인에 실패했습니다.");
          setIsLoading(false);
        } else {
          // 웹뷰 환경에서는 로딩 상태를 유지 (네이티브 처리 대기)
          if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
            console.log('📱 웹뷰에서 네이티브 카카오 로그인 대기 중...');
            // 로딩 상태 유지
          } else {
            setIsLoading(false);
          }
        }
      } catch (error: any) {
        console.error('카카오 로그인 오류:', error);
        setError('카카오 로그인 중 오류가 발생했습니다.');
        setIsLoading(false);
      }
    } else if (method === 'google') {
      try {
        setIsLoading(true);
        setError("");
        
        const result = await signInWithGoogle();
        
        if (!result.success) {
          setError(result.error || "구글 로그인에 실패했습니다.");
        }
        // 성공 시에는 로딩 상태를 유지하고 onAuthStateChanged에서 리다이렉션 처리
      } catch (error: any) {
        console.error('구글 로그인 오류:', error);
        setError('구글 로그인 중 오류가 발생했습니다.');
        setIsLoading(false);
      }
    } else if (method === 'apple') {
      try {
        setIsLoading(true);
        setError("");
        
        const result = await signInWithApple();
        
        if (!result.success) {
          setError(result.error || "애플 로그인에 실패했습니다.");
        }
        // 성공 시에는 로딩 상태를 유지하고 onAuthStateChanged에서 리다이렉션 처리
      } catch (error: any) {
        console.error('애플 로그인 오류:', error);
        setError('애플 로그인 중 오류가 발생했습니다.');
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      <AppBar showBackButton={false} />
      <div className="login-page page-with-appbar">
        <div className="login-container">
        <div className="login-header">
          <h1 className="brand-name">TRIPJOY</h1>
          <p className="brand-subtitle">{t('brandSubtitle')}</p>
          <p className="brand-description">{t('brandDescription')}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="email-input-group">
            <input
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="email-input-full"
            />
          </div>

          <div className="password-input-group">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                {showPassword ? (
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
                ) : (
                  <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/>
                )}
              </svg>
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? `${t('loginButton')}...` : t('loginButton')}
          </button>

          <button type="button" className="signup-button" onClick={handleSignupClick}>
            {t('signupButton')}
          </button>

          <div className="utility-links">
            <button type="button" className="utility-link">{t('findId')}</button>
            <span className="separator">|</span>
            <button type="button" className="utility-link">{t('resetPassword')}</button>
          </div>

          <div className="social-login-section">
            <div className="divider">
              <span>{t('or')}</span>
            </div>
            
            <div className="social-buttons">
              <button 
                type="button" 
                className="social-button kakao"
                onClick={() => handleSocialLogin('kakao')}
              >
                <img 
                  src="/assets/social-login/kakao.png" 
                  alt="카카오 로그인" 
                  className="social-login-image"
                />
                <span className="social-name">{t('kakaoLogin')}</span>
              </button>
              
              <button 
                type="button" 
                className="social-button google"
                onClick={() => handleSocialLogin('google')}
              >
                <img 
                  src="/assets/social-login/google.png" 
                  alt="구글 로그인" 
                  className="social-login-image"
                />
                <span className="social-name">{t('googleLogin')}</span>
              </button>
              
              <button 
                type="button" 
                className="social-button apple"
                onClick={() => handleSocialLogin('apple')}
              >
                <img 
                  src="/assets/social-login/apple.png" 
                  alt="애플 로그인" 
                  className="social-login-image"
                />
                <span className="social-name">{t('appleLogin')}</span>
              </button>
            </div>
          </div>
        </form>
        </div>
      </div>
    </>
  );
}
