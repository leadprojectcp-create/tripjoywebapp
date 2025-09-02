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

  const allConsentsSelected = consents.termsOfService && consents.personalInfo && 
                              consents.locationInfo && consents.marketing && consents.thirdParty;

  const handleSelectAll = () => {
    const newValue = !allConsentsSelected;
    setConsents({
      termsOfService: newValue,
      personalInfo: newValue,
      locationInfo: newValue,
      marketing: newValue,
      thirdParty: newValue,
    });
  };

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
      <div className="terms-page page-with-appbar">
        <div className="terms-container">
          <div className="terms-header">
            <h2 className="terms-title">약관 동의</h2>
            <p className="terms-subtitle">{getMethodText()} 계정으로 가입하기 위해 약관에 동의해주세요.</p>
          </div>

                    <div className="terms-content">
            <div className="select-all-section">
              <div className="select-all-checkbox" onClick={handleSelectAll}>
                <input
                  type="checkbox"
                  checked={allConsentsSelected}
                  readOnly
                />
                <span className="select-all-label">모두 동의하기</span>
              </div>
            </div>
            
            <div className="terms-list">
              <div className="term-item">
                <div className="term-checkbox">
                  <input
                    type="checkbox"
                    id="termsOfService"
                    checked={consents.termsOfService}
                    onChange={() => handleConsentChange('termsOfService')}
                  />
                  <label htmlFor="termsOfService" className="term-label">
                    <span className="required">[필수] 서비스 이용약관</span>
                  </label>
                  <span className="term-arrow">&gt;</span>
                </div>
              </div>

              <div className="term-item">
                <div className="term-checkbox">
                  <input
                    type="checkbox"
                    id="personalInfo"
                    checked={consents.personalInfo}
                    onChange={() => handleConsentChange('personalInfo')}
                  />
                  <label htmlFor="personalInfo" className="term-label">
                    <span className="required">[필수] 개인정보수집/이용동의</span>
                  </label>
                  <span className="term-arrow">&gt;</span>
                </div>
              </div>

              <div className="term-item">
                <div className="term-checkbox">
                  <input
                    type="checkbox"
                    id="thirdParty"
                    checked={consents.thirdParty}
                    onChange={() => handleConsentChange('thirdParty')}
                  />
                  <label htmlFor="thirdParty" className="term-label">
                    <span className="required">[필수] 개인정보 제3자 정보제공 동의</span>
                  </label>
                  <span className="term-arrow">&gt;</span>
                </div>
              </div>

              <div className="term-item">
                <div className="term-checkbox">
                  <input
                    type="checkbox"
                    id="locationInfo"
                    checked={consents.locationInfo}
                    onChange={() => handleConsentChange('locationInfo')}
                  />
                  <label htmlFor="locationInfo" className="term-label">
                    <span className="required">[필수] 위치기반 서비스 이용약관 동의</span>
                  </label>
                  <span className="term-arrow">&gt;</span>
                </div>
              </div>
              
              <div className="term-item">
                <div className="term-checkbox">
                  <input
                    type="checkbox"
                    id="marketing"
                    checked={consents.marketing}
                    onChange={() => handleConsentChange('marketing')}
                  />
                  <label htmlFor="marketing" className="term-label">
                    <span className="optional">[선택] 마케팅 활용 동의</span>
                  </label>
                  <span className="term-arrow">&gt;</span>
                </div>
              </div>
            </div>
          </div>

          <div className="terms-footer">
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
