"use client";

import React, { useState } from "react";
import "./page.css";
import { useRouter } from "next/navigation";
import { useAuthContext } from "../../contexts/AuthContext";
import { useTranslationContext } from "../../contexts/TranslationContext";
import { AppBar } from "../../components/AppBar";

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

  const handleSocialLogin = (method: 'kakao' | 'google' | 'apple') => {
    // TODO: 소셜 로그인 로직 구현
    console.log("소셜 로그인:", method);
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
                <div className="social-icon kakao-icon">
                  <span>TALK</span>
                </div>
                <span className="social-name">{t('kakaoLogin')}</span>
              </button>
              
              <button 
                type="button" 
                className="social-button google"
                onClick={() => handleSocialLogin('google')}
              >
                <div className="social-icon google-icon">
                  <span>G</span>
                </div>
                <span className="social-name">{t('googleLogin')}</span>
              </button>
              
              <button 
                type="button" 
                className="social-button apple"
                onClick={() => handleSocialLogin('apple')}
              >
                <div className="social-icon apple-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </div>
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
