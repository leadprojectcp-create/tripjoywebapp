"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmailSignup } from "../signup/EmailSignup";
import { TermsAgreement } from "./TermsAgreement";
import { UserInfoForm } from "./UserInfoForm";
import { 
  signUpWithEmail,
  updateUserProfile,
  UserData 
} from "../services/authService";
import { UserInfo, SignupMethod } from "../signup/types";

type SignupStep = 'email' | 'terms' | 'userInfo';

interface UnifiedSignupFlowProps {
  method: SignupMethod;
  uid?: string; // 소셜 로그인의 경우 Firebase UID
  initialData?: Partial<UserInfo>;
  mode?: 'signup' | 'complete'; // 완성 모드인지 구분
}

export const UnifiedSignupFlow: React.FC<UnifiedSignupFlowProps> = ({ 
  method, 
  uid, 
  initialData,
  mode = 'signup'
}) => {
  const [currentStep, setCurrentStep] = useState<SignupStep>('email');
  const [signupData, setSignupData] = useState<{
    method: SignupMethod;
    email?: string;
    password?: string;
    userInfo?: UserInfo;
  }>({ method });

  const router = useRouter();

  // 모드와 방법에 따라 시작 스텝 결정
  useEffect(() => {
    if (mode === 'complete' || method !== 'email') {
      // 완성 모드 또는 소셜 로그인인 경우 약관동의부터 시작
      setCurrentStep('terms');
    }
  }, [method, mode]);

  const handleTermsAgree = () => {
    setCurrentStep('userInfo');
  };

  const handleEmailNext = (email: string, password: string) => {
    setSignupData(prev => ({ ...prev, email, password }));
    setCurrentStep('terms');
  };

  const handleEmailBack = () => {
    router.push('/auth/login');
  };

  const handleTermsBack = () => {
    if (method === 'email') {
      setCurrentStep('email');
    } else {
      router.push('/auth/login');
    }
  };

  const handleUserInfoComplete = async (userInfo: UserInfo) => {
    try {
      let userData: UserData;
      
      if (mode === 'complete') {
        // 프로필 완성 모드: 기존 사용자 정보 업데이트
        if (!uid) {
          alert('사용자 ID가 필요합니다.');
          return;
        }

        console.log('🔄 기존 사용자 프로필 업데이트 중...', { uid, userInfo });

        // 국가코드에 따른 위치 변환
        const getLocationByCountryCode = (countryCode: string): string => {
          switch (countryCode) {
            case '+82': return 'ko';  // 한국
            case '+1': return 'en';   // 미국
            case '+84': return 'vi';  // 베트남
            case '+86': return 'zh';  // 중국
            case '+81': return 'ja';  // 일본
            case '+66': return 'th';  // 태국
            case '+63': return 'fil'; // 필리핀
            default: return 'en';     // 기본값
          }
        };

        const updateData = {
          name: userInfo.name,
          phoneNumber: userInfo.countryCode + userInfo.phoneNumber,
          gender: userInfo.gender === 'male' ? '남성' : '여성',
          birthDate: `${userInfo.birthYear}-${userInfo.birthMonth.padStart(2, '0')}-${userInfo.birthDay.padStart(2, '0')}`,
          location: getLocationByCountryCode(userInfo.countryCode),
        };

        await updateUserProfile(uid, updateData);
        
        console.log('✅ 프로필 업데이트 완료');
        
        // 홈으로 이동
        router.push('/');
        return;
      }
      
      if (method === 'email') {
        // 이메일 회원가입
        if (!signupData.email || !signupData.password) {
          alert('이메일과 비밀번호가 필요합니다.');
          return;
        }
        
        const emailUserInfo = { ...userInfo, password: signupData.password };
        userData = await signUpWithEmail(signupData.email, signupData.password, emailUserInfo);
        
      } else {
        // 소셜 로그인 회원가입 완료
        console.log(`🆕 ${method} 사용자 회원가입 완료:`, userInfo);
        
        // TODO: 소셜 사용자 정보를 Firestore에 저장하는 API 호출
        // 임시로 성공 처리
        userData = {
          id: uid || `temp_${method}_user`,
          name: userInfo.name || '',
          email: '', // 소셜 사용자는 이메일이 이미 Firebase Auth에 저장됨
          phoneNumber: userInfo.phoneNumber || '',
          birthDate: `${userInfo.birthYear}-${userInfo.birthMonth}-${userInfo.birthDay}`,
          gender: userInfo.gender === 'male' ? '남성' : '여성',
          location: userInfo.countryCode || '',
          signupMethod: method,
          loginType: method,
          points: 0,
          usage_count: 0,
          language: 'ko',
          consents: {
            termsOfService: true,
            personalInfo: true,
            locationInfo: userInfo.consents?.locationInfo || false,
            marketing: userInfo.consents?.marketing || false,
            thirdParty: userInfo.consents?.thirdParty || false,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
      }
      
      // 회원가입 완료 후 홈으로 이동
      console.log('회원가입 완료:', userData);
      router.push('/');
      
    } catch (error) {
      console.error('회원가입 실패:', error);
      alert('회원가입에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleUserInfoBack = () => {
    if (mode === 'complete') {
      // 완성 모드에서는 홈으로 돌아가기
      router.push('/');
    } else {
      setCurrentStep('terms');
    }
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
    <div className="unified-signup-flow">
      <div className="flow-header">
        <h1>{getMethodText()} 계정으로 가입하기</h1>
        <p>TRIPJOY의 멤버가 되어 여행의 즐거움을 경험해보세요!</p>
      </div>

      {currentStep === 'email' && method === 'email' && (
        <EmailSignup
          onNext={handleEmailNext}
          onBack={handleEmailBack}
        />
      )}
      
      {currentStep === 'terms' && (
        <TermsAgreement
          method={method}
          onAgree={handleTermsAgree}
          onBack={handleTermsBack}
        />
      )}
      
      {currentStep === 'userInfo' && (
        <UserInfoForm
          method={method}
          uid={uid}
          onSubmit={handleUserInfoComplete}
          onBack={handleUserInfoBack}
        />
      )}
    </div>
  );
};
