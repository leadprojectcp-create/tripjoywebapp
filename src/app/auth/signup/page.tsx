"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { EmailSignup } from "./EmailSignup";
import { TermsAgreement } from "./TermsAgreement";
import { UserInfoForm } from "./UserInfoForm";
import { 
  signUpWithEmail,
  UserData 
} from "../services/authService";
import { UserInfo, SignupMethod as SignupMethodType } from "./types";
import "./page.css";

type SignupStep = 'email' | 'terms' | 'userInfo';

interface SignupData {
  method: SignupMethodType;
  email?: string;
  password?: string;
  userInfo?: UserInfo;
}

export default function SignupPage(): React.JSX.Element {
  const [currentStep, setCurrentStep] = useState<SignupStep>('email');
  const [signupData, setSignupData] = useState<SignupData>({ 
    method: 'email' 
  });
  const router = useRouter();

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
    if (signupData.method === 'email') {
      setCurrentStep('email');
    } else {
      router.push('/auth/login');
    }
  };

  const handleUserInfoComplete = async (userInfo: UserInfo) => {
    try {
      let userData: UserData;
      
      // Firebase가 설정되지 않은 경우 임시 처리
      if (!signupData.email && signupData.method === 'email') {
        alert('이메일이 설정되지 않았습니다.');
        return;
      }
      
      if (!signupData.password) {
        throw new Error('비밀번호가 필요합니다.');
      }
      
      // 이메일 가입 시에는 EmailSignup에서 입력한 비밀번호 사용
      const emailUserInfo = { ...userInfo, password: signupData.password };
      userData = await signUpWithEmail(signupData.email || '', signupData.password, emailUserInfo);
      
      // 회원가입 완료 후 대시보드로 이동
      console.log('회원가입 완료:', userData);
      router.push('/dashboard');
    } catch (error) {
      console.error('회원가입 실패:', error);
      alert('회원가입에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleUserInfoBack = () => {
    setCurrentStep('terms');
  };

  return (
    <>
      {currentStep === 'email' && (
        <EmailSignup
          onNext={handleEmailNext}
          onBack={handleEmailBack}
        />
      )}
      
      {currentStep === 'terms' && (
        <TermsAgreement
          onAgree={handleTermsAgree}
          onBack={handleTermsBack}
        />
      )}
      
      {currentStep === 'userInfo' && (
        <UserInfoForm
          onComplete={handleUserInfoComplete}
          onBack={handleUserInfoBack}
          signupMethod={signupData.method}
          email={signupData.email}
        />
      )}
    </>
  );
}
