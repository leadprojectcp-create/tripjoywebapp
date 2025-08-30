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
            <h3 className="footer-title">앱다운로드 바로가기</h3>
            <div className="app-download-links">
              <a href="#" className="app-link google-play" onClick={(e) => e.preventDefault()}>
                <img src="/assets/store/google_btn.png" alt="Google Play" />
              </a>
              <a href="#" className="app-link app-store" onClick={(e) => e.preventDefault()}>
                <img src="/assets/store/apple_btn.png" alt="App Store" />
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="company-info">
            <p>(주)리프컴퍼니</p>
            <p>CEO 박상호, CTO 배철응, CDD 정윤우</p>
            <p>사업자 등록번호 413-87-02826</p>
            <p>통신판매업 신고번호 1234-서울강동-5678</p>
            <p>서울특별시 광진구 아차산로62길 14-12(구의동, 대영트윈,투)</p>
            <p>(주)리프컴퍼니는 통신판매중개자로서 통신판매의 당사자가 아니며 상품 거래정보 및 거래 등에 대해 책임을 지지 않습니다.</p>
          </div>
          <div className="copyright">
            <p>© 2024 Trip Joy. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
