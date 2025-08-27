"use client";

import React, { useState } from "react";
import { EmailSignup } from "./EmailSignup";
import { TermsAgreement } from "./TermsAgreement";
import { UserInfoForm } from "./UserInfoForm";
import { 
  signUpWithEmail,
  UserData 
} from "../services/authService";
import { UserInfo, SignupMethod as SignupMethodType } from "./types";

type SignupStep = 'email' | 'terms' | 'userInfo';

interface SignupFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onSignupComplete: (userData: UserData) => void;
  initialMethod?: SignupMethodType;
}

interface SignupData {
  method: SignupMethodType;
  email?: string;
  password?: string;
  userInfo?: UserInfo;
}

export const SignupFlow = ({ isOpen, onClose, onSignupComplete, initialMethod }: SignupFlowProps): React.JSX.Element => {
  const [currentStep, setCurrentStep] = useState<SignupStep>('email');
  
  const [signupData, setSignupData] = useState<SignupData>({ 
    method: 'email' 
  });

  const handleTermsAgree = () => {
    setCurrentStep('userInfo');
  };

  const handleEmailNext = (email: string, password: string) => {
    setSignupData(prev => ({ ...prev, email, password }));
    setCurrentStep('terms');
  };

  const handleEmailBack = () => {
    onClose();
  };

  const handleTermsBack = () => {
    setCurrentStep('email');
  };

  const handleUserInfoComplete = async (userInfo: UserInfo) => {
    try {
      let userData: UserData;
      
      // 이메일 검증
      if (!signupData.email) {
        alert('이메일이 설정되지 않았습니다.');
        return;
      }
      
      if (!signupData.password) {
        throw new Error('비밀번호가 필요합니다.');
      }
      
      // 이메일 가입 시에는 EmailSignup에서 입력한 비밀번호 사용
      const emailUserInfo = { ...userInfo, password: signupData.password };
      userData = await signUpWithEmail(signupData.email || '', signupData.password, emailUserInfo);
      
      onSignupComplete(userData);
      onClose();
      resetSignupFlow();
    } catch (error) {
      console.error('회원가입 실패:', error);
      alert('회원가입에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleUserInfoBack = () => {
    setCurrentStep('terms');
  };

  const resetSignupFlow = () => {
    setCurrentStep('email');
    setSignupData({ method: 'email' });
  };

  const handleClose = () => {
    onClose();
    resetSignupFlow();
  };

  if (!isOpen) return <></>;

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
};


