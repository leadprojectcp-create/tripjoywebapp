"use client";

import React, { useState } from "react";
import "../signup/UserInfoForm.css";
import { UserInfo } from "../signup/types";
import { AppBar } from "../../components/AppBar";

interface UserInfoFormProps {
  onComplete: (userInfo: UserInfo) => void;
  onBack: () => void;
  method: 'email' | 'kakao' | 'google' | 'apple';
  initialData?: Partial<UserInfo>;
}

export const UserInfoForm: React.FC<UserInfoFormProps> = ({ 
  onComplete, 
  onBack, 
  method,
  initialData 
}) => {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: initialData?.name || '',
    countryCode: initialData?.countryCode || '+82',
    phoneNumber: initialData?.phoneNumber || '',
    birthYear: initialData?.birthYear || '',
    birthMonth: initialData?.birthMonth || '',
    birthDay: initialData?.birthDay || '',
    gender: initialData?.gender || '',
    referralCode: initialData?.referralCode || '',
    consents: {
      termsOfService: true, // 약관동의에서 이미 동의함
      personalInfo: true,   // 약관동의에서 이미 동의함
      locationInfo: false,
      marketing: false,
      thirdParty: false,
    }
  });

  const handleInputChange = (field: keyof UserInfo, value: string) => {
    setUserInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConsentChange = (key: keyof typeof userInfo.consents) => {
    setUserInfo(prev => ({
      ...prev,
      consents: {
        ...prev.consents,
        [key]: !prev.consents[key]
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 필수 필드 검증
    if (!userInfo.name || !userInfo.phoneNumber || !userInfo.birthYear || 
        !userInfo.birthMonth || !userInfo.birthDay || !userInfo.gender) {
      alert('필수 정보를 모두 입력해주세요.');
      return;
    }

    onComplete(userInfo);
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
      <div className="user-info-form-page page-with-appbar">
        <div className="user-info-form-container">
          <div className="form-header">
            <h2>회원정보 입력</h2>
            <p>{getMethodText()} 계정으로 가입하기 위한 추가 정보를 입력해주세요.</p>
          </div>

      <form onSubmit={handleSubmit} className="user-info-form">
        <div className="form-group">
          <label htmlFor="name">이름 *</label>
          <input
            type="text"
            id="name"
            value={userInfo.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="이름을 입력하세요"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="phoneNumber">전화번호 *</label>
          <div className="phone-input-group">
            <select
              value={userInfo.countryCode}
              onChange={(e) => handleInputChange('countryCode', e.target.value)}
            >
              <option value="+82">+82 (한국)</option>
              <option value="+1">+1 (미국)</option>
              <option value="+81">+81 (일본)</option>
              <option value="+86">+86 (중국)</option>
              <option value="+84">+84 (베트남)</option>
              <option value="+66">+66 (태국)</option>
              <option value="+63">+63 (필리핀)</option>
            </select>
            <input
              type="tel"
              id="phoneNumber"
              value={userInfo.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              placeholder="전화번호를 입력하세요"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>생년월일 *</label>
          <div className="birth-input-group">
            <select
              value={userInfo.birthYear}
              onChange={(e) => handleInputChange('birthYear', e.target.value)}
              required
            >
              <option value="">년도</option>
              {Array.from({ length: 100 }, (_, i) => 2024 - i).map(year => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
            <select
              value={userInfo.birthMonth}
              onChange={(e) => handleInputChange('birthMonth', e.target.value)}
              required
            >
              <option value="">월</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month.toString().padStart(2, '0')}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={userInfo.birthDay}
              onChange={(e) => handleInputChange('birthDay', e.target.value)}
              required
            >
              <option value="">일</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day.toString().padStart(2, '0')}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>성별 *</label>
          <div className="gender-input-group">
            <label>
              <input
                type="radio"
                name="gender"
                value="male"
                checked={userInfo.gender === 'male'}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                required
              />
              <span>남성</span>
            </label>
            <label>
              <input
                type="radio"
                name="gender"
                value="female"
                checked={userInfo.gender === 'female'}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                required
              />
              <span>여성</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="referralCode">추천인 코드</label>
          <input
            type="text"
            id="referralCode"
            value={userInfo.referralCode}
            onChange={(e) => handleInputChange('referralCode', e.target.value)}
            placeholder="추천인 코드가 있다면 입력하세요 (선택)"
          />
        </div>

        <div className="form-group">
          <label>추가 동의사항</label>
          <div className="consent-items">
            <label className="consent-item">
              <input
                type="checkbox"
                checked={userInfo.consents.locationInfo}
                onChange={() => handleConsentChange('locationInfo')}
              />
              <span>위치정보 이용 동의 (선택)</span>
            </label>
            
            <label className="consent-item">
              <input
                type="checkbox"
                checked={userInfo.consents.marketing}
                onChange={() => handleConsentChange('marketing')}
              />
              <span>마케팅 정보 수신 동의 (선택)</span>
            </label>
            
            <label className="consent-item">
              <input
                type="checkbox"
                checked={userInfo.consents.thirdParty}
                onChange={() => handleConsentChange('thirdParty')}
              />
              <span>제3자 정보 제공 동의 (선택)</span>
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="back-button" onClick={onBack}>
            뒤로
          </button>
          <button type="submit" className="submit-button">
            가입 완료
          </button>
        </div>
      </form>
        </div>
      </div>
    </>
  );
};
