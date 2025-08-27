"use client";

import React, { useState, useEffect, useRef } from "react";
import "./UserInfoForm.css";
import { AppBar } from "../../components/AppBar";
import { 
  validateEmail, 
  validatePassword, 
  validatePhoneNumber, 
  validateBirthDate,
  sanitizeInput 
} from "../../utils/security";
import { UserInfo, SignupMethod } from "./types";
import { useTranslationContext } from "../../contexts/TranslationContext";

interface UserInfoFormProps {
  onComplete: (userInfo: UserInfo) => void;
  onBack: () => void;
  signupMethod: SignupMethod;
  email?: string;
}

export const UserInfoForm = ({ onComplete, onBack, signupMethod, email }: UserInfoFormProps): React.JSX.Element => {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: '',
    countryCode: '+82', // 기본값: 한국 국가코드
    phoneNumber: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    gender: '',

    referralCode: '',
    password: '',
    // 동의는 TermsAgreement에서 처리되므로 기본값 설정
    consents: {
      termsOfService: true,
      personalInfo: true,
      locationInfo: true,
      marketing: false,
      thirdParty: true
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const dayDropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslationContext();
  
  // 국가코드 옵션들 (지원하는 7개 언어/국가만)
  const countryCodes = [
    { code: '+82', name: '🇰🇷 한국 (+82)', language: 'ko' },
    { code: '+1', name: '🇺🇸 미국 (+1)', language: 'en' },
    { code: '+84', name: '🇻🇳 베트남 (+84)', language: 'vi' },
    { code: '+86', name: '🇨🇳 중국 (+86)', language: 'zh' },
    { code: '+81', name: '🇯🇵 일본 (+81)', language: 'ja' },
    { code: '+66', name: '🇹🇭 태국 (+66)', language: 'th' },
    { code: '+63', name: '🇵🇭 필리핀 (+63)', language: 'fil' },
  ];

  const years = Array.from({ length: 100 }, (_, i) => 2024 - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  // 외부 클릭 감지로 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
        setIsYearDropdownOpen(false);
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
      if (dayDropdownRef.current && !dayDropdownRef.current.contains(event.target as Node)) {
        setIsDayDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 국가코드 선택 핸들러
  const handleCountrySelect = (countryCode: string) => {
    handleInputChange('countryCode', countryCode);
    setIsCountryDropdownOpen(false);
  };

  // 드롭다운 토글 함수들
  const toggleCountryDropdown = () => {
    setIsCountryDropdownOpen(!isCountryDropdownOpen);
  };

  const toggleYearDropdown = () => {
    setIsYearDropdownOpen(!isYearDropdownOpen);
  };

  const toggleMonthDropdown = () => {
    setIsMonthDropdownOpen(!isMonthDropdownOpen);
  };

  const toggleDayDropdown = () => {
    setIsDayDropdownOpen(!isDayDropdownOpen);
  };

  // 생년월일 선택 핸들러들
  const handleYearSelect = (year: string) => {
    handleInputChange('birthYear', year);
    setIsYearDropdownOpen(false);
  };

  const handleMonthSelect = (month: string) => {
    handleInputChange('birthMonth', month);
    setIsMonthDropdownOpen(false);
  };

  const handleDaySelect = (day: string) => {
    handleInputChange('birthDay', day);
    setIsDayDropdownOpen(false);
  };



  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 이름 검증
    if (!userInfo.name.trim()) {
      newErrors.name = '이름을 입력해주세요';
    } else if (userInfo.name.trim().length < 2) {
      newErrors.name = '이름은 2글자 이상 입력해주세요';
    }

    // 휴대폰 번호 검증
    if (!userInfo.phoneNumber) {
      newErrors.phoneNumber = '휴대폰 번호를 입력해주세요';
    } else if (!validatePhoneNumber(userInfo.phoneNumber)) {
      newErrors.phoneNumber = '올바른 휴대폰 번호를 입력해주세요';
    }

    // 생년월일 검증
    if (!userInfo.birthYear || !userInfo.birthMonth || !userInfo.birthDay) {
      newErrors.birthYear = '생년월일을 입력해주세요';
    } else if (!validateBirthDate(userInfo.birthYear, userInfo.birthMonth, userInfo.birthDay)) {
      newErrors.birthYear = '올바른 생년월일을 입력해주세요';
    }

    // 성별 검증
    if (!userInfo.gender) {
      newErrors.gender = '성별을 선택해주세요';
    }

    // 국가코드 검증
    if (!userInfo.countryCode) {
      newErrors.countryCode = '국가코드를 선택해주세요';
    }

    // 이메일 가입 시 비밀번호 검증 (이미 EmailSignup에서 입력했으므로 건너뜀)
    if (signupMethod !== 'email') {
      if (!userInfo.password) {
        newErrors.password = '비밀번호를 입력해주세요';
      } else {
        const passwordValidation = validatePassword(userInfo.password);
        if (!passwordValidation.isValid) {
          newErrors.password = passwordValidation.message;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onComplete(userInfo);
    }
  };

  const handleInputChange = (field: keyof UserInfo, value: string) => {
    // 입력 데이터 정제
    const sanitizedValue = sanitizeInput(value);
    
    setUserInfo(prev => ({ ...prev, [field]: sanitizedValue }));
    // 에러 메시지 제거
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <>
      <AppBar showBackButton={true} showLogo={false} />
      <div className="userinfo-page page-with-appbar">
        <div className="userinfo-container">
          <div className="userinfo-header">
          <h1 className="userinfo-title">{t('userInfoTitle')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="userinfo-form">
          <div className="form-group">
            <label className="form-label">{t('name')}</label>
            <input
              type="text"
              value={userInfo.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder={t('namePlaceholder')}
              maxLength={50}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>



          {/* 이메일 가입 시에는 비밀번호 필드를 숨김 (이미 EmailSignup에서 입력했음) */}
          {signupMethod !== 'email' && (
            <div className="form-group">
              <label className="form-label">{t('password')}</label>
              <input
                type="password"
                value={userInfo.password || ''}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder={t('passwordPlaceholder')}
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">{t('phoneNumber')}</label>
            <div className="phone-input-group">
              <div className="custom-country-dropdown" ref={countryDropdownRef}>
                <button
                  type="button"
                  className={`country-code-button ${errors.countryCode ? 'error' : ''} ${isCountryDropdownOpen ? 'open' : ''}`}
                  onClick={toggleCountryDropdown}
                >
                  <span className="country-flag-name">
                    {countryCodes.find(country => country.code === userInfo.countryCode)?.name || '국가 선택'}
                  </span>
                  <span className="dropdown-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </button>
                {isCountryDropdownOpen && (
                  <div className="country-dropdown-list">
                    {countryCodes.map(country => (
                      <button
                        key={country.code}
                        type="button"
                        className={`country-option ${userInfo.countryCode === country.code ? 'selected' : ''}`}
                        onClick={() => handleCountrySelect(country.code)}
                      >
                        {country.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="tel"
                value={userInfo.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value.replace(/[^0-9]/g, ''))}
                className={`form-input phone-number-input ${errors.phoneNumber ? 'error' : ''}`}
                placeholder={t('phoneNumberPlaceholder')}
                maxLength={11}
              />
            </div>
            {errors.phoneNumber && <span className="error-message">{errors.phoneNumber}</span>}
            {errors.countryCode && <span className="error-message">{errors.countryCode}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">{t('birthDate')}</label>
            <div className="birth-inputs">
              {/* Year Dropdown */}
              <div className="custom-birth-dropdown" ref={yearDropdownRef}>
                <button
                  type="button"
                  className={`birth-dropdown-button ${errors.birthYear ? 'error' : ''} ${isYearDropdownOpen ? 'open' : ''}`}
                  onClick={toggleYearDropdown}
                >
                  <span className="birth-value">
                    {userInfo.birthYear || 'YYYY'}
                  </span>
                  <span className="dropdown-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </button>
                {isYearDropdownOpen && (
                  <div className="birth-dropdown-list">
                    {years.map(year => (
                      <button
                        key={year}
                        type="button"
                        className={`birth-option ${userInfo.birthYear === year.toString() ? 'selected' : ''}`}
                        onClick={() => handleYearSelect(year.toString())}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Month Dropdown */}
              <div className="custom-birth-dropdown" ref={monthDropdownRef}>
                <button
                  type="button"
                  className={`birth-dropdown-button ${errors.birthYear ? 'error' : ''} ${isMonthDropdownOpen ? 'open' : ''}`}
                  onClick={toggleMonthDropdown}
                >
                  <span className="birth-value">
                    {userInfo.birthMonth || 'MM'}
                  </span>
                  <span className="dropdown-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </button>
                {isMonthDropdownOpen && (
                  <div className="birth-dropdown-list">
                    {months.map(month => {
                      const monthValue = month.toString().padStart(2, '0');
                      return (
                        <button
                          key={month}
                          type="button"
                          className={`birth-option ${userInfo.birthMonth === monthValue ? 'selected' : ''}`}
                          onClick={() => handleMonthSelect(monthValue)}
                        >
                          {monthValue}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Day Dropdown */}
              <div className="custom-birth-dropdown" ref={dayDropdownRef}>
                <button
                  type="button"
                  className={`birth-dropdown-button ${errors.birthYear ? 'error' : ''} ${isDayDropdownOpen ? 'open' : ''}`}
                  onClick={toggleDayDropdown}
                >
                  <span className="birth-value">
                    {userInfo.birthDay || 'DD'}
                  </span>
                  <span className="dropdown-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </button>
                {isDayDropdownOpen && (
                  <div className="birth-dropdown-list">
                    {days.map(day => {
                      const dayValue = day.toString().padStart(2, '0');
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`birth-option ${userInfo.birthDay === dayValue ? 'selected' : ''}`}
                          onClick={() => handleDaySelect(dayValue)}
                        >
                          {dayValue}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            {errors.birthYear && <span className="error-message">{errors.birthYear}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">{t('gender')}</label>
            <div className="gender-buttons">
              <button
                type="button"
                className={`gender-button ${userInfo.gender === 'male' ? 'selected' : ''}`}
                onClick={() => handleInputChange('gender', 'male')}
              >
                {t('male')}
              </button>
              <button
                type="button"
                className={`gender-button ${userInfo.gender === 'female' ? 'selected' : ''}`}
                onClick={() => handleInputChange('gender', 'female')}
              >
                {t('female')}
              </button>
            </div>
            {errors.gender && <span className="error-message">{errors.gender}</span>}
          </div>





          <div className="form-group">
            <label className="form-label">{t('referralCode')}</label>
            <div className="referral-input-group">
              <input
                type="text"
                value={userInfo.referralCode}
                onChange={(e) => handleInputChange('referralCode', e.target.value)}
                className="form-input"
                placeholder={t('referralCodePlaceholder')}
              />
              <button type="button" className="verify-button">
                {t('verify')}
              </button>
            </div>
          </div>

          <button type="submit" className="complete-button">
            {t('complete')}
          </button>
        </form>
        </div>
      </div>
    </>
  );
};
