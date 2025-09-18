"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { LanguageSelector } from "./LanguageSelector";
import { useTranslationContext } from "../contexts/TranslationContext";
import { useAuthContext } from "../contexts/AuthContext";
import CountryAndCitySelector from "./CountryAndCitySelector";
import "./AppBar.css";

interface AppBarProps {
  title?: string;
  showBackButton?: boolean;
  showLogo?: boolean;
}

export const AppBar = ({ 
  title = "TRIPJOY", 
  showBackButton = false, 
  showLogo = true
}: AppBarProps): React.JSX.Element => {
  const router = useRouter();
  const pathname = usePathname();
  const { t, currentLanguage, changeLanguage } = useTranslationContext();
  const { logout, isAuthenticated, user } = useAuthContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // 위치 선택 관련 상태
  const [locationText, setLocationText] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // 현재 경로에 따라 활성화 상태 확인
  const isActive = (path: string) => {
    return pathname === path;
  };

  // 로그인이 필요한 페이지들
  // 메뉴 클릭 핸들러 (AuthGuard에서 로그인 체크 처리)
  const handleAuthRequiredMenuClick = (path: string) => {
    // AuthGuard에서 로그인 체크를 처리하므로 여기서는 단순히 페이지 이동만
    setIsMenuOpen(false);
    router.push(path);
  };


  // Dashboard에서 위치 텍스트 업데이트 수신
  useEffect(() => {
    const handleLocationTextUpdate = (event: CustomEvent) => {
      setLocationText(event.detail.text);
    };

    window.addEventListener('locationTextChanged', handleLocationTextUpdate as EventListener);
    
    return () => {
      window.removeEventListener('locationTextChanged', handleLocationTextUpdate as EventListener);
    };
  }, []);

  // 로컬 스토리지에서 지역 정보 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCountry = localStorage.getItem('dashboard_selectedCountry');
      const savedCity = localStorage.getItem('dashboard_selectedCity');
      const savedLocationText = localStorage.getItem('dashboard_locationText');
      
      console.log('AppBar 로컬 스토리지에서 불러온 값들:', {
        savedCountry,
        savedCity,
        savedLocationText
      });
      
      if (savedCountry) setSelectedCountry(savedCountry);
      if (savedCity) setSelectedCity(savedCity);
      if (savedLocationText) setLocationText(savedLocationText);
    }
  }, []);


  useEffect(() => {
    setMounted(true);
    
    // 모바일 감지
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);


  const handleBackClick = () => {
    router.back();
  };

  const handleLogoClick = () => {
    router.push('/');
  };


  const handleMenuClick = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // 드롭다운 메뉴 외부 클릭으로 닫기 (PC에서만)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isMenuOpen && !isMobile && !target.closest('.menu-dropdown-container')) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen && !isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, isMobile]);

  // 모바일 메뉴가 열렸을 때 배경 스크롤 방지
  useEffect(() => {
    if (isMenuOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // 컴포넌트 언마운트 시 스크롤 복원
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen, isMobile]);

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

  // 로그아웃 확인 다이얼로그
  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  // 로그아웃 확인
  const confirmLogout = () => {
    setShowLogoutModal(false);
    handleLogout();
  };

  // 로그아웃 취소
  const cancelLogout = () => {
    setShowLogoutModal(false);
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
    <>
    <div className="app-bar">
      <div className="app-bar-container">
        {/* PC용 AppBar - 한 줄 구조 */}
        {!isMobile && (
          <div className="pc-app-bar">
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
              {!showLogo && title && (
                <div className="app-bar-title">
                  {title}
                </div>
              )}
            </div>

            {/* PC에서만 위치 선택기 */}
            {(pathname === '/' || pathname === '/dashboard') && (
              <div className="app-bar-center">
                <CountryAndCitySelector
                  variant="pc"
                  selectedCountry={selectedCountry}
                  selectedCity={selectedCity}
                  onSelectionChange={(countryCode, cityCode) => {
                    setSelectedCountry(countryCode);
                    setSelectedCity(cityCode);
                    console.log('AppBar에서 지역 선택:', { countryCode, cityCode });
                    window.dispatchEvent(new CustomEvent('locationSelectionChanged', {
                      detail: { countryCode, cityCode }
                    }));
                  }}
                  onLocationTextChange={setLocationText}
                />
              </div>
            )}

            <div className="app-bar-right">
              <div className="desktop-menu">
                <button className={`desktop-menu-item ${isActive('/trip-tour') ? 'active' : ''}`} onClick={() => handleAuthRequiredMenuClick('/trip-tour')}>
                  <Image 
                    src={isActive('/trip-tour') ? "/icons/triptour_active.png" : "/icons/triptour.png"} 
                    alt="Trip Tour" 
                    width={26} 
                    height={26}
                  />
                  {t('tripTour')}
                </button>
                <button className={`desktop-menu-item ${isActive('/post-upload') ? 'active' : ''}`} onClick={() => handleAuthRequiredMenuClick('/post-upload')}>
                  <Image 
                    src={isActive('/post-upload') ? "/icons/upload_active.png" : "/icons/upload.png"} 
                    alt="Upload" 
                    width={26} 
                    height={26}
                  />
                  {t('uploadPost')}
                </button>
                <button className={`desktop-menu-item ${isActive('/profile') ? 'active' : ''}`} onClick={() => handleAuthRequiredMenuClick('/profile')}>
                  <Image 
                    src={isActive('/profile') ? "/icons/profile_active.png" : "/icons/profile.png"} 
                    alt="Profile" 
                    width={26} 
                    height={26}
                  />
                  {t('profile')}
                </button>
                <button className={`desktop-menu-item ${isActive('/chat') ? 'active' : ''}`} onClick={() => handleAuthRequiredMenuClick('/chat')}>
                  <Image 
                    src={isActive('/chat') ? "/icons/message_active.png" : "/icons/message.png"} 
                    alt="Message" 
                    width={26} 
                    height={26}
                  />
                  {t('chat')}
                </button>
                
                <div className="menu-dropdown-container">
                  <button className="mobile-menu-button" onClick={handleMenuClick}>
                    <Image 
                      src="/icons/menu.png" 
                      alt="Menu" 
                      width={26} 
                      height={26}
                    />
                    <span className="menu-text">{t('menu')}</span>
                  </button>
                  
                  {isMenuOpen && (
                    <div className="menu-dropdown">
                      <div className="menu-dropdown-content">
                        {isAuthenticated && user && (
                          <div className="user-info-section">
                            <div className="user-name-row" onClick={() => { setIsMenuOpen(false); router.push('/profile'); }}>
                              <span className="user-name">{user.name}</span>
                              <svg className="arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6-6 6-1.41-1.41z" fill="currentColor"/>
                              </svg>
                            </div>
                            <div className="points-container">
                              <span className="points-label">{t('myPoints')}</span>
                              <span className="points-value">{user.points || 0}P</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="settings-divider"></div>
                        <div className="pc-settings-section">
                          <button onClick={() => handleSettingsItemClick('notifications')}>
                            {t('notifications')}
                          </button>
                          <button onClick={() => handleSettingsItemClick('customer-service')}>
                            {t('customerService')}
                          </button>
                          <button onClick={() => handleSettingsItemClick('faq')}>
                            {t('faq')}
                          </button>
                          <button onClick={() => handleSettingsItemClick('notice')}>
                            {t('notice')}
                          </button>
                          <button onClick={() => handleSettingsItemClick('settings')}>
                            {t('settings')}
                          </button>
                          <button onClick={() => handleSettingsItemClick('version')}>
                            <span>{t('version')}</span>
                            <span>V. 0.1.0</span>
                          </button>
                        </div>
                        <div className="logout-divider"></div>
                        {isAuthenticated ? (
                          <button onClick={handleLogoutClick}>{t('logout')}</button>
                        ) : (
                          <button onClick={() => { setIsMenuOpen(false); router.push('/auth/login'); }}>{t('login')}</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 모바일용 AppBar - 두 줄 구조 */}
        {isMobile && (
          <>
            {/* 첫 번째 줄: 로고와 메뉴 */}
            <div className="mobile-app-bar-row-1">
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
                {!showLogo && title && (
                  <div className="app-bar-title">
                    {title}
                  </div>
                )}
              </div>

              <div className="app-bar-right">
                <button className="mobile-menu-button" onClick={handleMenuClick}>
                  <Image 
                    src="/icons/menu.png" 
                    alt="Menu" 
                    width={26} 
                    height={26}
                  />
                  <span className="menu-text">{t('menu')}</span>
                </button>
              </div>
            </div>

            {/* 두 번째 줄: 위치 선택기 */}
            {(pathname === '/' || pathname === '/dashboard') && (
              <div className="mobile-app-bar-row-2">
                <CountryAndCitySelector
                  variant="mobile"
                  selectedCountry={selectedCountry}
                  selectedCity={selectedCity}
                  onSelectionChange={(countryCode, cityCode) => {
                    setSelectedCountry(countryCode);
                    setSelectedCity(cityCode);
                    console.log('AppBar에서 지역 선택:', { countryCode, cityCode });
                    window.dispatchEvent(new CustomEvent('locationSelectionChanged', {
                      detail: { countryCode, cityCode }
                    }));
                  }}
                  onLocationTextChange={setLocationText}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
      
      {/* 모바일 사이드 드로우 메뉴 */}
      {mounted && isMobile && isMenuOpen && createPortal(
        <div className="mobile-menu-overlay" onClick={() => setIsMenuOpen(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <button className="mobile-menu-close" onClick={() => setIsMenuOpen(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="mobile-menu-items">
              {/* 사용자 정보 섹션 */}
              {isAuthenticated && user && (
                <div className="user-info-section">
                  <div className="user-name-row" onClick={() => { setIsMenuOpen(false); router.push('/profile'); }}>
                    <span className="user-name">{user.name}</span>
                    <svg className="arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6-6 6-1.41-1.41z" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="points-container">
                    <span className="points-label">{t('myPoints')}</span>
                    <span className="points-value">{user.points || 0}P</span>
                  </div>
                </div>
              )}
              
              {/* 설정 항목들 */}
              <div className="settings-divider"></div>
              <div className="mobile-settings-section">
                <button onClick={() => handleSettingsItemClick('notifications')}>
                  {t('notifications')}
                </button>
                <button onClick={() => handleSettingsItemClick('customer-service')}>
                  {t('customerService')}
                </button>
                <button onClick={() => handleSettingsItemClick('faq')}>
                  {t('faq')}
                </button>
                <button onClick={() => handleSettingsItemClick('notice')}>
                  {t('notice')}
                </button>
                <button onClick={() => handleSettingsItemClick('settings')}>
                  {t('settings')}
                </button>
                <button onClick={() => handleSettingsItemClick('version')}>
                  <span>{t('version')}</span>
                  <span>V. 0.1.0</span>
                </button>
              </div>
              
              {/* 로그인/로그아웃 버튼 */}
              <div className="logout-divider"></div>
              {isAuthenticated ? (
                <button onClick={handleLogoutClick}>{t('logout')}</button>
              ) : (
                <button onClick={() => { setIsMenuOpen(false); router.push('/auth/login'); }}>{t('login')}</button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* 로그아웃 확인 팝업 */}
      {mounted && showLogoutModal && createPortal(
        <div className="logout-modal-overlay" onClick={cancelLogout}>
          <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="logout-modal-content">
              <h3>{t('logoutTitle')}</h3>
              <p>{t('logoutMessage')}</p>
              <div className="logout-modal-buttons">
                <button className="logout-cancel-btn" onClick={cancelLogout}>
                  {t('cancel')}
                </button>
                <button className="logout-confirm-btn" onClick={confirmLogout}>
                  {t('confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
