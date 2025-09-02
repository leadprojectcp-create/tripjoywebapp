"use client";

import React, { useState, useEffect } from 'react';
import { AppBar } from '../../components/AppBar';
import { UserInfo } from '../signup/types';
import { useTranslationContext } from '../../contexts/TranslationContext';
import './UserInfoForm.css';

interface UserInfoFormProps {
  onSubmit: (userInfo: UserInfo) => void;
  onBack: () => void;
  method: string;
  uid?: string;
}

export const UserInfoForm: React.FC<UserInfoFormProps> = ({
  onSubmit,
  onBack,
  method,
  uid
}) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(userInfo);
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
      <AppBar showBackButton={true} showLogo={false} />
      <div className="userinfo-page page-with-appbar">
        <div className="userinfo-container">
          <div className="userinfo-header">
            <h2 className="userinfo-title">{t('userInfoTitle')}</h2>
          </div>

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
