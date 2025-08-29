'use client';

import React from 'react';
import { useTranslationContext } from '../contexts/TranslationContext';
import './Footer.css';

export const Footer: React.FC = () => {
  const { t } = useTranslationContext();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h2 className="footer-logo">TRIPJOY</h2>
        </div>

        <div className="footer-sections">
          <div className="footer-column">
            <h3 className="footer-title">{t('customerCenter')}</h3>
            <div className="footer-info">
              <p>{t('operatingHours')}</p>
              <p className="contact-info">● {t('chatSupport')}</p>
            </div>
          </div>

          <div className="footer-column">
            <h3 className="footer-title">{t('service')}</h3>
            <ul className="footer-links">
              <li><a href="/settings/notice">{t('notice')}</a></li>
              <li><a href="/settings/faq">{t('faq')}</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()}>{t('userGuide')}</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h3 className="footer-title">{t('legal')}</h3>
            <ul className="footer-links">
              <li><a href="#" onClick={(e) => e.preventDefault()}>{t('termsOfService')}</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()}>{t('privacyPolicy')}</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()}>{t('cookiePolicy')}</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()}>{t('disclaimer')}</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-section">
          <h3 className="footer-title">{t('downloadApp')}</h3>
          <div className="app-download-links">
            <a href="#" className="app-link google-play" onClick={(e) => e.preventDefault()}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.609 1.814L13.792 12L3.609 22.186C3.449 22.070 3.356 21.888 3.356 21.686V2.314C3.356 2.112 3.449 1.930 3.609 1.814Z" fill="#4285F4"/>
                <path d="M13.792 12L3.609 1.814C3.769 1.698 3.986 1.698 4.208 1.814L16.708 9.314C17.042 9.522 17.042 10.478 16.708 10.686L4.208 18.186C3.986 18.302 3.769 18.302 3.609 18.186L13.792 12Z" fill="#34A853"/>
                <path d="M13.792 12L20.392 5.400C20.724 5.608 20.724 6.564 20.392 6.772L13.792 12Z" fill="#FBBC04"/>
                <path d="M13.792 12L20.392 18.600C20.724 18.392 20.724 17.436 20.392 17.228L13.792 12Z" fill="#EA4335"/>
              </svg>
              Google Play
            </a>
            <a href="#" className="app-link app-store" onClick={(e) => e.preventDefault()}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 21.99C7.78997 22.03 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" fill="currentColor"/>
              </svg>
              App Store
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="company-info">
            <p>{t('companyInfo')}</p>
            <p>{t('businessInfo')}</p>
            <p>{t('representativeInfo')}</p>
          </div>
          <div className="copyright">
            <p>© 2024 Trip Joy. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
