"use client";

import React, { useState, useEffect } from "react";
import "./TermsAgreement.css";
import { AppBar } from "../../components/AppBar";
import { useTranslationContext } from "../../contexts/TranslationContext";

interface TermsAgreementProps {
  onAgree: () => void;
  onBack: () => void;
}

interface TermItem {
  id: string;
  label: string;
  required: boolean;
  checked: boolean;
}

export const TermsAgreement = ({ onAgree, onBack }: TermsAgreementProps): React.JSX.Element => {
  const { t, isLoading } = useTranslationContext();
  
  const [terms, setTerms] = useState<TermItem[]>([]);

  // 번역이 로드된 후 terms 초기화
  useEffect(() => {
    if (!isLoading) {
      setTerms([
        { id: 'all', label: t('agreeAll'), required: false, checked: false },
        { id: 'service', label: t('serviceTerms'), required: true, checked: false },
        { id: 'privacy', label: t('privacyPolicy'), required: true, checked: false },
        { id: 'thirdParty', label: t('thirdPartyTerms'), required: true, checked: false },
        { id: 'location', label: t('locationTerms'), required: true, checked: false },
        { id: 'marketing', label: t('marketingTerms'), required: false, checked: false }
      ]);
    }
  }, [isLoading, t]);

  const handleTermChange = (id: string) => {
    setTerms(prevTerms => {
      if (id === 'all') {
        // 모두 동의하기 체크박스
        const allChecked = !prevTerms.find(term => term.id === 'all')?.checked;
        return prevTerms.map(term => ({
          ...term,
          checked: allChecked
        }));
      } else {
        // 개별 약관 체크박스
        const newTerms = prevTerms.map(term => {
          if (term.id === id) {
            return { ...term, checked: !term.checked };
          }
          return term;
        });
        
        // 모든 약관이 체크되었는지 확인
        const allChecked = newTerms
          .filter(term => term.id !== 'all')
          .every(term => term.checked);
        
        // 모두 동의하기 체크박스 업데이트
        return newTerms.map(term => {
          if (term.id === 'all') {
            return { ...term, checked: allChecked };
          }
          return term;
        });
      }
    });
  };

  const canProceed = terms
    .filter(term => term.required && term.id !== 'all')
    .every(term => term.checked);

  return (
    <>
      <AppBar showBackButton={true} showLogo={false} />
      <div className="terms-page page-with-appbar">
        <div className="terms-container">
          <div className="terms-header">
            <h1 className="terms-title">{t('termsTitle')}</h1>
            <p className="terms-subtitle">{t('termsSubtitle')}</p>
          </div>

        <div className="terms-content">
          <div className="terms-list">
            {terms.map((term) => (
              <div key={term.id} className="term-item">
                <div className="term-checkbox">
                  <input
                    type="checkbox"
                    id={term.id}
                    checked={term.checked}
                    onChange={() => handleTermChange(term.id)}
                    style={{ marginRight: '12px', width: '18px', height: '18px' }}
                  />
                  <label htmlFor={term.id} className="term-label">{term.label}</label>
                </div>
                {term.id === 'all' && <div className="divider"></div>}
              </div>
            ))}
          </div>
        </div>

        <div className="terms-footer">
          <button 
            className="agree-button"
            disabled={!canProceed}
            onClick={onAgree}
          >
            {t('agreeButton')}
          </button>
        </div>
        </div>
      </div>
    </>
  );
};
