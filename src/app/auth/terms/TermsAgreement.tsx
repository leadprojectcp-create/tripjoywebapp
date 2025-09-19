"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import "./TermsAgreement.css";
import { AppBar, AppBarProps } from "../../components/AppBar";
import { SignupMethod } from "../email/types";
import { useTranslationContext } from "../../contexts/TranslationContext";

interface TermsAgreementProps {
  onAgree?: () => void;
  onBack?: () => void;
  method?: SignupMethod;
}

export const TermsAgreement: React.FC<TermsAgreementProps> = ({ 
  onAgree, 
  onBack, 
  method: propMethod 
}) => {
  const [method, setMethod] = useState<SignupMethod>(propMethod || 'email');
  const [uid, setUid] = useState<string>('');
  const router = useRouter();
  const { t } = useTranslationContext();

  // URL 파라미터에서 method와 uid 확인
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const methodParam = urlParams.get('method') as SignupMethod;
      const uidParam = urlParams.get('uid');
      
      if (methodParam) setMethod(methodParam);
      if (uidParam) setUid(uidParam);
    }
  }, []);

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
      alert(t('requiredTermsAlert'));
      return;
    }
    
    if (onAgree) {
      // 외부에서 onAgree가 전달된 경우
      onAgree();
    } else {
      // 독립적으로 사용되는 경우 내부 로직 처리
      localStorage.setItem('user_consents', JSON.stringify(consents));
      
      if (method === 'email') {
        router.push('/auth/user-info?method=email');
      } else {
        router.push(`/auth/user-info?method=${method}&uid=${uid}`);
      }
    }
  };


  return (
    <>
      {/* 약관동의 페이지 - 메뉴 숨김 */}
      <AppBar
        {...({
          showBackButton: true,
          showLogo: false,
          title: t('termsAgreement'),
          showActions: false
        } as AppBarProps)}
      />
      <div className="terms-page page-with-appbar">
        <div className="terms-container">
          <div className="terms-header">
            <h2 className="terms-title">{t('termsTitle')}</h2>
            <p className="terms-subtitle">{t('termsSubtitle')}</p>
          </div>

                    <div className="terms-content">
            <div className="select-all-section">
              <div className="select-all-checkbox" onClick={handleSelectAll}>
                <Image
                  src={allConsentsSelected ? "/icons/auth-check-active.png" : "/icons/auth-check.png"}
                  alt="checkbox"
                  width={24}
                  height={24}
                />
                <span className="select-all-label">{t('selectAllTerms')}</span>
              </div>
            </div>
            
            <div className="terms-list">
              <div className="term-item">
                <div className="term-checkbox" onClick={() => handleConsentChange('termsOfService')}>
                  <div className="custom-checkbox">
                    <Image
                      src={consents.termsOfService ? "/icons/auth-check-active.png" : "/icons/auth-check.png"}
                      alt="checkbox"
                      width={24}
                      height={24}
                    />
                    <span className="term-label">
                      <span className="required">{t('termsOfService')}</span>
                    </span>
                  </div>
                  <span className="term-arrow">&gt;</span>
                </div>
              </div>

              <div className="term-item">
                <div className="term-checkbox" onClick={() => handleConsentChange('personalInfo')}>
                  <div className="custom-checkbox">
                    <Image
                      src={consents.personalInfo ? "/icons/auth-check-active.png" : "/icons/auth-check.png"}
                      alt="checkbox"
                      width={24}
                      height={24}
                    />
                    <span className="term-label">
                      <span className="required">{t('personalInfo')}</span>
                    </span>
                  </div>
                  <span className="term-arrow">&gt;</span>
                </div>
              </div>

              <div className="term-item">
                <div className="term-checkbox" onClick={() => handleConsentChange('thirdParty')}>
                  <div className="custom-checkbox">
                    <Image
                      src={consents.thirdParty ? "/icons/auth-check-active.png" : "/icons/auth-check.png"}
                      alt="checkbox"
                      width={24}
                      height={24}
                    />
                    <span className="term-label">
                      <span className="required">{t('thirdPartyInfo')}</span>
                    </span>
                  </div>
                  <span className="term-arrow">&gt;</span>
                </div>
              </div>

              <div className="term-item">
                <div className="term-checkbox" onClick={() => handleConsentChange('locationInfo')}>
                  <div className="custom-checkbox">
                    <Image
                      src={consents.locationInfo ? "/icons/auth-check-active.png" : "/icons/auth-check.png"}
                      alt="checkbox"
                      width={24}
                      height={24}
                    />
                    <span className="term-label">
                      <span className="required">{t('locationService')}</span>
                    </span>
                  </div>
                  <span className="term-arrow">&gt;</span>
                </div>
              </div>
              
              <div className="term-item">
                <div className="term-checkbox" onClick={() => handleConsentChange('marketing')}>
                  <div className="custom-checkbox">
                    <Image
                      src={consents.marketing ? "/icons/auth-check-active.png" : "/icons/auth-check.png"}
                      alt="checkbox"
                      width={24}
                      height={24}
                    />
                    <span className="term-label">
                      <span className="optional">{t('marketingConsent')}</span>
                    </span>
                  </div>
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
              {t('agreeAndContinue')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
