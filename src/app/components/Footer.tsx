'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslationContext } from '../contexts/TranslationContext';
import { LanguageSelector } from './LanguageSelector';
import './Footer.css';

export const Footer: React.FC = () => {
  const { t, currentLanguage, changeLanguage } = useTranslationContext();
  const pathname = usePathname();
  const [isApp, setIsApp] = useState(false);
  
  // 채팅 페이지와 쇼츠 페이지에서는 footer 숨기기
  const isChatPage = pathname?.startsWith('/chat');
  const isShortsPage = pathname?.startsWith('/shorts');
  
  // 클라이언트에서만 앱 환경 감지
  useEffect(() => {
    setIsApp(typeof window !== 'undefined' && !!(window as any).ReactNativeWebView);
  }, []);
  
  if (isChatPage || isShortsPage) {
    return null;
  }

  return (
    <footer className="footer">
      <div className="footer-container">
          <div className="footer-content">
            <div className="footer-bottom">
              <div className="company-info">
                <p>{t('companyName')}</p>
                <p>{t('companyExecutives')}</p>
                <p>{t('businessRegistrationNumber')}</p>
                <p>{t('telecommunicationsSalesNumber')}</p>
                <p>{t('tourismBusinessRegistration')}</p>
                <p>{t('companyAddress')}</p>
                <p>{t('companyDisclaimer')}</p>
                <div className="copyright">
                  <p>{t('copyright')}</p>
                </div>
              </div>
              
              <div className="footer-right-section">
                {/* 언어 선택기 */}
                <div className="footer-language-selector">
                  <LanguageSelector 
                    currentLanguage={currentLanguage} 
                    onLanguageChange={changeLanguage}
                    dropdownDirection="up"
                  />
                </div>
                
                {/* 앱에서 접속한 경우 앱다운로드 섹션 숨기기 */}
                {!isApp && (
                  <div className="footer-column">
                    <h3 className="footer-title">{t('downloadApp')}</h3>
                    <div className="app-download-links">
                      <a href="#" className="app-link google-play" onClick={(e) => e.preventDefault()}>
                        <img src="/assets/store/google_btn.png" alt="Google Play" />
                      </a>
                      <a href="#" className="app-link app-store" onClick={(e) => e.preventDefault()}>
                        <img src="/assets/store/apple_btn.png" alt="App Store" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
      </div>
    </footer>
  );
};
