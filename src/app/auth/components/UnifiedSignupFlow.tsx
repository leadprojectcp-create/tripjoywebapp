"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmailSignup } from "../signup/EmailSignup";
import { TermsAgreement } from "./TermsAgreement";
import { UserInfoForm } from "./UserInfoForm";
import { 
  signUpWithEmail,
  UserData 
} from "../services/authService";
import { UserInfo, SignupMethod } from "../signup/types";

type SignupStep = 'email' | 'terms' | 'userInfo';

interface UnifiedSignupFlowProps {
  method: SignupMethod;
  uid?: string; // 소셜 로그인의 경우 Firebase UID
  initialData?: Partial<UserInfo>;
}

export const UnifiedSignupFlow: React.FC<UnifiedSignupFlowProps> = ({ 
  method, 
  uid, 
  initialData 
}) => {
  const [currentStep, setCurrentStep] = useState<SignupStep>('email');
  const [signupData, setSignupData] = useState<{
    method: SignupMethod;
    email?: string;
    password?: string;
    userInfo?: UserInfo;
  }>({ method });

  const router = useRouter();

  // 소셜 로그인인 경우 약관동의부터 시작
  useEffect(() => {
    if (method !== 'email') {
      setCurrentStep('terms');
    }
  }, [method]);

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
    setCurrentStep('terms');
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
          initialData={initialData}
          onComplete={handleUserInfoComplete}
          onBack={handleUserInfoBack}
        />
      )}
    </div>
  );
};
