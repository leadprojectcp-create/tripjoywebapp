"use client";

import React, { useState } from "react";
import "./TermsAgreement.css";
import { AppBar } from "../../components/AppBar";

interface TermsAgreementProps {
  onAgree: () => void;
  onBack: () => void;
  method: 'email' | 'kakao' | 'google' | 'apple';
}

export const TermsAgreement: React.FC<TermsAgreementProps> = ({ 
  onAgree, 
  onBack, 
  method 
}) => {
  const [consents, setConsents] = useState({
    termsOfService: false,
    personalInfo: false,
    locationInfo: false,
    marketing: false,
    thirdParty: false,
  });

  const handleConsentChange = (key: keyof typeof consents) => {
    setConsents(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleAgree = () => {
    if (!consents.termsOfService || !consents.personalInfo) {
      alert('필수 약관에 동의해야 합니다.');
      return;
    }
    onAgree();
  };

  const getMethodText = () => {
    switch (method) {
      case 'kakao': return '카카오톡';
      case 'google': return '구글';
      case 'apple': return '애플';
      default: return '이메일';
    }
  };

  return (
    <>
      <AppBar showBackButton={true} showLogo={false} />
      <div className="terms-agreement-page page-with-appbar">
        <div className="terms-agreement-container">
          <div className="terms-header">
            <h2>약관 동의</h2>
            <p>{getMethodText()} 계정으로 가입하기 위해 약관에 동의해주세요.</p>
          </div>

          <div className="terms-content">
            <div className="terms-section">
              <h3>필수 약관</h3>
              
              <div className="consent-item required">
                <label>
                  <input
                    type="checkbox"
                    checked={consents.termsOfService}
                    onChange={() => handleConsentChange('termsOfService')}
                  />
                  <span>서비스 이용약관 동의 (필수)</span>
                </label>
              </div>

              <div className="consent-item required">
                <label>
                  <input
                    type="checkbox"
                    checked={consents.personalInfo}
                    onChange={() => handleConsentChange('personalInfo')}
                  />
                  <span>개인정보 처리방침 동의 (필수)</span>
                </label>
              </div>
            </div>

            <div className="terms-section">
              <h3>선택 약관</h3>
              
              <div className="consent-item">
                <label>
                  <input
                    type="checkbox"
                    checked={consents.locationInfo}
                    onChange={() => handleConsentChange('locationInfo')}
                  />
                  <span>위치정보 이용 동의 (선택)</span>
                </label>
              </div>

              <div className="consent-item">
                <label>
                  <input
                    type="checkbox"
                    checked={consents.marketing}
                    onChange={() => handleConsentChange('marketing')}
                  />
                  <span>마케팅 정보 수신 동의 (선택)</span>
                </label>
              </div>

              <div className="consent-item">
                <label>
                  <input
                    type="checkbox"
                    checked={consents.thirdParty}
                    onChange={() => handleConsentChange('thirdParty')}
                  />
                  <span>제3자 정보 제공 동의 (선택)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="terms-actions">
            <button type="button" className="back-button" onClick={onBack}>
              뒤로
            </button>
            <button 
              type="button" 
              className="agree-button"
              disabled={!consents.termsOfService || !consents.personalInfo}
              onClick={handleAgree}
            >
              동의하고 계속하기
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
