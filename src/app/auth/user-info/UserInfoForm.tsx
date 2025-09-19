"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppBar, AppBarProps } from '../../components/AppBar';
import { UserInfo } from '../email/types';
import { useTranslationContext } from '../../contexts/TranslationContext';
import './UserInfoForm.css';

interface UserInfoFormProps {
  onSubmit?: (userInfo: UserInfo) => void;
  onBack?: () => void;
  method?: string;
  uid?: string;
}

export const UserInfoForm: React.FC<UserInfoFormProps> = ({
  onSubmit,
  onBack,
  method: propMethod,
  uid: propUid
}) => {
  const searchParams = useSearchParams();
  
  // URL 파라미터에서 method와 uid 가져오기 (props보다 우선)
  const method = searchParams.get('method') || propMethod || 'email';
  const uid = searchParams.get('uid') || propUid;
  const { t } = useTranslationContext();
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);
  
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: '',
    phoneNumber: '',
    countryCode: '+82',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    gender: '',
    referralCode: '',
    consents: {
      termsOfService: true,
      personalInfo: true,
      locationInfo: false,
      marketing: false,
      thirdParty: false
    }
  });

  // 국가 데이터
  const countries = [
    { code: '+82', flag: '🇰🇷', key: 'countryKorea' },
    { code: '+1', flag: '🇺🇸', key: 'countryUsa' },
    { code: '+81', flag: '🇯🇵', key: 'countryJapan' },
    { code: '+86', flag: '🇨🇳', key: 'countryChina' },
    { code: '+84', flag: '🇻🇳', key: 'countryVietnam' },
    { code: '+66', flag: '🇹🇭', key: 'countryThailand' },
    { code: '+63', flag: '🇵🇭', key: 'countryPhilippines' }
  ];

  const handleInputChange = (field: keyof UserInfo, value: string) => {
    setUserInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConsentChange = (consentType: keyof UserInfo['consents']) => {
    setUserInfo(prev => ({
      ...prev,
      consents: {
        ...prev.consents,
        [consentType]: !prev.consents[consentType]
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (onSubmit) {
      // props로 onSubmit이 전달된 경우
      onSubmit(userInfo);
    } else {
      // 독립적으로 작동하는 경우 - API 호출 후 홈으로 이동
      try {
        console.log('📝 사용자 정보 업데이트 시작:', { method, uid, userInfo });
        
        if (method === 'email') {
          // 이메일 회원가입의 경우 - 사용자 생성
          const emailData = localStorage.getItem('email_signup_data');
          if (!emailData) {
            throw new Error('이메일 회원가입 데이터를 찾을 수 없습니다.');
          }
          
          const { email, password } = JSON.parse(emailData);
          const consents = JSON.parse(localStorage.getItem('user_consents') || '{}');
          
          const response = await fetch('/api/auth/user-management', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create-email-user',
              email: email,
              password: password,
              userInfo: {
                ...userInfo,
                consents: consents
              }
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '회원가입에 실패했습니다.');
          }

          const result = await response.json();
          console.log('✅ 이메일 회원가입 완료:', result);
          
          // localStorage 정리
          localStorage.removeItem('email_signup_data');
          localStorage.removeItem('user_consents');
          localStorage.removeItem('email_new_user');
          
          // Firebase Auth 로그인
          const { signInWithEmailAndPassword } = await import('firebase/auth');
          const { auth } = await import('../../services/firebase');
          
          await signInWithEmailAndPassword(auth, email, password);
          
          // 사용자 데이터 저장
          localStorage.setItem('tripjoy_user', JSON.stringify(result.userData));
          
        } else {
          // 소셜 로그인의 경우 - 사용자 정보 업데이트
          if (!uid) {
            throw new Error('사용자 ID가 필요합니다.');
          }
          
          const response = await fetch('/api/auth/user-management', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update-user-info',
              uid: uid,
              method: method,
              userInfo: userInfo
            })
          });

          if (!response.ok) {
            throw new Error('사용자 정보 업데이트 실패');
          }
        }

        console.log('✅ 사용자 정보 처리 완료');
        
        // 홈으로 이동
        window.location.href = '/';
      } catch (error) {
        console.error('❌ 사용자 정보 처리 오류:', error);
        alert('사용자 정보 저장에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  const getMethodText = () => {
    switch (method) {
      case 'kakao':
        return '카카오톡';
      case 'google':
        return '구글';
      case 'apple':
        return '애플';
      default:
        return '소셜';
    }
  };

  return (
    <>
      <AppBar
        {...({
          showBackButton: true,
          showLogo: false,
          title: t('userInfoTitle'),
          showActions: false
        } as AppBarProps)}
      />
      <div className="userinfo-page page-with-appbar">
        <div className="userinfo-container">
          <form onSubmit={handleSubmit} className="userinfo-form">
            <div className="form-group">
              <label htmlFor="name" className="form-label">{t('name')}</label>
              <input
                type="text"
                id="name"
                className="form-input"
                value={userInfo.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={t('namePlaceholder')}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber" className="form-label">{t('phoneNumber')}</label>
              <div className="phone-input-group">
                <div className="custom-country-dropdown">
                  <button
                    type="button"
                    className={`country-dropdown-button ${isCountryDropdownOpen ? 'open' : ''}`}
                    onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  >
                    <div className="country-dropdown-content">
                      <span className="country-flag">
                        {countries.find(c => c.code === userInfo.countryCode)?.flag}
                      </span>
                      <span className="country-code">{userInfo.countryCode}</span>
                      <span className="country-name">
                        {t(countries.find(c => c.code === userInfo.countryCode)?.key || 'countryKorea')}
                      </span>
                    </div>
                    <span className={`dropdown-arrow ${isCountryDropdownOpen ? 'open' : ''}`}>▼</span>
                  </button>
                  <div className={`country-dropdown-list ${isCountryDropdownOpen ? 'open' : ''}`}>
                    {countries.map((country) => (
                      <div
                        key={country.code}
                        className={`country-option ${userInfo.countryCode === country.code ? 'selected' : ''}`}
                        onClick={() => {
                          handleInputChange('countryCode', country.code);
                          setIsCountryDropdownOpen(false);
                        }}
                      >
                        <div className="country-dropdown-content">
                          <span className="country-flag">{country.flag}</span>
                          <span className="country-code">{country.code}</span>
                          <span className="country-name">{t(country.key)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <input
                  type="tel"
                  id="phoneNumber"
                  className="form-input"
                  value={userInfo.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder={t('phoneNumberPlaceholder')}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('birthDate')}</label>
              <div className="birth-input-group">
                <div className="custom-birth-dropdown">
                  <button
                    type="button"
                    className={`birth-dropdown-button ${isYearDropdownOpen ? 'open' : ''}`}
                    onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                  >
                    <span>{userInfo.birthYear || 'YYYY'}</span>
                    <span className={`dropdown-arrow ${isYearDropdownOpen ? 'open' : ''}`}>▼</span>
                  </button>
                  <div className={`birth-dropdown-list ${isYearDropdownOpen ? 'open' : ''}`}>
                    {Array.from({ length: 100 }, (_, i) => 2024 - i).map(year => (
                      <button
                        key={year}
                        type="button"
                        className={`birth-option ${userInfo.birthYear === year.toString() ? 'selected' : ''}`}
                        onClick={() => {
                          handleInputChange('birthYear', year.toString());
                          setIsYearDropdownOpen(false);
                        }}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="custom-birth-dropdown">
                  <button
                    type="button"
                    className={`birth-dropdown-button ${isMonthDropdownOpen ? 'open' : ''}`}
                    onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                  >
                    <span>{userInfo.birthMonth || 'MM'}</span>
                    <span className={`dropdown-arrow ${isMonthDropdownOpen ? 'open' : ''}`}>▼</span>
                  </button>
                  <div className={`birth-dropdown-list ${isMonthDropdownOpen ? 'open' : ''}`}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <button
                        key={month}
                        type="button"
                        className={`birth-option ${userInfo.birthMonth === month.toString().padStart(2, '0') ? 'selected' : ''}`}
                        onClick={() => {
                          handleInputChange('birthMonth', month.toString().padStart(2, '0'));
                          setIsMonthDropdownOpen(false);
                        }}
                      >
                        {month}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="custom-birth-dropdown">
                  <button
                    type="button"
                    className={`birth-dropdown-button ${isDayDropdownOpen ? 'open' : ''}`}
                    onClick={() => setIsDayDropdownOpen(!isDayDropdownOpen)}
                  >
                    <span>{userInfo.birthDay || 'DD'}</span>
                    <span className={`dropdown-arrow ${isDayDropdownOpen ? 'open' : ''}`}>▼</span>
                  </button>
                  <div className={`birth-dropdown-list ${isDayDropdownOpen ? 'open' : ''}`}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <button
                        key={day}
                        type="button"
                        className={`birth-option ${userInfo.birthDay === day.toString().padStart(2, '0') ? 'selected' : ''}`}
                        onClick={() => {
                          handleInputChange('birthDay', day.toString().padStart(2, '0'));
                          setIsDayDropdownOpen(false);
                        }}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('gender')}</label>
              <div className="gender-tabs">
                <button
                  type="button"
                  className={`gender-tab ${userInfo.gender === 'male' ? 'selected' : ''}`}
                  onClick={() => handleInputChange('gender', 'male')}
                >
                  {t('male')}
                </button>
                <button
                  type="button"
                  className={`gender-tab ${userInfo.gender === 'female' ? 'selected' : ''}`}
                  onClick={() => handleInputChange('gender', 'female')}
                >
                  {t('female')}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="referralCode" className="form-label">{t('referralCode')}</label>
              <div className="referral-input-group">
                <input
                  type="text"
                  id="referralCode"
                  className="form-input"
                  value={userInfo.referralCode}
                  onChange={(e) => handleInputChange('referralCode', e.target.value)}
                  placeholder={t('referralCodePlaceholder')}
                />
                <button type="button" className="referral-check-button">
                  {t('verify')}
                </button>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-button">
                {t('complete')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
