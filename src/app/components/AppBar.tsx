"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { LanguageSelector } from "./LanguageSelector";
import { useTranslationContext } from "../contexts/TranslationContext";
import { useAuthContext } from "../contexts/AuthContext";
import "./AppBar.css";

interface AppBarProps {
  title?: string;
  showBackButton?: boolean;
  showLanguageSelector?: boolean;
  showLogo?: boolean;
}

export const AppBar = ({ 
  title = "TRIPJOY", 
  showBackButton = false, 
  showLanguageSelector = true,
  showLogo = true
}: AppBarProps): React.JSX.Element => {
  const router = useRouter();
  const pathname = usePathname();
  const { t, currentLanguage, changeLanguage } = useTranslationContext();
  const { logout, isAuthenticated } = useAuthContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 현재 경로에 따라 활성화 상태 확인
  const isActive = (path: string) => {
    return pathname === path;
  };

  // 로그인이 필요한 페이지들
  const requiresAuth = (path: string) => {
    const authRequiredPaths = ['/my-activity', '/profile', '/chat', '/post-upload'];
    return authRequiredPaths.includes(path);
  };

  // 메뉴 클릭 핸들러 (로그인 체크 포함)
  const handleAuthRequiredMenuClick = (path: string) => {
    if (requiresAuth(path) && !isAuthenticated) {
      // 로그인이 필요한 페이지인데 로그인하지 않은 경우
      router.push('/auth/login');
    } else {
      // 로그인이 필요없거나 이미 로그인된 경우
      setIsMenuOpen(false);
      router.push(path);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleBackClick = () => {
    router.back();
  };

  const handleLogoClick = () => {
    router.push('/');
  };

  const handleMessageClick = () => {
    router.push('/chat');
  };

  const handleMenuClick = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // 모바일 메뉴가 열렸을 때 배경 스크롤 방지
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // 컴포넌트 언마운트 시 스크롤 복원
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const handleMenuItemClick = (url: string) => {
    setIsMenuOpen(false);
    router.push(url);
  };



  // 로그아웃 처리 (PC 사이드바와 동일한 로직)
  const handleLogout = async () => {
    try {
      console.log('🔄 로그아웃 시작');
      await logout(); // useAuth의 logout 함수가 이미 모든 처리를 담당
      console.log('✅ 로그아웃 완료');
    } catch (error) {
      console.error('❌ 로그아웃 실패:', error);
    }
  };

  const handleSettingsItemClick = (itemId: string) => {
    setIsMenuOpen(false);
    
    if (itemId === 'notifications') {
      router.push('/settings/alert');
    } else if (itemId === 'notice') {
      router.push('/settings/notice');
    } else if (itemId === 'faq') {
      router.push('/settings/faq');
    } else {
      // TODO: 각 설정 항목별 기능 구현
      console.log('설정 항목 클릭:', itemId);
    }
  };

  return (
    <div className="app-bar">
      <div className="app-bar-container">
        <div className="app-bar-left">
          {showBackButton && (
            <button className="back-button" onClick={handleBackClick}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          {showLogo && (
            <div className="logo-container" onClick={handleLogoClick}>
              <Image 
                src="/logo.png" 
                alt="TRIPJOY Logo" 
                width={100} 
                height={32} 
                priority
                className="logo-image"
              />
            </div>
          )}
        </div>

        <div className="app-bar-right">
          {/* 모바일 언어 선택기 */}
          <div className="mobile-language-selector">
            {showLanguageSelector && (
              <LanguageSelector 
                currentLanguage={currentLanguage} 
                onLanguageChange={changeLanguage}
                dropdownDirection="down"
              />
            )}
          </div>
          
          {/* 모바일 메시지 버튼 */}
          <button className="mobile-message-button" onClick={handleMessageClick}>
            <Image 
              src="/icons/message.svg" 
              alt="Message" 
              width={24} 
              height={24}
            />
          </button>
          
          {/* 모바일 햄버거 메뉴 버튼 */}
          <button className="mobile-menu-button" onClick={handleMenuClick}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {/* 데스크톱 메뉴 */}
          <div className="desktop-menu">
            <button className={`desktop-menu-item ${isActive('/post-upload') ? 'active' : ''}`} onClick={() => handleAuthRequiredMenuClick('/post-upload')}>
              <Image 
                src={isActive('/post-upload') ? "/icons/upload_active.svg" : "/icons/upload.svg"} 
                alt="Upload" 
                width={24} 
                height={24}
              />
              {t('uploadPost')}
            </button>
            <button className={`desktop-menu-item ${isActive('/my-activity') ? 'active' : ''}`} onClick={() => handleAuthRequiredMenuClick('/my-activity')}>
              <Image 
                src={isActive('/my-activity') ? "/icons/activity_active.svg" : "/icons/activity.svg"} 
                alt="Activity" 
                width={24} 
                height={24}
              />
              {t('myActivity')}
            </button>
            <button className={`desktop-menu-item ${isActive('/trip-tour') ? 'active' : ''}`} onClick={() => handleAuthRequiredMenuClick('/trip-tour')}>
              <Image 
                src="/icons/location_pin.svg" 
                alt="Location" 
                width={24} 
                height={24}
              />
              트립투어
            </button>
            <button className={`desktop-menu-item ${isActive('/profile') ? 'active' : ''}`} onClick={() => handleAuthRequiredMenuClick('/profile')}>
              <Image 
                src={isActive('/profile') ? "/icons/profile_active.svg" : "/icons/profile.svg"} 
                alt="Profile" 
                width={24} 
                height={24}
              />
              {t('profile')}
            </button>
            <button className={`desktop-menu-item ${isActive('/chat') ? 'active' : ''}`} onClick={() => handleAuthRequiredMenuClick('/chat')}>
              <Image 
                src={isActive('/chat') ? "/icons/message_active.svg" : "/icons/message.svg"} 
                alt="Message" 
                width={24} 
                height={24}
              />
              {t('chat')}
            </button>
          </div>

          {/* 데스크톱 언어 선택기 */}
          <div className="desktop-language-selector">
            {showLanguageSelector && (
              <LanguageSelector 
                currentLanguage={currentLanguage} 
                onLanguageChange={changeLanguage}
                dropdownDirection="down"
              />
            )}
          </div>

          {/* 데스크톱 로그인/로그아웃 버튼 */}
          <div className="desktop-auth-buttons">
            {isAuthenticated ? (
              <button className="desktop-logout-button" onClick={handleLogout}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="currentColor"/>
                </svg>
                {t('logout')}
              </button>
            ) : (
              <button className="desktop-login-button" onClick={() => router.push('/auth/login')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                로그인
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* 모바일 햄버거 메뉴 모달 - Portal로 렌더링 */}
      {mounted && isMenuOpen && createPortal(
        <div className="mobile-menu-overlay" onClick={() => setIsMenuOpen(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <h3>{t('menu')}</h3>
              <button className="mobile-menu-close" onClick={() => setIsMenuOpen(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="mobile-menu-items">
              {/* 메인 메뉴 */}
              <button onClick={() => handleAuthRequiredMenuClick('/post-upload')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t('uploadPost')}
              </button>
              <button onClick={() => handleAuthRequiredMenuClick('/my-activity')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t('myActivity')}
              </button>
              <button onClick={() => handleAuthRequiredMenuClick('/trip-tour')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                </svg>
                트립투어
              </button>
              <button onClick={() => handleAuthRequiredMenuClick('/profile')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                </svg>
                {t('profile')}
              </button>
              <button onClick={() => handleAuthRequiredMenuClick('/chat')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t('chat')}
              </button>
              
              {/* 구분선 */}
              <div className="mobile-menu-divider"></div>
              
              {/* 설정 항목들 */}
              <div className="mobile-settings-section">
                <button onClick={() => handleSettingsItemClick('notifications')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor"/>
                  </svg>
                  {t('notifications')}
                </button>
                <button onClick={() => handleSettingsItemClick('customer-service')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                  </svg>
                  {t('customerService')}
                </button>
                <button onClick={() => handleSettingsItemClick('faq')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" fill="currentColor"/>
                  </svg>
                  {t('faq')}
                </button>
                <button onClick={() => handleSettingsItemClick('notice')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                  </svg>
                  {t('notice')}
                </button>
                <button onClick={() => handleSettingsItemClick('version')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2.5-9H19v2h-1.5v17.5c0 .83-.67 1.5-1.5 1.5H8c-.83 0-1.5-.67-1.5-1.5V4H5V2h4.5V.5c0-.83.67-1.5 1.5-1.5h3c.83 0 1.5.67 1.5 1.5V2h4.5z" fill="currentColor"/>
                  </svg>
                  {t('version')} (0.1.0)
                </button>
                <button onClick={() => handleSettingsItemClick('delete-account')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
                  </svg>
                  {t('deleteAccount')}
                </button>
              </div>
              
              {/* 로그인/로그아웃 버튼 */}
              {isAuthenticated ? (
                <button onClick={handleLogout}>{t('logout')}</button>
              ) : (
                <button onClick={() => { setIsMenuOpen(false); router.push('/auth/login'); }}>로그인</button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
