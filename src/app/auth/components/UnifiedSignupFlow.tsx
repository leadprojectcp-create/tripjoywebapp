"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmailSignup } from "../signup/EmailSignup";
import { TermsAgreement } from "./TermsAgreement";
import { UserInfoForm } from "./UserInfoForm";
import { 
  signUpWithEmail,
  updateUserProfile,
  createSocialUser,
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
        // 프로필 완성 모드: 소셜 로그인 사용자 회원가입 완료
        if (!uid) {
          alert('사용자 ID가 필요합니다.');
          return;
        }

        console.log('🔄 소셜 사용자 회원가입 완료 중...', { uid, method, userInfo });

        // Firebase Auth에서 현재 사용자 정보 가져오기
        const { auth } = await import('../../services/firebase');
        const currentUser = auth?.currentUser;
        
        if (!currentUser || !currentUser.email) {
          alert('로그인된 사용자 정보를 찾을 수 없습니다.');
          return;
        }

        // 소셜 사용자 회원가입 완료
        const socialUserInfo = {
          name: userInfo.name,
          phoneNumber: userInfo.phoneNumber,
          countryCode: userInfo.countryCode,
          birthYear: userInfo.birthYear,
          birthMonth: userInfo.birthMonth,
          birthDay: userInfo.birthDay,
          gender: userInfo.gender,
          referralCode: userInfo.referralCode,
          consents: userInfo.consents || {
            termsOfService: true,
            personalInfo: true,
            locationInfo: false,
            marketing: false,
            thirdParty: false
          }
        };

        await createSocialUser(uid, currentUser.email, method as 'kakao' | 'google' | 'apple', socialUserInfo);
        
        console.log('✅ 소셜 사용자 회원가입 완료');
        
        // localStorage의 새 사용자 플래그 제거 (회원가입 완료됨)
        if (typeof window !== 'undefined') {
          console.log('🧹 회원가입 완료 - localStorage 플래그 제거 시작');
          console.log('🔍 제거 전 플래그 상태:', {
            kakao: localStorage.getItem('kakao_new_user'),
            google: localStorage.getItem('google_new_user'),
            apple: localStorage.getItem('apple_new_user')
          });
          
          localStorage.removeItem('kakao_new_user');
          localStorage.removeItem('google_new_user');
          localStorage.removeItem('apple_new_user');
          
          console.log('🔍 제거 후 플래그 상태:', {
            kakao: localStorage.getItem('kakao_new_user'),
            google: localStorage.getItem('google_new_user'),
            apple: localStorage.getItem('apple_new_user')
          });
          console.log('🧹 새 사용자 플래그 제거 완료');
        }
        
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
        
        if (!uid) {
          alert('사용자 UID가 없습니다. 다시 시도해주세요.');
          return;
        }
        
        // Firebase Auth에서 실제 이메일 가져오기
        const { auth } = await import('../../services/firebase');
        const currentUser = auth.currentUser;
        const userEmail = currentUser?.email || '';
        
        console.log('🔍 소셜 사용자 저장 준비:', {
          uid,
          userEmail,
          method,
          currentUser: currentUser ? 'exists' : 'null',
          userInfo
        });
        
        // Firestore에 소셜 사용자 정보 저장 (이메일 회원가입과 동일한 필드)
        console.log('🚀 createSocialUser 호출 시작...');
        userData = await createSocialUser(
          uid,
          userEmail, // Firebase Auth에서 가져온 실제 이메일
          method as 'kakao' | 'google' | 'apple',
          {
            name: userInfo.name || '',
            phoneNumber: userInfo.phoneNumber || '',
            countryCode: userInfo.countryCode || '',
            birthYear: userInfo.birthYear || '',
            birthMonth: userInfo.birthMonth || '',
            birthDay: userInfo.birthDay || '',
            gender: userInfo.gender || 'male',
            referralCode: userInfo.referralCode || '',
            // 실제 사용자 동의 정보 전달
            consents: userInfo.consents || {
              termsOfService: true,
              personalInfo: true,
              locationInfo: false,
              marketing: false,
              thirdParty: false
            }
          }
        );
        
        console.log('✅ Firestore users 컬렉션에 소셜 사용자 저장 완료:', userData);
      }
      
      // localStorage의 새 사용자 플래그 제거 (회원가입 완료됨)
      if (typeof window !== 'undefined') {
        console.log('🧹 일반 회원가입 완료 - localStorage 플래그 제거 시작');
        console.log('🔍 제거 전 플래그 상태:', {
          kakao: localStorage.getItem('kakao_new_user'),
          google: localStorage.getItem('google_new_user'),
          apple: localStorage.getItem('apple_new_user')
        });
        
        localStorage.removeItem('kakao_new_user');
        localStorage.removeItem('google_new_user');
        localStorage.removeItem('apple_new_user');
        
        console.log('🔍 제거 후 플래그 상태:', {
          kakao: localStorage.getItem('kakao_new_user'),
          google: localStorage.getItem('google_new_user'),
          apple: localStorage.getItem('apple_new_user')
        });
        console.log('🧹 회원가입 완료 후 새 사용자 플래그 제거');
      }
      
      // 회원가입 완료 알림을 먼저 보여주기
      alert('🎉 회원가입이 완료되었습니다!\nTRIPJOY에 오신 것을 환영합니다!');
      
      // 사용자가 확인한 후에 FCM 처리 (앱에서만)
      console.log('🎉 회원가입 성공 - 앱에 사용자 정보 전달');
      try {
        const { notifyAppUserLogin } = await import('../../services/fcmService');
        notifyAppUserLogin(userData.id);
      } catch (error) {
        console.log('📝 회원가입 앱 알림 실패 (웹 브라우저일 수 있음)');
      }
      
      // 회원가입 완료 후 홈으로 이동
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
